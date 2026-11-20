// Nét chữ viết tay "Hậu ♥ Trăm" cho chòm sao màn 3.
// Mỗi nét (stroke) là một lần đặt bút: các chữ trong một từ nối liền như viết tay, dấu viết rời.
// Toạ độ: đường kẻ dưới (baseline) y = 0, hướng lên là âm; chữ hoa cao 100, chữ thường cao ~58.
// Điểm [x, y, 1] = góc nhọn (đổi hướng đột ngột, vd: lên đỉnh rồi đi xuống) — không làm tròn qua điểm đó.

type P = [number, number] | [number, number, 1];
export type Stroke = { pts: [number, number][]; closed?: boolean };

// --- Hậu ---
const HAU: P[][] = [
    [[0, -100], [0, 0]], // H: nét sổ trái
    [[54, -100], [54, 0]], // H: nét sổ phải
    [[0, -52], [54, -52]], // H: nét ngang
    // a nối u: vòng chữ a → lên đỉnh → sổ xuống → móc lên chữ u → hai nét u
    [[118, -46], [106, -57], [90, -57], [78, -44], [75, -24], [82, -6], [96, 0], [109, -7], [116, -24], [118, -58, 1],
        [118, -12], [123, -2], [132, 0], [139, -16], [142, -58, 1], [142, -14], [150, -2], [162, 0], [174, -8], [180, -24],
        [181, -58, 1], [181, -10], [186, -1], [194, 0]],
    [[86, -70], [97, -84, 1], [108, -70]], // dấu mũ ^
];
const HAU_DOT: [number, number] = [97, 16]; // dấu nặng (chấm dưới)

// --- Trăm --- (dịch sang phải TRAM_X)
const TRAM_X = 340;
const TRAM: P[][] = [
    [[0, -98], [32, -102], [66, -100]], // T: nét ngang
    [[33, -101], [33, 0]], // T: nét sổ
    [[78, -58], [78, 0, 1], [78, -36], [86, -52], [98, -58], [110, -55]], // r
    // ă nối m: vòng chữ a → lên đỉnh → sổ xuống → móc lên chữ m → ba nét m
    [[156, -46], [144, -57], [128, -57], [116, -44], [113, -24], [120, -6], [134, 0], [147, -7], [154, -24], [156, -58, 1],
        [156, -12], [161, -2], [170, 0], [177, -16], [181, -58, 1], [181, 0, 1], [181, -38], [189, -54], [201, -58], [210, -50],
        [212, -30], [212, 0, 1], [212, -38], [220, -54], [232, -58], [241, -50], [243, -30], [243, -8], [248, 0], [256, 0]],
    [[122, -82], [128, -72], [138, -68], [148, -72], [154, -82]], // dấu trăng ˘
];

// --- Trái tim ở giữa ---
const HEART_CX = 268, HEART_CY = -52, HEART_K = 3.1, HEART_TILT = -0.12;

// Catmull-Rom qua các điểm (tách đoạn tại góc nhọn) → đường gấp khúc dày đặc (~2 đơn vị một điểm)
function smooth(points: P[]): [number, number][] {
    const runs: [number, number][][] = [];
    let run: [number, number][] = [];
    for (const p of points) {
        run.push([p[0], p[1]]);
        if (p[2] === 1) { runs.push(run); run = [[p[0], p[1]]]; }
    }
    runs.push(run);
    const out: [number, number][] = [];
    for (const r of runs) {
        for (let i = 0; i < r.length - 1; i++) {
            const p0 = r[Math.max(0, i - 1)], p1 = r[i], p2 = r[i + 1], p3 = r[Math.min(r.length - 1, i + 2)];
            const steps = Math.max(2, Math.ceil(Math.hypot(p2[0] - p1[0], p2[1] - p1[1]) / 2));
            for (let st = 0; st <= steps; st++) {
                if (st === 0 && out.length) continue; // điểm đầu trùng điểm cuối đoạn trước
                const t = st / steps, t2 = t * t, t3 = t2 * t;
                const f = (a: number, b: number, c: number, d: number) => 0.5 * (2 * b + (-a + c) * t + (2 * a - 5 * b + 4 * c - d) * t2 + (-a + 3 * b - 3 * c + d) * t3);
                out.push([f(p0[0], p1[0], p2[0], p3[0]), f(p0[1], p1[1], p2[1], p3[1])]);
            }
        }
    }
    return out;
}

// dotAfter: chỉ số nét mà ngay sau đó bút chấm dấu nặng (viết xong chữ "Hậu")
export function scriptStrokes(): { strokes: Stroke[]; dots: [number, number][]; dotAfter: number } {
    const strokes: Stroke[] = [];
    for (const s of HAU) strokes.push({ pts: smooth(s) });
    // trái tim: một nét khép kín, hơi nghiêng như vẽ tay
    const heart: [number, number][] = [];
    const c = Math.cos(HEART_TILT), sn = Math.sin(HEART_TILT);
    for (let i = 0; i <= 160; i++) {
        const a = (i / 160) * Math.PI * 2;
        const x = 16 * Math.pow(Math.sin(a), 3) * HEART_K;
        const y = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)) * HEART_K;
        heart.push([HEART_CX + x * c - y * sn, HEART_CY + x * sn + y * c]);
    }
    strokes.push({ pts: heart, closed: true });
    for (const s of TRAM) strokes.push({ pts: smooth(s.map((p) => [p[0] + TRAM_X, p[1], ...(p.length > 2 ? [1] : [])] as P)) });
    return { strokes, dots: [HAU_DOT], dotAfter: HAU.length - 1 };
}
