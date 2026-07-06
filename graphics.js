function drawCuteTree(ctx, tree) {
    ctx.save(); ctx.translate(tree.x, tree.baseY); ctx.scale(tree.scale * (tree.flip ? -1 : 1), tree.scale);
    ctx.fillStyle = '#2e1065'; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.quadraticCurveTo(-3, -15, -2, -25); ctx.lineTo(2, -25); ctx.quadraticCurveTo(3, -15, 4, 0); ctx.fill();
    ctx.fillStyle = tree.color; ctx.beginPath(); ctx.arc(0, -35, 18, 0, Math.PI * 2); ctx.arc(-14, -25, 14, 0, Math.PI * 2); ctx.arc(14, -25, 14, 0, Math.PI * 2); ctx.arc(-8, -15, 10, 0, Math.PI * 2); ctx.arc(8, -15, 10, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.15)'; ctx.beginPath(); ctx.arc(-6, -38, 4, 0, Math.PI * 2); ctx.fill(); ctx.beginPath(); ctx.arc(8, -28, 2.5, 0, Math.PI * 2); ctx.fill(); ctx.restore();
}

function animateBg(ts) {
    bgx.clearRect(0, 0, W, H);
    let darkness = (isWinAnimation && currentMilestone === 1) ? Math.min(0.85, winTime * 0.25) : 0;
    let sunriseProg = 0;

    const bgGradient = bgx.createLinearGradient(0, 0, 0, H);
    bgGradient.addColorStop(0, '#010008'); bgGradient.addColorStop(0.3, '#08051a'); bgGradient.addColorStop(0.7, '#160a33'); bgGradient.addColorStop(1, '#05071a');
    bgx.fillStyle = bgGradient; bgx.fillRect(0, 0, W, H);

    if (sunriseProg > 0) {
        const sunriseGrad = bgx.createLinearGradient(0, 0, 0, H);
        sunriseGrad.addColorStop(0, '#2e1437'); sunriseGrad.addColorStop(0.4, '#943b54'); sunriseGrad.addColorStop(0.7, '#e4765c'); sunriseGrad.addColorStop(1, '#facc6b');
        bgx.globalAlpha = sunriseProg; bgx.fillStyle = sunriseGrad; bgx.fillRect(0, 0, W, H); bgx.globalAlpha = 1;
    }

    for (const s of bgStars) {
        s.twinkle += s.twinkleSpeed;
        const baseA = s.layer === 2 ? s.a : (s.layer === 1 ? s.a * 0.6 : s.a * 0.3); const a = baseA * (0.3 + 0.7 * Math.sin(s.twinkle)) * (1 - darkness);
        bgx.beginPath(); bgx.arc(s.x, s.y, s.r * (s.layer === 2 ? 1.5 : 1), 0, Math.PI * 2); bgx.fillStyle = `hsla(${s.hue}, 80%, 90%, ${a})`;
        if (s.layer === 2) { bgx.shadowBlur = 8; bgx.shadowColor = `hsla(${s.hue}, 100%, 80%, ${a})`; } else bgx.shadowBlur = 0; bgx.fill();
    }
    bgx.shadowBlur = 0;
    bgDecor.trees.forEach(tree => drawCuteTree(bgx, tree));
    const hillGrad = bgx.createLinearGradient(0, H - 60, 0, H); hillGrad.addColorStop(0, '#3b0764'); hillGrad.addColorStop(1, '#0f172a');
    bgx.fillStyle = hillGrad; bgx.beginPath(); bgx.moveTo(0, H); for (let x = 0; x <= W; x += 5) bgx.lineTo(x, getGroundY(x)); bgx.lineTo(W, H); bgx.fill();
    bgx.strokeStyle = 'rgba(167, 139, 250, 0.4)'; bgx.lineWidth = 3; bgx.beginPath(); for (let x = 0; x <= W; x += 5) { if (x === 0) bgx.moveTo(x, getGroundY(x)); else bgx.lineTo(x, getGroundY(x)); } bgx.stroke();

    bgDecor.decorations.forEach(d => {
        bgx.save(); bgx.translate(d.x, d.y); bgx.scale(d.scale, d.scale);
        if (d.type === 'flower') {
            bgx.strokeStyle = '#34d399'; bgx.lineWidth = 2.5; bgx.lineCap = 'round'; bgx.beginPath(); bgx.moveTo(0, 0); bgx.lineTo(0, -8); bgx.stroke();
            bgx.translate(0, -8); bgx.fillStyle = d.color;
            for (let p = 0; p < 5; p++) { bgx.rotate(Math.PI * 2 / 5); bgx.beginPath(); bgx.ellipse(0, -3.5, 2.5, 4.5, 0, 0, Math.PI * 2); bgx.fill(); }
            bgx.fillStyle = '#fef08a'; bgx.beginPath(); bgx.arc(0, 0, 2.5, 0, Math.PI * 2); bgx.fill();
        } else { bgx.fillStyle = '#4c1d95'; bgx.beginPath(); bgx.arc(0, 0, 4, Math.PI, 0); bgx.arc(-5, 2, 3, Math.PI, 0); bgx.arc(5, 2, 3, Math.PI, 0); bgx.fill(); }
        bgx.restore();
    });

    for (const f of fireflies) {
        f.x += Math.sin(f.pulse) * 0.2 + f.vx; f.y += f.vy + Math.cos(f.pulse * 0.5) * 0.15; f.pulse += 0.02;
        if (f.y < H * 0.5) f.vy = Math.abs(f.vy) * 0.8; if (f.y > H - 10) f.vy = -Math.abs(f.vy) * 0.8;
        if (f.x < -10) f.x = W + 10; if (f.x > W + 10) f.x = -10;
        const fa = (0.3 + 0.5 * Math.sin(f.pulse)) * (1 - darkness);
        if (fa > 0) { bgx.beginPath(); bgx.arc(f.x, f.y, f.r, 0, Math.PI * 2); bgx.fillStyle = `hsla(${f.hue}, 100%, 80%, ${fa})`; bgx.shadowBlur = f.r * 5; bgx.shadowColor = `hsla(${f.hue}, 100%, 70%, ${fa})`; bgx.fill(); }
    }
    bgx.shadowBlur = 0;

    if (isWinAnimation && currentMilestone === 1) {
        bgx.fillStyle = `rgba(0, 0, 0, ${darkness})`; bgx.fillRect(0, 0, W, H);
        let moonRadius = 110, startY = H + moonRadius * 2, endY = H * 0.45; let progress = Math.min(1, winTime / 4); let easeProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
        let moonY = startY - (startY - endY) * easeProgress; let moonA = Math.min(1, winTime * 0.4); let pulse = Math.sin(winTime * 1.5) * 0.1;
        let haloRadius = moonRadius * (3.5 + pulse); let haloGrad = bgx.createRadialGradient(W / 2, moonY, moonRadius * 0.7, W / 2, moonY, haloRadius);
        haloGrad.addColorStop(0, `rgba(255, 255, 255, ${moonA * 0.4})`); haloGrad.addColorStop(0.3, `rgba(160, 200, 255, ${moonA * 0.15})`); haloGrad.addColorStop(1, 'rgba(100, 150, 255, 0)');
        bgx.fillStyle = haloGrad; bgx.beginPath(); bgx.arc(W / 2, moonY, haloRadius, 0, Math.PI * 2); bgx.fill();
        let moonGrad = bgx.createRadialGradient(W / 2, moonY - moonRadius * 0.3, 0, W / 2, moonY, moonRadius);
        moonGrad.addColorStop(0, `rgba(255, 255, 255, ${moonA})`); moonGrad.addColorStop(0.6, `rgba(240, 245, 255, ${moonA})`); moonGrad.addColorStop(1, `rgba(180, 200, 230, ${moonA})`);
        bgx.shadowBlur = 50 + pulse * 10; bgx.shadowColor = `rgba(200, 220, 255, ${moonA})`; bgx.fillStyle = moonGrad; bgx.beginPath(); bgx.arc(W / 2, moonY, moonRadius, 0, Math.PI * 2); bgx.fill(); bgx.shadowBlur = 0;
    }
}

function drawStar5(ctx, x, y, r, color, alpha, blur = 15) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.shadowBlur = blur; ctx.shadowColor = color; ctx.beginPath(); for (let i = 0; i < 5; i++) { const a = Math.PI / 2 + i * Math.PI * 2 / 5; const b = a + Math.PI / 5; if (i === 0) ctx.moveTo(x + Math.cos(a) * r, y - Math.sin(a) * r); else ctx.lineTo(x + Math.cos(a) * r, y - Math.sin(a) * r); ctx.lineTo(x + Math.cos(b) * r * 0.42, y - Math.sin(b) * r * 0.42); } ctx.closePath(); ctx.fill(); ctx.restore(); }
function drawHeart(ctx, x, y, size, color, alpha, blur = 15) { ctx.save(); ctx.globalAlpha = alpha; ctx.fillStyle = color; ctx.shadowBlur = blur; ctx.shadowColor = color; ctx.translate(x, y - size * 0.5); ctx.beginPath(); ctx.moveTo(0, size * 0.3); ctx.bezierCurveTo(0, 0, -size, 0, -size, size * 0.3); ctx.bezierCurveTo(-size, size, 0, size * 1.5, 0, size * 2.2); ctx.bezierCurveTo(0, size * 1.5, size, size, size, size * 0.3); ctx.bezierCurveTo(size, 0, 0, 0, 0, size * 0.3); ctx.fill(); ctx.restore(); }
function drawChibi(cx, cy, face, emotion) {
    if (isWinAnimation && winTime > 2) return; gx.save(); if (isWinAnimation) gx.globalAlpha = Math.max(0, 1 - (winTime / 2)); gx.translate(cx, cy);
    const bodyColor = '#445b71', bellyColor = '#fcf3e3', pawColor = '#b08d6a'; let ex = face * 4;
    gx.fillStyle = bodyColor; gx.beginPath(); gx.moveTo(-16, -20); gx.lineTo(-24, -40); gx.lineTo(-4, -30); gx.fill(); gx.beginPath(); gx.moveTo(16, -20); gx.lineTo(24, -40); gx.lineTo(4, -30); gx.fill();
    gx.beginPath(); gx.moveTo(0, -32); gx.bezierCurveTo(25, -32, 42, -10, 45, 15); gx.bezierCurveTo(45, 35, 25, 45, 0, 45); gx.bezierCurveTo(-25, 45, -45, 35, -45, 15); gx.bezierCurveTo(-42, -10, -25, -32, 0, -32); gx.fill();
    gx.fillStyle = bellyColor; gx.beginPath(); gx.moveTo(0, 42); gx.bezierCurveTo(35, 42, 38, 10, 25, -10); gx.bezierCurveTo(18, -25, 10, -25, 0, -18); gx.bezierCurveTo(-10, -25, -18, -25, -25, -10); gx.bezierCurveTo(-38, 10, -35, 42, 0, 42); gx.fill();
    gx.strokeStyle = bodyColor; gx.lineWidth = 14; gx.lineCap = 'round'; gx.beginPath(); gx.moveTo(-28, 5); gx.lineTo(-38, -10); gx.stroke(); gx.beginPath(); gx.moveTo(28, 5); gx.lineTo(38, -10); gx.stroke();
    gx.fillStyle = '#fff';[[-42, -12], [-38, -16], [-34, -12]].forEach(p => { gx.beginPath(); gx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); gx.fill(); });[[42, -12], [38, -16], [34, -12]].forEach(p => { gx.beginPath(); gx.arc(p[0], p[1], 2.5, 0, Math.PI * 2); gx.fill(); });
    gx.fillStyle = bellyColor; gx.beginPath(); gx.ellipse(-22, 35, 14, 12, -Math.PI / 6, 0, Math.PI * 2); gx.fill(); gx.strokeStyle = bodyColor; gx.lineWidth = 3; gx.stroke(); gx.beginPath(); gx.ellipse(22, 35, 14, 12, Math.PI / 6, 0, Math.PI * 2); gx.fill(); gx.stroke();
    gx.fillStyle = pawColor; gx.beginPath(); gx.ellipse(-22, 35, 6, 5, -Math.PI / 6, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.ellipse(22, 35, 6, 5, Math.PI / 6, 0, Math.PI * 2); gx.fill();
    gx.fillStyle = '#fff';[[-32, 28], [-26, 24], [-18, 25]].forEach(p => { gx.beginPath(); gx.moveTo(p[0], p[1]); gx.lineTo(p[0] + 2, p[1] - 5); gx.lineTo(p[0] + 4, p[1]); gx.fill(); });[[32, 28], [26, 24], [18, 25]].forEach(p => { gx.beginPath(); gx.moveTo(p[0], p[1]); gx.lineTo(p[0] - 2, p[1] - 5); gx.lineTo(p[0] - 4, p[1]); gx.fill(); });
    gx.fillStyle = '#ff8a8a'; gx.beginPath(); gx.ellipse(-16 + ex, -5, 6, 4.5, 0, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.ellipse(16 + ex, -5, 6, 4.5, 0, 0, Math.PI * 2); gx.fill();
    gx.strokeStyle = '#1e293b'; gx.lineWidth = 2.5;
    if (emotion === 'happy') { gx.beginPath(); gx.moveTo(-12 + ex, -10); gx.quadraticCurveTo(-8 + ex, -14, -4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -10); gx.quadraticCurveTo(8 + ex, -14, 4 + ex, -10); gx.stroke(); gx.fillStyle = '#ec4899'; gx.beginPath(); gx.arc(ex, -2, 6, 0, Math.PI); gx.fill(); gx.fillStyle = '#fff'; gx.beginPath(); gx.moveTo(-4 + ex, -2); gx.lineTo(-2 + ex, 2); gx.lineTo(0 + ex, -2); gx.fill(); gx.beginPath(); gx.moveTo(4 + ex, -2); gx.lineTo(2 + ex, 2); gx.lineTo(0 + ex, -2); gx.fill(); } else if (emotion === 'sad') { gx.beginPath(); gx.moveTo(-12 + ex, -12); gx.lineTo(-4 + ex, -9); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -12); gx.lineTo(4 + ex, -9); gx.stroke(); gx.fillStyle = '#38bdf8'; gx.beginPath(); gx.arc(15 + ex, -15, 3.5, 0, Math.PI * 2); gx.fill(); gx.beginPath(); gx.moveTo(15 + ex, -22); gx.lineTo(11.5 + ex, -15); gx.lineTo(18.5 + ex, -15); gx.fill(); gx.beginPath(); gx.arc(ex, 0, 3, Math.PI, 0); gx.stroke(); } else { gx.beginPath(); gx.moveTo(-12 + ex, -10); gx.lineTo(-4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(12 + ex, -10); gx.lineTo(4 + ex, -10); gx.stroke(); gx.beginPath(); gx.moveTo(-2 + ex, -4); gx.lineTo(2 + ex, -4); gx.stroke(); gx.fillStyle = '#fff'; gx.beginPath(); gx.moveTo(-2 + ex, -4); gx.lineTo(-1 + ex, -7); gx.lineTo(0 + ex, -4); gx.fill(); gx.beginPath(); gx.moveTo(2 + ex, -4); gx.lineTo(1 + ex, -7); gx.lineTo(0 + ex, -4); gx.fill(); if (!isWinAnimation) { gx.fillStyle = 'rgba(255,255,255,0.8)'; gx.font = "bold 16px Quicksand"; let zOff = Math.sin(Date.now() * 0.002) * 4; gx.fillText("z", -35, -35 + zOff); gx.font = "bold 22px Quicksand"; gx.fillText("Z", -45, -50 + zOff * 1.2); } }
    gx.restore();
}
function drawCatcher(bx, by) {
    if (isWinAnimation) return;
    catcherTrail.push({ x: bx, y: by, alpha: 0.8 }); if (catcherTrail.length > 8) catcherTrail.shift();
    for (let i = 0; i < catcherTrail.length - 1; i++) { const t = catcherTrail[i]; const a = t.alpha * (i / catcherTrail.length) * 0.4; gx.beginPath(); gx.arc(t.x, t.y, 8 * (i / catcherTrail.length), 0, Math.PI * 2); gx.fillStyle = `rgba(253, 230, 138, ${a})`; gx.fill(); }
    gx.save(); gx.translate(bx, by); gx.shadowBlur = 20; gx.shadowColor = '#fbbf24'; gx.fillStyle = 'rgba(255, 255, 255, 0.2)'; gx.strokeStyle = '#fef08a'; gx.lineWidth = 4;
    gx.beginPath(); gx.moveTo(-45, 0); gx.bezierCurveTo(-45, -25, -20, -35, 0, -15); gx.bezierCurveTo(20, -35, 45, -25, 45, 0); gx.bezierCurveTo(55, 25, 30, 35, 15, 25); gx.bezierCurveTo(0, 45, -15, 45, -15, 25); gx.bezierCurveTo(-30, 35, -55, 25, -45, 0); gx.fill(); gx.stroke(); gx.shadowBlur = 0;
    let grd = gx.createRadialGradient(0, 0, 5, 0, 0, 45); grd.addColorStop(0, 'rgba(253, 230, 138, 0.4)'); grd.addColorStop(1, 'rgba(245, 158, 11, 0.0)'); gx.fillStyle = grd; gx.fill();
    for (let i = 0; i < 6; i++) { let sx = (Math.random() - 0.5) * 70; let sy = (Math.random() - 0.5) * 40; gx.fillStyle = '#fff'; gx.beginPath(); gx.arc(sx, sy, Math.random() * 2 + 0.5, 0, Math.PI * 2); gx.fill(); } gx.restore();
}

// === HÀM XỬ LÝ LƯỢT RƠI CỦA SAO BĂNG ===
function drawShooters(netX, netY) {
    for (let i = shooters.length - 1; i >= 0; i--) {
        const s = shooters[i];
        if (s.isRainbow && !isHeartMode) s.hue = (gameT * 0.3) % 360;

        if (s.caught) {
            s.alpha -= 0.08; s.y -= 2; if (s.alpha <= 0) { shooters.splice(i, 1); continue; }
        } else if (s.missed) {
            s.alpha -= 0.05; if (s.alpha <= 0) { shooters.splice(i, 1); continue; }
        } else {
            s.tail.push({ x: s.x, y: s.y }); if (s.tail.length > 30) s.tail.shift();
            s.x += s.vx; s.y += s.vy; s.vy += 0.025;

            if (s.y > H + 20) {
                if (s.x > 0 && s.x < W && !s.missed) {
                    s.missed = true;
                    if (!isWinAnimation) {
                        missedSfx.currentTime = 0; missedSfx.play().catch(e => console.log(e)); chibiEmotion = 'sad'; emotionTimer = 40;
                        if (!infiniteLives) {
                            lives = Math.max(0, lives - 1); lvEl.textContent = lives;
                            if (lives <= 0 && !over) triggerLose();
                        }
                    }
                } else if (!s.missed) { shooters.splice(i, 1); continue; }
            } else if (s.x < -100 || s.x > W + 100) { shooters.splice(i, 1); continue; }

            const dist = Math.hypot(s.x - netX, s.y - netY);
            if (dist < 55 && !isWinAnimation) {
                s.caught = true; scoredSfx.currentTime = 0; scoredSfx.play().catch(e => console.log(e)); chibiEmotion = 'happy'; emotionTimer = 40;

                if (s.isRainbow) {
                    if (!infiniteLives) {
                        infiniteLives = true; lvEl.innerHTML = '<span style="color: #fde68a; font-size: 20px; text-shadow: 0 0 10px #fbbf24;">∞</span>';
                        floatingTexts.push({ x: chibiX, y: getGroundY(chibiX) - 68, text: "Đã tìm thấy Trăm! 💖", life: 1, alpha: 1 });
                    }
                    if (!infiniteTime) { infiniteTime = true; tvEl.innerHTML = '<span style="color: #fde68a; font-size: 20px; text-shadow: 0 0 10px #fbbf24;">∞</span>'; }
                }

                // CỘNG ĐIỂM VÀ CẬP NHẬT HUD
                score += 1; svEl.textContent = score;

                if (score >= MAX_SCORE) {
                    startWinAnimation(score);
                    return; // Dừng xử lý thêm sao băng
                }
                // THÊM LOGIC: KIỂM TRA MỐC ĐỂ CỘNG 30 GIÂY
                if ((score === 12 || score === 24 || score === 36) && !infiniteTime) {
                    exactTimeLeft += 10; // Cộng thẳng 30s
                    timeLeft = Math.ceil(exactTimeLeft);
                    tvEl.textContent = timeLeft;
                    // Hiện hiệu ứng chữ nổi
                    floatingTexts.push({ x: chibiX, y: getGroundY(chibiX) - 90, text: "Qua Mốc! +10s ⏳", life: 3, alpha: 1 });
                }

                let currentTarget = 12;
                if (score >= 36) currentTarget = '∞'; else if (score >= 24) currentTarget = 36; else if (score >= 12) currentTarget = 24;
                if (tgEl) tgEl.textContent = currentTarget;
                updateProgress();

                for (let p = 0; p < 20; p++) { particles.push({ x: s.x, y: s.y, vx: (Math.random() - 0.5) * 6, vy: (Math.random() - 0.5) * 6, alpha: 1, r: Math.random() * 3 + 1, hue: s.hue, life: 0 }); }
            }
        }
        if (s.tail.length > 1) {
            const tailGradient = gx.createLinearGradient(s.tail[0].x, s.tail[0].y, s.x, s.y); tailGradient.addColorStop(0, `hsla(${s.hue}, 100%, 80%, 0)`); tailGradient.addColorStop(1, `hsla(${s.hue}, 100%, 90%, ${s.alpha * 0.8})`);
            gx.beginPath(); gx.strokeStyle = tailGradient; gx.lineWidth = s.size * 1.5; gx.lineCap = 'round'; gx.moveTo(s.tail[0].x, s.tail[0].y);
            for (let t = 1; t < s.tail.length; t++) gx.lineTo(s.tail[t].x, s.tail[t].y); gx.stroke();
        }
        if (isHeartMode) drawHeart(gx, s.x, s.y, s.size * (s.caught ? 1.5 : 1), `hsl(330, 100%, 80%)`, s.alpha); else drawStar5(gx, s.x, s.y, s.size * (s.caught ? 1.8 : 1), `hsl(${s.hue}, 100%, 95%)`, s.alpha);
    }
}

function drawParticles() {
    if (isWinAnimation) return;
    for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]; p.x += p.vx; p.y += p.vy; p.vy += 0.05; p.life += 0.025; p.alpha = Math.max(0, 1 - p.life);
        if (p.alpha <= 0) { particles.splice(i, 1); continue; }
        gx.beginPath(); gx.arc(p.x, p.y, p.r * (1 - p.life), 0, Math.PI * 2);
        gx.fillStyle = `hsla(${p.hue}, 90%, 85%, ${p.alpha})`; gx.shadowBlur = 8; gx.shadowColor = `hsla(${p.hue}, 90%, 80%, ${p.alpha})`; gx.fill(); gx.shadowBlur = 0;
    }
}
function drawLantern(ctx, l) { ctx.save(); ctx.globalAlpha = l.alpha; let sway = Math.sin(winTime * 2 + l.offset) * 15 * (l.size / 6); let currentX = l.x + sway; ctx.shadowBlur = l.size * 3; ctx.shadowColor = '#f59e0b'; ctx.beginPath(); ctx.ellipse(currentX, l.y, l.size, l.size * 1.4, 0, 0, Math.PI * 2); let grad = ctx.createLinearGradient(currentX, l.y - l.size, currentX, l.y + l.size); grad.addColorStop(0, '#fde68a'); grad.addColorStop(0.6, '#ea580c'); grad.addColorStop(1, '#9a3412'); ctx.fillStyle = grad; ctx.fill(); ctx.beginPath(); ctx.arc(currentX, l.y + l.size * 0.5, l.size * 0.4, 0, Math.PI * 2); ctx.fillStyle = '#fff'; ctx.shadowBlur = l.size * 4; ctx.shadowColor = '#fff'; ctx.fill(); ctx.restore(); }
function drawBird(ctx, x, y, scale, phase, alpha) { ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale); ctx.rotate(-0.15); ctx.fillStyle = `rgba(10, 12, 25, ${alpha})`; let wing = Math.sin(phase) * 12; ctx.beginPath(); ctx.moveTo(0, 0); ctx.quadraticCurveTo(-12, -10 + wing, -22, -wing); ctx.quadraticCurveTo(-10, 2, 0, 5); ctx.quadraticCurveTo(10, 2, 22, -wing); ctx.quadraticCurveTo(12, -10 + wing, 0, 0); ctx.fill(); ctx.restore(); }

function drawWinAnimation(dt) {
    winTime += dt / 1000; fx.clearRect(0, 0, W, H);

    if (currentMilestone === 1) {
        if (winTime > 1.5 && !windPlay) { windSfx.play().catch(e => console.log(e)); windPlay = true; }
        if (winTime > 2.5) { birds.forEach(b => { b.x += b.speed; b.y -= b.speed * 0.15; b.phase += 0.08; drawBird(fx, b.x, b.y, b.scale, b.phase, Math.max(0, 1 - (Math.abs(b.x - W / 2) / (W * 0.8)))); }); }
        for (let i = 0; i < lanterns.length; i++) { let l = lanterns[i]; if (winTime > 1.5) { l.y += l.vy; if (l.alpha < 1) l.alpha += 0.01; } if (l.y < -50) { l.y = H + 50; l.x = Math.random() * W; } if (l.alpha > 0) drawLantern(fx, l); }

        if (winTime > 5.5 && ws.style.display !== 'flex') {
            document.getElementById('nb').style.display = 'none';
            ws.style.display = 'flex'; setTimeout(() => ws.style.opacity = '1', 50);

            document.getElementById('yb').textContent = 'Tiếp tục... ✨';
            document.getElementById('wt').textContent = 'Gửi bé Trăm... 🌠 ✨';
            document.getElementById('cm').innerHTML = "Hôm nay là ngày 06/06/2026.<br>Anh nghĩ đây là một ngày rất là đẹp.";
        }
    }
    else if (currentMilestone === 2) {
        let cx = W / 2, cy = H * 0.42; // Đẩy tim lên cao một chút để nhường chỗ cho text

        if (winTime > 0.5 && !windPlay) { windSfx.play().catch(e => console.log(e)); windPlay = true; }

        // 1. KHỞI TẠO TỌA ĐỘ TRÁI TIM (96 ĐIỂM) & HOA ĐÀO (VẬT LÝ 3D)
        if (!window.heart24) {
            window.heart24 = [];
            window.heartShockwaves = [];
            window.lastBeatTime = 0;
            window.cherryPetals = [];

            // Tăng lên 96 điểm để trái tim dày và khối 3D mượt mà hơn
            let totalPoints = 96;
            for (let i = 0; i < totalPoints; i++) {
                let t = (i * Math.PI * 2) / totalPoints;
                let hx = 16 * Math.pow(Math.sin(t), 3);
                let hy = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));

                window.heart24.push({
                    startX: cx + (Math.random() - 0.5) * W * 1.5,
                    startY: cy + (Math.random() - 0.5) * H * 1.5,
                    baseX: hx * 8.5,
                    baseY: hy * 8.5,
                    hue: 330 + Math.random() * 20,
                    isMain: i % 4 === 0 // Cứ 4 điểm thì có 1 điểm chính (96 / 4 = 24 ngôi sao lớn)
                });
            }

            // Tạo 50 cánh hoa đào với hệ trục Z ảo để lật 3D
            let petalCount = 85;
            for (let i = 0; i < petalCount; i++) {
                window.cherryPetals.push({
                    x: Math.random() * W,
                    y: Math.random() * H * 0.7, // Rải rác khắp 70% nửa trên màn hình
                    z: Math.random() * 1.5 + 0.5,
                    vx: (Math.random() - 0.5) * 0.5,
                    vy: Math.random() * 0.2 + 0.15, // Rơi RẤT chậm (trước đây là 0.4 - 0.9)
                    size: Math.random() * 3 + 2.5,
                    angle: Math.random() * Math.PI * 2,
                    spinSpeed: (Math.random() - 0.5) * 0.8,
                    flipSpeed: (Math.random() - 0.5) * 1.2,
                    flipOffset: Math.random() * Math.PI * 2,
                    opacity: Math.random(), // Khởi tạo với độ mờ ngẫu nhiên
                    fadeIn: true // Trạng thái đang hiện dần lên
                });
            }
        }

        let formProg = Math.min(1, (winTime - 0.5) / 2.5);
        let easeForm = 1 - Math.pow(1 - formProg, 3);

        let heartBeat = 0;
        if (formProg >= 1) {
            let tCycle = (winTime - 3) * 1.2;
            let cyclePos = tCycle % 1.0;
            let lub = Math.exp(-40 * Math.pow(cyclePos - 0.1, 2));
            let dub = Math.exp(-50 * Math.pow(cyclePos - 0.4, 2));
            heartBeat = Math.max(lub, dub * 0.6);
        }

        fx.save();
        fx.globalCompositeOperation = 'lighter';

        // 2. VẼ TRÁI TIM 3D SIÊU DÀY
        let layers = (formProg >= 1) ? 4 : 1;

        for (let l = layers - 1; l >= 0; l--) {
            let zDepth = l / 3;
            let layerScale = 1 - zDepth * 0.25;
            let dynamicScale = (formProg < 1) ? 1 : layerScale + (0.35 * heartBeat * (1 - zDepth));
            let layerAlpha = (formProg < 1) ? easeForm : (1 - zDepth * 0.7);

            let tiltX = (formProg >= 1) ? Math.sin(winTime * 1.5) * 20 * zDepth : 0;
            let tiltY = (formProg >= 1) ? Math.cos(winTime * 2.0) * 10 * zDepth : 0;

            // Dây nối lưới giữa 96 điểm
            fx.beginPath();
            window.heart24.forEach((s, i) => {
                let sx, sy;
                if (formProg < 1) {
                    sx = s.startX + ((cx + s.baseX) - s.startX) * easeForm;
                    sy = s.startY + ((cy + s.baseY) - s.startY) * easeForm;
                } else {
                    sx = cx + s.baseX * dynamicScale + tiltX;
                    sy = cy + s.baseY * dynamicScale + tiltY;
                }
                if (i === 0) fx.moveTo(sx, sy); else fx.lineTo(sx, sy);
            });
            fx.closePath();

            fx.strokeStyle = `rgba(255, 105, 180, ${layerAlpha * 0.4})`;
            fx.lineWidth = 1.5 + (1 - zDepth);
            fx.stroke();

            // Vẽ các điểm (Chỉ vẽ 2 lớp ngoài để máy không bị giật lag)
            if (l <= 1) {
                window.heart24.forEach((s, idx) => {
                    let sx, sy;
                    if (formProg < 1) {
                        sx = s.startX + ((cx + s.baseX) - s.startX) * easeForm;
                        sy = s.startY + ((cy + s.baseY) - s.startY) * easeForm;
                    } else {
                        sx = cx + s.baseX * dynamicScale + tiltX;
                        sy = cy + s.baseY * dynamicScale + tiltY;
                    }

                    let twinkle = 0.5 + 0.5 * Math.sin(winTime * 10 + idx);
                    // Ngôi sao chính (24 sao) sẽ to, các sao phụ sẽ nhỏ li ti
                    let baseSize = s.isMain ? 3.5 : 1.2;
                    let size = (baseSize + twinkle * 1.5) * dynamicScale * (1 - zDepth);

                    fx.beginPath();
                    fx.arc(sx, sy, size, 0, Math.PI * 2);
                    let alpha = s.isMain ? layerAlpha : layerAlpha * 0.6;
                    fx.fillStyle = `hsla(${s.hue}, 100%, ${s.isMain ? '85%' : '75%'}, ${alpha})`;

                    if (s.isMain) {
                        fx.shadowBlur = 15;
                        fx.shadowColor = `hsla(${s.hue}, 100%, 60%, ${layerAlpha})`;
                    } else {
                        fx.shadowBlur = 0;
                    }
                    fx.fill();
                });
            }
        }

        // Sóng xung kích
        if (formProg >= 1) {
            if (heartBeat > 0.8 && winTime - window.lastBeatTime > 0.2) {
                window.heartShockwaves.push({ scale: 1, alpha: 0.7 });
                window.lastBeatTime = winTime;
            }

            for (let i = window.heartShockwaves.length - 1; i >= 0; i--) {
                let sw = window.heartShockwaves[i];
                sw.scale += 0.05;
                sw.alpha -= 0.03;

                if (sw.alpha <= 0) { window.heartShockwaves.splice(i, 1); continue; }

                fx.beginPath();
                window.heart24.forEach((s, idx) => {
                    let sx = cx + s.baseX * sw.scale;
                    let sy = cy + s.baseY * sw.scale;
                    if (idx === 0) fx.moveTo(sx, sy); else fx.lineTo(sx, sy);
                });
                fx.closePath();
                fx.strokeStyle = `rgba(255, 182, 193, ${sw.alpha * 0.4})`;
                fx.lineWidth = 1;
                fx.stroke();
            }

            let glowScale = 1 + heartBeat * 0.3;
            let glowGrad = fx.createRadialGradient(cx, cy, 0, cx, cy, 180 * glowScale);
            glowGrad.addColorStop(0, `rgba(255, 105, 180, ${0.15 + 0.15 * heartBeat})`);
            glowGrad.addColorStop(1, `rgba(255, 105, 180, 0)`);
            fx.fillStyle = glowGrad;
            fx.beginPath();
            fx.arc(cx, cy, 180 * glowScale, 0, Math.PI * 2);
            fx.fill();
        }
        fx.restore(); // Tắt composite lighter trước khi vẽ hoa đào

        // 3. HIỆU ỨNG HOA ĐÀO RƠI CHÂN THỰC HƠN
        if (winTime > 1.0) {
            let petalAlpha = Math.min(1, winTime - 1.0);

            const drawRealPetal = (ctx, size) => {
                ctx.beginPath();
                ctx.moveTo(0, size);
                ctx.bezierCurveTo(size * 1.2, size * 0.3, size * 1.2, -size * 0.8, 0, -size * 0.6);
                ctx.bezierCurveTo(-size * 1.2, -size * 0.8, -size * 1.2, size * 0.3, 0, size);
                ctx.fill();
            };

            window.cherryPetals.forEach(p => {
                // Tọa độ thay đổi kết hợp 2 lớp sóng (Sin + Cos) để đường đi nhiễu loạn, ngẫu nhiên hơn
                p.x += (p.vx + Math.sin(winTime * 0.8 + p.y * 0.02) * 0.3 + Math.cos(winTime * 0.5 + p.x * 0.01) * 0.2) * p.z;
                p.y += p.vy * p.z;
                p.angle += p.spinSpeed * 0.02;

                // --- LOGIC FADE IN / FADE OUT ---
                if (p.fadeIn) {
                    p.opacity += 0.01; // Hiện dần lên
                    if (p.opacity >= 1) p.fadeIn = false;
                } else {
                    // Trôi qua 75% màn hình thì bắt đầu tan biến
                    if (p.y > H * 0.75) p.opacity -= 0.008;
                }

                // Nếu cánh hoa tan biến hoàn toàn hoặc rớt khỏi màn hình -> Tái tạo ở giữa không trung
                if (p.opacity <= 0 || p.y > H + 10) {
                    p.y = Math.random() * (H * 0.6); // Mọc lại ngẫu nhiên ở nửa trên/giữa màn hình
                    p.x = Math.random() * W;
                    p.opacity = 0; // Bắt đầu từ vô hình
                    p.fadeIn = true;
                    p.vx = (Math.random() - 0.5) * 0.5;
                    p.vy = Math.random() * 0.2 + 0.15;
                }

                let flip = Math.sin(winTime * p.flipSpeed + p.flipOffset);

                fx.save();
                fx.translate(p.x, p.y);
                fx.rotate(p.angle);
                fx.scale(p.z * 0.8, p.z * 0.8 * flip);

                // Kết hợp Fade cục bộ của cánh hoa và Fade tổng của animation
                fx.globalAlpha = Math.max(0, p.opacity * petalAlpha * 0.85);

                fx.fillStyle = flip > 0 ? '#fbcfe8' : '#f472b6';

                if (flip > 0) {
                    fx.shadowBlur = 5;
                    fx.shadowColor = 'rgba(255, 105, 180, 0.3)';
                }

                drawRealPetal(fx, p.size);
                fx.restore();
            });
        }

        // 4. HIỆN TEXT CẢM XÚC
        if (winTime > 4.0) {
            fx.save();
            fx.textAlign = 'center';
            fx.font = "600 16px Quicksand"; // Giảm size chữ một chút để không bị tràn viền điện thoại
            fx.shadowBlur = 12;
            fx.shadowColor = "#ff69b4";

            // Chia kịch bản của bạn thành các cặp câu (Dòng 1 và Dòng 2)
            const dialogues = [
                { l1: "Bé Trăm của anh giỏi quáaa!", l2: "Bé gom được 24 ngôi sao lun rùi nè :3" },
                { l1: "Cơ mà :3 Bé có biết...", l2: "Vì sao anh chọn con số 24 này hong?" },
                { l1: "Vì nó tượng trưng cho 24 giờ trong một ngày...", l2: "nó làm anh nhớ tới những hôm tụi mình được gặp nhau cả ngày." },
                { l1: "Hong hiểu sao những ngày dài bên cạnh bé", l2: "anh luôn thấy thời gian trôi qua thiệt nhanh." },
                { l1: "Cứ như là anh mới gặp em được vài phút,", l2: "thì lại đến lúc phải chào tạm biệt..." },
                { l1: "Ngôi sao thứ 24 này", l2: "anh muốn dành để lưu giữ ngày \"hôm nay\"." },
                { l1: "Ngày mà..", l2: "Những điều bình thường nhất bỗng hóa thành kỷ niệm." },
                { l1: "Anh cảm ơn bé!", l2: "Vì đã cho anh thêm biết bao ngày như vậy." },
                { l1: "Mong rằng từ nay về sau tụi mình sẽ cùng nhau", l2: "tạo nên thật nhiều '24 giờ' tuyệt đẹp như thế nữa. ✨" }
            ];

            let timePassed = winTime - 4.0;
            let slideDuration = 6.0; // Mỗi cặp câu sẽ chiếu trong 6 giây
            let currentIndex = Math.floor(timePassed / slideDuration);

            if (currentIndex < dialogues.length) {
                let localTime = timePassed % slideDuration;
                let isLastSlide = (currentIndex === dialogues.length - 1);

                // Xử lý Alpha (độ mờ) cho Dòng 1: Hiện ngay lúc bắt đầu slide
                let alpha1 = Math.min(1, localTime);
                if (!isLastSlide && localTime > slideDuration - 1) {
                    alpha1 = slideDuration - localTime; // Mờ dần trong 1 giây cuối của slide
                }

                // Xử lý Alpha cho Dòng 2: Hiện trễ hơn dòng 1 khoảng 1.5 giây
                let alpha2 = 0;
                if (localTime > 1.5) {
                    alpha2 = Math.min(1, localTime - 1.5);
                }
                if (!isLastSlide && localTime > slideDuration - 1) {
                    alpha2 = slideDuration - localTime; // Cùng mờ đi với dòng 1
                }

                let text = dialogues[currentIndex];

                // Vẽ dòng 1
                if (alpha1 > 0) {
                    fx.globalAlpha = alpha1;
                    fx.fillStyle = "#ffb7c5"; // Hồng nhạt
                    fx.fillText(text.l1, cx, H * 0.78);
                }

                // Vẽ dòng 2
                if (alpha2 > 0) {
                    fx.globalAlpha = Math.max(0, alpha2);
                    fx.fillStyle = "#fff"; // Trắng sáng nổi bật cho vế sau
                    fx.fillText(text.l2, cx, H * 0.78 + 26);
                }
            } else {
                // Giữ lại câu cuối cùng mãi mãi (End Game)
                fx.globalAlpha = 1;
                fx.fillStyle = "#ffb7c5";
                fx.fillText(dialogues[dialogues.length - 1].l1, cx, H * 0.78);
                fx.fillStyle = "#fff";
                fx.fillText(dialogues[dialogues.length - 1].l2, cx, H * 0.78 + 26);
            }
            fx.restore();
        }
    }
    else if (currentMilestone === 3) {
        if (winTime > 0.5 && !windPlay) { wooshSfx.play().catch(e => console.log(e)); windPlay = true; }
        const formProgress = Math.min(1, winTime / 3.2);
        const beat = formProgress >= 1 ? 1 + 0.12 * Math.sin(winTime * 2.6) : 1;

        // Vầng sáng ấm dần lớn phía sau trái tim khi đã ghép xong
        if (formProgress >= 1) {
            const glowA = 0.25 + 0.15 * Math.sin(winTime * 2.6);
            const glowR = 120 * beat;
            const grad = fx.createRadialGradient(heartCenter.x, heartCenter.y, 0, heartCenter.x, heartCenter.y, glowR);
            grad.addColorStop(0, `rgba(253, 230, 138, ${glowA})`); grad.addColorStop(1, 'rgba(253, 230, 138, 0)');
            fx.fillStyle = grad; fx.beginPath(); fx.arc(heartCenter.x, heartCenter.y, glowR, 0, Math.PI * 2); fx.fill();
        }

        fx.strokeStyle = `rgba(253, 230, 138, ${Math.min(1, winTime * 0.3)})`; fx.lineWidth = 2; fx.beginPath();
        constellationStars.forEach((s, idx) => {
            s.x += (s.tx - s.x) * 0.04; s.y += (s.ty - s.y) * 0.04;
            if (s.alpha < 1) s.alpha += 0.015;
            drawStar5(fx, s.x, s.y, 4.5 * beat, '#fff', s.alpha, 15 * beat);
            if (idx === 0) fx.moveTo(s.x, s.y); else fx.lineTo(s.x, s.y);
        });
        fx.closePath(); fx.stroke();

        // Tia sáng nhỏ chạy dọc theo đường viền trái tim như một nhịp tim đang sống
        if (formProgress >= 1) {
            const travelIdx = Math.floor((winTime * 10) % constellationStars.length);
            const ts = constellationStars[travelIdx];
            if (ts) { fx.save(); fx.beginPath(); fx.arc(ts.x, ts.y, 5.5, 0, Math.PI * 2); fx.fillStyle = '#fff'; fx.shadowBlur = 25; fx.shadowColor = '#fde68a'; fx.fill(); fx.restore(); }
        }

        if (winTime > 4.2) {
            const capA = Math.min(1, (winTime - 4.2) * 1.3);
            fx.save(); fx.globalAlpha = capA; fx.textAlign = 'center'; fx.font = "600 16px Quicksand"; fx.fillStyle = "#fde68a"; fx.shadowBlur = 15; fx.shadowColor = "#f59e0b";
            fx.fillText("36 ngôi sao, một chòm sao mang tên tụi mình", W / 2, H * 0.78); fx.restore();
        }
    }
}