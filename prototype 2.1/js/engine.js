window.App = window.App || {};

(function () {
  // -------------------- Isometric engine --------------------
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const tileW = 64, tileH = 32, blockH = 18;
  const gridCols = 12, gridRows = 12;

  const player = { x: 5, y: 5, speed: 4.8, color: "#ffd36e" };

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function gridOrigin() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    return { x: w / 2, y: h / 2 - 120 };
  }

  function isoToScreen(i, j) {
    const o = gridOrigin();
    return { x: (i - j) * (tileW / 2) + o.x, y: (i + j) * (tileH / 2) + o.y };
  }

  function drawPoly(points, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(points[0].x, points[0].y);
    for (let k = 1; k < points.length; k++) ctx.lineTo(points[k].x, points[k].y);
    ctx.closePath();
    if (fill) { ctx.fillStyle = fill; ctx.fill(); }
    if (stroke) { ctx.strokeStyle = stroke; ctx.stroke(); }
  }

  const topColor = "#a6d35c";
  const leftColor = App.shade(topColor, -0.18);
  const rightColor = App.shade(topColor, -0.28);
  const edgeColor = "rgba(20,40,12,0.45)";

  function drawBlockTile(i, j) {
    const p = isoToScreen(i, j);
    const top = [
      { x: p.x, y: p.y - tileH / 2 },
      { x: p.x + tileW / 2, y: p.y },
      { x: p.x, y: p.y + tileH / 2 },
      { x: p.x - tileW / 2, y: p.y }
    ];
    const down = top.map(pt => ({ x: pt.x, y: pt.y + blockH }));
    const rightFace = [top[1], top[2], down[2], down[1]];
    const leftFace = [top[3], top[2], down[2], down[3]];

    drawPoly(leftFace, leftColor, edgeColor);
    drawPoly(rightFace, rightColor, edgeColor);
    drawPoly(top, topColor, edgeColor);

    ctx.strokeStyle = "rgba(0,0,0,0.12)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    ctx.lineTo(top[1].x, top[1].y);
    ctx.lineTo(top[2].x, top[2].y);
    ctx.lineTo(top[3].x, top[3].y);
    ctx.closePath();
    ctx.stroke();
  }

  function clampPlayer() {
    player.x = Math.max(0, Math.min(gridCols - 1, player.x));
    player.y = Math.max(0, Math.min(gridRows - 1, player.y));
  }

  function drawPlayer() {
    const p = isoToScreen(player.x, player.y);
    const baseY = p.y - blockH - 8;

    // shadow
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - blockH + 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();

    // body
    App.roundRectPath(ctx, p.x - 8, baseY - 18, 16, 18, 6);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();

    // head
    ctx.beginPath();
    ctx.arc(p.x, baseY - 26, 7, 0, Math.PI * 2);
    ctx.fillStyle = "#fff2c8";
    ctx.fill();
    ctx.strokeStyle = "rgba(0,0,0,0.25)";
    ctx.stroke();

    // eyes
    ctx.fillStyle = "rgba(0,0,0,0.6)";
    ctx.beginPath();
    ctx.arc(p.x - 2.5, baseY - 26, 1, 0, Math.PI * 2);
    ctx.arc(p.x + 2.5, baseY - 26, 1, 0, Math.PI * 2);
    ctx.fill();
  }

  function clearScene() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    const g = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h));
    g.addColorStop(0, "rgba(255,255,255,0.02)");
    g.addColorStop(1, "rgba(0,0,0,0.30)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  function drawGrid() {
    for (let sum = 0; sum <= (gridCols - 1) + (gridRows - 1); sum++) {
      for (let i = 0; i < gridCols; i++) {
        const j = sum - i;
        if (j < 0 || j >= gridRows) continue;
        drawBlockTile(i, j);
      }
    }
  }

  function render() {
    clearScene();
    drawGrid();
    drawPlayer();
  }

  // expose to App
  App.Engine = {
    canvas,
    ctx,
    player,
    gridCols,
    gridRows,
    resizeCanvas,
    clampPlayer,
    render,
  };

  window.addEventListener("resize", resizeCanvas);

  // initial sizing
  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(canvas);
  resizeCanvas();
})();
