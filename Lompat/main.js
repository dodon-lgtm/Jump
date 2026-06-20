/*
  Lompat HD - Canvas Runner
  - Tidak pakai DOM rect untuk collision (lebih stabil & ringan)
  - Pakai delta time (fps-independent)
*/

(() => {
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });

  const scoreEl = document.getElementById('score');
  const scoreJarakEl = document.getElementById('scorejln');
  const highEl = document.getElementById('highscore');

  const overlay = document.getElementById('overlay');
  const btnStart = document.getElementById('btnStart');

  // Assets
  const imgBg = new Image();
  imgBg.src = 'image/sspace.jpg';

  const imgPlayer = new Image();
  imgPlayer.src = 'image/gojoh-Photoroom.png';

  const imgObstacle = new Image();
  imgObstacle.src = 'image/blackhole-removebg-preview.png';

  // Canvas resize (HiDPI)
  const dpr = Math.min(2.5, window.devicePixelRatio || 1);
  let W = 0;
  let H = 0;

  function resize() {
    const rect = canvas.getBoundingClientRect();
    W = Math.max(320, Math.floor(rect.width));
    H = Math.max(480, Math.floor(rect.height));

    canvas.width = Math.floor(W * dpr);
    canvas.height = Math.floor(H * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  window.addEventListener('resize', () => {
    resize();
  });

  // Game state
  let running = false;
  let gameOver = false;

  const groundYRatio = 0.86; // lantai sebagai persentase tinggi

  const player = {
    x: 0,
    y: 0,
    w: 72,
    h: 88,
    vy: 0,
    jumpImpulse: 620,
    gravity: 1650,
    onGround: true,
  };

  const obstacle = {
    x: 0,
    y: 0,
    w: 52,
    h: 78,
    speed: 420,
    passed: false,
    variant: 0,
  };

  const obstacles = [];

  let score = 0;
  let distance = 0;
  let highscore = 0;

  // Background parallax
  let bgScroll = 0;
  let stars = [];

  function initStars() {
    stars = [];
    const count = Math.floor(W / 10);
    for (let i = 0; i < count; i++) {
      stars.push({
        x: Math.random() * W,
        y: Math.random() * H,
        r: Math.random() * 1.4 + 0.2,
        v: Math.random() * 35 + 10,
        a: Math.random() * 0.6 + 0.2,
      });
    }
  }

  function resetGame() {
    running = false;
    gameOver = false;
    overlay.style.display = 'flex';

    score = 0;
    distance = 0;

    obstacles.length = 0;

    player.w = clamp(W * 0.09, 58, 92);
    player.h = player.w * 1.2;
    player.x = W * 0.18;
    player.y = groundY() - player.h; // FIX: posisi player benar di atas lantai
    player.vy = 0;
    player.onGround = true;

    obstacle.w = clamp(W * 0.05, 38, 64);
    obstacle.h = obstacle.w * 1.35;

    bgScroll = 0;

    scheduleNextObstacle(0.9);

    updateHUD();
  }

  function groundY() {
    return H * groundYRatio;
  }

  function clamp(v, a, b) {
    return Math.max(a, Math.min(b, v));
  }

  function getLevel() {
    return Math.floor(score / 8);
  }

  function speedForLevel(level) {
    return 420 * Math.pow(1.10, level);
  }

  function obstacleGapForLevel(level) {
    const base = 320;
    const gap = base * Math.pow(0.965, level);
    return clamp(gap, 190, 320);
  }

  function scheduleNextObstacle(afterFactor = 1) {
    const level = getLevel();
    const spd = speedForLevel(level);
    const gap = obstacleGapForLevel(level);

    const variant = Math.random() < 0.35 ? 1 : 0;

    // FIX: hitung oW dan oH dulu agar y konsisten dengan h
    const oW = variant ? obstacle.w * 0.85 : obstacle.w;
    const oH = variant ? obstacle.h * 0.75 : obstacle.h;

    const o = {
      x: W + gap * afterFactor + Math.random() * 120,
      y: groundY() - oH, // FIX: pakai oH yang sudah dihitung, bukan obstacle.h langsung
      w: oW,
      h: oH,
      speed: spd,
      passed: false,
      variant,
    };
    obstacles.push(o);
  }

  function jump() {
    if (!running || gameOver) return;
    if (player.onGround) {
      player.vy = -player.jumpImpulse;
      player.onGround = false;
    }
  }

  // Controls
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space') {
      e.preventDefault();
      if (!running && !gameOver) startGame();
      else jump();
    }
    if (e.code === 'KeyR') {
      if (gameOver) resetGame();
      if (!running && gameOver) startGame();
    }
  });

  canvas.addEventListener('pointerdown', () => {
    if (!running && !gameOver) startGame();
    else jump();
  });

  btnStart.addEventListener('click', () => {
    if (!running) startGame();
  });

  function startGame() {
    if (running) return;
    overlay.style.display = 'none';
    running = true;
    gameOver = false;

    player.y = groundY() - player.h; // FIX: posisi awal benar
    player.vy = 0;
    player.onGround = true;
  }

  // Collision (AABB)
  function intersects(a, b) {
    return (
      a.x < b.x + b.w &&
      a.x + a.w > b.x &&
      a.y < b.y + b.h &&
      a.y + a.h > b.y
    );
  }

  const particles = [];
  function spawnDust(x, y, count = 10) {
    for (let i = 0; i < count; i++) {
      particles.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 120,
        vy: -(Math.random() * 80 + 20),
        life: Math.random() * 0.35 + 0.15,
        r: Math.random() * 2 + 0.8,
        a: Math.random() * 0.6 + 0.2,
      });
    }
  }

  function updateParticles(dt) {
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 900 * dt;
      p.a *= 0.98;
    }
  }

  function renderParticles() {
    for (const p of particles) {
      ctx.globalAlpha = p.a;
      ctx.fillStyle = 'rgb(210, 150, 255)';
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawBackground(dt) {
    const speed = 60 + getLevel() * 6;
    bgScroll += speed * dt;

    if (imgBg.complete && imgBg.naturalWidth > 0) {
      const imgW = imgBg.naturalWidth;
      const imgH = imgBg.naturalHeight;
      const scale = H / imgH;
      const drawW = imgW * scale;
      const x0 = -((bgScroll % drawW));

      ctx.drawImage(imgBg, x0, 0, drawW, H);
      ctx.drawImage(imgBg, x0 + drawW, 0, drawW, H);
    } else {
      const g = ctx.createLinearGradient(0, 0, 0, H);
      g.addColorStop(0, '#120a2a');
      g.addColorStop(1, '#05030c');
      ctx.fillStyle = g;
      ctx.fillRect(0, 0, W, H);
    }

    // stars overlay
    ctx.save();
    for (const s of stars) {
      s.x -= s.v * dt;
      if (s.x < -10) s.x = W + 10;
      ctx.globalAlpha = s.a;
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawPlayer() {
    const p = player;
    if (imgPlayer.complete && imgPlayer.naturalWidth > 0) {
      const rot = clamp(p.vy / 1200, -0.25, 0.25);
      const cx = p.x + p.w / 2;
      const cy = p.y + p.h / 2;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(rot);
      ctx.translate(-cx, -cy);
      ctx.drawImage(imgPlayer, p.x, p.y, p.w, p.h);
      ctx.restore();
    } else {
      ctx.fillStyle = '#e9d5ff';
      ctx.beginPath();
      ctx.roundRect(p.x, p.y, p.w, p.h, 18);
      ctx.fill();
    }
  }

  function drawObstacle(o) {
    if (imgObstacle.complete && imgObstacle.naturalWidth > 0) {
      ctx.drawImage(imgObstacle, o.x, o.y, o.w, o.h);
    } else {
      ctx.fillStyle = '#060606';
      ctx.beginPath();
      ctx.roundRect(o.x, o.y, o.w, o.h, 16);
      ctx.fill();
    }
  }

  function drawGround() {
    const gy = groundY();
    ctx.save();
    ctx.strokeStyle = 'rgba(180, 80, 255, .35)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(0, gy);
    ctx.lineTo(W, gy);
    ctx.stroke();

    ctx.strokeStyle = 'rgba(255,255,255,.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, gy + 1);
    ctx.lineTo(W, gy + 1);
    ctx.stroke();
    ctx.restore();
  }

  function updateHUD() {
    scoreEl.textContent = `Skor Point: ${score}`;
    scoreJarakEl.textContent = `Skor Jarak: ${distance}`;
    highEl.textContent = `High Score : ${highscore}`;
  }

  let last = performance.now();

  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    resize();

    drawBackground(dt);
    drawGround();

    if (running) {
      const level = getLevel();
      const baseSpeed = speedForLevel(level);

      // Player physics
      player.vy += player.gravity * dt;
      player.y += player.vy * dt;

      const gy = groundY();
      // FIX: player berdiri dengan kaki di garis lantai (player.y + player.h == groundY())
      if (player.y + player.h >= gy) {
        player.y = gy - player.h;
        if (!player.onGround) {
          spawnDust(player.x + player.w * 0.5, gy + 2, 14);
        }
        player.vy = 0;
        player.onGround = true;
      }

      // Obstacles
      for (const o of obstacles) {
        o.speed = baseSpeed;
        o.x -= o.speed * dt;

        if (!o.passed && o.x + o.w < player.x) {
          o.passed = true;
          score += 1;
          const addDist = Math.floor(2 + level * 0.5);
          distance += addDist;
          updateHUD();

          if (obstacles.length < 6) {
            scheduleNextObstacle(0.7);
          }
        }
      }

      // Remove offscreen obstacles
      for (let i = obstacles.length - 1; i >= 0; i--) {
        if (obstacles[i].x + obstacles[i].w < -100) obstacles.splice(i, 1);
      }

      // Collision check
      const pBox = { x: player.x, y: player.y, w: player.w, h: player.h };
      for (const o of obstacles) {
        const oBox = { x: o.x, y: o.y, w: o.w, h: o.h };
        if (intersects(pBox, oBox)) {
          triggerGameOver();
          break;
        }
      }

      updateParticles(dt);
    }

    for (const o of obstacles) drawObstacle(o);
    drawPlayer();
    renderParticles();

    requestAnimationFrame(loop);
  }

  function triggerGameOver() {
    if (gameOver) return;
    gameOver = true;
    running = false;

    highscore = Math.max(highscore, score);
    localStorage.setItem('highscore', String(highscore));

    updateHUD();

    overlay.style.display = 'flex';
    overlay.querySelector('.overlay-title').textContent = 'Game Over';
    const sub = overlay.querySelector('.overlay-sub');
    sub.innerHTML = `Skor Point: <b>${score}</b><br/>Skor Jarak: <b>${distance}</b>`;
    btnStart.textContent = 'Restart';

    btnStart.onclick = () => {
      overlay.querySelector('.overlay-title').textContent = 'Lompat HD';
      overlay.querySelector('.overlay-sub').innerHTML = 'Tekan <b>Space</b> / klik untuk lompat';
      btnStart.textContent = 'Start';
      resetGame();
      startGame();
    };
  }

  // Highscore init
  const hs = localStorage.getItem('highscore');
  highscore = hs === null ? 0 : parseInt(hs, 10) || 0;
  highEl.textContent = `High Score : ${highscore}`;

  // Setup and start
  resize();
  initStars();
  resetGame();

  requestAnimationFrame(loop);
})();