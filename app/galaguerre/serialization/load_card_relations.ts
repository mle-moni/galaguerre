import type Card from "#models/card";
import type { ModelQueryBuilderContract } from "@adonisjs/lucid/types/model";
import type { ManyToManyQueryBuilderContract } from "@adonisjs/lucid/types/relations";

type CardPreloadQuery = {
    preload: (relation: string, callback?: (sq: any) => void) => CardPreloadQuery;
};

const preloadActionRelations = (aq: CardPreloadQuery) => {
    aq.preload("boost", (bq: any) => bq.preload("minionPower"));
    aq.preload("drawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("enemyDrawCardFilter", (cfq: any) => cfq.preload("comparison").preload("tags"));
    aq.preload("toolToTargets", (tq: any) =>
        tq.preload("target", (targetQ: any) => targetQ.preload("comparison").preload("tag")),
    );
};

const preloadMinionActionRelations = (q: CardPreloadQuery) => {
    q.preload("action", preloadActionRelations);
};

const applyCardPreloads = (q: CardPreloadQuery) => {
    q.preload("cardSet")
        .preload("tags")
        .preload("minion", (mq: CardPreloadQuery) =>
            mq
                .preload("minionPower")
                .preload("battlecryActions", preloadMinionActionRelations)
                .preload("deathrattleActions", preloadMinionActionRelations)
                .preload("passives", (pq: CardPreloadQuery) =>
                    pq.preload("passive", (passiveQ: CardPreloadQuery) =>
                        passiveQ
                            .preload("action", preloadActionRelations)
                            .preload("boost", (bq: CardPreloadQuery) =>
                                bq
                                    .preload("minionPower")
                                    .preload("toolToTargets", (tq: CardPreloadQuery) =>
                                        tq.preload("target", (targetQ: CardPreloadQuery) =>
                                            targetQ.preload("comparison").preload("tag"),
                                        ),
                                    ),
                            ),
                    ),
                ),
        )
        .preload("spell", (sq: CardPreloadQuery) => sq.preload("action", preloadActionRelations))
        .preload("weapon", (wq: CardPreloadQuery) =>
            wq.preload("deathrattleActions", preloadMinionActionRelations),
        );
};

export const loadCardRelations = (q: ManyToManyQueryBuilderContract<typeof Card, any>) => {
    applyCardPreloads(q as CardPreloadQuery);
};

export const preloadCardQuery = (q: ModelQueryBuilderContract<typeof Card>) => {
    applyCardPreloads(q as CardPreloadQuery);
};
