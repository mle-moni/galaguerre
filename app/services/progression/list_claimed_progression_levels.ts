import UserClaimedProgressionLevel from "#models/user_claimed_progression_level";

export const listClaimedProgressionLevels = async (userId: number): Promise<number[]> => {
    const rows = await UserClaimedProgressionLevel.query()
        .where("userId", userId)
        .orderBy("level", "asc")
        .select("level");

    return rows.map((row) => row.level);
};
