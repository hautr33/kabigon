import { Howler } from 'howler';

// Tiếng động & nhạc hộp tạo bằng Web Audio (không cần file âm thanh).
// Dùng chung AudioContext + âm lượng tổng của Howler → tắt/mở tiếng một chỗ, tự mở khoá sau lần chạm đầu tiên.

function audio(): { ctx: AudioContext; out: AudioNode } | null {
    const h = Howler as unknown as { ctx?: AudioContext; masterGain?: GainNode };
    if (!h.ctx) { try { Howler.volume(Howler.volume()); } catch { /* bỏ qua */ } }
    if (!h.ctx) return null;
    if (h.ctx.state === 'suspended') h.ctx.resume().catch(() => {});
    return { ctx: h.ctx, out: h.masterGain ?? h.ctx.destination };
}

// Một nốt: sóng + bao âm (vào nhanh, tắt dần)
function tone(freq: number, at: number, dur: number, type: OscillatorType = 'sine', vol = 0.2, slideTo?: number) {
    const a = audio();
    if (!a) return;
    const t0 = a.ctx.currentTime + at;
    const osc = a.ctx.createOscillator();
    const g = a.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur * 0.6);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(a.out);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
}

const hz = (semi: number) => 440 * Math.pow(2, semi / 12); // semi: số bán cung so với La4

export const sfx = {
    // "ting" lò nướng
    ting() { tone(1568, 0, 1.4, 'sine', 0.22); tone(3136, 0, 0.8, 'sine', 0.07); tone(2093, 0.02, 1.1, 'sine', 0.1); },
    // chuông xe đạp "ring ring"
    bell() { for (const at of [0, 0.16]) { tone(2637, at, 0.45, 'triangle', 0.16); tone(3951, at, 0.3, 'sine', 0.06); } },
    // "bộp" khi đặt topping
    pop() { tone(520, 0, 0.12, 'sine', 0.22, 1100); },
    // tách nhẹ (bấm nút nhỏ, xoay ô)
    tick() { tone(1200, 0, 0.05, 'triangle', 0.08, 900); },
    // chuỗi nốt vui khi giải đúng
    chime() { [0, 4, 7, 12].forEach((s, i) => tone(hz(15 + s), i * 0.09, 0.6, 'triangle', 0.12)); },
    // "tách" máy ảnh
    shutter() { tone(900, 0, 0.04, 'square', 0.06); tone(300, 0.05, 0.06, 'square', 0.05); },
    // "hừm" khi sai
    nope() { tone(330, 0, 0.18, 'triangle', 0.12, 260); tone(262, 0.16, 0.25, 'triangle', 0.1, 220); },
};

// ---------------------------------------------------------------------------
// Hộp nhạc: giai điệu vui tươi lặp lại (Đô trưởng, ~100 nhịp/phút), nốt tam giác mềm + bè trầm
// ---------------------------------------------------------------------------
// Bán cung so với La4 (null = nghỉ); mỗi phần tử = 1 móc đơn
const MELODY: (number | null)[] = [
    3, 7, 10, 7, 12, 10, 7, null, 5, 8, 12, 8, 10, null, null, null,
    3, 7, 10, 15, 14, 12, 10, null, 8, 7, 5, 7, 3, null, null, null,
];
const BASS: (number | null)[] = [-21, null, null, null, -16, null, null, null, -19, null, null, null, -14, null, null, null,
    -21, null, null, null, -16, null, null, null, -19, null, null, null, -21, null, null, null];

class MusicBox {
    private timer = 0;
    private step = 0;
    private next = 0;
    private gain: GainNode | null = null;
    private stopTimer = 0;
    playing = false;

    // Chuyển màn: màn cũ gọi stop(), màn mới gọi start() ngay sau → nhạc không bị ngắt
    start(volume = 0.5) {
        clearTimeout(this.stopTimer);
        if (this.playing) return;
        const a = audio();
        if (!a) return;
        this.playing = true;
        this.gain = a.ctx.createGain();
        this.gain.gain.setValueAtTime(0.0001, a.ctx.currentTime);
        this.gain.gain.exponentialRampToValueAtTime(volume, a.ctx.currentTime + 1.2);
        this.gain.connect(a.out);
        this.next = a.ctx.currentTime + 0.1;
        this.step = 0;
        const eighth = 60 / 100 / 2;
        const schedule = () => {
            const b = audio();
            if (!b || !this.gain) return;
            while (this.next < b.ctx.currentTime + 0.25) {
                const m = MELODY[this.step % MELODY.length], bs = BASS[this.step % BASS.length];
                if (m !== null) this.note(b.ctx, hz(m), this.next, 0.55, 'triangle', 0.09);
                if (bs !== null) this.note(b.ctx, hz(bs), this.next, 1.1, 'sine', 0.07);
                this.next += eighth;
                this.step++;
            }
        };
        schedule();
        this.timer = window.setInterval(schedule, 80);
    }

    private note(ctx: AudioContext, f: number, t0: number, dur: number, type: OscillatorType, vol: number) {
        const osc = ctx.createOscillator(), g = ctx.createGain();
        osc.type = type; osc.frequency.value = f;
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
        osc.connect(g).connect(this.gain!);
        osc.start(t0); osc.stop(t0 + dur + 0.05);
    }

    stop() {
        clearTimeout(this.stopTimer);
        this.stopTimer = window.setTimeout(() => this.stopNow(), 300);
    }

    private stopNow() {
        if (!this.playing) return;
        this.playing = false;
        clearInterval(this.timer);
        const a = audio(), g = this.gain;
        this.gain = null;
        if (a && g) {
            g.gain.cancelScheduledValues(a.ctx.currentTime);
            g.gain.setValueAtTime(Math.max(0.0001, g.gain.value), a.ctx.currentTime);
            g.gain.exponentialRampToValueAtTime(0.0001, a.ctx.currentTime + 0.5);
            setTimeout(() => g.disconnect(), 700);
        }
    }
}

export const musicBox = new MusicBox();
