import { IconVolume, IconVolumeOff } from "@tabler/icons-react";
import { useState } from "react";
import { setEnabled } from "~/cuelume/index";
import { CUELUME_TOGGLE } from "~/cuelume/sound_props";
import { readSoundEnabled, writeSoundEnabled } from "~/cuelume/preferences";

export const SoundToggle = () => {
    const [enabled, setEnabledState] = useState(readSoundEnabled);

    const toggle = () => {
        const next = !enabled;
        setEnabledState(next);
        setEnabled(next);
        writeSoundEnabled(next);
    };

    return (
        <button
            type="button"
            className="app-header__sound-toggle"
            onClick={toggle}
            aria-pressed={enabled}
            aria-label={enabled ? "Couper le son" : "Activer le son"}
            title={enabled ? "Couper le son" : "Activer le son"}
            {...CUELUME_TOGGLE}
        >
            {enabled ? <IconVolume size={20} /> : <IconVolumeOff size={20} />}
        </button>
    );
};
