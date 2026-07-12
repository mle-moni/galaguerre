const STORAGE_KEY = "galaguerre:sound-enabled";

export function readSoundEnabled(): boolean {
    if (typeof localStorage === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
}

export function writeSoundEnabled(enabled: boolean): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, String(enabled));
}
