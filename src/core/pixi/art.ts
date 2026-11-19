import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import type { Metrics } from '../metrics';

// "Xưởng vẽ" texture: vẽ các hình bằng Canvas 2D MỘT LẦN lúc tải game rồi biến thành texture của Pixi.
// Khi chơi, mọi thứ là sprite nên rất nhẹ (các quầng sáng tốn kém như shadowBlur đã được "nướng" sẵn).
// Texture có `resolution` nên kích thước luôn tính theo đơn vị logic (pixel CSS), không cần chia tỉ lệ.
// Sau này muốn thay bằng ảnh vẽ tay (PNG) thì chỉ cần thay texture trùng key.

type Ctx = CanvasRenderingContext2D;
export const ART_RES = 2; // vẽ gấp đôi cho nét trên màn Retina

const textures = new Map<string, Texture>();

export function tex(key: string): Texture {
    const t = textures.get(key);
    if (!t) throw new Error(`Chưa có texture "${key}"`);
    return t;
}

export function bake(key: string, w: number, h: number, draw: (ctx: Ctx, w: number, h: number) => void, res = ART_RES): Texture {
    const canvas = document.createElement('canvas');
    canvas.width = Math.ceil(w * res);
    canvas.height = Math.ceil(h * res);
    const ctx = canvas.getContext('2d')!;
    ctx.save();
    ctx.scale(res, res);
    draw(ctx, w, h);
    ctx.restore();
    if (pending) { pending.push({ key, canvas, w, h }); return Texture.EMPTY; }
    const t = new Texture({ source: new CanvasSource({ resource: canvas, resolution: res, autoGenerateMipmaps: true }) });
    textures.set(key, t);
    return t;
}

// ---------------------------------------------------------------------------
// Atlas: xếp mọi hình vẽ sẵn vào chung một tấm texture lớn (việc TexturePacker làm, nhưng tự động lúc chạy).
// Lợi ích: GPU vẽ cả cảnh trong ít lượt hơn (ít đổi texture), và ParticleContainer dùng được mọi hình.
// Khi có ảnh PNG thật, có thể xuất atlas bằng TexturePacker (định dạng JSON Hash) rồi Assets.load — Pixi đọc sẵn.
// ---------------------------------------------------------------------------
type Pending = { key: string; canvas: HTMLCanvasElement; w: number; h: number };
let pending: Pending[] | null = null;
const ATLAS_RES = 2;
const PAGE = 2048; // pixel thật
const PAD = 8; // chừa lề để mipmap không lem sang hình bên cạnh

function packAtlas(items: Pending[]) {
    const sized = items.map((it) => ({ ...it, pw: Math.ceil(it.w * ATLAS_RES), ph: Math.ceil(it.h * ATLAS_RES) }))
        .sort((a, b) => b.ph - a.ph);
    type Placed = (typeof sized)[number] & { x: number; y: number };
    const pages: Placed[][] = [[]];
    let x = PAD, y = PAD, rowH = 0;
    for (const it of sized) {
        if (x + it.pw + PAD > PAGE) { x = PAD; y += rowH + PAD; rowH = 0; }
        if (y + it.ph + PAD > PAGE) { pages.push([]); x = PAD; y = PAD; rowH = 0; }
        pages[pages.length - 1].push({ ...it, x, y });
        x += it.pw + PAD;
        rowH = Math.max(rowH, it.ph);
    }
    for (const page of pages) {
        const canvas = document.createElement('canvas');
        canvas.width = PAGE;
        canvas.height = PAGE;
        const ctx = canvas.getContext('2d')!;
        page.forEach((it) => ctx.drawImage(it.canvas, it.x, it.y, it.pw, it.ph));
        const source = new CanvasSource({ resource: canvas, resolution: ATLAS_RES, autoGenerateMipmaps: true });
        page.forEach((it) => textures.set(it.key, new Texture({ source, frame: new Rectangle(it.x / ATLAS_RES, it.y / ATLAS_RES, it.w, it.h) })));
    }
    return pages.length;
}

export function roundRect(ctx: Ctx, x: number, y: number, w: number, h: number, r: number) {
    r = Math.min(r, w / 2, h / 2);
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.arcTo(x + w, y, x + w, y + h, r);
    ctx.arcTo(x + w, y + h, x, y + h, r);
    ctx.arcTo(x, y + h, x, y, r);
    ctx.arcTo(x, y, x + w, y, r);
    ctx.closePath();
}

// ---------------------------------------------------------------------------
// Texture dùng chung — gọi một lần trong BootScene
// ---------------------------------------------------------------------------
export function makeSharedArt() {
    if (textures.has('glow-dot')) return;
    pending = [];
    makeSkyGradient();
    radial('glow-dot', 64, [[0, 1], [0.25, 0.8], [1, 0]]);
    radial('soft-glow', 256, [[0, 1], [0.35, 0.4], [0.7, 0.08], [1, 0]]);

    // Ngôi sao 5 cánh trắng có quầng sáng (tint màu khi dùng)
    bake('star5', 48, 48, (ctx: Ctx) => {
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        starPath(ctx, 24, 24, 12, 0.42); ctx.fill();
    });

    // Đuôi sao băng: dải sáng thon dần, đầu (bên phải) sáng nhất, cuối (bên trái) tan vào trời.
    // Đặt origin ở đầu đuôi rồi xoay theo hướng bay.
    const tail = (key: string, halfW: number, stops: [number, number][], glow: number) => bake(key, 256, 32, (ctx: Ctx) => {
        const g = ctx.createLinearGradient(0, 0, 256, 0);
        stops.forEach(([p, a]) => g.addColorStop(p, `rgba(255,255,255,${a})`));
        ctx.fillStyle = g;
        if (glow) { ctx.shadowBlur = glow; ctx.shadowColor = 'rgba(255,255,255,0.7)'; }
        ctx.beginPath();
        ctx.moveTo(2, 16);
        ctx.bezierCurveTo(120, 16 - halfW * 0.35, 200, 16 - halfW, 246, 16 - halfW);
        ctx.arc(246, 16, halfW, -Math.PI / 2, Math.PI / 2);
        ctx.bezierCurveTo(200, 16 + halfW, 120, 16 + halfW * 0.35, 2, 16);
        ctx.fill();
    });
    tail('comet-tail', 8, [[0, 0], [0.45, 0.12], [0.8, 0.45], [1, 0.95]], 6);
    tail('comet-core', 2.6, [[0, 0], [0.55, 0.15], [0.85, 0.7], [1, 1]], 2);

    // Vòng sáng lan ra khi bắt được sao
    bake('ring', 64, 64, (ctx: Ctx) => {
        ctx.strokeStyle = '#fff'; ctx.lineWidth = 3; ctx.shadowBlur = 8; ctx.shadowColor = '#fff';
        ctx.beginPath(); ctx.arc(32, 32, 22, 0, Math.PI * 2); ctx.stroke();
    });

    // Tia lấp lánh 4 cánh — cho particle
    bake('spark', 32, 32, (ctx: Ctx) => {
        ctx.shadowBlur = 6; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        ctx.beginPath();
        for (let i = 0; i < 8; i++) {
            const a = (i * Math.PI) / 4; const r = i % 2 === 0 ? 11 : 2.2;
            ctx.lineTo(16 + Math.cos(a) * r, 16 + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();
    });

    // Trái tim (chế độ trứng phục sinh "tram")
    bake('heart', 48, 48, (ctx: Ctx) => {
        const s = 12;
        ctx.shadowBlur = 10; ctx.shadowColor = '#fff'; ctx.fillStyle = '#fff';
        ctx.translate(24, 24 - 1.1 * s);
        heartPath(ctx, s); ctx.fill();
    });

    // Kabigon 3 biểu cảm (mặt hướng sang phải; quay trái thì flipX)
    for (const emotion of ['normal', 'happy', 'sad']) {
        bake(`kabi-${emotion}`, 110, 110, (ctx: Ctx) => { ctx.translate(55, 57); drawKabi(ctx, emotion); });
    }

    // Vợt bắt sao hình đám mây
    bake('net', 150, 120, (ctx: Ctx) => {
        ctx.translate(75, 55);
        ctx.shadowBlur = 20; ctx.shadowColor = '#fbbf24';
        ctx.fillStyle = 'rgba(255, 255, 255, 0.2)'; ctx.strokeStyle = '#fef08a'; ctx.lineWidth = 4;
        ctx.beginPath(); ctx.moveTo(-45, 0); ctx.bezierCurveTo(-45, -25, -20, -35, 0, -15); ctx.bezierCurveTo(20, -35, 45, -25, 45, 0); ctx.bezierCurveTo(55, 25, 30, 35, 15, 25); ctx.bezierCurveTo(0, 45, -15, 45, -15, 25); ctx.bezierCurveTo(-30, 35, -55, 25, -45, 0);
        ctx.fill(); ctx.stroke(); ctx.shadowBlur = 0;
        const grd = ctx.createRadialGradient(0, 0, 5, 0, 0, 45);
        grd.addColorStop(0, 'rgba(253, 230, 138, 0.4)'); grd.addColorStop(1, 'rgba(245, 158, 11, 0.0)');
        ctx.fillStyle = grd; ctx.fill();
    });

    // Đèn lồng (size chuẩn = 10)
    bake('lantern', 80, 90, (ctx: Ctx) => {
        const s = 10, x = 40, y = 45;
        ctx.shadowBlur = s * 3; ctx.shadowColor = '#f59e0b';
        ctx.beginPath(); ctx.ellipse(x, y, s, s * 1.4, 0, 0, Math.PI * 2);
        const g = ctx.createLinearGradient(x, y - s, x, y + s);
        g.addColorStop(0, '#fde68a'); g.addColorStop(0.6, '#ea580c'); g.addColorStop(1, '#9a3412');
        ctx.fillStyle = g; ctx.fill();
        ctx.beginPath(); ctx.arc(x, y + s * 0.5, s * 0.4, 0, Math.PI * 2);
        ctx.fillStyle = '#fff'; ctx.shadowBlur = s * 4; ctx.shadowColor = '#fff'; ctx.fill();
    });

    // Mặt trăng (bán kính chuẩn = 110)
    bake('moon', 360, 360, (ctx: Ctx) => {
        const r = 110, c = 180;
        const g = ctx.createRadialGradient(c, c - r * 0.3, 0, c, c, r);
        g.addColorStop(0, '#ffffff'); g.addColorStop(0.6, '#f0f5ff'); g.addColorStop(1, '#b4c8e6');
        ctx.shadowBlur = 50; ctx.shadowColor = 'rgba(200, 220, 255, 1)';
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); ctx.fill();
        // vài vết lõm nhẹ cho mặt trăng có chiều sâu
        ctx.shadowBlur = 0; ctx.fillStyle = 'rgba(160, 180, 215, 0.18)';
        ([[-35, -20, 18], [30, 25, 24], [20, -45, 11], [-30, 45, 13], [55, -10, 9]] as const).forEach(([dx, dy, rr]) => {
            ctx.beginPath(); ctx.arc(c + dx, c + dy, rr, 0, Math.PI * 2); ctx.fill();
        });
    });

    // Cánh hoa đào trắng (tint hồng khi dùng)
    bake('petal', 24, 24, (ctx: Ctx) => {
        const s = 8; ctx.translate(12, 12); ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.moveTo(0, s);
        ctx.bezierCurveTo(s * 1.2, s * 0.3, s * 1.2, -s * 0.8, 0, -s * 0.6);
        ctx.bezierCurveTo(-s * 1.2, -s * 0.8, -s * 1.2, s * 0.3, 0, s);
        ctx.fill();
    });

    // Chim bay — sprite sheet 8 khung vỗ cánh
    const BIRD_W = 56, BIRD_H = 44, FRAMES = 8;
    const birdTex = bake('bird', BIRD_W * FRAMES, BIRD_H, (ctx: Ctx) => {
        ctx.fillStyle = '#0a0c19';
        for (let f = 0; f < FRAMES; f++) {
            const wing = Math.sin((f / FRAMES) * Math.PI * 2) * 12;
            ctx.save(); ctx.translate(f * BIRD_W + 28, 24); ctx.rotate(-0.15);
            ctx.beginPath(); ctx.moveTo(0, 0);
            ctx.quadraticCurveTo(-12, -10 + wing, -22, -wing); ctx.quadraticCurveTo(-10, 2, 0, 5);
            ctx.quadraticCurveTo(10, 2, 22, -wing); ctx.quadraticCurveTo(12, -10 + wing, 0, 0);
            ctx.fill(); ctx.restore();
        }
    });
    void birdTex;

    // Kabigon tách bộ phận để rig (cùng khung 110x110, gốc toạ độ (55,57))
    for (const part of KABI_PARTS) {
        bake(`kb-${part}`, 110, 110, (ctx: Ctx) => { ctx.translate(55, 57); drawKabiPart(ctx, part); });
    }

    const items = pending;
    pending = null;
    packAtlas(items);
    const bird = tex('bird').frame;
    for (let f = 0; f < FRAMES; f++) {
        textures.set(`bird-${f}`, new Texture({ source: tex('bird').source, frame: new Rectangle(bird.x + f * BIRD_W, bird.y, BIRD_W, BIRD_H) }));
    }
}

// ---------------------------------------------------------------------------
// Cảnh đồi + cây + hoa ở chân màn hình (vẽ lại khi đổi kích thước màn hình)
// ---------------------------------------------------------------------------
export function bakeScenery(key: string, m: Metrics, margin = 0) {
    const { W, H, u, ground } = m;
    const bandH = Math.ceil(170 * u);
    const top = H - bandH;
    textures.get(key)?.destroy(true);
    bake(key, W + margin * 2, bandH, (ctx: Ctx) => {
        ctx.translate(margin, -top);
        const treeColors = ['#4c1d95', '#6d28d9', '#4338ca', '#5b21b6'];
        const treeCount = Math.max(6, Math.round((W + margin * 2) / (95 * u)));
        for (let i = 0; i < treeCount; i++) {
            const x = -margin + ((W + margin * 2) / (treeCount - 1)) * i + (Math.random() - 0.5) * 30 * u;
            drawTree(ctx, x, ground(x) + 5 * u, (Math.random() * 0.35 + 0.6) * u, treeColors[i % 4], Math.random() > 0.5);
        }
        const hill = ctx.createLinearGradient(0, H - 60 * u, 0, H);
        hill.addColorStop(0, '#3b0764'); hill.addColorStop(1, '#0f172a');
        ctx.fillStyle = hill; ctx.beginPath(); ctx.moveTo(-margin, H);
        for (let x = -margin; x <= W + margin + 5; x += 5) ctx.lineTo(x, ground(x));
        ctx.lineTo(W + margin, H); ctx.fill();
        ctx.strokeStyle = 'rgba(167, 139, 250, 0.4)'; ctx.lineWidth = 3 * u; ctx.beginPath();
        for (let x = -margin; x <= W + margin + 5; x += 5) { if (x === -margin) ctx.moveTo(x, ground(x)); else ctx.lineTo(x, ground(x)); }
        ctx.stroke();

        const flowerColors = ['#fbcfe8', '#fecdd3', '#e9d5ff', '#a78bfa'];
        const decoCount = Math.round(45 * (W + margin * 2) / (500 * u));
        for (let i = 0; i < decoCount; i++) {
            const x = -margin + Math.random() * (W + margin * 2);
            const y = ground(x) + (5 + Math.random() * 25) * u;
            const sc = (Math.random() * 0.4 + 0.6) * u;
            ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
            if (Math.random() > 0.6) {
                ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2.5; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(0, -8); ctx.stroke();
                ctx.translate(0, -8); ctx.fillStyle = flowerColors[Math.floor(Math.random() * 4)];
                for (let p = 0; p < 5; p++) { ctx.rotate(Math.PI * 2 / 5); ctx.beginPath(); ctx.ellipse(0, -3.5, 2.5, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
                ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(0, 0, 2.5, 0, Math.PI * 2); ctx.fill();
            } else {
                ctx.fillStyle = '#4c1d95'; ctx.beginPath();
                ctx.arc(0, 0, 4, Math.PI, 0); ctx.arc(-5, 2, 3, Math.PI, 0); ctx.arc(5, 2, 3, Math.PI, 0); ctx.fill();
            }
            ctx.restore();
        }
    }, Math.min(window.devicePixelRatio || 1, 2));
    return { texture: tex(key), top };
}

// ---------------------------------------------------------------------------
// Các hàm vẽ nội bộ
// ---------------------------------------------------------------------------
function radial(key: string, size: number, stops: [number, number][]) {
    bake(key, size, size, (ctx: Ctx) => {
        const r = size / 2;
        const g = ctx.createRadialGradient(r, r, 0, r, r, r);
        stops.forEach(([p, a]) => g.addColorStop(p, `rgba(255,255,255,${a})`));
        ctx.fillStyle = g; ctx.fillRect(0, 0, size, size);
    }, 1);
}

function starPath(ctx: Ctx, x: number, y: number, r: number, inner: number) {
    ctx.beginPath();
    for (let i = 0; i < 5; i++) {
        const a = Math.PI / 2 + i * Math.PI * 2 / 5; const b = a + Math.PI / 5;
        if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y - Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y - Math.sin(a) * r);
        ctx.lineTo(x + Math.cos(b) * r * inner, y - Math.sin(b) * r * inner);
    }
    ctx.closePath();
}

function heartPath(ctx: Ctx, size: number) {
    ctx.beginPath(); ctx.moveTo(0, size * 0.3);
    ctx.bezierCurveTo(0, 0, -size, 0, -size, size * 0.3);
    ctx.bezierCurveTo(-size, size, 0, size * 1.5, 0, size * 2.2);
    ctx.bezierCurveTo(0, size * 1.5, size, size, size, size * 0.3);
    ctx.bezierCurveTo(size, 0, 0, 0, 0, size * 0.3);
}

function drawTree(ctx: Ctx, x: number, baseY: number, scale: number, color: string, flip: boolean) {
    ctx.save(); ctx.translate(x, baseY); ctx.scale(scale * (flip ? -1 : 1), scale);
    ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-3, -15, -2, -25); ctx.lineTo(2, -25); ctx.quadraticCurveTo(3, -15, 4, 0); ctx.fill();
    ctx.fillStyle = color; ctx.beginPath(); ctx.arc(0, -35, 18, 0, Math.PI * 2); ctx.arc(-14, -25, 14, 0, Math.PI * 2); ctx.arc(14, -25, 14, 0, Math.PI * 2); ctx.arc(-8, -15, 10, 0, Math.PI * 2); ctx.arc(8, -15, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.beginPath(); ctx.arc(-6, -38, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -28, 2.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// Kabigon — giữ nguyên nét vẽ gốc
function drawKabi(gx: Ctx, emotion: string) {
    const bodyColor = '#445b71', bellyColor = '#fcf3e3', pawColor = '#b08d6a'; const ex = 4;
    gx.fillStyle = bodyColor; gx.beginPath(); gx.moveTo(-16, -20); gx.lineTo(-24, -40); gx.lineTo(-4, -30); gx.fill(); gx.beginPath(); gx.moveTo(16, -20); gx.lineTo(24, -40); gx.lineTo(4, -30); gx.fill();
    gx.beginPath(); gx.moveTo(0, -32); gx.bezierCurveTo(25, -32, 42, -10, 45, 15); gx.bezierCurveTo(45, 35, 25, 45, 0, 45); gx.bezierCurveTo(-25, 45, -45, 35, -45, 15); gx.bezierCurveTo(-42, -10, -25, -32, 0, -32); gx.fill();
    gx.fillStyle = bellyColor; gx.beginPath(); gx.moveTo(0, 42); gx.bezierCurveTo(35, 42, 38, 10, 25, -10); gx.bezierCurveTo(18, -25, 10, -25, 0, -18); gx.bezierCurveTo(-10, -25, -18, -25, -25, -10); gx.bezierCurveTo(-38, 10, -35, 42, 0, 42); gx.fill();
    gx.strokeStyle = bodyColor; gx.lineWidth = 14; gx.lineCap = 'round'; gx.beginPath(); gx.moveTo(-28, 5); gx.lineTo(-38, -10); gx.stroke(); gx.beginPath(); gx.moveTo(28, 5); gx.lineTo(38, -10); gx.stroke();
    gx.fillStyle = '#fff';[[-42, -12], [-38, -16], [-34, -12]].forEach(p => { gx.beginPath(); gx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); gx.fill(); });[[42, -12], [38, -16], [34, -12]].forEach(p => { gx.beginPath(); gx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); gx.fill(); });
    gx.fillStyle = bellyColor; gx.beginPath(); gx.ellipse(-22, 35, 14, 12, -Math.PI / 6, 0, Math.PI * 2); gx.fill(); gx.strokeStyle = bodyColor; gx.lineWidth = 3; gx.stroke(); gx.beginPath(); gx.ellipse(22, 35, 14, 12, Math.PI / 6, 0, Math.PI * 2); gx.fill(); gx.stroke();
    gx.fillStyle = pawColor; gx.beginPath(); gx.ellipse(-22, 35, 6, 5, -Math.PI / 6, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.ellipse(22, 35, 6, 5, Math.PI / 6, 0, Math.PI * 2); gx.fill();
    gx.fillStyle = '#fff';[[-32, 28], [-26, 24], [-18, 25]].forEach(p => { gx.beginPath(); gx.moveTo(p[0], p[1]); gx.lineTo(p[0] + 2, p[1] - 5); gx.lineTo(p[0] + 4, p[1]); gx.fill(); });[[32, 28], [26, 24], [18, 25]].forEach(p => { gx.beginPath(); gx.moveTo(p[0], p[1]); gx.lineTo(p[0] - 2, p[1] - 5); gx.lineTo(p[0] - 4, p[1]); gx.fill(); });
    gx.fillStyle = '#ff8a8a'; gx.beginPath(); gx.ellipse(-16 + ex, -5, 6, 4.5, 0, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.ellipse(16 + ex, -5, 6, 4.5, 0, 0, Math.PI * 2); gx.fill();
    gx.strokeStyle = '#1e293b'; gx.lineWidth = 2.5;
    if (emotion === 'happy') {
        gx.beginPath(); gx.moveTo(-12 + ex, -10); gx.quadraticCurveTo(-8 + ex, -14, -4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -10); gx.quadraticCurveTo(8 + ex, -14, 4 + ex, -10); gx.stroke();
        gx.fillStyle = '#ec4899'; gx.beginPath(); gx.arc(ex, -2, 6, 0, Math.PI); gx.fill();
        gx.fillStyle = '#fff'; gx.beginPath(); gx.moveTo(-4 + ex, -2); gx.lineTo(-2 + ex, 2); gx.lineTo(0 + ex, -2); gx.fill(); gx.beginPath(); gx.moveTo(4 + ex, -2); gx.lineTo(2 + ex, 2); gx.lineTo(0 + ex, -2); gx.fill();
    } else if (emotion === 'sad') {
        gx.beginPath(); gx.moveTo(-12 + ex, -12); gx.lineTo(-4 + ex, -9); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -12); gx.lineTo(4 + ex, -9); gx.stroke();
        gx.fillStyle = '#38bdf8'; gx.beginPath(); gx.arc(15 + ex, -15, 3.5, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.moveTo(15 + ex, -22); gx.lineTo(11.5 + ex, -15); gx.lineTo(18.5 + ex, -15); gx.fill();
        gx.beginPath(); gx.arc(ex, 0, 3, Math.PI, 0); gx.stroke();
    } else {
        gx.beginPath(); gx.moveTo(-12 + ex, -10); gx.lineTo(-4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -10); gx.lineTo(4 + ex, -10); gx.stroke();
        gx.beginPath(); gx.moveTo(-2 + ex, -4); gx.lineTo(2 + ex, -4); gx.stroke();
        gx.fillStyle = '#fff'; gx.beginPath(); gx.moveTo(-2 + ex, -4); gx.lineTo(-1 + ex, -7); gx.lineTo(0 + ex, -4); gx.fill(); gx.beginPath(); gx.moveTo(2 + ex, -4); gx.lineTo(1 + ex, -7); gx.lineTo(0 + ex, -4); gx.fill();
    }
}

// Nền trời: dải gradient dọc, kéo giãn ra toàn màn hình
export function makeSkyGradient() {
    if (textures.has('sky-gradient') || pending?.some((p) => p.key === 'sky-gradient')) return;
    bake('sky-gradient', 4, 512, (ctx: Ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#0a0820'); g.addColorStop(0.35, '#140f33'); g.addColorStop(0.75, '#1d1245'); g.addColorStop(1, '#0a0918');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 512);
    }, 1);
}

// ---------------------------------------------------------------------------
// Kabigon tách bộ phận (dùng cho rig trong themes/01-kabigon/kabigon.ts)
// ---------------------------------------------------------------------------
export const KABI_PARTS = ['earL', 'earR', 'body', 'belly', 'armL', 'armR', 'footL', 'footR', 'face-normal', 'face-happy', 'face-sad'] as const;

function drawKabiPart(gx: Ctx, part: (typeof KABI_PARTS)[number]) {
    const bodyColor = '#445b71', bellyColor = '#fcf3e3', pawColor = '#b08d6a';
    const side = part.endsWith('L') ? -1 : 1;
    if (part === 'earL' || part === 'earR') {
        gx.fillStyle = bodyColor; gx.beginPath(); gx.moveTo(16 * side, -20); gx.lineTo(24 * side, -40); gx.lineTo(4 * side, -30); gx.fill();
    } else if (part === 'body') {
        gx.fillStyle = bodyColor; gx.beginPath(); gx.moveTo(0, -32); gx.bezierCurveTo(25, -32, 42, -10, 45, 15); gx.bezierCurveTo(45, 35, 25, 45, 0, 45); gx.bezierCurveTo(-25, 45, -45, 35, -45, 15); gx.bezierCurveTo(-42, -10, -25, -32, 0, -32); gx.fill();
    } else if (part === 'belly') {
        gx.fillStyle = bellyColor; gx.beginPath(); gx.moveTo(0, 42); gx.bezierCurveTo(35, 42, 38, 10, 25, -10); gx.bezierCurveTo(18, -25, 10, -25, 0, -18); gx.bezierCurveTo(-10, -25, -18, -25, -25, -10); gx.bezierCurveTo(-38, 10, -35, 42, 0, 42); gx.fill();
    } else if (part === 'armL' || part === 'armR') {
        gx.strokeStyle = bodyColor; gx.lineWidth = 14; gx.lineCap = 'round'; gx.beginPath(); gx.moveTo(28 * side, 5); gx.lineTo(38 * side, -10); gx.stroke();
        gx.fillStyle = '#fff';
        [[42, -12], [38, -16], [34, -12]].forEach(([x, y]) => { gx.beginPath(); gx.arc(x * side, y, 2.5, 0, Math.PI * 2); gx.fill(); });
    } else if (part === 'footL' || part === 'footR') {
        gx.fillStyle = bellyColor; gx.beginPath(); gx.ellipse(22 * side, 35, 14, 12, (side * Math.PI) / 6, 0, Math.PI * 2); gx.fill();
        gx.strokeStyle = bodyColor; gx.lineWidth = 3; gx.stroke();
        gx.fillStyle = pawColor; gx.beginPath(); gx.ellipse(22 * side, 35, 6, 5, (side * Math.PI) / 6, 0, Math.PI * 2); gx.fill();
        gx.fillStyle = '#fff';
        [[32, 28], [26, 24], [18, 25]].forEach(([x, y]) => { gx.beginPath(); gx.moveTo(x * side, y); gx.lineTo((x - 2) * side, y - 5); gx.lineTo((x - 4) * side, y); gx.fill(); });
    } else {
        const emotion = part.slice(5);
        const ex = 4;
        gx.fillStyle = '#ff8a8a'; gx.beginPath(); gx.ellipse(-16 + ex, -5, 6, 4.5, 0, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.ellipse(16 + ex, -5, 6, 4.5, 0, 0, Math.PI * 2); gx.fill();
        gx.strokeStyle = '#1e293b'; gx.lineWidth = 2.5; gx.lineCap = 'round';
        if (emotion === 'happy') {
            gx.beginPath(); gx.moveTo(-12 + ex, -10); gx.quadraticCurveTo(-8 + ex, -14, -4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -10); gx.quadraticCurveTo(8 + ex, -14, 4 + ex, -10); gx.stroke();
            gx.fillStyle = '#ec4899'; gx.beginPath(); gx.arc(ex, -2, 6, 0, Math.PI); gx.fill();
            gx.fillStyle = '#fff'; gx.beginPath(); gx.moveTo(-4 + ex, -2); gx.lineTo(-2 + ex, 2); gx.lineTo(0 + ex, -2); gx.fill(); gx.beginPath(); gx.moveTo(4 + ex, -2); gx.lineTo(2 + ex, 2); gx.lineTo(0 + ex, -2); gx.fill();
        } else if (emotion === 'sad') {
            gx.beginPath(); gx.moveTo(-12 + ex, -12); gx.lineTo(-4 + ex, -9); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -12); gx.lineTo(4 + ex, -9); gx.stroke();
            gx.fillStyle = '#38bdf8'; gx.beginPath(); gx.arc(15 + ex, -15, 3.5, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.moveTo(15 + ex, -22); gx.lineTo(11.5 + ex, -15); gx.lineTo(18.5 + ex, -15); gx.fill();
            gx.beginPath(); gx.arc(ex, 0, 3, Math.PI, 0); gx.stroke();
        } else {
            gx.beginPath(); gx.moveTo(-12 + ex, -10); gx.lineTo(-4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -10); gx.lineTo(4 + ex, -10); gx.stroke();
            gx.beginPath(); gx.moveTo(-2 + ex, -4); gx.lineTo(2 + ex, -4); gx.stroke();
            gx.fillStyle = '#fff'; gx.beginPath(); gx.moveTo(-2 + ex, -4); gx.lineTo(-1 + ex, -7); gx.lineTo(0 + ex, -4); gx.fill(); gx.beginPath(); gx.moveTo(2 + ex, -4); gx.lineTo(1 + ex, -7); gx.lineTo(0 + ex, -4); gx.fill();
        }
    }
}
