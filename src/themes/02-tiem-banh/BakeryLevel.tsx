import { useEffect, useRef, useState } from 'react';
import { playClick } from '../../core/audio';
import { musicBox } from '../../core/sfx';
import { formatDate, levelDate } from '../../core/dates';
import { tex } from '../../core/pixi/art';
import { Emitter } from '../../core/pixi/particles';
import { usePixiScene, useMetrics } from '../../core/pixi/PixiHost';
import { NightSky } from '../../core/pixi/sky';
import { useProgress } from '../../store/progress';
import { Dialog, type DialogContent } from '../../ui/Dialog';
import { CursorTrail } from '../../ui/CursorTrail';
import { HomeButton } from '../../ui/HomeButton';
import { BakeryEnding } from './BakeryEnding';
import { COMMON, DECORATE, DELIVERY, RECIPE } from './dialogue';
import { DecoratePuzzle } from './DecoratePuzzle';
import { DeliveryPuzzle } from './DeliveryPuzzle';
import { RecipePuzzle } from './RecipePuzzle';
import { kitchenWorld } from './kitchen';
import './bakery.css';

export type BakeryKind = 'recipe' | 'decorate' | 'delivery';
const TEXT = { recipe: RECIPE, decorate: DECORATE, delivery: DELIVERY };

// Khung chung cho 3 màn giải đố của theme Tiệm Bánh: giới thiệu → giải đố → pháo giấy + lời nhắn.
export function BakeryLevel({ id, kind, number, onExit }: { id: string; kind: BakeryKind; number: number; onExit: () => void }) {
    const m = useMetrics();
    const T = TEXT[kind];
    const date = formatDate(levelDate(number), ' · ');
    const markCompleted = useProgress((s) => s.markCompleted);
    const [phase, setPhase] = useState<'intro' | 'play' | 'win'>('intro');
    const [round, setRound] = useState(0); // đổi để chơi lại từ đầu
    const [dialog, setDialog] = useState<{ open: boolean; content: DialogContent }>({ open: false, content: {} });
    const party = useRef<(() => void) | null>(null);
    const cheer = useRef<(() => void) | null>(null); // Bé Corgi trong bếp nhún nhảy
    const perform = useRef<((name: string) => Promise<void>) | null>(null); // diễn cảnh bằng đồ vật trong bếp
    const [ending, setEnding] = useState(false);
    const [leaving, setLeaving] = useState(false); // khung giải đố mờ đi khi đã giải xong

    // ---------------- Nền Pixi: thế giới tiệm bánh + pháo giấy ----------------
    usePixiScene((app, root) => {
        const sky = new NightSky(m);
        root.addChild(sky.view);
        const world = kitchenWorld(m, sky);
        world.setVisibility(1);
        cheer.current = () => world.cheer?.();
        perform.current = world.perform ?? null;
        const { W, u } = m;
        const confetti = [
            new Emitter(tex('star5'), { life: [2600, 4200], speedX: [-60 * u, 60 * u], speedY: [60 * u, 160 * u], gravity: 40 * u, spin: [-300, 300], scale: [0.35 * u, 0.7 * u], scaleEnd: 0.8, tint: [0xef8f8a, 0xf7d27a, 0xf4ad62, 0xc6daa8, 0xfff7ec], blend: 'normal' }),
            new Emitter(tex('heart'), { life: [2600, 4200], speedX: [-50 * u, 50 * u], speedY: [50 * u, 140 * u], gravity: 30 * u, spin: [-120, 120], scale: [0.35 * u, 0.6 * u], scaleEnd: 0.8, tint: [0xef8f8a, 0xf6b7ae, 0xd96f6c], blend: 'normal' }),
        ];
        confetti.forEach((e) => root.addChild(e.view));
        party.current = () => {
            for (let i = 0; i < 70; i++) confetti[i % 2].emit(Math.random() * W, -20 * u - Math.random() * 120 * u, 1);
        };
        const tick = (t: { deltaMS: number }) => {
            const dt = Math.min(t.deltaMS, 50);
            world.update?.(dt);
            confetti.forEach((e) => e.update(dt));
        };
        app.ticker.add(tick);
        return () => {
            app.ticker.remove(tick);
            confetti.forEach((e) => e.destroy());
            world.destroy();
            sky.destroy();
            party.current = null;
            cheer.current = null;
            perform.current = null;
        };
    }, [m]);

    // Nhạc nền: hộp nhạc vui tươi (tạo bằng Web Audio) — bắt đầu khi bấm vào bếp, tắt khi rời màn
    useEffect(() => { musicBox.start(0.55); return () => musicBox.stop(); }, []);

    // ---------------- Khung thoại ----------------
    const showIntro = () => setDialog({
        open: true,
        content: {
            eyebrow: `Màn ${number} · ${date}`, title: T.title, body: T.intro, hint: T.hint,
            buttons: [{ label: T.start, variant: 'pink', onClick: () => {
                setDialog((d) => ({ ...d, open: false }));
                setPhase('play');
                musicBox.start(0.55);
            } }],
        },
    });
    useEffect(showIntro, []); // eslint-disable-line react-hooks/exhaustive-deps

    const winStep = (i: number) => {
        const step = T.win[i];
        const last = 'end' in step && step.end;
        setDialog({
            open: true,
            content: {
                eyebrow: date, title: step.title, body: step.body, tone: 'gold',
                buttons: last
                    ? [
                        { label: COMMON.home, variant: 'pink', onClick: onExit },
                        { label: COMMON.replay, variant: 'ghost', onClick: () => { setDialog((d) => ({ ...d, open: false })); setEnding(false); setLeaving(false); setRound((r) => r + 1); setPhase('play'); } },
                    ]
                    : [{ label: COMMON.next, variant: 'pink', onClick: () => { party.current?.(); winStep(i + 1); } }],
            },
        });
    };

    // Giải xong: Corgi ăn mừng → đoạn kết riêng của màn → pháo giấy + lời nhắn (khung thoại ở dưới, cảnh ở trên)
    const solved = () => {
        markCompleted(id); // (Corgi đã ăn mừng ngay lúc giải đúng, trong từng màn)
        setPhase('win');
        setLeaving(true);
        // màn 4: tận dụng lò nướng trong bếp để diễn; các màn khác dùng đoạn kết riêng
        if (kind === 'recipe' && perform.current) perform.current('bake').then(endingDone);
        else setEnding(true);
    };
    const endingDone = () => {
        party.current?.();
        setTimeout(() => party.current?.(), 700);
        winStep(0);
    };

    return (
        <div className="screen bk-screen">
            <CursorTrail variant="bakery" />
            <HomeButton onClick={() => { playClick(); onExit(); }} />
            {phase !== 'intro' && (
                <div className={`bk-stage interactive ${leaving ? 'leaving' : ''}`} key={round}>
                    {kind === 'recipe' && <RecipePuzzle onSolved={solved} onCheer={() => cheer.current?.()} />}
                    {kind === 'decorate' && <DecoratePuzzle onSolved={solved} onCheer={() => cheer.current?.()} />}
                    {kind === 'delivery' && <DeliveryPuzzle onSolved={solved} onCheer={() => cheer.current?.()} />}
                </div>
            )}
            {ending && <BakeryEnding key={`end-${round}`} kind={kind} onDone={endingDone} />}
            <Dialog open={dialog.open} content={dialog.content} backdrop={phase === 'win' ? 0 : 6} skin="cream" placement={phase === 'win' ? 'bottom' : 'center'}
                // màn 4: bánh đã nằm trong lò trên quầy → khung thoại lên mảng tường phía trên, chừa trọn quầy bếp (lò + Bé Corgi)
                top={phase === 'win' && kind === 'recipe' ? Math.round(m.H * 0.15) : undefined} />
        </div>
    );
}
