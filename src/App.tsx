import gsap from 'gsap';
import { useLayoutEffect, useRef, useState } from 'react';
import { PixiHost } from './core/pixi/PixiHost';
import { HomeScreen } from './home/HomeScreen';
import { ThemeScreen } from './menu/ThemeScreen';
import { findLevel, findTheme } from './themes';

// Home → chọn theme → chọn màn → chơi. Thoát màn thì về lại màn chọn màn của theme đó.
type Screen = { name: 'home' } | { name: 'theme'; id: string } | { name: 'level'; id: string };

export function App() {
    const [screen, setScreen] = useState<Screen>({ name: 'home' });
    const fade = useRef<HTMLDivElement>(null);
    const busy = useRef(false);

    // Lần đầu mở: từ đen hiện dần lên
    useLayoutEffect(() => {
        gsap.to(fade.current, { opacity: 0, duration: 1, delay: 0.2, ease: 'power2.out' });
    }, []);

    // Chuyển màn: tối dần → đổi → sáng dần
    // Màu màn chuyển hợp với nơi đến: tới theme ban ngày → hồng kem nhạt;
    // rời theme ban ngày về đêm → tím hoàng hôn (không sập đen đột ngột); còn lại → tím đêm
    const isLight = (s: Screen) => !!(s.name === 'theme' ? findTheme(s.id)?.theme : s.name === 'level' ? findLevel(s.id)?.theme : null)?.light;
    const fadeColor = (from: Screen, to: Screen) => (isLight(to) ? '#fbe9d6' : isLight(from) ? '#2b1f47' : '#0a0918');

    const go = (next: Screen) => {
        if (busy.current) return;
        busy.current = true;
        gsap.to(fade.current, {
            opacity: 1, backgroundColor: fadeColor(screen, next), duration: 0.55, ease: 'sine.inOut',
            onComplete: () => {
                setScreen(next);
                gsap.to(fade.current, { opacity: 0, duration: 0.8, delay: 0.2, ease: 'sine.inOut', onComplete: () => { busy.current = false; } });
            },
        });
    };

    const home = () => go({ name: 'home' });
    let content;
    if (screen.name === 'level') {
        const found = findLevel(screen.id);
        content = found
            ? <div key={found.level.id} style={{ display: 'contents' }}>{found.level.render(() => go({ name: 'theme', id: found.theme.id }), found.number)}</div>
            : null;
    } else if (screen.name === 'theme') {
        const found = findTheme(screen.id);
        content = found ? <ThemeScreen key={found.theme.id} themeIndex={found.index} onPlay={(id) => go({ name: 'level', id })} onBack={home} /> : null;
    }
    content ??= <HomeScreen onOpenTheme={(id) => go({ name: 'theme', id })} />;

    return (
        <>
            <PixiHost>{content}</PixiHost>
            <div ref={fade} className="screen-fade" />
        </>
    );
}
