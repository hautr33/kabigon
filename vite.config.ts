import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
    plugins: [react()],
    // Đường dẫn tương đối: chạy được trên GitHub Pages dù repo tên gì.
    base: './',
});
