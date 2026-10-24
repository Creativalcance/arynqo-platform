// A session can exceed the per-value size supported by some native keychains.
// Commit a new manifest only after all chunks have been written successfully.
export type KeyStore = {
  getItem: (key: string) => Promise<string | null>;
  setItem: (key: string, value: string) => Promise<void>;
  removeItem: (key: string) => Promise<void>;
};
type Manifest = { version: 1; generation: string; count: number };
const chunkSize = 450; // At most 1,800 UTF-8 bytes, including non-ASCII metadata.
function manifest(raw: string | null): Manifest | null {
  try {
    const value = JSON.parse(raw ?? "null");
    return value?.version === 1 &&
      /^[a-z0-9-]+$/.test(value.generation) &&
      Number.isInteger(value.count) &&
      value.count >= 0 &&
      value.count <= 512
      ? value
      : null;
  } catch {
    return null;
  }
}
const partKey = (key: string, m: Manifest, index: number) =>
  `${key}.${m.generation}.${index}`;

export function createSecureStorage(store: KeyStore): KeyStore {
  async function clean(key: string, m: Manifest | null) {
    if (m)
      await Promise.allSettled(
        Array.from({ length: m.count }, (_, i) =>
          store.removeItem(partKey(key, m, i)),
        ),
      );
  }
  return {
    async getItem(key) {
      const current = manifest(await store.getItem(key));
      if (!current) return null;
      const parts = await Promise.all(
        Array.from({ length: current.count }, (_, i) =>
          store.getItem(partKey(key, current, i)),
        ),
      );
      return parts.some((part) => part === null) ? null : parts.join("");
    },
    async setItem(key, value) {
      const previous = manifest(await store.getItem(key));
      const chars = Array.from(value);
      const next: Manifest = {
        version: 1,
        generation: `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`,
        count: Math.ceil(chars.length / chunkSize),
      };
      if (next.count > 512)
        throw new Error(
          "Sessão demasiado grande para guardar neste dispositivo.",
        );
      try {
        // Sequential writes make cleanup reliable if a keychain operation fails.
        for (let i = 0; i < next.count; i++)
          await store.setItem(
            partKey(key, next, i),
            chars.slice(i * chunkSize, (i + 1) * chunkSize).join(""),
          );
        await store.setItem(key, JSON.stringify(next));
      } catch (error) {
        await clean(key, next);
        throw error;
      }
      await clean(key, previous);
    },
    async removeItem(key) {
      const previous = manifest(await store.getItem(key));
      await store.removeItem(key);
      await clean(key, previous);
    },
  };
}
