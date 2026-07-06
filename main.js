function resize() { W = gw.offsetWidth; H = gw.offsetHeight;[bgC, gmC, fxC].forEach(c => { c.width = W; c.height = H }); bgx = bgC.getContext('2d'); gx = gmC.getContext('2d'); fx = fxC.getContext('2d'); chibiX = W / 2; buildBgScene(); }
function buildBgScene() {
    bgStars = []; fireflies = []; bgDecor.trees = []; bgDecor.decorations = [];
    for (let i = 0; i < 250; i++) bgStars.push({ x: Math.random() * W, y: Math.random() * (H * 0.8), r: Math.random() * 1.2 + 0.2, a: Math.random() * 0.8 + 0.2, twinkle: Math.random() * Math.PI * 2, twinkleSpeed: Math.random() * 0.02 + 0.005, hue: Math.random() > 0.5 ? 240 : 280, layer: Math.random() > 0.8 ? 2 : (Math.random() > 0.5 ? 1 : 0) });
    for (let i = 0; i < 35; i++) fireflies.push({ x: Math.random() * W, y: H - Math.random() * (H * 0.4), vx: (Math.random() - 0.5) * 0.6, vy: (Math.random() - 0.5) * 0.3, r: Math.random() * 1.8 + 0.8, pulse: Math.random() * Math.PI * 2, hue: Math.random() > 0.5 ? 60 : 320 });
    const treeColors = ['#4c1d95', '#6d28d9', '#4338ca', '#5b21b6'];
    for (let i = 0; i < 6; i++) bgDecor.trees.push({ x: (W / 5) * i + (Math.random() - 0.5) * 30, baseY: getGroundY((W / 5) * i) + 5, scale: Math.random() * 0.35 + 0.6, color: treeColors[i % treeColors.length], flip: Math.random() > 0.5 });
    const flowerColors = ['#fbcfe8', '#fecdd3', '#e9d5ff', '#a78bfa'];
    for (let i = 0; i < 45; i++) { let tx = Math.random() * W; bgDecor.decorations.push({ x: tx, y: getGroundY(tx) + 5 + Math.random() * 25, type: Math.random() > 0.6 ? 'flower' : 'grass', scale: Math.random() * 0.4 + 0.6, color: flowerColors[Math.floor(Math.random() * flowerColors.length)] }); }
}

function spawnStar() {
    if (isWinAnimation) return;
    const fromLeft = Math.random() < 0.5; const sx = fromLeft ? -20 : W + 20; const sy = Math.random() * H * 0.25;
    const angle = fromLeft ? (Math.random() * 0.3 + 0.5) : (Math.PI - Math.random() * 0.3 - 0.5);
    const isRainbow = Math.random() < 0.01;

    // Tốc độ thay đổi linh hoạt theo điểm số
    let speedMulti = 1;
    if (score >= 36) speedMulti = 1.6; else if (score >= 24) speedMulti = 1.3; else if (score >= 12) speedMulti = 1.15;
    const speed = (isRainbow ? (Math.random() * 2 + 3.5) : (Math.random() * 2 + 1.5)) * speedMulti;
    const size = isRainbow ? (Math.random() * 2 + 6) : (Math.random() * 2 + 3.5);
    shooters.push({ x: sx, y: sy, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed, tail: [], size: size, hue: Math.random() * 60 + 260, caught: false, missed: false, alpha: 1, isRainbow: isRainbow });
}

function triggerLose() {
    // KIỂM TRA MỐC TẠI THỜI ĐIỂM THUA ĐỂ PHÁT CUTSCENE THAY VÌ BÁO THUA
    if (score >= 12) {
        startWinAnimation(score);
    } else {
        // Thua thông thường khi < 12
        over = true; running = false; cancelAnimationFrame(raf);
        setTimeout(() => {
            ws.style.display = 'flex'; ws.style.opacity = '0'; setTimeout(() => ws.style.opacity = '1', 50);
            document.getElementById('wt').textContent = 'Éccc, thua mất tiu rùiiii... 😢'; document.getElementById('wt').style.color = '#fff';
            document.getElementById('cm').innerHTML = 'Thử lại lần nữa để gọi phép màu cùng Kabigon nha :3 Bé ơi cố lên!!!';
            document.getElementById('yb').textContent = 'Thử lại lần nữa :3'; document.getElementById('yb').onclick = () => { ws.style.display = 'none'; playClickSound(); startGame(); };
            document.getElementById('nb').style.display = 'none';
        }, 500);
    }
}

function startWinAnimation(finalScore) {
    isWinAnimation = true; over = true; winTime = 0; hud.style.opacity = '0'; winStep = 1; windPlay = false; wooshPlay = false;

    // Gán hiệu ứng Mốc dựa vào điểm số cuối cùng
    if (finalScore >= 36) currentMilestone = 3; else if (finalScore >= 24) currentMilestone = 2; else currentMilestone = 1;

    if (currentMilestone === 1) {
        lanterns = []; birds = [];
        for (let i = 0; i < 150; i++) { let scale = Math.random() > 0.8 ? (Math.random() * 4 + 6) : (Math.random() * 3 + 2); lanterns.push({ x: Math.random() * W, y: H + Math.random() * H * 1.5 + 50, size: scale, vy: -(Math.random() * 0.8 + 0.5) * (scale / 4), offset: Math.random() * Math.PI * 2, alpha: 0 }); }
        for (let i = 0; i < 8; i++) birds.push({ x: -50 - Math.random() * 150, y: H * 0.45 - Math.random() * 80 + (i * 15), speed: Math.random() * 0.8 + 0.6, scale: Math.random() * 0.4 + 0.4, phase: Math.random() * Math.PI * 2 });
    }
    else if (currentMilestone === 2) {
        birds = [];
        for (let i = 0; i < 12; i++) birds.push({ x: -50 - Math.random() * 150, y: H * 0.3 - Math.random() * 100 + (i * 15), speed: Math.random() * 1.2 + 0.8, scale: Math.random() * 0.5 + 0.4, phase: Math.random() * Math.PI * 2 });
        // Vòng "24 giờ" quanh mặt trời - mỗi giờ là một ngôi sao nhỏ lần lượt sáng lên
        clockStars = [];
        for (let i = 0; i < 24; i++) { clockStars.push({ angle: -Math.PI / 2 + i * (Math.PI * 2 / 24), lit: false, litTime: 0 }); }
    }
    else if (currentMilestone === 3) {
        constellationStars = [];
        let sumX = 0, sumY = 0;
        for (let i = 0; i < 36; i++) {
            let t = i * (Math.PI * 2) / 36;
            let hx = 16 * Math.pow(Math.sin(t), 3);
            let hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
            let tx = W / 2 + hx * 9, ty = H * 0.35 + hy * 9;
            sumX += tx; sumY += ty;
            constellationStars.push({ x: (Math.random() - 0.5) * W * 2 + W / 2, y: (Math.random() - 0.5) * H * 2 + H / 2, tx: tx, ty: ty, alpha: 0 });
        }
        heartCenter = { x: sumX / 36, y: sumY / 36 };
    }
}

function updateProgress() {
    const pf = document.querySelector('.progress-fill');
    let max = 12;
    if (score >= 24) max = 36; else if (score >= 12) max = 24;
    if (pf) pf.style.width = Math.min((score / max * 100), 100) + '%';
}

function loop(ts) {
    const dt = Math.min(ts - lastT, 50); lastT = ts; animateBg(ts); gx.clearRect(0, 0, W, H);

    if (running && !isWinAnimation) {
        spawnT += dt; gameT += dt;
        const interval = Math.max(500, 1500 - score * 25);
        while (spawnT >= interval) { spawnStar(); spawnT -= interval; }
        if (!infiniteTime) {
            exactTimeLeft -= dt / 1000;
            let currentSec = Math.ceil(exactTimeLeft);
            if (currentSec !== timeLeft) { timeLeft = Math.max(0, currentSec); tvEl.textContent = timeLeft; }
            if (exactTimeLeft <= 0 && !over) triggerLose();
        }
    }

    let targetX = Math.min(Math.max(mx, 50), W - 50); chibiX += (targetX - chibiX) * 0.12; let speedX = targetX - chibiX;
    if (speedX > 1.5) chibiFace = 1; else if (speedX < -1.5) chibiFace = -1;
    if (emotionTimer > 0) emotionTimer--; else chibiEmotion = 'normal';
    let bob = Math.sin(gameT * 0.008) * Math.min(Math.abs(speedX) * 0.15, 2); if (Math.abs(speedX) < 1) bob = Math.sin(gameT * 0.005) * 1.5;
    const netY = getGroundY(chibiX) - 55 + bob; const chibiY = getGroundY(chibiX) - 18 + bob;

    drawChibi(chibiX, chibiY, chibiFace, chibiEmotion); drawCatcher(chibiX, netY); drawShooters(chibiX, netY); drawParticles();

    for (let i = floatingTexts.length - 1; i >= 0; i--) {
        let ft = floatingTexts[i]; ft.y -= 1.5; ft.alpha -= 0.015; if (ft.alpha <= 0) { floatingTexts.splice(i, 1); continue; }
        gx.save(); gx.globalAlpha = ft.alpha; gx.font = "bold 18px Quicksand"; gx.fillStyle = "#fde68a"; gx.shadowBlur = 10; gx.shadowColor = "#f59e0b"; gx.textAlign = "center"; gx.fillText(ft.text, ft.x, ft.y); gx.restore();
    }

    if (isWinAnimation) drawWinAnimation(dt); else fx.clearRect(0, 0, W, H);
    if (running || isWinAnimation) raf = requestAnimationFrame(loop);
}

function startGame() {
    score = 0; lives = 6; exactTimeLeft = 30; timeLeft = 30; if (tgEl) tgEl.textContent = 12;
    shooters = []; particles = []; catcherTrail = []; lanterns = []; birds = [];
    isHeartMode = false; secretCode = ""; infiniteLives = false; infiniteTime = false; floatingTexts = [];

    window.heart24 = null;
    window.heartShockwaves = [];
    window.lastBeatTime = 0;
    window.cherryPetals = null;

    lvEl.innerHTML = '6'; lvEl.style.color = '#fda4af';
    over = false; isWinAnimation = false; spawnT = 0; gameT = 0; chibiEmotion = 'normal'; emotionTimer = 0;
    svEl.textContent = '0'; tvEl.textContent = '30'; hud.style.opacity = '1'; fx.clearRect(0, 0, W, H);
    updateProgress(); running = true; lastT = performance.now(); bgmSfx.volume = 0.4; raf = requestAnimationFrame(loop);
}

document.getElementById('sb').onclick = () => { playClickSound(); bgmSfx.play().catch(e => console.log(e)); ss.style.opacity = '0'; setTimeout(() => { ss.style.display = 'none'; startGame(); }, 800); };

// === LUỒNG DIALOGUE GỐC TỎ TÌNH CỦA BẠN TRẢI ĐỀU QUA 3 MỐC ===
document.getElementById('yb').onclick = () => {
    playClickSound();

    if (currentMilestone === 1) {
        // GIỮ ĐÚNG 100% CUTSCENE 12 CỦA BẠN
        if (winStep === 1) { winStep = 2; document.getElementById('cm').innerHTML = 'Anh đã đợi ngày này đến cũng khá lâu òi, và hôm nay anh có điều muốn nói với bé!'; }
        else if (winStep == 2) { winStep = 3; document.getElementById('cm').innerHTML = 'Bé có biết vì sao anh lại đặt mốc 12 ngôi sao để Kabigon thu thập hơm?'; }
        else if (winStep === 3) { winStep = 4; document.getElementById('cm').innerHTML = "Bởi vì 12 ngôi sao này đại diện cho 12 tháng trong năm anh muốn ở cạnh bé :3"; }
        else if (winStep === 4) {
            winStep = 5; document.getElementById('cm').innerHTML = "Và hôm nay anh muốn tự tay kích hoạt<br><span class='highlight-star'>'ngôi sao thứ 13'</span>, ngôi sao đó chính là <span class='highlight-star'>bé Trăm siu cấp đáng iu</span>!";
            for (let i = 0; i < 40; i++) particles.push({ x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.4 + (Math.random() - 0.5) * 100, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, alpha: 1, r: Math.random() * 4 + 2, hue: 45, life: 0 });
        }
        else if (winStep === 5) { winStep = 6; document.getElementById('cm').innerHTML = "Liệu bé Trăm có muốn tiến thêm một bước, làm <br><span class='highlight-star'>ngôi sao sáng nhất trong lòng anh</span> hong?"; document.getElementById('yb').textContent = 'Có ạ :>>'; const nb = document.getElementById('nb'); nb.style.display = 'inline-block'; nb.style.position = 'static'; }
        else if (winStep === 6) { document.getElementById('wt').innerHTML = 'Awww!!!<br>Thiệt là hạnh phúc quá đi à :3'; document.getElementById('cm').innerHTML = 'Xin cảm ơn bé :3 Hy vọng chúng mình sẽ cùng nhau tạo nên thiệt là nhiều kỷ niệm đẹp nà :3'; document.getElementById('yb').style.display = 'none'; document.getElementById('nb').style.display = 'none'; }
    } else if (currentMilestone === 3) {
        // LỜI THOẠI MỐC 36 - CHÒM SAO KỶ NIỆM CỦA TỤI MÌNH
        if (winStep === 1) { winStep = 2; document.getElementById('cm').innerHTML = "Woa, 36 ngôi sao luôn á! Bé giỏi thiệt sự."; }
        else if (winStep === 2) { winStep = 3; document.getElementById('cm').innerHTML = "Anh hay nghĩ, mỗi ngôi sao là một kỷ niệm nhỏ tụi mình đã có, có ngôi sáng rực, có ngôi lấp lánh dịu dàng."; }
        else if (winStep === 3) { winStep = 4; document.getElementById('cm').innerHTML = "Gộp hết lại, tụi nó không rối tung đâu, mà tự nhiên ghép thành một hình quen thuộc..."; }
        else if (winStep === 4) {
            winStep = 5; document.getElementById('cm').innerHTML = "Là hình <span class='highlight-star'>trái tim tụi mình đã cùng nhau vẽ nên</span>, từng ngày một, không phải chỉ trong một đêm.";
            for (let i = 0; i < 40; i++) particles.push({ x: W / 2 + (Math.random() - 0.5) * 200, y: H * 0.4 + (Math.random() - 0.5) * 100, vx: (Math.random() - 0.5) * 8, vy: (Math.random() - 0.5) * 8, alpha: 1, r: Math.random() * 4 + 2, hue: 45, life: 0 });
        }
        else if (winStep === 5) { document.getElementById('wt').innerHTML = 'Chòm sao của tụi mình 💫'; document.getElementById('cm').innerHTML = 'Cảm ơn bé đã đồng hành suốt chặng đường này. Chòm sao này sẽ luôn ở đó, y như tụi mình vậy.'; document.getElementById('yb').style.display = 'none'; document.getElementById('nb').style.display = 'none'; }
    }
};

function runawayButton() {
    const nb = document.getElementById('nb'); nb.style.position = 'absolute';
    const padding = 50; const maxX = ws.clientWidth - nb.clientWidth - padding; const maxY = ws.clientHeight - nb.clientHeight - padding;
    const randomX = Math.max(padding, Math.random() * maxX); const randomY = Math.max(padding, Math.random() * maxY);
    nb.style.left = randomX + 'px'; nb.style.top = randomY + 'px';
}
document.getElementById('nb').onclick = () => { playClickSound(); runawayButton(); };

gw.addEventListener('mousemove', e => { const r = gmC.getBoundingClientRect(); mx = e.clientX - r.left; });
gw.addEventListener('touchmove', e => { e.preventDefault(); const r = gmC.getBoundingClientRect(); mx = e.touches[0].clientX - r.left; }, { passive: false });
resize(); window.addEventListener('resize', () => { resize(); if (!running && !isWinAnimation) animateBg(0); });