import gsap from 'gsap';
import { Container, Sprite, Texture } from 'pixi.js';
import { play } from '../core/audio';
import type { Metrics } from '../core/metrics';
import { tex } from '../core/pixi/art';
import { Emitter } from '../core/pixi/particles';
import { NightSky } from '../core/pixi/sky';
import { THEMES, type ThemeWorld } from '../themes';

export const TEASER_ID = '__next';

// Nền Pixi của home: bầu trời đêm + "thế giới" của từng theme (hiện dần khi rê chuột vào ảnh)
// + pháo hoa vào ngày mùng 6.
export class HomeBackdrop {
    readonly view = new Container();
    readonly sky: NightSky;
    private worlds = new Map<string, { world: ThemeWorld; v: { a: number }; tween?: gsap.core.Tween }>();
    private fx = new Container();
    private sparks: Emitter;
    private glows: Emitter;
    private trail: Emitter;
    private fireworkTimer?: gsap.core.Tween;
    private tweens: gsap.core.Animation[] = [];

    constructor(private m: Metrics, private festive: boolean) {
        this.sky = new NightSky(m, { shootingStars: true, sceneryMargin: 60 * m.u, sceneryKey: 'menu-scenery' });
        this.view.addChild(this.sky.view, this.fx);

        for (const theme of THEMES) {
            if (!theme.world) continue;
            const world = theme.world(m, this.sky);
            world.setVisibility(0);
            this.worlds.set(theme.id, { world, v: { a: 0 } });
        }
        this.worlds.set(TEASER_ID, { world: mysteryWorld(m, this.sky), v: { a: 0 } });

        const u = m.u;
        this.sparks = new Emitter(tex('spark'), { life: [900, 1600], speed: [90 * u, 260 * u], gravity: 120 * u, scale: [0.35 * u, 0.7 * u], scaleEnd: 0.2, spin: [-180, 180] });
        this.glows = new Emitter(tex('glow-dot'), { life: [700, 1300], speed: [60 * u, 220 * u], gravity: 90 * u, scale: [0.12 * u, 0.25 * u], scaleEnd: 0.3 });
        this.trail = new Emitter(tex('glow-dot'), { life: [300, 600], speedY: [10 * u, 40 * u], speedX: [-10 * u, 10 * u], scale: [0.08 * u, 0.14 * u], alpha: 0.8 });
        this.fx.addChild(this.trail.view, this.glows.view, this.sparks.view);

        if (festive) {
            this.sky.setDarkness(0.25);
            this.fireworkTimer = gsap.delayedCall(0.8, () => this.loopFireworks());
        }
    }

    // Hiện thế giới của theme đang được chọn (null = bầu trời trống)
    private dark = { v: 0 };
    private darkTween?: gsap.core.Tween;

    // Chuyển mềm giữa các thế giới: cái cũ mờ dần cùng lúc cái mới hiện dần (cùng nhịp, cùng đường cong)
    focus(id: string | null) {
        this.worlds.forEach((w, key) => {
            const target = key === id ? 1 : 0;
            w.tween?.kill();
            w.tween = gsap.to(w.v, { a: target, duration: 1, ease: 'sine.inOut', onUpdate: () => w.world.setVisibility(w.v.a) });
        });
        if (!this.festive) {
            this.darkTween?.kill();
            this.darkTween = gsap.to(this.dark, { v: id === TEASER_ID ? 0.45 : 0, duration: 1, ease: 'sine.inOut', onUpdate: () => this.sky.setDarkness(this.dark.v) });
        }
    }

    private loopFireworks() {
        this.firework();
        if (Math.random() < 0.35) gsap.delayedCall(0.25, () => this.firework());
        this.fireworkTimer = gsap.delayedCall(1 + Math.random() * 1.4, () => this.loopFireworks());
    }

    // Một quả pháo hoa: bay lên kéo vệt sáng rồi nổ tung
    firework(x = this.m.W * (0.12 + Math.random() * 0.76), y = this.m.H * (0.12 + Math.random() * 0.3)) {
        const { H, u } = this.m;
        const palettes = [[0xfde68a, 0xfbbf24, 0xffffff], [0xf9a8d4, 0xf472b6, 0xfff1fb], [0xc4b5fd, 0xa5b4fc, 0xffffff], [0x99f6e4, 0x5eead4, 0xffffff]];
        const tint = palettes[Math.floor(Math.random() * palettes.length)];
        const rocket = new Sprite(tex('glow-dot'));
        rocket.anchor.set(0.5); rocket.blendMode = 'add'; rocket.tint = tint[0];
        rocket.scale.set(0.25 * u);
        rocket.position.set(x + (Math.random() - 0.5) * 60 * u, H + 10);
        this.fx.addChild(rocket);
        this.tweens.push(gsap.to(rocket, {
            x, y, duration: 0.9 + Math.random() * 0.4, ease: 'power2.out',
            onUpdate: () => this.trail.emit(rocket.x, rocket.y, 1),
            onComplete: () => {
                rocket.destroy();
                this.sparks.cfg.tint = tint;
                this.glows.cfg.tint = tint;
                this.sparks.emit(x, y, 26);
                this.glows.emit(x, y, 40);
                play('scored.mp3', 0.12);
            },
        }));
        if (this.tweens.length > 30) this.tweens = this.tweens.filter((t) => t.isActive());
    }

    // Mưa sao nhỏ (khi tìm ra lời nhắn bí mật)
    burst(x: number, y: number) {
        this.sparks.cfg.tint = [0xfde68a, 0xf9a8d4, 0xffffff];
        this.glows.cfg.tint = [0xfde68a, 0xf9a8d4, 0xffffff];
        this.sparks.emit(x, y, 30);
        this.glows.emit(x, y, 30);
    }

    update(dtMs: number) {
        this.sky.update(dtMs);
        this.worlds.forEach((w) => w.world.update?.(dtMs));
        this.sparks.update(dtMs);
        this.glows.update(dtMs);
        this.trail.update(dtMs);
    }

    setPointer(nx: number, ny: number) {
        this.sky.setPointer(nx, ny);
    }

    destroy() {
        this.fireworkTimer?.kill();
        this.darkTween?.kill();
        this.tweens.forEach((t) => t.kill());
        this.worlds.forEach((w) => { w.tween?.kill(); w.world.destroy(); });
        this.sparks.destroy();
        this.glows.destroy();
        this.trail.destroy();
        this.sky.destroy();
        this.view.destroy({ children: true });
    }
}

// Thế giới của chương chưa mở: sương mù trôi chậm phủ lên đồi, che bớt bầu trời
function mysteryWorld(m: Metrics, sky: NightSky): ThemeWorld {
    const { W, H, u } = m;
    const layer = new Container();
    sky.front.addChild(layer);
    const veil = new Sprite(Texture.WHITE);
    veil.tint = 0x05040f; veil.alpha = 0.35;
    veil.width = W + 200; veil.height = H + 200; veil.position.set(-100, -100);
    layer.addChild(veil);
    const tweens: gsap.core.Tween[] = [];
    for (let i = 0; i < 7; i++) {
        const fog = new Sprite(tex('soft-glow'));
        fog.anchor.set(0.5); fog.tint = [0x6b6fa8, 0x8b86c4, 0x4c4f80][i % 3]; fog.alpha = 0.22;
        fog.position.set(W * (i / 6), H * (0.72 + Math.random() * 0.25));
        fog.scale.set(((260 + Math.random() * 160) * u) / 128, ((90 + Math.random() * 50) * u) / 128);
        layer.addChild(fog);
        tweens.push(gsap.to(fog, { x: fog.x + (60 + Math.random() * 60) * u, duration: 9 + Math.random() * 6, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    }
    return {
        setVisibility: (a) => { layer.alpha = a; layer.visible = a > 0.001; },
        destroy: () => { tweens.forEach((t) => t.kill()); layer.destroy({ children: true }); },
    };
}
