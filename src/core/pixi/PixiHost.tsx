import gsap from 'gsap';
import { Application, Container } from 'pixi.js';
import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { DPR, metrics, type Metrics } from '../metrics';
import { makeSharedArt } from './art';

// Một Pixi canvas duy nhất, toàn màn hình, nằm phía sau giao diện React.
// Vòng lặp của Pixi được chạy bởi gsap.ticker → mọi tween GSAP và khung hình Pixi luôn khớp nhau
// trong cùng một nhịp requestAnimationFrame (không lệch pha, không giật).

const PixiContext = createContext<Application | null>(null);

export function PixiHost({ children }: { children: ReactNode }) {
    const ref = useRef<HTMLDivElement>(null);
    const [app, setApp] = useState<Application | null>(null);

    useEffect(() => {
        const a = new Application();
        let alive = true;
        let ready = false;
        const tick = () => a.ticker.update();
        a.init({
            resizeTo: window,
            resolution: DPR, // vẽ theo độ phân giải thật của màn hình → sắc nét trên Retina
            autoDensity: true,
            antialias: true,
            backgroundColor: 0x0a0918,
            preference: 'webgl',
            powerPreference: 'high-performance',
            autoStart: false,
        }).then(() => {
            if (!alive) { a.destroy(true); return; }
            ready = true;
            ref.current!.appendChild(a.canvas);
            makeSharedArt();
            a.ticker.stop();
            gsap.ticker.add(tick);
            setApp(a);
        });
        return () => {
            alive = false;
            gsap.ticker.remove(tick);
            if (ready) a.destroy(true, { children: true });
        };
    }, []);

    return (
        <PixiContext.Provider value={app}>
            <div ref={ref} className="pixi-host" />
            {app && children}
        </PixiContext.Provider>
    );
}

// Gắn một cảnh Pixi vào màn hình hiện tại; tự dọn khi component unmount.
// setup nhận app + container gốc của cảnh, trả về hàm dọn dẹp (nếu có).
export function usePixiScene(setup: (app: Application, root: Container) => (() => void) | void, deps: unknown[] = []) {
    const app = useContext(PixiContext);
    useEffect(() => {
        if (!app) return;
        const root = new Container();
        app.stage.addChild(root);
        const cleanup = setup(app, root);
        return () => {
            cleanup?.();
            app.stage.removeChild(root);
            root.destroy({ children: true });
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [app, ...deps]);
}

// Kích thước màn hình (pixel CSS), cập nhật khi đổi cỡ cửa sổ
export function useMetrics(): Metrics {
    const [m, setM] = useState(() => metrics(window.innerWidth, window.innerHeight));
    useEffect(() => {
        let t = 0;
        const onResize = () => {
            clearTimeout(t);
            t = window.setTimeout(() => setM(metrics(window.innerWidth, window.innerHeight)), 120);
        };
        window.addEventListener('resize', onResize);
        return () => { clearTimeout(t); window.removeEventListener('resize', onResize); };
    }, []);
    return m;
}
