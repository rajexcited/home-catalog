import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Home Catalog",
    short_name: "Catalog",
    description: "Track containers, items, and photos with an installable home inventory app.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4efe8",
    theme_color: "#0f172a",
    orientation: "portrait",
    icons: [
      {
        // Minimum size Chrome requires for PWA installability on Android
        src: "/api/icon-192",
        sizes: "192x192",
        type: "image/png"
      },
      {
        // Used for the install-prompt preview and Android splash screen
        src: "/icon.png",
        sizes: "512x512",
        type: "image/png"
      }
    ]
  };
}
