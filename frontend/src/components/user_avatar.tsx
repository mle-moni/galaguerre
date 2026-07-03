import clsx from "clsx";
import { getUserInitials } from "~/helpers/user_initials";
import "./user_avatar.css";

interface UserAvatarProps {
    pseudo: string | null;
    email?: string;
    userId?: number;
    imageUrl?: string | null;
    className?: string;
    alt?: string;
}

export const UserAvatar = ({
    pseudo,
    email,
    userId,
    imageUrl,
    className,
    alt = "",
}: UserAvatarProps) => {
    if (imageUrl) {
        return <img src={imageUrl} alt={alt} className={clsx("user-avatar", className)} />;
    }

    const initials = getUserInitials(pseudo, email, userId);

    return (
        <span
            className={clsx("user-avatar", "user-avatar--initials", className)}
            aria-hidden={alt === "" ? true : undefined}
            title={alt || undefined}
        >
            {initials}
        </span>
    );
};
