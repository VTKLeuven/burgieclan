// Palette-aligned badge variants. Yellow is the single brand accent; the
// semantic colours mirror `.vtk-basic-badge-*` in vtk-website-new.
const colors = {
    gray: 'vtk-badge-muted',
    red: 'vtk-badge-danger',
    yellow: 'vtk-badge-accent',
    green: 'vtk-badge-success',
    blue: '',
    indigo: '',
    purple: '',
    pink: '',
}

export default function Badge({ text, color }: { text: string, color: keyof typeof colors }) {
    return (
        <span className={`vtk-badge shrink-0 whitespace-nowrap ${colors[color]}`}>
            {text}
        </span>
    );
}
