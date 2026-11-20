// Toàn bộ chữ của màn hình home — sửa lời ở đây.
//   \n : xuống dòng     [[...]] : chữ nổi bật (vàng, phát sáng)     :heart: : icon (tên xem trong src/ui/Icon.tsx)

export const TITLE = { before: 'Mùng ', six: '6', after: 'Của Trăm' };

// Lời chào theo giờ trong ngày (giờ bắt đầu → câu chào). Lấy mốc gần nhất ≤ giờ hiện tại.
export const GREETINGS: [hour: number, text: string][] = [
    [0, 'Khuya gòi đó, bé ngủ sớm nhaaa :moon:'],
    [5, 'Chúc bé một ngày siu may mắn nàaa :sun:'],
    [11, 'Chúc bé buổi trưa ăn ngon nàaa :rice:'],
    [14, 'Chúc bé buổi chìu thiệt chill nàaa :cloud-sun:'],
    [18, 'Bé zề nhà chưaaa, nhớ cẩn thận nha :sunset:'],
    [22, 'Khuya gòi đó, bé ngủ sớm nhaaa :moon:'],
];

export function greeting(hour: number) {
    let text = GREETINGS[0][1];
    for (const [h, t] of GREETINGS) if (hour >= h) text = t;
    return text;
}

// Dòng đếm ngày. {days}: số ngày bên nhau, {left}: số ngày tới mùng 6, {months}: số tháng tròn
export const COUNTER = {
    normal: 'Bên nhau [[{days}]] ngày gòi nè · còn [[{left}]] ngày nữa là tới mùng 6 :heart:',
    tomorrow: 'Bên nhau [[{days}]] ngày gòi nè · [[mai]] là mùng 6 gòi đóoo :heart:',
    mung6: 'Tròn [[{months}]] tháng bên nhau gòi · [[{days}]] ngày thương bé lunnn :heart:',
};

// ---------------- Chế độ mùng 6 ----------------
export const MUNG6 = {
    banner: ':firework: Nay mùng 6 gòi nèee :firework:',
    envelope: 'Thư mùng 6 anh gửi bé nè',
    music: 'bgm.mp3', // đặt file nhạc riêng vào public/assets/audio/ rồi đổi tên ở đây
};

// Thư riêng cho từng tháng: khoá là "năm-tháng". Tháng nào chưa viết thì dùng LETTER_DEFAULT.
export const LETTERS: Record<string, { title: string; body: string }> = {
    // '2026-12': { title: 'Tròn 6 tháng', body: 'Viết lời nhắn tháng 12 ở đây...' },
};

export const LETTER_DEFAULT = {
    title: 'Mùng 6 zui zẻ nhaaa :heart-gold:',
    body: 'Thêm một tháng nữa anh được ở cạnh [[bé Trăm]] gòi nè.\nCảm ơn bé đã luôn ở đây,\ncùng anh đi qua mấy ngày nhỏ xíu xiu.\n\nNay có màn mới đó, bé chơi thử nhaaa :sparkles:',
    button: 'Thương anh lunnn :heart-gold:',
};

// ---------------- Easter egg: bấm 6 lần vào chữ "6" ----------------
export const SECRET = {
    title: 'Ơ... bị bé phát hiện gòi :shy:',
    body: 'Số 6 là số anh thích nhất á,\nvì đó là ngày [[tụi mình bắt đầu]].\n\nCứ mỗi mùng 6 là anh lại thương bé thêm một chút nữa lunnn.',
    button: 'Biết rồi nhaaa :hearts:',
};

// ---------------- Ảnh polaroid theme sắp tới ----------------
export const TEASER = {
    title: 'Chương tiếp theo nè',
    soon: 'Mở vào mùng 6 · {date}',
    preparing: 'Anh đang làm nè :twinkle:',
};
