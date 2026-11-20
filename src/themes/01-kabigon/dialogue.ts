// Toàn bộ chữ của theme "Vì Sao & Kabigon". Sửa lời thoại chỉ cần sửa file này.
//   \n      : xuống dòng
//   [[...]] : đoạn được làm nổi bật (vàng, phát sáng)
//   :heart: : icon vẽ sẵn (tên xem trong src/ui/Icon.tsx)

// Màn hình bắt đầu của từng màn — {n} sẽ được thay bằng số sao cần bắt
export const START = {
    titles: ['Giấc Mơ Của Kabigon :sparkles:', '24 Giờ Bên Nhau :heart:', 'Chòm Sao Của Chúng Ta :stars:'],
    body: 'Bé dẫn Kabigon béo đi hái sao giùm anh nhaaa.\nGom đủ [[{n} ngôi sao]] là có phép màu hiện nàaa!',
    hint: 'Bé rê chuột hoặc bấm ← → để Kabigon chạy nha',
    button: 'Đi hái sao thuiii',
};

// Màn 3: chòm sao "Hậu ♥ Trăm" — nét chữ viết tay nằm trong script.ts

export const LOSE = {
    title: 'Éccc, thua mất tiu gòiii... :cry:',
    body: 'Hong xao hong xao, bé thử lại lần nữa iii :3\nBé cố lênn nà, bé làm được mòoo!!',
    button: 'Thử lại nèee :3',
};

// Nút ẩn khung thoại để ngắm cutscene, và nút mở lại
export const WATCH = {
    hide: 'Ngắm trời xíu :sparkles:',
    reopen: 'Đọc tiếp lời anh nhắn nè',
};

export const FLOATING = {
    rainbow: 'Tìm thấy bé Trăm gòi! :heart-sparkle:',
    bonus: 'Qua mốc gòi! +10s :hourglass:',
};

// Màn 1 (12 sao) — đèn lồng + trăng mọc, rồi hiện khung thoại từng bước
export type Step = { title?: string; body: string; yes?: string; no?: string; burst?: boolean; end?: boolean; celebrate?: boolean };

export const MILESTONE_1: { title: string; steps: Step[] } = {
    title: 'Gửi bé Trăm... :shooting-star:',
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
    { l1: 'Bé Trăm của anh giỏi quá dạaa!', l2: 'Bé gom được 24 ngôi sao lun ùi nàaa :3' },
    { l1: 'Nhma :3 bé có biết...', l2: 'xao anh chọn số 24 hong?' },
    { l1: 'Vì nó tượng trưng cho...', l2: '24 giờ trong một ngày íii.' },
    { l1: 'Nó làm anh nhớ tới những hôm...', l2: 'tụi mình được ở cạnh nhau cả ngày.' },
    { l1: 'Hong hiểu sao những ngày ở cạnh bé,', l2: 'anh thấy thời gian trôi nhanh ơi là nhanh.' },
    { l1: 'Cứ như anh mới gặp bé được xíu,', l2: 'mà đã tới lúc phải bái baii ùii...' },
    { l1: 'Ngôi sao thứ 24 này...', l2: 'anh muốn dành để lưu giữ ngày "hôm nay".' },
    { l1: 'Ngày mà những điều bình thường nhất...', l2: 'bỗng hóa thành kỷ niệm.' },
    { l1: 'Anh cảm ơn bé!', l2: 'Vì đã cho anh thêm biết bao ngày như vậy.' },
    { l1: 'Mong rằng từ nay về sau tụi mình sẽ cùng nhau', l2: "tạo nên thật nhiều '24 giờ' tuyệt đẹp như thế nữaaa :sparkles:" },
];

// Màn 3 (36 sao) — dòng sao viết nên "Hậu ♥ Trăm"; chữ hiện theo từng cặp câu ngay dưới chòm sao
export const MILESTONE_3 = [
    { l1: 'Bé gom đủ 36 ngôi sao ùi nàaa!', l2: 'Bé ngước lên trời xem thử ii :sparkles:' },
    { l1: 'Mỗi ngôi sao là một kỷ niệm nhỏ', l2: 'mà tụi mình đã cùng nhau tạo ra.' },
    { l1: 'Có ngôi sao thiệt là sáng, có ngôi lấp lánh nhẹ nhẹ,', l2: ' ngôi nào anh cũng muốn cất giữ thiệt là kỹ.' },
    { l1: 'Người ta bảo mấy ngôi sao cách nhau thiệt là xa,', l2: 'nhma nhìn từ đây thì tụi nó lúc nào cũng cạnh nhau.' },
    { l1: 'Nên anh xin bầu trời một góc nhỏ xíu,', l2: 'để viết tên hai đứa mình lên đó nàaa.' },
    { l1: '[[Hậu :heart: Trăm]]', l2: 'chòm sao dành riêng cho tụi mình :>>' },
    { l1: 'Sau này mỗi lần bé ngước lên trời,', l2: 'nhớ là lúc nào cũng có anh ở đây nhaaa.' },
    { l1: 'Cảm ơn bé đã đi cùng anh tới tận bây giờ,', l2: 'mong chòm sao này sẽ sáng hoài, y như tụi mình dậy óoo :stars:' },
];
