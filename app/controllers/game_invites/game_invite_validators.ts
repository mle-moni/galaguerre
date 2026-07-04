import vine from "@vinejs/vine";

export const createGameInviteValidator = vine.create({
    toUserId: vine.number().withoutDecimals().positive(),
});
