window.App = window.App || {};

/**
 * ui-shop.js
 * 
 * This file contains all the button logic and screen transitions 
 * for the Shop, Gold Exchange, and Building Purchase menus.
 */
(function () {
    document.addEventListener('DOMContentLoaded', () => {
        // -------------------- Grab all HTML Elements --------------------
        const shopBtn = document.getElementById("shop-btn");
        const shopScreen = document.getElementById("shop-screen");
        const closeShopBtn = document.getElementById("close-shop-btn");

        const goldBtn = document.getElementById("shop-gold-btn");
        const buildingsBtn = document.getElementById("shop-buildings-btn");

        const goldScreen = document.getElementById("gold-exchange-screen");
        const closeGoldBtn = document.getElementById("close-gold-btn");

        const buildingsScreen = document.getElementById("buildings-screen");
        const closeBuildingsBtn = document.getElementById("close-buildings-btn");

        const exchangeTreesBtn = document.getElementById("exchange-trees-btn");
        const exchangeRocksBtn = document.getElementById("exchange-rocks-btn");

        const buyCabinBtn = document.getElementById("buy-cabin-btn");
        const buyHouse1Btn = document.getElementById("buy-house1-btn");
        const buyHouse2Btn = document.getElementById("buy-house2-btn");
        const buyHouse3Btn = document.getElementById("buy-house3-btn");

        // If the HTML buttons exist, attach the click logic
        if (shopBtn) {

            // ---------- Main Shop Menu Handling ----------

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

            buildingsBtn.addEventListener("click", () => {
                shopScreen.classList.add("hidden");
                buildingsScreen.classList.remove("hidden");
            });

            // ---------- Sub-Menu Handling ----------

            closeGoldBtn.addEventListener("click", () => {
                goldScreen.classList.add("hidden");
                shopScreen.classList.remove("hidden");
            });

            closeBuildingsBtn.addEventListener("click", () => {
                buildingsScreen.classList.add("hidden");
                shopScreen.classList.remove("hidden");
            });

            // ---------- Resource Exchange Mechanics ----------

            exchangeTreesBtn.addEventListener("click", () => {
                if (App.Engine.gameState.treeCount >= 5) {
                    // Take away 5 trees, give 2 gold
                    App.Engine.gameState.treeCount -= 5;
                    App.Engine.gameState.goldCount += 2;

                    App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
                    if (App.Storage) App.Storage.saveToStorage();
                } else {
                    alert("Not enough trees! You need 5 trees to get 2 gold.");
                }
            });

            exchangeRocksBtn.addEventListener("click", () => {
                if (App.Engine.gameState.rockCount >= 5) {
                    // Take away 5 rocks, give 3 gold
                    App.Engine.gameState.rockCount -= 5;
                    App.Engine.gameState.goldCount += 3;

                    App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
                    if (App.Storage) App.Storage.saveToStorage();
                } else {
                    alert("Not enough rocks! You need 5 rocks to get 3 gold.");
                }
            });

            // ---------- Building Purchase Mechanics ----------

            /**
             * Helper function to buy any building
             * @param {string} btnName - (Internal tracking, optional)
             * @param {number} cost - The gold required to buy
             * @param {string} buildingName - What the user is given in their inventory
             */
            function buyBuilding(btnName, cost, buildingName) {
                if (App.Engine.gameState.goldCount >= cost) {
                    // Take the gold
                    App.Engine.gameState.goldCount -= cost;

                    // Add the building to inventory
                    App.Engine.gameState.buildings.push(buildingName);

                    App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
                    if (App.Storage) App.Storage.saveToStorage();

                    alert(`${buildingName} purchased!`);
                } else {
                    alert(`Not enough gold! You need ${cost} gold.`);
                }
            }

            buyCabinBtn.addEventListener("click", () => buyBuilding("buy-cabin", 5, "Cabin"));
            buyHouse1Btn.addEventListener("click", () => buyBuilding("buy-house1", 10, "House 1"));
            buyHouse2Btn.addEventListener("click", () => buyBuilding("buy-house2", 10, "House 2"));
            buyHouse3Btn.addEventListener("click", () => buyBuilding("buy-house3", 10, "House 3"));
        }
    });

})();
