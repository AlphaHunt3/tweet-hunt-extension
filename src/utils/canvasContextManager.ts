/**
 * Canvas上下文管理器
 * 用于防止WebGL上下文过多的问题
 */

import { subscribeToMutation } from '~/contents/hooks/useGlobalMutationObserver';

interface CanvasContext {
  canvas: HTMLCanvasElement;
  context:
    | CanvasRenderingContext2D
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null;
  type: '2d' | 'webgl' | 'webgl2';
  isActive: boolean;
  lastUsed: number;
  unsubscribe?: () => void; // 存储取消订阅函数
}

class CanvasContextManager {
  private static instance: CanvasContextManager;
  private contexts: Map<string, CanvasContext> = new Map();
  private maxContexts = 8; // 最大允许的Canvas上下文数量
  private cleanupInterval: number | null = null;

  private constructor() {
    this.startCleanupTimer();
  }

  public static getInstance(): CanvasContextManager {
    if (!CanvasContextManager.instance) {
      CanvasContextManager.instance = new CanvasContextManager();
    }
    return CanvasContextManager.instance;
  }

  /**
   * 获取Canvas上下文，如果超过限制会自动清理旧的上下文
   */
  public getContext(
    canvas: HTMLCanvasElement,
    type: '2d' | 'webgl' | 'webgl2' = '2d',
    id?: string
  ):
    | CanvasRenderingContext2D
    | WebGLRenderingContext
    | WebGL2RenderingContext
    | null {
    const contextId = id || this.generateContextId(canvas, type);

    // 检查是否已存在相同的上下文
    if (this.contexts.has(contextId)) {
      const existing = this.contexts.get(contextId)!;
      if (existing.isActive && existing.canvas === canvas) {
        existing.lastUsed = Date.now();
        return existing.context;
      }
    }

    // 如果超过最大上下文数量，清理最旧的
    if (this.contexts.size >= this.maxContexts) {
      this.cleanupOldestContexts();
    }

    try {
      const context = canvas.getContext(type, {
        alpha: true,
        antialias: type === '2d',
        depth: type !== '2d',
        stencil: type !== '2d',
        preserveDrawingBuffer: false,
        powerPreference: 'default',
        failIfMajorPerformanceCaveat: false,
      });

      if (context) {
        const canvasContext: CanvasContext = {
          canvas,
          context: context as
            | CanvasRenderingContext2D
            | WebGLRenderingContext
            | WebGL2RenderingContext,
          type,
          isActive: true,
          lastUsed: Date.now(),
        };

        this.contexts.set(contextId, canvasContext);

        // 监听Canvas的移除事件
        this.observeCanvasRemoval(canvas, contextId);

        return context as
          | CanvasRenderingContext2D
          | WebGLRenderingContext
          | WebGL2RenderingContext;
      }
    } catch (error) {
      console.log('Failed to get canvas context:', error);
    }

    return null;
  }

  /**
   * 释放指定的Canvas上下文
   */
  public releaseContext(
    canvas: HTMLCanvasElement,
    type: '2d' | 'webgl' | 'webgl2' = '2d'
  ): void {
    const contextId = this.generateContextId(canvas, type);
    const context = this.contexts.get(contextId);

    if (context) {
      // 取消 MutationObserver 订阅
      if (context.unsubscribe) {
        context.unsubscribe();
        context.unsubscribe = undefined;
      }

      context.isActive = false;
      context.lastUsed = Date.now();

      // 如果是WebGL上下文，尝试释放资源
      if (type !== '2d' && context.context) {
        try {
          const gl = context.context as WebGLRenderingContext;
          // 释放所有纹理
          const numTextures = gl.getParameter(gl.MAX_TEXTURE_IMAGE_UNITS);
          for (let i = 0; i < numTextures; i++) {
            gl.activeTexture(gl.TEXTURE0 + i);
            gl.bindTexture(gl.TEXTURE_2D, null);
          }
          // 释放帧缓冲区
          gl.bindFramebuffer(gl.FRAMEBUFFER, null);
          // 释放渲染缓冲区
          gl.bindRenderbuffer(gl.RENDERBUFFER, null);
        } catch (error) {
          console.log('Failed to release WebGL resources:', error);
        }
      }
    }
  }

  /**
   * 强制清理所有上下文
   */
  public forceCleanup(): void {
    this.contexts.forEach((context, id) => {
      if (context.type !== '2d') {
        this.releaseContext(context.canvas, context.type);
      }
    });

    // 清理不活跃的上下文
    this.cleanupOldestContexts(true);
  }

  /**
   * 获取当前活跃的上下文数量
   */
  public getActiveContextCount(): number {
    return Array.from(this.contexts.values()).filter((ctx) => ctx.isActive)
      .length;
  }

  /**
   * 生成上下文ID
   */
  private generateContextId(canvas: HTMLCanvasElement, type: string): string {
    return `${type}_${
      canvas.id || canvas.className || 'unknown'
    }_${Date.now()}`;
  }

  /**
   * 清理最旧的上下文
   */
  private cleanupOldestContexts(force = false): void {
    const sortedContexts = Array.from(this.contexts.entries()).sort(
      ([, a], [, b]) => a.lastUsed - b.lastUsed
    );

    const contextsToRemove = Math.max(1, Math.floor(this.contexts.size * 0.3)); // 移除30%的旧上下文

    for (let i = 0; i < contextsToRemove && i < sortedContexts.length; i++) {
      const [id, context] = sortedContexts[i];

      if (force || !context.isActive || Date.now() - context.lastUsed > 30000) {
        // 30秒超时
        // 取消订阅（如果存在）
        if (context.unsubscribe) {
          context.unsubscribe();
          context.unsubscribe = undefined;
        }
        this.releaseContext(context.canvas, context.type);
        this.contexts.delete(id);
      }
    }
  }

  /**
   * 监听Canvas的移除事件（使用全局 MutationObserver）
   */
  private observeCanvasRemoval(
    canvas: HTMLCanvasElement,
    contextId: string
  ): void {
    // 使用全局 MutationObserver 监听 Canvas 的移除
    // 注意：全局观察器观察 document.body，但会捕获所有子元素的变化
    const unsubscribe = subscribeToMutation(
      (mutations) => {
        for (const mutation of mutations) {
          if (mutation.type === 'childList') {
            for (const node of Array.from(mutation.removedNodes)) {
              if (
                node === canvas ||
                (node.nodeType === Node.ELEMENT_NODE &&
                  (node as Element).contains?.(canvas))
              ) {
                // Canvas 被移除，释放上下文
                // 从 contexts 中找到对应的 context 并释放
                const context = this.contexts.get(contextId);
                if (context) {
                  // 取消订阅
                  if (context.unsubscribe) {
                    context.unsubscribe();
                    context.unsubscribe = undefined;
                  }
                  // 释放上下文
                  this.releaseContext(canvas, context.type);
                }
                return; // 找到后退出
              }
            }
          }
        }
      },
      {
        childList: true,
        subtree: true,
      },
      {
        // 使用 filter 只处理 childList 类型的 mutations
        filter: (mutation) => mutation.type === 'childList',
        debugName: `canvasContextManager-${contextId.slice(-8)}`,
      }
    );

    // 存储取消订阅函数到 context 中
    const context = this.contexts.get(contextId);
    if (context) {
      context.unsubscribe = unsubscribe;
    }
  }

  /**
   * 启动清理定时器
   */
  private startCleanupTimer(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    this.cleanupInterval = window.setInterval(() => {
      this.cleanupOldestContexts();
    }, 10000); // 每10秒清理一次
  }

  /**
   * 销毁管理器
   */
  public destroy(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }

    this.forceCleanup();
    this.contexts.clear();
  }
}

// 导出单例实例
export const canvasContextManager = CanvasContextManager.getInstance();

// 导出便捷函数
export const getCanvasContext = (
  canvas: HTMLCanvasElement,
  type: '2d' | 'webgl' | 'webgl2' = '2d',
  id?: string
) => canvasContextManager.getContext(canvas, type, id);

export const releaseCanvasContext = (
  canvas: HTMLCanvasElement,
  type: '2d' | 'webgl' | 'webgl2' = '2d'
) => canvasContextManager.releaseContext(canvas, type);

export const cleanupCanvasContexts = () => canvasContextManager.forceCleanup();
