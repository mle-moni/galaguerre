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
        router.post("/auth/login", [AuthController, "login"]);
        router.post("/auth/logout", [AuthController, "logout"]);
    })
    .prefix("/api");

// authenticated routes
router
    .group(() => {
        router.get("/auth/me", [AuthController, "me"]);
        router.resource("games", GamesController).apiOnly();
    })
    .use(middleware.auth())
    .prefix("/api");

router.get("/*", async ({ view }) => view.render("index"));

router.post("/*", async ({ response, request }) =>
    response.notFound({ error: `404: POST ${request.url()}` }),
);
