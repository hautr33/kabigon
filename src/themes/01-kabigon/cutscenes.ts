import { AdvancedBloomFilter, GodrayFilter } from 'pixi-filters';
import { BlurFilter, Container, Graphics, Rectangle, Sprite } from 'pixi.js';
import type { Metrics } from '../../core/metrics';
import { bake, farHillY, tex } from '../../core/pixi/art';
import { Emitter } from '../../core/pixi/particles';
import { scriptStrokes } from './script';
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
    pointer?: () => { x: number; y: number } | null; // vị trí chuột (null nếu chưa di chuột)
};

// Phát sáng nhẹ (pixi-filters) cho các lớp hiệu ứng
const bloom = () => new AdvancedBloomFilter({ threshold: 0.35, bloomScale: 0.9, brightness: 1, blur: 5, quality: 5 });

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

// Vị trí trăng sau khi mọc (màn 1) — dùng chung cho cutscene và khung thoại nằm ngay dưới trăng
export function lanternMoon(m: Metrics) {
    const r = 110 * m.u * 0.85;
    return { r, y: Math.max(r + 30 * m.u, m.H * 0.19) };
}

// ---------------------------------------------------------------------------
// Mốc 12: trời tối dần, trăng mọc, đèn lồng bay lên, đàn chim bay ngang
// ---------------------------------------------------------------------------
export class LanternCutscene extends Cutscene {
    private dark = new Graphics();
    private halo: Sprite;
    private haloWide: Sprite; // quầng sáng rộng, rất mờ — ánh trăng dịu lan ra bầu trời
    private moon: Sprite;
    private moonSparkles: Emitter; // sao lấp lánh toả ra quanh trăng
    private lanterns: { s: Sprite; x: number; y: number; size: number; vy: number; offset: number; alpha: number }[] = [];
    // Đàn chim bay theo đội hình chữ V, cắt ngang qua mặt trăng
    private birds: { s: Sprite; dx: number; dy: number; phase: number; flap: number }[] = [];
    private moonY = 0;
    private rays: GodrayFilter;

    constructor(c: CutsceneCtx) {
        super(c);
        const { W, H, u } = this.m;
        // Màn đêm xanh thẫm (không phải đen) — trời tối đi nhưng sao vẫn còn
        this.dark.rect(0, 0, 1, 1).fill(0x060418);
        this.dark.alpha = 0;
        this.back.addChild(this.dark);
        this.haloWide = this.sprite('soft-glow', this.back);
        this.haloWide.tint = 0x9fb4ff;
        this.haloWide.alpha = 0;
        this.halo = this.sprite('soft-glow', this.back);
        this.halo.tint = 0xe6ecff;
        this.halo.alpha = 0;
        this.moon = this.sprite('moon', this.back, false);
        this.moon.alpha = 0;
        this.moon.scale.set(u * 0.85);
        this.moon.tint = 0xe9ecfb; // trắng ngà dịu, không chói
        this.moonSparkles = new Emitter(tex('spark'), {
            life: [1400, 2600], speed: [6 * u, 22 * u], scale: [0.26 * u, 0.6 * u], scaleEnd: 0.5, curve: 'pulse', spin: [-60, 60],
            tint: [0xffffff, 0xe0e7ff, 0xc7d2fe, 0xfde68a, 0xf5d0fe],
        });
        this.back.addChild(this.moonSparkles.view);
        // Tia sáng trăng (GodrayFilter) — nhẹ, dịu + phát sáng cho đèn lồng
        this.rays = new GodrayFilter({ parallel: false, center: { x: W / 2, y: H }, gain: 0.22, lacunarity: 2.6, alpha: 0, time: 0 });
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

        // Đội hình chữ V: con đầu đàn ở giữa, hai cánh xoè ra phía sau
        for (let k = -3; k <= 3; k++) {
            const s = this.sprite('bird-0', this.back, false);
            s.scale.set((0.42 + Math.random() * 0.12) * u);
            s.alpha = 0;
            this.birds.push({ s, dx: -Math.abs(k) * 30 * u + (Math.random() - 0.5) * 6 * u, dy: k * 15 * u, phase: Math.random() * Math.PI * 2, flap: 0.07 + Math.random() * 0.03 });
        }
    }

    protected step(f: number) {
        const { W, H, u } = this.m;
        const t = this.t;
        // Trời tối dần nhưng chỉ tới một nửa — sao & đom đóm vẫn còn lấp lánh
        const darkness = Math.min(0.5, t * 0.18);
        this.dark.scale.set(W, H);
        this.dark.alpha = darkness;
        this.c.sky.setDarkness(darkness * 0.7);

        // Trăng mọc lên cao (gần mép trên), khung thoại nằm ngay bên dưới
        const { r, y: endY } = lanternMoon(this.m);
        const startY = H + r * 2;
        const p = Math.min(1, t / 4);
        const ease = p === 1 ? 1 : 1 - Math.pow(2, -10 * p);
        const moonY = startY - (startY - endY) * ease;
        const moonA = Math.min(1, t * 0.4);
        const pulse = Math.sin(t * 1.5) * 0.1;
        this.moonY = moonY;
        this.moon.position.set(W / 2, moonY);
        this.moon.alpha = moonA * 0.96;
        // Ánh trăng dịu: quầng gần mềm + quầng xa rất mờ, phập phồng chậm
        this.halo.position.set(W / 2, moonY);
        this.halo.alpha = moonA * (0.32 + pulse * 0.4);
        this.halo.scale.set((r * (3 + pulse) * 2) / 256);
        this.haloWide.position.set(W / 2, moonY);
        this.haloWide.alpha = moonA * 0.16;
        this.haloWide.scale.set((r * 9 * 2) / 256);
        this.rays.center = { x: W / 2, y: moonY };
        this.rays.time = t * 0.2;
        this.rays.alpha = Math.min(0.14, Math.max(0, (t - 1) * 0.06));

        // Sao lấp lánh toả ra từ vành trăng
        if (moonA > 0.3 && Math.random() < 0.7 * f) {
            const a = Math.random() * Math.PI * 2, d = r * (1.05 + Math.random() * 0.9);
            this.moonSparkles.emit(W / 2 + Math.cos(a) * d, moonY + Math.sin(a) * d, 1);
        }
        this.moonSparkles.update(f * 16.667);

        this.once('wind', 1.5, () => this.c.sfx('wind'));

        // Đèn lồng
        for (const l of this.lanterns) {
            if (t > 1.5) { l.y += l.vy * u * f; if (l.alpha < 1) l.alpha = Math.min(1, l.alpha + 0.01 * f); }
            if (l.y < -50 * u) { l.y = H + 50 * u; l.x = Math.random() * W; }
            l.s.position.set(l.x + Math.sin(t * 2 + l.offset) * 15 * (l.size / 6) * u, l.y);
            l.s.alpha = l.alpha;
        }

        // Đàn chim: bay ngang qua giữa đĩa trăng, mỗi 13 giây lại có một đàn bay qua
        const flyT = t - 3.2;
        if (flyT > 0) {
            const period = 13, dur = 7;
            const k = flyT % period;
            const start = -160 * u, end = W + 220 * u;
            const head = { x: start + ((end - start) * k) / dur, y: this.moonY + 18 * u - (k - dur / 2) * 9 * u };
            for (const b of this.birds) {
                b.phase += b.flap * f;
                b.s.texture = tex(`bird-${Math.floor(((b.phase / (Math.PI * 2)) % 1) * 8)}`);
                b.s.position.set(head.x + b.dx, head.y + b.dy + Math.sin(b.phase * 0.5) * 2 * u);
                b.s.alpha = k < dur ? Math.min(1, k * 1.5, (dur - k) * 1.5) : 0;
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
// Bố cục màn 2: trái tim ở giữa (hơi cao), chữ hiện ngay bên dưới — dùng chung cho cutscene & phần chữ (React)
export function heartLayout(m: Metrics) {
    const k = 8.5 * m.u;
    const cy = Math.max(15 * k, m.H * 0.38);
    return { cx: m.W / 2, cy, k, textY: Math.min(m.H - 110 * m.u, cy + 17 * k * 1.08 + 40 * m.u) };
}

// Toạ độ trên đường trái tim (đơn vị k): a = 0..2π
const heartXY = (a: number) => ({
    x: 16 * Math.pow(Math.sin(a), 3),
    y: -(13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a)),
});

const PETAL_PINKS = [0xf472b6, 0xf9a8d4, 0xfbcfe8, 0xffe4f1];

// Nhân sáng/tối một màu 0xRRGGBB (k < 1 tối đi, k > 1 sáng lên)
const shade = (c: number, k: number) => {
    const ch = (v: number) => Math.max(0, Math.min(255, Math.round(v * k)));
    return (ch((c >> 16) & 255) << 16) | (ch((c >> 8) & 255) << 8) | ch(c & 255);
};

// Mỗi cánh của trái tim trôi vòng quanh theo một "đường tim" riêng (tỉ lệ s0 so với viền):
//   frac: vị trí trên đường (0..1, chạy theo thời gian với tốc độ speed), s0 ≈ 1 là viền, nhỏ hơn là vào trong
//   z: độ sâu (đơn vị k) — viền mỏng (z≈0), ruột phồng ra trước/sau như chiếc gối → trái tim 3D
//   ox, oy: lệch khỏi chỗ do con trỏ chuột thổi dạt (tự lượn về)
type HeartPetal = { s: Sprite; sx: number; sy: number; frac: number; speed: number; s0: number; sAmp: number; bend: number; delay: number; rot: number; wob: number; flipSpeed: number; size: number; z: number; ox: number; oy: number; tint: number };
type BurstPetal = { s: Sprite; x: number; y: number; vx: number; vy: number; spin: number; life: number; age: number; size: number };
type FreePetal = { s: Sprite; sharp?: boolean; x: number; y: number; z: number; vx: number; vy: number; ix: number; iy: number; size: number; angle: number; spin: number; flipSpeed: number; flipOffset: number; opacity: number; fadeIn: boolean };

// ---------------------------------------------------------------------------
// Mốc 24: hoa đào đang bay xoáy lại, kết thành một trái tim bằng cánh hoa.
// Tim "thở" nhẹ nhàng; mỗi nhịp đập, vài cánh hoa ở viền bắn tung ra xung quanh.
// ---------------------------------------------------------------------------
export class HeartCutscene extends Cutscene {
    private heart: HeartPetal[] = [];
    private bursts: BurstPetal[] = [];
    private pool: Sprite[] = [];
    private petals: FreePetal[] = [];
    private heartLayer = new Container();
    private lastBeat = -1;
    private path: { x: number; y: number }[] = []; // đường viền tim, chia đều theo chiều dài (đơn vị k)
    // Hiệu ứng "lấy nét": khi tim kết xong, mọi thứ xung quanh lùi ra sau
    private bgPetals = new Container(); // hoa đào bay tự do ngoài vùng lấy nét — nhoè dần (xoá phông)
    private sharpPetals = new Container(); // hoa đào bay gần trái tim — vẫn sắc nét
    private bgBlur = new BlurFilter({ strength: 0, quality: 3 });
    private glints: Emitter; // lấp lánh trên viền tim
    private glintGlow: Emitter;
    private rotY = 0; // góc xoay 3D (trái/phải) & nghiêng (lên/xuống)
    private rotX = 0;
    private dim = new Graphics(); // hạ sáng bầu trời & đồi
    private aura: Sprite; // quầng hồng mềm sau tim, phập phồng theo nhịp
    private auraWide: Sprite;

    constructor(c: CutsceneCtx) {
        super(c);
        const { W, H, u } = this.m;
        const { k } = heartLayout(this.m);

        this.dim.rect(0, 0, 1, 1).fill(0x0a0620);
        this.dim.alpha = 0;
        this.back.addChild(this.dim);
        this.front.addChild(this.bgPetals, this.sharpPetals);
        this.bgPetals.filters = [this.bgBlur];
        this.auraWide = this.sprite('soft-glow', this.front);
        this.auraWide.tint = 0xc084fc; this.auraWide.alpha = 0;
        this.aura = this.sprite('soft-glow', this.front);
        this.aura.tint = 0xff8ec4; this.aura.alpha = 0;

        // Hoa đào bay tự do khắp màn hình (phía sau trái tim)
        const count = Math.min(200, Math.round((80 * (W * H)) / (500 * 800)));
        for (let i = 0; i < count; i++) {
            const s = this.sprite('petal', this.bgPetals, false);
            s.alpha = 0;
            const p: FreePetal = { s, x: Math.random() * W, y: Math.random() * H * 0.7, opacity: Math.random(), fadeIn: true, z: 0, vx: 0, vy: 0, ix: 0, iy: 0, size: 0, angle: Math.random() * Math.PI * 2, spin: 0, flipSpeed: 0, flipOffset: 0 };
            this.resetPetal(p, false);
            this.petals.push(p);
        }
        this.front.addChild(this.heartLayer);
        this.heartLayer.sortableChildren = true; // vẽ theo độ sâu: cánh phía trước đè cánh phía sau
        this.glintGlow = new Emitter(tex('glow-dot'), { life: [450, 800], scale: [0.14 * u, 0.24 * u], scaleEnd: 1.2, curve: 'pulse', tint: [0xffffff, 0xffd1e8] });
        this.glints = new Emitter(tex('spark'), { life: [450, 800], scale: [0.4 * u, 0.75 * u], scaleEnd: 0.4, curve: 'pulse', spin: [90, 200], tint: [0xffffff, 0xffe4f1, 0xfde68a] });
        this.front.addChild(this.glintGlow.view, this.glints.view);

        // Đường viền tim chia đều theo chiều dài → cánh trôi đều, không dồn cục ở chỗ lõm / mũi nhọn
        const raw: { x: number; y: number; len: number }[] = [];
        let acc = 0;
        for (let i = 0; i <= 1440; i++) {
            const pt = heartXY((i / 1440) * Math.PI * 2);
            if (i > 0) acc += Math.hypot(pt.x - raw[i - 1].x, pt.y - raw[i - 1].y);
            raw.push({ ...pt, len: acc });
        }
        const N = 512;
        for (let i = 0, j = 1; i < N; i++) {
            const d = (i / N) * acc;
            while (j < raw.length - 1 && raw[j].len < d) j++;
            const a0 = raw[j - 1], a1 = raw[j], r = (d - a0.len) / Math.max(1e-6, a1.len - a0.len);
            this.path.push({ x: a0.x + (a1.x - a0.x) * r, y: a0.y + (a1.y - a0.y) * r });
        }

        // Cánh hoa: dày ở viền, thưa dần vào giữa (s0 lệch mạnh về phía 1)
        const n = Math.round(300 * Math.min(1.2, u));
        for (let i = 0; i < n; i++) {
            const edge = Math.random() < 0.68;
            const s0 = edge ? 0.9 + Math.random() * 0.12 : 0.22 + 0.68 * Math.pow(Math.random(), 0.4);
            const frac = Math.random();
            const s = this.sprite('petal', this.heartLayer, false);
            s.alpha = 0;
            const tint = s0 > 0.85 ? PETAL_PINKS[Math.floor(Math.random() * 2)] : PETAL_PINKS[1 + Math.floor(Math.random() * 3)];
            // độ sâu: viền mỏng, càng vào trong càng phồng ra trước / sau
            const bulge = 5.5 * Math.sqrt(Math.max(0, 1 - Math.pow(s0 / 0.98, 2)));
            const z = (Math.random() < 0.5 ? -1 : 1) * bulge + (Math.random() - 0.5) * 1.2;
            this.heart.push({
                s, s0, frac, z, tint, ox: 0, oy: 0,
                // đa số trôi cùng chiều, ~1/4 trôi ngược cho sống động; cánh bên trong trôi nhanh hơn
                speed: (Math.random() < 0.75 ? 1 : -1) * (0.008 + Math.random() * 0.018) * (edge ? 1 : 1.6),
                sAmp: edge ? 0.025 : 0.06 + Math.random() * 0.06,
                sx: Math.random() * W, sy: Math.random() * H * 0.85,
                bend: (Math.random() < 0.5 ? -1 : 1) * (60 + Math.random() * 120) * u,
                delay: 0.4 + frac * 1.5 + Math.random() * 0.4, // kết tim theo vòng xoáy
                rot: Math.random() * Math.PI * 2, wob: Math.random() * Math.PI * 2,
                flipSpeed: 0.8 + Math.random() * 1.4, size: (edge ? 1 : 0.82) * (0.95 + Math.random() * 0.45),
            });
        }
        // cánh ngoài viền nằm trên cùng
        this.heart.sort((p, q) => p.s0 - q.s0).forEach((p) => this.heartLayer.addChild(p.s));
    }

    private onPath(frac: number) {
        const N = this.path.length;
        const f = (((frac % 1) + 1) % 1) * N;
        const i = Math.floor(f), r = f - i;
        const a = this.path[i % N], b = this.path[(i + 1) % N];
        return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
    }

    private resetPetal(p: FreePetal, respawn = true) {
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

    // Bắn một cánh hoa từ (x, y) văng ra xa tâm tim
    private burst(x: number, y: number, cx: number, cy: number) {
        const { u } = this.m;
        const s = this.pool.pop() ?? this.sprite('petal', this.front, false);
        s.visible = true;
        s.tint = PETAL_PINKS[Math.floor(Math.random() * 3)];
        const sp = (1 + Math.random() * 1.4) * u;
        const a = Math.atan2(y - cy, x - cx) + (Math.random() - 0.5) * 0.7;
        this.bursts.push({ s, x, y, vx: Math.cos(a) * sp, vy: Math.sin(a) * sp - 0.6 * u, spin: (Math.random() - 0.5) * 0.25, life: 1.6 + Math.random() * 1.2, age: 0, size: 0.9 + Math.random() * 0.6 });
    }

    protected step(f: number) {
        const { W, H, u } = this.m;
        const t = this.t;
        const { cx, cy, k } = heartLayout(this.m);
        const dt = (f * 16.667) / 1000;
        this.once('wind', 0.5, () => this.c.sfx('wind'));
        this.once('text', 4, () => this.c.onText?.());

        // Nhịp tim nhẹ nhàng (~54 nhịp/phút), chỉ phồng 3-4%
        let beat = 0;
        const beatStart = 3.8;
        if (t > beatStart) {
            const cyc = ((t - beatStart) * 0.9) % 1;
            beat = Math.exp(-22 * Math.pow(cyc - 0.12, 2)) + 0.4 * Math.exp(-26 * Math.pow(cyc - 0.36, 2));
            const n = Math.floor((t - beatStart) * 0.9);
            if (cyc > 0.12 && n !== this.lastBeat) {
                this.lastBeat = n;
                // bắn hoa từ viền tim
                const outer = this.heart.filter((p) => p.s0 > 0.88);
                for (let i = 0; i < 5; i++) {
                    const p = outer[Math.floor(Math.random() * outer.length)];
                    this.burst(p.s.x, p.s.y, cx, cy);
                }
                // đẩy nhẹ hoa đào đang bay quanh đó
                for (const p of this.petals) {
                    const dx = p.x - cx, dy = p.y - cy, d = Math.hypot(dx, dy) || 1;
                    const reach = 320 * u;
                    if (d < reach) { const push = 0.8 * (1 - d / reach); p.ix += (dx / d) * push; p.iy += (dy / d) * push; }
                }
            }
        }
        const breath = 1 + 0.016 * beat;

        // Xoay 3D: tự nghiêng qua lại chậm rãi + nghiêng theo hướng chuột
        const ptr = this.c.pointer?.() ?? null;
        const clamp1 = (v: number) => Math.max(-1, Math.min(1, v));
        const tY = (ptr ? clamp1((ptr.x - cx) / (W / 2)) * 0.25 : 0) + Math.sin(t * 0.45) * 0.15;
        const tX = (ptr ? clamp1((ptr.y - cy) / (H / 2)) * -0.14 : 0) + Math.sin(t * 0.33) * 0.04;
        const ease3d = 1 - Math.pow(0.08, dt);
        this.rotY += (tY - this.rotY) * ease3d;
        this.rotX += (tX - this.rotX) * ease3d;
        const cY = Math.cos(this.rotY), sY = Math.sin(this.rotY), cX = Math.cos(this.rotX), sX = Math.sin(this.rotX);
        const F = 34 * k; // tiêu cự phối cảnh
        const pivotY = 2.5 * k; // xoay quanh tâm thật của hình tim
        const repelR = 90 * u;
        const back = Math.pow(0.004, dt);

        // Cánh hoa kết thành tim (bay theo đường cong), rồi khẽ rung như hoa thật
        for (const p of this.heart) {
            const prog = Math.min(1, Math.max(0, (t - p.delay) / 1.7));
            const e = prog < 0.5 ? 4 * prog * prog * prog : 1 - Math.pow(-2 * prog + 2, 3) / 2;
            // trôi dọc "đường tim" riêng + nhích vào/ra nhẹ → hoa lượn loanh quanh trong tim
            const sNow = Math.min(1.02, p.s0 + Math.sin(t * 0.7 + p.wob) * p.sAmp) * breath;
            const pt = this.onPath(p.frac + t * p.speed);
            // toạ độ 3D → xoay quanh trục Y rồi X → chiếu phối cảnh
            const lx = pt.x * k * sNow, ly = pt.y * k * sNow - pivotY, lz = p.z * k * sNow;
            const x1 = lx * cY + lz * sY, z1 = -lx * sY + lz * cY;
            const y2 = ly * cX - z1 * sX, z2 = ly * sX + z1 * cX;
            const persp = F / (F - z2);
            const tx = cx + x1 * persp, ty = cy + pivotY + y2 * persp;
            // đường cong bậc 2: điểm điều khiển lệch vuông góc → bay lượn vòng vào chỗ
            const mx = (p.sx + tx) / 2, my = (p.sy + ty) / 2;
            const len = Math.hypot(tx - p.sx, ty - p.sy) || 1;
            const qx = mx + (-(ty - p.sy) / len) * p.bend, qy = my + ((tx - p.sx) / len) * p.bend;
            const inv = 1 - e;
            let x = inv * inv * p.sx + 2 * inv * e * qx + e * e * tx;
            let y = inv * inv * p.sy + 2 * inv * e * qy + e * e * ty;
            x += Math.sin(t * 1.3 + p.wob) * 2 * u * e;
            y += Math.cos(t * 1.1 + p.wob) * 1.6 * u * e;
            // con trỏ thổi dạt cánh hoa ra, rời đi thì lượn về chỗ
            let tox = 0, toy = 0;
            if (ptr && e > 0.9) {
                const dx = x - ptr.x, dy = y - ptr.y, d = Math.hypot(dx, dy) || 1;
                if (d < repelR) { const push = Math.pow(1 - d / repelR, 2) * 42 * u; tox = (dx / d) * push; toy = (dy / d) * push; }
            }
            p.ox = tox + (p.ox - tox) * back; p.oy = toy + (p.oy - toy) * back;
            x += p.ox; y += p.oy;
            const flip = 0.55 + 0.45 * Math.abs(Math.sin(t * p.flipSpeed + p.wob));
            const depth = e * persp + (1 - e); // trước khi kết tim thì chưa có phối cảnh
            const sc = (p.size * u * 0.62) * (1 + (1 - e) * 0.3) * depth;
            p.s.zIndex = z2;
            p.s.tint = shade(p.tint, e < 1 ? 1 : 0.72 + 0.4 * Math.max(0, Math.min(1, (z2 / (6 * k) + 1) / 2)));
            p.s.position.set(x, y);
            p.s.rotation = p.rot + t * (0.6 * (1 - e) + 0.25 * Math.sign(p.speed)) + Math.sin(t * 0.9 + p.wob) * 0.3;
            p.s.scale.set(sc, sc * flip);
            p.s.alpha = Math.min(1, prog * 3);
        }

        // Lấp lánh: vài cánh hoa ở viền (phía trước) lóe sáng như phản chiếu ánh trăng
        if (t > beatStart && Math.random() < 3 * dt) {
            const p = this.heart[Math.floor(Math.random() * this.heart.length)];
            if (p.s0 > 0.85 && p.s.zIndex > -2 * k) { this.glintGlow.emit(p.s.x, p.s.y, 1); this.glints.emit(p.s.x, p.s.y, 1); }
        }
        this.glints.update(dt * 1000);
        this.glintGlow.update(dt * 1000);

        // Cánh hoa bị bắn ra: bay xa, chậm dần, rơi nhẹ, xoay và mờ đi
        for (let i = this.bursts.length - 1; i >= 0; i--) {
            const b = this.bursts[i];
            b.age += dt;
            if (b.age >= b.life) { b.s.visible = false; this.pool.push(b.s); this.bursts.splice(i, 1); continue; }
            const drag = Math.pow(0.975, f);
            b.vx *= drag; b.vy = b.vy * drag + 0.025 * u * f;
            b.x += b.vx * f; b.y += b.vy * f;
            const life = b.age / b.life;
            const flip = Math.sin(b.age * 6 + b.size * 10);
            const sc = b.size * u * 0.6;
            b.s.position.set(b.x, b.y);
            b.s.rotation += b.spin * f;
            b.s.scale.set(sc, sc * flip);
            b.s.alpha = Math.min(1, b.age * 6) * (1 - life * life);
        }

        // Lấy nét vào trái tim: nền tối đi, hoa xung quanh nhoè & mờ; quầng hồng mềm sau tim
        const focus = Math.min(1, Math.max(0, (t - 2.6) / 1.8));
        const fe = focus * focus * (3 - 2 * focus);
        this.dim.scale.set(W, H);
        this.dim.alpha = 0.32 * fe;
        this.c.sky.setDarkness(0.3 * fe);
        this.bgBlur.strength = 3.6 * u * fe;
        this.bgPetals.alpha = 1 - 0.38 * fe;
        const focusR = 17 * k * 1.9; // vùng lấy nét quanh trái tim
        const r = 17 * k;
        this.aura.position.set(cx, cy + 1.5 * k);
        this.aura.scale.set((r * 2.6 * (1 + 0.05 * beat)) / 128);
        this.aura.alpha = fe * (0.2 + 0.07 * beat);
        this.auraWide.position.set(cx, cy + 1.5 * k);
        this.auraWide.scale.set((r * 5) / 128);
        this.auraWide.alpha = fe * 0.12;

        // Hoa đào bay tự do
        if (t > 1) {
            const petalAlpha = Math.min(1, t - 1);
            for (const p of this.petals) {
                p.x += (p.vx + Math.sin(t * 0.8 + p.y * 0.02) * 0.3 + Math.cos(t * 0.5 + p.x * 0.01) * 0.2) * p.z * u * f;
                p.y += p.vy * p.z * u * f;
                p.x += p.ix * u * f; p.y += p.iy * u * f;
                const damp = Math.pow(0.94, f); p.ix *= damp; p.iy *= damp;
                p.angle += p.spin * 0.02 * f;
                if (p.fadeIn) { p.opacity += 0.01 * f; if (p.opacity >= 1) p.fadeIn = false; } else if (p.y > H * 0.75) p.opacity -= 0.008 * f;
                if (p.opacity <= 0 || p.y > H + 10 || p.x < -40 || p.x > W + 40) this.resetPetal(p);
                const flip = Math.sin(t * p.flipSpeed + p.flipOffset);
                const sc = p.z * 0.8 * (p.size / 8) * u;
                p.s.position.set(p.x, p.y);
                p.s.rotation = p.angle;
                p.s.scale.set(sc, sc * flip);
                p.s.tint = flip > 0 ? 0xfbcfe8 : 0xf472b6;
                p.s.alpha = Math.max(0, p.opacity * petalAlpha * 0.75);
                // trong vùng lấy nét thì sắc nét, ngoài thì nhoè
                const sharp = fe > 0 && Math.hypot(p.x - cx, p.y - (cy + 1.5 * k)) < focusR;
                if (sharp !== !!p.sharp) { p.sharp = sharp; (sharp ? this.sharpPetals : this.bgPetals).addChild(p.s); }
            }
        }
    }

    destroy() {
        super.destroy();
        this.c.sky.setDarkness(0);
    }
}

// ---------------------------------------------------------------------------
// Mốc 36: "Chòm sao mang tên tụi mình" — Hậu ♥ Trăm
//  1. Đám mây trên đầu Kabigon bay lượn một vòng cong lên cao khuất khỏi màn hình, vòng lại hạ xuống
//     bên trái chữ "H", lướt nhẹ qua tới chữ "m" (để lại vệt sao rơi lấp lánh), rồi lượn cong về đầu Kabigon.
//     Toàn bộ là MỘT đường cong liền (Catmull-Rom hướng tâm), tốc độ thay đổi mượt → không đổi hướng đột ngột.
//  3. Viết xong: làn sóng ánh sáng lan từ Kabigon ra hai bên — đồi đổi sang tím hồng ấm, viền đồi sáng vàng,
//     hàng trăm bông hoa hé nụ rồi bung cánh; trời sáng lại, bụi sáng & cánh hoa bay lên,
//     đèn lồng trái tim lơ lửng bay lên ở khoảng giữa Kabigon và chữ.
//     Lướt qua vị trí nào thì bắn một tia sáng nhỏ "đánh thức" ngôi sao ở đó (hiện lên như đom đóm).
//  2. Đủ 36 sao thì nét chữ viết tay được nối dần qua các ngôi sao — nhịp chậm, êm.
//  3. Sao lấp lánh thành từng đợt sóng dọc nét chữ; sao băng chỉ bay ở dải trời phía trên chữ.
// ---------------------------------------------------------------------------
type ScreenPath = { pts: { x: number; y: number }[]; cum: number[]; start: number; len: number };

// Bố cục màn 3: dòng chữ ở giữa trời (hơi cao), lời nhắn hiện ngay bên dưới
export function constellationLayout(m: Metrics) {
    const { strokes, dots, dotAfter } = scriptStrokes();
    const all = [...strokes.flatMap((st) => st.pts), ...dots];
    const minX = Math.min(...all.map((p) => p[0])), maxX = Math.max(...all.map((p) => p[0]));
    const minY = Math.min(...all.map((p) => p[1])), maxY = Math.max(...all.map((p) => p[1]));
    const targetW = Math.min(m.W * 0.66, 920 * m.u);
    const scale = targetW / (maxX - minX);
    const h = (maxY - minY) * scale;
    const cy = Math.max(h / 2 + 70 * m.u, m.H * 0.28);
    const ox = m.W / 2 - targetW / 2 - minX * scale, oy = cy - h / 2 - minY * scale;
    return {
        strokes, dots, dotAfter, targetW, cy, top: cy - h / 2, bottom: cy + h / 2,
        textY: cy + h / 2 + 46 * m.u,
        toScreen: (p: [number, number]) => ({ x: ox + p[0] * scale, y: oy + p[1] * scale }),
    };
}

export class NameConstellationCutscene extends Cutscene {
    readonly keepKabigon = true;
    private paths: ScreenPath[] = []; // nét chữ trên màn hình, theo thứ tự viết
    private total = 0;
    // Lịch bay của đám mây (giây): bay lên → (khuất) → hạ xuống trái chữ H → lướt qua chữ → về Kabigon
    // Đường bay của đám mây (điểm dày đặc + quãng đường cộng dồn) và các mốc (thời điểm → quãng đường)
    private route: { x: number; y: number }[] = [];
    private routeCum: number[] = [];
    private knots: { t: number; s: number; m: number }[] = [];
    private passStart = 0; // lúc tới bên trái chữ H
    private flightEnd = 0; // lúc lướt xong dòng chữ
    private backEnd = 0; // lúc về tới đầu Kabigon
    // Đoạn kết: làn sóng hoa nở
    private bloomStart = 0;
    private waveDur = 2.6;
    private waveMax = 0;
    private hillFx = new Graphics(); // đồi đổi màu + viền sáng theo làn sóng
    private waveGlowL!: Sprite; // đầu sóng sáng chạy dọc đồi
    private waveGlowR!: Sprite;
    private horizon!: Sprite; // ánh hồng vàng loang ở chân trời
    // depth: 0 = đồi xa nhất, 1 = đồi giữa, 2 = đồi gần (hoa xa nhỏ, nhạt, hơi nhoè; hoa gần to & rõ)
    private flowers: { petals: Sprite; core: Sprite; x: number; y: number; at: number; size: number; rot: number; sway: number; flashed: boolean; depth: number; alpha: number }[] = [];
    private bloomFlash!: Emitter;
    private riseDust!: Emitter;
    private risePetals!: Emitter;
    private hearts: { s: Sprite; glow: Sprite; x: number; y: number; vy: number; phase: number; size: number; a: number }[] = [];
    private hillRidges: ((x: number) => number)[] = [];
    private gapTop = 0; // khoảng trống giữa lời nhắn và đồi (đèn lồng tim bay trong vùng này)
    private lineStart = 0;
    private lineDur = 4.8;
    private lineEnd = 0;
    private cloud = new Container(); // đám mây trên đầu Kabigon (cùng hình 'net' trong game) + quầng vàng mềm
    private cloudHalo: Sprite;
    private cloudBody: Sprite;
    private home: { x: number; y: number }; // chỗ cũ trên đầu Kabigon
    private prevX = 0;
    private tilt = 0;
    private trail: Emitter; // bụi kim tuyến
    private fallStars: Emitter; // vệt sao 5 cánh nhỏ rơi lả tả, xoay tròn lấp lánh
    // tia sáng nhỏ bắn từ đám mây sang ngôi sao được đánh thức
    private zaps: { s: Sprite; fx: number; fy: number; star: number; t0: number }[] = [];
    private zapAt: number[] = []; // thời điểm bắn tia tới từng sao (-1 = đã bắn)
    private tip: Sprite; // đầu sáng chạy theo nét khi nối
    // revealT: lúc đám mây bay qua → sao hiện lên như đom đóm, trôi nhẹ từ (x+dx, y+dy) vào chỗ
    private stars: { core: Sprite; flare: Sprite; x: number; y: number; dx: number; dy: number; revealT: number; rank: number; phase: number }[] = [];
    private lines = new Graphics();
    private dim = new Graphics();
    private aura: Sprite;
    private fill: { s: Sprite; at: number; phase: number; size: number }[] = [];
    private nextMeteor = 0;
    private meteorMaxY: number;

    constructor(c: CutsceneCtx) {
        super(c);
        const { W, u } = this.m;
        const L = constellationLayout(this.m);
        this.meteorMaxY = L.top - 34 * u;

        for (const st of L.strokes) {
            const pts = st.pts.map(L.toScreen);
            const cum = [0];
            for (let i = 1; i < pts.length; i++) cum.push(cum[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y));
            const len = cum[cum.length - 1];
            this.paths.push({ pts, cum, start: this.total, len });
            this.total += len;
        }

        // Nền tối bớt để chữ nổi bật
        this.dim.rect(0, 0, 1, 1).fill(0x05031a);
        this.dim.alpha = 0;
        this.back.addChild(this.dim);

        // 36 vị trí sao trên nét chữ: chấm dấu + đầu/cuối mỗi nét, phần còn lại rải đều (chọn điểm xa nhất)
        const cand = this.paths.flatMap((pa) => pa.pts.map((p, i) => ({ ...p, at: pa.start + pa.cum[i] })));
        const afterHau = this.paths[L.dotAfter];
        const chosen: { x: number; y: number; at: number }[] = [{ ...L.toScreen(L.dots[0]), at: afterHau.start + afterHau.len + 0.5 }];
        for (const pa of this.paths) {
            chosen.push({ ...pa.pts[0], at: pa.start });
            const end = pa.pts[pa.pts.length - 1];
            if (Math.hypot(end.x - pa.pts[0].x, end.y - pa.pts[0].y) > 4 * u) chosen.push({ ...end, at: pa.start + pa.len });
        }
        const dist = cand.map((p) => Math.min(...chosen.map((q) => Math.hypot(p.x - q.x, p.y - q.y))));
        while (chosen.length < 36) {
            let bi = 0;
            for (let i = 1; i < cand.length; i++) if (dist[i] > dist[bi]) bi = i;
            const q = cand[bi];
            chosen.push(q);
            for (let i = 0; i < cand.length; i++) dist[i] = Math.min(dist[i], Math.hypot(cand[i].x - q.x, cand[i].y - q.y));
        }
        chosen.sort((a, b) => a.at - b.at);

        // Lộ trình: các điểm neo của một đường cong liền mạch
        const h = L.bottom - L.top;
        const hx = c.from.x, hy = c.from.y, H = this.m.H;
        const x0 = W / 2 - L.targetW / 2 - 60 * u, x1 = W / 2 + L.targetW / 2 + 50 * u, py = L.cy + h * 0.05;
        const anchors = [
            { x: hx, y: hy }, // đầu Kabigon
            { x: hx + W * 0.08, y: hy - H * 0.16 }, // lượn nhẹ sang phải và lên
            { x: hx + W * 0.13, y: H * 0.42 }, // vòng rộng, uốn dần
            { x: hx + W * 0.05, y: H * 0.1 }, // ngả dần về bên trái khi lên cao
            { x: hx - W * 0.14, y: -190 * u }, // khuất khỏi mép trên
            { x: x0 - 120 * u, y: -150 * u }, // vòng sang trái (vẫn khuất)
            { x: x0 - 150 * u, y: py - h * 1.2 }, // hạ xuống theo vòng rộng
            { x: x0, y: py }, // bên trái chữ H
            { x: x0 + (x1 - x0) * 0.33, y: py - h * 0.06 },
            { x: x0 + (x1 - x0) * 0.66, y: py + h * 0.06 },
            { x: x1, y: py }, // qua khỏi chữ m
            { x: x1 + 90 * u, y: py + (hy - py) * 0.35 }, // lượn cong xuống
            { x: hx + W * 0.12, y: hy - 70 * u },
            { x: hx, y: hy }, // về lại đầu Kabigon
        ];
        const iH = 7, iM = 10; // chỉ số điểm neo "trái chữ H" và "qua chữ m"
        const anchorS = this.buildRoute(anchors);
        const passDur = Math.min(3.2, Math.max(2.4, (x1 - x0) / (380 * u)));
        this.passStart = 0.4 + 3.2; // đoạn đầu (bay lên & vòng xuống) thong thả hơn chút
        this.flightEnd = this.passStart + passDur;
        this.backEnd = this.flightEnd + 2.2;
        this.knots = [
            { t: 0.4, s: 0, m: 0 },
            { t: this.passStart, s: anchorS[iH], m: 0 },
            { t: this.flightEnd, s: anchorS[iM], m: 0 },
            { t: this.backEnd, s: anchorS[anchorS.length - 1], m: 0 },
        ];
        // tốc độ (độ dốc) tại các mốc: Fritsch–Carlson → tốc độ liền mạch, không giật; đầu & cuối dừng êm
        const sl = this.knots.slice(1).map((k, i) => (k.s - this.knots[i].s) / (k.t - this.knots[i].t));
        for (let i = 1; i < this.knots.length - 1; i++) this.knots[i].m = sl[i - 1] * sl[i] <= 0 ? 0 : (2 * sl[i - 1] * sl[i]) / (sl[i - 1] + sl[i]);
        this.lineStart = this.flightEnd + 0.8; // nối nét trong lúc mây đang bay về

        // Sao được đánh thức lúc đám mây lướt tới ngang chỗ đó (hơi sớm một chút để tia sáng kịp bay sang)
        this.zapAt = chosen.map((p) => {
            for (let tt = this.passStart - 0.3; tt <= this.flightEnd + 0.3; tt += 0.01) if (this.cloudAt(tt).x >= p.x - 30 * u) return tt;
            return this.flightEnd;
        });
        this.lineEnd = this.lineStart + this.lineDur;
        this.bloomStart = this.lineEnd + 0.3;
        this.gapTop = L.textY + 90 * u;

        this.aura = this.sprite('soft-glow', this.front);
        this.aura.tint = 0xfde68a;
        this.aura.alpha = 0;
        this.aura.position.set(W / 2, L.cy);
        this.aura.scale.set((L.targetW * 1.35) / 256, ((L.bottom - L.top) * 2.6) / 256);

        // Hạt sáng nhỏ dọc nét (hiện ra khi nét được nối tới)
        const step = 6 * u;
        for (const pa of this.paths) {
            for (let d = step / 2; d < pa.len; d += step) {
                const p = this.pointAt(pa.pts, pa.cum, d);
                const s = this.sprite('glow-dot', this.front);
                s.position.set(p.x, p.y);
                s.tint = [0xfff3c4, 0xffe9a8, 0xffffff][Math.floor(Math.random() * 3)];
                s.alpha = 0;
                this.fill.push({ s, at: pa.start + d, phase: Math.random() * Math.PI * 2, size: (0.13 + Math.random() * 0.08) * u });
            }
        }
        this.lines.blendMode = 'add';
        this.front.addChild(this.lines);

        // Sao: lõi sáng + tia 4 cánh, hiện lên như đom đóm khi tia sáng của đám mây chạm tới
        const ZAP = 0.22; // thời gian tia sáng bay sang sao
        chosen.forEach((p, rank) => {
            const core = this.sprite('glow-dot', this.front);
            const flare = this.sprite('spark', this.front);
            core.position.set(p.x, p.y); flare.position.set(p.x, p.y);
            core.tint = [0xfff7d6, 0xffe4f1, 0xe9d5ff][rank % 3];
            core.alpha = flare.alpha = 0;
            const a = Math.random() * Math.PI * 2, r = (8 + Math.random() * 8) * u;
            this.stars.push({
                core, flare, x: p.x, y: p.y, dx: Math.cos(a) * r, dy: Math.abs(Math.sin(a)) * r, // trôi lên từ phía dưới
                revealT: this.zapAt[rank] + ZAP, rank, phase: Math.random() * Math.PI * 2,
            });
        });

        // Vệt sao rơi + bụi kim tuyến (sau đám mây)
        this.fallStars = new Emitter(tex('star5'), {
            life: [1100, 2000], speedX: [-16 * u, 16 * u], speedY: [10 * u, 40 * u], gravity: 22 * u, spin: [-220, 220],
            scale: [0.2 * u, 0.4 * u], scaleEnd: 0.25, curve: 'pulse', tint: [0xfde68a, 0xfff7d6, 0xffd1e8, 0xe9d5ff],
        });
        this.trail = new Emitter(tex('spark'), {
            life: [700, 1400], speedX: [-12 * u, 12 * u], speedY: [4 * u, 26 * u], gravity: 14 * u, spin: [-160, 160],
            scale: [0.12 * u, 0.26 * u], scaleEnd: 0.2, curve: 'pulse', tint: [0xfde68a, 0xfff7d6, 0xf9a8d4, 0xc4b5fd, 0xffffff],
        });
        this.front.addChild(this.fallStars.view, this.trail.view);
        // Đám mây nằm ở lớp sau (không qua bộ lọc phát sáng) để giữ nguyên mặt dễ thương
        this.home = { x: c.from.x, y: c.from.y };
        this.cloudHalo = this.sprite('soft-glow', this.cloud);
        this.cloudHalo.tint = 0xfde68a;
        this.cloudBody = this.sprite('net', this.cloud, false);
        this.cloudBody.anchor.set(0.5, 55 / 120);
        this.cloud.position.set(c.from.x, c.from.y);
        this.prevX = c.from.x;
        this.back.addChild(this.cloud);
        this.buildBloom(c.from.x);
        this.tip = this.sprite('glow-dot', this.front);
        this.tip.tint = 0xfff7d6;
        this.tip.alpha = 0;
        this.front.filters = [bloom()];
    }

    // Chuẩn bị đoạn kết: hoa trên đồi, hiệu ứng đồi, bụi sáng bay lên, đèn lồng trái tim
    private buildBloom(kx: number) {
        const { W, H, u, ground } = this.m;
        // Hoa 5 cánh trắng (tint màu khi dùng), vẽ một lần
        try { tex('bloom-flower'); } catch {
            bake('bloom-flower', 48, 48, (ctx) => {
                ctx.translate(24, 24);
                for (let i = 0; i < 5; i++) {
                    ctx.save(); ctx.rotate((i * Math.PI * 2) / 5);
                    const g = ctx.createLinearGradient(0, -2, 0, -21);
                    g.addColorStop(0, 'rgba(255,255,255,0.75)'); g.addColorStop(1, '#ffffff');
                    ctx.fillStyle = g;
                    ctx.beginPath(); ctx.moveTo(0, -2);
                    ctx.bezierCurveTo(-10, -8, -9, -19, -2.5, -21); ctx.quadraticCurveTo(0, -18.5, 2.5, -21);
                    ctx.bezierCurveTo(9, -19, 10, -8, 0, -2); ctx.fill();
                    ctx.restore();
                }
            });
        }
        this.waveMax = Math.max(kx, W - kx) + 60 * u;
        this.hillFx.blendMode = 'add';
        this.back.addChild(this.hillFx);
        this.horizon = this.sprite('soft-glow', this.back);
        this.horizon.tint = 0xff9ec9; this.horizon.alpha = 0;
        this.horizon.position.set(W / 2, H * 0.86);
        this.horizon.scale.set((W * 1.5) / 256, (H * 0.55) / 256);
        this.waveGlowL = this.sprite('soft-glow', this.back);
        this.waveGlowR = this.sprite('soft-glow', this.back);
        for (const g of [this.waveGlowL, this.waveGlowR]) { g.tint = 0xffd6a5; g.alpha = 0; g.scale.set((90 * u) / 128, (60 * u) / 128); }

        // Hoa trên 3 lớp đồi. Mỗi lớp chỉ rải trong dải đồi còn lộ ra (giữa sườn đồi đó và sườn đồi phía trước nó).
        const ridge = [(x: number) => farHillY(this.m, 0, x), (x: number) => farHillY(this.m, 1, x), ground];
        const DEPTH = [
            { n: 80, size: [0.13, 0.2], alpha: 0.5, blur: 1.2, tints: [0xc9a8e8, 0xe7b8d8, 0xb9b0ec, 0xf0c4dc] },
            { n: 110, size: [0.2, 0.3], alpha: 0.66, blur: 0.5, tints: [0xe9a6cf, 0xf5bfd8, 0xd3b4f0, 0xf3d6a4] },
            { n: 120, size: [0.3, 0.48], alpha: 0.8, blur: 0, tints: [0xf28dbb, 0xf7b0cf, 0xf0d58c, 0xd2b0f2, 0xf6a5b5] },
        ];
        const scaleN = Math.min(1.4, W / (1200 * u));
        DEPTH.forEach((d, depth) => {
            const layer = new Container();
            if (d.blur) layer.filters = [new BlurFilter({ strength: d.blur * u, quality: 2 })];
            this.back.addChild(layer);
            const items: typeof this.flowers = [];
            for (let i = 0, tries = 0; i < d.n * scaleN && tries < d.n * 20; tries++) {
                const x = Math.random() * W;
                const top = ridge[depth](x) + 3 * u;
                const bottom = depth < 2 ? ridge[depth + 1](x) - 3 * u : H - 4 * u;
                if (bottom - top < 5 * u) continue;
                const k = Math.random();
                const y = top + k * (bottom - top);
                const near = 1 - Math.min(1, Math.abs(x - kx) / (W * 0.5));
                const size = (d.size[0] + Math.random() * (d.size[1] - d.size[0])) * (0.85 + 0.3 * k + 0.1 * near) * u;
                const petals = new Sprite(tex('bloom-flower'));
                petals.anchor.set(0.5); petals.tint = d.tints[i % d.tints.length]; petals.alpha = 0;
                const core = new Sprite(tex('glow-dot'));
                core.anchor.set(0.5); core.blendMode = 'add'; core.tint = 0xffe7a8; core.alpha = 0;
                // làn sóng lan theo chiều ngang và theo chiều sâu (đồi gần nở trước, đồi xa nở sau)
                const at = this.bloomStart + (Math.abs(x - kx) / this.waveMax) * this.waveDur + (2 - depth) * 0.45 + Math.random() * 0.25;
                items.push({ petals, core, x, y, size, rot: Math.random() * Math.PI, sway: Math.random() * Math.PI * 2, flashed: false, depth, alpha: d.alpha, at });
                i++;
            }
            items.sort((a, b) => a.y - b.y).forEach((f) => layer.addChild(f.petals, f.core));
            this.flowers.push(...items);
        });
        this.hillRidges = ridge;

        this.bloomFlash = new Emitter(tex('spark'), { life: [400, 800], speed: [20 * u, 70 * u], scale: [0.15 * u, 0.32 * u], scaleEnd: 0.2, curve: 'pulse', spin: [-200, 200], tint: [0xffffff, 0xfde68a, 0xffc4dd] });
        this.riseDust = new Emitter(tex('glow-dot'), {
            life: [2500, 4500], speedX: [-10 * u, 10 * u], speedY: [-48 * u, -20 * u], scale: [0.1 * u, 0.22 * u], scaleEnd: 0.4, curve: 'pulse',
            tint: [0xffd1e8, 0xfde68a, 0xffffff, 0xe9d5ff], rate: 0,
            area: () => { const x = Math.random() * W; return { x, y: ground(x) + Math.random() * 40 * u }; },
        });
        this.risePetals = new Emitter(tex('petal'), {
            life: [3500, 6000], speedX: [-18 * u, 18 * u], speedY: [-40 * u, -16 * u], spin: [-90, 90], scale: [0.5 * u, 0.9 * u], scaleEnd: 0.7, curve: 'pulse',
            tint: [0xffb3d1, 0xfbcfe8, 0xffe4f1], blend: 'normal', rate: 0,
            area: () => { const x = Math.random() * W; return { x, y: ground(x) + 10 * u }; },
        });
        this.back.addChild(this.bloomFlash.view, this.risePetals.view, this.riseDust.view);

        // Đèn lồng trái tim ở khoảng giữa (sau Kabigon, trước đồi)
        for (let i = 0; i < 9; i++) {
            const glow = this.sprite('soft-glow', this.back);
            glow.tint = 0xff7eb6; glow.alpha = 0;
            const s = this.sprite('heart', this.back, false);
            s.tint = [0xffb3d1, 0xff8fc0, 0xfde68a][i % 3]; s.alpha = 0;
            this.hearts.push({ s, glow, x: W * (0.08 + 0.84 * (i / 8)) + (Math.random() - 0.5) * 50 * u, y: ground(W * (0.08 + 0.84 * (i / 8))) - 10 * u,
                vy: (14 + Math.random() * 12) * u, phase: Math.random() * Math.PI * 2, size: (0.45 + Math.random() * 0.35) * u, a: -(0.6 + i * 0.35) });
        }
    }

    private stepBloom(t: number, dt: number) {
        const { W, H, u, ground } = this.m;
        const bt = t - this.bloomStart;
        if (bt < 0) return;
        const kx = this.home.x;
        const wk = Math.min(1, bt / this.waveDur), r = (1 - Math.pow(1 - wk, 2.2)) * this.waveMax;
        const x0 = Math.max(0, kx - r), x1 = Math.min(W, kx + r);

        // Đồi đổi màu + viền sáng theo làn sóng — đồi gần trước, đồi xa trễ hơn & nhạt hơn
        const g = this.hillFx.clear();
        const look = [
            { delay: 0.9, fill: 0.08, glow: 0.08, rim: 0.35 },
            { delay: 0.45, fill: 0.12, glow: 0.12, rim: 0.55 },
            { delay: 0, fill: 0.16, glow: 0.16, rim: 0.75 },
        ];
        this.hillRidges.forEach((ry, depth) => {
            const L2 = look[depth];
            const lk = Math.min(1, Math.max(0, (bt - L2.delay) / this.waveDur));
            const rr = (1 - Math.pow(1 - lk, 2.2)) * this.waveMax;
            const a0 = Math.max(0, kx - rr), a1 = Math.min(W, kx + rr);
            if (a1 <= a0) return;
            const below = depth < 2 ? this.hillRidges[depth + 1] : () => H;
            const color = depth === 2 ? 0xff6fae : 0xd77ad0;
            // vùng màu: các dải dọc, mờ dần ở đầu sóng (không có mép cắt cụt)
            const fade = 110 * u, step = 6 * u;
            const edgeL = a0 > 0, edgeR = a1 < W;
            for (let x = a0; x < a1; x += step) {
                const xe = Math.min(a1, x + step), xm = (x + xe) / 2;
                let k = 1;
                if (edgeL) k = Math.min(k, (xm - a0) / fade);
                if (edgeR) k = Math.min(k, (a1 - xm) / fade);
                if (k <= 0.02) continue;
                g.poly([x, ry(x), xe, ry(xe), xe, Math.max(ry(xe), below(xe)), x, Math.max(ry(x), below(x))], true).fill({ color, alpha: L2.fill * Math.min(1, k) });
            }
            const top: number[] = [];
            for (let x = a0; x <= a1; x += 6 * u) top.push(x, ry(x));
            top.push(a1, ry(a1));
            g.moveTo(top[0], top[1]); for (let i = 2; i < top.length; i += 2) g.lineTo(top[i], top[i + 1]);
            g.stroke({ width: 9 * u, color: 0xffb36b, alpha: L2.glow });
            g.moveTo(top[0], top[1]); for (let i = 2; i < top.length; i += 2) g.lineTo(top[i], top[i + 1]);
            g.stroke({ width: (1.4 + depth * 0.6) * u, color: 0xffe7a3, alpha: L2.rim });
        });
        const front = wk < 1 ? 1 : Math.max(0, 1 - (bt - this.waveDur) * 1.5);
        this.waveGlowL.position.set(x0, ground(x0)); this.waveGlowR.position.set(x1, ground(x1));
        this.waveGlowL.alpha = this.waveGlowR.alpha = 0.55 * front * Math.min(1, bt * 4);
        this.horizon.alpha = Math.min(0.42, bt * 0.25) * (0.9 + 0.1 * Math.sin(t * 1.3));

        // Hoa: nụ hé → bung cánh (nảy nhẹ) → đung đưa
        for (const f of this.flowers) {
            const p = t - f.at;
            if (p < 0) continue;
            const bud = Math.min(1, p / 0.18);
            const o = Math.min(1, Math.max(0, (p - 0.18) / 0.55));
            const c1 = 1.70158, c3 = c1 + 1, back = 1 + c3 * Math.pow(o - 1, 3) + c1 * Math.pow(o - 1, 2);
            const sc = f.size * (0.22 * bud + 0.78 * back);
            // phối cảnh: nhìn hoa hơi nghiêng (dẹt theo chiều dọc), hoa nhô lên khỏi mặt đồi khi nở
            const lift = (1 - o) * 6 * u * (0.4 + f.depth * 0.3);
            const y = f.y + lift;
            f.petals.position.set(f.x, y);
            f.petals.scale.set(sc, sc * 0.62);
            f.petals.rotation = Math.sin(t * 1.2 + f.sway) * 0.05 * (1 + f.depth);
            f.petals.alpha = Math.min(1, p * 5) * f.alpha;
            f.core.position.set(f.x, y);
            f.core.scale.set(sc * 0.42 * (1 + 0.12 * Math.sin(t * 3 + f.sway)));
            const glowK = o < 1 ? 1 - o * 0.6 : 0.4 + 0.25 * Math.abs(Math.sin(t * 2 + f.sway));
            f.core.alpha = glowK * (0.15 + f.depth * 0.12);
            if (!f.flashed && o > 0.3) { f.flashed = true; if (f.depth === 2 && Math.random() < 0.3) this.bloomFlash.emit(f.x, y, 1); }
        }
        this.bloomFlash.update(dt);

        // Bụi sáng & cánh hoa bay lên sau khi sóng quét xong
        const after = Math.min(1, Math.max(0, (bt - this.waveDur * 0.6) / 1.5));
        this.riseDust.cfg.rate = 26 * after * (W / (900 * u));
        this.risePetals.cfg.rate = 5 * after * (W / (900 * u));
        this.riseDust.update(dt);
        this.risePetals.update(dt);

        // Đèn lồng trái tim: bay lên chậm trong khoảng trống giữa Kabigon và chữ, tới gần chữ thì mờ đi rồi bay lại từ đầu
        for (const hh of this.hearts) {
            hh.a += dt / 1000;
            if (hh.a < 0 || bt < this.waveDur * 0.5) continue;
            hh.y -= hh.vy * (dt / 1000);
            const startY = ground(hh.x) - 10 * u;
            if (hh.y < this.gapTop) { hh.y = startY; hh.x = Math.random() * W; hh.a = 0; }
            const span = Math.max(1, startY - this.gapTop), k = (startY - hh.y) / span;
            const a = Math.min(1, hh.a * 1.2) * Math.min(1, (1 - k) * 4) * Math.min(1, k * 6 + 0.2);
            const x = hh.x + Math.sin(t * 0.9 + hh.phase) * 16 * u;
            hh.s.position.set(x, hh.y); hh.glow.position.set(x, hh.y + 4 * u);
            hh.s.scale.set(hh.size * (1 + 0.05 * Math.sin(t * 3 + hh.phase)));
            hh.s.rotation = Math.sin(t * 1.1 + hh.phase) * 0.15;
            hh.glow.scale.set((hh.size * 70) / 128);
            hh.s.alpha = 0.95 * a; hh.glow.alpha = 0.45 * a;
        }
    }

    // Lấy mẫu dày đặc đường cong Catmull-Rom hướng tâm qua các điểm neo (không vòng thắt, không nhọn)
    // → this.route / this.routeCum; trả về quãng đường cộng dồn tại từng điểm neo
    private buildRoute(P: { x: number; y: number }[]) {
        const pts = [P[0], ...P, P[P.length - 1]];
        const out: number[] = [0];
        this.route = [P[0]]; this.routeCum = [0];
        for (let i = 1; i < pts.length - 2; i++) {
            const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1], p3 = pts[i + 2];
            const tj = (a: { x: number; y: number }, b: { x: number; y: number }) => Math.max(1e-3, Math.sqrt(Math.hypot(b.x - a.x, b.y - a.y)));
            const t0 = 0, t1 = t0 + tj(p0, p1), t2 = t1 + tj(p1, p2), t3 = t2 + tj(p2, p3);
            const n = Math.max(8, Math.ceil(Math.hypot(p2.x - p1.x, p2.y - p1.y) / 4));
            for (let k = 1; k <= n; k++) {
                const t = t1 + ((t2 - t1) * k) / n;
                const L = (a: { x: number; y: number }, b: { x: number; y: number }, ta: number, tb: number) => ({ x: ((tb - t) * a.x + (t - ta) * b.x) / (tb - ta), y: ((tb - t) * a.y + (t - ta) * b.y) / (tb - ta) });
                const A1 = L(p0, p1, t0, t1), A2 = L(p1, p2, t1, t2), A3 = L(p2, p3, t2, t3);
                const B1 = L(A1, A2, t0, t2), B2 = L(A2, A3, t1, t3);
                const q = L(B1, B2, t1, t2);
                const prev = this.route[this.route.length - 1];
                this.route.push(q);
                this.routeCum.push(this.routeCum[this.routeCum.length - 1] + Math.hypot(q.x - prev.x, q.y - prev.y));
            }
            out.push(this.routeCum[this.routeCum.length - 1]);
        }
        return out;
    }

    // Quãng đường đã bay tại thời điểm t (nội suy Hermite giữa các mốc → tốc độ thay đổi mượt)
    private routeS(t: number) {
        const K = this.knots;
        if (t <= K[0].t) return 0;
        if (t >= K[K.length - 1].t) return K[K.length - 1].s;
        let i = 0;
        while (t > K[i + 1].t) i++;
        const a = K[i], b = K[i + 1], hh = b.t - a.t, x = (t - a.t) / hh;
        const h00 = 2 * x * x * x - 3 * x * x + 1, h10 = x * x * x - 2 * x * x + x, h01 = -2 * x * x * x + 3 * x * x, h11 = x * x * x - x * x;
        return h00 * a.s + h10 * hh * a.m + h01 * b.s + h11 * hh * b.m;
    }

    // Vị trí đám mây tại thời điểm t
    private cloudAt(t: number): { x: number; y: number; flying: boolean } {
        const flying = t > this.knots[0].t && t < this.backEnd;
        return { ...this.pointAt(this.route, this.routeCum, this.routeS(t)), flying };
    }

    private pointAt(pts: { x: number; y: number }[], cum: number[], d: number) {
        let lo = 1, hi = cum.length - 1;
        while (lo < hi) { const mid = (lo + hi) >> 1; if (cum[mid] < d) lo = mid + 1; else hi = mid; }
        const i = Math.max(1, lo);
        const a = pts[i - 1], b = pts[i], r = Math.min(1, Math.max(0, (d - cum[i - 1]) / Math.max(1e-6, cum[i] - cum[i - 1])));
        return { x: a.x + (b.x - a.x) * r, y: a.y + (b.y - a.y) * r };
    }

    // Vẽ phần nét chữ đã nối tới (tổng chiều dài `upTo`), trả về vị trí đầu nét
    private tracePaths(g: Graphics, upTo: number) {
        let tip: { x: number; y: number } | null = null;
        for (const pa of this.paths) {
            const vis = Math.min(pa.len, upTo - pa.start);
            if (vis <= 0) break;
            g.moveTo(pa.pts[0].x, pa.pts[0].y);
            let i = 1;
            for (; i < pa.pts.length && pa.cum[i] <= vis; i++) g.lineTo(pa.pts[i].x, pa.pts[i].y);
            tip = i < pa.pts.length ? this.pointAt(pa.pts, pa.cum, vis) : pa.pts[pa.pts.length - 1];
            g.lineTo(tip.x, tip.y);
        }
        return tip;
    }

    protected step(f: number) {
        const { W, H, u } = this.m;
        const t = this.t;
        const dt = f * 16.667;
        this.once('woosh', this.passStart - 1, () => this.c.sfx('woosh'));

        // Trời tối bớt để chữ nổi bật
        const fe = Math.min(1, Math.max(0, (t - 0.3) / 1.6));
        this.dim.scale.set(W, H);
        // đoạn kết: trời sáng lại phần nào khi hoa nở
        const peak = Math.min(1, Math.max(0, (t - this.bloomStart) / 2.5));
        const pk = peak * peak * (3 - 2 * peak);
        this.dim.alpha = 0.42 * fe * (1 - 0.55 * pk);
        this.c.sky.setDarkness(0.4 * fe * (1 - 0.6 * pk));

        // 1. Đám mây: bay lên → hạ xuống trái chữ H → lướt qua chữ (rắc sao rơi) → về đầu Kabigon
        const { flying, ...pos } = this.cloudAt(t);
        const passing = t > this.passStart - 0.4 && t < this.flightEnd + 0.2;
        const bob = Math.sin(t * 2.4) * 4 * u;
        this.cloud.position.set(pos.x, pos.y + bob);
        // nghiêng theo hướng bay, to hơn chút khi đang bay
        const vx = (pos.x - this.prevX) / Math.max(0.01, f); this.prevX = pos.x;
        this.tilt += (Math.max(-0.35, Math.min(0.35, vx * 0.03 / u)) - this.tilt) * (1 - Math.pow(0.05, dt / 1000));
        this.cloudBody.rotation = this.tilt + Math.sin(t * 1.6) * 0.05;
        this.cloudBody.scale.set(u * (flying ? 0.95 : 1));
        this.cloudHalo.scale.set(((150 + 10 * Math.sin(t * 3)) * u) / 128);
        this.cloudHalo.alpha = flying ? 0.38 : 0.25;
        if (passing) {
            if (Math.random() < 0.8 * f) this.fallStars.emit(pos.x + (Math.random() - 0.5) * 60 * u, pos.y + (8 + Math.random() * 16) * u, 1);
            if (Math.random() < 0.9 * f) this.trail.emit(pos.x + (Math.random() - 0.5) * 70 * u, pos.y + (Math.random() - 0.3) * 30 * u, 1);
        }
        this.fallStars.update(dt);
        this.trail.update(dt);

        // tia sáng nhỏ bắn sang "đánh thức" ngôi sao gần đó
        this.zapAt.forEach((zt, i) => {
            if (zt >= 0 && t >= zt) {
                this.zapAt[i] = -1;
                const z = this.sprite('spark', this.front);
                z.tint = 0xfff7d6;
                this.zaps.push({ s: z, fx: pos.x, fy: pos.y, star: i, t0: t });
            }
        });
        for (let i = this.zaps.length - 1; i >= 0; i--) {
            const z = this.zaps[i], st = this.stars[z.star];
            const p = Math.min(1, (t - z.t0) / 0.22), e = 1 - Math.pow(1 - p, 2);
            z.s.position.set(z.fx + (st.x - z.fx) * e, z.fy + (st.y - z.fy) * e - Math.sin(p * Math.PI) * 14 * u);
            z.s.scale.set((0.5 - 0.2 * p) * u);
            z.s.rotation = p * 4;
            z.s.alpha = p < 1 ? 1 : 0;
            if (p >= 1) { z.s.destroy(); this.zaps.splice(i, 1); }
        }

        // 2. Đủ sao rồi: nối nét chữ viết tay qua các ngôi sao
        // (nhịp êm: chậm lúc đầu & cuối; nét hiện dần lên chứ không bật sáng ngay)
        const lk = Math.min(1, Math.max(0, (t - this.lineStart) / this.lineDur));
        const upTo = (0.5 - 0.5 * Math.cos(Math.PI * lk)) * this.total;
        const lineA = Math.min(1, lk * 5);
        const g = this.lines.clear();
        if (upTo > 0) {
            this.tracePaths(g, upTo);
            g.stroke({ width: 7 * u, color: 0xfde68a, alpha: 0.18 * lineA, cap: 'round', join: 'round' });
            const tip = this.tracePaths(g, upTo);
            g.stroke({ width: 2.2 * u, color: 0xfff4d1, alpha: 0.9 * lineA, cap: 'round', join: 'round' });
            if (tip && lk < 1) {
                this.tip.position.set(tip.x, tip.y);
                this.tip.scale.set((0.36 + 0.06 * Math.sin(t * 6)) * u);
                this.tip.alpha = Math.min(1, this.tip.alpha + 0.08 * f);
            }
            this.aura.alpha = Math.min(0.34, lk * 0.45);
        }
        if (lk >= 1) this.tip.alpha = Math.max(0, this.tip.alpha - 0.03 * f);
        for (const d of this.fill) {
            const v = Math.min(1, Math.max(0, (upTo - d.at) / (70 * u)));
            d.s.alpha = v * (0.55 + 0.35 * Math.sin(t * 2.4 + d.phase));
            d.s.scale.set(d.size * (0.8 + 0.2 * v));
        }

        // Sao hiện như đom đóm: mờ → sáng dần, trôi nhẹ vào chỗ, phập phồng; nối xong thì lấp lánh từng đợt dọc nét chữ
        for (const st of this.stars) {
            const p = t - st.revealT;
            if (p < 0) { st.core.alpha = st.flare.alpha = 0; continue; }
            const settle = Math.min(1, p / 0.6), se = 1 - Math.pow(1 - settle, 3);
            st.core.position.set(st.x + st.dx * (1 - se), st.y + st.dy * (1 - se));
            st.flare.position.copyFrom(st.core.position);
            const glowIn = p < 0.25 ? p / 0.25 : Math.max(0, 1 - (p - 0.25) / 0.9); // sáng dần rồi dịu xuống
            const pop = 0.45 * glowIn;
            const firefly = 0.75 + 0.25 * Math.sin(t * 2.2 + st.phase); // phập phồng như đom đóm
            let wave = 0;
            if (t > this.lineEnd + 0.6) {
                const w = (t - this.lineEnd - 0.6 - st.rank * 0.045) % 4.2;
                if (w > 0 && w < 0.6) wave = Math.sin((w / 0.6) * Math.PI);
            }
            st.core.alpha = Math.min(1, p * 3) * firefly;
            st.core.scale.set((0.34 + 0.35 * pop + 0.18 * wave) * u);
            st.flare.alpha = Math.min(1, p * 2.5) * Math.min(1, 0.3 + pop + wave * 0.7) * firefly;
            st.flare.scale.set((0.4 + 0.6 * pop + 0.5 * wave) * u);
            st.flare.rotation = p * 0.5;
        }

        this.stepBloom(t, dt);

        // Mưa sao băng — chỉ ở dải trời phía trên chữ
        const showerStart = this.lineEnd + 0.4;
        if (t > showerStart && t < showerStart + 10 && t > this.nextMeteor && this.meteorMaxY > 60 * u) {
            this.c.sky.shootingStar(this.meteorMaxY);
            this.nextMeteor = t + 0.45 + Math.random() * 0.55;
        }
        this.once('wind', showerStart, () => this.c.sfx('wind'));
        this.once('text', this.lineEnd + 0.5, () => this.c.onText?.());
    }

    destroy() {
        super.destroy();
        this.c.sky.setDarkness(0);
    }
}
