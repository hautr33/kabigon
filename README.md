# Những Vì Sao Nhỏ ✨

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
  App.tsx                 chuyển giữa menu và các màn (tối dần / sáng dần)
  styles.css              phong cách chung: kính mờ, nút, chữ lấp lánh, bụi sao theo chuột
  store/                  Zustand: progress (tự lưu localStorage), hud
  core/
    dates.ts              ngày của từng màn: màn 1 = 06/06/2026, mỗi màn sau +1 tháng
    pixi/PixiHost.tsx     canvas Pixi dùng chung + hook usePixiScene / useMetrics
    pixi/art.ts           "xưởng vẽ" texture, tự xếp vào 1 atlas (thay cho TexturePacker)
    pixi/particles.ts     bộ phát hạt trên ParticleContainer của Pixi 8
    pixi/sky.ts, comet.ts bầu trời đêm, sao băng
  ui/                     Dialog, Glass (thẻ kính), RichText, CursorTrail, HomeButton
  menu/                   màn hình chọn màn (chia theo chương)
  themes/
    index.tsx             DANH SÁCH THEME — mỗi theme 3 màn
    01-kabigon/           Chương 1 · Vì Sao & Kabigon
      levels.ts           cấu hình 3 màn (12 / 24 / 36 sao)
      dialogue.ts         toàn bộ lời thoại + chữ của chòm sao màn 3
      kabigon.ts          Kabigon rig bằng code (thở, bước, vung tay, vui, buồn)
      game.ts             lối chơi bắt sao (Pixi)
      cutscenes.ts        đèn lồng + tia trăng / trái tim 3D / chòm sao mang tên
      StarCatchLevel.tsx  giao diện React của màn
public/assets/            âm thanh, hình ảnh...
```

## Thêm theme / màn mới

- Mỗi theme có 3 màn. Màn thứ N tự động mang ngày 06/(5+N)/2026 (cứ thêm 1 tháng).
- Thêm theme: tạo `src/themes/02-ten-theme/`, viết các màn (component React; dùng `usePixiScene`
  nếu cần vẽ bằng Pixi), rồi thêm một mục vào `THEMES` trong `src/themes/index.tsx`.
- Khi người chơi qua màn: `useProgress.getState().markCompleted(id)`.

## Deploy lên GitHub Pages

Lần đầu: vào repo trên GitHub, chọn **Settings → Pages → Source: GitHub Actions**.
Sau đó mỗi lần push lên `main`, workflow `.github/workflows/deploy.yml` sẽ tự build và đăng.
