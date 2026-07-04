import vine from "@vinejs/vine";

export const buyCardSchema = vine.create({
    cardId: vine.number(),
});

export const sellCardSchema = vine.create({
    cardId: vine.number(),
});
