import type { KolInteractionsData } from '~contents/services/api';
import {
  createSocialCircleLayout,
  getProfileInitial,
  getSafeAvatarUrl,
  SOCIAL_CIRCLE_CENTER_SIZE,
  SOCIAL_CIRCLE_VIEWBOX_SIZE,
} from './socialCircleLayout';

const POSTER_SIZE = SOCIAL_CIRCLE_VIEWBOX_SIZE;
const INTERACTION_RANK_BORDER_COLORS = ['#F5C542', '#C7CDD6', '#CD7F32'];
const AVATAR_LOAD_TIMEOUT_MS = 5000;

export interface SocialCirclePosterLabels {
  madeBy: string;
}

interface LoadedAvatar {
  url: string;
  image: CanvasImageSource | null;
}

const loadAvatar = async (
  rawUrl: string | null | undefined,
  signal?: AbortSignal,
): Promise<LoadedAvatar> => {
  const url = getSafeAvatarUrl(rawUrl);
  if (!url) return { url: '', image: null };

  const controller = new AbortController();
  const abortRequest = () => controller.abort();
  const timeout = window.setTimeout(abortRequest, AVATAR_LOAD_TIMEOUT_MS);
  signal?.addEventListener('abort', abortRequest, { once: true });
  if (signal?.aborted) abortRequest();

  try {
    const response = await fetch(url, {
      signal: controller.signal,
      credentials: 'omit',
    });
    if (!response.ok) return { url, image: null };
    const blob = await response.blob();
    if (signal?.aborted) return { url, image: null };

    if (typeof createImageBitmap === 'function') {
      return { url, image: await createImageBitmap(blob) };
    }

    const objectUrl = URL.createObjectURL(blob);
    const image = await new Promise<HTMLImageElement | null>((resolve) => {
      const element = new Image();
      element.onload = () => resolve(element);
      element.onerror = () => resolve(null);
      element.src = objectUrl;
    });
    URL.revokeObjectURL(objectUrl);
    return { url, image };
  } catch {
    return { url, image: null };
  } finally {
    window.clearTimeout(timeout);
    signal?.removeEventListener('abort', abortRequest);
  }
};

const loadAvatars = async (
  urls: Array<string | null | undefined>,
  signal?: AbortSignal,
) => {
  const uniqueUrls = Array.from(
    new Set(urls.map(getSafeAvatarUrl).filter(Boolean)),
  );
  const result = new Map<string, CanvasImageSource | null>();
  const queue = [...uniqueUrls];

  await Promise.all(
    Array.from({ length: Math.min(4, queue.length) }, async () => {
      while (queue.length && !signal?.aborted) {
        const url = queue.shift()!;
        const loaded = await loadAvatar(url, signal);
        result.set(url, loaded.image);
      }
    }),
  );

  return result;
};

const getFallbackColor = (value: string) => {
  let hash = 0;
  for (const char of value) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  const colors = ['#1D9BF0', '#8B5CF6', '#10B981', '#F59E0B', '#EC4899'];
  return colors[hash % colors.length];
};

const drawCircleAvatar = ({
  context,
  x,
  y,
  size,
  avatar,
  name,
  username,
  image,
  borderColor,
  borderWidth,
  shadowColor,
}: {
  context: CanvasRenderingContext2D;
  x: number;
  y: number;
  size: number;
  avatar?: string | null;
  name?: string | null;
  username?: string | null;
  image?: CanvasImageSource | null;
  borderColor: string;
  borderWidth: number;
  shadowColor?: string;
}) => {
  const radius = size / 2;
  if (shadowColor) {
    context.save();
    context.beginPath();
    context.arc(x, y, radius - 2, 0, Math.PI * 2);
    context.fillStyle = borderColor;
    context.shadowColor = shadowColor;
    context.shadowBlur = 12;
    context.shadowOffsetY = 3;
    context.fill();
    context.restore();
  }

  context.save();
  context.beginPath();
  context.arc(x, y, radius, 0, Math.PI * 2);
  context.clip();

  if (avatar && image) {
    context.drawImage(image, x - radius, y - radius, size, size);
  } else {
    context.fillStyle = getFallbackColor(username || name || '?');
    context.fillRect(x - radius, y - radius, size, size);
    context.fillStyle = '#FFFFFF';
    context.font = `700 ${Math.round(size * 0.42)}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(getProfileInitial(name, username), x, y + size * 0.02);
  }
  context.restore();

  context.beginPath();
  context.arc(x, y, radius - borderWidth / 2, 0, Math.PI * 2);
  context.strokeStyle = borderColor;
  context.lineWidth = borderWidth;
  context.stroke();
};

const canvasToBlob = (canvas: HTMLCanvasElement) =>
  new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error('Unable to create PNG'));
    }, 'image/png');
  });

export const renderSocialCirclePoster = async ({
  data,
  labels,
  theme,
  signal,
  includeAvatars = true,
}: {
  data: KolInteractionsData;
  labels: SocialCirclePosterLabels;
  theme: 'light' | 'dark';
  signal?: AbortSignal;
  includeAvatars?: boolean;
}): Promise<Blob> => {
  const canvas = document.createElement('canvas');
  canvas.width = POSTER_SIZE;
  canvas.height = POSTER_SIZE;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas is not available');

  const avatars = includeAvatars
    ? await loadAvatars(
        [data.kol.avatar, ...data.items.map((item) => item.kol.avatar)],
        signal,
      )
    : new Map<string, CanvasImageSource | null>();
  if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');

  // The dialog displays this exact PNG; copying reuses the same Blob.
  const isLight = theme === 'light';
  const borderColor = isLight
    ? 'rgba(107, 114, 128, 0.2)'
    : 'rgba(163, 172, 184, 0.4)';
  context.fillStyle = isLight ? '#FFFFFF' : '#1A2634';
  context.fillRect(0, 0, POSTER_SIZE, POSTER_SIZE);

  const layout = createSocialCircleLayout(data.items);
  const interactionRankBorders = new Map(
    [...data.items.slice(0, 20)]
      .sort((a, b) => b.score - a.score)
      .slice(0, INTERACTION_RANK_BORDER_COLORS.length)
      .map((item, index) => [item, INTERACTION_RANK_BORDER_COLORS[index]]),
  );
  for (const node of layout) {
    const avatarUrl = getSafeAvatarUrl(node.item.kol.avatar);
    const interactionRankBorder = interactionRankBorders.get(node.item);
    drawCircleAvatar({
      context,
      x: node.x,
      y: node.y,
      size: node.size,
      avatar: avatarUrl,
      name: node.item.kol.name,
      username: node.item.kol.username,
      image: avatars.get(avatarUrl),
      borderColor: interactionRankBorder || borderColor,
      borderWidth: interactionRankBorder ? 8 : 4,
      shadowColor: interactionRankBorder
        ? isLight
          ? 'rgba(15, 23, 42, 0.16)'
          : 'rgba(0, 0, 0, 0.28)'
        : undefined,
    });
  }

  const centerAvatar = getSafeAvatarUrl(data.kol.avatar);
  drawCircleAvatar({
    context,
    x: POSTER_SIZE / 2,
    y: POSTER_SIZE / 2,
    size: SOCIAL_CIRCLE_CENTER_SIZE,
    avatar: centerAvatar,
    name: data.kol.name,
    username: data.kol.username,
    image: avatars.get(centerAvatar),
    borderColor,
    borderWidth: 4,
  });

  // Keep a few visible marks so on-screen captures carry branding without visual noise.
  context.fillStyle = isLight
    ? 'rgba(71, 85, 105, 0.12)'
    : 'rgba(255, 255, 255, 0.12)';
  context.font =
    '700 56px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  for (const { x, y } of [
    { x: 180, y: 190 },
    { x: 825, y: 455 },
    { x: 225, y: 820 },
  ]) {
    context.save();
    context.translate(x, y);
    context.rotate(-Math.PI / 6);
    context.fillText('XHunt', 0, 0);
    context.restore();
  }
  context.textAlign = 'right';
  context.textBaseline = 'alphabetic';
  context.fillStyle = isLight ? '#4A5568' : '#A0AEC0';
  context.font =
    '600 24px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif';
  context.fillText(labels.madeBy, 980, 980);

  return canvasToBlob(canvas);
};
