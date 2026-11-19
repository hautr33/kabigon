import type { ReactNode } from 'react';
import { STAR_LEVELS } from './01-kabigon/levels';
import { StarCatchLevel } from './01-kabigon/StarCatchLevel';

// Danh sách theme. Mỗi theme gồm 3 màn; số thứ tự màn & ngày (cách nhau 1 tháng) được tính tự động.
// Thêm theme mới: tạo thư mục src/themes/02-ten-theme/, rồi thêm một mục vào mảng THEMES.

export type Icon = 'star' | 'heart' | 'constellation' | 'lock';

export type LevelEntry = {
    id: string;
    title: string;
    subtitle: string;
    icon: Icon;
    render: (onExit: () => void, number: number) => ReactNode;
};

export type Theme = {
    id: string;
    name: string;
    tagline: string;
    levels: LevelEntry[]; // tối đa 3
};

const [l12, l24, l36] = STAR_LEVELS;

export const THEMES: Theme[] = [
    {
        id: 'kabigon',
        name: 'Vì Sao & Kabigon',
        tagline: 'Cùng Kabigon hái sao trên đồi hoa',
        levels: [
            { id: l12.id, title: 'Đèn Lồng Dưới Trăng', subtitle: 'Bắt 12 ngôi sao băng', icon: 'star', render: (onExit, n) => <StarCatchLevel config={l12} number={n} onExit={onExit} /> },
            { id: l24.id, title: '24 Giờ Bên Nhau', subtitle: 'Bắt 24 ngôi sao băng', icon: 'heart', render: (onExit, n) => <StarCatchLevel config={l24} number={n} onExit={onExit} /> },
            { id: l36.id, title: 'Chòm Sao Tên Em', subtitle: 'Bắt 36 ngôi sao băng', icon: 'constellation', render: (onExit, n) => <StarCatchLevel config={l36} number={n} onExit={onExit} /> },
        ],
    },
];

// Số thứ tự màn trên toàn game (bắt đầu từ 1)
export function levelNumber(themeIndex: number, levelIndex: number) {
    return themeIndex * 3 + levelIndex + 1;
}

export function findLevel(id: string) {
    for (let t = 0; t < THEMES.length; t++) {
        const i = THEMES[t].levels.findIndex((l) => l.id === id);
        if (i >= 0) return { level: THEMES[t].levels[i], number: levelNumber(t, i) };
    }
    return null;
}
