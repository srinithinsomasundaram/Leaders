import { defineConfig, loadEnv } from "vite";
import react from "@vitejs/plugin-react";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import tsconfigPaths from "vite-tsconfig-paths";
import tailwindcss from "@tailwindcss/vite";

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "");
  Object.assign(process.env, env);

  return {
    define: {
      'import.meta.env.VITE_SUPABASE_URL': JSON.stringify(
        env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || ''
      ),
      'import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY': JSON.stringify(
        env.VITE_SUPABASE_PUBLISHABLE_KEY || process.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''
      ),
      'import.meta.env.VITE_SUPABASE_PROJECT_ID': JSON.stringify(
        env.VITE_SUPABASE_PROJECT_ID || process.env.VITE_SUPABASE_PROJECT_ID || ''
      ),
    },
    plugins: [
      tsconfigPaths({ projects: ["./tsconfig.json"] }),
      tailwindcss(),
      tanstackStart({
        importProtection: {
          behavior: "error",
          client: {
            files: ["**/server/**"],
            specifiers: ["server-only"]
          }
        },
        server: { entry: "server" },
        serverFns: {
          disableCsrfMiddlewareWarning: true,
        },
      }),
      react(),
    ],
    resolve: {
      alias: {
        "@": `${process.cwd()}/src`,
      },
    },
    server: {
      host: "0.0.0.0",
      port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
      strictPort: true,
    },
    preview: {
      host: "0.0.0.0",
      port: process.env.PORT ? parseInt(process.env.PORT) : 8080,
      strictPort: true,
      allowedHosts: ["leaders.yespstudio.com"],
    },
    build: {
      rollupOptions: {
        external: ["@google/generative-ai"],
      },
    },
    ssr: {
      noExternal: [],
      external: ["@google/generative-ai"],
    },
  };
});
