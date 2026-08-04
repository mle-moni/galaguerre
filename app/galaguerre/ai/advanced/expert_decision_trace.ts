/**
 * Diagnostic d'une décision de l'IA « Expert ».
 *
 * L'Expert ne se distingue de l'Avancé que par un pli : la re-notation des lignes candidates en
 * simulant le tour adverse (`search_opponent_reply.ts`). Ce pli peut ne PAS avoir lieu — faisceau
 * rendant une seule ligne, budget épuisé, riposte tronquée — et la décision retombe alors
 * silencieusement sur celle de l'IA Avancée.
 *
 * Sans cette trace, ce repli est invisible : le banc d'essai mesurerait « Expert contre Expert »
 * alors que les deux camps jouent en Avancé la moitié du temps, et tout réglage du pli de riposte
 * serait noté sur des parties où il ne s'exécute pas. C'est la première chose à mesurer avant de
 * toucher aux paramètres `reply*`.
 */

/** Pourquoi une décision est retombée sur le choix de l'IA Avancée. */
export type ExpertFallbackReason =
    /**
     * Il ne restait aucun coup jouable : la décision rend une séquence vide et l'appelant termine
     * le tour. Ce n'est PAS un repli subi, c'est la fin normale d'un tour — d'où sa catégorie
     * propre. Confondu avec `SINGLE_CANDIDATE`, il gonflait ce dernier d'un point par tour joué et
     * faisait passer pour une faiblesse du faisceau ce qui n'était que la sortie de boucle.
     */
    | "NOTHING_TO_PLAY"
    /** Le faisceau n'a rendu qu'une ligne : la riposte n'avait rien à départager. */
    | "SINGLE_CANDIDATE"
    /** Des lignes existaient, mais aucune riposte n'a pu être simulée jusqu'au bout. */
    | "NO_COMPLETE_REPLY";

export interface ExpertDecisionTrace {
    /** Lignes candidates rendues par le faisceau, avant re-notation. */
    candidates: number;
    /** Ripostes simulées jusqu'au bout : seules celles-ci ont le droit de départager. */
    repliesScored: number;
    /** Ripostes lancées puis tronquées faute de budget, donc écartées du classement. */
    repliesIncomplete: number;
    /** Candidats jamais regardés : la tranche de temps restante était sous le plancher. */
    repliesSkipped: number;
    /** `true` quand un létal adverse a été prouvé sur au moins une ligne candidate. */
    sawOpponentLethal: boolean;
    /**
     * `true` quand au moins une ligne candidate laisse l'IA avec un létal à SON tour suivant, une
     * fois la riposte adverse jouée. Mesure la fréquence à laquelle le troisième pli sert à
     * quelque chose : à zéro, la recherche ne fait que coûter.
     */
    sawOwnLethal: boolean;
    /**
     * `true` quand la prime de létal propre a réellement DÉPLACÉ le choix, c'est-à-dire quand la
     * ligne retenue n'est pas celle qu'aurait donnée le même classement sans la prime.
     *
     * C'est la seule mesure qui dit si le troisième pli sert à quelque chose. `sawOwnLethal` ne
     * suffit pas : un létal repéré sur TOUTES les lignes candidates ne départage rien, la prime
     * s'annule et le classement retombe sur le score statique. Un pli qui coûte du temps sans
     * jamais déplacer un choix est un pli à retirer, pas à régler.
     */
    ownLethalChangedChoice: boolean;
    /**
     * `true` quand le classement de repli entre ripostes incomplètes a réellement DÉPLACÉ le choix,
     * c'est-à-dire quand la ligne jouée n'est pas celle qu'aurait rendue le faisceau seul.
     *
     * Même rôle que `ownLethalChangedChoice`, et pour la même raison : le taux de DÉCLENCHEMENT
     * d'un mécanisme ne dit rien de son utilité. Un classement de repli qui redésigne à chaque fois
     * la ligne déjà en tête du faisceau est un no-op coûteux, et seul ce compteur le révèle.
     */
    incompleteRankingChangedChoice: boolean;
    /** `null` quand le pli de riposte a réellement choisi la ligne jouée. */
    fallback: ExpertFallbackReason | null;
}

export const createExpertDecisionTrace = (): ExpertDecisionTrace => ({
    candidates: 0,
    repliesScored: 0,
    repliesIncomplete: 0,
    repliesSkipped: 0,
    sawOpponentLethal: false,
    sawOwnLethal: false,
    ownLethalChangedChoice: false,
    incompleteRankingChangedChoice: false,
    fallback: null,
});
