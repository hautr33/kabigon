import gsap from 'gsap';
import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { sfx } from '../../core/sfx';
import { Corgi, type PupMood } from './art';
import { PupTalk } from './PupTalk';
import { DELIVERY } from './dialogue';

// Màn 6 · Giao bánh — xoay các ô đường để nối từ tiệm bánh (trái) tới nhà khách (phải).
// Hướng nối của ô: bit N=1, E=2, S=4, W=8. Xoay 90° theo chiều kim đồng hồ: N→E→S→W.
const ROWS = 5, COLS = 6;
const N = 1, E = 2, S = 4, W = 8;
const DIRS = [{ bit: N, dr: -1, dc: 0, opp: S }, { bit: E, dr: 0, dc: 1, opp: W }, { bit: S, dr: 1, dc: 0, opp: N }, { bit: W, dr: 0, dc: -1, opp: E }];
const rot = (mask: number, k: number) => { let m = mask; for (let i = 0; i < ((k % 4) + 4) % 4; i++) m = ((m << 1) | (m >> 3)) & 15; return m; };

type Tile = { base: number; turns: number }; // turns: số lần đã xoay (đếm dồn để xoay mượt, không quay ngược)

// Tạo bàn chơi: một đường đi ngẫu nhiên (không tự cắt) từ trái sang phải, các ô còn lại là đường rẽ nhánh gây nhiễu
// Đường đi phải đủ "khó": dài ≥ 12 ô và rẽ ít nhất 4 lần (không còn kiểu đi thẳng một mạch)
const MIN_LEN = 12, MIN_TURNS = 4;
const turnsOf = (p: [number, number][]) => {
    let n = 0;
    for (let i = 1; i < p.length - 1; i++) {
        const d1 = [p[i][0] - p[i - 1][0], p[i][1] - p[i - 1][1]], d2 = [p[i + 1][0] - p[i][0], p[i + 1][1] - p[i][1]];
        if (d1[0] !== d2[0] || d1[1] !== d2[1]) n++;
    }
    return n;
};

function makeBoard(): { tiles: Tile[][]; sr: number; er: number } {
    for (let attempt = 0; attempt < 200; attempt++) {
        const b = makeBoardOnce();
        if (b.path.length >= MIN_LEN && turnsOf(b.path) >= MIN_TURNS) return b;
    }
    return makeBoardOnce();
}

function makeBoardOnce() {
    const sr = Math.floor(Math.random() * ROWS), er = Math.floor(Math.random() * ROWS);
    let path: [number, number][] = [];
    const walk = (r: number, c: number, seen: Set<string>): boolean => {
        path.push([r, c]); seen.add(`${r},${c}`);
        if (c === COLS - 1 && r === er && path.length >= MIN_LEN) return true;
        if (path.length > 22) { path.pop(); seen.delete(`${r},${c}`); return false; }
        const opts = DIRS.filter((d) => d.bit !== W || Math.random() < 0.3).sort(() => Math.random() - 0.5);
        for (const d of opts) {
            const nr = r + d.dr, nc = c + d.dc;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || seen.has(`${nr},${nc}`)) continue;
            if (walk(nr, nc, seen)) return true;
        }
        path.pop(); seen.delete(`${r},${c}`);
        return false;
    };
    while (!walk(sr, 0, new Set())) path = [];

    const tiles: Tile[][] = Array.from({ length: ROWS }, () => Array.from({ length: COLS }, () => ({ base: 0, turns: 0 })));
    const SHAPES = [N | S, N | E, N | E | S]; // thẳng, rẽ, chữ T
    for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) tiles[r][c].base = SHAPES[Math.random() < 0.45 ? 1 : Math.random() < 0.6 ? 0 : 2];
    path.forEach(([r, c], i) => {
        let mask = 0;
        const prev = i === 0 ? [r, c - 1] : path[i - 1], next = i === path.length - 1 ? [r, c + 1] : path[i + 1];
        for (const [pr, pc] of [prev, next]) for (const d of DIRS) if (pr === r + d.dr && pc === c + d.dc) mask |= d.bit;
        tiles[r][c].base = mask; // đúng hướng ở turns = 0
    });
    // xáo hướng mọi ô
    for (const row of tiles) for (const t of row) t.turns = Math.floor(Math.random() * 4);
    // không để bàn chơi vô tình đã giải sẵn
    while (trace(tiles, sr, er).route) tiles[path[0][0]][path[0][1]].turns += 1;
    return { tiles, sr, er, path };
}

// Các ô đã nối được từ tiệm bánh (BFS); trả về thêm thứ tự đường đi nếu đã tới nhà
function trace(tiles: Tile[][], sr: number, er: number) {
    const mask = (r: number, c: number) => rot(tiles[r][c].base, tiles[r][c].turns);
    const lit = new Set<string>();
    const parent = new Map<string, string | null>();
    if (!(mask(sr, 0) & W)) return { lit, route: null as [number, number][] | null };
    const q: [number, number][] = [[sr, 0]];
    lit.add(`${sr},0`); parent.set(`${sr},0`, null);
    let end: string | null = null;
    while (q.length) {
        const [r, c] = q.shift()!;
        if (r === er && c === COLS - 1 && mask(r, c) & E) end = `${r},${c}`;
        for (const d of DIRS) {
            const nr = r + d.dr, nc = c + d.dc, k = `${nr},${nc}`;
            if (nr < 0 || nr >= ROWS || nc < 0 || nc >= COLS || lit.has(k)) continue;
            if (mask(r, c) & d.bit && mask(nr, nc) & d.opp) { lit.add(k); parent.set(k, `${r},${c}`); q.push([nr, nc]); }
        }
    }
    let route: [number, number][] | null = null;
    if (end) {
        route = [];
        for (let k: string | null = end; k; k = parent.get(k) ?? null) { const [r, c] = k.split(',').map(Number); route.unshift([r, c]); }
    }
    return { lit, route };
}

function RoadTile({ base, turns, lit }: { base: number; turns: number; lit: boolean }) {
    const arms = [N, E, S, W].filter((b) => base & b);
    const ends: Record<number, [number, number]> = { [N]: [50, 0], [E]: [100, 50], [S]: [50, 100], [W]: [0, 50] };
    const color = lit ? '#f6b7ae' : '#f3e2c8';
    return (
        <svg viewBox="0 0 100 100" className="bk-road" style={{ transform: `rotate(${turns * 90}deg)` }}>
            {arms.map((b) => <line key={`e${b}`} x1="50" y1="50" x2={ends[b][0]} y2={ends[b][1]} stroke={lit ? '#ef8f8a' : '#e5ceb0'} strokeWidth="40" strokeLinecap="butt" />)}
            <circle cx="50" cy="50" r="20" fill={lit ? '#ef8f8a' : '#e5ceb0'} />
            {arms.map((b) => <line key={`r${b}`} x1="50" y1="50" x2={ends[b][0]} y2={ends[b][1]} stroke={color} strokeWidth="32" strokeLinecap="butt" />)}
            <circle cx="50" cy="50" r="16" fill={color} />
            {arms.map((b) => <line key={`d${b}`} x1="50" y1="50" x2={ends[b][0]} y2={ends[b][1]} stroke="#fff" strokeWidth="3" strokeDasharray="7 7" opacity={lit ? 0.9 : 0.6} />)}
        </svg>
    );
}

export function DeliveryPuzzle({ onSolved, onCheer }: { onSolved: () => void; onCheer?: () => void }) {
    const board = useMemo(makeBoard, []);
    const [tiles, setTiles] = useState(board.tiles);
    const [cat, setCat] = useState<{ mood: PupMood; text: string }>({ mood: 'happy', text: DELIVERY.catIdle });
    const [driving, setDriving] = useState<[number, number][] | null>(null);
    const { lit, route } = trace(tiles, board.sr, board.er);
    const grid = useRef<HTMLDivElement>(null);
    const rider = useRef<HTMLDivElement>(null);
    const shop = useRef<HTMLButtonElement>(null);
    const spins = useRef({ n: 0, t: 0, deg: 0 });

    const turn = (r: number, c: number) => {
        if (driving) return;
        const next = tiles.map((row) => row.map((t) => ({ ...t })));
        next[r][c].turns += 1;
        apply(next);
    };
    // để soi/test trong DevTools: xoay mọi ô về đúng hướng
    if (import.meta.env.DEV) (window as unknown as { __solveDelivery: () => void }).__solveDelivery = () =>
        apply(tiles.map((row) => row.map((t) => ({ ...t, turns: Math.ceil((t.turns + 1) / 4) * 4 }))));

    // Mẹo bí mật: xoay ô tiệm bánh 6 vòng (mỗi lần bấm = 1 vòng; nghỉ quá 3 giây thì đếm lại) → đường tự thông
    const spinShop = () => {
        if (driving || !shop.current) return;
        const now = performance.now();
        const s = spins.current;
        s.n = now - s.t < 3000 ? s.n + 1 : 1;
        s.t = now;
        s.deg += 360;
        gsap.to(shop.current, { rotate: s.deg, duration: 0.5, ease: 'back.out(1.6)' });
        sfx.tick();
        if (s.n < 6) return;
        s.n = 0;
        apply(tiles.map((row) => row.map((t) => ({ ...t, turns: Math.ceil((t.turns + 1) / 4) * 4 }))));
    };

    const apply = (next: Tile[][]) => {
        setTiles(next);
        sfx.tick();
        const res = trace(next, board.sr, board.er);
        if (res.route) {
            sfx.bell();
            onCheer?.();
            setCat({ mood: 'love', text: DELIVERY.catGo });
            setTimeout(() => setDriving(res.route), 450);
        }
    };

    // Corgi chạy xe dọc đường đã nối, tới nhà thì báo thắng
    useLayoutEffect(() => {
        if (!driving || !grid.current || !rider.current) return;
        const g = grid.current, cw = g.clientWidth / COLS, ch = g.clientHeight / ROWS;
        const pts = [[board.sr, -0.6] as [number, number], ...driving, [board.er, COLS - 0.4] as [number, number]].map(([r, c]) => ({ x: (c + 0.5) * cw, y: (r + 0.5) * ch }));
        gsap.set(rider.current, { x: pts[0].x, y: pts[0].y, opacity: 1 });
        const tl = gsap.timeline({ onComplete: () => setTimeout(onSolved, 500) });
        pts.slice(1).forEach((p, i) => {
            const flip = p.x < pts[i].x ? -1 : 1;
            tl.to(rider.current, { x: p.x, y: p.y, scaleX: flip, duration: 0.32, ease: 'none' });
        });
        return () => { tl.kill(); };
    }, [driving]); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div className="bk-card bk-delivery">
            <PupTalk mood={cat.mood} text={cat.text} />
            <div className="bk-map">
                <button ref={shop} className="bk-endpoint shop" style={{ top: `${((board.sr + 0.5) / ROWS) * 100}%` }} onClick={spinShop} aria-label="Tiệm bánh">
                    <svg viewBox="0 0 60 60"><rect x="8" y="22" width="44" height="32" rx="4" fill="#fde3dd" /><path d="M4 22h52l-6-12H10z" fill="#ef8f8a" /><rect x="34" y="34" width="12" height="20" rx="5" fill="#b07a52" /><rect x="13" y="30" width="15" height="11" rx="2" fill="#fffaf1" /></svg>
                </button>
                <div ref={grid} className="bk-grid" style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}>
                    {tiles.map((row, r) => row.map((t, c) => (
                        <button key={`${r}-${c}`} className="bk-tile" onClick={() => turn(r, c)} disabled={!!driving}>
                            <RoadTile base={t.base} turns={t.turns} lit={lit.has(`${r},${c}`)} />
                        </button>
                    )))}
                    <div ref={rider} className="bk-rider" style={{ opacity: 0 }}>
                        <Corgi mood="happy" />
                        <svg viewBox="-2 -2 64 34" className="bk-scooter">
                            {/* xe có viền riêng: chỗ corgi ngồi lên xe luôn có đường viền ngăn cách */}
                            <g stroke="#5b3a29" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round">
                                <circle cx="12" cy="22" r="7" fill="#7a5644" /><circle cx="48" cy="22" r="7" fill="#7a5644" />
                                <rect x="16" y="6" width="18" height="12" rx="3" fill="#f7d27a" />
                            </g>
                            <path d="M12 22h30l6-14" stroke="#5b3a29" strokeWidth="8.6" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <path d="M12 22h30l6-14" stroke="#ef8f8a" strokeWidth="4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                            <circle cx="12" cy="22" r="2.4" fill="#ffe7d6" /><circle cx="48" cy="22" r="2.4" fill="#ffe7d6" />
                        </svg>
                    </div>
                </div>
                <div className={`bk-endpoint house ${route ? 'open' : ''}`} style={{ top: `${((board.er + 0.5) / ROWS) * 100}%` }}>
                    <svg viewBox="0 0 60 60"><path d="M6 28L30 8l24 20" fill="#f6b7ae" /><rect x="12" y="26" width="36" height="28" fill="#fff4e6" /><rect x="25" y="36" width="10" height="18" rx="4" fill="#ef8f8a" /><path d="M22 18c-3-2-4-3-4-5a2 2 0 0 1 4-1 2 2 0 0 1 4 1c0 2-1 3-4 5z" fill="#ff5d7a" /></svg>
                </div>
            </div>
        </div>
    );
}
