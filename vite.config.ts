import adonisjs from "@adonisjs/vite/client";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { defineConfig } from "vite";

export default defineConfig({
    plugins: [
        adonisjs({
            /**
             * Entrypoints of your application. Each entrypoint will
             * result in a separate bundle.
             */
            entrypoints: ["frontend/src/app.tsx"],

            /**
             * Paths to watch and reload the browser on file change
             */
            reload: ["resources/views/**/*.edge"],
        }),
        react(),
    ],
    resolve: {
        alias: {
            "~": path.resolve(__dirname, "frontend/src"),
        },
    },
});
