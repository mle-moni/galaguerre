import { DEFAULT_PLAYER_STATS, type GamePlayer, type GamePlayerStats } from "#api_types/game.types";

export const getPlayerStats = (player: GamePlayer): GamePlayerStats =>
    player.stats ?? DEFAULT_PLAYER_STATS;

export const STAT_ROWS: { key: keyof GamePlayerStats; label: string }[] = [
    { key: "manaSpent", label: "Mana dépensé" },
    { key: "minionsPlayed", label: "Monstres joués" },
    { key: "spellsCast", label: "Sorts lancés" },
    { key: "weaponsPlayed", label: "Armes équipées" },
    { key: "damageDealt", label: "Dégâts infligés" },
    { key: "healingDone", label: "Soins prodigués" },
    { key: "cardsDrawn", label: "Cartes piochées" },
    { key: "heroAttacks", label: "Attaques du héros" },
];
