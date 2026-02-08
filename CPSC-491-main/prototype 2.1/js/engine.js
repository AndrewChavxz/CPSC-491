window.App = window.App || {};

(function () {
  // -------------------- Isometric engine --------------------
  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  const tileW = 100, tileH = 50, blockH = 30; // Zoomed in
  const gridCols = 100, gridRows = 100;

  // Multi-character support
  const characters = [];
  let activeCharId = null;

  function createCharacter(id, x, y, color) {
    const char = {
      id,
      x, y,
      color,
      speed: 4.8,
      workspaceXML: null,
      moveQueue: [],
      currentMove: null
    };
    characters.push(char);
    if (!activeCharId) activeCharId = id;
    return char;
  }

  function deleteCharacter(id) {
    const idx = characters.findIndex(c => c.id === id);
    if (idx !== -1) {
      characters.splice(idx, 1);
      if (activeCharId === id) {
        activeCharId = characters.length > 0 ? characters[0].id : null;
      }
      saveToStorage();
    }
  }

  // Create initial character ONLY if not loading from storage
  // (Removed unconditional createCharacter call)

  // -------------------- Persistence --------------------
  const STORAGE_KEY = "isogrid_save_v1";

  function saveToStorage() {
    try {
      console.log("Saving to storage:", characters.length, "characters");
      const data = {
        characters: characters.map(c => ({
          id: c.id,
          x: c.x, y: c.y,
          color: c.color,
          workspaceXML: c.workspaceXML
        })),
        activeCharId
      };
      localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch (e) {
      console.error("Save failed:", e);
    }
  }

  function loadFromStorage() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      console.log("Loading from storage, raw:", raw);
      if (!raw) return false;
      const data = JSON.parse(raw);
      if (!Array.isArray(data.characters)) return false;

      // Restore characters
      characters.length = 0; // clear existing
      data.characters.forEach(c => {
        const char = {
          id: c.id,
          x: c.x, y: c.y,
          color: c.color,
          speed: 4.8,
          workspaceXML: c.workspaceXML || null,
          moveQueue: [],
          currentMove: null
        };
        characters.push(char);
      });

      activeCharId = data.activeCharId;
      console.log("Loaded characters:", characters);
      // Validate active ID
      if (!characters.some(c => c.id === activeCharId)) {
        console.warn("Active char ID not found, resetting default.");
        activeCharId = characters.length ? characters[0].id : null;
      }
      return true;

    } catch (e) {
      console.error("Failed to load save", e);
      return false;
    }
  }

  // Load or create default
  if (!loadFromStorage()) {
    console.log("No save found, creating default.");
    createCharacter("char_1", 50, 50, "#ffd36e");
    saveToStorage();
  }

  const worldObjects = new Map();
  let panOffset = { x: 0, y: 0 }; // Screen space offset
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };

  // Input handling for panning
  canvas.addEventListener("mousedown", e => {
    isPanning = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  });
  window.addEventListener("mouseup", () => isPanning = false);
  canvas.addEventListener("mousemove", e => {
    if (!isPanning) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    panOffset.x += dx;
    panOffset.y += dy;
    lastMouse = { x: e.clientX, y: e.clientY };
  });

  function generateWorld() {
    for (let i = 0; i < gridCols; i++) {
      for (let j = 0; j < gridRows; j++) {
        // Safe zone around spawn
        if (Math.abs(i - 50) < 4 && Math.abs(j - 50) < 4) continue;

        if (Math.random() < 0.05) { // Reduced density
          const type = Math.random() < 0.6 ? 'tree' : 'rock';
          worldObjects.set(`${i},${j}`, type);
        }
      }
    }
  }
  generateWorld();

  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function isoToScreen(i, j) {
    const centerX = canvas.width / (2 * (window.devicePixelRatio || 1));
    const centerY = canvas.height / (2 * (window.devicePixelRatio || 1));

    // Camera follow ACTIVE character
    const activeChar = characters.find(c => c.id === activeCharId) || characters[0];
    const px = activeChar ? activeChar.x : 50;
    const py = activeChar ? activeChar.y : 50;

    const dx = i - px;
    const dy = j - py;

    return {
      x: centerX + (dx - dy) * (tileW / 2) + panOffset.x,
      y: centerY + (dx + dy) * (tileH / 2) + panOffset.y
    };
  }

  function isWalkable(x, y) {
    // Bounds check
    if (x < 0 || x >= gridCols || y < 0 || y >= gridRows) return false;

    // Object check
    const i = Math.round(x);
    const j = Math.round(y);
    if (worldObjects.has(`${i},${j}`)) return false;

    return true;
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
    // Culling check (rough) - avoid drawing if way off screen
    // actually handled by loop bounds, but safe to keep

    const top = [
      { x: p.x, y: p.y - tileH / 2 },
      { x: p.x + tileW / 2, y: p.y },
      { x: p.x, y: p.y + tileH / 2 },
      { x: p.x - tileW / 2, y: p.y }
    ];
    const down = top.map(pt => ({ x: pt.x, y: pt.y + blockH }));

    // Draw sides
    drawPoly([top[3], top[2], down[2], down[3]], leftColor, edgeColor);
    drawPoly([top[1], top[2], down[2], down[1]], rightColor, edgeColor);
    drawPoly(top, topColor, edgeColor);

    // Highlight
    ctx.strokeStyle = "rgba(0,0,0,0.08)";
    ctx.beginPath();
    ctx.moveTo(top[0].x, top[0].y);
    ctx.lineTo(top[2].x, top[2].y);
    ctx.stroke();
  }

  function drawTree(i, j) {
    const p = isoToScreen(i, j);
    const base = { x: p.x, y: p.y };

    // Trunk
    ctx.fillStyle = "#8B4513";
    ctx.fillRect(base.x - 4, base.y - 10 - blockH, 8, 20);

    // Leaves (Cone approximation)
    ctx.fillStyle = "#228B22";
    ctx.beginPath();
    ctx.moveTo(base.x - 15, base.y - 10 - blockH);
    ctx.lineTo(base.x + 15, base.y - 10 - blockH);
    ctx.lineTo(base.x, base.y - 60 - blockH);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  function drawRock(i, j) {
    const p = isoToScreen(i, j);
    ctx.fillStyle = "#808080";
    ctx.beginPath();
    ctx.arc(p.x, p.y - 5 - blockH, 8, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#555";
    ctx.stroke();
  }

  function clampPlayer(char) {
    char.x = Math.max(0, Math.min(gridCols - 1, char.x));
    char.y = Math.max(0, Math.min(gridRows - 1, char.y));
  }

  function drawCharacter(char) {
    const p = isoToScreen(char.x, char.y);
    const baseY = p.y - blockH - 8;

    // shadow
    ctx.beginPath();
    ctx.ellipse(p.x, p.y - blockH + 4, 10, 5, 0, 0, Math.PI * 2);
    ctx.fillStyle = "rgba(0,0,0,0.25)";
    ctx.fill();

    // body
    App.roundRectPath(ctx, p.x - 8, baseY - 18, 16, 18, 6);
    ctx.fillStyle = char.color;
    ctx.fill();
    // Highlight if active
    if (char.id === activeCharId) {
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.lineWidth = 1;
    } else {
      ctx.strokeStyle = "rgba(0,0,0,0.25)";
      ctx.stroke();
    }

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

    // ID Label
    ctx.fillStyle = "#fff";
    ctx.font = "10px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(char.id, p.x, baseY - 40);
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
    // Viewport culling
    // We only draw tiles close to the player
    const activeChar = characters.find(c => c.id === activeCharId) || characters[0];
    const viewRadius = 18; // covers screen
    const px = activeChar ? activeChar.x : 50;
    const py = activeChar ? activeChar.y : 50;

    const minI = Math.floor(px - viewRadius);
    const maxI = Math.ceil(px + viewRadius);
    const minJ = Math.floor(py - viewRadius);
    const maxJ = Math.ceil(py + viewRadius);

    // Sort logic: iterate by sum of coords (isometric depth)
    const minSum = minI + minJ;
    const maxSum = maxI + maxJ;

    // We need to draw all characters, not just one "player"
    // The loop handles drawing them when (i,j) matches char(x,y)

    for (let sum = minSum; sum <= maxSum; sum++) {
      for (let i = minI; i <= maxI; i++) {
        const j = sum - i;
        if (j < minJ || j > maxJ) continue;

        // Bounds check
        if (i < 0 || i >= gridCols || j < 0 || j >= gridRows) continue;

        drawBlockTile(i, j);

        const key = `${i},${j}`;
        if (worldObjects.has(key)) {
          const type = worldObjects.get(key);
          if (type === 'tree') drawTree(i, j);
          else if (type === 'rock') drawRock(i, j);
        }

        // Draw characters if this is their tile
        characters.forEach(char => {
          if (Math.round(char.x) === i && Math.round(char.y) === j) {
            drawCharacter(char);
          }
        });
      }
    }
  }

  function render() {
    clearScene();
    drawGrid();
    // drawCharacter() call moved into grid loop for depth
  }

  function getActiveCharacter() {
    return characters.find(c => c.id === activeCharId);
  }

  function setActiveCharacter(id) {
    if (characters.some(c => c.id === id)) {
      activeCharId = id;
    }
  }

  // expose to App
  App.Engine = {
    canvas,
    ctx,
    characters, // Exposed array
    createCharacter,
    deleteCharacter, // Exposed
    getActiveCharacter,
    setActiveCharacter,
    gridCols,
    gridRows,
    resizeCanvas,
    clampPlayer,
    render,
    saveToStorage, // Exposed
    isWalkable // Exposed for collision check
  };

  window.addEventListener("resize", resizeCanvas);

  // initial sizing
  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(canvas);
  resizeCanvas();
})();
