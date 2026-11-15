import { MOCK_MESSAGES } from './fixtures';

class SandboxNacosCacheManager {
  init() {}
  cleanup() {}
  async fetchWithCache<T = unknown>(dataId: string): Promise<T | undefined> {
    if (dataId === 'xhunt_config') {
      return {
        errorsReport: 0,
        delayedReport: 0,
        kolCapabilityModelDisplay: true,
        testConfig: { features: [], testers: [] },
        canaryConfig: { features: [] },
        flexibleTesting: {},
      } as T;
    }
    return (dataId.startsWith('xhunt_message') ? MOCK_MESSAGES : undefined) as T | undefined;
  }
  invalidate() {}
  clearCache() {}
  getStats() {
    return {};
  }
}

export const nacosCacheManager = new SandboxNacosCacheManager();
export default SandboxNacosCacheManager;
