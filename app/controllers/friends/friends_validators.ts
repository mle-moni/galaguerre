import vine from "@vinejs/vine";

export const addFriendValidator = vine.create({
    friendUserId: vine.number().withoutDecimals().positive(),
});

export const searchFriendsValidator = vine.create({
    q: vine.string().trim().optional(),
});
