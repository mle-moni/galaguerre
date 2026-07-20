import { execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_FILE = "database/seed_data/cards/galadrim_cards.ts";
const OUTPUT = path.join(ROOT, "frontend/src/news/generated/card_recaps.ts");
const LEGACY_OUTPUT = path.join(ROOT, "frontend/src/news/generated/weekly_recaps.ts");

type ParsedCard = {
    id: number;
    label: string;
    cost: number;
    type: "MINION" | "SPELL" | "WEAPON";
    attack: number | null;
    health: number | null;
    damage: number | null;
    durability: number | null;
    imageUrl: string | null;
    goldenVideoUrl: string | null;
};

type BalanceChange = {
    field: "cost" | "attack" | "health" | "damage" | "durability";
    from: number | null;
    to: number | null;
};

type BalanceEntry = {
    id: number;
    label: string;
    changes: BalanceChange[];
};

type CardRecapBase = {
    date: string;
    slug: string;
    publishedAt: string;
    untilCommitHash: string;
    newCardIds: number[];
    newGoldenCardIds: number[];
    buffs: BalanceEntry[];
    nerfs: BalanceEntry[];
};

type CardRecapWithImage = CardRecapBase & {
    imageUrl: string;
};

type LegacyRecap = {
    week?: string;
    date?: string;
    slug: string;
    publishedAt: string;
    untilCommitHash?: string;
    imageUrl?: string;
    newCardIds: number[];
    newGoldenCardIds?: number[];
    buffs: BalanceEntry[];
    nerfs: BalanceEntry[];
};

const FALLBACK_RECAP_IMAGE = "/events/pause-event.webp";

const getRecapImageUrl = (recap: CardRecapBase, cardsById: Map<number, ParsedCard>): string => {
    let featuredId: number | undefined;

    if (recap.newCardIds[0] !== undefined) {
        featuredId = recap.newCardIds[0];
    } else if (recap.newGoldenCardIds[0] !== undefined) {
        featuredId = recap.newGoldenCardIds[0];
    } else {
        featuredId = recap.buffs[0]?.id ?? recap.nerfs[0]?.id;
    }

    const card = featuredId !== undefined ? cardsById.get(featuredId) : undefined;

    return card?.imageUrl ?? FALLBACK_RECAP_IMAGE;
};

const parseCards = (content: string): Map<number, ParsedCard> => {
    const cards = new Map<number, ParsedCard>();
    const re = /define(?:Minion|Spell|Weapon)\(\s*(\d+)\s*,\s*\{([^}]*(?:\{[^}]*\}[^}]*)*)\}/gs;
    let match: RegExpExecArray | null;

    while ((match = re.exec(content)) !== null) {
        const id = Number(match[1]);
        const block = match[2];
        const gal =
            block.match(/\.\.\.gal\(\s*"([^"]+)"\s*,\s*(\d+)\s*\)/) ??
            block.match(/label:\s*"([^"]+)"[\s\S]*?cost:\s*(\d+)/);
        const label = gal?.[1] ?? `Carte #${id}`;
        const cost = gal ? Number(gal[2]) : Number(block.match(/cost:\s*(\d+)/)?.[1] ?? 0);
        const attack = block.match(/attack:\s*(\d+)/)?.[1];
        const health = block.match(/health:\s*(\d+)/)?.[1];
        const damage = block.match(/damage:\s*(\d+)/)?.[1];
        const durability = block.match(/durability:\s*(\d+)/)?.[1];
        const imageUrl = block.match(/imageUrl:\s*"([^"]+)"/)?.[1] ?? null;
        const goldenVideoUrl = block.match(/goldenVideoUrl:\s*"([^"]+)"/)?.[1] ?? null;
        const type = match[0].startsWith("defineMinion")
            ? "MINION"
            : match[0].startsWith("defineSpell")
              ? "SPELL"
              : "WEAPON";

        cards.set(id, {
            id,
            label,
            cost,
            type,
            attack: attack ? Number(attack) : null,
            health: health ? Number(health) : null,
            damage: damage ? Number(damage) : null,
            durability: durability ? Number(durability) : null,
            imageUrl,
            goldenVideoUrl,
        });
    }

    return cards;
};

const isoWeekKey = (dateStr: string): string => {
    const date = new Date(dateStr);
    const utc = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
    const day = utc.getUTCDay() || 7;
    utc.setUTCDate(utc.getUTCDate() + 4 - day);
    const yearStart = new Date(Date.UTC(utc.getUTCFullYear(), 0, 1));
    const week = Math.ceil(((utc.getTime() - yearStart.getTime()) / 86_400_000 + 1) / 7);
    return `${utc.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
};

const dateFromPublishedAt = (publishedAt: string): string => publishedAt.slice(0, 10);

const formatPublishedAt = (date: string): string => `${date}T18:00:00+02:00`;

const scoreChanges = (changes: BalanceChange[]): number => {
    let score = 0;
    for (const change of changes) {
        if (change.field === "cost") {
            score += ((change.from ?? 0) - (change.to ?? 0)) * 2;
        } else {
            score += (change.to ?? 0) - (change.from ?? 0);
        }
    }
    return score;
};

const mergeBalance = (
    entries: BalanceEntry[],
): { buffs: BalanceEntry[]; nerfs: BalanceEntry[] } => {
    const byId = new Map<number, BalanceEntry>();
    for (const entry of entries) {
        const existing = byId.get(entry.id);
        if (!existing) {
            byId.set(entry.id, { id: entry.id, label: entry.label, changes: [...entry.changes] });
            continue;
        }
        existing.changes.push(...entry.changes);
    }

    const buffs: BalanceEntry[] = [];
    const nerfs: BalanceEntry[] = [];
    for (const entry of byId.values()) {
        const score = scoreChanges(entry.changes);
        if (score > 0) buffs.push(entry);
        else if (score < 0) nerfs.push(entry);
    }
    return { buffs, nerfs };
};

const gitShowCards = (ref: string): Map<number, ParsedCard> | null => {
    try {
        const content = execSync(`git show ${ref}:${CARDS_FILE}`, {
            cwd: ROOT,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
        });
        return parseCards(content);
    } catch {
        return null;
    }
};

const getHeadHash = (): string =>
    execSync("git rev-parse HEAD", { cwd: ROOT, encoding: "utf8" }).trim();

const getCommitDate = (hash: string): string => {
    const date = execSync(`git log -1 --format='%ai' ${hash}`, {
        cwd: ROOT,
        encoding: "utf8",
    }).trim();
    return date.slice(0, 10);
};

const gainedGolden = (previous: ParsedCard | undefined, current: ParsedCard): boolean =>
    Boolean(current.goldenVideoUrl) && !previous?.goldenVideoUrl;

const diffCards = (
    previous: Map<number, ParsedCard>,
    current: Map<number, ParsedCard>,
): {
    newCards: Map<number, ParsedCard>;
    newGoldenCardIds: number[];
    balanceRaw: BalanceEntry[];
} => {
    const newCards = new Map<number, ParsedCard>();
    const newGoldenCardIds: number[] = [];
    const balanceRaw: BalanceEntry[] = [];

    for (const [id, card] of current) {
        const old = previous.get(id);

        if (!old) {
            newCards.set(id, card);
            if (gainedGolden(undefined, card)) {
                newGoldenCardIds.push(id);
            }
            continue;
        }

        if (gainedGolden(old, card)) {
            newGoldenCardIds.push(id);
        }

        const changes: BalanceChange[] = [];
        for (const field of ["cost", "attack", "health", "damage", "durability"] as const) {
            if (old[field] !== card[field] && (old[field] != null || card[field] != null)) {
                changes.push({ field, from: old[field], to: card[field] });
            }
        }
        if (changes.length > 0) {
            balanceRaw.push({ id, label: card.label, changes });
        }
    }

    return { newCards, newGoldenCardIds, balanceRaw };
};

const buildWeekLastCommitMap = (): Map<string, string> => {
    const log = execSync(`git log --reverse --format='%H %ai' -- ${CARDS_FILE}`, {
        cwd: ROOT,
        encoding: "utf8",
    })
        .trim()
        .split("\n")
        .filter(Boolean);

    const weekLastCommit = new Map<string, string>();
    for (const line of log) {
        const [hash, date] = line.split(" ");
        weekLastCommit.set(isoWeekKey(date), hash);
    }
    return weekLastCommit;
};

const readExistingRecaps = (): LegacyRecap[] => {
    const filePath = existsSync(OUTPUT) ? OUTPUT : existsSync(LEGACY_OUTPUT) ? LEGACY_OUTPUT : null;
    if (!filePath) return [];

    const content = readFileSync(filePath, "utf8");
    const match = content.match(/export const (?:CARD_RECAPS|WEEKLY_RECAPS).*= (\[[\s\S]*\]);/);
    if (!match) return [];

    return new Function(`return ${match[1]}`)() as LegacyRecap[];
};

const migrateRecap = (recap: LegacyRecap, weekLastCommit: Map<string, string>): CardRecapBase => {
    const date = recap.date ?? dateFromPublishedAt(recap.publishedAt);
    const untilCommitHash =
        recap.untilCommitHash ??
        (recap.week ? weekLastCommit.get(recap.week) : undefined) ??
        getHeadHash();

    return {
        date,
        slug: recap.slug,
        publishedAt: recap.publishedAt,
        untilCommitHash,
        newCardIds: recap.newCardIds,
        newGoldenCardIds: recap.newGoldenCardIds ?? [],
        buffs: recap.buffs,
        nerfs: recap.nerfs,
    };
};

const nextSlug = (date: string, existingSlugs: Set<string>): string => {
    const base = `recap-${date}`;
    if (!existingSlugs.has(base)) return base;
    let suffix = 2;
    while (existingSlugs.has(`${base}-${suffix}`)) suffix++;
    return `${base}-${suffix}`;
};

const computeRecapSince = (
    sinceHash: string | null,
    toHash: string,
    existingSlugs: Set<string>,
): CardRecapBase | null => {
    if (sinceHash === toHash) return null;

    const previous = sinceHash
        ? gitShowCards(sinceHash) ?? new Map()
        : new Map<number, ParsedCard>();
    const current = gitShowCards(toHash);
    if (!current) return null;

    const { newCards, newGoldenCardIds, balanceRaw } = diffCards(previous, current);
    const { buffs, nerfs } = mergeBalance(balanceRaw);
    const changeCount = newCards.size + newGoldenCardIds.length + buffs.length + nerfs.length;
    if (changeCount === 0) return null;

    const date = getCommitDate(toHash);
    return {
        date,
        slug: nextSlug(date, existingSlugs),
        publishedAt: formatPublishedAt(date),
        untilCommitHash: toHash,
        newCardIds: [...newCards.keys()],
        newGoldenCardIds,
        buffs,
        nerfs,
    };
};

const weekLastCommit = buildWeekLastCommitMap();
const existingRaw = readExistingRecaps();
const recaps: CardRecapBase[] = existingRaw.map((recap) => migrateRecap(recap, weekLastCommit));

const lastHash = recaps.at(-1)?.untilCommitHash ?? null;
const headHash = getHeadHash();
const existingSlugs = new Set(recaps.map((recap) => recap.slug));
const newRecap = computeRecapSince(lastHash, headHash, existingSlugs);

if (newRecap) {
    recaps.push(newRecap);
    console.log(`Added new card recap: ${newRecap.slug}`);
} else if (recaps.length === 0) {
    console.log("No card changes detected.");
} else {
    console.log("No new card changes since last recap.");
}

const latestCards = gitShowCards("HEAD") ?? new Map<number, ParsedCard>();
const recapsWithImages: CardRecapWithImage[] = recaps.map((recap) => {
    const existing = existingRaw.find((raw) => raw.slug === recap.slug);
    return {
        ...recap,
        imageUrl: existing?.imageUrl ?? getRecapImageUrl(recap, latestCards),
    };
});

const fileContents = `// Generated by scripts/generate_news_recaps.ts — do not edit manually.

export type NewsBalanceChange = {
    field: "cost" | "attack" | "health" | "damage" | "durability";
    from: number | null;
    to: number | null;
};

export type NewsBalanceEntry = {
    id: number;
    label: string;
    changes: NewsBalanceChange[];
};

export type CardRecapData = {
    date: string;
    slug: string;
    publishedAt: string;
    untilCommitHash: string;
    imageUrl: string;
    newCardIds: number[];
    newGoldenCardIds: number[];
    buffs: NewsBalanceEntry[];
    nerfs: NewsBalanceEntry[];
};

export const CARD_RECAPS: CardRecapData[] = ${JSON.stringify(recapsWithImages, null, 4)};
`;

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, fileContents);
console.log(`Wrote ${recapsWithImages.length} card recaps to ${OUTPUT}`);
