import { forwardRef, useEffect, useImperativeHandle, useRef, type HTMLAttributes } from 'react';

// Thẻ kính: đèn soi đi theo chuột (--cx/--cy) + nghiêng 3D nhẹ theo vị trí chuột trên màn hình (--tx/--ty).
// Cập nhật bằng requestAnimationFrame nên không làm React render lại.
export const Glass = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement> & { quiet?: boolean; tilt?: boolean }>(
    function Glass({ className = '', quiet, tilt = true, ...rest }, ref) {
        const el = useRef<HTMLDivElement>(null);
        useImperativeHandle(ref, () => el.current!);
        useEffect(() => {
            let raf = 0;
            let last: PointerEvent | null = null;
            const apply = () => {
                raf = 0;
                const card = el.current;
                if (!card || !last) return;
                const r = card.getBoundingClientRect();
                card.style.setProperty('--cx', `${last.clientX - r.left}px`);
                card.style.setProperty('--cy', `${last.clientY - r.top}px`);
                if (tilt) {
                    card.style.setProperty('--tx', ((last.clientX / window.innerWidth) * 2 - 1).toFixed(3));
                    card.style.setProperty('--ty', ((last.clientY / window.innerHeight) * 2 - 1).toFixed(3));
                }
            };
            const onMove = (e: PointerEvent) => { last = e; if (!raf) raf = requestAnimationFrame(apply); };
            window.addEventListener('pointermove', onMove);
            return () => { window.removeEventListener('pointermove', onMove); cancelAnimationFrame(raf); };
        }, [tilt]);
        return <div ref={el} className={`glass ${quiet ? 'quiet' : ''} ${className}`} {...rest} />;
    },
);
