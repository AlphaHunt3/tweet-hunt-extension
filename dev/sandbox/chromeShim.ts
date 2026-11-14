type Changes = Record<string, { oldValue?: unknown; newValue?: unknown }>;
type Listener = (changes: Changes, area: string) => void;

const PREFIX = 'xh-sandbox:';
const listeners = new Set<Listener>();

const read = (key: string) => {
  const raw = localStorage.getItem(PREFIX + key);
  return raw === null ? undefined : JSON.parse(raw);
};
const keys = () =>
  Object.keys(localStorage)
    .filter((key) => key.startsWith(PREFIX))
    .map((key) => key.slice(PREFIX.length));
const emit = (changes: Changes) => {
  if (Object.keys(changes).length) listeners.forEach((listener) => listener(changes, 'local'));
};

const local = {
  async get(query?: string | string[] | Record<string, unknown> | null) {
    const wanted =
      query == null ? keys() : typeof query === 'string' ? [query] : Array.isArray(query) ? query : Object.keys(query);
    const result: Record<string, unknown> = {};
    for (const key of wanted) {
      const value = read(key);
      if (value !== undefined) result[key] = value;
      else if (query && typeof query === 'object' && !Array.isArray(query)) result[key] = query[key];
    }
    return result;
  },
  async set(items: Record<string, unknown>) {
    const changes: Changes = {};
    for (const [key, value] of Object.entries(items)) {
      changes[key] = { oldValue: read(key), newValue: value };
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    }
    emit(changes);
  },
  async remove(query: string | string[]) {
    const changes: Changes = {};
    for (const key of typeof query === 'string' ? [query] : query) {
      changes[key] = { oldValue: read(key) };
      localStorage.removeItem(PREFIX + key);
    }
    emit(changes);
  },
  async clear() {
    const changes: Changes = {};
    for (const key of keys()) {
      changes[key] = { oldValue: read(key) };
      localStorage.removeItem(PREFIX + key);
    }
    emit(changes);
  },
  async getBytesInUse() {
    return 0;
  },
};

const noopEvent = { addListener() {}, removeListener() {}, hasListener: () => false };

Object.assign(globalThis, {
  chrome: {
    storage: {
      local,
      sync: local,
      session: local,
      onChanged: {
        addListener: (listener: Listener) => listeners.add(listener),
        removeListener: (listener: Listener) => listeners.delete(listener),
        hasListener: (listener: Listener) => listeners.has(listener),
      },
    },
    runtime: {
      id: 'xhunt-sandbox',
      getManifest: () => ({ manifest_version: 3, version: '0.0.0-sandbox' }),
      getURL: (path: string) => path,
      sendMessage: async () => undefined,
      onMessage: noopEvent,
      connect: () => ({ postMessage() {}, disconnect() {}, onMessage: noopEvent, onDisconnect: noopEvent }),
    },
  },
});

// Plasmo 存储把值序列化成 JSON 字符串再交给 chrome.storage，初始值也要照这个格式写
export async function seedStorage(values: Record<string, unknown>) {
  for (const [key, value] of Object.entries(values)) {
    if (read(key) === undefined) localStorage.setItem(PREFIX + key, JSON.stringify(JSON.stringify(value)));
  }
}
