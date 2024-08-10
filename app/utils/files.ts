import env from "#start/env";
import type { MultipartFile } from "@adonisjs/core/bodyparser";
import { cuid } from "@adonisjs/core/helpers";
import app from "@adonisjs/core/services/app";
import router from "@adonisjs/core/services/router";
import { rmSync } from "node:fs";
import { normalize, sep } from "node:path";

const PATH_TRAVERSAL_REGEX = /(?:^|[\\/])\.\.(?:[\\/]|$)/;

export const registerUploadRoute = () => {
    router.get("/uploads/*", ({ request, response }) => {
        const filePath = request.param("*").join(sep);
        const normalizedPath = normalize(filePath);

        if (PATH_TRAVERSAL_REGEX.test(normalizedPath)) {
            return response.badRequest("Malformed path");
        }

        const absolutePath = app.makePath("uploads", normalizedPath);
        return response.download(absolutePath);
    });
};

export const createFile = async (file: MultipartFile) => {
    const folder = "uploads";
    const name = `${cuid()}.${file.extname}`;

    await file.move(app.makePath(folder), {
        name,
    });

    return `${env.get("BACKEND_URL")}/${folder}/${name}`;
};

export const deleteFile = async (fileUrl: string) => {
    try {
        const url = fileUrl.replace(`${env.get("BACKEND_URL")}/`, "");
        rmSync(app.makePath(url));
    } catch (error) {}
};
