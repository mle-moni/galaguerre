import { fsReadAll } from "@adonisjs/core/helpers";
import type { HttpContext } from "@adonisjs/core/http";
import app from "@adonisjs/core/services/app";
import { run } from "@softwaretechnik/dbml-renderer";
import fs, { createReadStream } from "node:fs";
import { dbmlComputeModelFile } from "./dbml_compute_model_file.js";

export interface DbmlContext {
    dbmlString: string;
    relations: string[];
    groups: Map<string, string[]>;
}

async function generateSvg(dbmlContent: string): Promise<string> {
    try {
        const svgContent = run(dbmlContent, "svg");
        return svgContent;
    } catch (error: unknown) {
        if (typeof error === "object" && error !== null && "message" in error) {
            throw new Error(`Error generating SVG: ${(error as { message: string }).message}`);
        }
        throw new Error("Error generating SVG: Unknown error");
    }
}

interface GetSvgStringOptions {
    saveDbml?: boolean;
    saveSvg?: boolean;
}

export const getSvgString = async ({ saveDbml, saveSvg }: GetSvgStringOptions = {}) => {
    const files = await fsReadAll("app/models");

    const dbmlContext: DbmlContext = {
        dbmlString: "",
        relations: [],
        groups: new Map(),
    };

    files.forEach((file) => {
        dbmlComputeModelFile(file, dbmlContext);
    });

    const allRelations = dbmlContext.relations.join("\n\n");

    dbmlContext.dbmlString += `\n${allRelations}\n\n`;

    const allGroups = Array.from(dbmlContext.groups.entries())
        .map(
            ([groupName, models]) => `TableGroup ${groupName} {
  ${models.join("\n  ")}
}`,
        )
        .join("\n\n");

    dbmlContext.dbmlString += `${allGroups}\n\n`;

    if (saveDbml) fs.writeFileSync("docs/dbml/models.dbml", dbmlContext.dbmlString);

    const svgString = await generateSvg(dbmlContext.dbmlString);

    if (saveSvg) fs.writeFileSync("docs/dbml/models.svg", svgString);

    return svgString;
};

export const dbmlSvgRoute = async ({ response }: HttpContext) => {
    response.type(".svg");

    if (app.inProduction) {
        return response.stream(createReadStream("docs/dbml/models.svg"));
    }

    return getSvgString({ saveSvg: true, saveDbml: true });
};
