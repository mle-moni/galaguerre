export const formatEventDate = (date: Date | string) => {
    const parsed = typeof date === "string" ? new Date(date) : date;

    return parsed.toLocaleString("fr-FR", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
    });
};
