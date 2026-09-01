// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @huggingface/transformers seeds a PRNG at module scope, which the server runtime
// rejects ("Disallowed operation called within global scope") — that crashed every
// SSR request with a 500. The library is only ever used in the browser, so swap it
// for a stub in every non-client environment.
const transformersStub = fileURLToPath(
  new URL("./src/lib/transformers-ssr-stub.ts", import.meta.url),
);

const stubTransformersOnServer = {
  name: "stub-transformers-on-server",
  enforce: "pre" as const,
  resolveId(this: { environment?: { name?: string } }, source: string) {
    if (source !== "@huggingface/transformers") return null;
    if (this.environment?.name === "client") return null;
    return transformersStub;
  },
};

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    plugins: [stubTransformersOnServer],
  },
});
