import gsap from 'gsap';
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { play, playClick, sound } from '../core/audio';
import { TOGETHER_SINCE, daysBetween, daysToNextMung6, formatDate, isMung6, isUnlocked, levelDate, monthsTogether, today } from '../core/dates';
import { usePixiScene, useMetrics } from '../core/pixi/PixiHost';
import { useProgress } from '../store/progress';
import { THEMES, levelNumber, type Theme } from '../themes';
import { CursorTrail } from '../ui/CursorTrail';
import { Dialog, type DialogContent } from '../ui/Dialog';
import { Icon, ProgressStar } from '../ui/Icon';
import { RichText } from '../ui/RichText';
import { HomeBackdrop, TEASER_ID } from './backdrop';
import * as TXT from './text';
import './home.css';

// Màn hình home: tên game, lời chào, đếm ngày, dây đèn treo ảnh polaroid (mỗi ảnh là một theme).
export function HomeScreen({ onOpenTheme }: { onOpenTheme: (id: string) => void }) {
    const m = useMetrics();
    const now = useMemo(() => today(), []);
    const festive = isMung6(now);
    const backdrop = useRef<HomeBackdrop | null>(null);
    const [dialog, setDialog] = useState<{ open: boolean; content: DialogContent }>({ open: false, content: {} });
    const close = () => setDialog((d) => ({ ...d, open: false }));
    const [lightBg, setLightBg] = useState(false); // đang hiện thế giới nền sáng (rê chuột vào theme ban ngày)
    // Rời ảnh thì đợi một nhịp rồi mới trả về trời đêm — rê từ ảnh này sang ảnh kia không bị chớp về nền đêm
    const leaveTimer = useRef(0);
    const focusWorld = (id: string | null) => {
        clearTimeout(leaveTimer.current);
        const apply = () => { backdrop.current?.focus(id); setLightBg(!!THEMES.find((t) => t.id === id)?.light); };
        if (id) apply(); else leaveTimer.current = window.setTimeout(apply, 320);
    };
    useEffect(() => () => clearTimeout(leaveTimer.current), []);

    // ---------------- Nền Pixi ----------------
    usePixiScene((app, root) => {
        const b = new HomeBackdrop(m, festive);
        backdrop.current = b;
        root.addChild(b.view);
        const tick = (t: { deltaMS: number }) => b.update(Math.min(t.deltaMS, 50));
        app.ticker.add(tick);
        return () => {
            app.ticker.remove(tick);
            b.destroy();
            backdrop.current = null;
        };
    }, [m]);

    useEffect(() => {
        const onMove = (e: PointerEvent) => backdrop.current?.setPointer((e.clientX / window.innerWidth) * 2 - 1, (e.clientY / window.innerHeight) * 2 - 1);
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, []);

    // ---------------- Nhạc mùng 6 ----------------
    useEffect(() => {
        if (!festive) return;
        const music = sound(TXT.MUNG6.music, { volume: 0.4, loop: true });
        const start = () => { if (!music.playing()) { music.volume(0); music.play(); music.fade(0, 0.4, 1500); } };
        start();
        // Trình duyệt chỉ cho phát nhạc sau lần chạm / bấm đầu tiên
        window.addEventListener('pointerdown', start, { once: true });
        return () => {
            window.removeEventListener('pointerdown', start);
            music.fade(music.volume(), 0, 400);
            setTimeout(() => music.stop(), 450);
        };
    }, [festive]);

    // ---------------- Chữ hiện lần lượt ----------------
    const head = useRef<HTMLElement>(null);
    useLayoutEffect(() => {
        const items = head.current?.querySelectorAll('.home-greet, .home-counter, .mung6');
        if (items?.length) gsap.fromTo(items, { opacity: 0, y: 12 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power3.out', stagger: 0.15, delay: 0.9 });
    }, []);

    // ---------------- Easter egg: bấm 6 lần vào số 6 ----------------
    const six = useRef<HTMLSpanElement>(null);
    const taps = useRef({ n: 0, t: 0 });
    const tapSix = () => {
        const el = six.current!;
        const nowMs = performance.now();
        taps.current.n = nowMs - taps.current.t < 1500 ? taps.current.n + 1 : 1;
        taps.current.t = nowMs;
        const n = taps.current.n;
        gsap.fromTo(el, { scale: 1 + n * 0.08, rotate: n % 2 ? -10 : 10 }, { scale: 1, rotate: 0, duration: 0.5, ease: 'elastic.out(1.2, 0.4)' });
        play('click.mp3', 0.3 + n * 0.05);
        if (n < 6) return;
        taps.current.n = 0;
        const r = el.getBoundingClientRect();
        backdrop.current?.burst(r.left + r.width / 2, r.top + r.height / 2);
        play('star_woosh.mp3', 0.6);
        setDialog({ open: true, content: { title: TXT.SECRET.title, tone: 'gold', body: TXT.SECRET.body, buttons: [{ label: TXT.SECRET.button, variant: 'gold', onClick: close }] } });
    };

    // ---------------- Thư mùng 6 ----------------
    const openLetter = () => {
        const key = `${now.getFullYear()}-${now.getMonth() + 1}`;
        const letter = TXT.LETTERS[key] ?? TXT.LETTER_DEFAULT;
        backdrop.current?.firework(window.innerWidth / 2, window.innerHeight * 0.3);
        setDialog({
            open: true,
            content: { eyebrow: formatDate(now, ' · '), title: letter.title, tone: 'gold', body: letter.body, buttons: [{ label: TXT.LETTER_DEFAULT.button, variant: 'gold', onClick: close }] },
        });
    };

    const fill = (s: string) => s
        .replace('{days}', String(daysBetween(TOGETHER_SINCE, now)))
        .replace('{left}', String(daysToNextMung6(now)))
        .replace('{months}', String(monthsTogether(now)));
    const left = daysToNextMung6(now);
    const counter = fill(festive ? TXT.COUNTER.mung6 : left === 1 ? TXT.COUNTER.tomorrow : TXT.COUNTER.normal);

    return (
        <div className={`screen home interactive ${festive ? 'festive' : ''} ${lightBg ? 'on-light' : ''}`}>
            <CursorTrail variant={lightBg ? 'bakery' : 'stars'} />
            <header ref={head} className="home-head">
                <p className="home-greet"><RichText text={TXT.greeting(now.getHours())} /></p>
                {/* Số 6 nằm NGOÀI phần chữ gradient (background-clip: text): nếu ở trong, Chrome vẽ
                    thêm một bóng "6" lệch chỗ mỗi khi số 6 nảy (transform) */}
                <h1 className="home-title">
                    <span className="nowrap"><span className="wordmark">{TXT.TITLE.before}</span><span ref={six} className="six interactive" onClick={tapSix}>{TXT.TITLE.six}</span></span>{' '}
                    <span className="nowrap wordmark">{TXT.TITLE.after}</span>
                </h1>
                <p className="home-counter"><RichText text={counter} /></p>
                {festive && (
                    <div className="mung6">
                        <div className="mung6-banner"><RichText text={TXT.MUNG6.banner} /></div>
                        <button className="envelope" onClick={() => { playClick(); openLetter(); }}>
                            <Icon name="envelope" className="envelope-icon" />{TXT.MUNG6.envelope}
                        </button>
                    </div>
                )}
            </header>
            <PolaroidLine width={m.W} festive={festive} onFocus={focusWorld} onOpen={onOpenTheme} />
            <Dialog open={dialog.open} content={dialog.content} backdrop={8} />
        </div>
    );
}

// ---------------- Dây đèn + ảnh polaroid ----------------
type Item = { key: string; theme?: Theme; index: number; open: boolean };

function PolaroidLine({ width, festive, onFocus, onOpen }: { width: number; festive: boolean; onFocus: (id: string | null) => void; onOpen: (id: string) => void }) {
    const completed = useProgress((s) => s.completed);
    const items: Item[] = THEMES.map((theme, index) => ({ key: theme.id, theme, index, open: isUnlocked(levelNumber(index, 0)) }));
    if (items.every((it) => it.open)) items.push({ key: TEASER_ID, index: THEMES.length, open: false });

    // Kích thước & đường cong của dây
    const small = width < 640;
    const itemW = small ? 148 : 196;
    const slot = itemW + (small ? 28 : 56);
    const lineW = Math.max(width, items.length * slot + 80);
    const sag = Math.min(70, lineW * 0.07);
    const top = 24;
    const curveY = (x: number) => { const t = x / lineW; return top + 4 * sag * t * (1 - t); };
    const height = top + sag + itemW * 1.25 + 70;

    // Bóng đèn: sáng thêm theo số màn đã qua (ngày mùng 6 thì sáng hết)
    const totalLevels = THEMES.reduce((n, t) => n + t.levels.length, 0) || 1;
    const done = THEMES.reduce((n, t) => n + t.levels.filter((l) => completed[l.id]).length, 0);
    const frac = festive ? 1 : 0.3 + 0.7 * (done / totalLevels);
    const bulbCount = Math.max(10, Math.round(lineW / 64));
    const bulbs = Array.from({ length: bulbCount }, (_, j) => {
        const x = ((j + 0.5) / bulbCount) * lineW;
        return { x, y: curveY(x), lit: Math.floor((j + 1) * frac) > Math.floor(j * frac), hue: j % 4 };
    });

    const wrap = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const els = wrap.current?.querySelectorAll('.pol-hang');
        if (els?.length) gsap.fromTo(els, { opacity: 0, y: -40 }, { opacity: 1, y: 0, duration: 1.1, ease: 'back.out(1.4)', stagger: 0.12, delay: 0.6 });
    }, []);

    const open = (it: Item, el: HTMLElement) => {
        if (!it.open || !it.theme) {
            gsap.fromTo(el, { rotate: -6 }, { rotate: 0, duration: 0.9, ease: 'elastic.out(1.4, 0.3)' });
            play('missed.mp3', 0.25);
            return;
        }
        playClick();
        gsap.to(el, { scale: 1.08, rotate: 0, duration: 0.35, ease: 'power2.out' });
        onOpen(it.theme.id);
    };

    return (
        <div className="pol-scroll interactive">
            <div ref={wrap} className="pol-line" style={{ width: lineW, height }}>
                <svg className="pol-wire" width={lineW} height={top + sag * 2 + 10}>
                    <path d={`M0 ${top} Q ${lineW / 2} ${top + 2 * sag} ${lineW} ${top}`} />
                </svg>
                {bulbs.map((b, j) => (
                    <span key={j} className={`bulb h${b.hue} ${b.lit ? 'lit' : ''}`} style={{ left: b.x, top: b.y, animationDelay: `${(j * 0.37) % 2.4}s` }} />
                ))}
                {items.map((it, i) => {
                    const x = lineW / 2 + (i - (items.length - 1) / 2) * slot;
                    return (
                        <div key={it.key} className="pol-hang" style={{ left: x - itemW / 2, top: curveY(x) - 6, width: itemW }}>
                            <div
                                className="pol-swing"
                                style={{ animationDelay: `${-i * 1.3}s` }}
                            >
                                <span className="pol-peg" />
                                <div
                                    className={`polaroid ${it.open ? 'open' : 'locked'}`}
                                    style={{ ['--accent' as string]: it.theme?.accent ?? '#8b86c4' }}
                                    onPointerEnter={() => onFocus(it.key)}
                                    onPointerLeave={() => onFocus(null)}
                                    onClick={(e) => open(it, e.currentTarget)}
                                >
                                    <div className="pol-photo">
                                        {it.open && it.theme ? it.theme.cover : <div className="pol-mystery"><span>?</span><Icon name="lock" className="pol-lock" /></div>}
                                    </div>
                                    <PolaroidCaption it={it} completed={completed} />
                                </div>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

function PolaroidCaption({ it, completed }: { it: Item; completed: Record<string, boolean> }) {
    const opens = levelDate(levelNumber(it.index, 0));
    if (!it.open || !it.theme) {
        const future = daysBetween(today(), opens) > 0;
        return (
            <div className="pol-caption">
                <div className="pol-name">{it.theme ? 'Chương bí mật nè' : TXT.TEASER.title}</div>
                <div className="pol-sub"><RichText text={future ? TXT.TEASER.soon.replace('{date}', formatDate(opens)) : TXT.TEASER.preparing} /></div>
            </div>
        );
    }
    const stars = it.theme.levels.map((l) => <ProgressStar key={l.id} filled={Boolean(completed[l.id])} />);
    return (
        <div className="pol-caption">
            <div className="pol-name">{it.theme.name}</div>
            <div className="pol-sub">Chương {it.index + 1} · <span className="pol-stars">{stars}</span></div>
        </div>
    );
}
