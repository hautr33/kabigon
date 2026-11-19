// Thước đo theo kích thước màn hình (đơn vị: pixel CSS).
//   u : tỉ lệ cho thế giới game (nhân vật, sao, tốc độ). 1 = khung 500x800 của bản gốc.
export const DPR = Math.min(window.devicePixelRatio || 1, 2);

export type Metrics = {
    W: number;
    H: number;
    u: number;
    ground: (x: number) => number;
    wide: boolean;
};

export function metrics(W: number, H: number): Metrics {
    const u = Math.min(1.5, Math.max(0.7, Math.min(H / 800, W / 420)));
    const ground = (x: number) => H - 40 * u + Math.sin((x * 0.008) / u) * 12 * u + Math.cos((x * 0.003) / u) * 8 * u;
    return { W, H, u, ground, wide: W > H * 1.15 };
}
