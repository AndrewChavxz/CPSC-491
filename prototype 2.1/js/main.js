window.App = window.App || {};

(function () {
  const { player, clampPlayer, gridCols, gridRows } = App.Engine;
  const { keys } = App.Input;
  const { workspace } = App.BlocklyStuff;
  const { codeBox, setStatus } = App.UI;

  // -------------------- Script movement queue (Blockly) --------------------
  let runningScript = false;
  let moveQueue = [];
  let currentMove = null;
  const stepTime = 0.22;

  function enqueueMove(dx, dy) { moveQueue.push({ dx, dy }); }

  const GameAPI = {
    moveUp: () => enqueueMove(0, -1),
    moveDown: () => enqueueMove(0, 1),
    moveLeft: () => enqueueMove(-1, 0),
    moveRight: () => enqueueMove(1, 0),
    resetQueue: () => { moveQueue = []; currentMove = null; }
  };

  function beginNextMove() {
    if (moveQueue.length === 0) { currentMove = null; return; }
    const m = moveQueue.shift();
    currentMove = {
      t: 0,
      startX: player.x, startY: player.y,
      targetX: Math.max(0, Math.min(gridCols - 1, player.x + m.dx)),
      targetY: Math.max(0, Math.min(gridRows - 1, player.y + m.dy))
    };
  }

  function update(dt) {
    if (runningScript) {
      if (!currentMove) beginNextMove();
      if (currentMove) {
        currentMove.t += dt / stepTime;
        const t = Math.min(1, currentMove.t);
        const s = t * t * (3 - 2 * t); // smoothstep
        player.x = currentMove.startX + (currentMove.targetX - currentMove.startX) * s;
        player.y = currentMove.startY + (currentMove.targetY - currentMove.startY) * s;

        if (t >= 1) {
          player.x = currentMove.targetX;
          player.y = currentMove.targetY;
          currentMove = null;

          if (moveQueue.length === 0) {
            runningScript = false;
            setStatus("Done.");
          }
        }
      }
      return;
    }

    // manual movement
    let vx = 0, vy = 0;
    if (keys.has("w")) vy -= 1;
    if (keys.has("s")) vy += 1;
    if (keys.has("a")) vx -= 1;
    if (keys.has("d")) vx += 1;

    if (vx !== 0 || vy !== 0) {
      const run = keys.has("shift") ? 1.75 : 1.0;
      const len = Math.hypot(vx, vy);
      vx /= len; vy /= len;
      player.x += vx * player.speed * run * dt;
      player.y += vy * player.speed * run * dt;
      clampPlayer();
    }
  }

  // -------------------- Loop --------------------
  let last = performance.now();
  function loop(now) {
    const dt = Math.min(0.033, (now - last) / 1000);
    last = now;

    update(dt);
    App.Engine.render();

    requestAnimationFrame(loop);
  }

  // -------------------- Buttons --------------------
  function stopRunning() {
    runningScript = false;
    GameAPI.resetQueue();
    setStatus("Stopped.");
  }

  function resetPlayer() {
    stopRunning();
    player.x = 5; player.y = 5;
    setStatus("Reset.");
  }

  function generateAndRun() {
    try {
      const topBlocks = workspace.getTopBlocks(true);
      const hasStart = topBlocks.some(b => b.type === "on_start");
      if (!hasStart) {
        setStatus("Add an 'on start' block.");
        return;
      }

      GameAPI.resetQueue();
      runningScript = false;

      // FIX: Use the generator from App.BlocklyStuff (defined in setup)
      const { generator } = App.BlocklyStuff;
      const code = generator.workspaceToCode(workspace);
      
      codeBox.textContent = code || "// (no code)";

      // Execute the generated code
      const runner = new Function("GameAPI", `${code}\nif (typeof onStart === "function") onStart();`);
      runner(GameAPI);

      if (moveQueue.length === 0) {
        setStatus("No moves queued. Add movement blocks.");
        return;
      }

      runningScript = true;
      setStatus("Running...");
    } catch (err) {
      console.error(err);
      setStatus("Run error: see console.");
    }
  }
  
  document.getElementById("runBtn").addEventListener("click", generateAndRun);
  document.getElementById("stopBtn").addEventListener("click", stopRunning);
  document.getElementById("resetBtn").addEventListener("click", resetPlayer);

  requestAnimationFrame(loop);
})();
