import { IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { useSyncExternalStore } from "react";
import { setEnabled } from "~/cuelume/index";
import { CUELUME_TOGGLE } from "~/cuelume/sound_props";
import { readSoundEnabled, subscribeSoundEnabled, writeSoundEnabled } from "~/cuelume/preferences";

interface SoundToggleProps {
    variant?: "icon" | "drawer" | "fab";
}

export const SoundToggle = ({ variant = "icon" }: SoundToggleProps) => {
    const enabled = useSyncExternalStore(subscribeSoundEnabled, readSoundEnabled, () => true);

    const toggle = () => {
        const next = !enabled;
        setEnabled(next);
        writeSoundEnabled(next);
    };

    const label = enabled ? "Couper le son" : "Activer le son";

    if (variant === "drawer") {
        return (
            <button
                type="button"
                className="app-header__drawer-sound-toggle"
                onClick={toggle}
                aria-pressed={enabled}
                aria-label={label}
                {...CUELUME_TOGGLE}
            >
                {enabled ? <IconVolume size={18} /> : <IconVolumeOff size={18} />}
                {enabled ? "Son activé" : "Son coupé"}
            </button>
        );
    }

    if (variant === "fab") {
        return (
            <button
                type="button"
                className="game-hud-fab game-hud-fab--sound"
                onClick={toggle}
                aria-pressed={enabled}
                aria-label={label}
                title={label}
                {...CUELUME_TOGGLE}
            >
                {enabled ? <IconVolume size={20} /> : <IconVolumeOff size={20} />}
            </button>
        );
    }

    return (
        <button
            type="button"
            className="app-header__sound-toggle"
            onClick={toggle}
            aria-pressed={enabled}
            aria-label={label}
            title={label}
            {...CUELUME_TOGGLE}
        >
            {enabled ? <IconVolume size={20} /> : <IconVolumeOff size={20} />}
        </button>
    );
};
