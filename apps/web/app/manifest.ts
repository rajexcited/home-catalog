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
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png"
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png"
      },
      {
        src: "/apple-icon.png",
        sizes: "180x180",
        type: "image/png"
      }
    ]
  };
}
