import stringHelpers from "@adonisjs/core/helpers/string";
import fs from "node:fs";
import type { DbmlContext } from "./dbml_svg_route.js";

interface ModelColumn {
    type: string;
    name: string;
    isPrimary: boolean;
    isNullable: boolean;
}

const getHeaderColor = (color: string | null) => `[headercolor: ${color ?? "#d35400"}]`;

const getParams = (col: ModelColumn) => {
    const params: string[] = [];
    if (col.isPrimary) params.push("primary key");
    if (!col.isNullable) params.push("not null");

    if (params.length === 0) return "";

    return ` [${params.join(", ")}]`;
};

const getForeignKey = (lines: string[], i: number) => {
    if (lines[i].includes("foreignKey:")) {
        return lines[i].split('foreignKey: "')[1].split('"')[0];
    }
    if (lines[i + 1].includes("foreignKey:")) {
        return lines[i + 1].split('foreignKey: "')[1].split('"')[0];
    }

    return stringHelpers.camelCase(`${lines[i].split("@belongsTo(() => ")[1].split(/\W/)[0]}Id`);
};

const getLocalKey = (lines: string[], i: number) => {
    if (lines[i].includes("localKey:")) {
        return lines[i].split("localKey: '")[1].split("'")[0];
    }
    if (lines[i + 1].includes("localKey:")) {
        return lines[i + 1].split("localKey: '")[1].split("'")[0];
    }
    return "id";
};

export const dbmlComputeModelFile = (file: string, dbmlContext: DbmlContext) => {
    const content = fs.readFileSync(`app/models/${file}`, "utf-8");
    const headerColor = content.includes("@dbml-header-color")
        ? content.split("@dbml-header-color ")[1].split("\n")[0]
        : null;
    const dbmlGroups: string[] = content.includes("@dbml-group ")
        ? content.split("@dbml-group ")[1].split("\n")[0].split(",")
        : [];

    const lines = content.split("\n");

    let modelName: string | null = null;
    const columns: ModelColumn[] = [];

    for (let i = 0; i < lines.length; i++) {
        if (lines[i].includes("export default class")) {
            modelName = lines[i].split(" ")[3];
            continue;
        }

        if (lines[i].includes("@belongsTo")) {
            const refName = lines[i].split("@belongsTo(() => ")[1].split(/\W/)[0];
            const foreignKey = getForeignKey(lines, i);
            const localKey = getLocalKey(lines, i);

            dbmlContext.relations.push(`Ref: ${modelName}.${foreignKey} > ${refName}.${localKey}`);
            continue;
        }

        if (lines[i].includes("@column")) {
            const isPrimary = lines[i].includes("isPrimary");
            i++;
            const isNullable = lines[i].includes("| null");
            const name = lines[i].split("declare ")[1].split(": ")[0];
            const type = lines[i].split(": ")[1].split("|")[0];

            let finalType = type.replace("[]", "Array");
            if (finalType[finalType.length - 1] === ";") {
                finalType = finalType.slice(0, -1);
            }

            columns.push({ type: finalType, name, isPrimary, isNullable });
        }
    }
    if (modelName === null) throw new Error("Model name not found");

    dbmlGroups.forEach((dbmlGroup) => {
        const found = dbmlContext.groups.get(dbmlGroup);

        if (!modelName) throw new Error("Model name not found");

        if (found) {
            dbmlContext.groups.set(dbmlGroup, [...found, modelName]);
        } else {
            dbmlContext.groups.set(dbmlGroup, [modelName]);
        }
    });

    const columnsStringContent = columns
        .map((col) => `    ${col.name} ${col.type}${getParams(col)}`)
        .join("\n");

    dbmlContext.dbmlString += `Table ${modelName} ${getHeaderColor(headerColor)} {
${columnsStringContent}
}\n\n`;
};
