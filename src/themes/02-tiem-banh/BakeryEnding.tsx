import gsap from 'gsap';
import { useLayoutEffect, useRef } from 'react';
import { sfx } from '../../core/sfx';
import { Corgi, ToppingIcon } from './art';
import { ENDING } from './dialogue';
import type { BakeryKind } from './BakeryLevel';

// Đoạn kết riêng của từng màn (chạy ~3–4 giây rồi gọi onDone; khung thoại hiện ở dưới, cảnh vẫn ở trên)
//   recipe  : lò nướng phát sáng → bánh phồng lên → "Ting!" + hơi nóng bốc lên
//   decorate: đèn flash máy ảnh → tấm polaroid chiếc bánh rơi xuống, chữ viết tay
//   delivery: cửa nhà mở → hộp bánh bật nắp → tấm thiệp trái tim bay ra
export function BakeryEnding({ kind, onDone }: { kind: BakeryKind; onDone: () => void }) {
    const root = useRef<HTMLDivElement>(null);

    useLayoutEffect(() => {
        const q = gsap.utils.selector(root);
        const tl = gsap.timeline({ onComplete: onDone });
        let floatTw: gsap.core.Tween | null = null;
        tl.fromTo(root.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power2.out' });
        if (kind === 'recipe') {
            tl.fromTo(q('.oven-glow'), { opacity: 0 }, { opacity: 1, duration: 0.6, yoyo: true, repeat: 3, ease: 'sine.inOut' }, 0.3)
                .fromTo(q('.oven-cake'), { scaleY: 0.35 }, { scaleY: 1, duration: 1.6, ease: 'back.out(1.6)' }, 0.5)
                .fromTo(q('.oven-ting'), { scale: 0, opacity: 0 }, { scale: 1, opacity: 1, duration: 0.45, ease: 'back.out(3)', onStart: () => sfx.ting() }, 2.1)
                .fromTo(q('.steam'), { y: 10, opacity: 0 }, { y: -40, opacity: 0.9, duration: 1.4, stagger: 0.2, ease: 'sine.out' }, 2.1)
                .to(q('.steam'), { opacity: 0, duration: 0.8 }, 3.3);
        } else if (kind === 'decorate') {
            tl.fromTo(q('.flash'), { opacity: 0 }, { opacity: 1, duration: 0.08, onStart: () => sfx.shutter() }, 0.4)
                .to(q('.flash'), { opacity: 0, duration: 0.7, ease: 'power2.out' }, 0.5)
                .fromTo(q('.photo'), { y: -260, rotate: -18, opacity: 0 }, { y: 0, rotate: -4, opacity: 1, duration: 1.2, ease: 'bounce.out' }, 0.6)
                .fromTo(q('.photo-img'), { filter: 'brightness(2.2) saturate(0)' }, { filter: 'brightness(1) saturate(1)', duration: 1.6, ease: 'power1.out' }, 0.8)
                .fromTo(q('.photo-caption'), { opacity: 0, clipPath: 'inset(0 100% 0 0)' }, { opacity: 1, clipPath: 'inset(0 0% 0 0)', duration: 1, ease: 'power1.inOut', onStart: () => sfx.chime() }, 2);
        } else {
            tl.add(() => sfx.bell(), 0.3)
                .fromTo(q('.door'), { rotateY: 0 }, { rotateY: -72, duration: 1, ease: 'power2.inOut' }, 0.7)
                .fromTo(q('.box'), { y: 30, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: 'back.out(2)' }, 1.2)
                .to(q('.lid'), { y: -46, x: 26, rotate: 28, duration: 0.5, ease: 'back.out(2)', onStart: () => sfx.pop() }, 2)
                .fromTo(q('.card'), { x: 0, y: 40, scale: 0.2, opacity: 0 }, { x: 150, y: -96, rotate: 6, scale: 1, opacity: 1, duration: 1.1, ease: 'back.out(1.4)', onStart: () => sfx.chime() }, 2.2)
                // thiệp bồng bềnh mãi — tween riêng (để chuỗi chính vẫn kết thúc & gọi onDone)
                .call(() => { floatTw = gsap.to(q('.card'), { y: -104, duration: 1.2, yoyo: true, repeat: -1, ease: 'sine.inOut' }); }, [], 3.3);
        }
        tl.to({}, { duration: 0.6 });
        return () => { tl.kill(); floatTw?.kill(); };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    return (
        <div ref={root} className={`bk-ending ${kind}`} aria-hidden>
            {kind === 'recipe' && (
                <div className="oven">
                    <svg viewBox="0 0 260 230">
                        <defs>
                            <radialGradient id="ov-glow" cx="0.5" cy="0.6" r="0.6"><stop offset="0" stopColor="#ffe08a" /><stop offset="1" stopColor="#ff9a5a" /></radialGradient>
                        </defs>
                        <rect x="20" y="20" width="220" height="190" rx="26" fill="#fde3dd" stroke="#e5a59a" strokeWidth="5" />
                        <rect x="20" y="20" width="220" height="40" rx="20" fill="#f8cfc4" />
                        {[60, 100, 140].map((x) => <circle key={x} cx={x} cy="40" r="9" fill="#fff4e6" stroke="#c98a5a" strokeWidth="3" />)}
                        <circle cx="205" cy="40" r="6" fill="#e27a76" />
                        <rect x="46" y="76" width="168" height="112" rx="16" fill="#5b3a2e" />
                        <rect className="oven-glow" x="46" y="76" width="168" height="112" rx="16" fill="url(#ov-glow)" />
                        <g className="oven-cake" style={{ transformOrigin: '130px 170px' }}>
                            <path d="M86 170V138q44-26 88 0v32z" fill="#f6c27a" stroke="#d9984a" strokeWidth="3" />
                            <path d="M86 140q44-22 88 0" fill="none" stroke="#fff4e6" strokeWidth="6" strokeLinecap="round" />
                            <circle cx="130" cy="122" r="7" fill="#ff5d7a" />
                        </g>
                        <rect x="46" y="76" width="168" height="112" rx="16" fill="none" stroke="#fff" strokeWidth="5" opacity="0.6" />
                        <path d="M60 90l30-0" stroke="#fff" strokeWidth="5" strokeLinecap="round" opacity="0.4" />
                    </svg>
                    {[0, 1, 2].map((i) => <span key={i} className="steam" style={{ left: `${36 + i * 14}%` }} />)}
                    <div className="oven-ting">{ENDING.ting}</div>
                </div>
            )}
            {kind === 'decorate' && (
                <>
                    <div className="flash" />
                    <div className="photo">
                        <div className="photo-img">
                            <svg viewBox="0 0 200 170">
                                <rect width="200" height="170" fill="#fde3dd" />
                                <ellipse cx="100" cy="92" rx="76" ry="62" fill="#f0c09c" />
                                <ellipse cx="100" cy="86" rx="76" ry="62" fill="#fffaf3" stroke="#f6c9bf" strokeWidth="6" />
                                {[[-52, -8], [-34, -36], [-34, 22], [0, -46], [34, -36], [34, 22], [52, -8], [0, 38]].map(([dx, dy], i) => (
                                    <ToppingIcon key={i} id={(['strawberry', 'cream', 'blueberry', 'heart'] as const)[i % 4]} at={{ x: 100 + dx - 11, y: 86 + dy - 11, size: 22 }} />
                                ))}
                                <text x="100" y="96" textAnchor="middle" fontFamily="Dancing Script" fontWeight="700" fontSize="30" fill="#d96f6c">H ♥ T</text>
                            </svg>
                        </div>
                        <div className="photo-caption">{ENDING.photo}</div>
                    </div>
                </>
            )}
            {kind === 'delivery' && (
                <div className="house-scene">
                    <svg className="house-front" viewBox="0 0 260 240">
                        <path d="M10 100L130 14l120 86z" fill="#ef8f8a" />
                        <rect x="30" y="96" width="200" height="140" fill="#fff4e6" stroke="#e5c3a3" strokeWidth="4" />
                        <rect x="46" y="120" width="44" height="40" rx="6" fill="#fdeedb" stroke="#fff" strokeWidth="4" />
                        <rect x="170" y="120" width="44" height="40" rx="6" fill="#fdeedb" stroke="#fff" strokeWidth="4" />
                        <rect x="100" y="132" width="60" height="104" rx="10" fill="#fff3c4" />
                        <path d="M130 66c-7-5-11-9-11-13a5 5 0 0 1 11-2 5 5 0 0 1 11 2c0 4-4 8-11 13z" fill="#ff5d7a" />
                    </svg>
                    <div className="door"><span /></div>
                    <div className="cat-at-door"><Corgi mood="love" /></div>
                    <div className="box">
                        <div className="lid" />
                        <div className="box-body"><span className="ribbon" /></div>
                    </div>
                    <div className="card">
                        <svg viewBox="0 0 120 90"><rect x="4" y="4" width="112" height="82" rx="12" fill="#fffaf3" stroke="#ef8f8a" strokeWidth="4" /><path d="M60 70C38 56 30 46 30 36a14 14 0 0 1 30-6 14 14 0 0 1 30 6c0 10-8 20-30 34z" fill="#e27a76" /></svg>
                        <span>{ENDING.card}</span>
                    </div>
                </div>
            )}
        </div>
    );
}
