window.App = window.App || {};

(function () {
    const QuestManager = {
        activeQuest: null,
        timeRemaining: 0,

        // Quest states
        q2TreesCut: 0,
        q3TreesCut: 0,
        q4TreesCut: 0,

        // -------------------- Quest Lifecycle --------------------
        // Starts a quest, setting up the timer and UI
        startQuest: function (quest) {
            this.activeQuest = quest;
            this.timeRemaining = 5 * 60; // 5 minutes in seconds

            this.q2TreesCut = 0;
            this.q3TreesCut = 0;
            this.q4TreesCut = 0;

            const hud = document.getElementById("active-quest-hud");
            const title = document.getElementById("active-quest-title");
            const objective = document.getElementById("active-quest-objective");

            if (hud && title && objective) {
                hud.classList.remove("hidden");
                title.textContent = quest.title;
                objective.textContent = quest.objective;
                this.updateHUD();
            }
            App.UI.setStatus("Quest Started: " + quest.title);
        },

        cancelQuest: function () {
            this.activeQuest = null;
            const hud = document.getElementById("active-quest-hud");
            if (hud) hud.classList.add("hidden");
            App.UI.setStatus("Quest Cancelled.");
        },

        failQuest: function (reason) {
            this.activeQuest = null;
            const hud = document.getElementById("active-quest-hud");
            if (hud) hud.classList.add("hidden");
            App.UI.setStatus("Quest Failed: " + reason);
            setTimeout(() => {
                alert("Quest Failed!\nReason: " + reason);
            }, 10);
        },

        completeQuest: function () {
            if (!this.activeQuest) return;

            const rewardMatch = this.activeQuest.reward.match(/\+(\d+)\s+Gold/);
            if (rewardMatch) {
                const amount = parseInt(rewardMatch[1], 10);
                App.Engine.gameState.goldCount += amount;
                App.UI.updateCounters(App.Engine.gameState.treeCount, App.Engine.gameState.rockCount, App.Engine.gameState.goldCount);
                App.Storage.saveToStorage();
            }

            App.UI.setStatus("Quest Completed! You earned " + this.activeQuest.reward);
            const rewardMsg = "Quest Complete!\nYou earned " + this.activeQuest.reward;
            setTimeout(() => {
                alert(rewardMsg);
            }, 10);

            this.activeQuest = null;
            const hud = document.getElementById("active-quest-hud");
            if (hud) hud.classList.add("hidden");
        },

        // -------------------- Main Loop Update --------------------
        // Called every frame to check distance requirements and countdown the timer
        update: function (dt) {
            if (!this.activeQuest) return;

            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.failQuest("Time ran out!");
                return;
            }

            const char = App.Engine.getActiveCharacter();
            if (char && char.homeX !== undefined) {
                const dist = Math.abs(Math.round(char.x) - char.homeX) + Math.abs(Math.round(char.y) - char.homeY);
                if (this.activeQuest && this.activeQuest.id === 1 && dist >= 8) {
                    this.completeQuest();
                }
                if (this.activeQuest && this.activeQuest.id === 5 && dist >= 15) {
                    this.completeQuest();
                }
            }

            this.updateHUD();
        },

        // -------------------- UI Rendering --------------------
        // Refreshes the on-screen progress text for the active quest
        updateHUD: function () {
            const timerEl = document.getElementById("active-quest-timer");
            const progressEl = document.getElementById("active-quest-progress");
            if (!timerEl || !progressEl || !this.activeQuest) return;

            const m = Math.floor(this.timeRemaining / 60);
            const s = Math.floor(this.timeRemaining % 60);
            timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            const char = App.Engine.getActiveCharacter();
            let dist = 0;
            if (char && char.homeX !== undefined) {
                dist = Math.abs(Math.round(char.x) - char.homeX) + Math.abs(Math.round(char.y) - char.homeY);
            }

            if (this.activeQuest.id === 1) {
                progressEl.textContent = `Distance: ${dist} / 8`;
            } else if (this.activeQuest.id === 2) {
                progressEl.textContent = `Trees Cut: ${this.q2TreesCut} / 10`;
            } else if (this.activeQuest.id === 3) {
                progressEl.textContent = `Trees Cut: ${this.q3TreesCut} / 3`;
            } else if (this.activeQuest.id === 4) {
                progressEl.textContent = `Trees Cut: ${this.q4TreesCut} / 5. (Return to Base to drop!)`;
            } else if (this.activeQuest.id === 5) {
                progressEl.textContent = `Distance: ${dist} / 15`;
            } else {
                progressEl.textContent = "";
            }
        },

        // -------------------- Event Listeners --------------------
        // Called when the character successfully chops a tree or breaks a rock
        onHarvest: function (type, variant) {
            if (!this.activeQuest) return;

            if (this.activeQuest.id === 2) {
                if (type.startsWith("tree")) {
                    this.q2TreesCut++;
                    this.updateHUD();
                    if (this.q2TreesCut >= 10) this.completeQuest();
                }
            } else if (this.activeQuest.id === 3) {
                if (type.startsWith("tree")) {
                    this.q3TreesCut++;
                    this.updateHUD();
                    if (this.q3TreesCut >= 3) this.completeQuest();
                }
            } else if (this.activeQuest.id === 4) {
                if (type.startsWith("tree")) {
                    this.q4TreesCut++;
                    this.updateHUD();
                }
            } else if (this.activeQuest.id === 5) {
                if (type.startsWith("tree")) {
                    this.failQuest("You cut a tree!");
                }
            }
        },

        onDropResources: function () {
            if (!this.activeQuest) return;
            if (this.activeQuest.id === 4) {
                if (!App.GameAPI.isOnBase()) {
                    this.failQuest("You must be standing on the Cabin to drop resources.");
                } else if (this.q4TreesCut < 5) {
                    this.failQuest("You haven't cut enough trees to drop off yet.");
                } else {
                    this.completeQuest();
                }
            }
        },

        onStepInWater: function () {
            if (!this.activeQuest) return;
            if (this.activeQuest.id === 5) {
                this.failQuest("You stepped in water!");
            }
        },

        onHitObstacle: function () {
            if (!this.activeQuest) return;
            if (this.activeQuest.id === 1) {
                this.failQuest("You hit an obstacle!");
            }
        },

        // -------------------- Rules & Validation --------------------
        // Scans the Blockly workspace before execution to ensure rules are followed
        checkRulesBeforeRun: function () {
            if (!this.activeQuest) return true;
            
            const workspace = App.BlocklyStuff.workspace;
            if (!workspace) return true;

            const blocks = workspace.getAllBlocks(false);
            
            let turns = 0;
            let nestedLoops = false;
            let distanceSensors = 0;
            let dropBlocks = 0;

            blocks.forEach(b => {
                if (b.type === "turn_left" || b.type === "turn_right") turns++;
                if (b.type === "distance_to") distanceSensors++;
                if (b.type === "drop_resources") dropBlocks++;
                
                if (b.type === "controls_repeat_ext") {
                    let parent = b.getParent();
                    while (parent) {
                        if (parent.type === "controls_repeat_ext") {
                            nestedLoops = true;
                            break;
                        }
                        parent = parent.getParent();
                    }
                }
            });

            if (this.activeQuest.id === 1) {
                if (turns === 0) { this.failQuest("Must use Turn blocks."); return false; }
            } 
            else if (this.activeQuest.id === 2) {
                if (!nestedLoops) { this.failQuest("Must use Nested REPEAT loops."); return false; }
            }
            else if (this.activeQuest.id === 3) {
                if (distanceSensors === 0) { this.failQuest("Must use Distance sensor blocks."); return false; }
            }
            else if (this.activeQuest.id === 4) {
                if (dropBlocks === 0) { this.failQuest("Must use Drop Resources block."); return false; }
            }

            return true;
        }
    };

    App.QuestManager = QuestManager;

    // Hook up UI cancel button
    window.addEventListener('DOMContentLoaded', () => {
        const cancelBtn = document.getElementById("cancel-quest-btn");
        if (cancelBtn) {
            cancelBtn.addEventListener("click", () => QuestManager.cancelQuest());
        }
    });

})();
