import type { ApiGameReplay } from "#api_types/game_replay.types";
import { reaction } from "mobx";
import { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import {
    buildReplaySearchParams,
    clampReplayStep,
    getReplayPath,
    parseReplayStep,
    resolveReplayPerspectiveUserId,
} from "~/helpers/replay_url";
import { REPLAY_STORE } from "~/stores/ReplayStore";

export const useReplayUrlSync = (
    replay: ApiGameReplay | undefined,
    pathUserId: number,
    gameId: number,
) => {
    const [searchParams, setSearchParams] = useSearchParams();
    const navigate = useNavigate();
    const initializedSessionRef = useRef<string | null>(null);

    const perspectiveUserId = replay
        ? resolveReplayPerspectiveUserId(pathUserId, replay)
        : pathUserId;
    const maxStepIndex = replay?.replay.steps.length ?? 0;
    const initialStep = replay ? clampReplayStep(parseReplayStep(searchParams), maxStepIndex) : 0;
    const sessionKey = replay ? `${replay.gameId}-${perspectiveUserId}` : null;

    const shouldInit = replay && sessionKey && initializedSessionRef.current !== sessionKey;

    if (shouldInit) {
        REPLAY_STORE.init(replay, perspectiveUserId, initialStep);
        initializedSessionRef.current = sessionKey;
    }

    useEffect(() => {
        if (!replay) return;
        if (perspectiveUserId !== pathUserId) {
            navigate(getReplayPath(perspectiveUserId, gameId, initialStep), { replace: true });
        }
    }, [replay, perspectiveUserId, pathUserId, gameId, initialStep, navigate]);

    useEffect(() => {
        if (!replay) return;

        const dispose = reaction(
            () => REPLAY_STORE.stepIndex,
            (stepIndex) => {
                setSearchParams(
                    (prev) => {
                        const urlStep = parseReplayStep(prev);
                        if (urlStep === stepIndex) return prev;
                        return buildReplaySearchParams(stepIndex);
                    },
                    { replace: true },
                );
            },
        );

        return dispose;
    }, [replay, setSearchParams]);

    useEffect(() => {
        if (!replay) return;

        const urlStep = clampReplayStep(parseReplayStep(searchParams), maxStepIndex);
        if (urlStep !== REPLAY_STORE.stepIndex) {
            REPLAY_STORE.seekTo(urlStep);
        }
    }, [searchParams, replay, maxStepIndex]);

    useEffect(() => {
        initializedSessionRef.current = null;
    }, [gameId]);

    useEffect(() => {
        return () => {
            initializedSessionRef.current = null;
        };
    }, []);

    const switchPerspective = (userId: number) => {
        navigate(getReplayPath(userId, gameId, REPLAY_STORE.stepIndex), { replace: true });
    };

    return { perspectiveUserId, initialStep, switchPerspective };
};
