import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Porteiro",
    short_name: "Porteiro",
    description: "Redes sociais só entram passando por aqui.",
    start_url: "/",
    display: "standalone",
    background_color: "#0D0F13",
    theme_color: "#0D0F13",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
