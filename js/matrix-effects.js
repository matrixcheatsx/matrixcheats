/**
 * MATRIX & SPLASH EFFECTS
 * Bu dosya sitenin görsel atmosferini yönetir.
 */

export function startSplash() {
  const sc = document.getElementById("splashCanvas");
  if (!sc) return;
  const sx = sc.getContext("2d");
  sc.width = window.innerWidth;
  sc.height = window.innerHeight;

  const ch = "01";
  const scols = Math.floor(sc.width / 18);
  const sd = Array.from({ length: scols }, () => Math.random() * -80);

  const si = setInterval(() => {
    sx.fillStyle = "rgba(0,0,0,0.06)";
    sx.fillRect(0, 0, sc.width, sc.height);
    for (let i = 0; i < scols; i++) {
      const c = ch[Math.floor(Math.random() * ch.length)];
      const y = sd[i] * 18;
      const r = Math.random();

      if (r > 0.93) { sx.fillStyle = "#ff7070"; sx.shadowColor = "#f00"; sx.shadowBlur = 10; }
      else if (r > 0.6) { sx.fillStyle = "#bb0000"; sx.shadowBlur = 0; }
      else { sx.fillStyle = "#3a0000"; sx.shadowBlur = 0; }

      sx.font = "15px 'Courier New',monospace";
      sx.fillText(c, i * 18, y);
      sx.shadowBlur = 0;
      if (y > sc.height && Math.random() > 0.975) sd[i] = 0;
      sd[i]++;
    }
  }, 40);

  setTimeout(() => {
    const splash = document.getElementById("splash");
    if (splash) {
      splash.classList.add("hide");
      clearInterval(si);
      setTimeout(() => splash.remove(), 900);
    }
  }, 2500);
}

export function startMatrixBackground() {
  const cv = document.getElementById("mc");
  if (!cv) return;
  const ctx = cv.getContext("2d");
  const dg = "0123456789";
  let cols, drops;

  function resize() {
    cv.width = window.innerWidth;
    cv.height = window.innerHeight;
    cols = Math.floor(cv.width / 18);
    drops = Array.from({ length: cols }, () => Math.random() * -60);
  }

  resize();
  window.addEventListener("resize", resize);

  setInterval(() => {
    ctx.fillStyle = "rgba(4,8,4,0.055)";
    ctx.fillRect(0, 0, cv.width, cv.height);
    for (let i = 0; i < cols; i++) {
      const c = dg[Math.floor(Math.random() * dg.length)];
      const y = drops[i] * 18;
      const r = Math.random();

      if (r > 0.95) { ctx.fillStyle = "#ff7070"; ctx.shadowColor = "#f00"; ctx.shadowBlur = 10; }
      else if (r > 0.65) { ctx.fillStyle = "#bb0000"; ctx.shadowBlur = 0; }
      else { ctx.fillStyle = "#4a0000"; ctx.shadowBlur = 0; }

      ctx.font = "15px 'Courier New',monospace";
      ctx.fillText(c, i * 18, y);
      ctx.shadowBlur = 0;
      if (y > cv.height && Math.random() > 0.975) drops[i] = 0;
      drops[i]++;
    }
  }, 45);
}

// Global olarak başlatılmasını sağlıyoruz (opsiyonel, app.js de çağırabilir)
window.initVisuals = () => {
    startSplash();
    startMatrixBackground();
};