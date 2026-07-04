import vine from "@vinejs/vine";

export const stringIdValidator = vine.create({
    id: vine.string(),
});

export const validateStringId = (data: unknown) => {
    return stringIdValidator.validate(data);
};
