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
            App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
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

    // Shop and Sub-screens
    const shopBtn = document.getElementById("shop-btn");
    const shopScreen = document.getElementById("shop-screen");
    const closeShopBtn = document.getElementById("close-shop-btn");

    const goldBtn = document.getElementById("shop-gold-btn");
    const buildingsBtn = document.getElementById("shop-buildings-btn");

    const goldScreen = document.getElementById("gold-exchange-screen");
    const closeGoldBtn = document.getElementById("close-gold-btn");

    const buildingsScreen = document.getElementById("buildings-screen");
    const closeBuildingsBtn = document.getElementById("close-buildings-btn");

    const questBtn = document.getElementById("quest-btn");
    const questsListScreen = document.getElementById("quests-list-screen");
    const closeQuestsBtn = document.getElementById("close-quests-btn");

    const questDetailsScreen = document.getElementById("quest-details-screen");
    const closeQuestDetailsBtn = document.getElementById("close-quest-details-btn");
    const questsContainer = document.getElementById("quests-container");

    // Quest Data
    const questsData = [
      {
        id: 1,
        title: "QUEST 1 — “Careful Cutter”",
        objective: "Cut exactly 3 oak trees.",
        rules: [
          "Do NOT cut protected trees.",
          "Max 10 commands."
        ],
        reward: "+25 Gold",
        teaches: ["Exact goal targeting", "Basic IF statements", "Command limits"]
      },
      {
        id: 2,
        title: "🟢 QUEST 2 — “Efficient Lumberjack”",
        objective: "Cut 5 trees using 12 commands or fewer.",
        rules: ["Must use at least one REPEAT loop."],
        reward: "+40 Gold",
        teaches: ["Loop usage", "Avoiding repetition", "Code optimization"]
      },
      {
        id: 3,
        title: "🟡 QUEST 3 — “Protected Forest”",
        objective: "Cut 4 oak trees.",
        rules: [
          "There are protected red trees.",
          "If you cut even one protected tree → quest fails.",
          "Must use at least 1 IF block."
        ],
        reward: "+50 Gold",
        teaches: ["Conditional logic", "Decision-based behavior", "Environmental awareness"]
      },
      {
        id: 4,
        title: "🟡 QUEST 4 — “Low Battery Mission”",
        objective: "Clear a path by cutting 3 trees.",
        rules: [
          "Robot only has 6 energy.",
          "Each move costs 1 energy.",
          "Each cut costs 2 energy."
        ],
        reward: "+60 Gold",
        teaches: ["Resource management", "Strategic planning", "Efficiency thinking"]
      },
      {
        id: 5,
        title: "🟠 QUEST 5 — “Correct Order”",
        objective: "Cut trees in this order:\nOak → Pine → Oak",
        rules: [
          "Cutting in wrong order resets quest.",
          "Pine requires 2 hits."
        ],
        reward: "+75 Gold",
        teaches: ["Sequence ordering", "State tracking", "Complex task execution"]
      }
    ];

    // Populate Quest List
    if (questsContainer) {
      questsData.forEach(quest => {
        const item = document.createElement("div");
        item.className = "quest-list-item";
        item.innerHTML = `
          <h3>${quest.title}</h3>
          <p>${quest.objective.replace(/\n/g, '<br>')}</p>
        `;
        item.addEventListener("click", () => {
          openQuestDetails(quest);
        });
        questsContainer.appendChild(item);
      });
    }

    function openQuestDetails(quest) {
      document.getElementById("qd-title").textContent = quest.title;
      document.getElementById("qd-objective").innerHTML = quest.objective.replace(/\n/g, '<br>');

      const rulesList = document.getElementById("qd-rules");
      rulesList.innerHTML = quest.rules.map(r => `<li>${r}</li>`).join("");

      document.getElementById("qd-reward").textContent = quest.reward;

      const teachesList = document.getElementById("qd-teaches");
      teachesList.innerHTML = quest.teaches.map(t => `<li>${t}</li>`).join("");

      questsListScreen.classList.add("hidden");
      questDetailsScreen.classList.remove("hidden");
    }

    // Exchange Buttons
    const exchangeTreesBtn = document.getElementById("exchange-trees-btn");
    const exchangeRocksBtn = document.getElementById("exchange-rocks-btn");
    const buyCabinBtn = document.getElementById("buy-cabin-btn");
    const buyHouse1Btn = document.getElementById("buy-house1-btn");
    const buyHouse2Btn = document.getElementById("buy-house2-btn");
    const buyHouse3Btn = document.getElementById("buy-house3-btn");

    if (shopBtn) {
      shopBtn.addEventListener("click", () => {
        shopScreen.classList.remove("hidden");
      });

      closeShopBtn.addEventListener("click", () => {
        shopScreen.classList.add("hidden");
      });

      goldBtn.addEventListener("click", () => {
        shopScreen.classList.add("hidden");
        goldScreen.classList.remove("hidden");
      });

      closeGoldBtn.addEventListener("click", () => {
        goldScreen.classList.add("hidden");
        shopScreen.classList.remove("hidden");
      });

      buildingsBtn.addEventListener("click", () => {
        shopScreen.classList.add("hidden");
        buildingsScreen.classList.remove("hidden");
      });

      closeBuildingsBtn.addEventListener("click", () => {
        buildingsScreen.classList.add("hidden");
        shopScreen.classList.remove("hidden");
      });

      // Quest Navigation
      if (questBtn) {
        questBtn.addEventListener("click", () => {
          questsListScreen.classList.remove("hidden");
        });

        closeQuestsBtn.addEventListener("click", () => {
          questsListScreen.classList.add("hidden");
        });

        closeQuestDetailsBtn.addEventListener("click", () => {
          questDetailsScreen.classList.add("hidden");
          questsListScreen.classList.remove("hidden");
        });
      }

      // Exchange Logic
      exchangeTreesBtn.addEventListener("click", () => {
        if (App.Engine.gameState.treeCount >= 5) {
          App.Engine.gameState.treeCount -= 5;
          App.Engine.gameState.goldCount += 2;
          App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
          App.Engine.saveToStorage();
        } else {
          alert("Not enough trees! You need 5 trees to get 2 gold.");
        }
      });

      exchangeRocksBtn.addEventListener("click", () => {
        if (App.Engine.gameState.rockCount >= 5) {
          App.Engine.gameState.rockCount -= 5;
          App.Engine.gameState.goldCount += 3;
          App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
          App.Engine.saveToStorage();
        } else {
          alert("Not enough rocks! You need 5 rocks to get 3 gold.");
        }
      });

      // Building Logic Helpers
      function buyBuilding(btnName, cost, buildingName) {
        if (App.Engine.gameState.goldCount >= cost) {
          App.Engine.gameState.goldCount -= cost;
          App.Engine.gameState.buildings.push(buildingName);
          App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
          App.Engine.saveToStorage();
          alert(`${buildingName} purchased!`);
        } else {
          alert(`Not enough gold! You need ${cost} gold.`);
        }
      }

      // Building Logic
      buyCabinBtn.addEventListener("click", () => buyBuilding("buy-cabin", 5, "Cabin"));
      buyHouse1Btn.addEventListener("click", () => buyBuilding("buy-house1", 10, "House 1"));
      buyHouse2Btn.addEventListener("click", () => buyBuilding("buy-house2", 10, "House 2"));
      buyHouse3Btn.addEventListener("click", () => buyBuilding("buy-house3", 10, "House 3"));
    }

    // Inventory and Placement Logic
    let isPlacingBuilding = false;
    let placingBuildingType = "";

    const inventoryBtn = document.getElementById("inventory-btn");
    const inventoryScreen = document.getElementById("inventory-screen");
    const closeInventoryBtn = document.getElementById("close-inventory-btn");
    const inventoryContainer = document.getElementById("inventory-container");

    if (inventoryBtn) {
      inventoryBtn.addEventListener("click", () => {
        inventoryContainer.innerHTML = "";
        const counts = {};
        App.Engine.gameState.buildings.forEach(b => { counts[b] = (counts[b] || 0) + 1; });

        if (Object.keys(counts).length === 0) {
          inventoryContainer.innerHTML = "<p>No buildings in inventory.</p>";
        } else {
          for (const [bName, count] of Object.entries(counts)) {
            const item = document.createElement("div");
            item.className = "building-item";
            item.style.padding = "20px";
            item.style.minWidth = "120px";
            item.innerHTML = `
              <p style="font-size: 1.2em; font-weight: bold;">${bName}</p>
              <p style="color: #bbb;">Owned: ${count}</p>
              <button class="place-btn" data-type="${bName}" style="padding: 10px 20px; margin-top: 10px;">Place</button>
            `;
            inventoryContainer.appendChild(item);
          }

          inventoryContainer.querySelectorAll(".place-btn").forEach(btn => {
            btn.addEventListener("click", (e) => {
              placingBuildingType = e.target.getAttribute("data-type");
              isPlacingBuilding = true;
              App.UI.setStatus(`Placing ${placingBuildingType}... Click on the grid.`);
              inventoryScreen.classList.add("hidden");
            });
          });
        }
        inventoryScreen.classList.remove("hidden");
      });

      closeInventoryBtn.addEventListener("click", () => {
        inventoryScreen.classList.add("hidden");
      });
    }

    // Handle Canvas clicks for placement
    App.Engine.canvas.addEventListener("click", (e) => {
      if (!isPlacingBuilding) return;

      const rect = App.Engine.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const isoPos = App.Engine.screenToIso(x, y);

      if (App.Engine.placeBuilding(isoPos.x, isoPos.y, placingBuildingType)) {
        const idx = App.Engine.gameState.buildings.indexOf(placingBuildingType);
        if (idx > -1) App.Engine.gameState.buildings.splice(idx, 1);

        App.Engine.saveToStorage();
        App.UI.setStatus(`${placingBuildingType} placed!`);
        App.Engine.setPreviewBuilding(null);
        App.Engine.render(); // Force redraw immediately
        isPlacingBuilding = false;
        placingBuildingType = "";
      } else {
        App.UI.setStatus("Cannot place there! Tile is blocked or invalid.");
      }
    });

    // Handle Canvas mousemove for preview
    App.Engine.canvas.addEventListener("mousemove", (e) => {
      if (!isPlacingBuilding) return;

      const rect = App.Engine.canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      const isoPos = App.Engine.screenToIso(x, y);
      App.Engine.setPreviewBuilding(isoPos.x, isoPos.y, placingBuildingType);
    });

    // Handle cancel placement (Escape or right click)
    window.addEventListener("keydown", (e) => {
      if (e.key === "Escape" && isPlacingBuilding) {
        isPlacingBuilding = false;
        placingBuildingType = "";
        App.Engine.setPreviewBuilding(null);
        App.UI.setStatus("Placement cancelled.");
      }
    });

    App.Engine.canvas.addEventListener("contextmenu", (e) => {
      if (isPlacingBuilding) {
        e.preventDefault();
        isPlacingBuilding = false;
        placingBuildingType = "";
        App.Engine.setPreviewBuilding(null);
        App.UI.setStatus("Placement cancelled.");
      }
    });

  }

  // Initialize UI Counters
  App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);

  window.addEventListener("resize", () => {
    if (workspace) Blockly.svgResize(workspace);
  });

  requestAnimationFrame(loop);
})();
