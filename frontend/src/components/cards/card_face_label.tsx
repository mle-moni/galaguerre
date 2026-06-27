import clsx from "clsx";

const getCardFaceLabelClassName = (label: string): string | undefined => {
    if (label.length > 24) return "playing-card-face__label--very-long";
    if (label.length > 17) return "playing-card-face__label--long";
    return undefined;
};

export const CardFaceLabel = ({ label }: { label: string }) => {
    return (
        <p className={clsx("playing-card-face__label", getCardFaceLabelClassName(label))}>
            {label}
        </p>
    );
};
