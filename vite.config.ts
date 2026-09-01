// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - TanStack devtools (dev-only, first), tanstackStart, viteReact, tailwindcss, tsConfigPaths,
//     nitro (build-only using cloudflare as a default target), VITE_* env injection, @ path alias,
//     React/TanStack dedupe, error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... }, etc... }) if needed.
import { fileURLToPath } from "node:url";

import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// @huggingface/transformers seeds a PRNG at module scope, which the Worker runtime
// rejects ("Disallowed operation called within global scope"). It is only ever used
// in the browser, so alias it away from the SSR bundle entirely.
const transformersStub = fileURLToPath(
  new URL("./src/lib/transformers-ssr-stub.ts", import.meta.url),
);

export default defineConfig({
  tanstackStart: {
    // Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
    // nitro/vite builds from this
    server: { entry: "server" },
  },
  vite: {
    environments: {
      ssr: {
        resolve: {
          alias: [{ find: /^@huggingface\/transformers$/, replacement: transformersStub }],
        },
      },
    },
  },
});
