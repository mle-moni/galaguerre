import CardSet from "#models/card_set";

export const createActiveCardSet = async (name = "Test Set") => {
    return CardSet.updateOrCreate({ name }, { name, isActive: true });
};

export const createInactiveCardSet = async (name = "Inactive Set") => {
    return CardSet.updateOrCreate({ name }, { name, isActive: false });
};

export const getActiveCardSetId = async () => {
    const cardSet = await createActiveCardSet();
    return cardSet.id;
};
