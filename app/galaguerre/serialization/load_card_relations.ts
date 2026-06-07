import type Card from "#models/card";
import type { ManyToManyQueryBuilderContract } from "@adonisjs/lucid/types/relations";

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

export const loadCardRelations = (q: ManyToManyQueryBuilderContract<typeof Card, any>) => {
    q.preload("tags")
        .preload("minion", (mq) =>
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
        )
        .preload("spell", (sq) => sq.preload("action", preloadActionRelations))
        .preload("weapon", (wq) => wq.preload("deathrattleActions", preloadMinionActionRelations));
};
