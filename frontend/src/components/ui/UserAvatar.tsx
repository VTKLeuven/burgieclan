interface UserAvatarProps {
    /** Full name (or username) the initials are taken from. */
    name?: string | null;
    /** Diameter in pixels. */
    size?: number;
    className?: string;
}

function initialsOf(name?: string | null): string {
    const parts = (name ?? '').trim().split(/\s+/).filter(Boolean);
    if (parts.length === 0) return '?';
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * The round avatar the wireframes show in the header and at the foot of the sidebar. Accounts
 * carry no photo, so it shows the person's initials on navy instead.
 */
export default function UserAvatar({ name, size = 32, className = '' }: UserAvatarProps) {
    return (
        <span
            aria-hidden="true"
            className={`inline-grid shrink-0 select-none place-items-center rounded-full bg-vtk-navy font-display font-semibold text-white ${className}`}
            style={{ width: size, height: size, fontSize: Math.round(size * 0.36) }}
        >
            {initialsOf(name)}
        </span>
    );
}
