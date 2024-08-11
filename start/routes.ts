/*
|--------------------------------------------------------------------------
| Routes file
|--------------------------------------------------------------------------
|
| The routes file is used for defining the HTTP routes.
|
*/

import router from "@adonisjs/core/services/router";

import "#adomin/routes/adomin_router";
import "../app/dbml/dbml_router.js";

import AuthController from "#controllers/auth/auth_controller";
import GamesController from "#controllers/games/games_controller";
import { registerUploadRoute } from "../app/utils/files.js";
import { middleware } from "./kernel.js";

registerUploadRoute();

// public routes
router
    .group(() => {
        router.get("/", () => ({ message: "Galaguerre API" }));
        router.get("/auth/me", [AuthController, "me"]);
    })
    .prefix("/api");

// authenticated routes
router
    .group(() => {
        router.resource("games", GamesController).apiOnly();
    })
    .use(middleware.auth())
    .prefix("/api");

router.get("/*", async ({ view }) => view.render("index"));
