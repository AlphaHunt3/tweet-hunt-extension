import React, { Component } from 'react';
import { captureReactError } from '~/utils/errorHandler';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  fallback?: React.ComponentType<{ error: Error; resetError: () => void }>;
  onError?: (error: Error, errorInfo: React.ErrorInfo) => void;
  name?: string; // 用于标识不同的 ErrorBoundary
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    // 更新 state，下次渲染显示 fallback UI
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    try {
      // 捕获到全局错误处理器
      captureReactError(error, errorInfo, this.props.name || 'Unknown ErrorBoundary');

      // 调用自定义错误处理器
      if (this.props.onError) {
        this.props.onError(error, errorInfo);
      }

      // 开发环境下的详细日志
      if (process.env.PLASMO_PUBLIC_ENV === 'dev') {
        console.group('🚨 React Error Boundary Caught Error');
        console.log('Error:', error);
        console.log('Error Info:', errorInfo);
        console.log('Component Stack:', errorInfo.componentStack);
        console.log('Error Boundary Name:', this.props.name || 'Unknown');
        console.groupEnd();
      }
    } catch (handlingError) {
      console.log('Error in ErrorBoundary.componentDidCatch:', handlingError);
    }
  }

  resetError = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError) {
      // 如果提供了自定义 fallback 组件，使用它
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} resetError={this.resetError} />;
      }

      // 默认情况下渲染空内容（对用户友好）
      return null;
    }

    return this.props.children;
  }
}

export default ErrorBoundary;
