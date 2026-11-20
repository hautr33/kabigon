import gsap from 'gsap';
import { Container, Graphics, Sprite, Text, Texture } from 'pixi.js';
import type { Metrics } from '../../core/metrics';
import { bake, tex } from '../../core/pixi/art';
import { Emitter } from '../../core/pixi/particles';
import { sfx } from '../../core/sfx';
import type { NightSky } from '../../core/pixi/sky';
import type { ThemeWorld } from '../index';
import { catTexture, ensureArt } from './world';

// Căn bếp tiệm bánh ấm cúng của Bé Corgi — nền cho màn chọn màn & 3 màn giải đố của theme 2.
//   tường gạch men kem · kệ gỗ (hũ bột, lọ kẹo) · đèn thả trần ấm · cửa sổ rèm ca-rô (mây trôi, nắng chiếu xiên)
//   · lò nướng hồng âm quầy (cửa lò phập phồng) · quầy gỗ có bánh bốc hơi · Bé Corgi ngồi trên quầy
const INK = 0x5b3a29;

function ensureKitchenArt() {
    try { tex('kitchen-curtain'); return; } catch { /* vẽ lần đầu */ }
    // rèm ca-rô hồng, mép dưới lượn sóng (vẽ 1 bên, bên kia lật ngược)
    bake('kitchen-curtain', 120, 260, (ctx) => {
        ctx.beginPath();
        ctx.moveTo(0, 0); ctx.lineTo(120, 0);
        ctx.bezierCurveTo(100, 90, 70, 170, 34, 236);
        for (let i = 0; i < 4; i++) ctx.quadraticCurveTo(28 - i * 8, 252, 20 - i * 8, 240 - i * 2);
        ctx.lineTo(0, 236); ctx.closePath();
        ctx.save(); ctx.clip();
        ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, 120, 260);
        ctx.fillStyle = 'rgba(239, 143, 138, 0.55)';
        for (let x = 0; x < 120; x += 16) ctx.fillRect(x, 0, 8, 260);
        for (let y = 0; y < 260; y += 16) ctx.fillRect(0, y, 120, 8);
        // nếp vải
        ctx.strokeStyle = 'rgba(91, 58, 41, 0.12)'; ctx.lineWidth = 3;
        for (const x of [36, 70]) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.quadraticCurveTo(x - 6, 120, x - 26, 230); ctx.stroke(); }
        ctx.restore();
    });
}

export function kitchenWorld(m: Metrics, sky: NightSky): ThemeWorld {
    ensureArt(); // mây bông (cảnh ngoài cửa sổ)
    ensureKitchenArt();
    const { W, H, u } = m;
    const root = new Container();
    // gắn thẳng vào sky.view (ngoài các tầng parallax) → căn bếp đứng yên khi rê chuột, luôn phủ kín trời đêm
    sky.view.addChild(root);
    const tweens: gsap.core.Animation[] = [];
    let alive = true;

    // ---------------- Tường gạch men ----------------
    const wall = new Graphics();
    wall.rect(0, 0, W, H).fill(0xfdf1e1);
    wall.rect(0, 0, W, H * 0.07).fill({ color: 0xf4dcc2, alpha: 0.5 });
    const th = 30 * u, tw = 54 * u;
    for (let row = 0, y = H * 0.07; y < H; row++, y += th) {
        wall.moveTo(0, y).lineTo(W, y);
        for (let x = (row % 2) * (tw / 2); x < W; x += tw) wall.moveTo(x, y).lineTo(x, y + th);
    }
    wall.stroke({ width: 1.5 * u, color: 0xecd6bd, alpha: 0.8 });
    // viền gỗ trên cao
    wall.rect(0, H * 0.07 - 8 * u, W, 8 * u).fill(0xd9a877);
    root.addChild(wall);

    // ---------------- Cửa sổ ----------------
    const ww = Math.min(W * 0.22, 330 * u), wh = H * 0.28, wx = W - ww - Math.max(70 * u, W * 0.06), wy = H * 0.13;
    const win = new Container();
    const glass = new Graphics().roundRect(wx, wy, ww, wh, 14 * u).fill(0xcfe6f2);
    glass.rect(wx, wy + wh * 0.55, ww, wh * 0.45).fill({ color: 0xffe7cf, alpha: 0.7 });
    const winMask = new Graphics().roundRect(wx, wy, ww, wh, 14 * u).fill(0xffffff);
    const sun = new Graphics().circle(wx + ww * 0.72, wy + wh * 0.3, 26 * u).fill(0xfff1b8);
    const clouds = [0, 1].map((i) => {
        const c = new Sprite(tex('puff-cloud'));
        c.anchor.set(0.5); c.scale.set((0.32 + i * 0.12) * u);
        c.position.set(wx + ww * (0.25 + i * 0.5), wy + wh * (0.32 + i * 0.22));
        return c;
    });
    const hill = new Graphics().ellipse(wx + ww * 0.5, wy + wh * 1.05, ww * 0.75, wh * 0.28).fill(0xc6daa8);
    const inside = new Container();
    inside.addChild(glass, sun, ...clouds, hill);
    inside.mask = winMask;
    const frame = new Graphics();
    frame.roundRect(wx - 10 * u, wy - 10 * u, ww + 20 * u, wh + 20 * u, 20 * u).stroke({ width: 14 * u, color: 0xfff7ec });
    frame.roundRect(wx - 17 * u, wy - 17 * u, ww + 34 * u, wh + 34 * u, 24 * u).stroke({ width: 3 * u, color: INK, alpha: 0.35 });
    frame.rect(wx + ww / 2 - 4 * u, wy, 8 * u, wh).fill(0xfff7ec);
    frame.rect(wx, wy + wh * 0.5 - 4 * u, ww, 8 * u).fill(0xfff7ec);
    // bậu cửa + chậu cây nhỏ
    frame.roundRect(wx - 26 * u, wy + wh + 8 * u, ww + 52 * u, 14 * u, 6 * u).fill(0xd9a877);
    const pot = new Graphics();
    const px = wx + ww * 0.2, py = wy + wh + 8 * u;
    pot.poly([px - 16 * u, py - 26 * u, px + 16 * u, py - 26 * u, px + 12 * u, py, px - 12 * u, py]).fill(0xef8f8a);
    for (const [dx, dy, r] of [[-8, -36, 10], [6, -40, 11], [0, -50, 10]]) pot.circle(px + dx * u, py + dy * u, r * u).fill(0x9cc47e);
    win.addChild(inside, winMask, frame, pot);
    root.addChild(win);
    // rèm + thanh treo
    const rod = new Graphics().roundRect(wx - 40 * u, wy - 30 * u, ww + 80 * u, 7 * u, 4 * u).fill(0xb97a4e);
    rod.circle(wx - 40 * u, wy - 26.5 * u, 7 * u).circle(wx + ww + 40 * u, wy - 26.5 * u, 7 * u).fill(0xb97a4e);
    const curtainScale = (wh + 40 * u) / 260;
    const curtL = new Sprite(tex('kitchen-curtain'));
    curtL.scale.set(curtainScale); curtL.position.set(wx - 34 * u, wy - 26 * u);
    const curtR = new Sprite(tex('kitchen-curtain'));
    curtR.scale.set(-curtainScale, curtainScale); curtR.position.set(wx + ww + 34 * u, wy - 26 * u);
    root.addChild(curtL, curtR, rod);
    tweens.push(gsap.to(curtL.skew, { x: 0.035, duration: 3.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    tweens.push(gsap.to(curtR.skew, { x: -0.035, duration: 3.6, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 0.6 }));

    // nắng chiếu xiên từ cửa sổ xuống
    const beam = new Graphics().poly([wx, wy + wh * 0.2, wx + ww * 0.7, wy + wh * 0.2, wx + ww * 0.1, H, wx - ww * 0.9, H]).fill(0xfff1c9);
    beam.alpha = 0.06; beam.blendMode = 'add';
    root.addChild(beam);
    tweens.push(gsap.to(beam, { alpha: 0.1, duration: 4, ease: 'sine.inOut', yoyo: true, repeat: -1 }));

    // ---------------- Kệ gỗ + hũ ----------------
    const shelfY = H * 0.16, sx0 = W * 0.03, sx1 = Math.min(W * 0.3, sx0 + 400 * u);
    const shelf = new Graphics();
    shelf.roundRect(sx0, shelfY, sx1 - sx0, 12 * u, 4 * u).fill(0xc98d5e);
    shelf.rect(sx0, shelfY + 9 * u, sx1 - sx0, 3 * u).fill({ color: INK, alpha: 0.18 });
    for (const bx of [sx0 + 30 * u, sx1 - 30 * u]) shelf.poly([bx - 6 * u, shelfY + 12 * u, bx + 6 * u, shelfY + 12 * u, bx, shelfY + 34 * u]).fill(0xb97a4e);
    // hũ bột / đường / kẹo
    const jars: [number, number, number, number][] = [[0.08, 46, 0xfff7ec, 0xef8f8a], [0.24, 58, 0xfbe3c8, 0xf7d27a], [0.4, 40, 0xfde3dd, 0xc6daa8], [0.56, 52, 0xfff7ec, 0xf4ad62]];
    for (const [f, h, fill, lid] of jars) {
        const jx = sx0 + (sx1 - sx0) * f + 20 * u, jw = 40 * u, jh = h * u;
        shelf.roundRect(jx - jw / 2, shelfY - jh, jw, jh, 10 * u).fill(fill);
        shelf.roundRect(jx - jw / 2, shelfY - jh * 0.55, jw, jh * 0.55, 10 * u).fill({ color: lid, alpha: 0.35 });
        shelf.roundRect(jx - jw / 2 - 3 * u, shelfY - jh - 8 * u, jw + 6 * u, 11 * u, 5 * u).fill(lid);
        shelf.roundRect(jx - 10 * u, shelfY - jh * 0.75, 20 * u, 12 * u, 3 * u).fill({ color: 0xffffff, alpha: 0.8 });
    }
    // lọ kẹo tròn
    const cjx = sx0 + (sx1 - sx0) * 0.78 + 20 * u, cjr = 26 * u;
    shelf.circle(cjx, shelfY - cjr, cjr).fill({ color: 0xffffff, alpha: 0.75 });
    for (let i = 0; i < 9; i++) shelf.circle(cjx + (Math.random() - 0.5) * cjr, shelfY - cjr * 0.6 + (Math.random() - 0.5) * cjr * 0.6, 6 * u).fill([0xef8f8a, 0xf7d27a, 0xc6daa8][i % 3]);
    shelf.roundRect(cjx - 12 * u, shelfY - cjr * 2 - 6 * u, 24 * u, 9 * u, 4 * u).fill(0xef8f8a);
    root.addChild(shelf);

    // ---------------- Đèn thả trần ----------------
    const lampX = W * 0.5;
    const lamp = new Container();
    const cord = new Graphics().rect(-1.5 * u, 0, 3 * u, H * 0.07).fill(0x8a6450);
    const shade = new Graphics().poly([-34 * u, H * 0.07 + 30 * u, 34 * u, H * 0.07 + 30 * u, 16 * u, H * 0.07, -16 * u, H * 0.07]).fill(0xf7d27a);
    const bulb = new Graphics().circle(0, H * 0.07 + 32 * u, 9 * u).fill(0xfff6d8);
    const lampGlow = new Sprite(tex('soft-glow'));
    lampGlow.anchor.set(0.5); lampGlow.tint = 0xffd99a; lampGlow.blendMode = 'add'; lampGlow.alpha = 0.55;
    lampGlow.position.set(0, H * 0.07 + 40 * u); lampGlow.scale.set((260 * u) / 128);
    lamp.addChild(lampGlow, cord, shade, bulb);
    lamp.position.set(lampX, 0);
    root.addChild(lamp);
    tweens.push(gsap.to(lamp, { rotation: 0.025, duration: 2.8, ease: 'sine.inOut', yoyo: true, repeat: -1 }));
    tweens.push(gsap.to(lampGlow, { alpha: 0.7, duration: 2.2, ease: 'sine.inOut', yoyo: true, repeat: -1 }));

    // ---------------- Quầy gỗ + lò nướng ----------------
    const cy = H - 120 * u; // mặt quầy
    const counter = new Graphics();
    counter.rect(0, cy + 16 * u, W, H - cy).fill(0xe8b788);
    for (let x = 0; x < W; x += 90 * u) counter.rect(x, cy + 16 * u, 3 * u, H - cy).fill({ color: INK, alpha: 0.1 });
    counter.roundRect(-10, cy, W + 20, 18 * u, 6 * u).fill(0xc98d5e);
    counter.rect(0, cy + 2 * u, W, 4 * u).fill({ color: 0xffffff, alpha: 0.25 });
    root.addChild(counter);
    // ---------------- Lò nướng đứng trên mặt quầy ----------------
    const ow = Math.min(Math.max(W * 0.14, 170 * u), 220 * u), oh = ow * 0.82;
    const ox = Math.max(26 * u, W * 0.035), oy = cy - oh; // đáy lò chạm mặt quầy
    const oven = new Graphics();
    oven.roundRect(ox + 10 * u, cy - 4 * u, ow - 20 * u, 8 * u, 4 * u).fill({ color: INK, alpha: 0.15 }); // bóng dưới lò
    for (const fx of [ox + 18 * u, ox + ow - 30 * u]) oven.roundRect(fx, cy - 6 * u, 12 * u, 8 * u, 3 * u).fill(0xb97a4e); // chân lò
    oven.roundRect(ox, oy, ow, oh - 4 * u, 18 * u).fill(0xf6b7ae);
    oven.roundRect(ox, oy, ow, oh * 0.24, 18 * u).fill(0xf8c8be);
    oven.rect(ox, oy + oh * 0.14, ow, oh * 0.1).fill(0xf8c8be);
    // núm vặn + đèn báo
    const knobY = oy + oh * 0.12;
    for (const k of [0.18, 0.34, 0.5]) { oven.circle(ox + ow * k, knobY, 7 * u).fill(0xfff7ec); oven.rect(ox + ow * k - 1 * u, knobY - 6 * u, 2 * u, 6 * u).fill(0xb97a4e); }
    const lightDot = new Graphics().circle(ox + ow * 0.84, knobY, 5 * u).fill(0xef8f8a);
    // cửa lò: kính tối + tay nắm
    const dx = ox + 16 * u, dy = oy + oh * 0.3, dw = ow - 32 * u, dh = oh * 0.58;
    oven.roundRect(dx - 5 * u, dy - 5 * u, dw + 10 * u, dh + 10 * u, 14 * u).fill(0xfde3dd);
    oven.roundRect(dx, dy, dw, dh, 11 * u).fill(0x5a3a2b);
    oven.roundRect(dx + dw * 0.2, dy - 13 * u, dw * 0.6, 6 * u, 3 * u).fill(0xfff7ec);
    // bên trong lò: lửa ấm + khay bánh (bánh phồng lên lúc diễn)
    const ovenInside = new Container();
    const ovenGlow = new Sprite(tex('soft-glow'));
    ovenGlow.anchor.set(0.5); ovenGlow.tint = 0xffa24c; ovenGlow.blendMode = 'add'; ovenGlow.alpha = 0.55;
    ovenGlow.position.set(dx + dw / 2, dy + dh * 0.62);
    ovenGlow.scale.set((dw * 1.3) / 256 * 2, (dh * 1.1) / 256 * 2);
    const tray = new Graphics().rect(dx + 8 * u, dy + dh - 16 * u, dw - 16 * u, 4 * u).fill(0x8a6450);
    const ovenCake = new Graphics();
    ovenCake.roundRect(-dw * 0.28, -dh * 0.5, dw * 0.56, dh * 0.5, 10 * u).fill(0xf4ad62);
    ovenCake.roundRect(-dw * 0.28, -dh * 0.5, dw * 0.56, dh * 0.14, 8 * u).fill(0xf9cf8f);
    ovenCake.position.set(dx + dw / 2, dy + dh - 16 * u);
    ovenCake.scale.set(1, 0.35);
    const ovenMask = new Graphics().roundRect(dx, dy, dw, dh, 11 * u).fill(0xffffff);
    ovenInside.addChild(ovenGlow, tray, ovenCake);
    ovenInside.mask = ovenMask;
    const shine = new Graphics().poly([dx + dw * 0.1, dy + 4 * u, dx + dw * 0.32, dy + 4 * u, dx + dw * 0.12, dy + dh - 4 * u, dx + 4 * u, dy + dh - 4 * u]).fill({ color: 0xffffff, alpha: 0.12 });
    root.addChild(oven, lightDot, ovenInside, ovenMask, shine);
    const glowTw = gsap.to(ovenGlow, { alpha: 0.85, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 });
    tweens.push(glowTw, gsap.to(lightDot, { alpha: 0.4, duration: 0.9, ease: 'sine.inOut', yoyo: true, repeat: -1 }));

    // hơi nóng bốc lên từ nóc lò
    const steam = new Emitter(tex('glow-dot'), {
        life: [1600, 2600], speedX: [-6 * u, 6 * u], speedY: [-30 * u, -18 * u], scale: [0.25 * u, 0.45 * u], scaleEnd: 1.8,
        alpha: [0.3, 0.5], curve: 'pulse', tint: [0xffffff], blend: 'normal', rate: 2.5,
        area: () => ({ x: ox + ow * (0.3 + Math.random() * 0.4), y: oy }),
    });
    root.addChild(steam.view);
    steam.prewarm(2000, 100);
    const tingText = new Text({ text: 'Ting!', style: { fontFamily: 'Baloo 2', fontWeight: '800', fontSize: 30 * u, fill: 0xd96f6c, stroke: { color: 0xffffff, width: 7 * u } } });
    tingText.anchor.set(0.5); tingText.position.set(ox + ow * 0.85, oy - 22 * u); tingText.alpha = 0;
    root.addChild(tingText);

    // bụi nắng lơ lửng trong vệt nắng
    const motes = new Emitter(tex('glow-dot'), {
        life: [4000, 7000], speedX: [-6 * u, 6 * u], speedY: [-4 * u, 6 * u], scale: [0.06 * u, 0.12 * u], alpha: [0.5, 0.9], curve: 'pulse',
        tint: [0xfff1c9, 0xffffff], rate: 6,
        area: () => { const k = Math.random(); return { x: wx - ww * 1.2 * k + Math.random() * ww * 0.9, y: wy + wh + (H - wy - wh) * k }; },
    });
    root.addChild(motes.view);
    motes.prewarm(5000, 100);

    // ---------------- Bé Corgi ngồi trên quầy ----------------
    const cat = new Sprite(Texture.EMPTY);
    cat.anchor.set(0.5, 0.93);
    const catX = W - Math.max(90 * u, W * 0.1), catY = cy + 6 * u, catSize = 110 * u;
    cat.position.set(catX, catY);
    root.addChild(cat);
    let catTex: { happy?: Texture; love?: Texture } = {};
    Promise.all([catTexture('happy'), catTexture('love')]).then(([happy, love]) => {
        if (!alive) return;
        catTex = { happy, love };
        cat.texture = happy;
        cat.scale.set(catSize / happy.width);
    });
    let cheering = 0;
    tweens.push(gsap.timeline({ repeat: -1, repeatDelay: 3.2 })
        .to(cat, { rotation: 0.16, duration: 0.18, ease: 'sine.inOut' })
        .to(cat, { rotation: -0.12, duration: 0.24, ease: 'sine.inOut' })
        .to(cat, { rotation: 0.08, duration: 0.2, ease: 'sine.inOut' })
        .to(cat, { rotation: 0, duration: 0.2, ease: 'sine.inOut' }));

    const cheerFn = () => {
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
        gsap.fromTo(lampGlow, { alpha: 1 }, { alpha: 0.6, duration: 1.2 });
    };

    let t = 0;
    return {
        setVisibility: (a) => { root.alpha = a; root.visible = a > 0.001; },
        update: (dt) => {
            t += dt / 1000;
            if (catTex.happy && cheering <= 0) {
                const s = catSize / catTex.happy.width;
                cat.scale.set(s * (1 + 0.015 * Math.sin(t * 2.6)), s * (1 - 0.02 * Math.sin(t * 2.6)));
            }
            for (const [i, c] of clouds.entries()) {
                c.x += (6 + i * 4) * u * (dt / 1000);
                if (c.x - c.width / 2 > wx + ww) c.x = wx - c.width / 2;
            }
            steam.update(dt);
            motes.update(dt);
        },
        // Diễn cảnh nướng bánh (đoạn kết màn 4): zoom vào lò → lửa bùng → bánh phồng → "Ting!" → zoom ra
        perform: (name: string) => new Promise<void>((resolve) => {
            if (name !== 'bake') { resolve(); return; }
            const fx = ox + ow / 2, fy = oy + oh / 2, z = 1.7;
            // đưa lò về giữa nhưng không để lộ mép (căn bếp luôn phủ kín màn hình)
            const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
            const zoomTo = { x: clamp(W / 2 - fx * z, W - W * z, 0), y: clamp(H * 0.42 - fy * z, H - H * z, 0) };
            glowTw.pause();
            const tl = gsap.timeline({ onComplete: () => { glowTw.resume(); resolve(); } });
            tl.to(root, { x: zoomTo.x, y: zoomTo.y, duration: 1, ease: 'power2.inOut' }, 0)
                .to(root.scale, { x: z, y: z, duration: 1, ease: 'power2.inOut' }, 0)
                .to(ovenGlow, { alpha: 1, duration: 0.25, yoyo: true, repeat: 5, ease: 'sine.inOut' }, 0.9)
                .to(ovenGlow.scale, { x: ovenGlow.scale.x * 1.25, y: ovenGlow.scale.y * 1.25, duration: 1.5, ease: 'sine.inOut' }, 0.9)
                .to(ovenCake.scale, { y: 1, duration: 1.6, ease: 'back.out(1.8)' }, 1.1)
                .call(() => {
                    sfx.ting();
                    for (let i = 0; i < 26; i++) steam.emit(ox + ow * (0.2 + Math.random() * 0.6), oy, 1);
                }, [], 2.7)
                .fromTo(tingText, { alpha: 0, y: oy - 6 * u }, { alpha: 1, y: oy - 26 * u, duration: 0.4, ease: 'back.out(3)' }, 2.7)
                .to(lightDot, { tint: 0x9cc47e, duration: 0.1 }, 2.7)
                .to({}, { duration: 1 })
                .to(root, { x: 0, y: 0, duration: 1, ease: 'power2.inOut' })
                .to(root.scale, { x: 1, y: 1, duration: 1, ease: 'power2.inOut' }, '<')
                .call(() => { cheerFn(); })
                .to(tingText, { alpha: 0, duration: 0.6 }, '>-0.2');
            tweens.push(tl);
        }),
        cheer: () => cheerFn(),
        destroy: () => { alive = false; tweens.forEach((tw) => tw.kill()); steam.destroy(); motes.destroy(); root.destroy({ children: true }); },
    };
}
