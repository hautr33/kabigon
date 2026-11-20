import gsap from 'gsap';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Metrics } from '../../core/metrics';
import { bake, tex } from '../../core/pixi/art';
import { Emitter } from '../../core/pixi/particles';
import type { NightSky } from '../../core/pixi/sky';
import type { ThemeWorld } from '../index';
import { pupImageUrl, type PupMood } from './art';
import { SHOP_NAME } from './dialogue';

// Ảnh corgi (vẽ từ SVG) → texture, tải một lần rồi dùng lại
const catTextures = new Map<PupMood, Promise<Texture>>();
export function catTexture(mood: PupMood) {
    let p = catTextures.get(mood);
    if (!p) {
        p = new Promise((resolve) => {
            const img = new Image();
            img.onload = () => resolve(Texture.from(img));
            img.src = pupImageUrl(mood);
        });
        catTextures.set(mood, p);
    }
    return p;
}

// Texture riêng của theme (vẽ một lần)
export function ensureArt() {
    try { tex('day-sky'); return; } catch { /* chưa có → vẽ */ }
    bake('day-sky', 4, 512, (ctx) => {
        const g = ctx.createLinearGradient(0, 0, 0, 512);
        g.addColorStop(0, '#fff4e3'); g.addColorStop(0.45, '#fdecd6'); g.addColorStop(0.75, '#fbe2cf'); g.addColorStop(1, '#f6d8bd');
        ctx.fillStyle = g; ctx.fillRect(0, 0, 4, 512);
    }, 1);
    // mây bông xốp trắng, đáy hơi tím hồng
    bake('puff-cloud', 220, 110, (ctx) => {
        const puffs: [number, number, number][] = [[50, 70, 32], [90, 48, 42], [140, 52, 38], [175, 72, 28], [110, 78, 36], [70, 82, 26]];
        ctx.beginPath();
        for (const [x, y, r] of puffs) { ctx.moveTo(x + r, y); ctx.arc(x, y, r, 0, Math.PI * 2); }
        const g = ctx.createLinearGradient(0, 10, 0, 110);
        g.addColorStop(0, '#fffdf8'); g.addColorStop(0.7, '#fff7ee'); g.addColorStop(1, '#f3e1cf');
        ctx.fillStyle = g; ctx.fill();
    });
}

// Thế giới "Tiệm Bánh": trời pastel ban ngày phủ lên bầu trời đêm (khi hiện đủ thì che hết)
export function bakeryWorld(m: Metrics, sky: NightSky): ThemeWorld {
    ensureArt();
    const { W, H, u } = m;
    const root = new Container();
    sky.front.addChild(root); // trên cùng các tầng trời → che hẳn trời đêm
    const pad = 80 * u;

    const bg = new Sprite(tex('day-sky'));
    bg.width = W + pad * 2; bg.height = H + pad * 2; bg.position.set(-pad, -pad);
    root.addChild(bg);

    // mặt trời ấm
    const sunX = W * 0.14, sunY = H * 0.16;
    const sunGlow = new Sprite(tex('soft-glow'));
    sunGlow.anchor.set(0.5); sunGlow.tint = 0xffe2b8; sunGlow.alpha = 0.8;
    sunGlow.position.set(sunX, sunY); sunGlow.scale.set((220 * u) / 128);
    const sun = new Graphics().circle(0, 0, 38 * u).fill(0xfff4dc);
    sun.position.set(sunX, sunY);
    root.addChild(sunGlow, sun);

    // mây trôi
    const clouds: { s: Sprite; speed: number }[] = [];
    for (let i = 0; i < 6; i++) {
        const s = new Sprite(tex('puff-cloud'));
        s.anchor.set(0.5);
        const sc = (0.5 + Math.random() * 0.6) * u;
        s.scale.set(sc);
        s.position.set(Math.random() * W, H * (0.08 + Math.random() * 0.4));
        s.alpha = 0.85 + Math.random() * 0.15;
        root.addChild(s);
        clouds.push({ s, speed: (6 + Math.random() * 10) * u });
    }

    // đồi pastel 2 lớp
    const hill = (base: number, amp: number, f: number, ph: number, color: number, rim: number) => {
        const g = new Graphics();
        const y = (x: number) => base + Math.sin(x * f / u + ph) * amp + Math.sin(x * f * 2.7 / u + ph * 2) * amp * 0.35;
        const pts: number[] = [-pad, H + pad];
        for (let x = -pad; x <= W + pad; x += 8) pts.push(x, y(x));
        pts.push(W + pad, H + pad);
        g.poly(pts, true).fill(color);
        g.moveTo(-pad, y(-pad));
        for (let x = -pad; x <= W + pad; x += 8) g.lineTo(x, y(x));
        g.stroke({ width: 3 * u, color: rim, alpha: 0.8 });
        root.addChild(g);
        return y;
    };
    hill(H - 150 * u, 22 * u, 0.0032, 1.1, 0xdfe8c8, 0xf1f5e3);
    const groundY = hill(H - 85 * u, 14 * u, 0.0045, 3.3, 0xc6daa8, 0xe6efd3);

    // hoa nhỏ trên đồi
    const deco = new Graphics();
    const flowerColors = [0xef8f8a, 0xf7d27a, 0xfff7ec, 0xf4ad62];
    for (let i = 0; i < Math.round(W / (14 * u)); i++) {
        const x = Math.random() * W, y = groundY(x) + (8 + Math.random() * 70) * u;
        const r = (2 + Math.random() * 2) * u;
        for (let p = 0; p < 5; p++) {
            const a = (p / 5) * Math.PI * 2;
            deco.circle(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.75).fill(flowerColors[i % 4]);
        }
        deco.circle(x, y, r * 0.6).fill(0xd98b45);
    }
    root.addChild(deco);

    // tiệm bánh nhỏ bên phải
    const shop = new Container();
    const sw = 210 * u, sh = 150 * u;
    const g = new Graphics();
    g.roundRect(-sw / 2, -sh, sw, sh, 10 * u).fill(0xfff1e0);
    g.rect(-sw / 2, -sh, sw, 10 * u).fill(0xf5dcc3);
    // mái hiên sọc
    g.poly([-sw / 2 - 14 * u, -sh, sw / 2 + 14 * u, -sh, sw / 2, -sh - 36 * u, -sw / 2, -sh - 36 * u]).fill(0xef8f8a);
    const stripes = 8;
    for (let i = 0; i < stripes; i++) {
        const x0 = -sw / 2 - 14 * u + ((sw + 28 * u) / stripes) * i, w = (sw + 28 * u) / stripes;
        g.moveTo(x0, -sh).arc(x0 + w / 2, -sh, w / 2, 0, Math.PI, false).fill(i % 2 ? 0xfff7ec : 0xef8f8a);
    }
    // cửa sổ trưng bánh
    g.roundRect(-sw / 2 + 18 * u, -sh + 34 * u, 96 * u, 64 * u, 10 * u).fill(0xfffaf1).stroke({ width: 3 * u, color: 0xd9b893 });
    g.rect(-sw / 2 + 24 * u, -sh + 76 * u, 84 * u, 4 * u).fill(0xe8c8b4);
    [[0xef8f8a, 0], [0xf7d27a, 1], [0xf4ad62, 2]].forEach(([c, i]) => {
        const cx = -sw / 2 + 40 * u + (i as number) * 26 * u;
        g.roundRect(cx - 9 * u, -sh + 62 * u, 18 * u, 14 * u, 3 * u).fill(0xf6d9b8);
        g.circle(cx, -sh + 58 * u, 10 * u).fill(c as number);
    });
    // cửa
    g.roundRect(sw / 2 - 66 * u, -sh + 40 * u, 46 * u, sh - 40 * u, 20 * u).fill(0xb07a52);
    g.circle(sw / 2 - 28 * u, -sh + 98 * u, 3 * u).fill(0xf7d27a);
    shop.addChild(g);
    const sign = new Text({ text: SHOP_NAME, style: { fontFamily: 'Dancing Script', fontWeight: '700', fontSize: 22 * u, fill: 0x5b3a29 } });
    sign.anchor.set(0.5);
    sign.position.set(0, -sh - 54 * u);
    const board = new Graphics().roundRect(-sign.width / 2 - 14 * u, -sh - 72 * u, sign.width + 28 * u, 36 * u, 12 * u).fill(0xfffaf1).stroke({ width: 3 * u, color: 0xef8f8a });
    shop.addChild(board, sign);
    // nhỏ lại & sát góc phải dưới → không đè lên thẻ màn / ảnh polaroid / khung giải đố
    const SHOP = 0.72;
    shop.scale.set(SHOP);
    const shopX = W - (sw / 2) * SHOP - 26 * u;
    shop.position.set(shopX, groundY(shopX) + 30 * u);
    root.addChild(shop);

    // Bé Corgi đứng trước tiệm: lắc lư theo nhịp, thỉnh thoảng vẫy; giải đúng thì nhún nhảy mắt tim
    const cat = new Sprite(Texture.EMPTY);
    cat.anchor.set(0.5, 0.95);
    const catX = shopX - (sw / 2) * SHOP - 34 * u, catY = groundY(shopX - (sw / 2) * SHOP) + 40 * u;
    const catSize = 92 * u;
    cat.position.set(catX, catY);
    root.addChild(cat);
    let catTex: { happy?: Texture; love?: Texture } = {};
    let alive = true;
    Promise.all([catTexture('happy'), catTexture('love')]).then(([happy, love]) => {
        if (!alive) return;
        catTex = { happy, love };
        cat.texture = happy;
        cat.scale.set(catSize / happy.width);
    });
    let cheering = 0;

    // cánh hoa & bụi đường bay nhẹ
    const petals = new Emitter(tex('petal'), {
        life: [6000, 9000], speedX: [8 * u, 26 * u], speedY: [4 * u, 18 * u], spin: [-60, 60], scale: [0.5 * u, 0.9 * u], scaleEnd: 0.8,
        alpha: [0.6, 0.9], curve: 'pulse', tint: [0xf6b7ae, 0xfde3dd, 0xfff7ec, 0xf7d27a], blend: 'normal',
        rate: 2.5 * (W / (1000 * u)), area: () => ({ x: Math.random() * W * 0.8 - W * 0.1, y: Math.random() * H * 0.5 }),
    });
    root.addChild(petals.view);
    petals.prewarm(6000, 100);

    const tweens: gsap.core.Animation[] = [
        gsap.to(sunGlow.scale, { x: sunGlow.scale.x * 1.1, y: sunGlow.scale.y * 1.1, duration: 3, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        gsap.to(sign, { rotation: 0.03, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        // vẫy chào: cứ ~4 giây lắc lư qua lại một lượt
        gsap.timeline({ repeat: -1, repeatDelay: 3.2 })
            .to(cat, { rotation: 0.16, duration: 0.18, ease: 'sine.inOut' })
            .to(cat, { rotation: -0.12, duration: 0.24, ease: 'sine.inOut' })
            .to(cat, { rotation: 0.08, duration: 0.2, ease: 'sine.inOut' })
            .to(cat, { rotation: 0, duration: 0.2, ease: 'sine.inOut' }),
    ];
    let t = 0;

    return {
        setVisibility: (a) => { root.alpha = a; root.visible = a > 0.001; },
        update: (dt) => {
            t += dt / 1000;
            // thở nhẹ (co giãn) khi đứng yên
            if (catTex.happy && cheering <= 0) {
                const s = catSize / catTex.happy.width;
                cat.scale.set(s * (1 + 0.015 * Math.sin(t * 2.6)), s * (1 - 0.02 * Math.sin(t * 2.6)));
            }
            for (const c of clouds) {
                c.s.x += c.speed * (dt / 1000);
                if (c.s.x - c.s.width / 2 > W + pad) c.s.x = -pad - c.s.width / 2;
            }
            petals.update(dt);
        },
        cheer: () => {
            if (!catTex.love || !catTex.happy) return;
            cheering++;
            cat.texture = catTex.love;
            const s = catSize / catTex.love.width;
            const tl = gsap.timeline({ onComplete: () => { cheering--; if (cheering <= 0 && catTex.happy) cat.texture = catTex.happy; } });
            for (let i = 0; i < 3; i++) {
                tl.to(cat.scale, { x: s * 1.08, y: s * 0.9, duration: 0.1, ease: 'power2.out' })
                    .to(cat, { y: catY - 30 * u, duration: 0.22, ease: 'power2.out' }, '>')
                    .to(cat.scale, { x: s * 0.96, y: s * 1.06, duration: 0.22 }, '<')
                    .to(cat, { y: catY, duration: 0.22, ease: 'power2.in' })
                    .to(cat.scale, { x: s, y: s, duration: 0.15 });
            }
            tl.to({}, { duration: 1.2 });
            tweens.push(tl);
        },
        destroy: () => { alive = false; tweens.forEach((tw) => tw.kill()); petals.destroy(); root.destroy({ children: true }); },
    };
}
