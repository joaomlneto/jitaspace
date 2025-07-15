import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Jita",
    short_name: "Jita",
    description: "EVE Online Tools and Resources",
    start_url: "/",
    display: "standalone",
    background_color: "#000000",
    theme_color: "#ABC2D9",
    icons: [
      {
        src: "/logo-192-upscaled.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/logo-512-upscaled.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
