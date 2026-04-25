window.App = window.App || {};

/**
 * ui-quests.js
 * 
 * This file handles the logic for the "Start Screen" of the game,
 * as well as generating the list of quests the player can pick from.
 */
(function () {
    document.addEventListener('DOMContentLoaded', () => {

        // -------------------- Start Screen --------------------
        const startScreen = document.getElementById("start-screen");
        const appDiv = document.getElementById("app");

        if (startScreen) {
            // Ensure the main game is hidden while the start screen is up
            appDiv.style.display = "none";

            document.getElementById("start-game-btn").addEventListener("click", () => {
                // Fade out the start screen
                startScreen.style.opacity = 0;

                // Start looping background audio
                if (!window.bgAudio) {
                    window.bgAudio = new Audio("audio/falling leaves.MP3");
                    window.bgAudio.loop = true;
                    window.bgAudio.volume = 0.4; // Soft background volume
                }
                window.bgAudio.play().catch(e => console.warn("Audio prevented:", e));

                // Wait 0.2 seconds, then remove it completely and show the game
                setTimeout(() => {
                    startScreen.style.display = "none";
                    appDiv.style.display = "grid";

                    // Let the engine and Blockly know the screen changed so they fix their sizes
                    if (App.Engine.resizeCanvas) App.Engine.resizeCanvas();
                    if (App.BlocklyStuff && App.BlocklyStuff.workspace) {
                        Blockly.svgResize(App.BlocklyStuff.workspace);
                    }
                }, 200);
            });

            const exitBtn = document.getElementById("exit-btn");
            if (exitBtn) {
                exitBtn.addEventListener("click", () => {
                    appDiv.style.display = "none";
                    startScreen.style.display = "";
                    startScreen.style.opacity = 1;

                    // Pause background audio when returning to menu
                    if (window.bgAudio) {
                        window.bgAudio.pause();
                    }

                    // Stop any running scripts
                    if (App.Input && App.Input.stopScript) {
                        App.Input.stopScript();
                    }
                });
            }
        }

        // -------------------- Quest Data --------------------

        // The master list of all available quests in the game
        const questsData = [
            {
                id: 1,
                title: "QUEST 1 - The Maze Solver",
                objective: "Navigate through a dense forest path without hitting any trees.",
                rules: [
                    "Must use: Turn blocks",
                    "Hitting a tree fails the quest"
                ],
                reward: "+50 Gold",
                teaches: ["Using loops and conditionals to navigate a path."]
            },
            {
                id: 2,
                title: "QUEST 2 - The Zamboni",
                objective: "Clear an area of all trees.",
                rules: [
                    "Must use: Nested REPEAT loops",
                    "Must cut at least 10 trees"
                ],
                reward: "+100 Gold",
                teaches: ["Using nested loops to walk back and forth in a grid pattern."]
            },
            {
                id: 3,
                title: "QUEST 3 - The Seeker",
                objective: "Find and cut the 3 closest trees using radar.",
                rules: [
                    "Must use: Distance sensor blocks",
                    "Must cut exactly 3 trees"
                ],
                reward: "+150 Gold",
                teaches: ["Using radar sensors for smarter AI behaviors."]
            },
            {
                id: 4,
                title: "QUEST 4 - The Courier",
                objective: "Harvest 5 trees, then return to your Base (the Cabin) and drop the wood.",
                rules: [
                    "Must use: Drop Resources block",
                    "Must be standing on Base when dropping resources",
                    "Must have cut at least 5 trees"
                ],
                reward: "+200 Gold",
                teaches: ["Locations and dropping off inventory."]
            },
            {
                id: 5,
                title: "QUEST 5 - Nature Preserve",
                objective: "Move far away from the start without cutting any trees or stepping on water.",
                rules: [
                    "Must travel at least 15 tiles away from the start",
                    "Cutting any trees fails the quest",
                    "Stepping on water fails the quest"
                ],
                reward: "+500 Gold",
                teaches: ["Hazard avoidance and anti-goals."]
            }
        ];

        // -------------------- Quest Screens --------------------

        const questBtn = document.getElementById("quest-btn");
        const questsListScreen = document.getElementById("quests-list-screen");
        const closeQuestsBtn = document.getElementById("close-quests-btn");

        const questDetailsScreen = document.getElementById("quest-details-screen");
        const closeQuestDetailsBtn = document.getElementById("close-quest-details-btn");
        const questsContainer = document.getElementById("quests-container");

        if (questBtn) {

            // ---------- Populating the Quest List ----------

            if (questsContainer) {
                // Read through all quests and generate the UI for each
                questsData.forEach(quest => {
                    const item = document.createElement("div");
                    item.className = "quest-list-item";

                    item.innerHTML = `
            <h3>${quest.title}</h3>
            <p>${quest.objective.replace(/\n/g, '<br>')}</p>
          `;

                    // Clicking it opens up the deeper detail screen
                    item.addEventListener("click", () => {
                        openQuestDetails(quest);
                    });

                    questsContainer.appendChild(item);
                });
            }

            // ---------- Screen Handlers ----------

            questBtn.addEventListener("click", () => {
                questsListScreen.classList.remove("hidden");
            });

            closeQuestsBtn.addEventListener("click", () => {
                questsListScreen.classList.add("hidden");
            });

            closeQuestDetailsBtn.addEventListener("click", () => {
                // Go back from details to the main list
                questDetailsScreen.classList.add("hidden");
                questsListScreen.classList.remove("hidden");
            });

            /**
             * Injects all the data from a single quest into the details interface
             */
            function openQuestDetails(quest) {
                document.getElementById("qd-title").textContent = quest.title;
                document.getElementById("qd-objective").innerHTML = quest.objective.replace(/\n/g, '<br>');

                const rulesList = document.getElementById("qd-rules");
                rulesList.innerHTML = quest.rules.map(r => `<li>${r}</li>`).join("");

                document.getElementById("qd-reward").textContent = quest.reward;

                const teachesList = document.getElementById("qd-teaches");
                teachesList.innerHTML = quest.teaches.map(t => `<li>${t}</li>`).join("");

                const startBtn = document.getElementById("start-quest-btn");
                if (startBtn) {
                    startBtn.onclick = () => {
                        // Tell the active Quest Engine to start tracking it
                        App.QuestManager.startQuest(quest);

                        // Hide the UI popups
                        questDetailsScreen.classList.add("hidden");
                        questsListScreen.classList.add("hidden");
                    }
                }

                // Swap the views from List -> Details
                questsListScreen.classList.add("hidden");
                questDetailsScreen.classList.remove("hidden");
            }
        }
    });
})();
