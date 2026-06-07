import type { LucidModel } from "@adonisjs/lucid/types/model";
import { SimpleMessagesProvider } from "@vinejs/vine";
import { getModelConfig } from "../routes/models/get_model_config.js";
import { DEFAULT_MESSAGE_PROVIDER_CONFIG } from "./default_validator.js";

export const getGenericMessagesProvider = (Model: LucidModel) => {
    const { fields } = getModelConfig(Model.name);
    const fieldLabels: Record<string, string> = Object.fromEntries(
        fields.map(({ name, adomin }) => [name, adomin.label ?? name]),
    );

    return new SimpleMessagesProvider(DEFAULT_MESSAGE_PROVIDER_CONFIG, fieldLabels);
};
