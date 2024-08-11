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

import GamesController from "#controllers/games_controller";
import { registerUploadRoute } from "../app/utils/files.js";
import { middleware } from "./kernel.js";

router.get("/", async () => {
    return {
        hello: "world",
    };
});

registerUploadRoute();

router
    .group(() => {
        router.resource("games", GamesController).apiOnly();
    })
    .use(middleware.auth());
