import type { HttpContext } from "@adonisjs/core/http";
import type { SimpleMessagesProvider, VineValidator } from "@vinejs/vine";

export interface ValidationFunctionResult {
    valid: boolean;
    /**
     * if you return valid = false, with errorMessage = undefined,
     * you will have to send the error response yourself
     *
     * e.g. with response.badRequest({ error: 'oups' })
     */
    errorMessage?: string;
}

/**
 * if you return valid = false, with errorMessage = undefined,
 * you will have to send the error response yourself
 *
 * e.g. with response.badRequest({ error: 'oups' })
 */
export type AdominCustomFunctionValidation = (
    ctx: HttpContext,
) => Promise<ValidationFunctionResult>;

export type AdominValidationWithSchema = {
    // biome-ignore lint/suspicious/noExplicitAny: dynamic vine validators from model config
    schema: VineValidator<any, any>;
    messagesProvider?: SimpleMessagesProvider;
};

export type AdominValidationAtom = AdominValidationWithSchema | AdominCustomFunctionValidation;

const ADOMIN_VALIDATION_MODES = ["create", "update"] as const;

export type AdominValidationMode = (typeof ADOMIN_VALIDATION_MODES)[number];

export type AdominValidation = {
    create?: AdominValidationAtom;
    update?: AdominValidationAtom;
};

// biome-ignore lint/suspicious/noExplicitAny: runtime check for compiled vine validators
export const isVineValidator = (input: unknown): input is VineValidator<any, any> => {
    return (
        typeof input === "object" &&
        input !== null &&
        "validate" in input &&
        "validateRaw" in input
    );
};

const validateAtom = async (ctx: HttpContext, atom: AdominValidationAtom) => {
    if (typeof atom === "function") {
        const result = await atom(ctx);

        if (result.valid === true) return true;
        if (result.errorMessage === undefined) return false;

        ctx.response.badRequest({ error: result.errorMessage });

        return false;
    }

    await ctx.request.validateUsing(atom.schema, {
        messagesProvider: atom.messagesProvider,
    });

    return true;
};

export const validateOrThrow = async (
    ctx: HttpContext,
    validationParams: AdominValidation,
    mode: AdominValidationMode,
) => {
    const validationAtom = validationParams[mode];
    if (!validationAtom) return true;
    return validateAtom(ctx, validationAtom);
};
