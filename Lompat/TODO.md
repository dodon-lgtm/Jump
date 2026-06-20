# TODO - Upgrade Game Lompat (HD + siap publish)

- [x] Audit ulang implementasi awal (index.html/style.css/main.js) dan rapikan struktur.

- [x] Upgrade `index.html`: tambahkan `<canvas>` untuk rendering HD dan overlay UI (start/game over).

- [x] Upgrade `style.css`: perbaiki responsive, betulkan font-size, buat layout UI modern + overlay styling.

- [ ] Refactor `main.js` ke engine canvas:
  - [ ] Delta time movement (player & obstacle)
  - [ ] Collision berbasis AABB (tanpa `getBoundingClientRect` per frame)
  - [ ] Obstacle spawning queue + difficulty scaling (berdasarkan skor/level)
- [ ] Polish: parallax background, efek sederhana (dust/trail), sound optional, control (Space/Click) + tombol restart.
- [ ] Highscore: pastikan localStorage update saat game over.
- [ ] Test manual: resize window, mulai/ulang, collision konsisten, highscore tersimpan.

