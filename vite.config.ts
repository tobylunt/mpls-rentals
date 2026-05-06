import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

// Builds for GH Pages serve at https://tobylunt.github.io/mpls-rentals/, so
// asset URLs must be prefixed with /mpls-rentals/. Dev keeps the root base.
export default defineConfig(({ command }) => ({
  base: command === "build" ? "/mpls-rentals/" : "/",
  plugins: [react()],
  test: {
    globals: true,
    environment: "node",
  },
}));
