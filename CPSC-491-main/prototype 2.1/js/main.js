window.App = window.App || {};

(function () {
  const { clampPlayer, gridCols, gridRows, characters } = App.Engine;
  const { keys } = App.Input;
  const { workspace } = App.BlocklyStuff;
  const { codeBox, setStatus } = App.UI;

  // -------------------- Script movement queue (Blockly) --------------------
  // -------------------- Script movement queue (Blockly) --------------------
  // Note: moveQueue is now stored in each character object.
  // We need helpers to enqueue moves for the ACTIVE character.
  const stepTime = 0.22;

  function enqueueMove(dx, dy) {
    const char = App.Engine.getActiveCharacter();
    if (char) char.moveQueue.push({ type: 'move', dx, dy });
  }

  function enqueueHarvest() {
    const char = App.Engine.getActiveCharacter();
    if (char) char.moveQueue.push({ type: 'harvest' });
  }

  const GameAPI = {
    moveUp: () => enqueueMove(0, -1),
    moveDown: () => enqueueMove(0, 1),
    moveLeft: () => enqueueMove(-1, 0),
    moveRight: () => enqueueMove(1, 0),
    harvest: () => enqueueHarvest(),
    resetQueue: () => {
      const char = App.Engine.getActiveCharacter();
      if (char) {
        char.moveQueue = [];
        char.currentMove = null;
      }
    }
  };
  App.GameAPI = GameAPI;

  function processCharacter(char, dt) {
    // 1. Script Movement
    if (char.moveQueue.length > 0 || char.currentMove) {
      if (!char.currentMove) {
        // Look ahead
        const action = char.moveQueue[0];

        if (action.type === 'harvest') {
          // Check all 4 adjacent tiles
          const offsets = [
            { dx: 0, dy: -1 }, // UP
            { dx: 0, dy: 1 },  // DOWN
            { dx: -1, dy: 0 }, // LEFT
            { dx: 1, dy: 0 }   // RIGHT
          ];

          let totalHarvested = 0;
          let harvestTypes = [];

          offsets.forEach(offset => {
            const targetX = char.x + offset.dx;
            const targetY = char.y + offset.dy;
            const harvested = App.Engine.harvestObject(targetX, targetY);
            if (harvested) {
              totalHarvested++;
              if (!harvestTypes.includes(harvested)) harvestTypes.push(harvested);
            }
          });

          if (totalHarvested > 0) {
            App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount);
            App.UI.setStatus(`Harvested ${totalHarvested} items (${harvestTypes.join(", ")})!`);
          } else {
            App.UI.setStatus("Nothing to harvest nearby.");
          }

          // Consume action
          char.moveQueue.shift();
          return;
        }

        // Movement Logic
        if (action.type === 'move') {
          const m = action;
          const tx = Math.max(0, Math.min(App.Engine.gridCols - 1, char.x + m.dx));
          const ty = Math.max(0, Math.min(App.Engine.gridRows - 1, char.y + m.dy));

          if (!App.Engine.isWalkable(tx, ty)) {
            char.moveQueue.shift();
            return;
          }

          // Start move
          char.moveQueue.shift();
          char.currentMove = {
            t: 0,
            startX: char.x, startY: char.y,
            targetX: tx, targetY: ty
          };
        }
      }

      // Animating
      if (char.currentMove) {
        char.currentMove.t += dt / stepTime;
        const t = Math.min(1, char.currentMove.t);
        const s = t * t * (3 - 2 * t);
        char.x = char.currentMove.startX + (char.currentMove.targetX - char.currentMove.startX) * s;
        char.y = char.currentMove.startY + (char.currentMove.targetY - char.currentMove.startY) * s;

        if (t >= 1) {
          char.x = char.currentMove.targetX;
          char.y = char.currentMove.targetY;
          char.currentMove = null;
        }
      }
    }
  }

  function update(dt) {
    // Process all characters
    App.Engine.characters.forEach(char => processCharacter(char, dt));

    // Manual movement overrides ACTIVE character
    const player = App.Engine.getActiveCharacter();
    if (!player) return;

    // Only manual move if queue is empty (avoid conflict)
    if (player.moveQueue.length > 0 || player.currentMove) return;

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

      const nextX = player.x + vx * player.speed * run * dt;
      const nextY = player.y + vy * player.speed * run * dt;

      // Check collision at future position
      if (App.Engine.isWalkable(nextX, nextY)) {
        player.x = nextX;
        player.y = nextY;
      } else {
        // Simple slide: try moving only X or only Y
        if (App.Engine.isWalkable(nextX, player.y)) {
          player.x = nextX;
        } else if (App.Engine.isWalkable(player.x, nextY)) {
          player.y = nextY;
        }
      }

      clampPlayer(player);
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
    // runningScript = false; // logic changed, check queues
    GameAPI.resetQueue();
    setStatus("Stopped.");
  }

  function resetPlayer() {
    stopRunning();
    const char = App.Engine.getActiveCharacter();
    if (char) {
      char.x = 50; char.y = 50;
    }
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
      // runningScript = false; // This variable is no longer used

      // FIX: Use the generator from App.BlocklyStuff (defined in setup)
      const { generator } = App.BlocklyStuff;
      const code = generator.workspaceToCode(workspace);

      codeBox.textContent = code || "// (no code)";

      // Execute the generated code
      const runner = new Function("GameAPI", `${code}\nif (typeof onStart === "function") onStart();`);
      runner(GameAPI);

      const char = App.Engine.getActiveCharacter();
      if (char && char.moveQueue.length === 0) {
        setStatus("No moves queued. Add movement blocks.");
        return;
      }

      // runningScript = true; // logic implicitly handled by queue existence
      setStatus(`Running ${char.id}...`);
    } catch (err) {
      console.error(err);
      setStatus("Run error: see console.");
    }
  }

  document.getElementById("runBtn").addEventListener("click", generateAndRun);
  document.getElementById("stopBtn").addEventListener("click", stopRunning);
  document.getElementById("resetBtn").addEventListener("click", resetPlayer);

  // -------------------- Start Screen --------------------
  const startScreen = document.getElementById("start-screen");
  const appDiv = document.getElementById("app");

  if (startScreen) {
    // Ensure app is hidden initially (already done in HTML style, but good to enforce)
    appDiv.style.display = "none";

    document.getElementById("start-game-btn").addEventListener("click", () => {
      startScreen.style.opacity = 0;
      setTimeout(() => {
        startScreen.style.display = "none";
        appDiv.style.display = "grid";
        App.Engine.resizeCanvas(); // Fix canvas size after showing
        if (workspace) Blockly.svgResize(workspace); // Fix Blockly layout
      }, 200);
    });

    document.getElementById("settings-btn").addEventListener("click", () => {
      alert("Settings menu coming soon!");
    });

    // Shop
    const shopBtn = document.getElementById("shop-btn");
    const shopScreen = document.getElementById("shop-screen");
    const closeShopBtn = document.getElementById("close-shop-btn");

    if (shopBtn && shopScreen && closeShopBtn) {
      shopBtn.addEventListener("click", () => {
        shopScreen.style.display = "flex"; // Show flex to center content
        shopScreen.classList.remove("hidden");
      });

      closeShopBtn.addEventListener("click", () => {
        shopScreen.classList.add("hidden");
        // Also force display none if class logic isn't enough (due to flex override)
        // But .hidden has !important so it should be fine. 
        // However, we used style.display = "flex" above which sets inline style.
        // Inline style overrides class without !important, but our .hidden has !important.
        // Just to be clean:
        shopScreen.style.display = "";
      });
    }
  }

  window.addEventListener("resize", () => {
    if (workspace) Blockly.svgResize(workspace);
  });

  requestAnimationFrame(loop);
})();
