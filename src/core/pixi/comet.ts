import { Container, Sprite } from 'pixi.js';
import { tex } from './art';
import type { Emitter } from './particles';

// Sao băng dùng chung (menu + màn chơi). Gồm nhiều lớp cộng sáng:
//   tail : dải sáng màu thon dần        core : lõi trắng nóng giữa đuôi
//   glow : quầng sáng "thở" nhẹ ở đầu   head : ngôi sao (hoặc trái tim) xoay chậm
// Bụi lấp lánh phía sau dùng một Emitter dùng chung (truyền vào), đỡ tốn hơn mỗi sao một bộ phát.
export class Comet {
    readonly view = new Container();
    private tail: Sprite;
    private core: Sprite;
    private glow: Sprite;
    private head: Sprite;
    private born = 0;
    private traveled = 0;
    private len = 0;
    private lastX: number;
    private lastY: number;
    private spin = Math.random() * 360;
    private dustAcc = 0;
    tailTint = 0xffffff;

    constructor(x: number, y: number, public size: number, private u: number, private dust?: Emitter, texture = 'star5') {
        const mk = (key: string, add: boolean) => {
            const s = new Sprite(tex(key));
            s.anchor.set(0.5);
            if (add) s.blendMode = 'add';
            this.view.addChild(s);
            return s;
        };
        this.tail = mk('comet-tail', true);
        this.core = mk('comet-core', true);
        this.tail.anchor.set(246 / 256, 0.5);
        this.core.anchor.set(246 / 256, 0.5);
        this.glow = mk('glow-dot', true);
        this.head = mk(texture, false);
        this.lastX = x;
        this.lastY = y;
        this.view.alpha = 0;
    }

    setColors(tailTint: number, headTint: number) {
        this.tailTint = tailTint;
        this.tail.tint = tailTint;
        this.glow.tint = tailTint;
        this.head.tint = headTint;
        return this;
    }

    setTexture(key: string) {
        this.head.texture = tex(key);
        return this;
    }

    // x, y: vị trí đầu sao. vx, vy: vận tốc (chỉ dùng để lấy hướng & độ dài đuôi). dtMs: thời gian khung hình.
    update(
        x: number, y: number, vx: number, vy: number, dtMs: number,
        { alpha = 1, tailScale = 1, headScale = 1, spinHead = true, len: fixedLen, maxLen = 340 }:
            { alpha?: number; tailScale?: number; headScale?: number; spinHead?: boolean; len?: number; maxLen?: number } = {},
    ) {
        const { u } = this;
        const f = dtMs / 16.667;
        this.born += dtMs;
        this.traveled += Math.hypot(x - this.lastX, y - this.lastY);
        this.lastX = x; this.lastY = y;

        const v = Math.hypot(vx, vy);
        const dir = Math.atan2(vy, vx);
        this.view.alpha = alpha * smooth(this.born / 260); // hiện dần mềm
        // Đuôi: dài theo tốc độ (hoặc cố định), không dài hơn quãng đã bay; làm mượt để không co giật
        const target = Math.min(fixedLen ?? Math.max(v * 30, 70 * u), maxLen * u, this.traveled + 10 * u) * tailScale;
        this.len += (target - this.len) * (1 - Math.pow(0.82, f));
        const thick = (this.size * u * 2.4) / 16; // phần sáng của texture đuôi dày 16
        this.tail.position.set(x, y); this.tail.rotation = dir; this.tail.scale.set(this.len / 256, thick); this.tail.alpha = 0.9;
        this.core.position.set(x, y); this.core.rotation = dir; this.core.scale.set((this.len * 0.75) / 256, thick);
        const breathe = 1 + 0.06 * Math.sin(performance.now() * 0.004 + this.spin);
        this.glow.position.set(x, y); this.glow.scale.set((this.size * u * 5.5 * breathe) / 64); this.glow.alpha = 0.85;
        if (spinHead) this.spin += 0.5 * f;
        this.head.position.set(x, y);
        this.head.angle = spinHead ? this.spin : 0;
        this.head.scale.set((this.size * u * 1.05 * headScale) / 12);

        // Bụi lấp lánh rắc phía sau (~14 hạt/giây)
        if (this.dust && tailScale > 0.5) {
            this.dustAcc += dtMs / 70;
            this.dust.cfg.tint = [this.tailTint]; // bụi cùng màu đuôi
            while (this.dustAcc >= 1) { this.dust.emit(x, y, 1); this.dustAcc -= 1; }
        }
    }

    stopDust() {
        this.dust = undefined;
    }

    destroy() {
        this.view.destroy({ children: true });
    }
}

// Đường cong mềm 0→1 (smoothstep) cho hiện/ẩn dần
export function smooth(t: number) {
    t = Math.min(1, Math.max(0, t));
    return t * t * (3 - 2 * t);
}
