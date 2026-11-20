// Thước đo theo kích thước màn hình (đơn vị: pixel CSS).
//   u : tỉ lệ cho thế giới game (nhân vật, sao, tốc độ). 1 = khung 500x800 của bản gốc.

// Độ phân giải lúc mở trang — coi như mức zoom 100% của trình duyệt.
const BASE_DPR = window.devicePixelRatio || 1;

// Độ phân giải hiện tại (đổi khi phóng to / thu nhỏ trình duyệt), tối đa 2 cho nhẹ máy.
export const dpr = () => Math.min(window.devicePixelRatio || 1, 2);
export const DPR = dpr();

// Mức zoom của trình duyệt so với lúc mở trang (Ctrl/⌘ + / −): 1.25 = phóng to 125%.
export const browserZoom = () => (window.devicePixelRatio || 1) / BASE_DPR;

export type Metrics = {
    W: number;
    H: number;
    u: number;
    ground: (x: number) => number;
    wide: boolean;
};

export function metrics(W: number, H: number): Metrics {
    // Tính u theo kích thước "thật" của cửa sổ (trước khi zoom) → khi phóng to / thu nhỏ trình duyệt,
    // thế giới game to / nhỏ theo giống chữ và nút bấm. Giới hạn để khi zoom lớn vẫn vừa màn hình.
    const z = browserZoom();
    const base = Math.min(1.5, Math.max(0.7, Math.min((H * z) / 800, (W * z) / 420)));
    const fit = Math.min(H / 800, W / 420);
    const u = Math.max(0.35, Math.min(base, fit * 1.5));
    const ground = (x: number) => H - 40 * u + Math.sin((x * 0.008) / u) * 12 * u + Math.cos((x * 0.003) / u) * 8 * u;
    return { W, H, u, ground, wide: W > H * 1.15 };
}
