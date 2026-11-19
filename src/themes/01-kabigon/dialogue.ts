// Toàn bộ chữ của theme "Vì Sao & Kabigon". Sửa lời thoại chỉ cần sửa file này.
//   \n      : xuống dòng
//   [[...]] : đoạn được làm nổi bật (vàng, phát sáng)

// Màn hình bắt đầu của từng màn — {n} sẽ được thay bằng số sao cần bắt
export const START = {
    titles: ['Giấc Mơ Của Kabigon ✨', '24 Giờ Bên Nhau 💗', 'Chòm Sao Của Tụi Mình 💫'],
    body: 'Hãy dẫn bé Kabigon béo đi hái sao.\nThu thập đủ [[{n} ngôi sao]] để phép màu xuất hiện nà!',
    hint: 'Di chuột hoặc bấm ← → để di chuyển Kabigon',
    button: 'Bắt Đầu Nhé',
};

// Màn 3: cái tên mà 36 ngôi sao sẽ xếp thành trên bầu trời
export const CONSTELLATION_WORD = 'Trăm';

export const LOSE = {
    title: 'Éccc, thua mất tiu rùiiii... 😢',
    body: 'Thử lại lần nữa để gọi phép màu cùng Kabigon nha :3 Bé ơi cố lên!!!',
    button: 'Thử lại lần nữa :3',
};

export const FLOATING = {
    rainbow: 'Đã tìm thấy Trăm! 💖',
    bonus: 'Qua Mốc! +10s ⏳',
};

// Màn 1 (12 sao) — đèn lồng + trăng mọc, rồi hiện khung thoại từng bước
export type Step = { title?: string; body: string; yes?: string; no?: string; burst?: boolean; end?: boolean; celebrate?: boolean };

export const MILESTONE_1: { title: string; steps: Step[] } = {
    title: 'Gửi bé Trăm... 🌠 ✨',
    steps: [
        { body: 'Hôm nay là ngày 06/06/2026.\nAnh nghĩ đây là một ngày rất là đẹp.' },
        { body: 'Anh đã đợi ngày này đến cũng khá lâu òi, và hôm nay anh có điều muốn nói với bé!' },
        { body: 'Bé có biết vì sao anh lại đặt mốc 12 ngôi sao để Kabigon thu thập hơm?' },
        { body: 'Bởi vì 12 ngôi sao này đại diện cho 12 tháng trong năm anh muốn ở cạnh bé :3' },
        { body: "Và hôm nay anh muốn tự tay kích hoạt\n[['ngôi sao thứ 13']], ngôi sao đó chính là [[bé Trăm siu cấp đáng iu]]!", burst: true },
        { body: 'Liệu bé Trăm có muốn tiến thêm một bước, làm\n[[ngôi sao sáng nhất trong lòng anh]] hong?', yes: 'Có ạ :>>', no: 'Để nghĩ xíu...' },
        { title: 'Awww!!!\nThiệt là hạnh phúc quá đi à :3', body: 'Xin cảm ơn bé :3 Hy vọng chúng mình sẽ cùng nhau tạo nên thiệt là nhiều kỷ niệm đẹp nà :3', end: true, celebrate: true },
    ],
};

// Màn 2 (24 sao) — trái tim 3D + hoa đào, chữ hiện theo từng cặp câu
export const MILESTONE_2 = [
    { l1: 'Bé Trăm của anh giỏi quáaa!', l2: 'Bé gom được 24 ngôi sao lun rùi nè :3' },
    { l1: 'Cơ mà :3 Bé có biết...', l2: 'Vì sao anh chọn con số 24 này hong?' },
    { l1: 'Vì nó tượng trưng cho...', l2: '24 giờ trong một ngày.' },
    { l1: 'Nó làm anh nhớ tới những hôm...', l2: 'tụi mình được gặp nhau cả ngày.' },
    { l1: 'Hong hiểu sao những ngày dài bên cạnh bé,', l2: 'anh luôn thấy thời gian trôi qua thiệt nhanh.' },
    { l1: 'Cứ như là anh mới gặp em được vài phút,', l2: 'thì lại đến lúc phải chào tạm biệt...' },
    { l1: 'Ngôi sao thứ 24 này...', l2: 'anh muốn dành để lưu giữ ngày "hôm nay".' },
    { l1: 'Ngày mà những điều bình thường nhất...', l2: 'bỗng hóa thành kỷ niệm.' },
    { l1: 'Anh cảm ơn bé!', l2: 'Vì đã cho anh thêm biết bao ngày như vậy.' },
    { l1: 'Mong rằng từ nay về sau tụi mình sẽ cùng nhau', l2: "tạo nên thật nhiều '24 giờ' tuyệt đẹp như thế nữa. ✨" },
];

// Màn 3 (36 sao) — chòm sao mang tên tụi mình
export const MILESTONE_3: { caption: string; title: string; steps: Step[] } = {
    caption: '36 ngôi sao, một chòm sao mang tên tụi mình',
    title: 'Gửi bé Trăm... 🌠 ✨',
    steps: [
        { body: 'Woa, 36 ngôi sao luôn á! Bé giỏi thiệt sự.' },
        { body: 'Anh hay nghĩ, mỗi ngôi sao là một kỷ niệm nhỏ tụi mình đã có, có ngôi sáng rực, có ngôi lấp lánh dịu dàng.' },
        { body: 'Gộp hết lại, tụi nó không rối tung đâu, mà tự nhiên ghép thành một hình quen thuộc...' },
        { body: 'Là hình [[trái tim tụi mình đã cùng nhau vẽ nên]], từng ngày một, không phải chỉ trong một đêm.', burst: true },
        { title: 'Chòm sao của tụi mình 💫', body: 'Cảm ơn bé đã đồng hành suốt chặng đường này. Chòm sao này sẽ luôn ở đó, y như tụi mình vậy.', end: true },
    ],
};
