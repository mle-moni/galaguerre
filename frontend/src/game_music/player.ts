import { GAME_MUSIC_TRACKS } from "./tracks.ts";

const FADE_IN_MS = 1500;
const FADE_OUT_MS = 2000;
const CROSSFADE_MS = 2000;
const TARGET_VOLUME = 0.45;
const SESSION_STORAGE_KEY = "galaguerre:game-music-session";

type FadeHandle = { cancel: () => void };

interface PersistedMusicSession {
    gameId: number;
    playlist: string[];
    trackIndex: number;
}

function readPersistedSession(gameId: number): PersistedMusicSession | null {
    if (typeof sessionStorage === "undefined") return null;
    try {
        const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw) as PersistedMusicSession;
        if (parsed.gameId !== gameId) return null;
        if (!Array.isArray(parsed.playlist) || parsed.playlist.length === 0) return null;
        return parsed;
    } catch {
        return null;
    }
}

function writePersistedSession(session: PersistedMusicSession): void {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
    } catch {
        // Private mode / quota exceeded.
    }
}

function clearPersistedSession(): void {
    if (typeof sessionStorage === "undefined") return;
    try {
        sessionStorage.removeItem(SESSION_STORAGE_KEY);
    } catch {
        // Ignore.
    }
}

function shuffle<T>(items: readonly T[]): T[] {
    const result = [...items];
    for (let i = result.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
}

function clampVolume(value: number): number {
    return Math.min(1, Math.max(0, value));
}

function rampVolume(
    audio: HTMLAudioElement,
    from: number,
    to: number,
    durationMs: number,
    onComplete?: () => void,
): FadeHandle {
    let cancelled = false;
    let rafId = 0;
    const start = performance.now();
    const startVolume = clampVolume(from);
    const endVolume = clampVolume(to);

    audio.volume = startVolume;

    const tick = (now: number) => {
        if (cancelled) return;
        const t = durationMs <= 0 ? 1 : Math.min(1, Math.max(0, (now - start) / durationMs));
        audio.volume = clampVolume(startVolume + (endVolume - startVolume) * t);
        if (t < 1) {
            rafId = requestAnimationFrame(tick);
            return;
        }
        audio.volume = endVolume;
        onComplete?.();
    };

    rafId = requestAnimationFrame(tick);

    return {
        cancel: () => {
            cancelled = true;
            cancelAnimationFrame(rafId);
        },
    };
}

/**
 * Dual-element playlist player with fade in/out and crossfade between tracks.
 * Intended for in-match BGM only.
 */
class GameMusicPlayer {
    private primary = new Audio();
    private secondary = new Audio();
    private active: HTMLAudioElement = this.primary;
    private standby: HTMLAudioElement = this.secondary;

    private playlist: string[] = [];
    private trackIndex = 0;
    private sessionGameId: number | null = null;
    private sessionActive = false;
    private soundEnabled = true;
    private crossfading = false;
    private fade: FadeHandle | null = null;
    private needsUserGesture = false;
    private gestureResumeHandler: (() => void) | null = null;

    constructor() {
        this.primary.preload = "auto";
        this.secondary.preload = "auto";
        this.primary.addEventListener("timeupdate", this.onTimeUpdate);
        this.secondary.addEventListener("timeupdate", this.onTimeUpdate);
        this.primary.addEventListener("ended", this.onEnded);
        this.secondary.addEventListener("ended", this.onEnded);
    }

    /** Start a new match session (shuffled playlist, fade in). */
    start(gameId: number): void {
        if (this.sessionActive && this.sessionGameId === gameId) {
            if (this.needsUserGesture) this.bindUserGestureResume();
            return;
        }

        if (this.sessionActive) {
            this.cancelFade();
            this.crossfading = false;
            this.pauseReset(this.primary);
            this.pauseReset(this.secondary);
        }

        const persisted = readPersistedSession(gameId);

        this.sessionGameId = gameId;
        this.sessionActive = true;
        this.crossfading = false;
        this.needsUserGesture = false;

        if (persisted) {
            this.playlist = persisted.playlist;
            this.trackIndex = persisted.trackIndex;
        } else {
            this.playlist = shuffle(GAME_MUSIC_TRACKS);
            this.trackIndex = 0;
            this.persistSession();
        }

        if (!this.soundEnabled) return;
        this.playTrack(this.playlist[this.trackIndex] ?? this.playlist[0]!, { fadeIn: true });
    }

    /** End the match session with a fade out. */
    stop(): void {
        if (!this.sessionActive && this.active.paused && this.standby.paused) return;
        this.sessionActive = false;
        this.sessionGameId = null;
        this.crossfading = false;
        this.needsUserGesture = false;
        this.unbindUserGestureResume();
        clearPersistedSession();
        this.cancelFade();
        this.fadeOutAndPause(this.active);
        this.fadeOutAndPause(this.standby);
    }

    /** Hard stop without waiting for fade (unmount / leave page). */
    dispose(): void {
        this.sessionActive = false;
        this.sessionGameId = null;
        this.crossfading = false;
        this.needsUserGesture = false;
        this.unbindUserGestureResume();
        this.cancelFade();
        this.pauseReset(this.primary);
        this.pauseReset(this.secondary);
    }

    setSoundEnabled(enabled: boolean): void {
        if (this.soundEnabled === enabled) return;
        this.soundEnabled = enabled;

        if (!this.sessionActive) return;

        if (!enabled) {
            this.cancelFade();
            this.fadeOutAndPause(this.active);
            this.fadeOutAndPause(this.standby);
            return;
        }

        // Resume current track (or start first) with fade in.
        if (!this.active.src) {
            this.playTrack(this.playlist[this.trackIndex] ?? this.playlist[0]!, {
                fadeIn: true,
            });
            return;
        }

        this.cancelFade();
        this.tryPlay(this.active);
        this.fade = rampVolume(this.active, this.active.volume, TARGET_VOLUME, FADE_IN_MS, () => {
            this.fade = null;
        });
    }

    private playTrack(src: string, options: { fadeIn: boolean }): void {
        this.cancelFade();
        this.crossfading = false;

        const audio = this.active;
        audio.src = src;
        audio.currentTime = 0;
        audio.volume = options.fadeIn ? 0 : TARGET_VOLUME;

        this.tryPlay(audio);

        if (options.fadeIn) {
            this.fade = rampVolume(audio, 0, TARGET_VOLUME, FADE_IN_MS, () => {
                this.fade = null;
            });
        }
    }

    private tryPlay(audio: HTMLAudioElement): void {
        void audio.play().catch((error: unknown) => {
            if (!this.isAutoplayBlocked(error)) return;
            this.needsUserGesture = true;
            this.bindUserGestureResume();
        });
    }

    private isAutoplayBlocked(error: unknown): boolean {
        return error instanceof DOMException && error.name === "NotAllowedError";
    }

    private bindUserGestureResume(): void {
        if (this.gestureResumeHandler || typeof window === "undefined") return;

        const resume = () => {
            this.unbindUserGestureResume();
            if (!this.sessionActive || !this.soundEnabled) return;

            this.needsUserGesture = false;
            const audio = this.active;
            if (!audio.src) {
                this.playTrack(this.playlist[this.trackIndex] ?? this.playlist[0]!, {
                    fadeIn: true,
                });
                return;
            }

            this.cancelFade();
            void audio.play().catch(() => undefined);
            this.fade = rampVolume(audio, audio.volume, TARGET_VOLUME, FADE_IN_MS, () => {
                this.fade = null;
            });
        };

        this.gestureResumeHandler = resume;
        window.addEventListener("pointerdown", resume, { once: true });
        window.addEventListener("keydown", resume, { once: true });
    }

    private unbindUserGestureResume(): void {
        if (!this.gestureResumeHandler || typeof window === "undefined") return;
        window.removeEventListener("pointerdown", this.gestureResumeHandler);
        window.removeEventListener("keydown", this.gestureResumeHandler);
        this.gestureResumeHandler = null;
    }

    private persistSession(): void {
        if (this.sessionGameId === null) return;
        writePersistedSession({
            gameId: this.sessionGameId,
            playlist: this.playlist,
            trackIndex: this.trackIndex,
        });
    }

    private onTimeUpdate = (): void => {
        if (!this.sessionActive || !this.soundEnabled || this.crossfading) return;

        const audio = this.active;
        if (!Number.isFinite(audio.duration) || audio.duration <= 0) return;

        const remaining = audio.duration - audio.currentTime;
        if (remaining > CROSSFADE_MS / 1000) return;

        this.beginCrossfade();
    };

    private onEnded = (event: Event): void => {
        if (event.target !== this.active) return;
        if (!this.sessionActive || !this.soundEnabled) return;
        if (this.crossfading) return;

        // Fallback if timeupdate never triggered a crossfade (short tracks / seek).
        this.beginCrossfade();
    };

    private beginCrossfade(): void {
        if (!this.sessionActive || !this.soundEnabled || this.crossfading) return;
        if (this.playlist.length === 0) return;

        this.crossfading = true;
        this.cancelFade();

        this.trackIndex = (this.trackIndex + 1) % this.playlist.length;
        const nextSrc = this.playlist[this.trackIndex]!;
        this.persistSession();

        const outgoing = this.active;
        const incoming = this.standby;

        incoming.src = nextSrc;
        incoming.currentTime = 0;
        incoming.volume = 0;
        this.tryPlay(incoming);

        rampVolume(outgoing, outgoing.volume, 0, CROSSFADE_MS, () => {
            outgoing.pause();
            outgoing.currentTime = 0;
        });
        this.fade = rampVolume(incoming, 0, TARGET_VOLUME, CROSSFADE_MS, () => {
            this.fade = null;
            this.active = incoming;
            this.standby = outgoing;
            this.crossfading = false;
        });
    }

    private fadeOutAndPause(audio: HTMLAudioElement): void {
        if (!audio.src || (audio.paused && audio.volume === 0)) return;

        const from = clampVolume(audio.volume);
        if (from <= 0) {
            audio.pause();
            return;
        }

        rampVolume(audio, from, 0, FADE_OUT_MS, () => {
            audio.pause();
        });
    }

    private pauseReset(audio: HTMLAudioElement): void {
        audio.pause();
        audio.removeAttribute("src");
        audio.load();
        audio.volume = 0;
    }

    private cancelFade(): void {
        this.fade?.cancel();
        this.fade = null;
    }
}

export const gameMusicPlayer = new GameMusicPlayer();
