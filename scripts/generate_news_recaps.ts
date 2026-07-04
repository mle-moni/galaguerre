import { execSync } from "node:child_process";
import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CARDS_FILE = "database/seed_data/cards/galadrim_cards.ts";
const OUTPUT = path.join(ROOT, "frontend/src/news/generated/weekly_recaps.ts");

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

type WeeklyRecapBase = {
    week: string;
    slug: string;
    publishedAt: string;
    newCardIds: number[];
    buffs: BalanceEntry[];
    nerfs: BalanceEntry[];
};

const getRecapImageUrl = (recap: WeeklyRecapBase, cardsById: Map<number, ParsedCard>): string => {
    const featuredId =
        recap.newCardIds[0] ?? recap.buffs[0]?.id ?? recap.nerfs[0]?.id ?? recap.newCardIds.at(-1);

    if (featuredId !== undefined) {
        const imageUrl = cardsById.get(featuredId)?.imageUrl;
        if (imageUrl) return imageUrl;
    }

    return "/events/pause-event.webp";
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

const weekEndIso = (weekKey: string): string => {
    const [year, weekNumber] = weekKey.split("-W");
    const simple = new Date(Date.UTC(Number(year), 0, 1 + (Number(weekNumber) - 1) * 7));
    const dow = simple.getUTCDay();
    const isoWeekStart = new Date(simple);
    if (dow <= 4) {
        isoWeekStart.setUTCDate(simple.getUTCDate() - simple.getUTCDay() + 1);
    } else {
        isoWeekStart.setUTCDate(simple.getUTCDate() + 8 - simple.getUTCDay());
    }
    const end = new Date(isoWeekStart);
    end.setUTCDate(isoWeekStart.getUTCDate() + 6);
    end.setUTCHours(18, 0, 0, 0);
    const pad = (value: number) => String(value).padStart(2, "0");
    return `${end.getUTCFullYear()}-${pad(end.getUTCMonth() + 1)}-${pad(end.getUTCDate())}T${pad(end.getUTCHours())}:00:00+02:00`;
};

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

const generateRecaps = (): WeeklyRecapBase[] => {
    const log = execSync(`git log --reverse --format='%H %ai' -- ${CARDS_FILE}`, {
        cwd: ROOT,
        encoding: "utf8",
    })
        .trim()
        .split("\n")
        .filter(Boolean);

    let previous = new Map<number, ParsedCard>();
    const weeks = new Map<
        string,
        { newCards: Map<number, ParsedCard>; balanceRaw: BalanceEntry[] }
    >();

    for (const line of log) {
        const [hash, date] = line.split(" ");
        let content: string;
        try {
            content = execSync(`git show ${hash}:${CARDS_FILE}`, {
                cwd: ROOT,
                encoding: "utf8",
                maxBuffer: 10 * 1024 * 1024,
            });
        } catch {
            continue;
        }

        const cards = parseCards(content);
        const week = isoWeekKey(date);
        if (!weeks.has(week)) {
            weeks.set(week, { newCards: new Map(), balanceRaw: [] });
        }
        const bucket = weeks.get(week)!;

        for (const [id, card] of cards) {
            if (!previous.has(id)) {
                bucket.newCards.set(id, card);
                continue;
            }

            const old = previous.get(id)!;
            const changes: BalanceChange[] = [];
            for (const field of ["cost", "attack", "health", "damage", "durability"] as const) {
                if (old[field] !== card[field] && (old[field] != null || card[field] != null)) {
                    changes.push({ field, from: old[field], to: card[field] });
                }
            }
            if (changes.length > 0) {
                bucket.balanceRaw.push({ id, label: card.label, changes });
            }
        }

        previous = cards;
    }

    return [...weeks.entries()]
        .map(([week, bucket]) => {
            const { buffs, nerfs } = mergeBalance(bucket.balanceRaw);
            return {
                week,
                slug: `recap-${week.toLowerCase()}`,
                publishedAt: weekEndIso(week),
                newCardIds: [...bucket.newCards.keys()],
                buffs,
                nerfs,
            };
        })
        .filter((recap) => recap.newCardIds.length + recap.buffs.length + recap.nerfs.length > 0);
};

const recaps = generateRecaps();
const latestCards = (() => {
    try {
        const content = execSync(`git show HEAD:${CARDS_FILE}`, {
            cwd: ROOT,
            encoding: "utf8",
            maxBuffer: 10 * 1024 * 1024,
        });
        return parseCards(content);
    } catch {
        return new Map<number, ParsedCard>();
    }
})();
const recapsWithImages = recaps.map((recap) => ({
    ...recap,
    imageUrl: getRecapImageUrl(recap, latestCards),
}));
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

export type WeeklyRecapData = {
    week: string;
    slug: string;
    publishedAt: string;
    imageUrl: string;
    newCardIds: number[];
    buffs: NewsBalanceEntry[];
    nerfs: NewsBalanceEntry[];
};

export const WEEKLY_RECAPS: WeeklyRecapData[] = ${JSON.stringify(recapsWithImages, null, 4)};
`;

mkdirSync(path.dirname(OUTPUT), { recursive: true });
writeFileSync(OUTPUT, fileContents);
console.log(`Wrote ${recapsWithImages.length} weekly recaps to ${OUTPUT}`);
