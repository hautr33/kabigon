import gsap from 'gsap';
import { useEffect, useLayoutEffect, useRef } from 'react';
import { playClick } from '../core/audio';
import { musicBox } from '../core/sfx';
import { formatDate, isUnlocked, levelDate } from '../core/dates';
import { usePixiScene, useMetrics } from '../core/pixi/PixiHost';
import { NightSky } from '../core/pixi/sky';
import { useProgress } from '../store/progress';
import { THEMES, levelNumber, type Icon as LevelIcon, type LevelEntry } from '../themes';
import { CursorTrail } from '../ui/CursorTrail';
import { BakeryBadge } from '../themes/02-tiem-banh/art';
import { Glass } from '../ui/glass';
import { HomeButton } from '../ui/HomeButton';
import { Icon } from '../ui/Icon';
import { RichText } from '../ui/RichText';
import './menu.css';

// Màn chọn màn của một theme (chương): 3 thẻ màn, nền là "thế giới" của theme.
export function ThemeScreen({ themeIndex, onPlay, onBack }: { themeIndex: number; onPlay: (id: string) => void; onBack: () => void }) {
    const theme = THEMES[themeIndex];
    const m = useMetrics();
    const skyRef = useRef<NightSky | null>(null);

    // ---------------- Nền Pixi ----------------
    usePixiScene((app, root) => {
        const sky = new NightSky(m, { shootingStars: true, sceneryMargin: 60 * m.u, sceneryKey: 'menu-scenery' });
        skyRef.current = sky;
        root.addChild(sky.view);
        const world = (theme.innerWorld ?? theme.world)?.(m, sky);
        world?.setVisibility(1);
        const tick = (t: { deltaMS: number }) => {
            const dt = Math.min(t.deltaMS, 50);
            sky.update(dt);
            world?.update?.(dt);
        };
        app.ticker.add(tick);
        return () => {
            app.ticker.remove(tick);
            world?.destroy();
            sky.destroy();
            skyRef.current = null;
        };
    }, [m]);

    // Nhạc nền: theme ban ngày (Tiệm Bánh Corgi) chơi hộp nhạc; vào màn thì nhạc chơi tiếp liền mạch
    useEffect(() => {
        if (!theme.light) return;
        musicBox.start(0.5);
        return () => musicBox.stop();
    }, [theme.light]);

    // Parallax theo chuột
    useEffect(() => {
        const onMove = (e: PointerEvent) => skyRef.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, []);

    // Thẻ hiện lần lượt
    const grid = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const cards = grid.current?.querySelectorAll('.card-wrap');
        if (cards?.length) gsap.fromTo(cards, { opacity: 0, y: 36 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.09, delay: 0.45, clearProps: 'transform' });
    }, []);

    return (
        <div className={`screen menu interactive ${theme.light ? 'on-light' : ''}`}>
            <CursorTrail variant={theme.light ? 'bakery' : 'stars'} />
            <HomeButton onClick={() => { playClick(); onBack(); }} />
            <header className="menu-head">
                <p className="tagline">Chương {themeIndex + 1}</p>
                <h1 className="wordmark menu-title">{theme.name}</h1>
                <p className="theme-tag">{theme.tagline}</p>
            </header>
            <div ref={grid} className="menu-grid">
                {[0, 1, 2].map((i) => (
                    <LevelCard key={i} level={theme.levels[i]} number={levelNumber(themeIndex, i)} onPlay={onPlay} />
                ))}
            </div>
        </div>
    );
}

function LevelCard({ level, number, onPlay }: { level?: LevelEntry; number: number; onPlay: (id: string) => void }) {
    const done = useProgress((s) => (level ? Boolean(s.completed[level.id]) : false));
    const open = Boolean(level) && isUnlocked(number);
    const date = formatDate(levelDate(number), ' · ');
    const onClick = () => { if (open && level) { playClick(); onPlay(level.id); } };
    // Đã có màn nhưng chưa tới ngày: giữ bí mật tên màn
    const waiting = Boolean(level) && !open;
    return (
        <div className={`card-wrap ${open ? 'interactive' : 'locked'}`} onClick={onClick}>
            <Glass className={`level-card ${open ? 'live' : ''}`} quiet>
                <div className="thumb">
                    <div className={`thumb-glow ${open ? level!.icon : 'lock'}`} />
                    <CardIcon icon={open ? level!.icon : 'lock'} />
                </div>
                <div className="card-label">Màn {number}</div>
                <div className="card-name">{open ? level!.title : waiting ? 'Quà bí mật nè' : 'Sắp ra mắt'}</div>
                <div className="card-desc"><RichText text={open ? level!.subtitle : waiting ? 'Mùng 6 mới mở nha bé :heart:' : 'Anh đang làm nè...'} /></div>
                <div className="card-date">{date}</div>
                {open && <div className={`chip ${done ? 'done' : ''}`}>{done ? '✓  Đã hoàn thành' : 'Chơi liền  ›'}</div>}
            </Glass>
        </div>
    );
}

function CardIcon({ icon }: { icon: LevelIcon }) {
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
    if (icon === 'recipe' || icon === 'cake' || icon === 'delivery') return <BakeryBadge kind={icon} />;
    if (icon === 'lock') return <Icon name="envelope" className="thumb-envelope" />;
    return (
        <svg className="thumb-icon star" viewBox="0 0 24 24" width="58" height="58">
            <path d="M12 1.8l3.05 6.6 7.2.75-5.38 4.86 1.52 7.1L12 17.5l-6.39 3.6 1.52-7.1L1.75 9.15l7.2-.75z" />
        </svg>
    );
}
