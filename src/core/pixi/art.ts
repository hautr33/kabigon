import { CanvasSource, Rectangle, Texture } from 'pixi.js';
import { dpr, type Metrics } from '../metrics';

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

    // Dải Ngân Hà: dải sáng mờ nhiều màu + bụi sao li ti (kéo giãn chéo qua bầu trời)
    bake('milky-way', 512, 160, (ctx: Ctx) => {
        const gauss = () => (Math.random() + Math.random() + Math.random() - 1.5) / 1.5;
        const blobs = ['rgba(167, 139, 250, 0.10)', 'rgba(244, 114, 182, 0.07)', 'rgba(125, 211, 252, 0.06)', 'rgba(255, 255, 255, 0.06)'];
        for (let i = 0; i < 140; i++) {
            const x = Math.random() * 512, y = 80 + gauss() * 34, r = 14 + Math.random() * 30;
            const g = ctx.createRadialGradient(x, y, 0, x, y, r);
            g.addColorStop(0, blobs[i % blobs.length]); g.addColorStop(1, 'rgba(0,0,0,0)');
            ctx.fillStyle = g; ctx.fillRect(x - r, y - r, r * 2, r * 2);
        }
        // mờ dần hai đầu dải
        ctx.globalCompositeOperation = 'destination-in';
        const fade = ctx.createLinearGradient(0, 0, 512, 0);
        fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.2, '#000'); fade.addColorStop(0.8, '#000'); fade.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = fade; ctx.fillRect(0, 0, 512, 160);
    }, 1);

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

    // Vợt bắt sao: đám mây bông xốp có mặt ngủ (hợp với Kabigon), viền vàng phát sáng
    bake('net', 150, 120, (ctx: Ctx) => { ctx.translate(75, 55); drawCloudNet(ctx); });

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
// Hai lớp đồi xa (độ cao đáy tính từ mép dưới, biên độ — đơn vị u). Dùng chung cho cảnh vẽ sẵn & cutscene.
export const FAR_HILLS = [
    { base: 168, amp: 34, f1: 0.0022, f2: 0.0071, ph: 1.3 },
    { base: 118, amp: 24, f1: 0.0037, f2: 0.011, ph: 4.1 },
];
export function farHillY(m: Metrics, i: number, x: number) {
    const h = FAR_HILLS[i], u = m.u;
    return m.H - h.base * u + Math.sin((x * h.f1) / u + h.ph) * h.amp * u + Math.sin((x * h.f2) / u + h.ph * 2) * h.amp * u * 0.45;
}

// Điểm sáng nhấp nháy trên cảnh (hoa phát sáng, đèn trên cây) — toạ độ màn hình
export type SceneryLight = { x: number; y: number; tint: number; size: number };

export function bakeScenery(key: string, m: Metrics, margin = 0) {
    const { W, H, u, ground } = m;
    const bandH = Math.ceil(250 * u);
    const top = H - bandH;
    const x0 = -margin, x1 = W + margin;
    const lights: SceneryLight[] = [];
    textures.get(key)?.destroy(true);
    bake(key, W + margin * 2, bandH, (ctx: Ctx) => {
        ctx.translate(margin, -top);

        // 1. Hai lớp đồi xa (nhạt dần theo chiều sâu) + sương mù giữa các lớp
        const farHill = (i: number, c0: string, c1: string, rim: string) => {
            const y = (x: number) => farHillY(m, i, x);
            const base = H - FAR_HILLS[i].base * u, amp = FAR_HILLS[i].amp * u;
            const g = ctx.createLinearGradient(0, base - amp, 0, H);
            g.addColorStop(0, c0); g.addColorStop(1, c1);
            ctx.fillStyle = g; ctx.beginPath(); ctx.moveTo(x0, H);
            for (let x = x0; x <= x1 + 6; x += 6) ctx.lineTo(x, y(x));
            ctx.lineTo(x1, H); ctx.closePath(); ctx.fill();
            ctx.strokeStyle = rim; ctx.lineWidth = 1.5 * u; ctx.beginPath();
            for (let x = x0; x <= x1 + 6; x += 6) { if (x === x0) ctx.moveTo(x, y(x)); else ctx.lineTo(x, y(x)); }
            ctx.stroke();
            return y;
        };
        const mist = (yTop: number, yBot: number, a: number) => {
            const g = ctx.createLinearGradient(0, yTop, 0, yBot);
            g.addColorStop(0, 'rgba(196, 181, 253, 0)'); g.addColorStop(0.55, `rgba(196, 181, 253, ${a})`); g.addColorStop(1, 'rgba(196, 181, 253, 0)');
            ctx.fillStyle = g; ctx.fillRect(x0, yTop, x1 - x0, yBot - yTop);
        };
        farHill(0, '#2a2163', '#1b1444', 'rgba(196, 181, 253, 0.2)');
        mist(H - 170 * u, H - 95 * u, 0.07);
        farHill(1, '#33206c', '#1d1446', 'rgba(216, 204, 255, 0.26)');
        mist(H - 110 * u, H - 40 * u, 0.07);

        // 2. Cây gần: tán có đổ bóng, viền sáng ánh trăng, đèn đom đóm nhỏ
        const palettes: [string, string][] = [['#4c1d95', '#7a52c7'], ['#5b21b6', '#8b6ad8'], ['#4338ca', '#6f78e0'], ['#6d28d9', '#9b74e6']];
        const treeCount = Math.max(6, Math.round((x1 - x0) / (95 * u)));
        for (let i = 0; i < treeCount; i++) {
            const x = x0 + ((x1 - x0) / (treeCount - 1)) * i + (Math.random() - 0.5) * 30 * u;
            const sc = (Math.random() * 0.35 + 0.6) * u;
            const baseY = ground(x) + 5 * u;
            drawTree(ctx, x, baseY, sc, palettes[i % 4], Math.random() > 0.5);
            // 2-3 đèn nhỏ trên tán cây (nhấp nháy bằng sprite)
            const n = 2 + Math.floor(Math.random() * 2);
            for (let k = 0; k < n; k++) {
                const lx = x + (Math.random() - 0.5) * 34 * sc, ly = baseY - (18 + Math.random() * 26) * sc;
                ctx.fillStyle = '#fff7d6'; ctx.beginPath(); ctx.arc(lx, ly, 1.3 * u, 0, Math.PI * 2); ctx.fill();
                lights.push({ x: lx, y: ly, tint: [0xfde68a, 0xf9a8d4, 0xffffff][k % 3], size: 5.5 * u });
            }
        }

        // 3. Đồi gần: gradient + viền ánh trăng phát sáng
        const hill = ctx.createLinearGradient(0, H - 60 * u, 0, H);
        hill.addColorStop(0, '#45197a'); hill.addColorStop(0.5, '#2a1150'); hill.addColorStop(1, '#120c2a');
        ctx.fillStyle = hill; ctx.beginPath(); ctx.moveTo(x0, H);
        for (let x = x0; x <= x1 + 5; x += 5) ctx.lineTo(x, ground(x));
        ctx.lineTo(x1, H); ctx.closePath(); ctx.fill();
        ctx.save();
        ctx.shadowBlur = 10 * u; ctx.shadowColor = 'rgba(196, 181, 253, 0.9)';
        ctx.strokeStyle = 'rgba(221, 214, 254, 0.6)'; ctx.lineWidth = 2 * u; ctx.beginPath();
        for (let x = x0; x <= x1 + 5; x += 5) { if (x === x0) ctx.moveTo(x, ground(x)); else ctx.lineTo(x, ground(x)); }
        ctx.stroke();
        ctx.restore();

        // 4. Hoa & cỏ — một phần hoa phát sáng
        const flowerColors = ['#fbcfe8', '#fecdd3', '#e9d5ff', '#c4b5fd', '#fde68a'];
        const glowTints = [0xf9a8d4, 0xfda4af, 0xd8b4fe, 0xc4b5fd, 0xfde68a];
        const decoCount = Math.round((50 * (x1 - x0)) / (500 * u));
        for (let i = 0; i < decoCount; i++) {
            const x = x0 + Math.random() * (x1 - x0);
            const y = ground(x) + (5 + Math.random() * 25) * u;
            const sc = (Math.random() * 0.4 + 0.6) * u;
            ctx.save(); ctx.translate(x, y); ctx.scale(sc, sc);
            if (Math.random() > 0.55) {
                const c = Math.floor(Math.random() * flowerColors.length);
                const glow = Math.random() < 0.35;
                ctx.strokeStyle = '#5eead4'; ctx.globalAlpha = 0.85; ctx.lineWidth = 2; ctx.lineCap = 'round';
                ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(1.5, -4, 0, -8); ctx.stroke();
                ctx.globalAlpha = 1;
                ctx.translate(0, -8);
                if (glow) { ctx.shadowBlur = 8; ctx.shadowColor = flowerColors[c]; }
                ctx.fillStyle = flowerColors[c];
                for (let p = 0; p < 5; p++) { ctx.rotate((Math.PI * 2) / 5); ctx.beginPath(); ctx.ellipse(0, -3.5, 2.5, 4.5, 0, 0, Math.PI * 2); ctx.fill(); }
                ctx.shadowBlur = 0;
                ctx.fillStyle = '#fef08a'; ctx.beginPath(); ctx.arc(0, 0, 2.3, 0, Math.PI * 2); ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.8)'; ctx.beginPath(); ctx.arc(-0.8, -0.8, 0.8, 0, Math.PI * 2); ctx.fill();
                if (glow) lights.push({ x, y: y - 8 * sc, tint: glowTints[c], size: 16 * sc });
            } else {
                ctx.fillStyle = Math.random() > 0.5 ? '#3b1873' : '#4c1d95'; ctx.beginPath();
                ctx.arc(0, 0, 4, Math.PI, 0); ctx.arc(-5, 2, 3, Math.PI, 0); ctx.arc(5, 2, 3, Math.PI, 0); ctx.fill();
            }
            ctx.restore();
        }
    }, dpr());
    return { texture: tex(key), top, lights };
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

// Cây tán tròn: đổ bóng từ sáng (trên trái) → tối, viền sáng ánh trăng, thân cong nhẹ
function drawTree(ctx: Ctx, x: number, baseY: number, scale: number, [dark, light]: [string, string], flip: boolean) {
    ctx.save(); ctx.translate(x, baseY); ctx.scale(scale * (flip ? -1 : 1), scale);
    ctx.fillStyle = '#25104f'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-3, -15, -2, -25); ctx.lineTo(2, -25); ctx.quadraticCurveTo(3, -15, 4, 0); ctx.fill();
    const canopy = () => {
        ctx.beginPath();
        for (const [cx, cy, r] of [[0, -35, 18], [-14, -25, 14], [14, -25, 14], [-8, -15, 10], [8, -15, 10]]) { ctx.moveTo(cx + r, cy); ctx.arc(cx, cy, r, 0, Math.PI * 2); }
    };
    const g = ctx.createRadialGradient(-8, -44, 0, -2, -30, 30);
    g.addColorStop(0, light); g.addColorStop(0.45, dark); g.addColorStop(1, '#24114f');
    canopy(); ctx.fillStyle = g; ctx.fill();
    // viền sáng phía trên (ánh trăng)
    ctx.save(); canopy(); ctx.clip();
    ctx.strokeStyle = 'rgba(233, 213, 255, 0.35)'; ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, -35, 17, Math.PI * 1.1, Math.PI * 1.75); ctx.stroke();
    ctx.beginPath(); ctx.arc(-14, -25, 13, Math.PI * 1.05, Math.PI * 1.5); ctx.stroke();
    ctx.restore();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'; ctx.beginPath(); ctx.arc(-6, -40, 3.5, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
}

// Kabigon — giữ nguyên nét vẽ gốc
// Kabigon nguyên con (dùng ở home / màn chọn màn) — ghép từ đúng các bộ phận của rig, cùng thứ tự lớp
function drawKabi(gx: Ctx, emotion: string) {
    for (const part of ['earL', 'earR', 'body', 'belly', `face-${emotion}`, 'footL', 'footR', 'armL', 'armR'] as const) {
        gx.save();
        drawKabiPart(gx, part as (typeof KABI_PARTS)[number]);
        gx.restore();
    }
}

// Nền trời: dải gradient dọc, kéo giãn ra toàn màn hình
export function makeSkyGradient() {
    if (textures.has('sky-gradient') || pending?.some((p) => p.key === 'sky-gradient')) return;
    bake('sky-gradient', 4, 512, (ctx: Ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        // xanh đêm sâu → tím → ánh hồng tím ở chân trời
        g.addColorStop(0, '#05041a'); g.addColorStop(0.32, '#0d0a2b'); g.addColorStop(0.62, '#1a0f40'); g.addColorStop(0.82, '#28134c'); g.addColorStop(1, '#120a2a');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 512);
    }, 1);
}

// ---------------------------------------------------------------------------
// Kabigon tách bộ phận (dùng cho rig trong themes/01-kabigon/kabigon.ts)
// ---------------------------------------------------------------------------
export const KABI_PARTS = ['earL', 'earR', 'body', 'belly', 'armL', 'armR', 'footL', 'footR', 'face-normal', 'face-happy', 'face-sad'] as const;

// Bảng màu chibi: thân xanh xám ấm có đổ bóng, bụng kem, viền mảnh như sticker
const KB = {
    body: '#5b7894', bodyLight: '#86a3bf', bodyDark: '#3e5670',
    line: '#2b3a50', cream: '#fff7e8', creamDark: '#f0dcbc',
    pink: '#ff9fb6', blush: 'rgba(255, 128, 160, 0.55)', ink: '#2b2440',
};

// Tam giác bo tròn góc (tai)
function roundTri(gx: Ctx, pts: [number, number][]) {
    const mid = (a: [number, number], b: [number, number]) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2] as const;
    const [a, b, c] = pts;
    const m0 = mid(a, b);
    gx.beginPath();
    gx.moveTo(m0[0], m0[1]);
    gx.quadraticCurveTo(b[0], b[1], ...mid(b, c));
    gx.quadraticCurveTo(c[0], c[1], ...mid(c, a));
    gx.quadraticCurveTo(a[0], a[1], m0[0], m0[1]);
    gx.closePath();
}

function outline(gx: Ctx, w = 2.4) {
    gx.lineWidth = w; gx.strokeStyle = KB.line; gx.lineJoin = 'round'; gx.lineCap = 'round'; gx.stroke();
}

function bodyPath(gx: Ctx) {
    gx.beginPath(); gx.moveTo(0, -34);
    gx.bezierCurveTo(27, -34, 44, -12, 45, 14); gx.bezierCurveTo(46, 36, 26, 46, 0, 46);
    gx.bezierCurveTo(-26, 46, -46, 36, -45, 14); gx.bezierCurveTo(-44, -12, -27, -34, 0, -34);
    gx.closePath();
}

function drawKabiPart(gx: Ctx, part: (typeof KABI_PARTS)[number]) {
    const side = part.endsWith('L') ? -1 : 1;
    const ex = 4; // mặt hơi lệch sang phải (hướng nhìn)
    if (part === 'earL' || part === 'earR') {
        roundTri(gx, [[17 * side, -20], [24 * side, -43], [4 * side, -31]]);
        gx.fillStyle = KB.body; gx.fill(); outline(gx);
        roundTri(gx, [[15 * side, -25], [21 * side, -38], [9 * side, -31]]);
        gx.fillStyle = KB.pink; gx.globalAlpha = 0.75; gx.fill();
    } else if (part === 'body') {
        bodyPath(gx);
        const g = gx.createRadialGradient(-14, -22, 4, -4, 4, 62);
        g.addColorStop(0, KB.bodyLight); g.addColorStop(0.45, KB.body); g.addColorStop(1, KB.bodyDark);
        gx.fillStyle = g; gx.fill(); outline(gx);
        // bóng sáng trên đỉnh đầu
        gx.fillStyle = 'rgba(255, 255, 255, 0.28)';
        gx.beginPath(); gx.ellipse(-17, -22, 8, 4, -0.55, 0, Math.PI * 2); gx.fill();
        gx.beginPath(); gx.arc(-8, -28, 1.8, 0, Math.PI * 2); gx.fill();
    } else if (part === 'belly') {
        gx.beginPath(); gx.moveTo(0, 43);
        gx.bezierCurveTo(33, 43, 38, 12, 27, -8); gx.bezierCurveTo(21, -22, 10, -24, 0, -17);
        gx.bezierCurveTo(-10, -24, -21, -22, -27, -8); gx.bezierCurveTo(-38, 12, -33, 43, 0, 43);
        gx.closePath();
        const g = gx.createLinearGradient(0, -20, 0, 43);
        g.addColorStop(0, KB.cream); g.addColorStop(0.7, KB.cream); g.addColorStop(1, KB.creamDark);
        gx.fillStyle = g; gx.fill();
        gx.lineWidth = 1.4; gx.strokeStyle = 'rgba(43, 58, 80, 0.22)'; gx.stroke();
    } else if (part === 'armL' || part === 'armR') {
        gx.lineCap = 'round';
        gx.strokeStyle = KB.line; gx.lineWidth = 19.5;
        gx.beginPath(); gx.moveTo(28 * side, 5); gx.lineTo(38 * side, -10); gx.stroke();
        gx.strokeStyle = KB.body; gx.lineWidth = 15;
        gx.beginPath(); gx.moveTo(28 * side, 5); gx.lineTo(38 * side, -10); gx.stroke();
        gx.strokeStyle = 'rgba(255, 255, 255, 0.22)'; gx.lineWidth = 4;
        gx.beginPath(); gx.moveTo(30 * side, -1); gx.lineTo(36 * side, -10); gx.stroke();
        // móng tay tròn nhỏ
        for (const [x, y] of [[43, -12], [39, -17], [34.5, -16]]) {
            gx.beginPath(); gx.arc(x * side, y, 2.3, 0, Math.PI * 2);
            gx.fillStyle = '#fff'; gx.fill(); gx.lineWidth = 1; gx.strokeStyle = KB.line; gx.stroke();
        }
    } else if (part === 'footL' || part === 'footR') {
        gx.translate(22 * side, 35); gx.rotate((side * Math.PI) / 7);
        gx.beginPath(); gx.ellipse(0, 0, 13, 11.5, 0, 0, Math.PI * 2);
        gx.fillStyle = KB.cream; gx.fill(); outline(gx);
        // đệm thịt hồng: 1 đệm lớn + 3 ngón
        gx.fillStyle = KB.pink;
        gx.beginPath(); gx.ellipse(0, 2.6, 5.2, 4.2, 0, 0, Math.PI * 2); gx.fill();
        for (const [x, y] of [[-6.2, -4.2], [0, -6.6], [6.2, -4.2]]) { gx.beginPath(); gx.arc(x, y, 2.3, 0, Math.PI * 2); gx.fill(); }
        gx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        gx.beginPath(); gx.arc(-1.6, 1.2, 1.2, 0, Math.PI * 2); gx.fill();
    } else {
        const emotion = part.slice(5);
        // má hồng + chấm sáng
        for (const cx of [-15, 15]) {
            const g = gx.createRadialGradient(cx + ex, -3, 0, cx + ex, -3, 7);
            g.addColorStop(0, 'rgba(255, 128, 160, 0.75)'); g.addColorStop(1, 'rgba(255, 128, 160, 0)');
            gx.fillStyle = g; gx.beginPath(); gx.ellipse(cx + ex, -3, 7.5, 5, 0, 0, Math.PI * 2); gx.fill();
            gx.fillStyle = 'rgba(255, 255, 255, 0.85)'; gx.beginPath(); gx.arc(cx + ex - 2.2, -4.6, 1.1, 0, Math.PI * 2); gx.fill();
        }
        gx.strokeStyle = KB.ink; gx.lineWidth = 2.4; gx.lineCap = 'round'; gx.lineJoin = 'round';
        const arc = (x0: number, y0: number, cy: number, x1: number, y1: number) => { gx.beginPath(); gx.moveTo(x0 + ex, y0); gx.quadraticCurveTo((x0 + x1) / 2 + ex, cy, x1 + ex, y1); gx.stroke(); };
        if (emotion === 'happy') {
            arc(-13, -8, -14, -5, -8); arc(5, -8, -14, 13, -8); // mắt ^ ^
            gx.beginPath(); gx.moveTo(-4.5 + ex, -3); gx.quadraticCurveTo(ex, 6, 4.5 + ex, -3); gx.closePath();
            gx.fillStyle = '#e8577f'; gx.fill(); gx.lineWidth = 1.6; gx.stroke();
            gx.fillStyle = KB.pink; gx.beginPath(); gx.ellipse(ex, 1.2, 2.6, 1.5, 0, 0, Math.PI * 2); gx.fill();
        } else if (emotion === 'sad') {
            gx.lineWidth = 1.8; arc(-13, -12, -12, -6, -14.5); arc(6, -14.5, -12, 13, -12); // lông mày lo lắng
            gx.lineWidth = 2.4; arc(-13, -8, -5, -5, -8); arc(5, -8, -5, 13, -8);
            arc(-3, -0.5, -3.5, 3, -0.5); // miệng mếu
            gx.fillStyle = '#7dd3fc';
            gx.beginPath(); gx.moveTo(13 + ex, -6); gx.quadraticCurveTo(10 + ex, -1, 13 + ex, 0.5); gx.quadraticCurveTo(16 + ex, -1, 13 + ex, -6); gx.fill();
        } else {
            arc(-13, -10, -6.5, -5, -10); arc(5, -10, -6.5, 13, -10); // mắt nhắm ngủ ︶ ︶
            gx.lineWidth = 1.8; // miệng mèo + 2 răng nanh nhỏ
            gx.beginPath(); gx.moveTo(-3.4 + ex, -3); gx.quadraticCurveTo(-1.7 + ex, -0.6, ex, -2.6); gx.quadraticCurveTo(1.7 + ex, -0.6, 3.4 + ex, -3); gx.stroke();
            gx.fillStyle = '#fff';
            for (const x of [-2.2, 1.2]) { gx.beginPath(); gx.moveTo(x + ex, -2.4); gx.lineTo(x + 0.5 + ex, -4.6); gx.lineTo(x + 1 + ex, -2.4); gx.fill(); }
        }
    }
}

// Đám mây bắt sao (tâm 0,0; rộng ~±50, cao ~±32)
function drawCloudNet(ctx: Ctx) {
    const puffs: [number, number, number][] = [[-33, 9, 14], [-18, -5, 18], [3, -13, 21], [24, -4, 17], [36, 9, 12], [0, 7, 21], [-20, 13, 13], [20, 13, 13]];
    const cloud = (grow: number) => {
        ctx.beginPath();
        for (const [x, y, r] of puffs) { ctx.moveTo(x + r + grow, y); ctx.arc(x, y, r + grow, 0, Math.PI * 2); }
    };
    // viền vàng phát sáng
    ctx.save();
    ctx.shadowBlur = 18; ctx.shadowColor = 'rgba(253, 224, 140, 1)';
    cloud(2.6); ctx.fillStyle = '#fde68a'; ctx.fill();
    ctx.restore();
    // thân mây: trắng → tím nhạt
    cloud(0);
    const g = ctx.createLinearGradient(0, -34, 0, 28);
    g.addColorStop(0, '#ffffff'); g.addColorStop(0.55, '#fbf5ff'); g.addColorStop(1, '#e2d3ff');
    ctx.fillStyle = g; ctx.fill();
    // bóng tím dưới đáy (cắt theo hình mây)
    ctx.save(); cloud(0); ctx.clip();
    ctx.fillStyle = 'rgba(196, 181, 253, 0.45)';
    ctx.beginPath(); ctx.ellipse(0, 30, 54, 13, 0, 0, Math.PI * 2); ctx.fill();
    ctx.restore();
    // bóng sáng
    ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
    ctx.beginPath(); ctx.ellipse(-17, -13, 7, 3.4, -0.45, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(-6, -22, 2, 0, Math.PI * 2); ctx.fill();
    // mặt ngủ + má hồng
    ctx.strokeStyle = '#7c6aa8'; ctx.lineWidth = 2; ctx.lineCap = 'round';
    for (const x of [-9, 9]) { ctx.beginPath(); ctx.moveTo(x - 3.6, 3); ctx.quadraticCurveTo(x, 6.2, x + 3.6, 3); ctx.stroke(); }
    ctx.beginPath(); ctx.moveTo(-2, 9); ctx.quadraticCurveTo(0, 11, 2, 9); ctx.stroke();
    ctx.fillStyle = 'rgba(255, 150, 185, 0.7)';
    for (const x of [-17, 17]) { ctx.beginPath(); ctx.ellipse(x, 8, 4.4, 2.8, 0, 0, Math.PI * 2); ctx.fill(); }
    // vài ngôi sao 4 cánh lấp lánh bám quanh mây
    const twinkle = (x: number, y: number, r: number, c: string) => {
        ctx.fillStyle = c; ctx.beginPath(); ctx.moveTo(x, y - r);
        ctx.quadraticCurveTo(x + r * 0.18, y - r * 0.18, x + r, y); ctx.quadraticCurveTo(x + r * 0.18, y + r * 0.18, x, y + r);
        ctx.quadraticCurveTo(x - r * 0.18, y + r * 0.18, x - r, y); ctx.quadraticCurveTo(x - r * 0.18, y - r * 0.18, x, y - r); ctx.fill();
    };
    ctx.save(); ctx.shadowBlur = 6; ctx.shadowColor = '#fff';
    twinkle(30, -24, 6, '#fcd34d'); twinkle(-40, -10, 4, '#f9a8d4'); twinkle(44, -6, 3, '#c4b5fd');
    ctx.restore();
}
