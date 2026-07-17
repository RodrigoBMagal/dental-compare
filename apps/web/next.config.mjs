import { fileURLToPath } from "node:url";
import path from "node:path";
import fs from "node:fs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Windows profiles (and even %TEMP%) commonly contain reparse-point folders (the
// localized "PrintHood" shell folder, WinSAT's cache dir, ...) that deny directory
// listing to the owning user. Next's build-time glob scan walks USERPROFILE and
// crashes with EPERM if it meets one. Pointing USERPROFILE at an empty directory we
// control for the duration of this process avoids it.
if (process.platform === "win32") {
  const safeHome = path.join(__dirname, "../../.next-build-home");
  fs.mkdirSync(safeHome, { recursive: true });
  process.env.USERPROFILE = safeHome;
}

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [{ protocol: "https", hostname: "**" }],
  },
  // Without this, Next.js infers the workspace root by scanning upward from this
  // directory and can hit permission-restricted folders in the user's profile on Windows.
  outputFileTracingRoot: path.join(__dirname, "../.."),
  eslint: { ignoreDuringBuilds: true },
  // Prisma's client does dynamic requires that confuse Next's output-file-tracing
  // (@vercel/nft), which otherwise tries to walk far more of the filesystem than needed.
  serverExternalPackages: ["@prisma/client", "@dental-compare/db"],
  // The query engine binary is loaded via a dynamically constructed path at runtime,
  // so nft's static analysis misses it — without this, Vercel's serverless bundle
  // ships without the .so.node file and Prisma fails at runtime with "could not
  // locate the Query Engine" even though it was generated correctly at build time.
  outputFileTracingIncludes: {
    "/**/*": ["../../packages/db/generated/**/*"],
  },
};

export default nextConfig;
