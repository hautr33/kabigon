import { useEffect, useRef } from 'react';

// Bụi sao rơi theo con trỏ chuột (giống trang đăng nhập P.E.A.K)
export function CursorTrail() {
    const box = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
        let lastTrail = 0;
        const onMove = (e: PointerEvent) => {
            const now = performance.now();
            const host = box.current;
            if (!host || e.pointerType !== 'mouse' || now - lastTrail < 28 || host.childElementCount > 120) return;
            lastTrail = now;
            const dot = document.createElement('span');
            const star = Math.random() < 0.35;
            dot.className = star ? 'trail trail-star' : 'trail';
            const size = star ? 10 + Math.random() * 8 : 4 + Math.random() * 7;
            dot.style.cssText = `left:${e.clientX}px;top:${e.clientY}px;width:${size}px;height:${size}px;--dx:${(Math.random() - 0.5) * 50}px;--dy:${10 + Math.random() * 40}px`;
            dot.addEventListener('animationend', () => dot.remove());
            host.appendChild(dot);
        };
        window.addEventListener('pointermove', onMove);
        return () => window.removeEventListener('pointermove', onMove);
    }, []);
    return <div ref={box} />;
}
