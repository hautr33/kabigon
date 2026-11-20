import gsap from 'gsap';
import { useRef, useState } from 'react';
import { playClick } from '../../core/audio';
import { sfx } from '../../core/sfx';
import { RichText } from '../../ui/RichText';
import { INGREDIENTS, INGREDIENT_NAME, IngredientIcon, type PupMood, type Ingredient } from './art';
import { PupTalk } from './PupTalk';
import { RECIPE } from './dialogue';

// Màn 4 · Công thức bí mật — kiểu Mastermind: đoán 4 nguyên liệu khác nhau theo đúng thứ tự.
const SLOTS = 4;
const TRIES = 7;

const newSecret = (): Ingredient[] => [...INGREDIENTS].sort(() => Math.random() - 0.5).slice(0, SLOTS);

function score(guess: Ingredient[], secret: Ingredient[]) {
    let exact = 0, near = 0;
    guess.forEach((g, i) => { if (g === secret[i]) exact++; else if (secret.includes(g)) near++; });
    return { exact, near };
}

export function RecipePuzzle({ onSolved, onCheer }: { onSolved: () => void; onCheer?: () => void }) {
    const [secret, setSecret] = useState(newSecret);
    const [rows, setRows] = useState<{ guess: Ingredient[]; exact: number; near: number }[]>([]);
    const [cur, setCur] = useState<(Ingredient | null)[]>(Array(SLOTS).fill(null));
    const [cat, setCat] = useState<{ mood: PupMood; text: string }>({ mood: 'happy', text: RECIPE.catIdle });
    const [reveal, setReveal] = useState(false);
    const [done, setDone] = useState(false);
    const [noteMode, setNoteMode] = useState(false); // chế độ gạch món (đánh dấu món chắc chắn không có)
    const [crossed, setCrossed] = useState<Set<Ingredient>>(new Set());
    const bowl = useRef<HTMLDivElement>(null);
    if (import.meta.env.DEV) (window as unknown as { __recipe: Ingredient[] }).__recipe = secret; // để soi/test trong DevTools

    const pick = (id: Ingredient) => {
        if (done || reveal) return;
        if (noteMode) {
            sfx.tick();
            const next = new Set(crossed);
            if (next.has(id)) next.delete(id); else next.add(id);
            setCrossed(next);
            return;
        }
        const i = cur.indexOf(null);
        if (i < 0 || cur.includes(id)) return;
        sfx.pop();
        const next = [...cur]; next[i] = id; setCur(next);
    };
    const unpick = (i: number) => {
        if (done || reveal || !cur[i]) return;
        sfx.tick();
        const next = [...cur]; next[i] = null; setCur(next);
    };

    const tryMix = () => {
        if (cur.includes(null) || done) return;
        const guess = cur as Ingredient[];
        const s = score(guess, secret);
        const nextRows = [...rows, { guess, ...s }];
        setRows(nextRows);
        setCur(Array(SLOTS).fill(null));
        if (bowl.current) gsap.fromTo(bowl.current, { rotate: -8 }, { rotate: 0, duration: 0.6, ease: 'elastic.out(1.2, 0.3)' });
        if (s.exact === SLOTS) {
            setDone(true);
            sfx.chime();
            onCheer?.();
            setCat({ mood: 'love', text: RECIPE.catWin });
            setTimeout(onSolved, 1300);
        } else if (nextRows.length >= TRIES) {
            sfx.nope();
            setReveal(true);
            setCat({ mood: 'no', text: RECIPE.catLose });
        } else {
            if (s.exact + s.near > 0) sfx.pop(); else sfx.nope();
            setCat({ mood: s.exact >= 2 ? 'yes' : s.exact + s.near > 0 ? 'think' : 'no', text: RECIPE.catFeedback(s.exact, s.near) });
        }
    };

    // Mẹo bí mật: xoa đầu Bé Corgi 9 lần liên tiếp (nghỉ quá 2 giây thì đếm lại) → nướng xong luôn
    const pats = useRef({ n: 0, t: 0 });
    const pat = () => {
        if (done) return;
        const now = performance.now();
        pats.current.n = now - pats.current.t < 2000 ? pats.current.n + 1 : 1;
        pats.current.t = now;
        if (pats.current.n < 9) return;
        pats.current.n = 0;
        setRows((r) => [...r, { guess: secret, exact: SLOTS, near: 0 }]);
        setCur(Array(SLOTS).fill(null));
        setReveal(false);
        setDone(true);
        sfx.chime();
        onCheer?.();
        setCat({ mood: 'love', text: RECIPE.catWin });
        setTimeout(onSolved, 1300);
    };

    const restart = () => {
        playClick();
        setSecret(newSecret()); setRows([]); setCur(Array(SLOTS).fill(null)); setReveal(false); setCrossed(new Set()); setNoteMode(false);
        setCat({ mood: 'happy', text: RECIPE.catIdle });
    };

    return (
        <div className="bk-card bk-recipe">
            <PupTalk mood={cat.mood} text={cat.text} onPat={pat} />
            <div className="bk-recipe-body">
                <div className="bk-rows">
                    {Array.from({ length: TRIES }, (_, r) => {
                        const row = rows[r];
                        const isCur = r === rows.length && !done && !reveal;
                        const items = row ? row.guess : isCur ? cur : Array(SLOTS).fill(null);
                        return (
                            <div key={r} className={`bk-row ${isCur ? 'current' : ''} ${row ? 'played' : ''}`}>
                                <span className="bk-row-no">{r + 1}</span>
                                {items.map((it: Ingredient | null, i: number) => (
                                    <button key={i} className={`bk-slot ${it ? 'filled' : ''}`} onClick={() => isCur && unpick(i)} disabled={!isCur}>
                                        {it && <IngredientIcon id={it} />}
                                    </button>
                                ))}
                                <span className="bk-pegs">
                                    {row && Array.from({ length: SLOTS }, (_, i) => (
                                        <span key={i} className={`bk-peg ${i < row.exact ? 'exact' : i < row.exact + row.near ? 'near' : ''}`} />
                                    ))}
                                </span>
                            </div>
                        );
                    })}
                    {reveal && (
                        <div className="bk-row reveal">
                            <span className="bk-row-no">★</span>
                            {secret.map((it, i) => <span key={i} className="bk-slot filled"><IngredientIcon id={it} /></span>)}
                        </div>
                    )}
                </div>
                <div className="bk-side">
                    <div ref={bowl} className="bk-bowl" aria-hidden>
                        <svg viewBox="0 0 120 80">
                            <path d="M8 26h104q-6 46-52 46T8 26z" fill="#fde3dd" stroke="#e5a59a" strokeWidth="3" />
                            <ellipse cx="60" cy="26" rx="52" ry="10" fill="#fff4e6" stroke="#e5a59a" strokeWidth="3" />
                            <path d="M78 6l10 22" stroke="#b07a52" strokeWidth="5" strokeLinecap="round" />
                        </svg>
                    </div>
                    <div className="bk-palette">
                        {INGREDIENTS.map((id) => (
                            <button key={id} className={`bk-ing-btn ${cur.includes(id) ? 'used' : ''} ${crossed.has(id) ? 'crossed' : ''} ${noteMode ? 'noting' : ''}`} onClick={() => pick(id)} disabled={done || reveal} title={INGREDIENT_NAME[id]}>
                                <IngredientIcon id={id} />
                                <span>{INGREDIENT_NAME[id]}</span>
                            </button>
                        ))}
                    </div>
                    <button className={`bk-note-btn ${noteMode ? 'on' : ''}`} onClick={() => { sfx.tick(); setNoteMode(!noteMode); if (!noteMode) setCat({ mood: 'happy', text: RECIPE.noteOn }); }} disabled={done || reveal}>
                        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden><path d="M4 20l4-1 11-11-3-3L5 16z" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" /><path d="M14 6l3 3" stroke="currentColor" strokeWidth="2" /></svg>
                        {RECIPE.noteButton}
                    </button>
                    {reveal
                        ? <button className="btn btn-pink" onClick={restart}>{RECIPE.resetButton}</button>
                        : <button className="btn btn-pink" onClick={tryMix} disabled={cur.includes(null) || done}><RichText text={RECIPE.tryButton} /></button>}
                    <div className="bk-legend"><span className="bk-peg exact" /> đúng chỗ <span className="bk-peg near" /> sai chỗ</div>
                </div>
            </div>
        </div>
    );
}
