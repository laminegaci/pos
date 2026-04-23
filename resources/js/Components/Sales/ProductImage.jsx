// Illustrations SVG sur-mesure par produit. Aucune image externe.
// Chaque visuel occupe un viewBox 0 0 200 150 (ratio 4:3).

function Plaque({ face, top, edge }) {
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            {/* ombre portée */}
            <ellipse cx="100" cy="128" rx="72" ry="5" fill="#0f172a" opacity="0.12" />
            {/* tranche latérale droite */}
            <path d="M160 58 L180 44 L180 78 L160 92 Z" fill={edge} />
            {/* tranche frontale (épaisseur) */}
            <path d="M30 82 L160 82 L160 92 L30 92 Z" fill={edge} />
            {/* face supérieure */}
            <path d="M30 82 L50 68 L180 44 L160 58 L160 82 Z" fill={top} />
            <path d="M30 82 L50 68 L180 44 L160 58 Z" fill={top} />
            {/* face principale (dessus de la plaque visible en biais) */}
            <path d="M30 82 L50 68 L180 44 L160 58 L160 82 Z" fill={face} opacity="0.6" />
            <path d="M50 68 L180 44 L180 48 L50 72 Z" fill="#ffffff" opacity="0.35" />
            {/* plaque en dessous (pile) */}
            <path d="M30 92 L160 92 L160 100 L30 100 Z" fill={edge} opacity="0.6" />
            <path d="M30 100 L160 100 L160 108 L30 108 Z" fill={edge} opacity="0.4" />
        </svg>
    );
}

function Profile({ shape }) {
    // shape: 'C' vertical montant, 'U' horizontal rail
    const metalFill = 'url(#metalGrad)';
    if (shape === 'C') {
        return (
            <svg viewBox="0 0 200 150" className="h-full w-full">
                <defs>
                    <linearGradient id="metalGrad" x1="0" y1="0" x2="1" y2="0">
                        <stop offset="0%" stopColor="#cbd5e1" />
                        <stop offset="50%" stopColor="#94a3b8" />
                        <stop offset="100%" stopColor="#64748b" />
                    </linearGradient>
                </defs>
                <ellipse cx="100" cy="132" rx="50" ry="4" fill="#0f172a" opacity="0.15" />
                <path
                    d="M130 20 L70 20 L70 32 L118 32 L118 118 L70 118 L70 130 L130 130 Z"
                    fill={metalFill}
                    stroke="#475569"
                    strokeWidth="0.6"
                />
                {/* reflet vertical */}
                <rect x="73" y="22" width="3" height="106" fill="#f8fafc" opacity="0.6" />
            </svg>
        );
    }
    // U horizontal
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <linearGradient id="metalGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="50%" stopColor="#94a3b8" />
                    <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
            </defs>
            <ellipse cx="100" cy="118" rx="80" ry="4" fill="#0f172a" opacity="0.15" />
            <path
                d="M20 50 L180 50 L180 110 L168 110 L168 62 L32 62 L32 110 L20 110 Z"
                fill="url(#metalGrad)"
                stroke="#475569"
                strokeWidth="0.6"
            />
            <rect x="22" y="52" width="156" height="3" fill="#f8fafc" opacity="0.7" />
        </svg>
    );
}

function Screws() {
    const screw = (x, y, rot = 0) => (
        <g transform={`translate(${x} ${y}) rotate(${rot})`}>
            {/* ombre */}
            <ellipse cx="0" cy="70" rx="14" ry="2.5" fill="#0f172a" opacity="0.15" />
            {/* tête */}
            <ellipse cx="0" cy="0" rx="13" ry="4" fill="#64748b" />
            <path d="M-13 0 Q0 6 13 0 L13 5 Q0 11 -13 5 Z" fill="#475569" />
            {/* empreinte torx */}
            <circle cx="0" cy="1" r="3" fill="#1e293b" />
            {/* corps */}
            <path d="M-5 4 L5 4 L3 60 L0 66 L-3 60 Z" fill="url(#screwGrad)" />
            {/* filetage */}
            {[12, 20, 28, 36, 44, 52].map((dy) => (
                <path key={dy} d={`M-4 ${dy} L4 ${dy + 2}`} stroke="#1e293b" strokeWidth="0.9" opacity="0.55" />
            ))}
        </g>
    );
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <linearGradient id="screwGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#94a3b8" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#64748b" />
                </linearGradient>
            </defs>
            {screw(65, 40, -12)}
            {screw(105, 32, 8)}
            {screw(145, 44, -5)}
        </svg>
    );
}

function Bucket({ bodyColor, labelColor, labelText, labelTextColor = '#ffffff' }) {
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <linearGradient id={`bucket-${labelText}`} x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor={bodyColor} stopOpacity="0.75" />
                    <stop offset="50%" stopColor={bodyColor} />
                    <stop offset="100%" stopColor={bodyColor} stopOpacity="0.7" />
                </linearGradient>
            </defs>
            <ellipse cx="100" cy="135" rx="58" ry="4" fill="#0f172a" opacity="0.18" />
            {/* anse */}
            <path d="M55 42 Q100 14 145 42" fill="none" stroke="#334155" strokeWidth="2.5" />
            {/* corps (trapèze) */}
            <path d="M45 42 L155 42 L148 128 L52 128 Z" fill={`url(#bucket-${labelText})`} />
            {/* bord supérieur */}
            <ellipse cx="100" cy="42" rx="55" ry="6" fill={bodyColor} />
            <ellipse cx="100" cy="42" rx="55" ry="6" fill="#0f172a" opacity="0.1" />
            <ellipse cx="100" cy="41" rx="48" ry="4" fill="#0f172a" opacity="0.55" />
            {/* étiquette */}
            <path d="M58 58 L142 58 L138 112 L62 112 Z" fill={labelColor} />
            <text
                x="100"
                y="88"
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize="16"
                fontWeight="800"
                fill={labelTextColor}
                letterSpacing="1"
            >
                {labelText}
            </text>
            {/* reflet vertical */}
            <path d="M60 45 L62 125" stroke="#ffffff" strokeWidth="1.5" opacity="0.35" />
        </svg>
    );
}

function Bag() {
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <linearGradient id="bagGrad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#f5f5f4" />
                    <stop offset="100%" stopColor="#d6d3d1" />
                </linearGradient>
            </defs>
            <ellipse cx="100" cy="135" rx="58" ry="4" fill="#0f172a" opacity="0.16" />
            {/* sac */}
            <path
                d="M55 38 Q55 30 63 30 L137 30 Q145 30 145 38 L148 130 L52 130 Z"
                fill="url(#bagGrad)"
                stroke="#a8a29e"
                strokeWidth="0.6"
            />
            {/* pli supérieur */}
            <path d="M55 38 L100 46 L145 38 L145 44 L100 52 L55 44 Z" fill="#a8a29e" opacity="0.5" />
            {/* bandeau rouge */}
            <rect x="50" y="60" width="100" height="22" fill="#dc2626" />
            <text
                x="100"
                y="77"
                textAnchor="middle"
                fontFamily="Arial, sans-serif"
                fontSize="14"
                fontWeight="800"
                fill="#ffffff"
                letterSpacing="1.2"
            >
                CERAMIX
            </text>
            {/* icône produit abstrait */}
            <rect x="72" y="92" width="56" height="28" rx="2" fill="#e7e5e4" stroke="#78716c" strokeWidth="0.5" />
        </svg>
    );
}

function TapeRoll() {
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <radialGradient id="rollGrad" cx="0.4" cy="0.4">
                    <stop offset="0%" stopColor="#ffffff" />
                    <stop offset="100%" stopColor="#e2e8f0" />
                </radialGradient>
            </defs>
            <ellipse cx="100" cy="130" rx="48" ry="4" fill="#0f172a" opacity="0.15" />
            {/* rouleau extérieur */}
            <circle cx="100" cy="75" r="52" fill="url(#rollGrad)" stroke="#cbd5e1" strokeWidth="1" />
            {/* bordure des couches (stries concentriques) */}
            {[44, 36, 28].map((r) => (
                <circle key={r} cx="100" cy="75" r={r} fill="none" stroke="#cbd5e1" strokeWidth="0.6" opacity="0.8" />
            ))}
            {/* cœur (trou) */}
            <circle cx="100" cy="75" r="18" fill="#78716c" />
            <circle cx="100" cy="75" r="14" fill="#44403c" />
            {/* languette de bande qui dépasse */}
            <path d="M148 82 L176 96 L174 102 L146 88 Z" fill="#ffffff" stroke="#cbd5e1" strokeWidth="0.6" />
        </svg>
    );
}

function Anchor() {
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <linearGradient id="anchorGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#cbd5e1" />
                    <stop offset="50%" stopColor="#e2e8f0" />
                    <stop offset="100%" stopColor="#94a3b8" />
                </linearGradient>
                <linearGradient id="boltGrad" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%" stopColor="#d6d3d1" />
                    <stop offset="50%" stopColor="#f5f5f4" />
                    <stop offset="100%" stopColor="#a8a29e" />
                </linearGradient>
            </defs>
            <ellipse cx="100" cy="130" rx="42" ry="4" fill="#0f172a" opacity="0.18" />
            {/* vis dorée qui dépasse en haut */}
            <ellipse cx="100" cy="18" rx="10" ry="3.5" fill="#d4a017" />
            <rect x="96" y="18" width="8" height="22" fill="url(#boltGrad)" />
            {/* empreinte cruciforme */}
            <path d="M96 17 L104 17 M100 14 L100 21" stroke="#78350f" strokeWidth="1.2" />
            {/* corps de la cheville (plastique) */}
            <path
                d="M85 40 L115 40 L112 115 Q100 125 88 115 Z"
                fill="url(#anchorGrad)"
                stroke="#64748b"
                strokeWidth="0.6"
            />
            {/* ailettes */}
            <path d="M85 55 L70 60 L85 68 Z" fill="#94a3b8" />
            <path d="M115 55 L130 60 L115 68 Z" fill="#94a3b8" />
            <path d="M85 78 L72 82 L85 90 Z" fill="#94a3b8" />
            <path d="M115 78 L128 82 L115 90 Z" fill="#94a3b8" />
            {/* rainure centrale */}
            <rect x="99" y="42" width="2" height="65" fill="#64748b" opacity="0.6" />
        </svg>
    );
}

function Block() {
    return (
        <svg viewBox="0 0 200 150" className="h-full w-full">
            <defs>
                <linearGradient id="blockGrad" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#3f3f46" />
                    <stop offset="100%" stopColor="#18181b" />
                </linearGradient>
            </defs>
            <ellipse cx="100" cy="122" rx="70" ry="4" fill="#0f172a" opacity="0.2" />
            {/* face arrière (tranche supérieure) */}
            <path d="M40 72 L160 72 L172 56 L52 56 Z" fill="#52525b" />
            {/* face droite */}
            <path d="M160 72 L172 56 L172 100 L160 116 Z" fill="#27272a" />
            {/* face frontale */}
            <path d="M40 72 L160 72 L160 116 L40 116 Z" fill="url(#blockGrad)" />
            {/* texture sablon */}
            {[80, 88, 96, 104].map((y) => (
                <line key={y} x1="48" y1={y} x2="152" y2={y} stroke="#71717a" strokeWidth="0.4" opacity="0.4" />
            ))}
        </svg>
    );
}

const VISUAL_BY_PRODUCT = {
    'plaque-ba13-standard': () => <Plaque face="#94a3b8" top="#cbd5e1" edge="#64748b" />,
    'plaque-ba13-hydro': () => <Plaque face="#22c55e" top="#86efac" edge="#16a34a" />,
    'plaque-ba13-feu': () => <Plaque face="#ec4899" top="#f9a8d4" edge="#db2777" />,
    'montant-m48': () => <Profile shape="C" />,
    'rail-r48': () => <Profile shape="U" />,
    'vis-ttpc-25': () => <Screws />,
    'enduit-jointoyage-pret': () => (
        <Bucket bodyColor="#1e3a8a" labelColor="#2563eb" labelText="SEMIN" />
    ),
    'enduit-jointoyage-finition': () => <Bag />,
    'bande-joint': () => <TapeRoll />,
    'cheville-frapper': () => <Anchor />,
    'peinture-mat-blanc': () => (
        <Bucket bodyColor="#f1f5f9" labelColor="#fbbf24" labelText="MATISSE" labelTextColor="#7c2d12" />
    ),
    'cale-poncer': () => <Block />,
};

const BG_BY_CATEGORY = {
    bureaux: 'from-indigo-50 to-violet-100',
    rangement_bureau: 'from-sky-50 to-cyan-100',
    bureaux_direction: 'from-amber-50 to-orange-100',
    bureaux_compacts: 'from-emerald-50 to-teal-100',
    bureaux_ergonomiques: 'from-violet-50 to-purple-100',
    bureaux_gaming: 'from-fuchsia-50 to-pink-100',
    mobilier_professionnel: 'from-orange-50 to-red-100',
    bureaux_partages: 'from-teal-50 to-cyan-100',
};

export default function ProductImage({ product, size = 'md' }) {
    const hasCustomImage = product.image && (product.image.startsWith('http') || product.image.startsWith('/storage'));
    const Visual = VISUAL_BY_PRODUCT[product.id];
    const bg = BG_BY_CATEGORY[product.category_id] ?? 'from-slate-50 to-slate-100';

    const sizes = {
        sm: 'h-14 w-14 shrink-0 rounded-xl',
        md: 'h-16 w-16 shrink-0 rounded-xl',
        lg: 'h-40 w-full shrink-0 rounded-xl',
    };

    if (hasCustomImage) {
        return (
            <div className={`overflow-hidden bg-gradient-to-br ${bg} ${sizes[size]}`}>
                <img
                    src={product.image}
                    alt={product.name || ''}
                    className="h-full w-full object-cover"
                />
            </div>
        );
    }

    return (
        <div className={`relative overflow-hidden bg-gradient-to-br ${bg} ${sizes[size]}`}>
            {Visual ? <Visual /> : null}
        </div>
    );
}
