export const CARD_LABEL_TAGS = ["EMOJI"] as const;

export type CardLabelTag = (typeof CARD_LABEL_TAGS)[number];

export const CARD_LABEL_TAG_LABELS: Record<CardLabelTag, { label: string }> = {
    EMOJI: { label: "Emoji" },
};
