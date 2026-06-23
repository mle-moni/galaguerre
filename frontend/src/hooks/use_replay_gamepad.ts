import { useEffect, useRef } from "react";
import type { ReplayStore } from "~/stores/ReplayStore";

const BUTTON_DEBOUNCE_MS = 250;
const STICK_DEADZONE = 0.35;
const SLIDER_REPEAT_MS = 120;

const isButtonPressed = (gamepad: Gamepad, index: number, previous: readonly boolean[]): boolean =>
    Boolean(gamepad.buttons[index]?.pressed) && !previous[index];

export const useReplayGamepad = (store: ReplayStore) => {
    const previousButtonsRef = useRef<boolean[]>([]);
    const lastButtonAtRef = useRef(0);
    const lastSliderAtRef = useRef(0);
    const sliderAccumulatorRef = useRef(0);

    useEffect(() => {
        let frameId = 0;

        const poll = () => {
            const gamepads = navigator.getGamepads();
            const gamepad = gamepads[0] ?? gamepads[1] ?? gamepads[2] ?? gamepads[3];

            if (gamepad) {
                const now = performance.now();
                const previousButtons = previousButtonsRef.current;
                const canPressButton = now - lastButtonAtRef.current >= BUTTON_DEBOUNCE_MS;

                if (
                    canPressButton &&
                    (isButtonPressed(gamepad, 0, previousButtons) ||
                        isButtonPressed(gamepad, 9, previousButtons))
                ) {
                    lastButtonAtRef.current = now;
                    if (store.isPlaying) {
                        store.pause();
                    } else {
                        store.play();
                    }
                }

                if (
                    canPressButton &&
                    (isButtonPressed(gamepad, 15, previousButtons) ||
                        isButtonPressed(gamepad, 5, previousButtons))
                ) {
                    lastButtonAtRef.current = now;
                    void store.stepForward();
                }

                if (
                    canPressButton &&
                    (isButtonPressed(gamepad, 14, previousButtons) ||
                        isButtonPressed(gamepad, 4, previousButtons))
                ) {
                    lastButtonAtRef.current = now;
                    store.stepBackward();
                }

                const stickX = gamepad.axes[0] ?? 0;
                const triggerRight = gamepad.buttons[7]?.value ?? 0;
                const triggerLeft = gamepad.buttons[6]?.value ?? 0;
                const axis =
                    Math.abs(stickX) > STICK_DEADZONE ? stickX : triggerRight - triggerLeft;

                if (Math.abs(axis) > STICK_DEADZONE) {
                    sliderAccumulatorRef.current += axis;
                    if (
                        now - lastSliderAtRef.current >= SLIDER_REPEAT_MS &&
                        Math.abs(sliderAccumulatorRef.current) >= 1
                    ) {
                        const delta = sliderAccumulatorRef.current > 0 ? 1 : -1;
                        sliderAccumulatorRef.current = 0;
                        lastSliderAtRef.current = now;
                        store.seekTo(store.stepIndex + delta);
                    }
                } else {
                    sliderAccumulatorRef.current = 0;
                }

                previousButtonsRef.current = gamepad.buttons.map((button) => button.pressed);
            }

            frameId = requestAnimationFrame(poll);
        };

        frameId = requestAnimationFrame(poll);

        return () => {
            cancelAnimationFrame(frameId);
        };
    }, [store]);
};
