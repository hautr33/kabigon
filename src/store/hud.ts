import { create } from 'zustand';

// Trạng thái HUD của màn đang chơi. Game (Pixi) ghi vào đây; chỉ các component HUD
// đăng ký đúng phần mình cần (selector) nên chỉ chúng render lại khi điểm thay đổi.
export type HudState = {
    score: number;
    target: number;
    lives: number;
    time: number;
    infLives: boolean;
    infTime: boolean;
    pulse: { score: number; lives: number; time: number };
};

export const useHud = create<HudState>()(() => ({
    score: 0,
    target: 12,
    lives: 6,
    time: 30,
    infLives: false,
    infTime: false,
    pulse: { score: 0, lives: 0, time: 0 },
}));

export const bumpPulse = (which: keyof HudState['pulse']) =>
    useHud.setState((s) => ({ pulse: { ...s.pulse, [which]: s.pulse[which] + 1 } }));
