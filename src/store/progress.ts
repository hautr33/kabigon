import { create } from 'zustand';
import { persist } from 'zustand/middleware';

// Tiến độ người chơi (màn nào đã qua) — tự lưu vào localStorage.
type ProgressState = {
    completed: Record<string, boolean>;
    markCompleted: (levelId: string) => void;
};

export const useProgress = create<ProgressState>()(
    persist(
        (set) => ({
            completed: {},
            markCompleted: (id) => set((s) => ({ completed: { ...s.completed, [id]: true } })),
        }),
        { name: 'kabigon.progress.v2' },
    ),
);
