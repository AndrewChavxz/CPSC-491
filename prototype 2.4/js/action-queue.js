window.App = window.App || {};

/**
 * action-queue.js
 * 
 * This file acts as the bridge between the Blockly code blocks and the game engine.
 * It provides the `GameAPI` commands that Blockly uses (like moveUp or harvest),
 * queues them up, and slowly processes those actions frame-by-frame 
 * so you can watch the character move.
 */
(function () {
    const stepTime = 0.22; // How long (in seconds) one single grid movement takes

    // -------------------- Promise Wrappers --------------------
    /**
     * Helper function to add a move command to the active character's queue.
     * Returns a Promise that resolves when the move is fully completed.
     */
    function enqueueMove(dx, dy) {
        return new Promise(resolve => {
            const char = App.Engine.getActiveCharacter();
            if (char) {
                char.moveQueue.push({ type: 'move', dx, dy, resolve });
            } else {
                resolve(); // Fallback if no character found
            }
        });
    }

    /**
     * Helper function to add a harvest command to the active character's queue.
     * Returns a Promise that resolves when the harvest action completes.
     */
    function enqueueHarvest(target = "ANY") {
        return new Promise(resolve => {
            const char = App.Engine.getActiveCharacter();
            if (char) {
                char.moveQueue.push({ type: 'harvest', target, resolve });
            } else {
                resolve();
            }
        });
    }

    function enqueueTurn(direction) {
        return new Promise(resolve => {
            const char = App.Engine.getActiveCharacter();
            if (char) char.moveQueue.push({ type: 'turn', direction, resolve });
            else resolve();
        });
    }

    function enqueueRelativeMove(forward) {
        return new Promise(resolve => {
            const char = App.Engine.getActiveCharacter();
            if (char) char.moveQueue.push({ type: 'relative_move', forward, resolve });
            else resolve();
        });
    }

    function enqueueDropResources() {
        return new Promise(resolve => {
            const char = App.Engine.getActiveCharacter();
            if (char) char.moveQueue.push({ type: 'drop_resources', resolve });
            else resolve();
        });
    }

    // -------------------- Game API (Blockly Bridge) --------------------
    // The GameAPI object is what the auto-generated javascript code from Blockly calls
    const GameAPI = {
        moveUp: () => enqueueMove(0, -1),
        moveDown: () => enqueueMove(0, 1),
        moveLeft: () => enqueueMove(-1, 0),
        moveRight: () => enqueueMove(1, 0),
        turnLeft: () => enqueueTurn('LEFT'),
        turnRight: () => enqueueTurn('RIGHT'),
        moveForward: () => enqueueRelativeMove(true),
        moveBackward: () => enqueueRelativeMove(false),
        harvest: (target) => enqueueHarvest(target),
        getResource: (type) => App.Engine.gameState[type] || 0,
        dropResources: () => enqueueDropResources(),
        isOnBase: () => {
            const char = App.Engine.getActiveCharacter();
            if (!char) return false;
            const key = `${Math.round(char.x)},${Math.round(char.y)}`;
            return App.World.worldObjects.has(key) && App.World.worldObjects.get(key) === 'building_Cabin';
        },
        getDistanceTo: (target) => {
            const char = App.Engine.getActiveCharacter();
            if (!char) return 999;
            let minDist = 999;
            for (let i = 0; i < App.Engine.gridCols; i++) {
                for (let j = 0; j < App.Engine.gridRows; j++) {
                    const key = `${i},${j}`;
                    if (App.World.worldObjects.has(key)) {
                        const type = App.World.worldObjects.get(key);
                        let match = false;
                        if (target === 'ANY') match = true;
                        if (target === 'TREE' && type.startsWith('tree')) match = true;
                        if (target === 'ROCK' && type.startsWith('rock')) match = true;
                        if (target === 'WATER' && type === 'water') match = true;

                        if (match) {
                            const d = Math.abs(Math.round(char.x) - i) + Math.abs(Math.round(char.y) - j);
                            if (d < minDist) minDist = d;
                        }
                    }
                }
            }
            return minDist;
        },
        isPathBlockedAhead: () => {
            const char = App.Engine.getActiveCharacter();
            if (!char) return true;
            let dx = 0, dy = 0;
            if (char.facingDirection === 0) dy = -1;
            if (char.facingDirection === 1) dx = 1;
            if (char.facingDirection === 2) dy = 1;
            if (char.facingDirection === 3) dx = -1;

            const tx = Math.round(char.x) + dx;
            const ty = Math.round(char.y) + dy;
            
            if (tx < 0 || tx >= App.Engine.gridCols || ty < 0 || ty >= App.Engine.gridRows) return true;
            return !App.World.isWalkable(tx, ty);
        },
        isNextTo: (target) => {
            const char = App.Engine.getActiveCharacter();
            if (!char) return false;
            const offsets = [
                { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
            ];
            for (const offset of offsets) {
                const tx = Math.round(char.x + offset.dx);
                const ty = Math.round(char.y + offset.dy);
                const key = `${tx},${ty}`;
                if (App.World.worldObjects.has(key)) {
                    const type = App.World.worldObjects.get(key);
                    if (target === 'ANY') return true;
                    if (target === 'TREE' && type.startsWith('tree')) return true;
                    if (target === 'ROCK' && type.startsWith('rock')) return true;
                }
            }
            return false;
        },

        // Cancels all pending movements and stops the character
        resetQueue: () => {
            const char = App.Engine.getActiveCharacter();
            if (char) {
                char.moveQueue = [];
                char.currentMove = null;
            }
        }
    };

    // Make GameAPI globally available so the Blockly runner can find it
    App.GameAPI = GameAPI;


    // -------------------- Action Processing Loop --------------------
    /**
     * Processes the queue for a single character every frame.
     * If they have a move pending, it calculates how far they should have moved
     * this frame and slides them across the tile.
     * 
     * @param {Object} char - The character to process
     * @param {number} dt   - Delta time (how much time passed since last frame)
     */
    function processCharacter(char, dt) {
        // If the character has pending moves or is currently moving
        if (char.moveQueue.length > 0 || char.currentMove) {

            // If they are NOT in the middle of a move right now, get the next one
            if (!char.currentMove) {
                const action = char.moveQueue[0]; // Look at the next action

                if (action.type === 'harvest') {
                    const offsets = [
                        { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                        { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                    ];

                    let hasHarvestable = false;
                    let bestSoundType = null;

                    offsets.forEach(offset => {
                        const targetX = char.x + offset.dx;
                        const targetY = char.y + offset.dy;
                        const key = `${Math.round(targetX)},${Math.round(targetY)}`;
                        if (App.World.worldObjects.has(key)) {
                            const type = App.World.worldObjects.get(key);
                            if ((action.target === 'TREE' || action.target === 'ANY') && type.startsWith('tree')) {
                                hasHarvestable = true;
                                bestSoundType = 'tree';
                            }
                            if ((action.target === 'ROCK' || action.target === 'ANY') && type.startsWith('rock')) {
                                hasHarvestable = true;
                                bestSoundType = 'rock';
                            }
                        }
                    });

                    if (!hasHarvestable) {
                        App.UI.setStatus("Nothing to harvest nearby.");
                        if (action.resolve) action.resolve();
                        char.moveQueue.shift();
                        return;
                    }

                    char.moveQueue.shift();
                    char.currentMove = {
                        type: 'harvest',
                        t: 0,
                        duration: 1.0,
                        actionConfig: action,
                        startX: char.x, startY: char.y,
                        targetX: char.x, targetY: char.y,
                        resolve: action.resolve
                    };

                    App.UI.setStatus("Harvesting... (1s)");

                    if (bestSoundType === 'tree') {
                        const audio = new Audio("audio/0424.MP3");
                        audio.play().catch(evt => console.warn("Audio play failed", evt));
                    } else if (bestSoundType === 'rock') {
                        const audio = new Audio("audio/0424.MP3");
                        audio.play().catch(evt => console.warn("Audio play failed", evt));
                    }

                    return;
                }

                // Handle a Movement action
                if (action.type === 'move') {
                    const m = action;
                    // Calculate destination
                    const tx = Math.max(0, Math.min(App.Engine.gridCols - 1, char.x + m.dx));
                    const ty = Math.max(0, Math.min(App.Engine.gridRows - 1, char.y + m.dy));

                    // Ensure the character faces the right way
                    if (m.dx > 0) { char.facingRight = true; char.facingDirection = 1; }
                    else if (m.dx < 0) { char.facingRight = false; char.facingDirection = 3; }
                    else if (m.dy < 0) char.facingDirection = 0;
                    else if (m.dy > 0) char.facingDirection = 2;

                    // If the tile is blocked (e.g. by a rock), cancel the move entirely
                    if (!App.World.isWalkable(tx, ty)) {
                        if (action.resolve) action.resolve();
                        char.moveQueue.shift();
                        return;
                    }

                    // Tile is free! Start the sliding animation
                    char.moveQueue.shift();
                    char.currentMove = {
                        t: 0,                            // Timer starting at 0
                        startX: char.x, startY: char.y,  // From here...
                        targetX: tx, targetY: ty,        // ...to there
                        resolve: m.resolve               // Keep the promise resolver to call when animation is done
                    };
                }

                if (action.type === 'turn') {
                    if (action.direction === 'LEFT') char.facingDirection = (char.facingDirection + 3) % 4;
                    if (action.direction === 'RIGHT') char.facingDirection = (char.facingDirection + 1) % 4;
                    
                    if (char.facingDirection === 1) char.facingRight = true;
                    if (char.facingDirection === 3) char.facingRight = false;

                    if (action.resolve) action.resolve();
                    char.moveQueue.shift();
                    return;
                }

                if (action.type === 'drop_resources') {
                    if (App.QuestManager) App.QuestManager.onDropResources();
                    if (action.resolve) action.resolve();
                    char.moveQueue.shift();
                    return;
                }

                if (action.type === 'relative_move') {
                    let dx = 0, dy = 0;
                    if (char.facingDirection === 0) dy = -1;
                    if (char.facingDirection === 1) dx = 1;
                    if (char.facingDirection === 2) dy = 1;
                    if (char.facingDirection === 3) dx = -1;

                    if (!action.forward) { dx = -dx; dy = -dy; }

                    const tx = Math.max(0, Math.min(App.Engine.gridCols - 1, char.x + dx));
                    const ty = Math.max(0, Math.min(App.Engine.gridRows - 1, char.y + dy));

                    if (dx > 0) char.facingRight = true;
                    else if (dx < 0) char.facingRight = false;

                    if (!App.World.isWalkable(tx, ty)) {
                        if (action.resolve) action.resolve();
                        char.moveQueue.shift();
                        return;
                    }

                    char.moveQueue.shift();
                    char.currentMove = {
                        t: 0,
                        startX: char.x, startY: char.y,
                        targetX: tx, targetY: ty,
                        resolve: action.resolve
                    };
                }
            }

            // Animating the current move
            if (char.currentMove) {
                if (char.currentMove.type === 'harvest') {
                    char.currentMove.t += dt; // Flat seconds

                    if (char.currentMove.t >= char.currentMove.duration) {
                        const actionConfig = char.currentMove.actionConfig;
                        const offsets = [
                            { dx: 0, dy: -1 }, { dx: 0, dy: 1 },
                            { dx: -1, dy: 0 }, { dx: 1, dy: 0 }
                        ];

                        let totalHarvested = 0;
                        let harvestTypes = [];

                        offsets.forEach(offset => {
                            const targetX = char.x + offset.dx;
                            const targetY = char.y + offset.dy;
                            const key = `${Math.round(targetX)},${Math.round(targetY)}`;
                            
                            if (actionConfig.target === 'TREE' && (!App.World.worldObjects.has(key) || !App.World.worldObjects.get(key).startsWith('tree'))) return;
                            if (actionConfig.target === 'ROCK' && (!App.World.worldObjects.has(key) || !App.World.worldObjects.get(key).startsWith('rock'))) return;

                            const harvested = App.World.harvestObject(targetX, targetY);
                            if (harvested) {
                                totalHarvested++;
                                let hType = harvested;
                                if (harvested.startsWith('tree')) hType = 'tree';
                                else if (harvested.startsWith('rock')) hType = 'rock';
                                else if (harvested.startsWith('building_')) hType = harvested.replace('building_', '');

                                if (!harvestTypes.includes(hType)) harvestTypes.push(hType);

                                if (App.QuestManager) {
                                    App.QuestManager.onHarvest(hType, harvested);
                                }
                            }
                        });

                        if (totalHarvested > 0) {
                            App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
                            App.UI.setStatus(`Harvested ${totalHarvested} items (${harvestTypes.join(", ")})!`);
                        } else {
                            App.UI.setStatus("Nothing to harvest.");
                        }

                        if (char.currentMove.resolve) char.currentMove.resolve();
                        char.currentMove = null;
                    }
                } else {
                    char.currentMove.t += dt / stepTime;
                    const t = Math.min(1, char.currentMove.t);

                    // Easing formula to make the movement look smooth
                    const s = t * t * (3 - 2 * t);

                    char.x = char.currentMove.startX + (char.currentMove.targetX - char.currentMove.startX) * s;
                    char.y = char.currentMove.startY + (char.currentMove.targetY - char.currentMove.startY) * s;

                    // If the timer reaches 1 (100%), the move is finished
                    if (t >= 1) {
                        char.x = char.currentMove.targetX;
                        char.y = char.currentMove.targetY;

                        // Check if stepped in water
                        if (App.World.worldObjects.get(`${Math.round(char.x)},${Math.round(char.y)}`) === 'water') {
                             if (App.QuestManager) App.QuestManager.onStepInWater();
                        }

                        if (char.currentMove.resolve) char.currentMove.resolve(); // Resolve the promise!
                        char.currentMove = null; // Clear it so the next command can start
                    }
                }
            }
        }
    }

    // Expose the process function to the main game loop
    App.ActionQueue = {
        processCharacter
    };
})();
