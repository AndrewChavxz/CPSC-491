window.App = window.App || {};

/**
 * main.js
 * 
 * This file contains the very highest level of game logic.
 * It manages the "game loop" (the function that runs 60 times a second),
 * listens for the 'Run Blockly' button, and allows the player 
 * to manually drive the character with WASD when scripts aren't running.
 */
(function () {

  // Wait until everything is rendered before attaching listeners
  document.addEventListener("DOMContentLoaded", () => {
    const { workspace } = App.BlocklyStuff;
    const { setStatus } = App.UI;
    const codeBox = document.getElementById("codeBox");

    // The keys currently being held down by the player
    const keys = new Set();
    window.addEventListener("keydown", e => keys.add(e.key.toLowerCase()));
    window.addEventListener("keyup", e => keys.delete(e.key.toLowerCase()));

    /**
     * The core game Logic loop. This happens every single frame.
     * @param {number} dt - Delta time (the fraction of a second since the last frame)
     */
    function update(dt) {
      // 1. Tell the Action Queue to process all programmed movement for every character
      App.Engine.characters.forEach(char => {
        if (App.ActionQueue) App.ActionQueue.processCharacter(char, dt);
      });

      // 2. Allow the player to override the ACTIVE character using WASD keys
      const player = App.Engine.getActiveCharacter();
      if (!player) return;

      // We only allow manual movement if their Blockly program isn't currently running
      if (player.moveQueue.length > 0 || player.currentMove) return;

      // Check which keys are pressed and calculate a velocity (vx, vy)
      let vx = 0, vy = 0;
      if (keys.has("w")) vy -= 1;
      if (keys.has("s")) vy += 1;
      if (keys.has("a")) vx -= 1;
      if (keys.has("d")) vx += 1;

      // If they are trying to move...
      if (vx !== 0 || vy !== 0) {
        // Make sure they face the direction they're walking
        if (vx > 0) player.facingRight = true;
        else if (vx < 0) player.facingRight = false;

        const run = keys.has("shift") ? 1.75 : 1.0;

        // Normalize velocity so diagonal movement isn't twice as fast
        const len = Math.hypot(vx, vy);
        vx /= len; vy /= len;

        const nextX = player.x + vx * player.speed * run * dt;
        const nextY = player.y + vy * player.speed * run * dt;

        // Check collision: if the future spot is free, move there
        if (App.World && App.World.isWalkable(nextX, nextY)) {
          player.x = nextX;
          player.y = nextY;
        } else if (App.World) {
          // Simple Wall-Slide logic: if they hit a wall diagonally, try moving only X or only Y
          if (App.World.isWalkable(nextX, player.y)) {
            player.x = nextX;
          } else if (App.World.isWalkable(player.x, nextY)) {
            player.y = nextY;
          }
        }

        // Ensure they don't walk off the map
        App.Engine.clampPlayer(player);
      }
    }


    // -------------------- Core Render Loop --------------------

    let last = performance.now();

    /**
     * The absolutely central loop of the entire browser game. 
     * It asks the browser to call this over and over as fast as possible.
     */
    function loop(now) {
      // Calculate how much time passed (dt) so the game speed is consistent
      // even heavily lagging computers (capped at ~30 FPS minimum)
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;

      // Update quest timers
      if (App.QuestManager) App.QuestManager.update(dt);

      // Update character logic
      update(dt);

      // Draw everything to the screen (only draws if Engine exists!)
      if (App.Engine.render) {
        App.Engine.render();
      }

      // Ask the browser to do it all over again next frame!
      requestAnimationFrame(loop);
    }

    // START THE ENGINE LOOP!
    requestAnimationFrame(loop);


    // -------------------- UI Control Buttons --------------------

    function stopRunning() {
      if (App.GameAPI) App.GameAPI.resetQueue();
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

    /**
     * Reads the blocks, turns them into JavaScript code, and executes it.
     */
    function generateAndRun() {
      try {
        if (!workspace) return; // Prevent crashes if workspace isn't ready

        const topBlocks = workspace.getTopBlocks(true);
        const hasStart = topBlocks.some(b => b.type === "on_start");
        if (!hasStart) {
          setStatus("Add an 'on start' block.");
          return;
        }

        if (App.GameAPI) App.GameAPI.resetQueue();

        const { generator } = App.BlocklyStuff;
        const code = generator.workspaceToCode(workspace);

        if (codeBox) codeBox.textContent = code || "// (no code)";

        // Quest 2 has specific rules that need to be checked *before* the code runs to avoid cheating
        if (App.QuestManager && App.QuestManager.activeQuest && App.QuestManager.activeQuest.id === 2) {
          if (!App.QuestManager.checkQuest2RulesBeforeRun()) {
            return;
          }
        }

        // This is the Magic function! 
        // It creates a brand new temporary javascript function out of the code string and runs it.
        const runner = new Function("GameAPI", `${code}\nif (typeof onStart === "function") onStart();`);
        runner(App.GameAPI);

        const char = App.Engine.getActiveCharacter();
        if (char && char.moveQueue.length === 0) {
          setStatus("No moves queued. Add movement blocks.");
          return;
        }

        setStatus(`Running ${char ? char.id : 'unknown'}...`);
      } catch (err) {
        console.error(err);
        setStatus("Run error: see console.");
      }
    }

    // Attach the Run, Stop, Reset buttons if they exist on screen
    const runBtn = document.getElementById("runBtn");
    const stopBtn = document.getElementById("stopBtn");
    const resetBtn = document.getElementById("resetBtn");

    if (runBtn) runBtn.addEventListener("click", generateAndRun);
    if (stopBtn) stopBtn.addEventListener("click", stopRunning);
    if (resetBtn) resetBtn.addEventListener("click", resetPlayer);

  });
})();
