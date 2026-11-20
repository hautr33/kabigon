import gsap from 'gsap';
import { Container, Sprite, Text } from 'pixi.js';
import type { Metrics } from '../../core/metrics';
import { tex } from '../../core/pixi/art';
import type { NightSky } from '../../core/pixi/sky';
import type { ThemeWorld } from '../index';

// Thế giới của theme: trăng tròn + Kabigon ngủ trên đồi.
// Dùng làm nền khi rê chuột vào ảnh polaroid ở home và làm nền màn chọn màn.
export function kabigonWorld(m: Metrics, sky: NightSky): ThemeWorld {
    const { W, H, u } = m;
    const far = new Container(); // tầng xa (trăng) — trôi theo parallax của bầu trời
    const near = new Container(); // tầng đồi (Kabigon)
    sky.far.addChild(far);
    sky.near.addChild(near);

    const moonX = W * 0.85, moonY = H * 0.17, moonR = 55 * u;
    const halo = new Sprite(tex('soft-glow'));
    halo.anchor.set(0.5); halo.tint = 0xc8dcff; halo.blendMode = 'add'; halo.alpha = 0.5;
    halo.position.set(moonX, moonY); halo.scale.set((moonR * 7) / 256);
    const moon = new Sprite(tex('moon'));
    moon.anchor.set(0.5); moon.position.set(moonX, moonY); moon.scale.set(moonR / 110);
    far.addChild(halo, moon);

    const kx = W * 0.84, ky = m.ground(kx) - 18 * u;
    const kabi = new Sprite(tex('kabi-normal'));
    kabi.anchor.set(0.5, 57 / 110); kabi.position.set(kx, ky); kabi.scale.set(-u, u);
    near.addChild(kabi);

    const tweens: gsap.core.Animation[] = [
        gsap.to(halo, { alpha: 0.75, duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        gsap.to(kabi.scale, { y: u * 1.03, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        gsap.to(kabi, { y: ky - 1.5 * u, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
    ];
    [['z', 15, 0], ['Z', 20, 0.8], ['z', 13, 1.6]].forEach(([str, size, delay]) => {
        const t = new Text({ text: str as string, style: { fontFamily: 'Quicksand', fontWeight: '700', fontSize: (size as number) * u, fill: 0xe9d5ff, stroke: { color: 0x2b2440, width: 3 * u } } });
        t.alpha = 0;
        near.addChild(t);
        tweens.push(gsap.fromTo(t, { x: kx + 30 * u, y: ky - 40 * u, alpha: 0.9 }, { x: kx + 48 * u, y: ky - 80 * u, alpha: 0, duration: 2.4, delay: delay as number, repeat: -1, ease: 'sine.out' }));
    });

    return {
        setVisibility: (a) => { far.alpha = a; near.alpha = a; },
        destroy: () => {
            tweens.forEach((tw) => tw.kill());
            far.destroy({ children: true });
            near.destroy({ children: true });
        },
    };
}
