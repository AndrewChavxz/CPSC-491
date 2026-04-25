window.App = window.App || {};

/**
 * world.js
 * 
 * This file handles the game's grid map and the objects on it (like trees, rocks, and buildings).
 * It provides functions to generate a new world, check if a spot is walkable, 
 * place new buildings, and harvest objects from the board.
 */
(function () {
    // A Map to store all objects on the grid. 
    // The key is a string "x,y" (like "5,10") and the value is the object type (like "tree_oak").
    const worldObjects = new Map();

    /**
     * Generates a random world filled with clusters of trees and rocks.
     * Ensures a safe zone around the spawn area (20, 20).
     * @param {number} gridCols - The total number of columns in the grid.
     * @param {number} gridRows - The total number of rows in the grid.
     */
    function generateWorld(gridCols, gridRows) {
        const numClusters = 180; // Total number of resource clusters

        for (let c = 0; c < numClusters; c++) {
            // Pick a random center for the cluster
            const cx = Math.floor(Math.random() * gridCols);
            const cy = Math.floor(Math.random() * gridRows);

            // Determine if this is a tree cluster or rock cluster
            const isTreeCluster = Math.random() < 0.6; // 60% chance for trees
            const clusterSize = 10 + Math.random() * 30; // 10 to 40 items per cluster

            for (let k = 0; k < clusterSize; k++) {
                // Add some random offset to spread out the cluster
                const ox = Math.floor((Math.random() + Math.random() + Math.random() - 1.5) * 8);
                const oy = Math.floor((Math.random() + Math.random() + Math.random() - 1.5) * 8);
                const px = cx + ox;
                const py = cy + oy;

                // Check if the new position is within the grid
                if (px >= 0 && px < gridCols && py >= 0 && py < gridRows) {
                    // Keep a safe zone around the character's starting position (20, 20)
                    if (Math.abs(px - 20) < 4 && Math.abs(py - 20) < 4) continue;

                    // Mostly match the cluster type, but sometimes mix it up
                    const typeCategory = Math.random() < 0.8 ? (isTreeCluster ? 'tree' : 'rock') : (isTreeCluster ? 'rock' : 'tree');

                    // Pick the specific image variant
                    let variant;
                    if (typeCategory === 'tree') {
                        variant = Math.random() < 0.5 ? 'tree_oak' : 'tree_pine';
                    } else {
                        variant = Math.random() < 0.5 ? 'rock_2' : 'rock_3';
                    }

                    worldObjects.set(`${px},${py}`, variant);
                }
            }
        }

        // Generate water patches
        const numWaterPatches = 20;
        for (let w = 0; w < numWaterPatches; w++) {
            const cx = Math.floor(Math.random() * gridCols);
            const cy = Math.floor(Math.random() * gridRows);
            const waterSize = 10 + Math.random() * 20;
            for (let k = 0; k < waterSize; k++) {
                const ox = Math.floor((Math.random() + Math.random() - 1) * 6);
                const oy = Math.floor((Math.random() + Math.random() - 1) * 6);
                const px = cx + ox;
                const py = cy + oy;
                if (px >= 0 && px < gridCols && py >= 0 && py < gridRows) {
                    if (Math.abs(px - 20) < 5 && Math.abs(py - 20) < 5) continue; // Safe zone
                    worldObjects.set(`${px},${py}`, 'water'); // Overwrite whatever was there
                }
            }
        }
    }

    /**
     * Checks if a specific grid coordinate is free to walk on.
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @returns {boolean} True if the tile is empty (or water) and within bounds.
     */
    function isWalkable(x, y) {
        // Check if the coordinates are outside the map boundaries
        if (x < 0 || x >= App.Engine.gridCols || y < 0 || y >= App.Engine.gridRows) return false;

        // Check if there is an object (tree/rock/building) occupying this tile
        const i = Math.round(x);
        const j = Math.round(y);
        if (worldObjects.has(`${i},${j}`)) {
            const obj = worldObjects.get(`${i},${j}`);
            if (obj === 'water') return true; // You can walk into water, but it might fail quests!
            return false;
        }

        return true; // The tile is walkable!
    }

    /**
     * Attempts to place a building onto the grid.
     * @param {number} x - The x coordinate
     * @param {number} y - The y coordinate
     * @param {string} variant - The type of building to place
     * @returns {boolean} True if successfully placed, false if blocked.
     */
    function placeBuilding(x, y, variant) {
        const i = Math.round(x);
        const j = Math.round(y);

        // The cell must be totally free
        if (!isWalkable(i, j)) return false;

        // Prevent placing a building right on the spawn area
        if (Math.abs(i - 20) < 4 && Math.abs(j - 20) < 4) return false;

        // Check characters
        for (const char of App.Engine.characters) {
            if (Math.round(char.x) === i && Math.round(char.y) === j) return false;
        }

        worldObjects.set(`${i},${j}`, `building_${variant}`);

        // Save the game state if storage is ready
        if (App.Storage) App.Storage.saveToStorage();
        return true;
    }

    /**
     * Removes an object from the grid and gives the player resources.
     * @param {number} x - The x coordinate to harvest from
     * @param {number} y - The y coordinate to harvest from
     * @returns {string|null} The type of the harvested object, or null if nothing was there.
     */
    function harvestObject(x, y) {
        const i = Math.round(x);
        const j = Math.round(y);
        const key = `${i},${j}`;

        if (worldObjects.has(key)) {
            const type = worldObjects.get(key);
            worldObjects.delete(key); // Remove it from the map

            // Increase the correct resource counter
            if (type.startsWith('tree')) {
                App.Engine.gameState.treeCount++;
                return type;
            } else if (type.startsWith('rock')) {
                App.Engine.gameState.rockCount++;
                return type;
            } else if (type.startsWith('building_')) {
                const bName = type.replace('building_', '');
                App.Engine.gameState.buildings.push(bName);
                return type;
            }
        }
        return null; // Nothing found to harvest
    }

    // Expose these functions to the rest of the application
    App.World = {
        worldObjects,
        generateWorld,
        isWalkable,
        placeBuilding,
        harvestObject
    };
})();
