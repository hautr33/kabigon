import gsap from 'gsap';
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playClick, sound } from '../../core/audio';
import { formatDate, levelDate } from '../../core/dates';
import { usePixiScene, useMetrics } from '../../core/pixi/PixiHost';
import { useHud } from '../../store/hud';
import { useProgress } from '../../store/progress';
import { Dialog, type DialogButton, type DialogContent } from '../../ui/Dialog';
import { HomeButton } from '../../ui/HomeButton';
import { Icon } from '../../ui/Icon';
import { RichText } from '../../ui/RichText';
import * as TXT from './dialogue';
import { constellationLayout, heartLayout, lanternMoon } from './cutscenes';
import { StarCatchGame } from './game';
import type { StarLevelConfig } from './levels';
import './level.css';

type Phase = 'start' | 'play' | 'lose' | 'win';

// Một màn "bắt sao" — dùng chung cho cả 3 màn của theme, khác nhau ở cấu hình.
export function StarCatchLevel({ config, number, onExit }: { config: StarLevelConfig; number: number; onExit: () => void }) {
    const m = useMetrics();
    const game = useRef<StarCatchGame | null>(null);
    const markCompleted = useProgress((s) => s.markCompleted);
    const [phase, setPhase] = useState<Phase>('start');
    const [floats, setFloats] = useState<{ id: number; text: string; x: number; y: number }[]>([]);
    // cutscene: khung thoại lúc thắng — đặt sát dưới & ẩn được để ngắm cutscene phía sau
    const [dialog, setDialog] = useState<{ open: boolean; content: DialogContent; backdrop: number; cutscene?: boolean }>({ open: false, content: {}, backdrop: 8 });
    const [peek, setPeek] = useState(false); // đang ẩn khung thoại để ngắm cutscene
    const [winText, setWinText] = useState(false);
    const [winDialogTick, setWinDialogTick] = useState(0);
    const stepRef = useRef(0);
    const date = formatDate(levelDate(number), ' · ');
    // Màn 1: khung thoại (và nút xem lại) nằm ngay dưới mặt trăng, giữa màn hình
    const underMoon = config.cutscene === 'lanterns' ? (() => { const moon = lanternMoon(m); return moon.y + moon.r + 28 * m.u; })() : undefined;

    // Kịch bản khung thoại sau khi thắng (màn 2 không có — chữ chạy trên màn hình)
    // Màn 2 & 3 không có khung thoại — chữ hiện trực tiếp trên màn hình (Slides)
    const script = config.cutscene === 'lanterns' ? TXT.MILESTONE_1 : null;

    // ---------------- Khung thoại ----------------
    const startGame = () => {
        setPeek(false);
        setDialog((d) => ({ ...d, open: false }));
        setPhase('play');
        setWinText(false);
        game.current?.start();
    };

    const showStart = useCallback(() => {
        setDialog({
            open: true, backdrop: 10,
            content: {
                eyebrow: `Màn ${number} · ${date}`,
                title: config.startTitle,
                body: TXT.START.body.replace('{n}', String(config.target)),
                hint: TXT.START.hint,
                buttons: [{ label: TXT.START.button, variant: 'white', onClick: startGame }],
            },
        });
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    const stepButtons = (i: number): DialogButton[] => {
        const step = script!.steps[i];
        if (step.end) return [{ label: TXT.WATCH.hide, variant: 'ghost', onClick: () => setPeek(true) }];
        const b: DialogButton[] = [{ label: step.yes ?? 'Tiếp tục... :sparkles:', variant: 'gold', onClick: nextStep }];
        if (step.no) b.push({ label: step.no, variant: 'ghost', runaway: true });
        return b;
    };

    function nextStep() {
        if (!script) return;
        const i = Math.min(stepRef.current + 1, script.steps.length - 1);
        if (i === stepRef.current) return;
        stepRef.current = i;
        const step = script.steps[i];
        if (step.burst) game.current?.goldBurst();
        if (step.celebrate) game.current?.celebrate();
        setDialog((d) => ({ ...d, content: { eyebrow: date, title: step.title ?? script.title, tone: 'gold', body: step.body, buttons: stepButtons(i) } }));
    }

    // ---------------- Cảnh Pixi ----------------
    usePixiScene((app, root) => {
        const g = new StarCatchGame(m, {
            float: (text, x, y) => {
                const id = Math.random();
                setFloats((f) => [...f, { id, text, x, y }]);
                setTimeout(() => setFloats((f) => f.filter((it) => it.id !== id)), 1200);
            },
            lose: () => {
                setPhase('lose');
                setDialog({
                    open: true, backdrop: 10,
                    content: { title: TXT.LOSE.title, body: TXT.LOSE.body, buttons: [{ label: TXT.LOSE.button, variant: 'gold', onClick: startGame }] },
                });
            },
            win: () => {
                markCompleted(config.id);
                setPhase('win');
                stepRef.current = 0;
            },
            winDialog: () => setWinDialogTick((t) => t + 1),
            winText: () => setWinText(true),
        }, config);
        game.current = g;
        if (import.meta.env.DEV) (window as unknown as { __game: StarCatchGame }).__game = g; // để soi/test trong DevTools
        root.addChild(g.view);
        const tick = (t: { deltaMS: number }) => g.update(t.deltaMS);
        app.ticker.add(tick);
        return () => {
            app.ticker.remove(tick);
            g.destroy();
            game.current = null;
        };
    });

    // Cutscene báo tới lúc hiện khung thoại
    useEffect(() => {
        if (!winDialogTick || !script) return;
        setPeek(false);
        setDialog({ open: true, backdrop: 0, cutscene: true, content: { eyebrow: date, title: script.title, tone: 'gold', body: script.steps[0].body, buttons: stepButtons(0) } });
    }, [winDialogTick]); // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => { game.current?.resize(m); }, [m]);
    useEffect(() => { showStart(); }, [showStart]);

    // ---------------- Điều khiển ----------------
    useEffect(() => {
        const onMove = (e: PointerEvent) => game.current?.setPointer(e.clientX, e.clientY);
        const key = (down: boolean) => (e: KeyboardEvent) => {
            const k = e.key.toLowerCase();
            if (k === 'arrowleft' || k === 'a') game.current?.setKey('left', down);
            if (k === 'arrowright' || k === 'd') game.current?.setKey('right', down);
            if (down) game.current?.onKeyChar(e.key);
        };
        const kd = key(true), ku = key(false);
        window.addEventListener('pointermove', onMove);
        window.addEventListener('keydown', kd);
        window.addEventListener('keyup', ku);
        return () => {
            window.removeEventListener('pointermove', onMove);
            window.removeEventListener('keydown', kd);
            window.removeEventListener('keyup', ku);
            const bgm = sound('bgm.mp3', { volume: 0.4, loop: true });
            bgm.fade(bgm.volume(), 0, 400);
            setTimeout(() => bgm.stop(), 450);
        };
    }, []);

    return (
        <div className="screen">
            <HomeButton onClick={() => { playClick(); onExit(); }} hidden={phase === 'play'} />
            <HudBar visible={phase === 'play'} />
            {floats.map((f) => <div key={f.id} className="float-text" style={{ left: f.x, top: f.y }}><RichText text={f.text} /></div>)}
            {config.cutscene === 'heart' && winText && <Slides top={heartLayout(m).textY} lines={TXT.MILESTONE_2} />}
            {config.cutscene === 'constellation' && winText && <Slides top={constellationLayout(m).textY} lines={TXT.MILESTONE_3} tone="star" />}
            <Dialog
                open={dialog.open && !peek}
                content={dialog.content}
                backdrop={dialog.backdrop}
                placement={dialog.cutscene ? 'bottom' : 'center'}
                top={dialog.cutscene ? underMoon : undefined}
                onDismiss={dialog.cutscene ? () => setPeek(true) : undefined}
            />
            {dialog.open && peek && (
                <button
                    className={`reopen-btn ${underMoon !== undefined ? 'center' : ''}`}
                    style={underMoon !== undefined ? { top: underMoon } : undefined}
                    onClick={() => { playClick(); setPeek(false); }}
                >
                    <Icon name="envelope" />{TXT.WATCH.reopen}
                </button>
            )}
        </div>
    );
}

// ---------------- HUD: đọc từ store Zustand, chỉ phần này render lại khi điểm đổi ----------------
function HudBar({ visible }: { visible: boolean }) {
    const ref = useRef<HTMLDivElement>(null);
    const score = useHud((s) => s.score);
    const target = useHud((s) => s.target);
    const lives = useHud((s) => s.lives);
    const time = useHud((s) => s.time);
    const infLives = useHud((s) => s.infLives);
    const infTime = useHud((s) => s.infTime);
    const pulse = useHud((s) => s.pulse);
    useLayoutEffect(() => {
        if (ref.current) gsap.to(ref.current, { opacity: visible ? 1 : 0, y: visible ? 0 : -10, duration: visible ? 0.8 : 0.6, ease: 'power3.out' });
    }, [visible]);
    const inf = <span className="inf">∞</span>;
    return (
        <div ref={ref} className="hud" style={{ opacity: 0 }}>
            <div className="hud-pills">
                <div className="pill"><b key={pulse.score} className="pop lilac">{score}</b><span>/ {target} <Icon name="star" /></span></div>
                <div className="pill"><span>Mạng</span>{infLives ? inf : <b key={pulse.lives} className="pop rose">{lives}</b>}</div>
                <div className="pill">{infTime ? inf : <b key={pulse.time} className={`pop ${time <= 5 ? 'rose' : 'lilac'}`}>{time}</b>}<span>giây</span></div>
            </div>
            <div className="progress"><div className="progress-fill" style={{ width: `${Math.min(1, score / target) * 100}%` }} /></div>
        </div>
    );
}

// ---------------- Lời nhắn màn 2 & 3: từng cặp câu, mỗi cặp 6 giây — chữ trần (không khung) ----------------
//   tone 'petal': hồng hoa đào (màn 2)   'star': vàng ánh sao (màn 3)
function Slides({ top, lines, tone = 'petal' }: { top: number; lines: { l1: string; l2: string }[]; tone?: 'petal' | 'star' }) {
    const box = useRef<HTMLDivElement>(null);
    useLayoutEffect(() => {
        const tl = gsap.timeline();
        const slides = box.current!.querySelectorAll<HTMLElement>('.slide');
        slides.forEach((s, i) => {
            const [l1, l2] = s.children;
            const at = i * 6;
            // nhoè → rõ, nổi nhẹ lên; rời đi thì nhoè & bay lên
            const enter = { opacity: 1, y: 0, filter: 'blur(0px)', letterSpacing: '0.01em', duration: 1.2, ease: 'power3.out' };
            tl.fromTo(l1, { opacity: 0, y: 12, filter: 'blur(8px)', letterSpacing: '0.08em' }, enter, at);
            tl.fromTo(l2, { opacity: 0, y: 12, filter: 'blur(8px)', letterSpacing: '0.08em' }, enter, at + 1.4);
            if (i < slides.length - 1) tl.to([l1, l2], { opacity: 0, y: -10, filter: 'blur(6px)', duration: 0.9, ease: 'power1.in' }, at + 5);
        });
        return () => { tl.kill(); };
    }, []);
    return (
        <div ref={box} className="caption plain" style={{ top }}>
            <div className={`caption-plain slides ${tone}`}>
                {lines.map((s, i) => (
                    <div key={i} className="slide">
                        <div className="l1" style={{ opacity: 0 }}><RichText text={s.l1} /></div>
                        <div className="l2" style={{ opacity: 0 }}><RichText text={s.l2} /></div>
                    </div>
                ))}
            </div>
        </div>
    );
}
