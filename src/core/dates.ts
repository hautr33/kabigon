// Mỗi màn cách nhau đúng 1 tháng, bắt đầu từ ngày 06/06/2026 (màn 1). Ngày kỷ niệm hàng tháng: mùng 6.
const FIRST = { day: 6, month: 6, year: 2026 };
export const ANNIV_DAY = FIRST.day;

// Ngày bắt đầu đếm "bên nhau N ngày" — sửa nếu khác ngày màn 1.
export const TOGETHER_SINCE = new Date(FIRST.year, FIRST.month - 1, FIRST.day);

// Thử nghiệm qua URL:
//   ?date=2026-12-06  → giả làm hôm nay là ngày đó (để xem chế độ mùng 6, khoá/mở màn...)
//   ?all              → mở khoá mọi theme / màn
const params = new URLSearchParams(window.location.search);
export const UNLOCK_ALL = params.has('all');

export function today(): Date {
    const fake = params.get('date')?.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    const now = new Date();
    if (!fake) return now;
    return new Date(+fake[1], +fake[2] - 1, +fake[3], now.getHours(), now.getMinutes());
}

export function levelDate(levelNumber: number): Date {
    return new Date(FIRST.year, FIRST.month - 1 + (levelNumber - 1), FIRST.day);
}

const midnight = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate());

// Số ngày từ a tới b (theo lịch, không tính giờ)
export function daysBetween(a: Date, b: Date) {
    return Math.round((midnight(b).getTime() - midnight(a).getTime()) / 86_400_000);
}

// Màn đã tới ngày mở chưa
export function isUnlocked(levelNumber: number, now = today()) {
    return UNLOCK_ALL || daysBetween(levelDate(levelNumber), now) >= 0;
}

export const isMung6 = (now = today()) => now.getDate() === ANNIV_DAY;

// Còn bao nhiêu ngày nữa tới mùng 6 kế tiếp (0 nếu hôm nay là mùng 6)
export function daysToNextMung6(now = today()) {
    let next = new Date(now.getFullYear(), now.getMonth(), ANNIV_DAY);
    if (daysBetween(now, next) < 0) next = new Date(now.getFullYear(), now.getMonth() + 1, ANNIV_DAY);
    return daysBetween(now, next);
}

// Số tháng tròn bên nhau
export function monthsTogether(now = today()) {
    const s = TOGETHER_SINCE;
    let months = (now.getFullYear() - s.getFullYear()) * 12 + now.getMonth() - s.getMonth();
    if (now.getDate() < s.getDate()) months--;
    return Math.max(0, months);
}

const pad = (n: number) => String(n).padStart(2, '0');

// "06/06/2026"
export function formatDate(d: Date, sep = '/') {
    return `${pad(d.getDate())}${sep}${pad(d.getMonth() + 1)}${sep}${d.getFullYear()}`;
}
