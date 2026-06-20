import { AnimatePresence, motion, useReducedMotion } from "motion/react";
import { observer } from "mobx-react-lite";
import type {
    AnimationRect,
    AttackEvent,
    CardFlightEvent,
    DrawEvent,
    FloatingTextEvent,
    VisualAnimationEvent,
} from "~/stores/AnimationStore";
import { resolveAnimationCompletion } from "~/stores/AnimationStore";
import { ANIMATION_STORE } from "~/stores/store_singletons";
import { getRectCenter } from "./game_animation_snapshot.js";
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

const removeEvent = (id: string) => {
    ANIMATION_STORE.remove(id);
    resolveAnimationCompletion(id);
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
            transition={{ duration: reduceMotion ? 0.16 : 0.42, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(event.id)}
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
            transition={{ duration: reduceMotion ? 0.16 : 0.38, ease: "easeOut", delay }}
            onAnimationComplete={() => removeEvent(event.id)}
        />
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
                duration: reduceMotion ? 0.22 : 0.46,
                ease: "easeOut",
                times: reduceMotion ? [0, 0.5, 1] : [0, 0.54, 0.68, 1],
            }}
            onAnimationComplete={() => removeEvent(event.id)}
        >
            <img src={event.card.imageUrl} alt="" draggable={false} />
            <span className="game-animation-card-flight__label">{event.card.label}</span>
        </motion.div>
    );
};

const FloatingText = ({ event }: { event: FloatingTextEvent }) => {
    const reduceMotion = useReducedMotion();
    const center = getRectCenter(event.at);

    return (
        <motion.div
            className={`game-animation-floating-text game-animation-floating-text--${event.tone}`}
            initial={{ x: center.x - 18, y: center.y - 14, opacity: 0, scale: 0.8 }}
            animate={{
                y: reduceMotion ? center.y - 26 : center.y - 54,
                opacity: [0, 1, 1, 0],
                scale: reduceMotion ? 1 : [0.8, 1.15, 1],
            }}
            transition={{ duration: reduceMotion ? 0.4 : 0.78, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(event.id)}
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
            transition={{ duration: reduceMotion ? 0.22 : 0.46, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(event.id)}
        />
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
            transition={{ duration: reduceMotion ? 0.7 : 1.15, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(event.id)}
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
            transition={{ duration: reduceMotion ? 0.2 : 0.45, ease: "easeOut" }}
            onAnimationComplete={() => removeEvent(event.id)}
        />
    );
};

const AnimationEvent = ({ event }: { event: VisualAnimationEvent }) => {
    if (event.type === "CARD_FLIGHT") return <CardFlight event={event} />;
    if (event.type === "ATTACK") return <AttackFlight event={event} />;
    if (event.type === "FLOATING_TEXT") return <FloatingText event={event} />;
    if (event.type === "DEATH") return <DeathBurst event={event} />;
    if (event.type === "DRAW") return <DrawFlight event={event} />;
    if (event.type === "TURN_BANNER") return <TurnBanner event={event} />;
    if (event.type === "SOURCE_PULSE") return <SourcePulse event={event} />;

    return null;
};

export const GameAnimationOverlay = observer(() => {
    return (
        <div className="game-animation-overlay" aria-hidden>
            <AnimatePresence>
                {ANIMATION_STORE.events.map((event) => (
                    <AnimationEvent key={event.id} event={event} />
                ))}
            </AnimatePresence>
        </div>
    );
});
