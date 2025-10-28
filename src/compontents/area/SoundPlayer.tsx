import React, { useEffect, useRef, useState } from 'react';
import { localStorageInstance } from '~storage/index.ts';
import { defaultSound } from '~compontents/pages/constants.tsx';

export const PLAY_SOUND_EVENT = 'xhunt:play-sound';
export const PLAY_CONFIGURED_SOUND_EVENT = 'xhunt:play-configured-sound';

export type PlaySoundDetail = {
  url: string;
};

const SoundPlayer: React.FC = () => {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  // 初始化默认提示音
  useEffect(() => {
    const initializeDefaultSound = async () => {
      try {
        const stored = (await localStorageInstance.get('@xhunt/sound')) as
          | { url?: string; data?: string }
          | undefined;

        if (!stored || (!stored.data && stored.url !== '__MUTE__')) {
          if (defaultSound?.data) {
            await localStorageInstance.set('@xhunt/sound', {
              url: defaultSound.url,
              data: defaultSound.data,
            });
          }
        }
      } catch (error) {
        // 忽略初始化错误
      }
    };

    initializeDefaultSound();
  }, []);

  useEffect(() => {
    const playSource = async (src: string) => {
      try {
        const audio = audioRef.current;
        if (!audio) {
          return;
        }

        setIsLoading(true);

        // 处理不同类型的音频源
        const isRemote = /^https?:\/\//i.test(src);
        const isBase64 = /^data:audio\//i.test(src);
        let finalSrc = src;

        if (isRemote) {
          // 清理旧的 URL
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
            objectUrlRef.current = null;
          }
          // 以 CORS 模式抓取音频，然后转为 blob URL 规避 CSP 限制
          const resp = await fetch(src, { mode: 'cors' });
          const blob = await resp.blob();
          finalSrc = URL.createObjectURL(blob);
          objectUrlRef.current = finalSrc;
        } else if (isBase64) {
          finalSrc = src;
        } else {
          finalSrc = src;
        }

        // 重用同一元素播放
        audio.pause();
        audio.src = finalSrc;
        audio.currentTime = 0;
        await audio.play();
      } catch (error) {
        // 忽略播放失败
      } finally {
        setIsLoading(false);
      }
    };

    const handler = async (e: Event) => {
      const custom = e as CustomEvent<PlaySoundDetail>;
      const url = custom?.detail?.url;
      if (!url) return;
      await playSource(url);
    };

    const playConfiguredHandler = async () => {
      try {
        const stored = (await localStorageInstance.get('@xhunt/sound')) as
          | { url?: string; data?: string }
          | undefined;

        if (!stored) {
          return;
        }
        if (stored.url === '__MUTE__') {
          return;
        }
        const src = stored.data || stored.url;
        if (!src) {
          return;
        }
        await playSource(src);
      } catch (error) {
        // 忽略播放失败
      }
    };

    window.addEventListener(PLAY_SOUND_EVENT, handler as EventListener);
    window.addEventListener(
      PLAY_CONFIGURED_SOUND_EVENT,
      playConfiguredHandler as EventListener
    );
    return () => {
      window.removeEventListener(PLAY_SOUND_EVENT, handler as EventListener);
      window.removeEventListener(
        PLAY_CONFIGURED_SOUND_EVENT,
        playConfiguredHandler as EventListener
      );
      if (audioRef.current) {
        audioRef.current.pause();
      }
    };
  }, []);

  return (
    <audio
      key='xhunt-sound-player'
      ref={audioRef}
      preload='auto'
      style={{ display: 'none' }}
    />
  );
};

export default SoundPlayer;

export const requestPlayConfiguredSound = () => {
  try {
    const event = new CustomEvent(PLAY_CONFIGURED_SOUND_EVENT);
    window.dispatchEvent(event);
  } catch {}
};
