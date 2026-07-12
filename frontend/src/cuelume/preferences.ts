const STORAGE_KEY = "galaguerre:sound-enabled";
const CHANGE_EVENT = "galaguerre:sound-enabled-change";

export function readSoundEnabled(): boolean {
    if (typeof localStorage === "undefined") return true;
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored === null) return true;
    return stored === "true";
}

export function writeSoundEnabled(enabled: boolean): void {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(STORAGE_KEY, String(enabled));
    window.dispatchEvent(new Event(CHANGE_EVENT));
}

export function subscribeSoundEnabled(onStoreChange: () => void): () => void {
    const handler = () => onStoreChange();
    window.addEventListener(CHANGE_EVENT, handler);
    window.addEventListener("storage", handler);
    return () => {
        window.removeEventListener(CHANGE_EVENT, handler);
        window.removeEventListener("storage", handler);
    };
}
