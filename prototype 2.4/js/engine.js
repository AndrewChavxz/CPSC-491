window.App = window.App || {};

/**
 * engine.js
 * 
 * This file contains the very core logic of the isometric game engine.
 * It manages the HTML Canvas, character states, and handles the
 * mathematical conversions between "screen coordinates" (pixels)
 * and "isometric grid coordinates" (tiles).
 */
(function () {
  // -------------------- Core Engine Variables --------------------

  const canvas = document.getElementById("c");
  const ctx = canvas.getContext("2d");

  // tileW and tileH determine the width and height of each isometric tile in pixels
  // blockH determines how tall each 3D block looks vertically
  const tileW = 100, tileH = 50, blockH = 30;

  // The overall size of the map (40x40 tiles)
  const gridCols = 40, gridRows = 40;
  const CAMERA_ZOOM = 1.8;

  // -------------------- Character Management --------------------

  // Array to hold all the characters currently playing the game
  const characters = [];

  // The ID of the character currently being controlled or viewed
  let activeCharId = null;

  /**
   * Adds a new character to the game world.
   * @param {string} id - The unique name/ID for the character.
   * @param {number} x - Starting column position. 
   * @param {number} y - Starting row position.
   * @param {string} color - The base color of the character.
   * @returns {Object} The new character object.
   */
  function createCharacter(id, x, y, color) {
    const char = {
      id,
      x, y,
      color,
      speed: 4.8,            // How fast the character moves manually
      facingRight: false,    // Tells the drawing function whether to flip the robot sprite
      workspaceXML: null,    // Stores the Blockly code specific to this character
      moveQueue: [],         // The list of programmed commands waiting to be executed
      currentMove: null      // The command currently animating
    };
    characters.push(char);

    // If there is no active character, set this new one as active
    if (!activeCharId) activeCharId = id;
    return char;
  }

  /**
   * Removes a character from the game and saves the updated state.
   */
  function deleteCharacter(id) {
    const idx = characters.findIndex(c => c.id === id);
    if (idx !== -1) {
      characters.splice(idx, 1);

      // If we just deleted the active character, switch to the first available one
      if (activeCharId === id) {
        activeCharId = characters.length > 0 ? characters[0].id : null;
      }
      if (App.Storage) App.Storage.saveToStorage();
    }
  }

  function getActiveCharacter() {
    return characters.find(c => c.id === activeCharId);
  }

  function setActiveCharacter(id) {
    // Check if the given ID truly exists before setting it
    if (characters.some(c => c.id === id)) {
      activeCharId = id;
    }
  }

  // -------------------- Global Game State --------------------

  const gameState = {
    treeCount: 0,
    rockCount: 0,
    goldCount: 0,
    buildings: [] // A list of purchased building strings
  };

  // Give the other modules a chance to attach their functions to App
  // before we try to initialize the world or load the storage
  window.addEventListener('DOMContentLoaded', () => {
    // If loadFromStorage is unavailable or fails, generate a new world
    if (!App.Storage || !App.Storage.loadFromStorage()) {
      console.log("No save found or not loaded, creating default world.");
      createCharacter("char_1", 20, 20, "#ffd36e");

      if (App.World) App.World.generateWorld(gridCols, gridRows);
      if (App.Storage) App.Storage.saveToStorage();
    }

    // UI elements depend on the character list being populated
    if (App.CharManager && App.CharManager.init) {
      App.CharManager.init();
    }
  });


  // -------------------- Screen Panning (Click & Drag) --------------------

  // Offset determines how far the camera has been panned away from the character
  let panOffset = { x: 0, y: 0 };
  let isPanning = false;
  let lastMouse = { x: 0, y: 0 };

  canvas.addEventListener("mousedown", e => {
    isPanning = true;
    lastMouse = { x: e.clientX, y: e.clientY };
  });

  window.addEventListener("mouseup", () => isPanning = false);

  canvas.addEventListener("mousemove", e => {
    if (!isPanning) return;
    const dx = e.clientX - lastMouse.x;
    const dy = e.clientY - lastMouse.y;
    panOffset.x += dx / CAMERA_ZOOM;
    panOffset.y += dy / CAMERA_ZOOM;
    lastMouse = { x: e.clientX, y: e.clientY };
  });

  // -------------------- Display & Coordinates --------------------

  /**
   * Resizes the canvas to match the screen's actual display size.
   * Supports high DPI (retina) displays.
   */
  function resizeCanvas() {
    const rect = canvas.getBoundingClientRect();
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    canvas.width = Math.floor(rect.width * dpr);
    canvas.height = Math.floor(rect.height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  /**
   * Converts isometric grid coordinates (i, j) into raw screen pixel math (x, y) 
   * so Canvas knows exactly where to draw.
   */
  function isoToScreen(i, j) {
    const centerX = canvas.width / (2 * (window.devicePixelRatio || 1));
    const centerY = canvas.height / (2 * (window.devicePixelRatio || 1));

    // The camera will lock onto the active character to center them
    const activeChar = getActiveCharacter() || characters[0];
    const px = activeChar ? activeChar.x : 20;
    const py = activeChar ? activeChar.y : 20;

    const dx = i - px;
    const dy = j - py;

    return {
      x: centerX + (dx - dy) * (tileW / 2) + panOffset.x,
      y: centerY + (dx + dy) * (tileH / 2) + panOffset.y
    };
  }

  /**
   * Converts a mouse click location (screen pixels) into a tile coordinate (i, j)
   */
  function screenToIso(screenX, screenY) {
    const dpr = Math.max(1, Math.floor(window.devicePixelRatio || 1));
    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);

    const activeChar = getActiveCharacter() || characters[0];
    const px = activeChar ? activeChar.x : 20;
    const py = activeChar ? activeChar.y : 20;

    // Adjust for the camera pan offset and zoom
    const adjX = (screenX * dpr - centerX) / CAMERA_ZOOM - panOffset.x;
    const adjY = (screenY * dpr - centerY) / CAMERA_ZOOM - panOffset.y;

    // Reverse isometric math algorithm 
    const dx = 0.5 * (adjX / (tileW / 2) + adjY / (tileH / 2));
    const dy = 0.5 * (adjY / (tileH / 2) - adjX / (tileW / 2));

    return {
      x: Math.round(px + dx),
      y: Math.round(py + dy)
    };
  }

  /**
   * Stops characters from walking out of bounds.
   */
  function clampPlayer(char) {
    char.x = Math.max(0, Math.min(gridCols - 1, char.x));
    char.y = Math.max(0, Math.min(gridRows - 1, char.y));
  }


  // -------------------- Core Render Loop --------------------

  function clearScene() {
    const w = canvas.getBoundingClientRect().width;
    const h = canvas.getBoundingClientRect().height;
    ctx.clearRect(0, 0, w, h);

    // Creates a nice radial background gradient behind the grid
    const g = ctx.createRadialGradient(w / 2, h / 2, 80, w / 2, h / 2, Math.max(w, h));
    g.addColorStop(0, "rgba(255,255,255,0.02)");
    g.addColorStop(1, "rgba(0,0,0,0.30)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, w, h);
  }

  let previewBuilding = null;
  /**
   * Show a transparent version of a building before the user commits to placing it.
   */
  function setPreviewBuilding(x, y, variant) {
    if (x === null) {
      previewBuilding = null;
    } else {
      previewBuilding = { x: Math.round(x), y: Math.round(y), variant };
    }
  }

  /**
   * The method responsible for drawing the entire grid every frame.
   */
  function drawGrid() {
    // Viewport culling 
    // Optimization: We only draw the tiles immediately around the player 
    // instead of rendering the entire 100x100 grid (which would be slow).
    const activeChar = getActiveCharacter() || characters[0];
    const viewRadius = Math.ceil(18 / CAMERA_ZOOM); // shrink draw boundary when zoomed in
    const px = activeChar ? activeChar.x : 20;
    const py = activeChar ? activeChar.y : 20;

    const minI = Math.floor(px - viewRadius);
    const maxI = Math.ceil(px + viewRadius);
    const minJ = Math.floor(py - viewRadius);
    const maxJ = Math.ceil(py + viewRadius);

    // Crucial Sorting Logic (Depth Rendering):
    // In isometric games, objects "lower down" on the screen must be drawn last,
    // otherwise they get clipped by objects further back. We calculate the sum of 
    // the X and Y coordinates to determine the drawing order.
    const minSum = minI + minJ;
    const maxSum = maxI + maxJ;

    for (let sum = minSum; sum <= maxSum; sum++) {
      for (let i = minI; i <= maxI; i++) {
        const j = sum - i;
        if (j < minJ || j > maxJ) continue;

        // Skip coordinates that fall off the edge of the world map
        if (i < 0 || i >= gridCols || j < 0 || j >= gridRows) continue;

        // 1. Draw the floor tile
        if (App.Assets) App.Assets.drawBlockTile(ctx, i, j, tileW, tileH, blockH);

        // 2. Draw world objects (trees, rocks, buildings) that sit on this tile
        const key = `${i},${j}`;
        if (App.World && App.World.worldObjects.has(key)) {
          const type = App.World.worldObjects.get(key);
          if (type.startsWith('tree') && App.Assets) App.Assets.drawTree(ctx, i, j, type, blockH);
          else if (type.startsWith('rock') && App.Assets) App.Assets.drawRock(ctx, i, j, type, blockH);
          else if (type.startsWith('building_') && App.Assets) App.Assets.drawBuilding(ctx, i, j, type, blockH);
        }

        // 3. Draw the ghostly building preview if the user is placing something
        if (App.Assets && previewBuilding && previewBuilding.x === i && previewBuilding.y === j) {
          ctx.globalAlpha = 0.5; // 50% transparency
          App.Assets.drawBuilding(ctx, i, j, `building_${previewBuilding.variant}`, blockH);
          ctx.globalAlpha = 1.0;
        }

        // 4. Draw any characters currently standing on this specific tile
        if (App.Assets) {
          characters.forEach(char => {
            if (Math.round(char.x) === i && Math.round(char.y) === j) {
              App.Assets.drawCharacter(ctx, char, activeCharId, blockH);
            }
          });
        }
      }
    }
  }

  function render() {
    clearScene();

    const dpr = window.devicePixelRatio || 1;
    const centerX = canvas.width / (2 * dpr);
    const centerY = canvas.height / (2 * dpr);

    ctx.save();
    ctx.translate(centerX, centerY);
    ctx.scale(CAMERA_ZOOM, CAMERA_ZOOM);
    ctx.translate(-centerX, -centerY);

    drawGrid();

    ctx.restore();
  }

  // Initial sizing setup
  window.addEventListener("resize", resizeCanvas);
  const ro = new ResizeObserver(() => resizeCanvas());
  ro.observe(canvas);
  resizeCanvas();

  // Expose these core properties and functions out to the global App object
  App.Engine = {
    canvas,
    ctx,
    characters,
    createCharacter,
    deleteCharacter,
    getActiveCharacter,
    setActiveCharacter,
    gameState,
    gridCols,
    gridRows,
    resizeCanvas,
    clampPlayer,
    isoToScreen,
    screenToIso,
    setPreviewBuilding,
    render
  };
})();
