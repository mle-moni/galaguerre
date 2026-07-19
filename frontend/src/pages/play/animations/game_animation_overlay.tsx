import { motion, useReducedMotion } from "motion/react";
import { observer } from "mobx-react-lite";
import { CARD_BACK_IMAGE_URL } from "~/components/cards/card_back_face";
import type {
    AnimationRect,
    AttackEvent,
    CardFlightEvent,
    CloudEvent,
    DrawEvent,
    ExplosionEvent,
    FloatingTextEvent,
    MultiProjectileEvent,
    ProjectileEvent,
    VisualAnimationEvent,
} from "~/stores/AnimationStore";
import { ANIMATION_STORE } from "~/stores/store_singletons";
import { getRectCenter } from "./game_animation_snapshot.js";
import {
    CLOUD_STAGGER_MS,
    FLOATING_TEXT_STACK_DELAY_MS,
    MULTI_PROJECTILE_STAGGER_MS,
    getShotDurationSec,
} from "./shot_durations.js";
import "./game_animation_overlay.css";

const clampVisualSize = (rect: AnimationRect) => ({
    width: Math.min(Math.max(rect.width, 54), 96),
    height: Math.min(Math.max(rect.height, 72), 128),
});

const getCenteredPosition = (rect: AnimationRect, width: number, height: number) => {
    const center = getRectCenter(rect);
    return {
        x: center.x - width / 2,
        y: center.y - height / 2,
    };
};

const getAttackContactPosition = (fromRect: AnimationRect, toRect: AnimationRect) => {
    const fromCenter = getRectCenter(fromRect);
    const toCenter = getRectCenter(toRect);
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const distance = Math.hypot(dx, dy);

    if (distance === 0) {
        return {
            center: toCenter,
            unitX: 0,
            unitY: -1,
        };
    }

    const unitX = dx / distance;
    const unitY = dy / distance;
    const targetInset = Math.min(Math.max(Math.min(toRect.width, toRect.height) * 0.24, 14), 34);
    const contactDistance = Math.max(distance * 0.58, distance - targetInset);

    return {
        center: {
            x: fromCenter.x + unitX * contactDistance,
            y: fromCenter.y + unitY * contactDistance,
        },
        unitX,
        unitY,
    };
};

const CardFlight = ({ event }: { event: CardFlightEvent }) => {
    const reduceMotion = useReducedMotion();
    const size = clampVisualSize(event.from);
    const from = getCenteredPosition(event.from, size.width, size.height);
    const to = getCenteredPosition(event.to, size.width, size.height);

    return (
        <motion.div
            className="game-animation-card-flight"
            style={{ width: size.width, height: size.height }}
            initial={{ x: from.x, y: from.y, opacity: 0.75, scale: reduceMotion ? 1 : 0.92 }}
            animate={{ x: to.x, y: to.y, opacity: [0.75, 1, 0], scale: reduceMotion ? 1 : 1.06 }}
            transition={{
                duration: getShotDurationSec("CARD_FLIGHT", reduceMotion ?? false),
                ease: "easeOut",
            }}
        >
            <img src={event.card.imageUrl} alt="" draggable={false} />
            <span className="game-animation-card-flight__label">{event.card.label}</span>
        </motion.div>
    );
};

const DrawFlight = ({ event }: { event: DrawEvent }) => {
    const reduceMotion = useReducedMotion();
    const from = getCenteredPosition(event.from, 54, 72);
    const to = getCenteredPosition(event.to, 54, 72);
    const delay = reduceMotion ? 0 : (event.delayMs ?? 0) / 1000;

    return (
        <motion.div
            className="game-animation-draw-card"
            initial={{ x: from.x, y: from.y, opacity: 0, scale: reduceMotion ? 1 : 0.85 }}
            animate={{ x: to.x, y: to.y, opacity: [0, 1, 0], scale: reduceMotion ? 1 : 1 }}
            transition={{
                duration: getShotDurationSec("DRAW", reduceMotion ?? false),
                ease: "easeOut",
                delay,
            }}
        >
            <img src={CARD_BACK_IMAGE_URL} alt="" draggable={false} />
        </motion.div>
    );
};

const AttackFlight = ({ event }: { event: AttackEvent }) => {
    const reduceMotion = useReducedMotion();
    const size = clampVisualSize(event.from);
    const from = getCenteredPosition(event.from, size.width, size.height);
    const contact = getAttackContactPosition(event.from, event.to);
    const hit = {
        x: contact.center.x - size.width / 2,
        y: contact.center.y - size.height / 2,
    };
    const recoil = {
        x: hit.x - contact.unitX * 14,
        y: hit.y - contact.unitY * 14,
    };
    const tilt = Math.sign(contact.unitX || 1) * 5;

    return (
        <motion.div
            className="game-animation-card-flight game-animation-attack-card"
            style={{ width: size.width, height: size.height }}
            initial={{
                x: from.x,
                y: from.y,
                opacity: reduceMotion ? 0 : 1,
                scale: 1,
                rotate: 0,
            }}
            animate={{
                x: reduceMotion ? from.x : [from.x, hit.x, recoil.x, from.x],
                y: reduceMotion ? from.y : [from.y, hit.y, recoil.y, from.y],
                opacity: reduceMotion ? [0, 1, 0] : [1, 1, 1, 0],
                scale: reduceMotion ? [1, 1.02, 1] : [1, 1.08, 0.98, 1],
                rotate: reduceMotion ? 0 : [0, tilt, -tilt * 0.4, 0],
            }}
            transition={{
                duration: getShotDurationSec("ATTACK", reduceMotion ?? false),
                ease: "easeOut",
                times: reduceMotion ? [0, 0.5, 1] : [0, 0.54, 0.68, 1],
            }}
        >
            <img src={event.card.imageUrl} alt="" draggable={false} />
            <span className="game-animation-card-flight__label">{event.card.label}</span>
        </motion.div>
    );
};

const FLOATING_TEXT_STACK_OFFSET_Y = 22;

const FloatingText = ({ event }: { event: FloatingTextEvent }) => {
    const reduceMotion = useReducedMotion();
    const center = getRectCenter(event.at);
    const stackIndex = event.stackIndex ?? 0;
    const stackOffsetY = stackIndex * FLOATING_TEXT_STACK_OFFSET_Y;
    const delay = reduceMotion ? 0 : (stackIndex * FLOATING_TEXT_STACK_DELAY_MS) / 1000;

    return (
        <motion.div
            className={`game-animation-floating-text game-animation-floating-text--${event.tone}`}
            initial={{
                x: center.x - 18,
                y: center.y - 14 - stackOffsetY,
                opacity: 0,
                scale: 0.8,
            }}
            animate={{
                y: reduceMotion ? center.y - 26 - stackOffsetY : center.y - 54 - stackOffsetY,
                opacity: [0, 1, 1, 0],
                scale: reduceMotion ? 1 : [0.8, 1.15, 1],
            }}
            transition={{
                duration: getShotDurationSec("FLOATING_TEXT", reduceMotion ?? false),
                ease: "easeOut",
                delay,
            }}
        >
            {event.label}
        </motion.div>
    );
};

const DeathBurst = ({ event }: { event: Extract<VisualAnimationEvent, { type: "DEATH" }> }) => {
    const reduceMotion = useReducedMotion();

    return (
        <motion.div
            className="game-animation-death"
            style={{ width: event.at.width, height: event.at.height }}
            initial={{ x: event.at.x, y: event.at.y, opacity: 0.85, scale: 1 }}
            animate={{
                x: reduceMotion
                    ? event.at.x
                    : [event.at.x, event.at.x - 4, event.at.x + 4, event.at.x],
                opacity: 0,
                scale: reduceMotion ? 1 : 0.72,
            }}
            transition={{
                duration: getShotDurationSec("DEATH", reduceMotion ?? false),
                ease: "easeOut",
            }}
        />
    );
};

const HeroExplosion = ({
    event,
}: {
    event: Extract<VisualAnimationEvent, { type: "HERO_EXPLOSION" }>;
}) => {
    const reduceMotion = useReducedMotion();
    const duration = getShotDurationSec("HERO_EXPLOSION", reduceMotion ?? false);
    const flashDelay = reduceMotion ? duration * 0.4 : duration * 0.55;
    const flashDuration = reduceMotion ? duration * 0.5 : duration * 0.4;
    const ringDelay = reduceMotion ? duration * 0.5 : duration * 0.62;
    const ringDuration = reduceMotion ? duration * 0.45 : duration * 0.35;

    return (
        <motion.div
            className="game-animation-hero-explosion"
            style={{ width: event.at.width, height: event.at.height }}
            initial={{ x: event.at.x, y: event.at.y, opacity: 1 }}
            animate={{ x: event.at.x, y: event.at.y, opacity: [1, 1, 0] }}
            transition={{
                duration,
                ease: "easeOut",
                times: [0, 0.85, 1],
            }}
        >
            <motion.div
                className="game-animation-hero-explosion__glow"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{
                    opacity: reduceMotion ? [0, 0.6, 0] : [0, 0.35, 0.55, 0],
                    scale: reduceMotion ? [1, 1.1, 1] : [0.9, 1, 1.15, 1.3],
                }}
                transition={{ duration, ease: "easeInOut" }}
            />
            <motion.div
                className="game-animation-hero-explosion__flash"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.5 }}
                animate={{
                    opacity: [0, 0, 1, 0.8, 0],
                    scale: reduceMotion ? [1, 1.2, 1] : [0.5, 0.5, 1.5, 2, 2.2],
                }}
                transition={{
                    duration: flashDuration,
                    delay: flashDelay,
                    ease: "easeOut",
                }}
            />
            <motion.div
                className="game-animation-hero-explosion__ring"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.4 }}
                animate={{
                    opacity: [0, 0, 1, 0],
                    scale: reduceMotion ? [1, 2, 2.5] : [0.4, 0.4, 2.5, 4],
                }}
                transition={{
                    duration: ringDuration,
                    delay: ringDelay,
                    ease: "easeOut",
                }}
            />
            <motion.div
                className="game-animation-hero-explosion__ring game-animation-hero-explosion__ring--outer"
                initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.3 }}
                animate={{
                    opacity: [0, 0, 0.8, 0],
                    scale: reduceMotion ? [1, 2.2, 3] : [0.3, 0.3, 3, 5],
                }}
                transition={{
                    duration: ringDuration,
                    delay: ringDelay + (reduceMotion ? 0.08 : 0.15),
                    ease: "easeOut",
                }}
            />
        </motion.div>
    );
};

const TurnBanner = ({
    event,
}: {
    event: Extract<VisualAnimationEvent, { type: "TURN_BANNER" }>;
}) => {
    const reduceMotion = useReducedMotion();
    const center = getRectCenter(event.at);

    return (
        <motion.div
            className={`game-animation-turn-banner game-animation-turn-banner--${event.owner}`}
            style={{ left: center.x, top: center.y }}
            initial={{ y: reduceMotion ? 0 : -10, opacity: 0, scale: 0.98 }}
            animate={{ y: 0, opacity: [0, 1, 1, 0], scale: reduceMotion ? 1 : 1 }}
            transition={{
                duration: getShotDurationSec("TURN_BANNER", reduceMotion ?? false),
                ease: "easeOut",
            }}
        >
            {event.label}
        </motion.div>
    );
};

const SourcePulse = ({
    event,
}: {
    event: Extract<VisualAnimationEvent, { type: "SOURCE_PULSE" }>;
}) => {
    const reduceMotion = useReducedMotion();
    const center = getRectCenter(event.at);

    return (
        <motion.div
            className={`game-animation-source-pulse game-animation-source-pulse--${event.trigger}`}
            style={{
                left: center.x - 24,
                top: center.y - 24,
                width: 48,
                height: 48,
            }}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{
                opacity: [0, 1, 0],
                scale: reduceMotion ? 1 : [0.85, 1.2, 1],
            }}
            transition={{
                duration: getShotDurationSec("SOURCE_PULSE", reduceMotion ?? false),
                ease: "easeOut",
            }}
        />
    );
};

const ProjectileBolt = ({
    kind,
    from,
    to,
    delayMs = 0,
    durationType,
}: {
    kind: ProjectileEvent["kind"];
    from: AnimationRect;
    to: AnimationRect;
    delayMs?: number;
    durationType: "PROJECTILE" | "MULTI_PROJECTILE";
}) => {
    const reduceMotion = useReducedMotion();
    const fromCenter = getRectCenter(from);
    const toCenter = getRectCenter(to);
    const dx = toCenter.x - fromCenter.x;
    const dy = toCenter.y - fromCenter.y;
    const angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI;
    const delay = reduceMotion ? 0 : delayMs / 1000;

    return (
        <motion.div
            className={`game-animation-projectile game-animation-projectile--${kind}`}
            style={{ rotate: `${angleDeg}deg` }}
            initial={{
                x: fromCenter.x - 10,
                y: fromCenter.y - 4,
                opacity: 0,
                scale: reduceMotion ? 1 : 0.7,
            }}
            animate={{
                x: toCenter.x - 10,
                y: toCenter.y - 4,
                opacity: [0, 1, 1, 0],
                scale: reduceMotion ? 1 : [0.7, 1, 1, 0.85],
            }}
            transition={{
                duration: getShotDurationSec(durationType, reduceMotion ?? false),
                ease: "easeOut",
                delay,
            }}
        />
    );
};

const ProjectileShot = ({ event }: { event: ProjectileEvent }) => (
    <ProjectileBolt
        kind={event.kind}
        from={event.from}
        to={event.to}
        delayMs={event.delayMs}
        durationType="PROJECTILE"
    />
);

const MultiProjectileShot = ({ event }: { event: MultiProjectileEvent }) => {
    const reduceMotion = useReducedMotion();

    return (
        <>
            {event.tos.map((to, index) => (
                <ProjectileBolt
                    key={`${to.x}-${to.y}-${index}`}
                    kind={event.kind}
                    from={event.from}
                    to={to}
                    delayMs={reduceMotion ? 0 : index * MULTI_PROJECTILE_STAGGER_MS}
                    durationType="MULTI_PROJECTILE"
                />
            ))}
        </>
    );
};

const ExplosionShot = ({ event }: { event: ExplosionEvent }) => {
    const reduceMotion = useReducedMotion();

    return (
        <>
            {event.ats.map((at, index) => {
                const center = getRectCenter(at);
                const size = Math.max(Math.min(at.width, at.height) * 0.9, 72);

                return (
                    <motion.div
                        key={`${at.x}-${at.y}-${index}`}
                        className={`game-animation-explosion game-animation-explosion--${event.kind}`}
                        style={{
                            width: size,
                            height: size,
                            left: center.x - size / 2,
                            top: center.y - size / 2,
                        }}
                        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.45 }}
                        animate={{
                            opacity: [0, 1, 0],
                            scale: reduceMotion ? 1 : [0.45, 1.15, 1.35],
                        }}
                        transition={{
                            duration: getShotDurationSec("EXPLOSION", reduceMotion ?? false),
                            ease: "easeOut",
                        }}
                    />
                );
            })}
        </>
    );
};

const CloudShot = ({ event }: { event: CloudEvent }) => {
    const reduceMotion = useReducedMotion();

    return (
        <>
            {event.ats.map((at, index) => {
                const center = getRectCenter(at);
                const width = Math.max(at.width * 1.15, 64);
                const height = Math.max(at.height * 0.85, 48);
                const delay = reduceMotion ? 0 : (index * CLOUD_STAGGER_MS) / 1000;

                return (
                    <motion.div
                        key={`${at.x}-${at.y}-${index}`}
                        className="game-animation-cloud"
                        style={{
                            width,
                            height,
                            left: center.x - width / 2,
                            top: center.y - height / 2,
                        }}
                        initial={{ opacity: 0, scale: reduceMotion ? 1 : 0.6 }}
                        animate={{
                            opacity: [0, 0.9, 0.9, 0],
                            scale: reduceMotion ? 1 : [0.6, 1.05, 1.1, 1.2],
                        }}
                        transition={{
                            duration: getShotDurationSec("CLOUD", reduceMotion ?? false),
                            ease: "easeOut",
                            delay,
                        }}
                    />
                );
            })}
        </>
    );
};

const AnimationEvent = ({ event }: { event: VisualAnimationEvent }) => {
    if (event.type === "CARD_FLIGHT") return <CardFlight event={event} />;
    if (event.type === "ATTACK") return <AttackFlight event={event} />;
    if (event.type === "FLOATING_TEXT") return <FloatingText event={event} />;
    if (event.type === "DEATH") return <DeathBurst event={event} />;
    if (event.type === "HERO_EXPLOSION") return <HeroExplosion event={event} />;
    if (event.type === "DRAW") return <DrawFlight event={event} />;
    if (event.type === "TURN_BANNER") return <TurnBanner event={event} />;
    if (event.type === "SOURCE_PULSE") return <SourcePulse event={event} />;
    if (event.type === "PROJECTILE") return <ProjectileShot event={event} />;
    if (event.type === "MULTI_PROJECTILE") return <MultiProjectileShot event={event} />;
    if (event.type === "EXPLOSION") return <ExplosionShot event={event} />;
    if (event.type === "CLOUD") return <CloudShot event={event} />;

    return null;
};

export const GameAnimationOverlay = observer(() => {
    return (
        <div className="game-animation-overlay" aria-hidden>
            {ANIMATION_STORE.events.map((event) => (
                <AnimationEvent key={event.id} event={event} />
            ))}
        </div>
    );
});
