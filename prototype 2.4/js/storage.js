window.App = window.App || {};

/**
 * storage.js
 * 
 * This file handles saving the game state (like how many trees you have, 
 * what buildings you've placed, and where the characters are) to the 
 * browser's Local Storage so your progress isn't lost when you refresh.
 */
(function () {
    const STORAGE_KEY = "isogrid_save_v1";

    /**
     * Saves all current game data to localStorage.
     */
    function saveToStorage() {
        try {
            console.log("Saving to storage:", App.Engine.characters.length, "characters");

            // Package up all the data we need to save into one object
            const data = {
                // Save minimal character data (we don't need to save the moveQueue)
                characters: App.Engine.characters.map(c => ({
                    id: c.id,
                    x: c.x, y: c.y,
                    color: c.color,
                    facingRight: c.facingRight,
                    workspaceXML: c.workspaceXML
                })),
                activeCharId: App.Engine.getActiveCharacter()?.id || null,

                // Save the players resources and unlocked buildings
                gameState: {
                    treeCount: App.Engine.gameState.treeCount,
                    rockCount: App.Engine.gameState.rockCount,
                    goldCount: App.Engine.gameState.goldCount,
                    buildings: App.Engine.gameState.buildings
                },

                // Save the grid map by turning the map into an array of entries
                worldObjects: Array.from(App.World.worldObjects.entries())
            };

            // Convert it to a text string and save it
            localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
        } catch (e) {
            console.error("Save failed:", e);
        }
    }

    /**
     * Tries to load existing game data from localStorage.
     * @returns {boolean} True if a save file was found and loaded successfully, otherwise false.
     */
    function loadFromStorage() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY);
            console.log("Loading from storage, raw:", raw);

            // If there's no save file, return false so the engine knows to generate a new world
            if (!raw) return false;

            const data = JSON.parse(raw);
            if (!Array.isArray(data.characters)) return false;

            // Restore all characters
            App.Engine.characters.length = 0; // Clear the existing character array
            data.characters.forEach(c => {
                // Add each character back using the saved data, restoring default properties
                const char = {
                    id: c.id,
                    x: c.x, y: c.y,
                    color: c.color,
                    speed: 4.8,
                    facingRight: c.facingRight || false,
                    workspaceXML: c.workspaceXML || null,
                    moveQueue: [],
                    currentMove: null
                };
                App.Engine.characters.push(char);

                // Force old characters to fit into the new map dimensions
                if (App.Engine.clampPlayer) {
                    App.Engine.clampPlayer(char);
                }
            });

            // Restore the active character ID
            App.Engine.setActiveCharacter(data.activeCharId);

            // Restore the game counters and state
            if (data.gameState) {
                App.Engine.gameState.treeCount = data.gameState.treeCount || 0;
                App.Engine.gameState.rockCount = data.gameState.rockCount || 0;
                App.Engine.gameState.goldCount = data.gameState.goldCount || 0;
                App.Engine.gameState.buildings = data.gameState.buildings || [];
            }

            // Restore the grid map objects (trees, rocks, placed buildings)
            if (data.worldObjects) {
                App.World.worldObjects.clear();
                data.worldObjects.forEach(([k, v]) => App.World.worldObjects.set(k, v));
            } else {
                App.World.generateWorld(App.Engine.gridCols, App.Engine.gridRows);
            }

            console.log("Loaded characters:", App.Engine.characters);

            // Validate that the active ID exists; if it doesn't, pick the first character
            const loadedActiveCharId = App.Engine.getActiveCharacter()?.id;
            if (!loadedActiveCharId && App.Engine.characters.length > 0) {
                console.warn("Active char ID not found, resetting default.");
                App.Engine.setActiveCharacter(App.Engine.characters[0].id);
            }
            return true;

        } catch (e) {
            console.error("Failed to load save", e);
            return false;
        }
    }

    // Expose these storage functions to the application
    App.Storage = {
        saveToStorage,
        loadFromStorage
    };
})();
