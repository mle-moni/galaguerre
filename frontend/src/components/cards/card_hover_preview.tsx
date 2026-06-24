import type { PlayerCard } from "#api_types/game.types";
import { Popover } from "@mantine/core";
import { observer } from "mobx-react-lite";
import {
    cloneElement,
    isValidElement,
    type ReactElement,
    type ReactNode,
    useCallback,
    useContext,
    useEffect,
    useRef,
    useState,
} from "react";
import { GameStateContext, ReplayStoreContext } from "~/hooks/use_game_state";
import { GAME_STORE } from "~/stores/store_singletons";
import { PlayerCardFace } from "./player_card_face.jsx";

const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 100;

interface CardHoverPreviewProps {
    card: PlayerCard;
    children: ReactNode;
    spellPower?: number;
    disabled?: boolean;
    isSilenced?: boolean;
    attack?: number;
    health?: number;
}

const composeHandler = <E,>(theirs: ((event: E) => void) | undefined, ours: (event: E) => void) => {
    if (!theirs) return ours;
    return (event: E) => {
        theirs(event);
        ours(event);
    };
};

export const CardHoverPreview = observer(
    ({
        card,
        children,
        spellPower = 0,
        disabled = false,
        isSilenced,
        attack,
        health,
    }: CardHoverPreviewProps) => {
        const replayStore = useContext(ReplayStoreContext);
        const gameContext = useContext(GameStateContext);
        const store = replayStore ?? (gameContext ? GAME_STORE : null);
        const isPreviewDisabled = disabled || (store?.isCardHoverPreviewDisabled ?? false);

        const [hovered, setHovered] = useState(false);
        const isOpen = hovered && !isPreviewDisabled;
        const openTimeoutRef = useRef(-1);
        const closeTimeoutRef = useRef(-1);

        const clearTimeouts = useCallback(() => {
            window.clearTimeout(openTimeoutRef.current);
            window.clearTimeout(closeTimeoutRef.current);
        }, []);

        const closePreview = useCallback(() => {
            clearTimeouts();
            setHovered(false);
        }, [clearTimeouts]);

        const scheduleOpen = useCallback(() => {
            if (isPreviewDisabled) return;
            clearTimeouts();
            openTimeoutRef.current = window.setTimeout(() => {
                setHovered(true);
            }, OPEN_DELAY_MS);
        }, [clearTimeouts, isPreviewDisabled]);

        const scheduleClose = useCallback(() => {
            clearTimeouts();
            closeTimeoutRef.current = window.setTimeout(() => {
                setHovered(false);
            }, CLOSE_DELAY_MS);
        }, [clearTimeouts]);

        useEffect(() => {
            if (isPreviewDisabled) {
                closePreview();
            }
        }, [closePreview, isPreviewDisabled]);

        useEffect(() => () => clearTimeouts(), [clearTimeouts]);

        const target = isValidElement(children)
            ? cloneElement(children as ReactElement<Record<string, unknown>>, {
                  onMouseEnter: composeHandler(
                      (
                          children as ReactElement<{
                              onMouseEnter?: (event: React.MouseEvent) => void;
                          }>
                      ).props.onMouseEnter,
                      scheduleOpen,
                  ),
                  onMouseLeave: composeHandler(
                      (
                          children as ReactElement<{
                              onMouseLeave?: (event: React.MouseEvent) => void;
                          }>
                      ).props.onMouseLeave,
                      scheduleClose,
                  ),
                  onDragStart: composeHandler(
                      (
                          children as ReactElement<{
                              onDragStart?: (event: React.DragEvent) => void;
                          }>
                      ).props.onDragStart,
                      closePreview,
                  ),
                  onPointerDown: composeHandler(
                      (
                          children as ReactElement<{
                              onPointerDown?: (event: React.PointerEvent) => void;
                          }>
                      ).props.onPointerDown,
                      closePreview,
                  ),
              })
            : children;

        return (
            <Popover
                shadow="lg"
                position="top"
                withinPortal
                opened={isOpen}
                onChange={(nextOpen) => {
                    if (!isPreviewDisabled) {
                        setHovered(nextOpen);
                    }
                }}
                offset={8}
            >
                <Popover.Target>{target}</Popover.Target>
                <Popover.Dropdown
                    p={0}
                    bg="transparent"
                    style={{ border: "none", overflow: "visible" }}
                >
                    <PlayerCardFace
                        card={card}
                        size="full"
                        spellPower={spellPower}
                        isSilenced={isSilenced}
                        attack={attack}
                        health={health}
                    />
                </Popover.Dropdown>
            </Popover>
        );
    },
);
