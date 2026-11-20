import { useEffect, useRef, useState } from 'react';
import { sfx } from '../../core/sfx';
import { RichText } from '../../ui/RichText';
import { Corgi, type PupMood } from './art';

// Corgi + bong bóng thoại (dùng chung cho các màn của theme).
// Bé Corgi tương tác được (dùng cho mẹo bí mật):
//   onPat  : mỗi lần chạm → nảy dẻo + một trái tim nhỏ bay lên
//   holdMs + onHold : giữ (nhấn giữ) đủ holdMs → gọi onHold; có vòng tiến độ quanh Bé Corgi, thả sớm thì huỷ
export function PupTalk({ mood, text, onPat, holdMs, onHold }: {
    mood: PupMood; text: string; onPat?: () => void; holdMs?: number; onHold?: () => void;
}) {
    const [hearts, setHearts] = useState<number[]>([]);
    const [bounce, setBounce] = useState(0);
    const [holding, setHolding] = useState(false);
    const holdTimer = useRef(0);
    const tickTimer = useRef(0);
    const interactive = !!(onPat || onHold);

    useEffect(() => () => { clearTimeout(holdTimer.current); clearInterval(tickTimer.current); }, []);

    const pat = () => {
        if (!onPat) return;
        sfx.pop();
        setBounce((b) => b + 1);
        const id = Math.random();
        setHearts((h) => [...h, id]);
        setTimeout(() => setHearts((h) => h.filter((x) => x !== id)), 900);
        onPat();
    };
    const startHold = () => {
        if (!onHold || !holdMs) return;
        setHolding(true);
        clearInterval(tickTimer.current);
        tickTimer.current = window.setInterval(() => sfx.tick(), 1000);
        holdTimer.current = window.setTimeout(() => { endHold(); onHold(); }, holdMs);
    };
    const endHold = () => {
        clearTimeout(holdTimer.current);
        clearInterval(tickTimer.current);
        setHolding(false);
    };

    return (
        <div className="bk-cat-talk">
            <span
                className={`bk-pup ${interactive ? 'interactive' : ''} ${holding ? 'holding' : ''}`}
                style={{ ['--hold' as string]: `${holdMs ?? 0}ms` }}
                onClick={pat}
                onPointerDown={startHold}
                onPointerUp={endHold}
                onPointerLeave={endHold}
                onPointerCancel={endHold}
                onContextMenu={(e) => interactive && e.preventDefault()}
            >
                <span key={bounce} className={bounce ? 'bk-pup-jelly' : ''}><Corgi mood={mood} /></span>
                {holding && <span className="bk-hold-ring" />}
                {hearts.map((id) => (
                    <svg key={id} className="bk-pat-heart" viewBox="0 0 24 24" style={{ left: `${30 + ((id * 100) % 40)}%` }}>
                        <path d="M12 21C6 17 2 13.6 2 9.4A4.9 4.9 0 0 1 12 6.6a4.9 4.9 0 0 1 10 2.8C22 13.6 18 17 12 21z" fill="#ef8f8a" />
                    </svg>
                ))}
            </span>
            <div key={text} className="bk-bubble"><RichText text={text} /></div>
        </div>
    );
}
