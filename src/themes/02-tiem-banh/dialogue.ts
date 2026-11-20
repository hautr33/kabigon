// Toàn bộ chữ của theme "Tiệm Bánh Corgi". Sửa lời chỉ cần sửa file này.
//   \n : xuống dòng     [[...]] : chữ nổi bật     :heart: : icon (tên xem trong src/ui/Icon.tsx)

export const SHOP_NAME = 'Tiệm Bánh Corgi';

// ---------------- Màn 4 · Công thức bí mật ----------------
export const RECIPE = {
    title: 'Công Thức Bí Mật :sparkles:',
    intro: 'Bé Corgi muốn nướng một cái bánh siu đặc biệt cho [[một vị khách quan trọng]],\nmà lỡ quên mất tiuu công thức òiii!\n\nCông thức có [[4 nguyên liệu khác nhau]], bé phải cho zô [[đúng thứ tự]] nhaaa.',
    hint: 'Mỗi lần trộn thử, Bé Corgi sẽ chấm điểm cho bé:  chấm vàng = đúng món đúng chỗ  ·  chấm hồng = có món đó nhma sai chỗ',
    start: 'Zô bếp thuiii!',
    catIdle: 'Bé chọn 4 nguyên liệu rồi bấm “Trộn thử” nhaaa~',
    catFeedback: (exact: number, near: number) =>
        exact === 0 && near === 0 ? 'Hmm… hỏng có món nào đúng hết trơnnn :<' :
            `${exact} món đúng chỗ, ${near} món có trong công thức nhma sai chỗ ùiii!`,
    catLose: 'Hết lượt mất tiuuu.. Bé Corgi nhớ ra công thức là dậy nà. Bé thử lại công thức mới nhaaa!',
    catWin: 'Awww!!! Thơm quá dạaa :heart:',
    tryButton: 'Trộn thử',
    noteButton: 'Gạch món',
    noteOn: 'Bé chạm zô món chắc chắn hong có để gạch ra nà~',
    resetButton: 'Làm lại',
    win: [
        { title: 'Bánh chín ùiii! :sparkles:', body: 'Lò kêu “ting” một cái,\ncả tiệm thơm mùi bánh quá chời lunnn.' },
        { title: 'Bí mật nhỏ xíu nè…', body: 'Thiệt ra công thức này hỏng có trong sách nào hết á.\nNguyên liệu quan trọng nhất là [[nụ cười của bé Trăm]] đó :>>' },
        { title: 'Gửi bé Trăm :heart:', body: 'Ngày nào ở cạnh bé cũng ngọt như chiếc bánh mới ra lò này dậyyy.\nCảm ơn bé đã cho mỗi ngày của anh càng ngọt ngào hơnnn ', end: true },
    ],
};

// ---------------- Màn 5 · Trang trí bánh ----------------
export const DECORATE = {
    title: 'Hai Nửa Ngọt Ngào :heart:',
    intro: 'Bánh nướng xong ờiii, giờ tới khúc trang trí nàaa!\nBé Corgi làm [[nửa bên trái]] òi, giờ bé Trăm làm [[nửa bên phải]] giúp bé Corgi nhaaa\nsao cho hai bên nó [[đối xứng]] với nhau nàaa.',
    hint: 'Bé chọn topping rồi chạm zô ô bên phải để đặt  ·  chọn cục tẩy để gỡ',
    start: 'Trang trí thuiii!',
    catIdle: 'Bé nhìn kỹ bên trái trước ùi trang trí nhaaa~',
    catCheck: (wrong: number) => (wrong === 0 ? 'Tuỵttt lunnn!' : `Còn ${wrong} chỗ chưa giống bên trái nè, bé cố lênnn!`),
    checkButton: 'Bé Corgi coi thử',
    eraser: 'Xóa',
    round: (n: number) => `Bánh ${n}/2`,
    round2: 'Bé giỏiii quá iii, giờ tới bánh thứ hai khó hơn nè: Bé Corgi chỉ làm mẫu xíu xiu thuii, rồi phủ kem lên nà. Bé nhớ xem kỹ nhaaa!',
    covered: 'Bên trái bị phủ kem gòi! Bé ráng nhớ lại rồi trang trí nhaaa~',
    peekButton: 'Nhìn trộm',
    peekCat: 'Xíu xiu thuii đó nhaaa!',
    win: [
        { title: 'Đẹp quá chời lunn! :sparkles:', body: 'Hai nửa cái bánh khớp nhau tới từng trái dâu lunnn.' },
        { title: 'Giống tụi mình ghê', body: 'Hai nửa khác nhau, nhma để cạnh nhau\nlà thành [[số 10]] siuu đẹp nà' },
        { title: 'Gửi bé Trăm :heart:', body: 'Cảm ơn bé đã là nửa còn lại ngọt ngào nhất của anhhh.', end: true },
    ],
};

// ---------------- Màn 6 · Giao bánh ----------------
export const DELIVERY = {
    title: 'Đơn Hàng Đặc Biệt :heart-gold:',
    intro: 'Bánh xong gòi, giờ Bé Corgi phải đạp xe giao tận nhà nà!\nNhma đường bị xoay lung tung hết trơn ùii.\n\nBé chạm zô từng ô để [[xoay đường]], nối từ [[tiệm bánh]] tới [[nhà khách]] giúp bé Corgi nhaaa.',
    hint: 'Khúc nào nối được từ tiệm bánh là sáng lên màu hồng nà',
    start: 'Lên đường thuiii!',
    catIdle: 'Bé xoay đường giùm Bé Corgi nhaaa~',
    catGo: 'Thông đường gòi! Bé Corgi đi liền lunnn :sparkles:',
    win: [
        { title: 'Ting toong! :heart:', body: 'Cửa mở ra… và vị khách quan trọng này\nlà [[bé Trăm]] chớ ai!' },
        { title: 'Trong hộp bánh có…', body: 'Một cái bánh nhỏ, một tấm thiệp nhỏ,\nvà một lời hứa hong có nhỏ xíu nào nha.' },
        { title: 'Gửi bé Trăm :heart-gold:', body: 'Dù đường có khó đi cỡ nào đi nữa,\nthì anh cũng sẽ đến được bên cạnh bé quài quàii lunnn.', end: true },
    ],
};

// Chữ trong đoạn kết của từng màn
export const ENDING = {
    ting: 'Ting!',
    photo: 'Bánh của tụi mình nà ♡',
    card: 'Gửi bé Trăm',
};

export const COMMON = {
    next: 'Tiếp nèee :sparkles:',
    replay: 'Chơi lại nhaa',
    home: 'Về tiệm bánh',
};
