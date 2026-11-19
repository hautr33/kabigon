import { Particle, ParticleContainer, type Texture } from 'pixi.js';

// Bộ phát hạt chạy trên ParticleContainer của Pixi 8 — loại vẽ hạt nhanh nhất (hàng nghìn hạt vẫn nhẹ).
// Cấu hình dạng object thuần (giống file JSON của @pixi/particle-emitter) nên có thể lưu/chia sẻ dễ dàng.
// Chuyển động tính theo thời gian thật (ms) nên mượt như nhau trên màn 60Hz / 120Hz.

type Range = number | [number, number];
const pick = (r: Range) => (Array.isArray(r) ? r[0] + Math.random() * (r[1] - r[0]) : r);

export type EmitterConfig = {
    life: Range; // ms
    speedX?: Range; // px/giây
    speedY?: Range;
    speed?: Range; // dùng cùng angle (độ) thay cho speedX/speedY
    angle?: Range;
    gravity?: number; // px/giây²
    scale: Range; // tỉ lệ lúc sinh ra
    scaleEnd?: number; // hệ số nhân lúc chết (mặc định 0)
    alpha?: Range;
    curve?: 'fade' | 'pulse'; // 'fade': mờ dần; 'pulse': hiện lên rồi tắt
    tint?: number[] | (() => number);
    spin?: Range; // độ/giây
    blend?: 'add' | 'normal';
    // phát liên tục
    rate?: number; // hạt mỗi giây
    area?: () => { x: number; y: number };
    max?: number;
};

type P = { p: Particle; vx: number; vy: number; life: number; age: number; scale: number; alpha: number; spin: number };

export class Emitter {
    readonly view: ParticleContainer;
    private live: P[] = [];
    private pool: Particle[] = [];
    private acc = 0;
    emitting = true;

    constructor(private texture: Texture, public cfg: EmitterConfig) {
        this.view = new ParticleContainer({
            texture,
            dynamicProperties: { position: true, rotation: true, vertex: true, color: true },
        });
        this.view.blendMode = cfg.blend ?? 'add';
    }

    emit(x: number, y: number, count = 1) {
        const c = this.cfg;
        for (let i = 0; i < count; i++) {
            if (c.max && this.live.length >= c.max) return;
            const p = this.pool.pop() ?? new Particle({ texture: this.texture, anchorX: 0.5, anchorY: 0.5 });
            p.x = x;
            p.y = y;
            p.rotation = Math.random() * Math.PI * 2;
            p.tint = c.tint ? (typeof c.tint === 'function' ? c.tint() : c.tint[Math.floor(Math.random() * c.tint.length)]) : 0xffffff;
            let vx: number, vy: number;
            if (c.speed !== undefined) {
                const a = (pick(c.angle ?? [0, 360]) * Math.PI) / 180;
                const sp = pick(c.speed);
                vx = Math.cos(a) * sp; vy = Math.sin(a) * sp;
            } else {
                vx = pick(c.speedX ?? 0); vy = pick(c.speedY ?? 0);
            }
            const it: P = { p, vx, vy, life: pick(c.life), age: 0, scale: pick(c.scale), alpha: pick(c.alpha ?? 1), spin: (pick(c.spin ?? 0) * Math.PI) / 180 };
            this.apply(it);
            this.view.addParticle(p);
            this.live.push(it);
        }
    }

    update(dtMs: number) {
        const c = this.cfg;
        if (this.emitting && c.rate && c.area) {
            this.acc += (dtMs / 1000) * c.rate;
            while (this.acc >= 1) { const { x, y } = c.area(); this.emit(x, y, 1); this.acc -= 1; }
        }
        const dt = dtMs / 1000;
        const g = c.gravity ?? 0;
        let removed = false;
        for (let i = this.live.length - 1; i >= 0; i--) {
            const it = this.live[i];
            it.age += dtMs;
            if (it.age >= it.life) {
                this.pool.push(it.p);
                this.live[i] = this.live[this.live.length - 1];
                this.live.pop();
                removed = true;
                continue;
            }
            it.vy += g * dt;
            it.p.x += it.vx * dt;
            it.p.y += it.vy * dt;
            it.p.rotation += it.spin * dt;
            this.apply(it);
        }
        // Gỡ hạt đã chết một lần (rẻ hơn gỡ từng hạt)
        if (removed) {
            this.view.particleChildren = this.live.map((it) => it.p);
            this.view.update();
        }
    }

    private apply(it: P) {
        const t = it.age / it.life;
        const sc = it.scale * (1 + ((this.cfg.scaleEnd ?? 0) - 1) * t);
        it.p.scaleX = it.p.scaleY = sc;
        it.p.alpha = it.alpha * (this.cfg.curve === 'pulse' ? Math.sin(t * Math.PI) : 1 - t);
    }

    // Chạy trước một khoảng thời gian (để cảnh có sẵn hạt ngay khi mở)
    prewarm(ms: number, step = 50) {
        for (let t = 0; t < ms; t += step) this.update(step);
    }

    get count() {
        return this.live.length;
    }

    destroy() {
        this.view.destroy();
        this.live = [];
        this.pool = [];
    }
}
