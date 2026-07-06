window.addEventListener('keydown', (e) => {
    if (isWinAnimation) return;
    secretCode += e.key.toLowerCase();
    if (secretCode.length > 4) secretCode = secretCode.slice(-4);

    // NẾU GÕ T-R-A-M
    if (secretCode === 'tram' && !isHeartMode) {
        isHeartMode = true;
        wooshSfx.currentTime = 0;
        wooshSfx.play().catch(e => console.log(e));

        score = 24;
        svEl.textContent = score;
        updateProgress();

        shooters.forEach(s => { s.hue = 330; });
        startWinAnimation(score);
    }
});