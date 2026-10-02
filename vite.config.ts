import { defineConfig } from "vite";

// Relative base so the build works under the GitHub Pages project subpath
// (/feathers/) and when embedded elsewhere (planned playfair.com embed).
export default defineConfig({
  base: "./",
  test: {
    environment: "node",
    include: ["test/**/*.test.ts"],
  },
});
