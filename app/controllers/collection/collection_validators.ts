import vine from "@vinejs/vine";

export const buyCardSchema = vine.create({
    cardId: vine.number(),
    golden: vine.boolean().optional(),
});

export const sellCardSchema = vine.create({
    cardId: vine.number(),
});
