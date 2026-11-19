import gsap from 'gsap';
import { Container, Sprite } from 'pixi.js';
import type { Metrics } from '../metrics';
import { bakeScenery, makeSkyGradient, tex } from './art';
import { Comet, smooth } from './comet';
import { Emitter } from './particles';

// Bầu trời đêm dùng chung cho menu và các màn (phong cách giống trang đăng nhập P.E.A.K):
// gradient, vầng sáng cực quang trôi chậm, sao lấp lánh, tia sáng 4 cánh, đồi cây hoa, đom đóm,
// sao băng. Chia thành các tầng độ sâu để làm parallax theo chuột.
export class NightSky {
    readonly view = new Container();
    readonly far = new Container(); // cực quang
    readonly mid = new Container(); // sao, sao băng
    readonly near = new Container(); // đồi, cây, nhân vật
    readonly front = new Container(); // đom đóm (trước đồi)
    private bg = new Sprite(tex('sky-gradient'));
    private stars: { s: Sprite; base: number; tw: number; speed: number }[] = [];
    private sparkles: { s: Sprite; t: number; period: number; size: number }[] = [];
    private scenery?: Sprite;
    private fireflies!: Emitter;
    readonly dust: Emitter;
    private comets = new Map<Comet, gsap.core.Tween>();
    private tweens: gsap.core.Tween[] = [];
    private parX: gsap.QuickToFunc;
    private parY: gsap.QuickToFunc;
    private shootTimer?: gsap.core.Tween;
    private darkness = 0;
    m!: Metrics;

    constructor(m: Metrics, private opts: { shootingStars?: boolean; sceneryMargin?: number; sceneryKey?: string } = {}) {
        makeSkyGradient();
        this.view.addChild(this.bg, this.far, this.mid, this.near, this.front);
        this.dust = new Emitter(tex('glow-dot'), {
            life: [600, 1100], speedX: [-8, 8], speedY: [2, 14], scale: [0.05, 0.08], alpha: 0.55,
        });
        this.mid.addChild(this.dust.view);
        // Parallax: các tầng đuổi theo con trỏ thật mềm (giống CSS transition .6s cubic-bezier(.2,.8,.2,1))
        const par = { x: 0, y: 0 };
        this.parX = gsap.quickTo(par, 'x', { duration: 0.9, ease: 'power3.out', onUpdate: () => this.applyParallax(par) });
        this.parY = gsap.quickTo(par, 'y', { duration: 0.9, ease: 'power3.out', onUpdate: () => this.applyParallax(par) });
        this.build(m);
        if (opts.shootingStars) this.scheduleShootingStar(1.2);
    }

    build(m: Metrics) {
        this.m = m;
        const { W, H, u } = m;
        this.tweens.forEach((t) => t.kill());
        this.tweens = [];
        this.far.removeChildren().forEach((c) => c.destroy());
        this.stars.forEach((st) => st.s.destroy());
        this.sparkles.forEach((sp) => sp.s.destroy());
        this.stars = [];
        this.sparkles = [];

        this.bg.width = W + 80;
        this.bg.height = H + 80;
        this.bg.position.set(-40, -40);

        // 1. Cực quang: 3 vầng sáng lớn trôi chậm
        const auroras = [
            { x: 0.22, y: -0.05, r: 0.55, c: 0x5b6cff, a: 0.42, d: 18 },
            { x: 0.82, y: 0.02, r: 0.48, c: 0x8b3dff, a: 0.42, d: 22 },
            { x: 0.52, y: 0.4, r: 0.4, c: 0xd946ef, a: 0.14, d: 26 },
        ];
        const big = Math.max(W, H);
        auroras.forEach((a, i) => {
            const s = new Sprite(tex('soft-glow'));
            s.anchor.set(0.5);
            s.tint = a.c; s.alpha = a.a; s.blendMode = 'add';
            s.position.set(W * a.x, H * a.y);
            s.scale.set((big * a.r) / 128);
            this.far.addChild(s);
            this.tweens.push(gsap.to(s, { x: s.x + 70 * u, y: s.y + 40 * u, duration: a.d, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -i * 4 }));
            this.tweens.push(gsap.to(s.scale, { x: s.scale.x * 1.18, y: s.scale.y * 1.18, duration: a.d, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: -i * 4 }));
        });

        // 2. Sao nền lấp lánh (dày hơn ở phía trên)
        const count = Math.min(420, Math.round((W * H) / 2600));
        for (let i = 0; i < count; i++) {
            const r = Math.random();
            const size = r > 0.93 ? 2.6 : r > 0.7 ? 1.8 : 1.1;
            const s = new Sprite(tex('glow-dot'));
            s.anchor.set(0.5);
            s.blendMode = 'add';
            s.tint = Math.random() > 0.5 ? 0xffffff : 0xd8ccff;
            s.position.set(Math.random() * (W + 60) - 30, Math.pow(Math.random(), 1.4) * H * 0.72);
            s.scale.set((size * u * 4) / 64);
            this.mid.addChildAt(s, 0);
            this.stars.push({ s, base: 0.35 + Math.random() * 0.65, tw: Math.random() * Math.PI * 2, speed: (Math.PI * 2) / (2500 + Math.random() * 3500) });
        }

        // 3. Tia sáng 4 cánh lấp lánh (hiện – xoay – tắt)
        for (let i = 0; i < 7; i++) {
            const s = new Sprite(tex('spark'));
            s.anchor.set(0.5);
            s.blendMode = 'add';
            s.tint = [0xffffff, 0xe9d5ff, 0xc4b5fd][i % 3];
            s.position.set(W * (0.06 + Math.random() * 0.88), H * (0.08 + Math.random() * 0.45));
            this.mid.addChild(s);
            this.sparkles.push({ s, t: Math.random() * 3600, period: 3600, size: (9 + Math.random() * 11) * u });
        }

        // 4. Đồi, cây, hoa (vẽ sẵn thành 1 texture)
        const margin = this.opts.sceneryMargin ?? 0;
        const { texture, top } = bakeScenery(this.opts.sceneryKey ?? 'scenery', m, margin);
        if (!this.scenery) { this.scenery = new Sprite(texture); this.near.addChildAt(this.scenery, 0); } else this.scenery.texture = texture;
        this.scenery.position.set(-margin, top);

        // 5. Đom đóm / hạt sáng bay lên
        this.fireflies?.destroy();
        this.fireflies = new Emitter(tex('glow-dot'), {
            life: [4000, 7500], speedX: [-10 * u, 10 * u], speedY: [-26 * u, -8 * u],
            scale: [0.1 * u, 0.2 * u], scaleEnd: 0.6, alpha: [0.6, 0.95], curve: 'pulse',
            tint: [0xfef08a, 0xf9a8d4, 0xd8ccff], rate: (W / 500) * 7,
            area: () => ({ x: Math.random() * W, y: H * (0.6 + Math.random() * 0.4) }),
        });
        this.front.addChild(this.fireflies.view);
        this.fireflies.prewarm(6000, 100);
    }

    update(dtMs: number) {
        const k = 1 - this.darkness;
        for (const st of this.stars) {
            st.tw += st.speed * dtMs;
            const t = 0.5 + 0.5 * Math.sin(st.tw);
            st.s.alpha = st.base * (0.2 + 0.8 * t) * k;
        }
        for (const sp of this.sparkles) {
            sp.t = (sp.t + dtMs) % sp.period;
            // giống keyframes login-sparkle: 0→1 ở 45-55% rồi tắt, xoay 45°
            const p = sp.t / sp.period;
            const e = p < 0.45 ? smooth(p / 0.45) : p > 0.55 ? smooth((1 - p) / 0.45) : 1;
            sp.s.alpha = e * k;
            sp.s.scale.set((sp.size / 32) * (0.2 + 0.8 * e));
            sp.s.rotation = (Math.PI / 4) * e;
        }
        this.fireflies.update(dtMs);
        this.dust.update(dtMs);
    }

    // nx, ny trong khoảng -1..1 (vị trí chuột so với tâm màn hình)
    setPointer(nx: number, ny: number) {
        this.parX(nx);
        this.parY(ny);
    }

    private applyParallax(p: { x: number; y: number }) {
        if (this.view.destroyed) return;
        const u = this.m.u;
        this.far.position.set(-p.x * 30 * u, -p.y * 20 * u);
        this.mid.position.set(-p.x * 10 * u, -p.y * 6 * u);
        this.near.position.set(-p.x * 24 * u, 0);
        this.front.position.set(-p.x * 34 * u, 0);
        this.bg.position.set(-40 - p.x * 4 * u, -40 - p.y * 3 * u);
    }

    // 0 = bình thường, 1 = tối hẳn (sao & đom đóm mờ đi)
    setDarkness(d: number) {
        this.darkness = d;
        this.fireflies.view.alpha = 1 - d;
        this.far.alpha = 1 - d * 0.8;
    }

    private scheduleShootingStar(delay: number) {
        this.shootTimer = gsap.delayedCall(delay, () => {
            this.shootingStar();
            this.scheduleShootingStar(2.2 + Math.random() * 3.5);
        });
    }

    // Sao băng bay thẳng với vận tốc không đổi; chỉ độ sáng hiện/tắt dần → luôn mượt
    shootingStar() {
        const { W, H, u } = this.m;
        const fromLeft = Math.random() < 0.35;
        const x0 = fromLeft ? Math.random() * W * 0.5 : W * 0.35 + Math.random() * W * 0.7;
        const y0 = Math.random() * H * 0.28 - 20 * u;
        const dist = Math.min(W * 0.55, 680 * u) * (0.75 + Math.random() * 0.45);
        const ang = (fromLeft ? 0 : Math.PI) + (fromLeft ? 1 : -1) * (0.42 + Math.random() * 0.22);
        const x1 = x0 + Math.cos(ang) * dist, y1 = y0 + Math.sin(ang) * dist;
        const palette: [number, number][] = [[0xc4b5fd, 0xffffff], [0xa5b4fc, 0xffffff], [0xf0abfc, 0xfff1fb], [0xfcd34d, 0xfffbeb]];
        const [tailTint, headTint] = palette[Math.floor(Math.random() * palette.length)];
        const comet = new Comet(x0, y0, 3.2 + Math.random() * 2.2, u, this.dust).setColors(tailTint, headTint);
        this.mid.addChild(comet.view);
        const duration = 1.5 + Math.random() * 0.9;
        const frames = (duration * 1000) / 16.667;
        const vx = (x1 - x0) / frames, vy = (y1 - y0) / frames;
        const len = (190 + Math.random() * 110) * u;
        const p = { t: 0 };
        let last = performance.now();
        const tween = gsap.to(p, {
            t: 1, duration, ease: 'none',
            onUpdate: () => {
                const now = performance.now();
                const dt = Math.max(1, now - last);
                last = now;
                const alpha = smooth(p.t / 0.1) * smooth((1 - p.t) / 0.45);
                comet.update(x0 + (x1 - x0) * p.t, y0 + (y1 - y0) * p.t, vx, vy, dt, { alpha, len, maxLen: 320 });
            },
            onComplete: () => { this.comets.delete(comet); comet.destroy(); },
        });
        this.comets.set(comet, tween);
    }

    resize(m: Metrics) {
        this.build(m);
        this.setDarkness(this.darkness);
    }

    destroy() {
        this.parX.tween.kill();
        this.parY.tween.kill();
        this.shootTimer?.kill();
        this.tweens.forEach((t) => t.kill());
        this.comets.forEach((tween, c) => { tween.kill(); c.destroy(); });
        this.fireflies.destroy();
        this.dust.destroy();
        this.view.destroy({ children: true });
    }
}
