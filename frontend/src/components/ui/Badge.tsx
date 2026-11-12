// Pastel pills from the tag palette: tinted background, saturated text, same-hue border.
const colors = {
    gray: 'vtk-badge-muted',
    red: 'vtk-badge-danger',
    yellow: 'vtk-badge-accent',
    green: 'vtk-badge-success',
    blue: 'vtk-badge-info',
    indigo: 'border-tag-purple-border bg-tag-purple-bg text-tag-purple-text',
    purple: 'border-tag-purple-border bg-tag-purple-bg text-tag-purple-text',
    pink: 'border-tag-pink-border bg-tag-pink-bg text-tag-pink-text',
}

export default function Badge({ text, color }: { text: string, color: keyof typeof colors }) {
    return (
        <span className={`vtk-badge shrink-0 whitespace-nowrap ${colors[color]}`}>
            {text}
        </span>
    );
}
