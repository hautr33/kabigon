import gsap from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { PixiHost } from './core/pixi/PixiHost';
import { findLevel } from './themes';
import { MenuScreen } from './menu/MenuScreen';

type Screen = { name: 'menu' } | { name: 'level'; id: string };

export function App() {
    const [screen, setScreen] = useState<Screen>({ name: 'menu' });
    const fade = useRef<HTMLDivElement>(null);
    const busy = useRef(false);

    // Lần đầu mở: từ đen hiện dần lên
    useLayoutEffect(() => {
        gsap.to(fade.current, { opacity: 0, duration: 1, delay: 0.2, ease: 'power2.out' });
    }, []);

    // Chuyển màn: tối dần → đổi → sáng dần
    const go = (next: Screen) => {
        if (busy.current) return;
        busy.current = true;
        gsap.to(fade.current, {
            opacity: 1, duration: 0.5, ease: 'power2.in',
            onComplete: () => {
                setScreen(next);
                gsap.to(fade.current, { opacity: 0, duration: 0.7, delay: 0.15, ease: 'power2.out', onComplete: () => { busy.current = false; } });
            },
        });
    };

    const found = screen.name === 'level' ? findLevel(screen.id) : null;

    return (
        <>
            <PixiHost>
                {found
                    ? <div key={found.level.id} style={{ display: 'contents' }}>{found.level.render(() => go({ name: 'menu' }), found.number)}</div>
                    : <MenuScreen onPlay={(id) => go({ name: 'level', id })} />}
            </PixiHost>
            <div ref={fade} className="screen-fade" />
        </>
    );
}
