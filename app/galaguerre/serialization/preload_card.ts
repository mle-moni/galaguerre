import type Card from "#models/card";

const preloadActionRelations = (aq: {
    preload: (relation: string, callback?: (sq: any) => void) => void;
}) => {
    aq.preload("boost", (bq: any) => bq.preload("minionPower"));
    aq.preload("drawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("enemyDrawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("toolToTargets", (tq: any) =>
        tq.preload("target", (targetQ: any) => targetQ.preload("comparison").preload("tag")),
    );
};

const preloadMinionActionRelations = (q: {
    preload: (relation: string, callback?: (sq: any) => void) => void;
}) => {
    q.preload("action", preloadActionRelations);
};

export const preloadCardForSerialization = async (card: Card) => {
    await card.load("tags");

    if (card.type === "WEAPON") {
        await card.load("weapon", (wq) =>
            wq.preload("deathrattleActions", preloadMinionActionRelations),
        );
        return;
    }

    if (card.type === "SPELL") {
        await card.load("spell", (sq) => sq.preload("action", preloadActionRelations));
        return;
    }

    await card.load("minion", (mq) =>
        mq
            .preload("minionPower")
            .preload("battlecryActions", preloadMinionActionRelations)
            .preload("deathrattleActions", preloadMinionActionRelations)
            .preload("passives", (pq) =>
                pq.preload("passive", (passiveQ) =>
                    passiveQ
                        .preload("action", preloadActionRelations)
                        .preload("boost", (bq) =>
                            bq
                                .preload("minionPower")
                                .preload("toolToTargets", (tq) =>
                                    tq.preload("target", (targetQ) =>
                                        targetQ.preload("comparison").preload("tag"),
                                    ),
                                ),
                        ),
                ),
            ),
    );
};
