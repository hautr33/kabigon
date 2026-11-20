import { useEffect, useRef } from 'react';

// Hiệu ứng theo con trỏ chuột — mỗi theme một kiểu:
//   'stars'  : bụi sao lấp lánh tím trắng (theme đêm)
//   'bakery' : kẹo rắc nhiều màu, tim nhỏ, vụn đường rơi lả tả (Tiệm Bánh Corgi)
export type TrailVariant = 'stars' | 'bakery';

const SPRINKLES = ['#ef8f8a', '#f7d27a', '#f4ad62', '#c6daa8', '#f6b7ae', '#fff7ec'];

export function CursorTrail({ variant = 'stars' }: { variant?: TrailVariant }) {
    const box = useRef<HTMLDivElement>(null);
    const kind = useRef(variant);
    kind.current = variant;

    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let lastTrail = 0;
        const onMove = (e: PointerEvent) => {
            const now = performance.now();
            const host = box.current;
            const bakery = kind.current === 'bakery';
            if (!host || e.pointerType !== 'mouse' || now - lastTrail < (bakery ? 40 : 28) || host.childElementCount > 120) return;
            lastTrail = now;
            const dot = document.createElement('span');
            if (bakery) {
                const r = Math.random();
                const color = SPRINKLES[Math.floor(Math.random() * SPRINKLES.length)];
                const shape = r < 0.6 ? 'sprinkle' : r < 0.82 ? 'heart' : 'sugar';
                dot.className = `trail-bk ${shape}`;
                const size = shape === 'sprinkle' ? 9 + Math.random() * 5 : shape === 'heart' ? 9 + Math.random() * 5 : 4 + Math.random() * 3;
                dot.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${size}px;height:${shape === 'sprinkle' ? size * 0.38 : size}px;`
                    + `background:${shape === 'heart' ? '#ef8f8a' : color};--r0:${Math.random() * 180}deg;--r1:${(Math.random() - 0.5) * 360}deg;`
                    + `--dx:${(Math.random() - 0.5) * 40}px;--dy:${30 + Math.random() * 40}px`;
            } else {
                const star = Math.random() < 0.35;
                dot.className = star ? 'trail trail-star' : 'trail';
                const size = star ? 10 + Math.random() * 8 : 4 + Math.random() * 7;
                dot.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${size}px;height:${size}px;--dx:${(Math.random() - 0.5) * 50}px;--dy:${10 + Math.random() * 40}px`;
            }
            dot.addEventListener('animationend', () => dot.remove());
            host.appendChild(dot);
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, []);
    return <div ref={box} />;
}
