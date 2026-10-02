import "react-native-url-polyfill/auto";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { createClient, processLock } from "@supabase/supabase-js";
import { config, isConfigured } from "./config";
import { createSecureStorage, type KeyStore } from "./secure-storage";

const browserStorage: KeyStore = {
  async getItem(key) {
    return typeof sessionStorage === "undefined"
      ? null
      : sessionStorage.getItem(key);
  },
  async setItem(key, value) {
    if (typeof sessionStorage !== "undefined")
      sessionStorage.setItem(key, value);
  },
  async removeItem(key) {
    if (typeof sessionStorage !== "undefined") sessionStorage.removeItem(key);
  },
};
const nativeStorage = createSecureStorage({
  getItem: (key) => SecureStore.getItemAsync(key),
  setItem: (key, value) =>
    SecureStore.setItemAsync(key, value, {
      keychainAccessible: SecureStore.WHEN_UNLOCKED_THIS_DEVICE_ONLY,
    }),
  removeItem: (key) => SecureStore.deleteItemAsync(key),
});

export const supabase = isConfigured
  ? createClient(config.supabaseUrl, config.supabaseKey, {
      auth: {
        storage: Platform.OS === "web" ? browserStorage : nativeStorage,
        autoRefreshToken: true,
        persistSession: true,
        detectSessionInUrl: false,
        lock: processLock,
      },
    })
  : null;

export function getSupabase() {
  if (!supabase)
    throw new Error("A ligação da app ainda não está configurada.");
  return supabase;
}
