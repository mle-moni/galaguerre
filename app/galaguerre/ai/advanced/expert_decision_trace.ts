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
    /** `null` quand le pli de riposte a réellement choisi la ligne jouée. */
    fallback: ExpertFallbackReason | null;
}

export const createExpertDecisionTrace = (): ExpertDecisionTrace => ({
    candidates: 0,
    repliesScored: 0,
    repliesIncomplete: 0,
    repliesSkipped: 0,
    sawOpponentLethal: false,
    fallback: null,
});
