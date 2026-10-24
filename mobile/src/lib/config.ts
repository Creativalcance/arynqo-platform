export const config = {
  supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL ?? "",
  supabaseKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY ?? "",
  websiteUrl: process.env.EXPO_PUBLIC_WEBSITE_URL ?? "https://arynqo.com",
};

export const isConfigured = Boolean(config.supabaseUrl && config.supabaseKey);

export function websitePath(path: string) {
  return new URL(path, config.websiteUrl).toString();
}
