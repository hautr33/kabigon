import { AdvancedBloomFilter, GodrayFilter } from 'pixi-filters';
import { Container, Graphics, Rectangle, Sprite, Text } from 'pixi.js';
import type { Metrics } from '../../core/metrics';
import { tex } from '../../core/pixi/art';
import { Comet } from '../../core/pixi/comet';
import type { Emitter } from '../../core/pixi/particles';
import type { NightSky } from '../../core/pixi/sky';

// Mỗi cutscene có 2 lớp: `back` (nằm ngay sau bầu trời, trước nhân vật) và `front` (trên cùng).
// update(dtMs) chạy mỗi khung hình; this.t = số giây kể từ khi thắng.
// Các giá trị "mỗi khung hình" của bản gốc nhân với f = dt/16.67 để chạy đúng tốc độ trên mọi màn hình.

export type CutsceneCtx = {
    m: () => Metrics;
    sky: NightSky;
    sfx: (name: 'wind' | 'woosh') => void;
    onDialog?: () => void; // tới lúc hiện khung thoại
    onText?: () => void; // tới lúc hiện chữ trên màn hình
    from: { x: number; y: number }; // vị trí vợt của Kabigon lúc thắng
    dust: Emitter; // bụi lấp lánh dùng chung cho sao băng
};

// Phát sáng nhẹ (pixi-filters) cho các lớp hiệu ứng
const bloom = () => new AdvancedBloomFilter({ threshold: 0.35, bloomScale: 0.9, brightness: 1, blur: 5, quality: 5 });

const hslTint = (h: number, s: number, l: number) => {
    // HSL → 0xRRGGBB
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
};

abstract class Cutscene {
    readonly back = new Container();
    readonly front = new Container();
    protected t = 0;
    private fired = new Set<string>();

    constructor(protected c: CutsceneCtx) {}

    protected get m() { return this.c.m(); }

    protected once(key: string, at: number, fn: () => void) {
        if (this.t > at && !this.fired.has(key)) { this.fired.add(key); fn(); }
    }

    protected sprite(key: string, parent: Container, add = true) {
        const s = new Sprite(tex(key));
        s.anchor.set(0.5);
        if (add) s.blendMode = 'add';
        parent.addChild(s);
        return s;
    }

    // Kabigon có ở lại xem cutscene không (mặc định mờ dần đi)
    readonly keepKabigon: boolean = false;

    update(dtMs: number) {
        this.t += dtMs / 1000;
        this.step(dtMs / 16.667);
        const { W, H } = this.m;
        // filterArea cố định = màn hình → bộ lọc không phải tính lại vùng mỗi khung
        if (this.back.filters) this.back.filterArea = new Rectangle(0, 0, W, H);
        if (this.front.filters) this.front.filterArea = new Rectangle(0, 0, W, H);
    }

    protected abstract step(f: number): void;

    destroy() {
        this.back.destroy({ children: true });
        this.front.destroy({ children: true });
    }
}

// ---------------------------------------------------------------------------
// Mốc 12: trời tối dần, trăng mọc, đèn lồng bay lên, đàn chim bay ngang
// ---------------------------------------------------------------------------
export class LanternCutscene extends Cutscene {
    private dark = new Graphics();
    private halo: Sprite;
    private moon: Sprite;
    private lanterns: { s: Sprite; x: number; y: number; size: number; vy: number; offset: number; alpha: number }[] = [];
    private birds: { s: Sprite; x: number; y: number; speed: number; phase: number; scale: number }[] = [];
    private rays: GodrayFilter;

    constructor(c: CutsceneCtx) {
        super(c);
        const { W, H, u } = this.m;
        this.dark.rect(0, 0, 1, 1).fill(0x000000);
        this.dark.alpha = 0;
        this.back.addChild(this.dark);
        this.halo = this.sprite('soft-glow', this.back);
        this.halo.tint = 0xc8dcff;
        this.halo.alpha = 0;
        this.moon = this.sprite('moon', this.back, false);
        this.moon.alpha = 0;
        this.moon.scale.set(u);
        // Tia sáng trăng (GodrayFilter) + phát sáng cho đèn lồng
        this.rays = new GodrayFilter({ parallel: false, center: { x: W / 2, y: H }, gain: 0.32, lacunarity: 2.8, alpha: 0, time: 0 });
        this.back.filters = [this.rays];
        this.front.filters = [bloom()];

        const count = Math.min(260, Math.round(150 * Math.max(1, W / (500 * u))));
        for (let i = 0; i < count; i++) {
            const size = Math.random() > 0.8 ? Math.random() * 4 + 6 : Math.random() * 3 + 2;
            const s = this.sprite('lantern', this.front, false);
            s.scale.set((size / 10) * u);
            s.alpha = 0;
            this.lanterns.push({ s, x: Math.random() * W, y: H + Math.random() * H * 1.5 + 50 * u, size, vy: -(Math.random() * 0.8 + 0.5) * (size / 4), offset: Math.random() * Math.PI * 2, alpha: 0 });
        }
        this.lanterns.sort((a, b) => a.size - b.size).forEach((l) => this.front.addChild(l.s)); // đèn to (gần) ở trên

        for (let i = 0; i < 8; i++) {
            const s = this.sprite('bird-0', this.front, false);
            const scale = Math.random() * 0.4 + 0.4;
            s.scale.set(scale * u);
            s.alpha = 0;
            this.birds.push({ s, scale, x: (-50 - Math.random() * 150) * u, y: H * 0.45 - Math.random() * 80 * u + i * 15 * u, speed: Math.random() * 0.8 + 0.6, phase: Math.random() * Math.PI * 2 });
        }
    }

    protected step(f: number) {
        const { W, H, u } = this.m;
        const t = this.t;
        const darkness = Math.min(0.85, t * 0.25);
        this.dark.scale.set(W, H);
        this.dark.alpha = darkness;
        this.c.sky.setDarkness(darkness);

        // Trăng mọc
        const r = 110 * u;
        const startY = H + r * 2, endY = H * 0.45;
        const p = Math.min(1, t / 4);
        const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        const moonY = startY - (startY - endY) * ease;
        const moonA = Math.min(1, t * 0.4);
        const pulse = Math.sin(t * 1.5) * 0.1;
        this.moon.position.set(W / 2, moonY);
        this.moon.alpha = moonA;
        this.halo.position.set(W / 2, moonY);
        this.halo.alpha = moonA * 0.55;
        this.halo.scale.set((r * (3.5 + pulse) * 2) / 256);
        this.rays.center = { x: W / 2, y: moonY };
        this.rays.time = t * 0.25;
        this.rays.alpha = Math.min(0.28, Math.max(0, (t - 1) * 0.12));

        this.once('wind', 1.5, () => this.c.sfx('wind'));

        // Đèn lồng
        for (const l of this.lanterns) {
            if (t > 1.5) { l.y += l.vy * u * f; if (l.alpha < 1) l.alpha = Math.min(1, l.alpha + 0.01 * f); }
            if (l.y < -50 * u) { l.y = H + 50 * u; l.x = Math.random() * W; }
            l.s.position.set(l.x + Math.sin(t * 2 + l.offset) * 15 * (l.size / 6) * u, l.y);
            l.s.alpha = l.alpha;
        }

        // Chim
        if (t > 2.5) {
            for (const b of this.birds) {
                b.x += b.speed * u * f; b.y -= b.speed * 0.15 * u * f; b.phase += 0.08 * f;
                b.s.texture = tex(`bird-${Math.floor(((b.phase / (Math.PI * 2)) % 1) * 8)}`);
                b.s.position.set(b.x, b.y);
                b.s.alpha = Math.max(0, 1 - Math.abs(b.x - W / 2) / (W * 0.8));
            }
        }

        this.once('dialog', 5.5, () => this.c.onDialog?.());
    }

    destroy() {
        super.destroy();
        this.c.sky.setDarkness(0);
    }
}

// ---------------------------------------------------------------------------
// Mốc 24: 96 điểm sáng bay về tạo thành trái tim 3D đập thình thịch + hoa đào rơi
// ---------------------------------------------------------------------------
export class HeartCutscene extends Cutscene {
    private points: { sx: number; sy: number; bx: number; by: number; isMain: boolean; dots: Sprite[] }[] = [];
    private glow: Sprite;
    private lines = new Graphics();
    private shockwaves: { scale: number; alpha: number }[] = [];
    private lastBeat = 0;
    private petals: { s: Sprite; x: number; y: number; z: number; vx: number; vy: number; size: number; angle: number; spin: number; flipSpeed: number; flipOffset: number; opacity: number; fadeIn: boolean }[] = [];

    constructor(c: CutsceneCtx) {
        super(c);
        const { W, H, u } = this.m;
        const k = 8.5 * u;
        this.glow = this.sprite('soft-glow', this.front);
        this.glow.tint = 0xff69b4;
        this.glow.alpha = 0;
        this.lines.blendMode = 'add';
        this.front.addChild(this.lines);
        this.front.filters = [bloom()];
        for (let i = 0; i < 96; i++) {
            const a = (i * Math.PI * 2) / 96;
            const hx = 16 * Math.pow(Math.sin(a), 3);
            const hy = -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a));
            const hue = 330 + Math.random() * 20;
            const isMain = i % 4 === 0;
            const dots = [0, 1].map(() => {
                const s = this.sprite('glow-dot', this.front);
                s.tint = hslTint(hue, 1, isMain ? 0.85 : 0.75);
                s.alpha = 0;
                return s;
            });
            this.points.push({ sx: W / 2 + (Math.random() - 0.5) * W * 1.5, sy: H * 0.42 + (Math.random() - 0.5) * H * 1.5, bx: hx * k, by: hy * k, isMain, dots });
        }
        const count = Math.min(220, Math.round((85 * (W * H)) / (500 * 800)));
        for (let i = 0; i < count; i++) {
            const s = this.sprite('petal', this.front, false);
            s.alpha = 0;
            const p = { s, x: Math.random() * W, y: Math.random() * H * 0.7, opacity: Math.random(), fadeIn: true, z: 0, vx: 0, vy: 0, size: 0, angle: Math.random() * Math.PI * 2, spin: 0, flipSpeed: 0, flipOffset: 0 };
            this.resetPetal(p, false);
            this.petals.push(p);
        }
    }

    private resetPetal(p: HeartCutscene['petals'][number], respawn = true) {
        const { W, H } = this.m;
        if (respawn) { p.y = Math.random() * H * 0.6; p.x = Math.random() * W; p.opacity = 0; p.fadeIn = true; }
        p.z = Math.random() * 1.5 + 0.5;
        p.vx = (Math.random() - 0.5) * 0.5;
        p.vy = Math.random() * 0.2 + 0.15;
        p.size = Math.random() * 3 + 2.5;
        p.spin = (Math.random() - 0.5) * 0.8;
        p.flipSpeed = (Math.random() - 0.5) * 1.2;
        p.flipOffset = Math.random() * Math.PI * 2;
    }

    protected step(f: number) {
        const { W, H, u } = this.m;
        const t = this.t;
        const cx = W / 2, cy = H * 0.42;
        this.once('wind', 0.5, () => this.c.sfx('wind'));
        this.once('text', 4, () => this.c.onText?.());

        const formProg = Math.min(1, Math.max(0, (t - 0.5) / 2.5));
        const easeForm = 1 - Math.pow(1 - formProg, 3);
        let beat = 0;
        if (formProg >= 1) {
            const cyc = ((t - 3) * 1.2) % 1;
            beat = Math.max(Math.exp(-40 * Math.pow(cyc - 0.1, 2)), Math.exp(-50 * Math.pow(cyc - 0.4, 2)) * 0.6);
        }
        const layerPos = (l: number, pt: HeartCutscene['points'][number]) => {
            const z = l / 3;
            if (formProg < 1) return { x: pt.sx + (cx + pt.bx - pt.sx) * easeForm, y: pt.sy + (cy + pt.by - pt.sy) * easeForm, dyn: 1 };
            const dyn = 1 - z * 0.25 + 0.35 * beat * (1 - z);
            return { x: cx + pt.bx * dyn + Math.sin(t * 1.5) * 20 * z * u, y: cy + pt.by * dyn + Math.cos(t * 2) * 10 * z * u, dyn };
        };

        // Lưới đường nối (4 lớp chiều sâu khi đã thành hình)
        const g = this.lines.clear();
        const layers = formProg >= 1 ? 4 : 1;
        for (let l = layers - 1; l >= 0; l--) {
            const z = l / 3;
            const alpha = formProg < 1 ? easeForm : 1 - z * 0.7;
            const pts: number[] = [];
            this.points.forEach((pt) => { const p = layerPos(l, pt); pts.push(p.x, p.y); });
            g.poly(pts, true).stroke({ width: (1.5 + (1 - z)) * u, color: 0xff69b4, alpha: alpha * 0.4 });
        }

        // Chấm sáng (2 lớp ngoài)
        this.points.forEach((pt, idx) => {
            const tw = 0.5 + 0.5 * Math.sin(t * 10 + idx);
            pt.dots.forEach((dot, l) => {
                if (l > 0 && formProg < 1) { dot.alpha = 0; return; }
                const z = l / 3;
                const { x, y, dyn } = layerPos(l, pt);
                const alpha = formProg < 1 ? easeForm : 1 - z * 0.7;
                const r = ((pt.isMain ? 3.5 : 1.2) + tw * 1.5) * dyn * (1 - z) * u;
                dot.position.set(x, y);
                dot.scale.set((r * (pt.isMain ? 3.2 : 2.4)) / 32);
                dot.alpha = pt.isMain ? alpha : alpha * 0.6;
            });
        });

        // Sóng lan ra theo nhịp tim + quầng sáng
        if (formProg >= 1) {
            if (beat > 0.8 && t - this.lastBeat > 0.2) { this.shockwaves.push({ scale: 1, alpha: 0.7 }); this.lastBeat = t; }
            for (let i = this.shockwaves.length - 1; i >= 0; i--) {
                const sw = this.shockwaves[i];
                sw.scale += 0.05 * f; sw.alpha -= 0.03 * f;
                if (sw.alpha <= 0) { this.shockwaves.splice(i, 1); continue; }
                const pts: number[] = [];
                this.points.forEach((pt) => pts.push(cx + pt.bx * sw.scale, cy + pt.by * sw.scale));
                g.poly(pts, true).stroke({ width: u, color: 0xffb6c1, alpha: sw.alpha * 0.4 });
            }
            const gs = 1 + beat * 0.3;
            this.glow.position.set(cx, cy);
            this.glow.scale.set((180 * gs * 2 * u) / 256);
            this.glow.alpha = Math.min(1, (0.15 + 0.15 * beat) * 2.2);
        }

        // Hoa đào
        if (t > 1) {
            const petalAlpha = Math.min(1, t - 1);
            for (const p of this.petals) {
                p.x += (p.vx + Math.sin(t * 0.8 + p.y * 0.02) * 0.3 + Math.cos(t * 0.5 + p.x * 0.01) * 0.2) * p.z * u * f;
                p.y += p.vy * p.z * u * f;
                p.angle += p.spin * 0.02 * f;
                if (p.fadeIn) { p.opacity += 0.01 * f; if (p.opacity >= 1) p.fadeIn = false; } else if (p.y > H * 0.75) p.opacity -= 0.008 * f;
                if (p.opacity <= 0 || p.y > H + 10) this.resetPetal(p);
                const flip = Math.sin(t * p.flipSpeed + p.flipOffset);
                const sc = p.z * 0.8 * (p.size / 8) * u;
                p.s.position.set(p.x, p.y);
                p.s.rotation = p.angle;
                p.s.scale.set(sc, sc * flip);
                p.s.tint = flip > 0 ? 0xfbcfe8 : 0xf472b6;
                p.s.alpha = Math.max(0, p.opacity * petalAlpha * 0.85);
            }
        }
    }
}

// ---------------------------------------------------------------------------
// Mốc 36: "Chòm sao mang tên tụi mình"
// 36 ngôi sao bay vút lên từ vợt của Kabigon, xếp thành một cái tên trên bầu trời,
// các đường chòm sao lần lượt nối lại, rồi một trận mưa sao băng quét qua.
// ---------------------------------------------------------------------------
type FlyStar = { comet: Comet; sx: number; sy: number; cx: number; cy: number; tx: number; ty: number; delay: number; dur: number; px: number; py: number; phase: number };

export class NameConstellationCutscene extends Cutscene {
    readonly keepKabigon = true;
    private stars: FlyStar[] = [];
    private edges: [number, number][] = [];
    private lines = new Graphics();
    private aura: Sprite;
    private fill: { s: Sprite; delay: number; phase: number; size: number }[] = [];
    private word: Text;
    private landAt = 0;
    private nextMeteor = 0;

    constructor(c: CutsceneCtx, word: string) {
        super(c);
        const { W, H, u } = this.m;
        const pts = sampleWord(word, 36, 150);
        // Đặt chữ vào giữa bầu trời
        const targetW = Math.min(W * 0.56, 880 * u);
        const scale = targetW / pts.w;
        const ox = W / 2 - targetW / 2, oy = H * 0.34 - (pts.h * scale) / 2;
        const targets = pts.points.map((p) => ({ x: ox + p.x * scale, y: oy + p.y * scale }));
        this.edges = constellationEdges(targets);

        this.aura = this.sprite('soft-glow', this.front);
        this.aura.tint = 0xfde68a;
        this.aura.alpha = 0;
        this.aura.position.set(W / 2, H * 0.34);
        this.aura.scale.set((targetW * 1.5) / 256, (targetW * 0.9) / 256);
        // Dòng chữ phát sáng nhạt phía sau các ngôi sao (giống hình vẽ chòm sao trên bản đồ thiên văn)
        this.word = new Text({
            text: word,
            style: {
                fontFamily: 'Quicksand', fontWeight: '700', fontSize: pts.fontSize * scale, fill: 0xfff1c1,
                dropShadow: { color: 0xfbbf24, blur: 18 * u, distance: 0, alpha: 0.9 },
            },
        });
        this.word.anchor.set(0, 0.5);
        this.word.position.set(ox + pts.textX * scale, oy + pts.textY * scale);
        this.word.alpha = 0;
        this.front.addChild(this.word);

        // Hạt sáng nhỏ chạy dọc nét chữ để đọc rõ cái tên (hiện dần sau khi sao chính đáp xuống)
        this.fill = pts.fill.map((p) => {
            const s = this.sprite('glow-dot', this.front);
            s.position.set(ox + p.x * scale, oy + p.y * scale);
            s.tint = [0xfff3c4, 0xe9d5ff, 0xffffff][Math.floor(Math.random() * 3)];
            s.alpha = 0;
            return { s, delay: (p.x * scale) / targetW, phase: Math.random() * Math.PI * 2, size: (0.13 + Math.random() * 0.09) * u };
        });
        this.lines.blendMode = 'add';
        this.front.addChild(this.lines);
        this.front.filters = [bloom()];

        // Bay lần lượt từ trái sang phải (giữ nguyên chỉ số để khớp với các đường nối)
        const rank = new Map(targets.map((p, i) => ({ p, i })).sort((a, b) => a.p.x - b.p.x).map(({ i }, k) => [i, k]));
        targets.forEach((p, i) => {
            const k = rank.get(i)!;
            const sx = c.from.x + (Math.random() - 0.5) * 30 * u, sy = c.from.y;
            const comet = new Comet(sx, sy, 4.2 + Math.random() * 1.6, u, c.dust)
                .setColors([0xfde68a, 0xc4b5fd, 0xf9a8d4][k % 3], 0xffffff);
            this.front.addChild(comet.view);
            this.stars.push({
                comet, sx, sy, tx: p.x, ty: p.y,
                cx: (sx + p.x) / 2 + (Math.random() - 0.5) * W * 0.3, cy: Math.min(sy, p.y) - (120 + Math.random() * 160) * u,
                delay: 0.25 + k * 0.07, dur: 1.5 + Math.random() * 0.6, px: sx, py: sy, phase: Math.random() * Math.PI * 2,
            });
        });
        this.landAt = Math.max(...this.stars.map((s) => s.delay + s.dur));
    }

    protected step(f: number) {
        const { u } = this.m;
        const t = this.t;
        const dt = f * 16.667;
        this.once('woosh', 0.2, () => this.c.sfx('woosh'));

        for (const s of this.stars) {
            const p = Math.min(1, Math.max(0, (t - s.delay) / s.dur));
            const e = p < 0.5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; // easeInOutCubic
            const x = (1 - e) * (1 - e) * s.sx + 2 * (1 - e) * e * s.cx + e * e * s.tx;
            const y = (1 - e) * (1 - e) * s.sy + 2 * (1 - e) * e * s.cy + e * e * s.ty;
            const vx = (x - s.px) / Math.max(0.01, f), vy = (y - s.py) / Math.max(0.01, f);
            s.px = x; s.py = y;
            const v = Math.hypot(vx, vy);
            const landed = p >= 1;
            const twinkle = landed ? 1 + 0.22 * Math.sin(t * 3 + s.phase) : 1;
            s.comet.update(x, y, landed ? 1 : vx, landed ? 0 : vy, dt, {
                alpha: p > 0 ? 1 : 0,
                tailScale: Math.min(1, v / (3 * u)),
                headScale: twinkle,
            });
            if (landed) s.comet.stopDust();
        }

        // Nối các đường chòm sao lần lượt
        const drawStart = this.landAt + 0.2, drawDur = 1.8;
        if (t > drawStart) {
            const prog = Math.min(1, (t - drawStart) / drawDur) * this.edges.length;
            const g = this.lines.clear();
            this.edges.forEach(([a, b], i) => {
                const k = Math.min(1, Math.max(0, prog - i));
                if (k <= 0) return;
                const A = this.stars[a], B = this.stars[b];
                g.moveTo(A.tx, A.ty).lineTo(A.tx + (B.tx - A.tx) * k, A.ty + (B.ty - A.ty) * k);
            });
            g.stroke({ width: 1.6 * u, color: 0xfde68a, alpha: 0.75 });
            this.aura.alpha = Math.min(0.35, (t - drawStart) * 0.2);
            this.word.alpha = Math.min(0.24, Math.max(0, (t - drawStart - 0.6) * 0.15));
        }
        // Hạt sáng dọc nét chữ hiện dần từ trái sang phải, rồi lấp lánh
        for (const d of this.fill) {
            const k = Math.min(1, Math.max(0, (t - drawStart - d.delay * drawDur) / 0.6));
            d.s.alpha = k * (0.55 + 0.35 * Math.sin(t * 2.4 + d.phase));
            d.s.scale.set(d.size * (0.8 + 0.2 * k));
        }

        // Mưa sao băng
        const showerStart = this.landAt + 1.2;
        if (t > showerStart && t < showerStart + 6 && t > this.nextMeteor) {
            this.c.sky.shootingStar();
            this.nextMeteor = t + 0.16 + Math.random() * 0.2;
        }
        this.once('wind', showerStart, () => this.c.sfx('wind'));
        this.once('text', drawStart + 1, () => this.c.onText?.());
        this.once('dialog', showerStart + 3.5, () => this.c.onDialog?.());
    }

    destroy() {
        this.stars.forEach((s) => s.comet.destroy());
        super.destroy();
    }
}

// Lấy n điểm trải đều trên nét chữ (vẽ chữ ra canvas rồi chọn điểm xa nhau nhất)
function sampleWord(word: string, n: number, extra = 0) {
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { willReadFrequently: true })!;
    const font = '700 220px Quicksand, sans-serif';
    ctx.font = font;
    const w = Math.ceil(ctx.measureText(word).width) + 40, h = 300;
    canvas.width = w; canvas.height = h;
    ctx.font = font;
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    ctx.fillText(word, 20, h / 2 + 10);
    const data = ctx.getImageData(0, 0, w, h).data;
    const cand: { x: number; y: number }[] = [];
    for (let y = 0; y < h; y += 5) for (let x = 0; x < w; x += 5) if (data[(y * w + x) * 4 + 3] > 140) cand.push({ x, y });
    if (!cand.length) return { points: [{ x: w / 2, y: h / 2 }], fill: [], w, h, textX: 20, textY: h / 2, fontSize: 220 };
    // farthest point sampling
    const chosen = [cand.reduce((a, b) => (b.x < a.x ? b : a))];
    const dist = cand.map((p) => Math.hypot(p.x - chosen[0].x, p.y - chosen[0].y));
    while (chosen.length < n + extra && chosen.length < cand.length) {
        let bi = 0;
        for (let i = 1; i < cand.length; i++) if (dist[i] > dist[bi]) bi = i;
        const c = cand[bi];
        chosen.push(c);
        for (let i = 0; i < cand.length; i++) dist[i] = Math.min(dist[i], Math.hypot(cand[i].x - c.x, cand[i].y - c.y));
    }
    const minX = Math.min(...chosen.map((p) => p.x)), maxX = Math.max(...chosen.map((p) => p.x));
    const minY = Math.min(...chosen.map((p) => p.y)), maxY = Math.max(...chosen.map((p) => p.y));
    const norm = (p: { x: number; y: number }) => ({ x: p.x - minX, y: p.y - minY });
    return { points: chosen.slice(0, n).map(norm), fill: chosen.slice(n).map(norm), w: Math.max(1, maxX - minX), h: Math.max(1, maxY - minY), textX: 20 - minX, textY: h / 2 + 10 - minY, fontSize: 220 };
}

// Các đường chòm sao: cây khung nhỏ nhất, bỏ các đoạn quá dài (nối giữa các chữ), xếp từ trái sang phải
function constellationEdges(p: { x: number; y: number }[]): [number, number][] {
    const n = p.length;
    const inTree = new Array(n).fill(false);
    const best = new Array(n).fill(Infinity);
    const parent = new Array(n).fill(-1);
    best[0] = 0;
    const edges: [number, number, number][] = [];
    for (let k = 0; k < n; k++) {
        let v = -1;
        for (let i = 0; i < n; i++) if (!inTree[i] && (v < 0 || best[i] < best[v])) v = i;
        inTree[v] = true;
        if (parent[v] >= 0) edges.push([parent[v], v, best[v]]);
        for (let i = 0; i < n; i++) {
            const d = Math.hypot(p[i].x - p[v].x, p[i].y - p[v].y);
            if (!inTree[i] && d < best[i]) { best[i] = d; parent[i] = v; }
        }
    }
    const sorted = edges.map((e) => e[2]).sort((a, b) => a - b);
    const limit = sorted[Math.floor(sorted.length / 2)] * 2.2;
    return edges.filter((e) => e[2] <= limit)
        .sort((a, b) => (p[a[0]].x + p[a[1]].x) - (p[b[0]].x + p[b[1]].x))
        .map(([a, b]) => [a, b]);
}
