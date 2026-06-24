import type { ApiCatalogCard } from "#api_types/deck.types";
import { Popover } from "@mantine/core";
import {
    cloneElement,
    isValidElement,
    type MouseEvent,
    type ReactElement,
    type ReactNode,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
import { useIsMobilePortrait } from "~/hooks/use_is_mobile_portrait";
import { CatalogCardDisplay, catalogCardToPlayerCard } from "./catalog_card_display.jsx";
import { CardPreviewSheet } from "./card_preview_sheet.jsx";

const OPEN_DELAY_MS = 200;
const CLOSE_DELAY_MS = 100;

interface CatalogCardHoverPreviewProps {
    card: ApiCatalogCard;
    children: ReactNode;
    disabled?: boolean;
}

const composeHandler = <E,>(theirs: ((event: E) => void) | undefined, ours: (event: E) => void) => {
    if (!theirs) return ours;
    return (event: E) => {
        theirs(event);
        ours(event);
    };
};

export const CatalogCardHoverPreview = ({
    card,
    children,
    disabled = false,
}: CatalogCardHoverPreviewProps) => {
    const isMobilePortrait = useIsMobilePortrait();
    const [sheetOpened, setSheetOpened] = useState(false);
    const [hovered, setHovered] = useState(false);
    const isOpen = hovered && !disabled;
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
        if (disabled) return;
        clearTimeouts();
        openTimeoutRef.current = window.setTimeout(() => {
            setHovered(true);
        }, OPEN_DELAY_MS);
    }, [clearTimeouts, disabled]);

    const scheduleClose = useCallback(() => {
        clearTimeouts();
        closeTimeoutRef.current = window.setTimeout(() => {
            setHovered(false);
        }, CLOSE_DELAY_MS);
    }, [clearTimeouts]);

    useEffect(() => {
        if (disabled) {
            closePreview();
        }
    }, [closePreview, disabled]);

    useEffect(() => () => clearTimeouts(), [clearTimeouts]);

    const playerCard = catalogCardToPlayerCard(card);

    if (isMobilePortrait) {
        return (
            <>
                <button
                    type="button"
                    className="border-0 bg-transparent p-0 cursor-pointer"
                    onClick={(event: MouseEvent<HTMLButtonElement>) => {
                        event.stopPropagation();
                        setSheetOpened(true);
                    }}
                >
                    {children}
                </button>
                <CardPreviewSheet
                    card={playerCard}
                    attack={card.type === "MINION" ? card.attack : undefined}
                    health={card.type === "MINION" ? card.health : undefined}
                    opened={sheetOpened}
                    onClose={() => setSheetOpened(false)}
                />
            </>
        );
    }

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
          })
        : children;

    return (
        <Popover
            shadow="lg"
            position="left"
            withinPortal
            opened={isOpen}
            onChange={(nextOpen) => {
                if (!disabled) {
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
                onMouseEnter={scheduleOpen}
                onMouseLeave={scheduleClose}
            >
                <CatalogCardDisplay card={card} size="full" />
            </Popover.Dropdown>
        </Popover>
    );
};
