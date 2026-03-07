window.App = window.App || {};

/**
 * ui-inventory.js
 * 
 * This file controls the player's personal building inventory.
 * It dynamically draws the list based on what was purchased,
 * and handles the logic allowing the user to click on the map to place it.
 */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        // -------------------- State and Elements --------------------
        let isPlacingBuilding = false;
        let placingBuildingType = "";

        const inventoryBtn = document.getElementById("inventory-btn");
        const inventoryScreen = document.getElementById("inventory-screen");
        const closeInventoryBtn = document.getElementById("close-inventory-btn");
        const inventoryContainer = document.getElementById("inventory-container");

        if (inventoryBtn) {

            // ---------- Open Inventory ----------

            inventoryBtn.addEventListener("click", () => {
                inventoryContainer.innerHTML = ""; // Clear old items

                // Count up how many of each building type the player owns
                const counts = {};
                App.Engine.gameState.buildings.forEach(b => {
                    counts[b] = (counts[b] || 0) + 1;
                });

                if (Object.keys(counts).length === 0) {
                    inventoryContainer.innerHTML = "<p>No buildings in inventory. Go to the shop!</p>";
                } else {
                    // Generate a UI card for every building type
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

                    // Attach click listeners to the dynamically created "Place" buttons
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

            // ---------- Close Inventory ----------

            closeInventoryBtn.addEventListener("click", () => {
                inventoryScreen.classList.add("hidden");
            });
        }

        // ---------- Map Interaction ----------

        // Listen for mouse movement to show a preview if placing
        App.Engine.canvas.addEventListener("mousemove", (e) => {
            // If we aren't currently placing something, clear any ghost preview and stop
            if (!isPlacingBuilding) {
                if (App.Engine.setPreviewBuilding) App.Engine.setPreviewBuilding(null);
                return;
            }

            // Find out exactly which tile the mouse is hovering over
            const rect = App.Engine.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            const isoPos = App.Engine.screenToIso(x, y);

            // Tell the Engine to render a semi-transparent building as a preview
            App.Engine.setPreviewBuilding(isoPos.x, isoPos.y, placingBuildingType);
        });

        // Listen for actual mouse clicks to drop the building
        App.Engine.canvas.addEventListener("click", (e) => {
            // If we're not currently placing a building, do nothing
            if (!isPlacingBuilding) return;

            const rect = App.Engine.canvas.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;

            // Convert the screen click coordinates to the isometric map coordinates
            const isoPos = App.Engine.screenToIso(x, y);

            // Attempt to tell the world to place the building
            if (App.World.placeBuilding(isoPos.x, isoPos.y, placingBuildingType)) {

                // Success! Remove exactly ONE copy of that building from the inventory array
                const idx = App.Engine.gameState.buildings.indexOf(placingBuildingType);
                if (idx > -1) App.Engine.gameState.buildings.splice(idx, 1);

                // Turn off placement mode
                isPlacingBuilding = false;
                App.Engine.setPreviewBuilding(null);
                App.UI.setStatus(`Placed ${placingBuildingType}.`);
            } else {
                // Failed (tile is blocked or invalid)
                App.UI.setStatus("Cannot place building there!");
            }
        });

        // Right-click instantly cancels placement
        App.Engine.canvas.addEventListener("contextmenu", (e) => {
            if (isPlacingBuilding) {
                e.preventDefault(); // Stop normal right click menu
                isPlacingBuilding = false;
                App.Engine.setPreviewBuilding(null);
                App.UI.setStatus("Placement cancelled.");
            }
        });

    });
})();
