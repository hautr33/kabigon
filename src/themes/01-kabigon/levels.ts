import * as TXT from './dialogue';

// Cấu hình 3 màn của theme "Vì Sao & Kabigon" — cùng một lối chơi, khác mục tiêu và cutscene.
export type StarLevelConfig = {
    id: string;
    target: number; // số sao cần bắt để thắng
    time: number; // giây lúc bắt đầu
    bonusAt: number[]; // qua các mốc này được cộng thêm giờ
    cutscene: 'lanterns' | 'heart' | 'constellation';
    startTitle: string;
};

export const STAR_LEVELS: StarLevelConfig[] = [
    { id: 'sao-bang-12', target: 12, time: 30, bonusAt: [], cutscene: 'lanterns', startTitle: TXT.START.titles[0] },
    { id: 'sao-bang-24', target: 24, time: 30, bonusAt: [12], cutscene: 'heart', startTitle: TXT.START.titles[1] },
    { id: 'sao-bang-36', target: 36, time: 30, bonusAt: [12, 24], cutscene: 'constellation', startTitle: TXT.START.titles[2] },
];
