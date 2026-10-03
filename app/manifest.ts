import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "daymark · Discipline Tracker",
    short_name: "daymark",
    description: "A thoughtful daily routine and one-year discipline tracker.",
    start_url: "/",
    display: "standalone",
    background_color: "#f7f6f2",
    theme_color: "#f7f6f2",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}