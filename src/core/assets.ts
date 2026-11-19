// Đường dẫn tới file trong public/assets, đúng cả khi chạy local lẫn trên GitHub Pages.
export const assetUrl = (path: string) => `${import.meta.env.BASE_URL}assets/${path}`;
