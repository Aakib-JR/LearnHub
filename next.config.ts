import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
  partialPrefetching: true,
  images: {
    remotePatterns: [
      { protocol: "https", hostname: "www.devwithai.blog" },
      { protocol: "https", hostname: "encrypted-tbn0.gstatic.com" },
      { protocol: "https", hostname: "technosoftacademy.in" },
      { protocol: "https", hostname: "coursecentral.in" },
      { protocol: "https", hostname: "i.pinimg.com" },
      { protocol: "https", hostname: "www.syncfusion.com" },
      { protocol: "https", hostname: "codeit.com.np" },
      { protocol: "https", hostname: "solvaria.com" },
      { protocol: "https", hostname: "img-c.udemycdn.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
    ],
  },
};

export default nextConfig;
