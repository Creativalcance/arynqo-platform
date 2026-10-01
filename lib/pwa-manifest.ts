import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ARYNQO — International talent platform",
    short_name: "ARYNQO",
    description:
      "International talent and recruitment platform.",
    start_url: "/app",
    scope: "/",
    display: "standalone",
    background_color: "#050816",
    theme_color: "#050816",
    orientation: "portrait",
    categories: ["business", "productivity", "education"],
    icons: [
      {
        src: "/favicon.ico",
        sizes: "any",
        type: "image/x-icon",
      },
    ],
  };
}