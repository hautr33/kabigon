// Mỗi màn cách nhau đúng 1 tháng, bắt đầu từ ngày 06/06/2026 (màn 1).
const FIRST = { day: 6, month: 6, year: 2026 };

export function levelDate(levelNumber: number): Date {
    return new Date(FIRST.year, FIRST.month - 1 + (levelNumber - 1), FIRST.day);
}

const pad = (n: number) => String(n).padStart(2, '0');

// "06/06/2026"
export function formatDate(d: Date, sep = '/') {
    return `${pad(d.getDate())}${sep}${pad(d.getMonth() + 1)}${sep}${d.getFullYear()}`;
}
