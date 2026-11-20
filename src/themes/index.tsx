import type { ReactNode } from 'react';
import type { Metrics } from '../core/metrics';
import type { NightSky } from '../core/pixi/sky';
import { STAR_LEVELS } from './01-kabigon/levels';
import { StarCatchLevel } from './01-kabigon/StarCatchLevel';
import { kabigonWorld } from './01-kabigon/world';
import { BakeryCover } from './02-tiem-banh/art';
import { BakeryLevel } from './02-tiem-banh/BakeryLevel';
import { kitchenWorld } from './02-tiem-banh/kitchen';
import { bakeryWorld } from './02-tiem-banh/world';

// Danh sách theme. Mỗi theme gồm 3 màn; số thứ tự màn & ngày (mùng 6, cách nhau 1 tháng) được tính tự động.
// Theme tự mở khoá vào ngày của màn đầu tiên.
// Thêm theme mới: tạo thư mục src/themes/02-ten-theme/, rồi thêm một mục vào mảng THEMES.

export type Icon = 'star' | 'heart' | 'constellation' | 'lock' | 'recipe' | 'cake' | 'delivery';

export type LevelEntry = {
    id: string;
    title: string;
    subtitle: string;
    icon: Icon;
    render: (onExit: () => void, number: number) => ReactNode;
};

// "Thế giới" Pixi của theme: hiện dần trên nền trời khi rê chuột vào ảnh polaroid ở home,
// và làm nền màn chọn màn. Tự gắn vào các tầng của `sky`; setVisibility(0..1) để hiện / ẩn.
export type ThemeWorld = {
    setVisibility: (alpha: number) => void;
    update?: (dtMs: number) => void;
    cheer?: () => void; // nhân vật trong thế giới ăn mừng (vd: khi giải đúng)
    perform?: (name: string) => Promise<void>; // diễn một cảnh dùng đồ vật trong thế giới (vd: 'bake' — nướng bánh trong lò)
    destroy: () => void;
};

export type Theme = {
    id: string;
    name: string;
    tagline: string;
    accent: string; // màu chủ đạo (CSS) — viền sáng của ảnh polaroid
    light?: boolean; // thế giới nền sáng (ban ngày) → chữ trên nền đổi sang màu tối
    cover: ReactNode; // hình trong ảnh polaroid
    world?: (m: Metrics, sky: NightSky) => ThemeWorld;
    innerWorld?: (m: Metrics, sky: NightSky) => ThemeWorld; // nền khi đã vào theme (màn chọn màn); không có thì dùng `world`
    levels: LevelEntry[]; // tối đa 3
};

const [l12, l24, l36] = STAR_LEVELS;

export const THEMES: Theme[] = [
    {
        id: 'kabigon',
        name: 'Vì Sao & Kabigon',
        tagline: 'Bé đi hái sao với Kabigon trên đồi hoa nha',
        accent: '#c4b5fd',
        cover: <KabigonCover />,
        world: kabigonWorld,
        levels: [
            { id: l12.id, title: 'Giấc Mơ Của Kabigon', subtitle: 'Gom 12 ngôi sao băng nè', icon: 'star', render: (onExit, n) => <StarCatchLevel config={l12} number={n} onExit={onExit} /> },
            { id: l24.id, title: '24 Giờ Bên Nhau', subtitle: 'Gom 24 ngôi sao băng nè', icon: 'heart', render: (onExit, n) => <StarCatchLevel config={l24} number={n} onExit={onExit} /> },
            { id: l36.id, title: 'Chòm Sao Của Chúng Ta', subtitle: 'Gom 36 ngôi sao băng nè', icon: 'constellation', render: (onExit, n) => <StarCatchLevel config={l36} number={n} onExit={onExit} /> },
        ],
    },
    {
        id: 'tiem-banh',
        name: 'Tiệm Bánh Corgi',
        tagline: 'Bé phụ Bé Corgi làm cái bánh đặc biệt nhất nha',
        accent: '#ff8fb1',
        light: true,
        cover: <BakeryCover />,
        world: bakeryWorld, // ảnh ngoài trời (rê chuột ở home)
        innerWorld: kitchenWorld, // căn bếp (khi vào theme)
        levels: [
            { id: 'banh-cong-thuc', title: 'Công Thức Bí Mật', subtitle: 'Đoán trúng 4 nguyên liệu nè', icon: 'recipe', render: (onExit, n) => <BakeryLevel id="banh-cong-thuc" kind="recipe" number={n} onExit={onExit} /> },
            { id: 'banh-trang-tri', title: 'Hai Nửa Ngọt Ngào', subtitle: 'Trang trí hai nửa y chang nhau', icon: 'cake', render: (onExit, n) => <BakeryLevel id="banh-trang-tri" kind="decorate" number={n} onExit={onExit} /> },
            { id: 'banh-giao-hang', title: 'Đơn Hàng Đặc Biệt', subtitle: 'Xoay đường tới nhà khách nè', icon: 'delivery', render: (onExit, n) => <BakeryLevel id="banh-giao-hang" kind="delivery" number={n} onExit={onExit} /> },
        ],
    },
];

// Số thứ tự màn trên toàn game (bắt đầu từ 1)
export function levelNumber(themeIndex: number, levelIndex: number) {
    return themeIndex * 3 + levelIndex + 1;
}

export function findTheme(id: string) {
    const index = THEMES.findIndex((t) => t.id === id);
    return index >= 0 ? { theme: THEMES[index], index } : null;
}

export function findLevel(id: string) {
    for (let t = 0; t < THEMES.length; t++) {
        const i = THEMES[t].levels.findIndex((l) => l.id === id);
        if (i >= 0) return { level: THEMES[t].levels[i], number: levelNumber(t, i), theme: THEMES[t] };
    }
    return null;
}

// Ảnh polaroid: trời đêm, trăng, đồi tím, Kabigon ngủ, một ngôi sao băng vàng
function KabigonCover() {
    const stars = [[18, 22], [40, 12], [62, 30], [88, 16], [110, 34], [128, 10], [30, 46], [76, 52], [140, 48]];
    return (
        <svg viewBox="0 0 160 160" preserveAspectRatio="xMidYMid slice">
            <defs>
                <linearGradient id="kc-sky" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="#0a0820" />
                    <stop offset="0.6" stopColor="#1d1245" />
                    <stop offset="1" stopColor="#3b1d6e" />
                </linearGradient>
                <radialGradient id="kc-moon" cx="0.5" cy="0.4" r="0.6">
                    <stop offset="0" stopColor="#fff" />
                    <stop offset="1" stopColor="#c7d6f0" />
                </radialGradient>
                <linearGradient id="kc-tail" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0" stopColor="#fde68a" stopOpacity="0" />
                    <stop offset="1" stopColor="#fde68a" />
                </linearGradient>
            </defs>
            <rect width="160" height="160" fill="url(#kc-sky)" />
            <circle cx="122" cy="36" r="30" fill="#c8dcff" opacity="0.15" />
            <circle cx="122" cy="36" r="16" fill="url(#kc-moon)" />
            {stars.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 3 ? 0.9 : 1.5} fill="#fff" opacity={0.6 + (i % 3) * 0.15} />)}
            <path d="M20 70 L62 52" stroke="url(#kc-tail)" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="62" cy="52" r="2.6" fill="#fffbeb" />
            <path d="M0 128 Q40 108 80 120 T160 114 V160 H0Z" fill="#3b0764" />
            <path d="M0 140 Q50 126 100 136 T160 132 V160 H0Z" fill="#1e1442" />
            {/* Kabigon ngủ */}
            <g transform="translate(108 118)">
                <path d="M-8 -14 L-11 -22 L-3 -17Z M8 -14 L11 -22 L3 -17Z" fill="#445b71" />
                <ellipse cx="0" cy="0" rx="17" ry="15" fill="#445b71" />
                <ellipse cx="0" cy="4" rx="12" ry="10" fill="#fcf3e3" />
                <path d="M-7 -6 h4 M3 -6 h4" stroke="#1e293b" strokeWidth="1.2" strokeLinecap="round" />
                <text x="14" y="-16" fontSize="8" fontWeight="700" fill="#fff" opacity="0.85">z</text>
            </g>
            {[[16, 136], [34, 130], [140, 138], [70, 142]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.6" fill={i % 2 ? '#f9a8d4' : '#fef08a'} />)}
        </svg>
    );
}
