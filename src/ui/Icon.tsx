import type { ReactNode } from 'react';

// Bộ icon vẽ tay bằng SVG (thay cho emoji của hệ điều hành — emoji mỗi máy một kiểu, không hợp phong cách game).
// Dùng trong JSX: <Icon name="heart" />   ·   Trong chuỗi lời thoại (RichText): ":heart:"
// Icon cao bằng chữ xung quanh (1.15em) nên tự to nhỏ theo cỡ chữ.

const GOLD = '#fcd34d', GOLD_D = '#f59e0b', PINK = '#f9a8d4', PINK_D = '#ec4899', LILAC = '#c4b5fd', LILAC_D = '#8b5cf6';
const CREAM = '#fff7e6', INK = '#3b2a4a', BLUSH = '#fb7185';

// Má hồng + mắt nhắm cười — dùng chung cho các icon có mặt
const cheeks = (y: number, dx = 4.2, cx = 12) => (
    <>
        <ellipse cx={cx - dx} cy={y} rx="1.4" ry="0.9" fill={BLUSH} opacity="0.55" />
        <ellipse cx={cx + dx} cy={y} rx="1.4" ry="0.9" fill={BLUSH} opacity="0.55" />
    </>
);
const happyEyes = (y: number, dx = 2.6, cx = 12) => (
    <path d={`M${cx - dx - 1} ${y}q1 -1.2 2 0M${cx + dx - 1} ${y}q1 -1.2 2 0`} stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
);
const heartPath = (x: number, y: number, s: number) =>
    `M${x} ${y + 3.2 * s}c-${2.6 * s} -${1.7 * s} -${4 * s} -${3.1 * s} -${4 * s} -${4.6 * s}c0 -${1.3 * s} ${1 * s} -${2.2 * s} ${2.1 * s} -${2.2 * s}c${0.8 * s} 0 ${1.5 * s} ${0.4 * s} ${1.9 * s} ${1.1 * s}c${0.4 * s} -${0.7 * s} ${1.1 * s} -${1.1 * s} ${1.9 * s} -${1.1 * s}c${1.1 * s} 0 ${2.1 * s} ${0.9 * s} ${2.1 * s} ${2.2 * s}c0 ${1.5 * s} -${1.4 * s} ${2.9 * s} -${4 * s} ${4.6 * s}z`;
const sparkle = (x: number, y: number, r: number, fill: string) =>
    <path d={`M${x} ${y - r}Q${x + r * 0.18} ${y - r * 0.18} ${x + r} ${y}Q${x + r * 0.18} ${y + r * 0.18} ${x} ${y + r}Q${x - r * 0.18} ${y + r * 0.18} ${x - r} ${y}Q${x - r * 0.18} ${y - r * 0.18} ${x} ${y - r}z`} fill={fill} />;
const star5 = (cx: number, cy: number, R: number) => {
    const pts: string[] = [];
    for (let i = 0; i < 10; i++) {
        const r = i % 2 ? R * 0.5 : R;
        const a = -Math.PI / 2 + (i * Math.PI) / 5;
        pts.push(`${(cx + Math.cos(a) * r).toFixed(2)} ${(cy + Math.sin(a) * r).toFixed(2)}`);
    }
    return `M${pts.join('L')}z`;
};

export const ICONS = {
    // Trăng khuyết đang ngủ
    moon: <>
        <path d="M15 2.5a9.5 9.5 0 1 0 6.6 15.3A7.6 7.6 0 0 1 15 2.5z" fill={GOLD} />
        <path d="M6.2 9.2a6.8 6.8 0 0 1 3.4-4.4" stroke="#fff" strokeWidth="1.3" strokeLinecap="round" opacity="0.7" fill="none" />
        <path d="M7.4 13.6q1 1 2 0" stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
        <ellipse cx="7.6" cy="16" rx="1.4" ry="0.9" fill={BLUSH} opacity="0.55" />
        {sparkle(19.5, 4.5, 2.2, LILAC)}
    </>,
    // Mặt trời cười
    sun: <>
        <g stroke={GOLD_D} strokeWidth="1.8" strokeLinecap="round">
            {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => {
                const r = (a * Math.PI) / 180;
                return <line key={a} x1={12 + Math.cos(r) * 8.2} y1={12 + Math.sin(r) * 8.2} x2={12 + Math.cos(r) * 10.4} y2={12 + Math.sin(r) * 10.4} />;
            })}
        </g>
        <circle cx="12" cy="12" r="6" fill={GOLD} />
        <circle cx="9.8" cy="9.6" r="1.3" fill="#fff" opacity="0.7" />
        {happyEyes(12, 2.2)}
        {cheeks(14, 3.3)}
    </>,
    // Bát cơm bốc khói
    rice: <>
        <path d="M9 4.5q-1 1.2 0 2.4M12 3.5q-1 1.2 0 2.4M15 4.5q-1 1.2 0 2.4" stroke={LILAC} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M4.5 12a7.5 4.2 0 0 1 15 0z" fill="#fff" />
        <circle cx="8" cy="10.6" r="0.5" fill="#e5e7eb" /><circle cx="12.5" cy="9.4" r="0.5" fill="#e5e7eb" /><circle cx="15.6" cy="10.8" r="0.5" fill="#e5e7eb" />
        <path d="M3 12h18a9 8 0 0 1-18 0z" fill={PINK} />
        <path d="M5 13.6h14" stroke="#fff" strokeWidth="1" opacity="0.6" strokeLinecap="round" />
        {happyEyes(16, 2.4)}
        {cheeks(17.6, 3.8)}
    </>,
    // Mây che nắng (buổi chiều)
    'cloud-sun': <>
        <circle cx="15" cy="9" r="5" fill={GOLD} />
        <g stroke={GOLD_D} strokeWidth="1.5" strokeLinecap="round"><path d="M15 1.6v1.4M21.2 4.3l-1 1M22.4 9h-1.4" /></g>
        <path d="M6.5 20.5a4 4 0 0 1-.4-8 5.2 5.2 0 0 1 10-1.2 3.8 3.8 0 0 1 1.4 7.4c-.4 1.1-1.3 1.8-2.6 1.8z" fill="#fff" />
        {happyEyes(16, 2.2, 10.5)}
        {cheeks(17.6, 3.6, 10.5)}
    </>,
    // Hoàng hôn (buổi tối)
    sunset: <>
        <path d="M5 16a7 7 0 0 1 14 0z" fill="#fdba74" />
        {happyEyes(13, 2.2)}
        {cheeks(14.6, 3.4)}
        <path d="M2.5 16h19M5.5 19h13M8.5 21.6h7" stroke={PINK} strokeWidth="1.6" strokeLinecap="round" />
        {sparkle(4.5, 6, 1.8, LILAC)}{sparkle(19.5, 4.5, 1.4, '#fff')}
    </>,
    heart: <>
        <path d={heartPath(12, 15.5, 2.1)} fill={PINK_D} />
        <ellipse cx="8.4" cy="8.6" rx="1.6" ry="1" transform="rotate(-35 8.4 8.6)" fill="#fff" opacity="0.65" />
    </>,
    'heart-gold': <>
        <path d={heartPath(12, 15.5, 2.1)} fill={GOLD} />
        <ellipse cx="8.4" cy="8.6" rx="1.6" ry="1" transform="rotate(-35 8.4 8.6)" fill="#fff" opacity="0.75" />
    </>,
    // Hai trái tim
    hearts: <>
        <path d={heartPath(15, 12.6, 1.35)} fill={PINK} transform="rotate(14 15 9)" />
        <path d={heartPath(9.5, 18, 1.75)} fill={PINK_D} transform="rotate(-10 9.5 13)" />
        <ellipse cx="6.8" cy="12.6" rx="1.2" ry="0.8" transform="rotate(-40 6.8 12.6)" fill="#fff" opacity="0.65" />
    </>,
    // Trái tim lấp lánh
    'heart-sparkle': <>
        <path d={heartPath(11, 17, 2)} fill={PINK_D} />
        <ellipse cx="7.6" cy="10.4" rx="1.5" ry="0.9" transform="rotate(-35 7.6 10.4)" fill="#fff" opacity="0.65" />
        {sparkle(19.5, 5, 3, GOLD)}{sparkle(21, 12, 1.5, LILAC)}
    </>,
    // Ba ngôi sao lấp lánh
    sparkles: <>
        {sparkle(10, 13, 7, GOLD)}
        {sparkle(18.5, 5.5, 3.4, LILAC)}
        {sparkle(19, 17.5, 2.3, PINK)}
    </>,
    // Ngôi sao cười
    star: <>
        <path d={star5(12, 12.8, 10.5)} fill={GOLD} stroke={GOLD} strokeWidth="2.4" strokeLinejoin="round" />
        {happyEyes(13, 2.2)}
        {cheeks(14.8, 3.6)}
    </>,
    // Sao băng
    'shooting-star': <>
        <path d="M2.5 21.5 11 13M5 22.5l7-7M1.5 18l7.5-6.5" stroke={LILAC} strokeWidth="1.6" strokeLinecap="round" opacity="0.9" />
        <path d={star5(15.5, 8.5, 7)} fill={GOLD} stroke={GOLD} strokeWidth="1.8" strokeLinejoin="round" />
        <circle cx="13.6" cy="6.8" r="1" fill="#fff" opacity="0.7" />
    </>,
    // Sao xoay vòng (chòm sao)
    stars: <>
        <ellipse cx="12" cy="13" rx="10" ry="4.2" fill="none" stroke={LILAC} strokeWidth="1.3" strokeDasharray="2.2 2" transform="rotate(-18 12 13)" />
        <path d={star5(12, 12, 6.2)} fill={GOLD} stroke={GOLD} strokeWidth="1.8" strokeLinejoin="round" />
        {sparkle(20.5, 6, 2, PINK)}{sparkle(3.5, 18.5, 1.6, '#fff')}
    </>,
    // Pháo hoa
    firework: <>
        {Array.from({ length: 12 }, (_, i) => {
            const a = (i * Math.PI) / 6;
            const c = [PINK_D, GOLD, LILAC_D][i % 3];
            return <line key={i} x1={12 + Math.cos(a) * 4} y1={12 + Math.sin(a) * 4} x2={12 + Math.cos(a) * (i % 2 ? 8 : 10)} y2={12 + Math.sin(a) * (i % 2 ? 8 : 10)} stroke={c} strokeWidth="1.8" strokeLinecap="round" />;
        })}
        <circle cx="12" cy="12" r="2" fill="#fff" />
    </>,
    // Phong thư niêm trái tim
    envelope: <>
        <rect x="2.5" y="5.5" width="19" height="14" rx="2.5" fill={CREAM} />
        <path d="M3 7.2 12 13.4l9-6.2" fill="none" stroke={PINK} strokeWidth="1.5" strokeLinejoin="round" />
        <path d="M3 18.6 9.4 12M21 18.6 14.6 12" stroke="#f3dccb" strokeWidth="1.2" strokeLinecap="round" />
        <path d={heartPath(12, 15, 1.15)} fill={PINK_D} />
    </>,
    // Ổ khoá có lỗ khoá hình trái tim
    lock: <>
        <path d="M7.5 10.5V8a4.5 4.5 0 0 1 9 0v2.5" fill="none" stroke="#a5a1c9" strokeWidth="2.2" strokeLinecap="round" />
        <rect x="4.5" y="10" width="15" height="11" rx="3" fill={LILAC} />
        <path d="M6.5 12.4h11" stroke="#fff" strokeWidth="1" opacity="0.5" strokeLinecap="round" />
        <path d={heartPath(12, 17.6, 0.95)} fill={LILAC_D} />
    </>,
    // Đồng hồ cát
    hourglass: <>
        <rect x="5" y="2.5" width="14" height="2.4" rx="1.2" fill={GOLD_D} />
        <rect x="5" y="19.1" width="14" height="2.4" rx="1.2" fill={GOLD_D} />
        <path d="M7 5h10c0 3.6-3.4 5.2-3.4 7S17 15.4 17 19H7c0-3.6 3.4-5.2 3.4-7S7 8.6 7 5z" fill="#fff" opacity="0.9" />
        <path d="M9 8h6c-.8 1.6-2.2 2.3-3 3.3C11.2 10.3 9.8 9.6 9 8zM8.4 18.6c.6-2 2.4-3 3.6-3s3 1 3.6 3z" fill={PINK_D} />
    </>,
    // Mặt khóc mếu
    cry: <>
        <circle cx="12" cy="12.5" r="9.5" fill={GOLD} />
        <path d="M6.8 9.6l2.6-1M17.2 9.6l-2.6-1" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        <path d="M7.2 12.2q1.2 1 2.4 0M14.4 12.2q1.2 1 2.4 0" stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M10.2 17.2q1.8-1.6 3.6 0" stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M16.6 13.6c.9 1.4 1.4 2.3 1.4 3a1.4 1.4 0 0 1-2.8 0c0-.7.5-1.6 1.4-3z" fill="#7dd3fc" />
        <ellipse cx="7" cy="14.6" rx="1.4" ry="0.9" fill={BLUSH} opacity="0.55" />
    </>,
    // Mặt ngượng >///<
    shy: <>
        <circle cx="12" cy="12.5" r="9.5" fill={GOLD} />
        <path d="M6.8 9.8l2.4 1.4-2.4 1.4M17.2 9.8l-2.4 1.4 2.4 1.4" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <ellipse cx="7.4" cy="15" rx="2.2" ry="1.4" fill={BLUSH} opacity="0.7" />
        <ellipse cx="16.6" cy="15" rx="2.2" ry="1.4" fill={BLUSH} opacity="0.7" />
        <path d="M6.4 14.4l.7-1M7.8 14.4l.7-1M15.6 14.4l.7-1M17 14.4l.7-1" stroke={PINK_D} strokeWidth="0.7" strokeLinecap="round" />
        <path d="M10.6 16.4q1.4 1.2 2.8 0" stroke={INK} strokeWidth="1" fill="none" strokeLinecap="round" />
    </>,
    // Mặt láo láo :>>  — mắt lim dim, miệng nhếch, má hồng
    smug: <>
        <circle cx="12" cy="12.5" r="9.5" fill={GOLD} />
        <path d="M6.3 10h3.6M14.1 10h3.6" stroke={INK} strokeWidth="1.1" strokeLinecap="round" />
        <path d="M7 10a1.3 1.3 0 0 0 2.6 0zM14.6 10a1.3 1.3 0 0 0 2.6 0z" fill={INK} />
        <path d="M9.4 15.4q3.2 2 5.8-.9" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M15.2 14.5l.5-.9" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        {cheeks(13.4, 5)}
        {sparkle(19.6, 5.4, 2.4, '#fff')}
    </>,
    // Mặt phụng phịu :<  — mày nhíu, má phồng, môi trề, dấu "tức" nho nhỏ
    pout: <>
        <circle cx="12" cy="12.5" r="9.5" fill={GOLD} />
        <path d="M6.8 8.2l2.6 1M17.2 8.2l-2.6 1" stroke={INK} strokeWidth="1" strokeLinecap="round" />
        <circle cx="8.4" cy="11.4" r="1.15" fill={INK} />
        <circle cx="15.6" cy="11.4" r="1.15" fill={INK} />
        <circle cx="8.8" cy="11" r="0.38" fill="#fff" />
        <circle cx="16" cy="11" r="0.38" fill="#fff" />
        <ellipse cx="6.8" cy="14.6" rx="2" ry="1.3" fill={BLUSH} opacity="0.65" />
        <ellipse cx="17.2" cy="14.6" rx="2" ry="1.3" fill={BLUSH} opacity="0.65" />
        <path d="M10.4 17q1.6-1.5 3.2 0" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M18.6 3.4q.3 1.4 1.6 1.6M22 4.6q-1.4.3-1.6 1.6M20.8 8q-.3-1.4-1.6-1.6M17.4 6.8q1.4-.3 1.6-1.6" stroke={PINK_D} strokeWidth="0.9" fill="none" strokeLinecap="round" />
    </>,
    // Mặt mèo :3  — tai nhọn, mắt cười, miệng ω
    cat: <>
        <path d="M4.4 9L5.2 2.8l4.6 3.4zM19.6 9l-.8-6.2-4.6 3.4z" fill={GOLD} />
        <path d="M5.9 6.6l.4-2.2 1.6 1.2zM18.1 6.6l-.4-2.2-1.6 1.2z" fill={PINK} />
        <circle cx="12" cy="13" r="9.2" fill={GOLD} />
        <path d="M6.9 11.6q1.3-1.5 2.6 0M14.5 11.6q1.3-1.5 2.6 0" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M9.6 15q1.2 1.5 2.4 0q1.2 1.5 2.4 0" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M2.6 13.4l2.6.4M2.8 15.8l2.5-.5M21.4 13.4l-2.6.4M21.2 15.8l-2.5-.5" stroke={INK} strokeWidth="0.7" strokeLinecap="round" opacity="0.55" />
        {cheeks(14.4, 5.2)}
    </>,
    // Mặt mắt tim — mê quá trời
    love: <>
        <circle cx="12" cy="12.5" r="9.5" fill={GOLD} />
        <path d={heartPath(8.2, 9.6, 0.62)} fill={PINK_D} />
        <path d={heartPath(15.8, 9.6, 0.62)} fill={PINK_D} />
        <path d="M8.8 14.6q3.2 4 6.4 0z" fill={INK} />
        <path d="M10.4 16.4q1.6-1 3.2 0q-1.6 1-3.2 0z" fill={BLUSH} />
        {cheeks(14.2, 5.4)}
    </>,
    // Mặt nháy mắt lè lưỡi
    wink: <>
        <circle cx="12" cy="12.5" r="9.5" fill={GOLD} />
        <circle cx="8.4" cy="11" r="1.15" fill={INK} />
        <circle cx="8.8" cy="10.6" r="0.38" fill="#fff" />
        <path d="M14.2 9.6l2.4 1.4-2.4 1.4" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <path d="M9 14.6q3 2.6 6 0" stroke={INK} strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M12.4 15.9h2.2v1.3a1.1 1.1 0 0 1-2.2 0z" fill={BLUSH} />
        {cheeks(14, 5.2)}
    </>,
    // Ngôi sao 4 cánh nhỏ
    twinkle: <>{sparkle(12, 12, 8, LILAC)}</>,
} satisfies Record<string, ReactNode>;

export type IconName = keyof typeof ICONS;
export const isIconName = (s: string): s is IconName => s in ICONS;

export function Icon({ name, className = '', title }: { name: IconName; className?: string; title?: string }) {
    return (
        <svg className={`icon ${className}`} viewBox="0 0 24 24" aria-hidden={title ? undefined : true} role={title ? 'img' : undefined}>
            {title && <title>{title}</title>}
            {ICONS[name]}
        </svg>
    );
}

// Ngôi sao tiến độ (đặc / rỗng) — dùng ở chú thích ảnh polaroid
export function ProgressStar({ filled }: { filled: boolean }) {
    return (
        <svg className="icon" viewBox="0 0 24 24" aria-hidden>
            <path d={star5(12, 12.8, 9.5)} fill={filled ? GOLD : 'none'} stroke={filled ? GOLD_D : '#c9c3dc'} strokeWidth="2" strokeLinejoin="round" />
        </svg>
    );
}
