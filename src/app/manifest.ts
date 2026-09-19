import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Hũ — Quản lý chi tiêu",
    short_name: "Hũ",
    description: "Chia thu nhập vào 9 hũ ngân sách và theo dõi chi tiêu gia đình.",
    start_url: "/",
    display: "standalone",
    background_color: "#f3f2f2",
    theme_color: "#ec3013",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
