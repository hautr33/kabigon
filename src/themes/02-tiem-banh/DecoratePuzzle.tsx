import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../core/sfx';
import { TOPPINGS, TOPPING_NAME, ToppingIcon, type PupMood, type Topping } from './art';
import { PupTalk } from './PupTalk';
import { DECORATE } from './dialogue';

// Màn 5 · Chiếc bánh soi gương — trang trí nửa phải đối xứng với nửa trái (qua đường giữa).
//   Bánh 1: mẫu bên trái luôn hiện.   Bánh 2 (thử trí nhớ): mẫu chỉ hiện 4 giây rồi bị phủ kem; có "Nhìn trộm" 1.5 giây.
const ROWS = 5, COLS = 6, HALF = COLS / 2;
const SHOW_MS = 4000, PEEK_MS = 1500;

// Ô nằm trong mặt bánh tròn
const inCake = (r: number, c: number) => Math.hypot(c + 0.5 - COLS / 2, (r + 0.5 - ROWS / 2) * 1.15) < 3.05;

// Mẫu Corgi trang trí sẵn ở nửa trái (cột 0..2); null = để trống
type Pattern = (Topping | null)[][];
const PATTERNS: Pattern[] = [
    [
        [null, 'cream', 'strawberry'],
        ['cream', 'heart', 'blueberry'],
        ['strawberry', 'blueberry', 'heart'],
        ['cream', 'strawberry', 'cream'],
        [null, 'cream', 'strawberry'],
    ],
    [
        [null, 'blueberry', 'heart'],
        ['strawberry', 'cream', 'cream'],
        ['heart', 'strawberry', 'blueberry'],
        ['blueberry', 'cream', 'strawberry'],
        [null, 'heart', 'cream'],
    ],
];

const emptyRight = () => Array.from({ length: ROWS }, () => Array<Topping | null>(HALF).fill(null));

export function DecoratePuzzle({ onSolved, onCheer }: { onSolved: () => void; onCheer?: () => void }) {
    const [round, setRound] = useState(0);
    const [right, setRight] = useState<(Topping | null)[][]>(emptyRight);
    const [tool, setTool] = useState<Topping | 'eraser'>('strawberry');
    const [cat, setCat] = useState<{ mood: PupMood; text: string }>({ mood: 'happy', text: DECORATE.catIdle });
    const [busy, setBusy] = useState(false); // đang chuyển bánh / đã xong
    const [covered, setCovered] = useState(false); // nửa trái bị phủ kem (bánh 2)
    const [solved, setSolved] = useState(false);
    const timers = useRef<number[]>([]);
    const later = (fn: () => void, ms: number) => { timers.current.push(window.setTimeout(fn, ms)); };
    useEffect(() => () => timers.current.forEach(clearTimeout), []);

    const LEFT = PATTERNS[round];
    const target = (r: number, c: number): Topping | null => LEFT[r][COLS - 1 - c]; // ô phải c ↔ ô trái (COLS-1-c)

    const wrongCount = (grid: (Topping | null)[][]) => {
        let n = 0;
        for (let r = 0; r < ROWS; r++) for (let c = HALF; c < COLS; c++) if (inCake(r, c) && grid[r][c - HALF] !== target(r, c)) n++;
        return n;
    };

    const startRound2 = () => {
        setRound(1);
        setRight(emptyRight());
        setCovered(false);
        setCat({ mood: 'happy', text: DECORATE.round2 });
        later(() => { setCovered(true); setBusy(false); setCat({ mood: 'think', text: DECORATE.covered }); sfx.pop(); }, SHOW_MS);
    };

    const place = (r: number, c: number) => {
        if (busy || !inCake(r, c)) return;
        const next = right.map((row) => [...row]);
        const cur = next[r][c - HALF];
        next[r][c - HALF] = tool === 'eraser' ? null : cur === tool ? null : tool;
        setRight(next);
        if (next[r][c - HALF]) sfx.pop(); else sfx.tick();
        if (wrongCount(next) === 0) {
            setBusy(true);
            setCovered(false);
            sfx.chime();
            onCheer?.();
            setCat({ mood: 'love', text: DECORATE.catCheck(0) });
            if (round === 0) later(startRound2, 1600);
            else { setSolved(true); later(onSolved, 1500); }
        }
    };

    // Mẹo bí mật: giữ Bé Corgi 6 giây → Bé Corgi trang trí hộ cả hai chiếc bánh
    const autoDecorate = () => {
        if (solved) return;
        timers.current.forEach(clearTimeout);
        const last = PATTERNS.length - 1;
        setRound(last);
        setRight(Array.from({ length: ROWS }, (_, r) => Array.from({ length: HALF }, (_, i) => PATTERNS[last][r][COLS - 1 - (i + HALF)])));
        setCovered(false);
        setBusy(true);
        setSolved(true);
        sfx.chime();
        onCheer?.();
        setCat({ mood: 'love', text: DECORATE.catCheck(0) });
        later(onSolved, 1500);
    };

    const check = () => {
        sfx.tick();
        const n = wrongCount(right);
        setCat({ mood: n <= 2 ? 'yes' : 'think', text: DECORATE.catCheck(n) });
    };

    const peek = () => {
        if (!covered || busy) return;
        sfx.tick();
        setCovered(false);
        setCat({ mood: 'yes', text: DECORATE.peekCat });
        later(() => setCovered(true), PEEK_MS);
    };

    return (
        <div className="bk-card bk-decorate">
            <PupTalk mood={cat.mood} text={cat.text} holdMs={6000} onHold={autoDecorate} />
            <div className="bk-decorate-body">
                <div className={`bk-cake ${solved ? 'done' : ''}`} key={round}>
                    <div className="bk-round">{DECORATE.round(round + 1)}</div>
                    <div className="bk-cake-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                        {Array.from({ length: ROWS }, (_, r) => Array.from({ length: COLS }, (_, c) => {
                            const ok = inCake(r, c);
                            const leftSide = c < HALF;
                            const item = leftSide ? LEFT[r][c] : right[r][c - HALF];
                            return (
                                <button
                                    key={`${r}-${c}`}
                                    className={`bk-cell ${ok ? '' : 'off'} ${leftSide ? 'given' : 'mine'}`}
                                    onClick={() => !leftSide && place(r, c)}
                                    disabled={!ok || leftSide || busy}
                                >
                                    {ok && item && <span key={item} className="bk-pop"><ToppingIcon id={item} /></span>}
                                </button>
                            );
                        }))}
                    </div>
                    {/* lớp kem phủ nửa trái (bánh 2) */}
                    <div className={`bk-frosting ${covered ? 'on' : ''}`} aria-hidden>
                        <svg viewBox="0 0 100 200" preserveAspectRatio="none">
                            <path d="M0 0H92q8 12 0 24t0 24 0 24 0 24 0 24 0 24 0 24 0 24 0 8H0z" fill="#fffaf3" />
                            {[30, 70, 110, 150].map((y) => <path key={y} d={`M14 ${y}q20-10 40 0t30 0`} stroke="#f8dccf" strokeWidth="5" fill="none" strokeLinecap="round" />)}
                        </svg>
                    </div>
                    <div className="bk-mirror" />
                    {solved && <div className="bk-cake-msg">H <span>♥</span> T</div>}
                </div>
                <div className="bk-side">
                    <div className="bk-palette tools">
                        {TOPPINGS.map((id) => (
                            <button key={id} className={`bk-ing-btn ${tool === id ? 'active' : ''}`} onClick={() => { sfx.tick(); setTool(id); }}>
                                <ToppingIcon id={id} /><span>{TOPPING_NAME[id]}</span>
                            </button>
                        ))}
                        <button className={`bk-ing-btn ${tool === 'eraser' ? 'active' : ''}`} onClick={() => { sfx.tick(); setTool('eraser'); }}>
                            <svg className="bk-top" viewBox="0 0 40 40" aria-hidden>
                                <rect x="8" y="12" width="24" height="16" rx="4" fill="#fde3dd" stroke="#e5a59a" strokeWidth="2" transform="rotate(-20 20 20)" />
                                <rect x="8" y="12" width="10" height="16" rx="4" fill="#fdeedb" transform="rotate(-20 20 20)" />
                            </svg>
                            <span>{DECORATE.eraser}</span>
                        </button>
                    </div>
                    <button className="btn btn-pink" onClick={check} disabled={busy}>{DECORATE.checkButton}</button>
                    {round === 1 && <button className="bk-note-btn" onClick={peek} disabled={!covered || busy}>{DECORATE.peekButton}</button>}
                </div>
            </div>
        </div>
    );
}
