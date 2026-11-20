// Hình vẽ SVG của theme "Tiệm Bánh Corgi": corgi, nguyên liệu, topping, ảnh bìa polaroid.
import { renderToStaticMarkup } from 'react-dom/server';

export type PupMood = 'happy' | 'think' | 'yes' | 'no' | 'love';

// Bé Corgi — mũm mĩm, ngáo ngáo láo láo: đầu nghiêng, mắt to nhỏ lệch nhau, thè lưỡi "blep".
// Viền CHỈ có ở đường bao ngoài (tai + thân + chân gộp làm một hình) và nét tay; bên trong toàn mảng màu phẳng.
// Vật khác chạm vào corgi (vd: mũ) thì có viền riêng → chỗ chạm nhau luôn có đường viền ngăn cách.
const LINE = '#5b3a29';
const LW = 3.2;
const FUR = '#f4ad62';
const CREAM = '#fff6e6';
const PINK = '#ffb3c3';
const DARK = '#3d261b';
const R = { strokeLinecap: 'round', strokeLinejoin: 'round' } as const;

const BODY = 'M60 106C30 106 19 102 19 88C19 78 20 72 18 66C14 60 15 48 22 42C28 32 44 29 60 29C76 29 92 32 98 42C105 48 106 60 102 66C100 72 101 78 101 88C101 102 90 106 60 106Z';
const EAR_L = 'M23 50C14 36 12 15 19 7C25 1 41 16 51 33Z';
const EAR_R = 'M97 50C106 36 108 15 101 7C95 1 79 16 69 33Z';
const LEG_L = 'M30 106C30 100 33 98 39 98C45 98 48 100 48 106C48 112 30 112 30 106Z';
const LEG_R = 'M72 106C72 100 75 98 81 98C87 98 90 100 90 106C90 112 72 112 72 106Z';
const HAT = 'M50 31C44 31 42 25 46 22C48 20.5 50 20.5 51 21.2C51 16.8 55 14 60 14S69 16.8 69 21.2C70 20.5 72 20.5 74 22C78 25 76 31 70 31V34C70 36 68 37 66 37H54C52 37 50 36 50 34Z';

export function Corgi({ mood = 'happy', className = '' }: { mood?: PupMood; className?: string }) {
    const clip = `cg-${mood}`;
    const EL = 43, ER = 77, EY = 59;
    // mắt chấm to (bên trái to hơn chút → ngáo), đốm sáng
    const eye = (x: number, r: number, lx = 0, ly = 0) => (
        <g>
            <ellipse cx={x} cy={EY} rx={r} ry={r * 1.15} fill={DARK} />
            <circle cx={x + r * 0.35 + lx} cy={EY - r * 0.45 + ly} r={r * 0.42} fill="#fff" />
            <circle cx={x - r * 0.35 + lx * 0.5} cy={EY + r * 0.45 + ly * 0.5} r={r * 0.18} fill="#fff" />
        </g>
    );
    // mắt lim dim láo: nửa dưới hình bầu dục, mí phẳng
    const smug = (x: number) => (
        <g>
            <path d={`M${x - 6.5} ${EY - 1}h13q0 9-6.5 9t-6.5-9z`} fill={DARK} />
            <path d={`M${x - 7.5} ${EY - 1.2}h15`} stroke={DARK} strokeWidth="2.4" {...R} />
            <circle cx={x + 2} cy={EY + 3} r="1.5" fill="#fff" />
        </g>
    );
    const line = (d: string, w = 2.4) => <path d={d} stroke={DARK} strokeWidth={w} fill="none" {...R} />;
    const heart = (x: number) => <path d={`M${x} ${EY + 6}c-5-3.4-7.6-6-7.6-8.8a3.8 3.8 0 0 1 7.6-1.5 3.8 3.8 0 0 1 7.6 1.5c0 2.8-2.6 5.4-7.6 8.8z`} fill="#e27a76" />;
    // miệng: vạch dưới mũi + ω; lưỡi thè lệch một bên
    const mouth = line('M60 69.5v2M54 71.5q3 3.4 6 0q3 3.4 6 0', 2.2);
    const blep = <g><path d="M61.5 73.5c0 5 1.5 8 4.5 8s4.5-3 4-7.5c-1.5 1-6 1-8.5-.5z" fill="#ff8aa3" /><path d="M66 75.5v3.5" stroke="#e8667f" strokeWidth="1.3" {...R} /></g>;
    const face = {
        happy: <>{eye(EL, 6.6)}{eye(ER, 5.6, 0, 0.6)}{mouth}{blep}</>,
        think: <>{smug(EL)}{smug(ER)}{line('M54 73q5 2 11-2', 2.2)}{line('M60 69.5v2', 2.2)}</>,
        yes: <>{line(`M${EL - 5} ${EY - 5}l8 5-8 5M${ER + 5} ${EY - 5}l-8 5 8 5`, 2.8)}{mouth}{blep}</>,
        no: <>{line(`M${EL - 6} ${EY + 1}h12M${ER - 6} ${EY + 1}h12`, 2.8)}{line('M55 75q2.5-2.5 5 0t5 0', 2.2)}{line('M60 69.5v2', 2.2)}
            <path d="M88 48q-2.4 4.6 0 6.4 2.4-1.8 0-6.4z" fill="#9ed6ff" /></>,
        love: <>{heart(EL)}{heart(ER)}{mouth}{blep}</>,
    }[mood];
    const sil = [EAR_L, EAR_R, BODY, LEG_L, LEG_R];
    return (
        <svg className={`bk-cat ${mood} ${className}`} viewBox="0 0 120 120" aria-hidden>
            <defs><clipPath id={clip}><path d={BODY} /></clipPath></defs>
            {/* bóng dưới chân */}
            <ellipse cx="60" cy="111" rx="46" ry="4.5" fill="#e6d5c3" />
            <g transform="rotate(-4 60 70)">
                {/* VIỀN NGOÀI: tô các hình bằng nét dày rồi phủ màu lên → chỉ còn viền ở đường bao ngoài */}
                <g stroke={LINE} strokeWidth={LW * 2} fill={LINE} {...R}>
                    {sil.map((d) => <path key={d} d={d} />)}
                </g>
                {/* tai: cam, lòng hồng */}
                <path d={EAR_L} fill={FUR} />
                <path d={EAR_R} fill={FUR} />
                <path d="M26 40C22 30 21 19 24.5 14C29 13 38 22 44 32Z" fill={PINK} />
                <path d="M94 40C98 30 99 19 95.5 14C91 13 82 22 76 32Z" fill={PINK} />
                {/* thân cam; vệt trắng giữa trán → mõm → ngực bông */}
                <path d={BODY} fill={FUR} />
                <g clipPath={`url(#${clip})`}>
                    <path d="M0 120V80C10 76 24 74 34 78C38 70 47 64 52 52C54 45 56 38 57.5 29H62.5C64 38 66 45 68 52C73 64 82 70 86 78C96 74 110 76 120 80V120Z" fill={CREAM} />
                </g>
                {/* chân ngắn cũn màu kem */}
                <path d={LEG_L} fill={CREAM} />
                <path d={LEG_R} fill={CREAM} />
                {/* má hồng nhạt */}
                <ellipse cx="29" cy="70" rx="5" ry="3" fill={PINK} opacity="0.7" />
                <ellipse cx="91" cy="70" rx="5" ry="3" fill={PINK} opacity="0.7" />
                {/* mặt */}
                {face}
                {/* mũi đen tròn */}
                <path d="M55 66.5c0-2.4 2.2-3.4 5-3.4s5 1 5 3.4c0 2-2.6 3.6-5 3.6s-5-1.6-5-3.6z" fill={DARK} />
                <ellipse cx="58.4" cy="65" rx="1.6" ry="0.9" fill="#fff" opacity="0.8" />
                {/* tay: 2 nét ( ) */}
                <path d="M35 93q-1-9 9-10" stroke={LINE} strokeWidth={LW} fill="none" {...R} />
                <path d="M85 93q1-9-9-10" stroke={LINE} strokeWidth={LW} fill="none" {...R} />
                {/* mũ đầu bếp: vật riêng → có viền bao quanh (kể cả chỗ chạm đầu) */}
                <g transform="rotate(-8 60 26)">
                    <path d={HAT} fill={LINE} stroke={LINE} strokeWidth={LW * 2} {...R} />
                    <path d={HAT} fill="#fff" />
                    <path d="M50 31.5h20" stroke="#ece4dc" strokeWidth="2" {...R} />
                    <path d="M60 28c-1.7-1.2-2.6-2-2.6-3a1.3 1.3 0 0 1 2.6-.5 1.3 1.3 0 0 1 2.6.5c0 1-.9 1.8-2.6 3z" fill="#ef8f8a" />
                </g>
            </g>
        </svg>
    );
}

// Ảnh corgi (data URL) để dùng làm texture trong thế giới Pixi — cùng một hình vẽ với corgi trong khung giải đố
export function pupImageUrl(mood: PupMood, size = 240) {
    const svg = renderToStaticMarkup(<Corgi mood={mood} />).replace('<svg ', `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" `);
    return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

// ---------------- Nguyên liệu (màn 4) ----------------
export const INGREDIENTS = ['flour', 'egg', 'milk', 'strawberry', 'butter', 'choco'] as const;
export type Ingredient = (typeof INGREDIENTS)[number];
export const INGREDIENT_NAME: Record<Ingredient, string> = {
    flour: 'Bột mì', egg: 'Trứng', milk: 'Sữa', strawberry: 'Dâu tây', butter: 'Bơ', choco: 'Sô-cô-la',
};

export function IngredientIcon({ id }: { id: Ingredient }) {
    return (
        <svg className="bk-ing" viewBox="0 0 48 48" aria-hidden>
            {id === 'flour' && <>
                <path d="M12 16q12-6 24 0l3 22q-15 5-30 0z" fill="#f7ead6" stroke="#d9c2a3" strokeWidth="2" strokeLinejoin="round" />
                <path d="M16 15q8 4 16 0" stroke="#c9a47a" strokeWidth="3" fill="none" strokeLinecap="round" />
                <path d="M19 27c3-4 7-4 10 0" stroke="#f0b7c6" strokeWidth="3" fill="none" strokeLinecap="round" />
                <circle cx="20" cy="33" r="1.2" fill="#d9c2a3" /><circle cx="28" cy="34" r="1.2" fill="#d9c2a3" />
            </>}
            {id === 'egg' && <>
                <ellipse cx="24" cy="27" rx="12" ry="15" fill="#fffaf1" stroke="#ead9c2" strokeWidth="2" />
                <ellipse cx="19" cy="20" rx="3" ry="5" fill="#fff" opacity="0.9" />
            </>}
            {id === 'milk' && <>
                <path d="M17 14h14v6l4 6v14q0 3-3 3H16q-3 0-3-3V26l4-6z" fill="#fff" stroke="#bcd7ef" strokeWidth="2" strokeLinejoin="round" />
                <rect x="16" y="9" width="16" height="6" rx="2" fill="#7fb8ea" />
                <path d="M13 30h22v6H13z" fill="#a9d3f5" />
            </>}
            {id === 'strawberry' && <>
                <path d="M24 42C13 36 9 26 12 20c3-5 9-4 12-2 3-2 9-3 12 2 3 6-1 16-12 22z" fill="#ff5d7a" />
                <path d="M16 15l8 4 8-4-3 6h-10z" fill="#5fc27d" />
                {[[18, 26], [24, 24], [30, 26], [21, 32], [27, 32], [24, 37]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="0.9" ry="1.4" fill="#ffe08a" />)}
            </>}
            {id === 'butter' && <>
                <ellipse cx="24" cy="36" rx="17" ry="5" fill="#e8f1fb" stroke="#c9dcef" strokeWidth="1.5" />
                <path d="M12 22l14-6 11 5v11l-14 5-11-5z" fill="#f7d27a" stroke="#e8c24f" strokeWidth="1.5" strokeLinejoin="round" />
                <path d="M12 22l11 5 14-6M23 27v10" stroke="#e8c24f" strokeWidth="1.5" fill="none" />
            </>}
            {id === 'choco' && <>
                <rect x="11" y="12" width="26" height="26" rx="4" fill="#8a5636" />
                {[0, 1, 2].map((r) => [0, 1].map((c) => <rect key={`${r}${c}`} x={14 + c * 11} y={15 + r * 7.5} width="9" height="6" rx="1.5" fill="#a46a46" />))}
                <path d="M11 30l9 8h17V30z" fill="#f2c4cf" opacity="0.9" />
            </>}
        </svg>
    );
}

// ---------------- Topping (màn 5) ----------------
export const TOPPINGS = ['strawberry', 'cream', 'blueberry', 'heart'] as const;
export type Topping = (typeof TOPPINGS)[number];
export const TOPPING_NAME: Record<Topping, string> = { strawberry: 'Dâu', cream: 'Kem', blueberry: 'Việt quất', heart: 'Kẹo tim' };

// at: có thì vẽ lồng trong một SVG khác tại (x, y) với kích thước size (không dùng class CSS)
export function ToppingIcon({ id, at }: { id: Topping; at?: { x: number; y: number; size: number } }) {
    return (
        <svg {...(at ? { x: at.x, y: at.y, width: at.size, height: at.size } : { className: 'bk-top' })} viewBox="0 0 40 40" aria-hidden>
            {id === 'strawberry' && <>
                <path d="M20 35C11 30 8 22 10 17c3-4 7-3 10-1 3-2 7-3 10 1 2 5-1 13-10 18z" fill="#ff5d7a" />
                <path d="M14 12l6 4 6-4-2 5h-8z" fill="#5fc27d" />
                {[[16, 22], [24, 22], [20, 27]].map(([x, y], i) => <ellipse key={i} cx={x} cy={y} rx="0.9" ry="1.3" fill="#ffe08a" />)}
            </>}
            {id === 'cream' && <>
                <path d="M8 30q12 6 24 0l-2-6q-10 4-20 0z" fill="#fffaf3" stroke="#f0dccb" strokeWidth="1.5" />
                <path d="M10 24q10 5 20 0l-3-6q-7 3-14 0z" fill="#fffdf9" stroke="#f0dccb" strokeWidth="1.5" />
                <path d="M13 18q7 3 14 0l-7-10z" fill="#fff" stroke="#f0dccb" strokeWidth="1.5" strokeLinejoin="round" />
            </>}
            {id === 'blueberry' && <>
                <circle cx="15" cy="24" r="7" fill="#5b6fd8" /><circle cx="25" cy="23" r="7" fill="#6c7fe6" /><circle cx="20" cy="15" r="6.5" fill="#7a8cf0" />
                <circle cx="13" cy="21" r="1.8" fill="#fff" opacity="0.6" /><circle cx="18" cy="12" r="1.6" fill="#fff" opacity="0.6" />
            </>}
            {id === 'heart' && <>
                <path d="M20 33C9 26 6 20 6 15a7 7 0 0 1 14-2 7 7 0 0 1 14 2c0 5-3 11-14 18z" fill="#ef8f8a" stroke="#d96f6c" strokeWidth="1.5" />
                <ellipse cx="13" cy="14" rx="3" ry="2" fill="#fff" opacity="0.7" transform="rotate(-30 13 14)" />
            </>}
        </svg>
    );
}

// ---------------- Ảnh bìa polaroid ----------------
export function BakeryCover() {
    return (
        <svg viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="bc-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#fdeedb" /><stop offset="0.6" stopColor="#fbe2cf" /><stop offset="1" stopColor="#f6d8bd" />
                </linearGradient>
            </defs>
            <rect width="160" height="160" fill="url(#bc-sky)" />
            <circle cx="30" cy="30" r="14" fill="#ffe9b8" /><circle cx="30" cy="30" r="22" fill="#ffe9b8" opacity="0.35" />
            <g fill="#fff"><circle cx="112" cy="28" r="9" /><circle cx="124" cy="24" r="12" /><circle cx="137" cy="29" r="9" /></g>
            <path d="M0 126 Q40 112 80 120 T160 116 V160 H0Z" fill="#c6daa8" />
            {/* tiệm bánh */}
            <rect x="72" y="66" width="70" height="56" fill="#fde3dd" />
            <path d="M68 66h78l-4-14H72z" fill="#ef8f8a" />
            {[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${68 + i * 13} 66q6.5 9 13 0`} fill={i % 2 ? '#fff' : '#ef8f8a'} />)}
            <rect x="80" y="82" width="26" height="20" rx="4" fill="#fffaf1" stroke="#e5c3a3" strokeWidth="2" />
            <circle cx="88" cy="94" r="4" fill="#ef8f8a" /><circle cx="98" cy="94" r="4" fill="#f7d27a" />
            <rect x="114" y="88" width="18" height="34" rx="8" fill="#b07a52" />
            {/* corgi nhỏ */}
            <g transform="translate(22 92) scale(0.5)"><Corgi mood="happy" /></g>
            {/* bánh kem */}
            <rect x="96" y="132" width="34" height="16" rx="4" fill="#fff4e6" stroke="#e5c3a3" strokeWidth="2" />
            <path d="M96 136q4.25 5 8.5 0t8.5 0 8.5 0 8.5 0" fill="none" stroke="#ef8f8a" strokeWidth="2.5" />
            <circle cx="113" cy="128" r="4" fill="#ff5d7a" />
        </svg>
    );
}

// ---------------- Icon thẻ màn (màn chọn màn) ----------------
export function BakeryBadge({ kind }: { kind: 'recipe' | 'cake' | 'delivery' }) {
    return (
        <svg className="thumb-icon bk-badge" viewBox="0 0 64 64" width="62" height="62" aria-hidden>
            {kind === 'recipe' && <>
                <path d="M6 30h52q-4 26-26 26T6 30z" fill="#fde3dd" stroke="#e5a59a" strokeWidth="3" />
                <ellipse cx="32" cy="30" rx="26" ry="6" fill="#fff4e6" stroke="#e5a59a" strokeWidth="3" />
                <path d="M40 8l8 22" stroke="#b07a52" strokeWidth="4" strokeLinecap="round" />
                <circle cx="22" cy="28" r="4" fill="#ff5d7a" /><circle cx="31" cy="27" r="3.5" fill="#f7d27a" />
            </>}
            {kind === 'cake' && <>
                <rect x="10" y="30" width="44" height="24" rx="6" fill="#fff4e6" stroke="#e5a59a" strokeWidth="3" />
                <path d="M10 36q5.5 7 11 0t11 0 11 0 11 0" fill="none" stroke="#ef8f8a" strokeWidth="4" />
                <rect x="30" y="14" width="4" height="14" rx="2" fill="#f7d27a" />
                <path d="M32 6c3 4 3 6 0 8-3-2-3-4 0-8z" fill="#f2b84b" />
                <circle cx="20" cy="28" r="4" fill="#ff5d7a" /><circle cx="44" cy="28" r="4" fill="#ff5d7a" />
            </>}
            {kind === 'delivery' && <>
                <circle cx="16" cy="46" r="8" fill="#5b3a29" /><circle cx="50" cy="46" r="8" fill="#5b3a29" />
                <path d="M16 46h26l8-18" stroke="#ef8f8a" strokeWidth="5" fill="none" strokeLinecap="round" />
                <rect x="18" y="20" width="22" height="18" rx="4" fill="#f7d27a" />
                <path d="M29 20v18M18 29h22" stroke="#ef8f8a" strokeWidth="3" />
            </>}
        </svg>
    );
}
