import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Porteiro",
    short_name: "Porteiro",
    description: "Redes sociais só entram passando por aqui.",
    start_url: "/",
    display: "standalone",
    background_color: "#14161a",
    theme_color: "#14161a",
    icons: [
      { src: "/icon", sizes: "512x512", type: "image/png" },
      { src: "/apple-icon", sizes: "180x180", type: "image/png" },
    ],
  };
}
