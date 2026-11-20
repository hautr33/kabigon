import gsap from 'gsap';
import { Sprite, Text } from 'pixi.js';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { playClick } from '../core/audio';
import { tex } from '../core/pixi/art';
import { NightSky } from '../core/pixi/sky';
import { usePixiScene, useMetrics } from '../core/pixi/PixiHost';
import { formatDate, levelDate } from '../core/dates';
import { useProgress } from '../store/progress';
import { THEMES, levelNumber, type Icon, type LevelEntry } from '../themes';
import { CursorTrail } from '../ui/CursorTrail';
import { Glass } from '../ui/glass';
import './menu.css';

const TITLE = 'Những Vì Sao Nhỏ';
const TAGLINE = 'Chọn một màn chơi nhé';

export function MenuScreen({ onPlay }: { onPlay: (id: string) => void }) {
    const m = useMetrics();
    const skyRef = useRef<NightSky | null>(null);

    // ---------------- Nền Pixi ----------------
    usePixiScene((app, root) => {
        const { W, H, u } = m;
        const sky = new NightSky(m, { shootingStars: true, sceneryMargin: 60 * u, sceneryKey: 'menu-scenery' });
        skyRef.current = sky;
        root.addChild(sky.view);

        // Trăng (tầng xa, trôi theo cực quang)
        const moonX = W * 0.85, moonY = H * 0.17, moonR = 55 * u;
        const halo = new Sprite(tex('soft-glow'));
        halo.anchor.set(0.5); halo.tint = 0xc8dcff; halo.blendMode = 'add'; halo.alpha = 0.5;
        halo.position.set(moonX, moonY); halo.scale.set((moonR * 7) / 256);
        const moon = new Sprite(tex('moon'));
        moon.anchor.set(0.5); moon.position.set(moonX, moonY); moon.scale.set(moonR / 110);
        sky.far.addChild(halo, moon);
        const haloTw = gsap.to(halo, { alpha: 0.75, duration: 2.5, ease: 'sine.inOut', yoyo: true, repeat: -1 });

        // Kabigon ngủ trên đồi (cùng tầng với đồi)
        const kx = W * 0.84, ky = m.ground(kx) - 18 * u;
        const kabi = new Sprite(tex('kabi-normal'));
        kabi.anchor.set(0.5, 57 / 110); kabi.position.set(kx, ky); kabi.scale.set(-u, u);
        sky.near.addChild(kabi);
        const tweens: gsap.core.Animation[] = [
            haloTw,
            gsap.to(kabi.scale, { y: u * 1.03, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
            gsap.to(kabi, { y: ky - 1.5 * u, duration: 1.6, ease: 'sine.inOut', yoyo: true, repeat: -1 }),
        ];
        [['z', 15, 0], ['Z', 20, 0.8], ['z', 13, 1.6]].forEach(([str, size, delay]) => {
            const t = new Text({ text: str as string, style: { fontFamily: 'Quicksand', fontWeight: '700', fontSize: (size as number) * u, fill: 0xffffff } });
            t.position.set(kx + 30 * u, ky - 40 * u);
            t.alpha = 0;
            sky.near.addChild(t);
            tweens.push(gsap.fromTo(t, { x: kx + 30 * u, y: ky - 40 * u, alpha: 0.9 }, { x: kx + 48 * u, y: ky - 80 * u, alpha: 0, duration: 2.4, delay: delay as number, repeat: -1, ease: 'sine.out' }));
        });

        const tick = (t: { deltaMS: number }) => sky.update(Math.min(t.deltaMS, 50));
        app.ticker.add(tick);
        return () => {
            app.ticker.remove(tick);
            tweens.forEach((tw) => tw.kill());
            sky.destroy();
            skyRef.current = null;
        };
    }, [m]);

    // Parallax theo chuột
    useEffect(() => {
        const onMove = (e: PointerEvent) => skyRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, []);

    // Thẻ hiện lần lượt
    const grid = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const cards = grid.current?.querySelectorAll('.card-wrap, .theme-head, .theme-teaser');
        if (cards?.length) gsap.fromTo(cards, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.45, clearProps: 'transform' });
    }, []);

    const nextTheme = THEMES.length; // chương tiếp theo (chưa có)
    return (
        <div className="screen menu interactive">
            <CursorTrail />
            <header className="menu-head">
                <h1 className="wordmark menu-title">{TITLE}</h1>
                <p className="tagline">{TAGLINE}</p>
            </header>
            <div ref={grid} className="menu-themes">
                {THEMES.map((theme, t) => (
                    <section key={theme.id} className="theme">
                        <div className="theme-head">
                            <span className="theme-no">Chương {t + 1}</span>
                            <span className="theme-name">{theme.name}</span>
                            <span className="theme-tag">{theme.tagline}</span>
                        </div>
                        <div className="menu-grid">
                            {[0, 1, 2].map((i) => (
                                <LevelCard key={i} level={theme.levels[i]} number={levelNumber(t, i)} onPlay={onPlay} />
                            ))}
                        </div>
                    </section>
                ))}
                <div className="theme-teaser">
                    <span className="theme-no">Chương {nextTheme + 1}</span>
                    <span>Một thế giới mới đang được chuẩn bị... ✦</span>
                    <span className="teaser-date">từ {formatDate(levelDate(levelNumber(nextTheme, 0)), ' · ')}</span>
                </div>
            </div>
        </div>
    );
}

function LevelCard({ level, number, onPlay }: { level?: LevelEntry; number: number; onPlay: (id: string) => void }) {
    const done = useProgress((s) => (level ? Boolean(s.completed[level.id]) : false));
    const locked = !level;
    const date = formatDate(levelDate(number), ' · ');
    const onClick = () => { if (level) { playClick(); onPlay(level.id); } };
    return (
        <div className={`card-wrap ${locked ? 'locked' : 'interactive'}`} onClick={onClick}>
            <Glass className={`level-card ${locked ? '' : 'live'}`} quiet>
                <div className="thumb">
                    <div className={`thumb-glow ${level?.icon ?? 'lock'}`} />
                    <CardIcon icon={level?.icon ?? 'lock'} />
                </div>
                <div className="card-label">Màn {number}</div>
                <div className="card-name">{locked ? 'Sắp ra mắt' : level.title}</div>
                <div className="card-desc">{locked ? 'Đang được chuẩn bị...' : level.subtitle}</div>
                <div className="card-date">{date}</div>
                {!locked && <div className={`chip ${done ? 'done' : ''}`}>{done ? '✓  Đã hoàn thành' : 'Chơi ngay  ›'}</div>}
            </Glass>
        </div>
    );
}

function CardIcon({ icon }: { icon: Icon }) {
    if (icon === 'heart') {
        return (
            <svg className="thumb-icon heart" viewBox="0 0 24 24" width="56" height="56">
                <path d="M12 21s-7.5-4.6-9.6-9.2C.9 8.4 3 4.5 6.7 4.5c2.1 0 3.6 1.2 4.3 2.4h2c.7-1.2 2.2-2.4 4.3-2.4 3.7 0 5.8 3.9 4.3 7.3C19.5 16.4 12 21 12 21z" />
            </svg>
        );
    }
    if (icon === 'constellation') {
        const pts = [[4, 16], [8, 8], [13, 11], [18, 5], [20, 15], [12, 19]];
        return (
            <svg className="thumb-icon constellation" viewBox="0 0 24 24" width="62" height="62">
                <polyline points={pts.map((p) => p.join(',')).join(' ')} />
                {pts.map(([x, y], i) => <circle key={i} cx={x} cy={y} r={i % 2 ? 1.6 : 1.2} />)}
            </svg>
        );
    }
    if (icon === 'lock') return <span className="thumb-emoji">💌</span>;
    return (
        <svg className="thumb-icon star" viewBox="0 0 24 24" width="58" height="58">
            <path d="M12 1.8l3.05 6.6 7.2.75-5.38 4.86 1.52 7.1L12 17.5l-6.39 3.6 1.52-7.1L1.75 9.15l7.2-.75z" />
        </svg>
    );
}
