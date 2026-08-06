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
  // Kept out of the webpack bundle and required at runtime instead:
  //  - @prisma/client: bundling breaks the lookup of its native query engine binary.
  //  - nodemailer: it's CommonJS, and bundling mangles the interop so that
  //    `createTransport` comes back undefined at runtime.
  serverExternalPackages: ["@prisma/client", "@dental-compare/db", "nodemailer"],
  // Marking a package external stops webpack bundling it, but the file tracer
  // doesn't automatically ship it either — nodemailer is reached through Auth.js's
  // internal import, which nft can't follow statically. Without this the deployed
  // function has no nodemailer on disk at all.
  outputFileTracingIncludes: {
    "/login": ["./node_modules/nodemailer/**/*"],
    "/api/auth/**": ["./node_modules/nodemailer/**/*"],
  },
};

export default nextConfig;
