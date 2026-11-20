import gsap from 'gsap';
import { Container, Sprite } from 'pixi.js';
import { tex } from '../../core/pixi/art';

export type Emotion = 'normal' | 'happy' | 'sad';

// Kabigon "rig bằng code": mỗi bộ phận là một sprite riêng, gắn vào khớp (vai, gốc tai, chân)
// rồi chuyển động bằng toán + GSAP — mượt như hoạt ảnh xương (Spine) mà không cần phần mềm ngoài.
//
//   root (vị trí, hướng mặt, nghiêng người)
//    ├─ body (co giãn khi thở / nhún)
//    │   ├─ earL, earR          (đung đưa, vểnh lên khi vui, cụp khi buồn)
//    │   ├─ torso, belly, face
//    │   └─ armL, armR          (vung khi đi, giơ lên khi vui)
//    └─ footL, footR            (trước thân để thấy đệm thịt hồng; nhấc lên khi bước)
//
// Toạ độ các bộ phận theo khung vẽ gốc 110x110, tâm (55,57) — như bản vẽ Canvas ban đầu.
export class Kabigon {
    readonly view = new Container();
    private body = new Container();
    private earL: Container;
    private earR: Container;
    private armL: Container;
    private armR: Container;
    private footL: Container;
    private footR: Container;
    private face: Sprite;
    private t = Math.random() * 10;
    private walk = 0;
    private lean = 0;
    private move = 0; // 0..1 mức độ đang di chuyển (làm mượt)
    private emotion: Emotion = 'normal';
    // các giá trị do GSAP điều khiển (vui / buồn)
    private pose = { arms: 0, ears: 0, hop: 0, squash: 0 };

    constructor() {
        const part = (key: string, pivotX: number, pivotY: number, parent: Container) => {
            const c = new Container();
            const s = new Sprite(tex(`kb-${key}`));
            s.anchor.set(55 / 110, 57 / 110);
            s.position.set(-pivotX, -pivotY);
            c.position.set(pivotX, pivotY);
            c.addChild(s);
            parent.addChild(c);
            return c;
        };
        this.view.addChild(this.body);
        this.body.pivot.set(0, 42); // co giãn quanh đáy bụng
        this.body.position.set(0, 42);
        this.earL = part('earL', -12, -24, this.body);
        this.earR = part('earR', 12, -24, this.body);
        part('body', 0, 0, this.body);
        part('belly', 0, 0, this.body);
        const faceBox = part('face-normal', 0, 0, this.body);
        this.face = faceBox.children[0] as Sprite;
        this.armL = part('armL', -28, 5, this.body);
        this.armR = part('armR', 28, 5, this.body);
        this.footL = part('footL', -22, 35, this.view);
        this.footR = part('footR', 22, 35, this.view);
    }

    setEmotion(e: Emotion) {
        if (e === this.emotion) return;
        this.emotion = e;
        this.face.texture = tex(`kb-face-${e}`);
        gsap.killTweensOf(this.pose);
        if (e === 'happy') {
            // giơ tay + vểnh tai + nhún nhảy một cái
            gsap.to(this.pose, { arms: 1, ears: 1, duration: 0.18, ease: 'back.out(2)' });
            gsap.timeline()
                .to(this.pose, { squash: 1, duration: 0.08, ease: 'power2.out' })
                .to(this.pose, { squash: -0.6, hop: 1, duration: 0.16, ease: 'power2.out' })
                .to(this.pose, { squash: 0, hop: 0, duration: 0.3, ease: 'bounce.out' });
        } else if (e === 'sad') {
            gsap.to(this.pose, { arms: -1, ears: -1, squash: 0.4, hop: 0, duration: 0.3, ease: 'power2.out' });
        } else {
            gsap.to(this.pose, { arms: 0, ears: 0, squash: 0, hop: 0, duration: 0.45, ease: 'power2.inOut' });
        }
    }

    // vx: tốc độ ngang (px mỗi khung 60fps, đã nhân tỉ lệ u), dtMs: thời gian khung hình
    update(dtMs: number, vx: number, u: number) {
        const dt = dtMs / 1000;
        this.t += dt;
        const speed = Math.min(1, Math.abs(vx) / (6 * u));
        this.move += (speed - this.move) * (1 - Math.pow(0.001, dt));
        this.walk += dt * (6 + 10 * this.move);
        const m = this.move;
        const p = this.pose;

        // Thở + nhún
        const breathe = Math.sin(this.t * 2.2);
        const sq = p.squash;
        this.body.scale.set(1 - 0.012 * breathe + 0.12 * sq, 1 + 0.025 * breathe - 0.14 * sq);
        const stepBob = -Math.abs(Math.sin(this.walk)) * 3 * m;
        this.body.y = 42 + stepBob - p.hop * 14;

        // Chân bước luân phiên
        this.footL.y = 35 - Math.max(0, Math.sin(this.walk)) * 5 * m;
        this.footR.y = 35 - Math.max(0, -Math.sin(this.walk)) * 5 * m;
        this.footL.rotation = Math.sin(this.walk) * 0.15 * m;
        this.footR.rotation = -Math.sin(this.walk) * 0.15 * m;

        // Tay: đung đưa nhẹ, vung khi đi, giơ lên khi vui, buông khi buồn
        const swing = Math.sin(this.walk) * 0.45 * m;
        const idle = Math.sin(this.t * 2) * 0.05;
        this.armL.rotation = idle + swing + p.arms * 0.6;
        this.armR.rotation = -idle + swing - p.arms * 0.6;

        // Tai: đung đưa, vểnh khi vui, cụp khi buồn
        const flick = Math.sin(this.t * 1.7) * 0.06;
        this.earL.rotation = flick + p.ears * 0.25;
        this.earR.rotation = -flick - p.ears * 0.25;

        // Nghiêng người theo hướng chạy
        const targetLean = Math.max(-0.14, Math.min(0.14, vx * 0.02 / u));
        this.lean += (targetLean - this.lean) * (1 - Math.pow(0.0005, dt));
        this.view.rotation = this.lean;
    }

    destroy() {
        gsap.killTweensOf(this.pose);
        this.view.destroy({ children: true });
    }
}
