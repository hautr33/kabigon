# Mùng 6 Của Trăm ✨

Bộ sưu tập các màn chơi nhỏ, làm bằng **Vite + React + PixiJS + GSAP**.

## Chạy trên máy

```bash
npm install
npm run dev        # mở http://localhost:5173, sửa code là trang tự tải lại
npm run typecheck  # kiểm tra kiểu TypeScript
npm run build      # build ra thư mục dist/
```

## Cách tổ chức 

- **PixiJS** vẽ phần "thế giới" (bầu trời, sao băng, nhân vật, hiệu ứng) trên một canvas toàn màn hình.
  Vòng lặp của Pixi chạy theo `gsap.ticker` nên tween và khung hình luôn khớp nhau → mượt.
- **React (DOM + CSS)** lo giao diện: menu, HUD, khung thoại kính mờ — chữ luôn sắc nét.
- **GSAP** lo mọi chuyển động (xuất hiện, chuyển cảnh, parallax...).
- **Howler** phát âm thanh.

```
src/
  App.tsx                 home → chọn theme → chọn màn → chơi (tối dần / sáng dần)
  styles.css              phong cách chung: kính mờ, nút, chữ lấp lánh, bụi sao theo chuột
  store/                  Zustand: progress (tự lưu localStorage), hud
  core/
    dates.ts              ngày của từng màn (màn 1 = 06/06/2026, +1 tháng/màn), khoá theo ngày, đếm ngày bên nhau
    pixi/PixiHost.tsx     canvas Pixi dùng chung + hook usePixiScene / useMetrics
    pixi/art.ts           "xưởng vẽ" texture, tự xếp vào 1 atlas (thay cho TexturePacker)
    pixi/particles.ts     bộ phát hạt trên ParticleContainer của Pixi 8
    pixi/sky.ts, comet.ts bầu trời đêm, sao băng
  ui/                     Dialog, Glass (thẻ kính), RichText, CursorTrail, HomeButton
    Icon.tsx              bộ icon SVG vẽ tay (thay emoji). Trong lời thoại viết `:heart:`, `:moon:`... là ra icon
  home/                   màn hình home: dây đèn treo ảnh polaroid (mỗi ảnh 1 theme)
    text.ts               MỌI CHỮ của home: lời chào theo giờ, thư mùng 6, lời nhắn bí mật
    backdrop.ts           nền Pixi: thế giới theme hiện dần khi rê chuột, pháo hoa mùng 6
  menu/ThemeScreen.tsx    màn chọn màn của một theme
  themes/
    index.tsx             DANH SÁCH THEME — mỗi theme 3 màn
    01-kabigon/           Chương 1 · Vì Sao & Kabigon
      levels.ts           cấu hình 3 màn (12 / 24 / 36 sao)
      dialogue.ts         toàn bộ lời thoại + chữ của chòm sao màn 3
      kabigon.ts          Kabigon rig bằng code (thở, bước, vung tay, vui, buồn)
      game.ts             lối chơi bắt sao (Pixi)
      world.ts            "thế giới" của theme (trăng + Kabigon ngủ) cho home & màn chọn màn
      cutscenes.ts        đèn lồng + tia trăng / trái tim 3D / chòm sao mang tên
      StarCatchLevel.tsx  giao diện React của màn
    02-tiem-banh/         Chương 2 · Tiệm Bánh Corgi (3 màn giải đố, nền ban ngày)
      dialogue.ts         toàn bộ lời thoại
      art.tsx             corgi, nguyên liệu, topping, ảnh bìa (SVG)
      world.ts            thế giới Pixi ban ngày: trời pastel, mây, đồi, tiệm bánh
      BakeryLevel.tsx     khung chung: giới thiệu → giải đố → pháo giấy + lời nhắn
      RecipePuzzle.tsx    màn 4 · đoán công thức (kiểu Mastermind)
      DecoratePuzzle.tsx  màn 5 · trang trí bánh đối xứng
      DeliveryPuzzle.tsx  màn 6 · xoay đường giao bánh
public/assets/            âm thanh, hình ảnh...
```

## Thử nghiệm theo ngày

- `?date=2026-12-06` — giả làm hôm nay là ngày đó (xem chế độ mùng 6, màn bị khoá…)
- `?all` — mở khoá mọi theme / màn

## Thêm theme / màn mới

- Mỗi theme có 3 màn. Màn thứ N tự động mang ngày 06/(5+N)/2026 (cứ thêm 1 tháng).
- Thêm theme: tạo `src/themes/02-ten-theme/`, viết các màn (component React; dùng `usePixiScene`
  nếu cần vẽ bằng Pixi), rồi thêm một mục vào `THEMES` trong `src/themes/index.tsx`
  (kèm `accent`, `cover` — hình trong ảnh polaroid — và `world` nếu muốn có nền riêng). Theme và màn tự mở vào mùng 6 của tháng tương ứng.
- Khi người chơi qua màn: `useProgress.getState().markCompleted(id)`.

## Deploy lên GitHub Pages

Lần đầu: vào repo trên GitHub, chọn **Settings → Pages → Source: GitHub Actions**.
Sau đó mỗi lần push lên `main`, workflow `.github/workflows/deploy.yml` sẽ tự build và đăng.
