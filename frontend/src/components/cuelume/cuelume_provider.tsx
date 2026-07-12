import { useEffect, type ReactNode } from "react";
import { bind, setEnabled } from "~/cuelume/index";
import { readSoundEnabled } from "~/cuelume/preferences";

export const CuelumeProvider = ({ children }: { children: ReactNode }) => {
    useEffect(() => {
        setEnabled(readSoundEnabled());
        bind();
    }, []);

    return children;
};
