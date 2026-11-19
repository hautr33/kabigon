import gsap from 'gsap';
import { ShockwaveFilter } from 'pixi-filters';
import { Container, Rectangle, Sprite, Text } from 'pixi.js';
import { play, sound } from '../../core/audio';
import type { Metrics } from '../../core/metrics';
import { tex } from '../../core/pixi/art';
import { Comet } from '../../core/pixi/comet';
import { Emitter } from '../../core/pixi/particles';
import { NightSky } from '../../core/pixi/sky';
import { bumpPulse, useHud } from '../../store/hud';
import { HeartCutscene, LanternCutscene, NameConstellationCutscene, type CutsceneCtx } from './cutscenes';
import { CONSTELLATION_WORD, FLOATING } from './dialogue';
import { Kabigon } from './kabigon';
import type { StarLevelConfig } from './levels';

// Sự kiện game báo sang React (React lo phần chữ, nút, khung thoại). HUD thì ghi thẳng vào store Zustand.
export type GameEvents = {
    float: (text: string, x: number, y: number) => void;
    lose: () => void;
    win: () => void;
    winDialog: () => void; // cutscene tới lúc hiện khung thoại
    winText: () => void; // cutscene tới lúc hiện chữ trên màn hình
};

type Star = { x: number; y: number; vx: number; vy: number; size: number; hue: number; rainbow: boolean; caught: boolean; missed: boolean; alpha: number; comet: Comet };

const hsl = (h: number, s: number, l: number) => {
    h = ((h % 360) + 360) % 360;
    const a = s * Math.min(l, 1 - l);
    const f = (n: number) => { const k = (n + h / 30) % 12; return l - a * Math.max(-1, Math.min(k - 3, 9 - k, 1)); };
    return (Math.round(f(0) * 255) << 16) | (Math.round(f(8) * 255) << 8) | Math.round(f(4) * 255);
};

const LIVES = 6;

export class StarCatchGame {
    readonly view = new Container();
    readonly sky: NightSky;
    private actors = new Container(); // nhân vật, sao băng
    private fx = new Container(); // pháo hoa, vòng sáng
    private kabi = new Kabigon();
    private net = new Sprite(tex('net'));
    private zzz: Text[];
    private netTrail: Emitter;
    private netSparkle: Emitter;
    private burst: Emitter;
    private sparks: Emitter;
    private dust: Emitter;
    private hearts?: Emitter;
    private burstTint = 0xffffff;
    private stars: Star[] = [];
    private cutscene?: LanternCutscene | HeartCutscene | NameConstellationCutscene;
    private shock?: ShockwaveFilter;
    private m: Metrics;

    // trạng thái
    score = 0;
    lives = LIVES;
    timeLeft: number;
    running = false;
    over = false;
    win = false;
    private winTime = 0;
    private spawnT = 0;
    private gameT = 0;
    private emotionMs = 0;
    private heartMode = false;
    private infLives = false;
    private infTime = false;
    private shownTime = -1;
    private secret = '';
    private targetX: number;
    private chibiX: number;
    private face = 1;
    private keys = { left: false, right: false };
    private netY = 0;

    constructor(m: Metrics, private ev: GameEvents, private cfg: StarLevelConfig) {
        this.m = m;
        this.timeLeft = cfg.time;
        this.sky = new NightSky(m);
        const { u } = m;
        this.targetX = this.chibiX = m.W / 2;

        this.net.anchor.set(0.5, 55 / 120);
        this.zzz = [16, 22].map((size, i) => {
            const t = new Text({ text: i ? 'Z' : 'z', style: { fontFamily: 'Quicksand', fontWeight: '700', fontSize: size * u, fill: 0xffffff } });
            t.anchor.set(0, 1);
            t.alpha = 0.8;
            return t;
        });

        this.netTrail = new Emitter(tex('glow-dot'), { life: 160, scale: 0.3 * u, alpha: 0.35, tint: [0xfde68a] });
        this.netSparkle = new Emitter(tex('glow-dot'), { life: 140, scale: [0.04 * u, 0.1 * u], tint: [0xffffff] });
        const tint = () => this.burstTint;
        this.burst = new Emitter(tex('glow-dot'), { life: 670, speed: [40 * u, 200 * u], gravity: 180 * u, scale: 0.24 * u, tint });
        this.sparks = new Emitter(tex('spark'), { life: 850, speed: [60 * u, 260 * u], spin: [-360, 360], scale: 0.6 * u, tint });
        this.dust = new Emitter(tex('glow-dot'), { life: [600, 1100], speedX: [-8 * u, 8 * u], speedY: [2 * u, 14 * u], scale: [0.06 * u, 0.1 * u], alpha: 0.55 });

        this.actors.addChild(this.dust.view, this.netTrail.view, this.kabi.view, ...this.zzz, this.net, this.netSparkle.view);
        this.fx.addChild(this.burst.view, this.sparks.view);
        this.view.addChild(this.sky.view, this.actors, this.fx);
        this.emitHud();
    }

    // ------------------------------------------------------------------
    // Điều khiển từ React
    // ------------------------------------------------------------------
    setPointerX(x: number) { this.targetX = x; }
    setKey(dir: 'left' | 'right', down: boolean) { this.keys[dir] = down; }

    start() {
        this.reset();
        this.running = true;
        const bgm = sound('bgm.mp3', { volume: 0.4, loop: true });
        if (!bgm.playing()) bgm.play();
    }

    reset() {
        this.score = 0;
        this.lives = LIVES;
        this.timeLeft = this.cfg.time;
        this.running = false;
        this.over = false;
        this.win = false;
        this.winTime = 0;
        this.spawnT = 0;
        this.gameT = 0;
        this.kabi.setEmotion('normal');
        this.heartMode = false;
        this.infLives = false;
        this.infTime = false;
        this.secret = '';
        this.stars.forEach((s) => s.comet.destroy());
        this.stars = [];
        this.cutscene?.destroy();
        this.cutscene = undefined;
        this.hearts?.destroy();
        this.hearts = undefined;
        this.kabi.view.alpha = 1;
        this.emitHud();
    }

    // Trứng phục sinh: gõ "tram" khi đang chơi
    onKeyChar(ch: string) {
        if (this.win || !this.running || ch.length !== 1) return;
        this.secret = (this.secret + ch.toLowerCase()).slice(-4);
        if (this.secret === 'tram' && !this.heartMode) {
            this.heartMode = true;
            play('star_woosh.mp3', 0.6);
            this.score = this.cfg.target;
            this.stars.forEach((st) => this.tintStar(st));
            this.emitHud();
            this.startWin();
        }
    }

    // ------------------------------------------------------------------
    // Vòng lặp
    // ------------------------------------------------------------------
    update(dtMs: number) {
        const dt = Math.min(dtMs, 50);
        const f = dt / 16.667;
        const { W, u, ground } = this.m;
        this.sky.update(dt);

        if (this.running && !this.win) {
            this.spawnT += dt; this.gameT += dt;
            const interval = Math.max(500, 1500 - this.score * 25);
            while (this.spawnT >= interval) { this.spawnStar(); this.spawnT -= interval; }
            if (!this.infTime) {
                this.timeLeft -= dt / 1000;
                if (Math.max(0, Math.ceil(this.timeLeft)) !== this.shownTime) this.emitHud();
                if (this.timeLeft <= 0 && !this.over) this.triggerLose();
            }
        }

        // Bàn phím
        const kb = 900 * u * (dt / 1000);
        if (this.keys.left) this.targetX -= kb;
        if (this.keys.right) this.targetX += kb;
        this.targetX = Math.min(Math.max(this.targetX, 50 * u), W - 50 * u);

        // Kabigon đi theo
        const prevX = this.chibiX;
        this.chibiX += (this.targetX - this.chibiX) * (1 - Math.pow(0.88, f));
        const vx = (this.chibiX - prevX) / Math.max(0.01, f);
        const speedX = this.targetX - this.chibiX;
        if (speedX > 1.5 * u) this.face = 1; else if (speedX < -1.5 * u) this.face = -1;
        if (this.emotionMs > 0) { this.emotionMs -= dt; if (this.emotionMs <= 0) this.kabi.setEmotion('normal'); }
        const gy = ground(this.chibiX);
        const chibiY = gy - 18 * u;
        // vợt bồng bềnh nhẹ theo bước đi
        const now = performance.now();
        const netY = gy - 55 * u + Math.sin(now * 0.004) * 1.5 * u;
        this.netY = netY;

        this.kabi.update(dt, vx, u);
        this.kabi.view.position.set(this.chibiX, chibiY);
        this.kabi.view.scale.set(this.face * u, u);
        if (this.win && !this.cutscene?.keepKabigon) this.kabi.view.alpha = Math.max(0, 1 - this.winTime / 2);
        const zOff = Math.sin(now * 0.002) * 4 * u;
        const showZ = this.emotionMs <= 0 && !this.win;
        this.zzz[0].visible = this.zzz[1].visible = showZ;
        this.zzz[0].position.set(this.chibiX - 35 * u, chibiY - 35 * u + zOff);
        this.zzz[1].position.set(this.chibiX - 45 * u, chibiY - 50 * u + zOff * 1.2);

        this.net.visible = !this.win;
        this.net.position.set(this.chibiX, netY);
        this.net.scale.set(u);
        this.net.rotation = -vx * 0.01 / u; // vợt nghiêng theo quán tính
        if (!this.win) {
            this.netTrail.emit(this.chibiX, netY, 1);
            for (let i = 0; i < 2; i++) this.netSparkle.emit(this.chibiX + (Math.random() - 0.5) * 70 * u, netY + (Math.random() - 0.5) * 40 * u, 1);
        }
        [this.netTrail, this.netSparkle, this.burst, this.sparks, this.dust].forEach((e) => e.update(dt));
        this.hearts?.update(dt);

        this.updateStars(f, dt, netY);

        if (this.win) {
            this.winTime += dt / 1000;
            this.cutscene?.update(dt);
        }
    }

    // ------------------------------------------------------------------
    // Sao băng
    // ------------------------------------------------------------------
    private spawnStar() {
        const { W, H, u, wide } = this.m;
        const fromLeft = Math.random() < 0.5;
        let sx = fromLeft ? -20 : W + 20;
        let sy = Math.random() * H * 0.25;
        // Màn hình rộng (PC): một nửa số sao rơi từ mép trên để phủ đều cả màn
        if (wide && Math.random() < 0.5) {
            sx = fromLeft ? Math.random() * W * 0.6 : W - Math.random() * W * 0.6;
            sy = -20;
        }
        const angle = fromLeft ? Math.random() * 0.3 + 0.5 : Math.PI - Math.random() * 0.3 - 0.5;
        const rainbow = Math.random() < 0.01;
        const s = this.score;
        const mult = s >= 36 ? 1.6 : s >= 24 ? 1.3 : s >= 12 ? 1.15 : 1;
        const speed = (rainbow ? Math.random() * 2 + 3.5 : Math.random() * 2 + 1.5) * mult * u;
        const size = rainbow ? Math.random() * 2 + 6 : Math.random() * 2 + 3.5;
        const hue = this.heartMode ? 330 : Math.random() * 60 + 260;
        const comet = new Comet(sx, sy, size, u, this.dust, this.heartMode ? 'heart' : 'star5');
        const st: Star = { x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, size, hue, rainbow, caught: false, missed: false, alpha: 1, comet };
        this.actors.addChildAt(comet.view, 1);
        this.tintStar(st);
        this.stars.push(st);
    }

    private tintStar(st: Star) {
        if (this.heartMode) st.comet.setTexture('heart').setColors(hsl(330, 1, 0.75), hsl(330, 1, 0.85));
        else st.comet.setColors(hsl(st.hue, 0.95, 0.72), hsl(st.hue, 1, 0.96));
    }

    private updateStars(f: number, dt: number, netY: number) {
        const { W, H, u } = this.m;
        for (let i = this.stars.length - 1; i >= 0; i--) {
            const st = this.stars[i];
            if (st.rainbow && !this.heartMode) { st.hue = (this.gameT * 0.3) % 360; this.tintStar(st); }
            if (st.caught) {
                st.alpha -= 0.08 * f; st.y -= 2 * u * f;
            } else if (st.missed) {
                st.alpha -= 0.05 * f;
            } else {
                st.x += st.vx * f; st.y += st.vy * f; st.vy += 0.025 * u * f;
                if (st.y > H + 20 * u) {
                    if (st.x > 0 && st.x < W) this.missStar(st);
                    else { this.removeStar(i); continue; }
                } else if (st.x < -100 * u || st.x > W + 100 * u) { this.removeStar(i); continue; }
                if (!st.missed && !this.win && Math.hypot(st.x - this.chibiX, st.y - netY) < 55 * u) {
                    if (this.catchStar(st)) return;
                }
            }
            if (st.alpha <= 0) { this.removeStar(i); continue; }
            st.comet.update(st.x, st.y, st.vx, st.vy, dt, {
                alpha: st.alpha, tailScale: st.caught ? 0.4 : 1, headScale: st.caught ? 1.7 : 1, spinHead: !this.heartMode,
            });
        }
    }

    private removeStar(i: number) {
        this.stars[i].comet.destroy();
        this.stars.splice(i, 1);
    }

    private setEmotion(e: 'happy' | 'sad') {
        this.kabi.setEmotion(e);
        this.emotionMs = 670;
    }

    private missStar(st: Star) {
        st.missed = true;
        st.comet.stopDust();
        if (this.win) return;
        play('missed.mp3', 0.5);
        this.setEmotion('sad');
        if (!this.infLives) {
            this.lives = Math.max(0, this.lives - 1);
            this.emitHud();
            bumpPulse('lives');
            gsap.fromTo(this.view, { x: -7 }, { x: 0, duration: 0.45, ease: 'elastic.out(1, 0.3)' });
            if (this.lives <= 0 && !this.over) this.triggerLose();
        }
    }

    // trả về true nếu vừa thắng
    private catchStar(st: Star): boolean {
        const { u, ground } = this.m;
        st.caught = true;
        st.comet.stopDust();
        play('scored.mp3', 0.5);
        this.setEmotion('happy');
        this.catchFlash(st.x, st.y, st.comet.tailTint);

        if (st.rainbow) {
            if (!this.infLives) { this.infLives = true; this.ev.float(FLOATING.rainbow, this.chibiX, ground(this.chibiX) - 68 * u); }
            this.infTime = true;
        }
        this.score += 1;
        this.emitHud();
        bumpPulse('score');

        this.burstTint = this.heartMode ? hsl(330, 1, 0.8) : hsl(st.hue, 0.9, 0.85);
        this.burst.emit(st.x, st.y, 20);
        this.sparks.emit(st.x, st.y, 6);

        if (this.score >= this.cfg.target) { this.startWin(); return true; }
        if (this.cfg.bonusAt.includes(this.score) && !this.infTime) {
            this.timeLeft += 10;
            this.emitHud();
            bumpPulse('time');
            this.ev.float(FLOATING.bonus, this.chibiX, ground(this.chibiX) - 90 * u);
        }
        return false;
    }

    // Chớp sáng + vòng sáng + sóng lan (ShockwaveFilter) khi bắt được sao
    private catchFlash(x: number, y: number, tint: number) {
        const { u, W, H } = this.m;
        const ring = new Sprite(tex('ring'));
        ring.anchor.set(0.5); ring.blendMode = 'add'; ring.tint = tint; ring.position.set(x, y); ring.scale.set(0.4 * u);
        const flash = new Sprite(tex('glow-dot'));
        flash.anchor.set(0.5); flash.blendMode = 'add'; flash.position.set(x, y); flash.scale.set(1.2 * u);
        this.fx.addChild(ring, flash);
        gsap.to(ring.scale, { x: 3.2 * u, y: 3.2 * u, duration: 0.45, ease: 'power3.out' });
        gsap.to(ring, { alpha: 0, duration: 0.45, ease: 'power2.out', onComplete: () => ring.destroy() });
        gsap.to(flash.scale, { x: 2.6 * u, y: 2.6 * u, duration: 0.26, ease: 'power2.out' });
        gsap.to(flash, { alpha: 0, duration: 0.26, ease: 'power2.out', onComplete: () => flash.destroy() });

        // Gợn sóng không gian nhẹ quanh chỗ bắt sao
        if (!this.shock) {
            this.shock = new ShockwaveFilter({ center: { x, y }, amplitude: 10 * u, wavelength: 90 * u, speed: 520 * u, brightness: 1.15, radius: 260 * u, time: 0 });
        }
        const shock = this.shock;
        shock.center = { x, y };
        shock.time = 0;
        this.actors.filters = [shock];
        this.actors.filterArea = new Rectangle(0, 0, W, H);
        gsap.killTweensOf(shock);
        gsap.to(shock, { time: 0.55, duration: 0.55, ease: 'none', onComplete: () => { this.actors.filters = []; } });
    }

    // ------------------------------------------------------------------
    // Thắng / thua
    // ------------------------------------------------------------------
    private triggerLose() {
        this.over = true;
        this.running = false;
        gsap.delayedCall(0.5, () => this.ev.lose());
    }

    private startWin() {
        this.win = true;
        this.over = true;
        this.winTime = 0;
        const ctx: CutsceneCtx = {
            m: () => this.m,
            sky: this.sky,
            sfx: (n) => (n === 'wind' ? play('wind_shimmer.mp3', 0.5) : play('star_woosh.mp3', 0.6)),
            onDialog: () => this.ev.winDialog(),
            onText: () => this.ev.winText(),
            from: { x: this.chibiX, y: this.netY },
            dust: this.dust,
        };
        const kind = this.cfg.cutscene;
        this.cutscene = kind === 'constellation' ? new NameConstellationCutscene(ctx, CONSTELLATION_WORD) : kind === 'heart' ? new HeartCutscene(ctx) : new LanternCutscene(ctx);
        this.view.addChildAt(this.cutscene.back, 1); // ngay sau bầu trời
        this.view.addChild(this.cutscene.front);
        if (this.cutscene.keepKabigon) { this.kabi.setEmotion('happy'); this.emotionMs = Infinity; }
        this.ev.win();
    }

    goldBurst() {
        const { W, H } = this.m;
        this.burstTint = hsl(45, 1, 0.75);
        for (let i = 0; i < 4; i++) {
            const x = W / 2 + (Math.random() - 0.5) * 200, y = H * 0.4 + (Math.random() - 0.5) * 100;
            this.burst.emit(x, y, 10);
            this.sparks.emit(x, y, 4);
        }
    }

    // Mưa trái tim khi bé đồng ý :3
    celebrate() {
        const { W, H, u } = this.m;
        this.hearts = new Emitter(tex('heart'), {
            life: [5000, 8000], speedY: [-140 * u, -60 * u], speedX: [-20 * u, 20 * u], spin: [-25, 25],
            scale: [0.5 * u, 1.2 * u], scaleEnd: 0.8, alpha: 0.9, tint: [0xf9a8d4, 0xfbcfe8, 0xf472b6, 0xfde68a],
            rate: 11, area: () => ({ x: Math.random() * W, y: H + 20 * u }),
        });
        this.fx.addChild(this.hearts.view);
        this.burstTint = hsl(330, 1, 0.8);
        this.burst.emit(W / 2, H * 0.4, 60);
    }

    private emitHud() {
        this.shownTime = Math.max(0, Math.ceil(this.timeLeft));
        useHud.setState({
            score: this.score, target: this.cfg.target, lives: this.lives, time: this.shownTime,
            infLives: this.infLives, infTime: this.infTime,
        });
    }

    resize(m: Metrics) {
        this.m = m;
        this.sky.resize(m);
    }

    destroy() {
        this.stars.forEach((s) => s.comet.destroy());
        this.cutscene?.destroy();
        [this.netTrail, this.netSparkle, this.burst, this.sparks, this.dust].forEach((e) => e.destroy());
        this.hearts?.destroy();
        this.kabi.destroy();
        this.sky.destroy();
        if (this.shock) gsap.killTweensOf(this.shock);
        gsap.killTweensOf(this.view);
        this.view.destroy({ children: true });
    }
}
