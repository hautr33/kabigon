import { Howl } from 'howler';
import { assetUrl } from './assets';

// Âm thanh dùng Howler (Web Audio). Mỗi file chỉ tải một lần, dùng chung giữa các màn.
const cache = new Map<string, Howl>();

export function sound(file: string, { volume = 0.5, loop = false } = {}): Howl {
    const key = `${file}|${loop}`;
    let h = cache.get(key);
    if (!h) {
        h = new Howl({ src: [assetUrl(`audio/${file}`)], volume, loop, preload: true });
        cache.set(key, h);
    }
    return h;
}

// Phát lại từ đầu (dùng cho hiệu ứng ngắn)
export function play(file: string, volume = 0.5) {
    const h = sound(file, { volume });
    h.stop();
    h.volume(volume);
    h.play();
}

export const playClick = () => play('click.mp3', 0.5);
