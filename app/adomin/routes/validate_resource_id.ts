import vine from "@vinejs/vine";

export const resourceIdValidator = vine.create({
    id: vine.number(),
});

export const validateResourceId = (data: unknown) => {
    return resourceIdValidator.validate(data);
};
