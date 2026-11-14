import { renderHook, waitFor } from '@testing-library/react';
import { describe, expect, test, vi } from 'vitest';
import { useSoulInfo } from './useSoulInfo';

const getSoulInfo = vi.fn(async (id: string) => ({ score: 87, twitterId: id }));
vi.mock('~contents/services/api.ts', () => ({ getSoulInfo: (id: string) => getSoulInfo(id) }));

describe('useSoulInfo', () => {
  test('loads once per twitter id and shares the result', async () => {
    const first = renderHook(() => useSoulInfo('42'));
    await waitFor(() => expect(first.result.current.data?.score).toBe(87));
    const second = renderHook(() => useSoulInfo('42'));
    await waitFor(() => expect(second.result.current.data?.score).toBe(87));
    expect(getSoulInfo).toHaveBeenCalledTimes(1);
  });

  test('retries an id whose request failed', async () => {
    getSoulInfo.mockRejectedValueOnce(new Error('offline'));
    const failed = renderHook(() => useSoulInfo('7'));
    await waitFor(() => expect(failed.result.current.loading).toBe(false));
    expect(failed.result.current.data).toBeUndefined();
    const retried = renderHook(() => useSoulInfo('7'));
    await waitFor(() => expect(retried.result.current.data?.twitterId).toBe('7'));
  });

  test('does nothing without an id', () => {
    const { result } = renderHook(() => useSoulInfo(''));
    expect(result.current).toEqual({ data: undefined, loading: false });
  });
});
