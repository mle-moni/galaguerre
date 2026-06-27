export const getCardFaceDescriptionSizeClass = (description: string): string | undefined => {
    if (description.length > 200) return "card-face-description--very-long";
    if (description.length > 120) return "card-face-description--long";
    return undefined;
};
