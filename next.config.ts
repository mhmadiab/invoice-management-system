import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // PDFKit reads its bundled font metrics through Node's filesystem APIs.
  serverExternalPackages: ["pdfkit"],
};

export default nextConfig;
