import gsap from 'gsap';
import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { playClick } from '../core/audio';
import { Glass } from './glass';
import { RichText } from './RichText';
import './dialog.css';

export type DialogButton = {
    label: string;
    variant?: 'gold' | 'white' | 'ghost' | 'pink';
    onClick?: () => void;
    runaway?: boolean; // bấm vào thì nút nhảy đi chỗ khác :3
};

export type DialogContent = {
    eyebrow?: string; // dòng nhỏ phía trên tiêu đề (vd: "Màn 1 · 06.06.2026")
    title?: string;
    tone?: 'gold' | 'white';
    body?: string;
    hint?: string;
    buttons?: DialogButton[];
};

// Khung thoại kính mờ.
//   open     : hiện / ẩn (có hiệu ứng)
//   content  : nội dung — đổi nội dung sẽ chuyển cảnh mềm (mờ ra → mờ vào)
//   backdrop : độ mờ nền phía sau (px)
//   placement: 'center' (giữa màn hình) hoặc 'bottom' (sát dưới — để lộ cutscene phía trên)
//   top      : có thì đặt mép trên khung thoại ở đúng toạ độ này (px) — vd: ngay dưới mặt trăng
//   onDismiss: có thì hiện nút nhỏ ở góc để ẩn khung thoại (vd: để ngắm cutscene phía sau)
//   skin     : 'night' (kính tối, mặc định) hoặc 'cream' (màu kem sáng — theme ban ngày)
export function Dialog({ open, content, backdrop = 8, placement = 'center', top, onDismiss, skin = 'night' }: {
    open: boolean; content: DialogContent; backdrop?: number; placement?: 'center' | 'bottom'; top?: number; onDismiss?: () => void; skin?: 'night' | 'cream';
}) {
    const wrap = useRef<HTMLDivElement>(null);
    const card = useRef<HTMLDivElement>(null);
    const inner = useRef<HTMLDivElement>(null);
    const [mounted, setMounted] = useState(open);
    const [view, setView] = useState(content);
    const [version, setVersion] = useState(0);
    const closing = useRef<gsap.core.Tween | null>(null);

    // Mở / đóng (mở lại ngay khi đang mờ dần thì huỷ việc đóng)
    useEffect(() => {
        closing.current?.kill();
        closing.current = null;
        if (open) setMounted(true);
        else if (mounted && wrap.current) {
            closing.current = gsap.to(wrap.current, { opacity: 0, duration: 0.45, ease: 'power2.out', onComplete: () => setMounted(false) });
        }
    }, [open]); // eslint-disable-line react-hooks/exhaustive-deps

    useLayoutEffect(() => {
        if (!open || !mounted || !wrap.current || !card.current) return;
        setView(content);
        gsap.fromTo(wrap.current, { opacity: 0 }, { opacity: 1, duration: 0.6, ease: 'power2.out' });
        gsap.fromTo(card.current, { y: 28, scale: 0.96, opacity: 0 }, { y: 0, scale: 1, opacity: 1, duration: 0.9, ease: 'power3.out' });
    }, [open, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

    // Đổi nội dung: mờ ra → đổi → mờ vào
    useEffect(() => {
        if (content === view) return;
        if (!mounted || !inner.current) { setView(content); return; }
        const el = inner.current;
        gsap.to(el, {
            opacity: 0, y: -6, duration: 0.16, ease: 'power1.in',
            onComplete: () => {
                setView(content);
                setVersion((v) => v + 1);
                gsap.fromTo(el, { opacity: 0, y: 8 }, { opacity: 1, y: 0, duration: 0.4, ease: 'power3.out' });
            },
        });
    }, [content]); // eslint-disable-line react-hooks/exhaustive-deps

    if (!mounted) return null;
    return (
        <div
            ref={wrap}
            className={`dialog-wrap interactive ${top !== undefined ? 'at-top' : placement} skin-${skin}`}
            style={{ ['--bd' as string]: `${backdrop}px`, ...(top !== undefined && { ['--top' as string]: `${top}px` }) }}
        >
            {/* GSAP điều khiển lớp bọc ngoài; thẻ kính bên trong giữ hiệu ứng nghiêng 3D của CSS */}
            <div ref={card}>
            <Glass className="dialog-card">
                {onDismiss && (
                    <button className="dialog-close" onClick={() => { playClick(); onDismiss(); }} title="Ẩn khung thoại" aria-label="Ẩn khung thoại">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round"><path d="M6 6l12 12M18 6 6 18" /></svg>
                    </button>
                )}
                <div ref={inner}>
                    {view.eyebrow && <div className="dialog-eyebrow">{view.eyebrow}</div>}
                    {view.title && <div className={`dialog-title ${view.tone === 'gold' ? 'gold' : ''}`}><RichText text={view.title} /></div>}
                    {view.body && <div className="dialog-body"><RichText text={view.body} /></div>}
                    {view.hint && <div className="dialog-hint"><RichText text={view.hint} /></div>}
                    {!!view.buttons?.length && (
                        <div className="dialog-buttons">
                            {view.buttons.map((b, i) => <DialogBtn key={`${version}-${i}`} b={b} />)}
                        </div>
                    )}
                </div>
            </Glass>
            </div>
        </div>
    );
}

function DialogBtn({ b }: { b: DialogButton }) {
    const ref = useRef<HTMLButtonElement>(null);
    const onClick = () => {
        playClick();
        if (b.runaway && ref.current) runaway(ref.current);
        b.onClick?.();
    };
    return <button ref={ref} className={`btn btn-${b.variant ?? 'gold'}`} onClick={onClick}><RichText text={b.label} /></button>;
}

// Nút nhảy tới một chỗ ngẫu nhiên trên màn hình
function runaway(btn: HTMLButtonElement) {
    const r = btn.getBoundingClientRect();
    if (btn.style.position !== 'fixed') {
        btn.style.position = 'fixed';
        btn.style.left = `${r.left}px`;
        btn.style.top = `${r.top}px`;
        btn.style.zIndex = '30';
    }
    const pad = 40;
    gsap.to(btn, {
        left: pad + Math.random() * Math.max(0, window.innerWidth - r.width - pad * 2),
        top: pad + Math.random() * Math.max(0, window.innerHeight - r.height - pad * 2),
        duration: 0.35, ease: 'back.out(1.6)',
    });
}
