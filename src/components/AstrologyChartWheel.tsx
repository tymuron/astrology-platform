// Astrology chart wheel + sigil + star — extracted from the Claude Design hero handoff.
// Hand-drawn SVG so it doesn't rely on any icon font.

const ZODIAC_PATHS: string[] = [
    // Aries — ram horns
    'M -3.5 -3 C -3.5 -1, -2 1.5, 0 1.5 C 2 1.5, 3.5 -1, 3.5 -3 M 0 1.5 L 0 4',
    // Taurus — circle with horns
    'M -3.5 -3 C -2.5 -1.5, -1.5 -1, 0 -1 C 1.5 -1, 2.5 -1.5, 3.5 -3 M -2.2 1.6 A 2.2 2.2 0 1 0 2.2 1.6 A 2.2 2.2 0 1 0 -2.2 1.6',
    // Gemini — Roman II with bars
    'M -3.2 -3.5 L 3.2 -3.5 M -3.2 3.5 L 3.2 3.5 M -1.6 -3.5 L -1.6 3.5 M 1.6 -3.5 L 1.6 3.5',
    // Cancer — two opposing circles
    'M -3.5 -1.6 C -3.5 -3, -1.5 -3, -1.5 -1.6 C -1.5 -0.2, -3.5 -0.2, -3.5 -1.6 M 3.5 1.6 C 3.5 0.2, 1.5 0.2, 1.5 1.6 C 1.5 3, 3.5 3, 3.5 1.6 M -3.5 -1.6 C -2 -1.6, 2 1.6, 3.5 1.6',
    // Leo — circle with sweeping tail
    'M -1 -1 A 1.5 1.5 0 1 1 -1 -1.01 M 0.4 -1 C 2 -1, 3 0.5, 3 2 C 3 3.4, 2 4, 1 3.4',
    // Virgo — M with looped tail
    'M -3.5 3.5 L -3.5 -2.5 L -1.5 1 L -1.5 -2.5 L 0.5 1 L 0.5 -2.5 L 2.5 1 L 2.5 3.5 C 3.8 3.5, 3.8 1, 2.5 1',
    // Libra — scale arch
    'M -3.5 3 L 3.5 3 M -3.5 0.5 L -1.2 0.5 M 1.2 0.5 L 3.5 0.5 M -1.2 0.5 C -1.2 -1.5, 1.2 -1.5, 1.2 0.5',
    // Scorpio — M with arrow tail
    'M -3.8 3.5 L -3.8 -2.5 L -1.8 1 L -1.8 -2.5 L 0.2 1 L 0.2 -2.5 L 2.2 1 L 2.2 3.5 L 3.8 3.5 M 3 2.5 L 3.8 3.5 L 3 3.5',
    // Sagittarius — diagonal arrow with crossbar
    'M -3.5 3.5 L 3.5 -3.5 M 1.6 -3.5 L 3.5 -3.5 L 3.5 -1.6 M -0.5 0.5 L 1.5 2.5',
    // Capricorn — V with small loop
    'M -3.5 -2.5 L -1.5 2 L 0.5 -2.5 L 1.8 1.5 C 2.5 3, 3.8 2.8, 3.8 1.4 C 3.8 0.2, 2.8 -0.3, 2 0.3',
    // Aquarius — two stacked zigzag waves
    'M -3.5 -1.5 L -2 -2.5 L -0.5 -1.5 L 1 -2.5 L 2.5 -1.5 L 3.5 -2.2 M -3.5 1.5 L -2 0.5 L -0.5 1.5 L 1 0.5 L 2.5 1.5 L 3.5 0.8',
    // Pisces — two crescents joined by a bar
    'M -3.2 -3.2 C -1.5 -1.5, -1.5 1.5, -3.2 3.2 M 3.2 -3.2 C 1.5 -1.5, 1.5 1.5, 3.2 3.2 M -2.4 0 L 2.4 0',
];

export function AstrologyChartWheel({
    size = 560,
    color = '#475D57',
    bg = 'transparent',
    faded = false,
}: {
    size?: number;
    color?: string;
    bg?: string;
    faded?: boolean;
}) {
    const rOuter = 48;
    const rRim = 42;
    const rInner = 34;
    const rCore = 14;
    const opacity = faded ? 0.55 : 1;
    return (
        <svg viewBox="-50 -50 100 100" width={size} height={size} style={{ display: 'block', opacity, maxWidth: '100%', height: 'auto' }}>
            {bg !== 'transparent' && <circle cx="0" cy="0" r={rOuter} fill={bg} />}
            <circle cx="0" cy="0" r={rOuter} fill="none" stroke={color} strokeWidth="0.4" />
            <circle cx="0" cy="0" r={rRim} fill="none" stroke={color} strokeWidth="0.3" />
            <circle cx="0" cy="0" r={rInner} fill="none" stroke={color} strokeWidth="0.3" />
            <circle cx="0" cy="0" r={rCore} fill="none" stroke={color} strokeWidth="0.3" />
            {/* 12 spokes */}
            {Array.from({ length: 12 }).map((_, i) => {
                const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                const x1 = Math.cos(a) * rInner;
                const y1 = Math.sin(a) * rInner;
                const x2 = Math.cos(a) * rRim;
                const y2 = Math.sin(a) * rRim;
                return <line key={'s' + i} x1={x1} y1={y1} x2={x2} y2={y2} stroke={color} strokeWidth="0.3" />;
            })}
            {/* Zodiac glyphs around the band */}
            {ZODIAC_PATHS.map((d, i) => {
                const a = ((i + 0.5) / 12) * Math.PI * 2 - Math.PI / 2;
                const r = (rRim + rInner) / 2;
                const x = Math.cos(a) * r;
                const y = Math.sin(a) * r;
                const s = 0.34;
                return (
                    <g key={'z' + i} transform={`translate(${x} ${y}) scale(${s})`}>
                        <path d={d} fill="none" stroke={color} strokeWidth={(1 / s) * 0.32} strokeLinecap="round" strokeLinejoin="round" />
                    </g>
                );
            })}
            {/* Inner aspect lines */}
            {[0, 4, 8].map((i) => {
                const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
                const j = (i + 4) % 12;
                const b = (j / 12) * Math.PI * 2 - Math.PI / 2;
                return (
                    <line
                        key={'a' + i}
                        x1={Math.cos(a) * rCore}
                        y1={Math.sin(a) * rCore}
                        x2={Math.cos(b) * rCore}
                        y2={Math.sin(b) * rCore}
                        stroke={color}
                        strokeWidth="0.25"
                    />
                );
            })}
            {/* Center crescent */}
            <g>
                <circle cx="0" cy="0" r="5" fill="none" stroke={color} strokeWidth="0.3" />
                <path d="M -2.5 -3 A 4 4 0 1 0 -2.5 3 A 3 3 0 1 1 -2.5 -3 Z" fill={color} />
            </g>
            {/* Star marks on the outer rim */}
            {[1, 3, 5, 7, 9, 11].map((i) => {
                const a = ((i + 0.1) / 12) * Math.PI * 2 - Math.PI / 2;
                const x = Math.cos(a) * rOuter * 0.97;
                const y = Math.sin(a) * rOuter * 0.97;
                return <circle key={'d' + i} cx={x} cy={y} r="0.4" fill={color} />;
            })}
        </svg>
    );
}

export function Sigil({ size = 28, color = 'currentColor', strokeWidth = 1 }: { size?: number; color?: string; strokeWidth?: number }) {
    return (
        <svg viewBox="-50 -50 100 100" width={size} height={size} style={{ display: 'block' }}>
            <circle cx="0" cy="0" r="44" fill="none" stroke={color} strokeWidth={strokeWidth} opacity="0.7" />
            <polygon points="0,-32 28,16 -28,16" fill="none" stroke={color} strokeWidth={strokeWidth} />
            <polygon points="0,32 28,-16 -28,-16" fill="none" stroke={color} strokeWidth={strokeWidth} />
            <polygon points="0,-22 19,11 -19,11" fill="none" stroke={color} strokeWidth={strokeWidth} opacity="0.7" />
            <polygon points="0,22 19,-11 -19,-11" fill="none" stroke={color} strokeWidth={strokeWidth} opacity="0.7" />
            <circle cx="0" cy="0" r="4" fill={color} />
        </svg>
    );
}

export function StarMark({ size = 16, color = '#C5A97D', style }: { size?: number; color?: string; style?: React.CSSProperties }) {
    return (
        <svg viewBox="-10 -10 20 20" width={size} height={size} style={style}>
            <path d="M0 -9 L1.6 -1.6 L9 0 L1.6 1.6 L0 9 L-1.6 1.6 L-9 0 L-1.6 -1.6 Z" fill={color} />
        </svg>
    );
}
