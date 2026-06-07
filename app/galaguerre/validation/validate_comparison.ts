import type Comparison from "#models/comparison";

export type ComparisonValidationError = {
    comparisonId: number;
    internalLabel: string;
    reason: string;
};

const hasActiveCriterion = (comparison: Comparison): boolean => {
    return (
        (comparison.costComparison !== null && comparison.cost !== null) ||
        (comparison.attackComparison !== null && comparison.attack !== null) ||
        (comparison.healthComparison !== null && comparison.health !== null)
    );
};

const validateCriterionPair = (
    comparison: Comparison,
    field: "cost" | "attack" | "health",
): ComparisonValidationError | null => {
    const operatorField = `${field}Comparison` as const;
    const operator = comparison[operatorField];
    const value = comparison[field];

    if (operator === null && value === null) return null;

    if (operator === null || value === null) {
        return {
            comparisonId: comparison.id,
            internalLabel: comparison.internalLabel,
            reason: `${field} comparison requires both operator and value`,
        };
    }

    return null;
};

export const validateComparison = (comparison: Comparison): ComparisonValidationError | null => {
    for (const field of ["cost", "attack", "health"] as const) {
        const error = validateCriterionPair(comparison, field);
        if (error) return error;
    }

    if (!hasActiveCriterion(comparison)) {
        return {
            comparisonId: comparison.id,
            internalLabel: comparison.internalLabel,
            reason: "comparison requires at least one active criterion",
        };
    }

    return null;
};
