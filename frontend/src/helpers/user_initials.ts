import { formatPlayerName } from "~/components/player_name_link";

const getNameForInitials = (pseudo: string | null, email?: string, userId?: number): string => {
    if (pseudo?.trim()) return pseudo.trim();
    if (email) return email.split("@")[0];
    if (userId !== undefined) return formatPlayerName(null, userId);

    return "?";
};

export const getUserInitials = (pseudo: string | null, email?: string, userId?: number): string => {
    const name = getNameForInitials(pseudo, email, userId);
    const words = name.split(/\s+/).filter(Boolean);

    if (words.length >= 2) {
        return `${words[0][0] ?? ""}${words[1][0] ?? ""}`.toUpperCase();
    }

    return name.slice(0, 2).toUpperCase();
};
