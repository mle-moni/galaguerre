import { computeColumnConfigFields } from "#adomin/routes/models/get_model_config";
import vine from "@vinejs/vine";
import type { ModelConfig } from "../create_model_view_config.js";
import type { AdominFieldConfig } from "../fields.types.js";
import type { AdominValidationMode } from "../validation/adomin_validation_helpers.js";

type VineObjectMembers = Parameters<typeof vine.object>[0];

const applyModifiers = (
    // biome-ignore lint/suspicious/noExplicitAny: vine field schemas share nullable/optional API
    fieldSchema: any,
    suffix: "nullable" | "optional" | null,
) => {
    if (suffix === "nullable") return fieldSchema.nullable();
    if (suffix === "optional") return fieldSchema.optional();
    return fieldSchema;
};

const getSuffix = (config: AdominFieldConfig) => {
    if (config.nullable) return "nullable";
    if (config.optional) return "optional";

    return null;
};

const getFileSchema = (
    validationMode: AdominValidationMode,
    suffix: "nullable" | "optional" | null,
    config: Extract<AdominFieldConfig, { type: "file" }>,
) => {
    const fileSchema = vine.file({
        size: config.maxFileSize,
        extnames: config.extnames,
    });

    if (validationMode === "update") {
        return fileSchema.nullable().optional();
    }

    return applyModifiers(fileSchema, suffix);
};

const getValidationSchemaFromFieldConfig = (
    config: AdominFieldConfig,
    validationMode: AdominValidationMode,
) => {
    const suffix = getSuffix(config);

    if (config.type === "enum") {
        const options = config.options.map((option) => option.value);
        return applyModifiers(vine.enum(options), suffix);
    }
    if (config.type === "array") {
        return vine.array(vine.string()).optional();
    }
    if (config.type === "string" && config.isEmail) {
        return applyModifiers(vine.string().email(), suffix);
    }

    if (config.type === "hasManyRelation") {
        const memberSchema = config.localKeyType === "string" ? vine.string() : vine.number();
        return vine.array(memberSchema).optional();
    }

    if (config.type === "manyToManyRelation") {
        const memberSchema = config.relatedKeyType === "string" ? vine.string() : vine.number();
        return vine.array(memberSchema).optional();
    }

    if (config.type === "file") {
        return getFileSchema(validationMode, suffix, config);
    }

    const fieldSchema = getBaseSchema(config);

    return applyModifiers(fieldSchema, suffix);
};

const getType = (config: AdominFieldConfig) => {
    switch (config.type) {
        case "foreignKey":
        case "belongsToRelation":
        case "hasOneRelation":
            return config.fkType ?? "number";
        case "hasManyRelation":
        case "manyToManyRelation":
            throw new Error("hasManyRelation should be handled before calling this function");
        default:
            return config.type;
    }
};

const getBaseSchema = (config: AdominFieldConfig) => {
    const type = getType(config);

    switch (type) {
        case "string":
            return vine.string();
        case "number":
            return vine.number();
        case "boolean":
            return vine.boolean();
        case "date":
            return vine.date();
        default:
            return vine.string();
    }
};

export const getValidationSchemaFromConfig = (
    modelConfig: ModelConfig,
    validationMode: AdominValidationMode,
) => {
    const fields = computeColumnConfigFields(modelConfig.fields);
    const schemaObj: VineObjectMembers = {};

    for (const { adomin, name: columnName } of fields) {
        const notCreatable = adomin.creatable === false;
        const notEditable = adomin.editable === false;

        if (validationMode === "create" && notCreatable) continue;
        if (validationMode === "update" && notEditable) continue;

        schemaObj[columnName] = getValidationSchemaFromFieldConfig(adomin, validationMode);
    }

    return vine.compile(vine.object(schemaObj));
};
