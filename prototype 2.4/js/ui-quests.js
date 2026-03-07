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

            document.getElementById("settings-btn").addEventListener("click", () => {
                alert("Settings menu coming soon!");
            });
        }

        // -------------------- Quest Data --------------------

        // The master list of all available quests in the game
        const questsData = [
            {
                id: 1,
                title: "🟢 QUEST 1 — “Loop Master”",
                objective: "Cut 6 trees.",
                rules: [
                    "You may ONLY use:",
                    "1 REPEAT loop",
                    "1 CUT block inside the loop",
                    "No duplicate CUT blocks allowed.",
                    "Total blocks allowed: 3 or fewer."
                ],
                reward: "+40 Gold",
                teaches: ["Replacing repetition with loops."]
            },
            {
                id: 2,
                title: "🟢 QUEST 2 — “Conditional Thinker”",
                objective: "Cut only oak trees.",
                rules: [
                    "Must use at least 1 IF statement.",
                    "Cannot cut without a condition.",
                    "Direct CUT without IF = quest fails."
                ],
                reward: "+50 Gold",
                teaches: ["Decision-making logic."]
            },
            {
                id: 3,
                title: "🟡 QUEST 3 — “Minimal Code Challenge”",
                objective: "Cut 3 trees.",
                rules: [
                    "Must use fewer than 4 total blocks.",
                    "No wasted moves.",
                    "Efficiency matters."
                ],
                reward: "+60 Gold",
                teaches: ["Code optimization and simplicity."]
            },
            {
                id: 4,
                title: "🟡 QUEST 4 — “No Repetition Allowed”",
                objective: "Move forward 5 spaces and cut 1 tree.",
                rules: [
                    "You cannot place MOVE more than once.",
                    "Must use a loop.",
                    "Multiple MOVE blocks = quest fails."
                ],
                reward: "+60 Gold",
                teaches: ["Understanding abstraction and repetition control."]
            },
            {
                id: 5,
                title: "🟠 QUEST 5 — “Smart Loop”",
                objective: "Move until you reach a tree, then cut it.",
                rules: [
                    "Must use BOTH: REPEAT, IF",
                    "Hardcoding exact moves fails the quest.",
                    "Must rely on condition logic."
                ],
                reward: "+75 Gold",
                teaches: ["Loop + conditional interaction (basic AI behavior)."]
            },
            {
                id: 6,
                title: "🟠 QUEST 6 — “Energy Efficient Programmer”",
                objective: "Cut 4 trees.",
                rules: [
                    "Must use fewer than 8 commands.",
                    "Must use at least one loop.",
                    "No duplicate CUT blocks.",
                    "Energy is limited."
                ],
                reward: "+80 Gold",
                teaches: ["Efficient algorithm design."]
            },
            {
                id: 7,
                title: "🔵 QUEST 7 — “Boolean Builder”",
                objective: "Cut oak trees only when energy > 1.",
                rules: [
                    "Must use: IF, A comparison ( > ), AND condition.",
                    "Example logic: if tree == oak AND energy > 1",
                    "Missing condition logic fails quest."
                ],
                reward: "+100 Gold",
                teaches: ["Boolean operators and logical expressions."]
            },
            {
                id: 8,
                title: "🔴 QUEST 8 — “Professional Programmer”",
                objective: "Cut 5 trees.",
                rules: [
                    "Must use: IF, REPEAT",
                    "Must use fewer than 6 total blocks.",
                    "Cannot use more than 1 CUT block.",
                    "Redundant blocks fail quest."
                ],
                reward: "+120 Gold",
                teaches: ["Combining control flow structures efficiently."]
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
