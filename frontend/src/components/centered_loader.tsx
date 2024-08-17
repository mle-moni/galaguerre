import { Loader } from "@mantine/core";
import clsx from "clsx";

interface CenteredLoaderProps {
    absolute?: boolean;
}

export const CenteredLoader = ({ absolute }: CenteredLoaderProps) => {
    return (
        <div
            className={clsx(
                "flex justify-center items-center w-full",
                absolute && "absolute",
                absolute ? "h-[80vh]" : "h-full",
            )}
        >
            <Loader />
        </div>
    );
};
