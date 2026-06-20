import type { GameData, SpotOwner } from "./game.types.js";

export const NARRATIVE_BEAT_KINDS = [
    "PLAY_CARD",
    "ATTACK",
    "TRIGGER",
    "DRAW",
    "FATIGUE",
    "MINION_DEATH",
    "WEAPON_BREAK",
    "PASS_TURN",
    "TURN_BEGIN",
    "MANA_GAIN",
] as const;

export type NarrativeBeatKind = (typeof NARRATIVE_BEAT_KINDS)[number];

export const NARRATIVE_TRIGGER_KINDS = ["BATTLECRY", "DEATHRATTLE", "PASSIVE"] as const;

export type NarrativeTriggerKind = (typeof NARRATIVE_TRIGGER_KINDS)[number];

export type NarrativeEntityRef =
    | { type: "HERO"; owner: SpotOwner }
    | { type: "MINION"; cardUuid: string; owner: SpotOwner };

export type NarrativeCardDestination =
    | { type: "BOARD"; owner: SpotOwner; boardIndex: number }
    | { type: "HERO_WEAPON"; owner: SpotOwner }
    | { type: "DISCARD" };

export type NarrativeEffect =
    | {
          type: "MOVE_CARD";
          cardUuid: string;
          owner: SpotOwner;
          from: "HAND";
          to: NarrativeCardDestination;
      }
    | { type: "SPEND_MANA"; owner: SpotOwner; amount: number }
    | { type: "GAIN_MANA"; owner: SpotOwner; amount: number }
    | {
          type: "ATTACK_LUNGE";
          attackerCardUuid: string;
          attackerOwner: SpotOwner;
          target: NarrativeEntityRef;
      }
    | {
          type: "COMBAT_DAMAGE";
          sourceCardUuid: string;
          target: NarrativeEntityRef;
          amount: number;
      }
    | {
          type: "STAT_CHANGE";
          target: NarrativeEntityRef;
          attackDelta?: number;
          healthDelta?: number;
      }
    | {
          type: "TRIGGER";
          cardUuid: string;
          owner: SpotOwner;
          trigger: NarrativeTriggerKind;
      }
    | { type: "SUMMON"; cardUuid: string; owner: SpotOwner; boardIndex: number }
    | { type: "KILL"; cardUuid: string; owner: SpotOwner }
    | { type: "SILENCE"; cardUuid: string; owner: SpotOwner }
    | {
          type: "MIND_CONTROL";
          cardUuid: string;
          fromOwner: SpotOwner;
          toOwner: SpotOwner;
          boardIndex: number;
      }
    | { type: "BREAK_WEAPON"; cardUuid: string; owner: SpotOwner }
    | { type: "TURN_BANNER"; owner: SpotOwner; label: string }
    | { type: "DRAW"; owner: SpotOwner; cardUuid?: string }
    | { type: "FATIGUE"; owner: SpotOwner; amount: number };

export interface NarrativeBeat {
    id: string;
    kind: NarrativeBeatKind;
    logEntryId?: string;
    effects: NarrativeEffect[];
    stateAfter: GameData;
}

export interface GamePresentationUpdate {
    updateId: string;
    stateBefore: GameData;
    beats: NarrativeBeat[];
    stateAfter: GameData;
}
