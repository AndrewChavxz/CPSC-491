window.App = window.App || {};

(function () {
    const QuestManager = {
        activeQuest: null,
        timeRemaining: 0,

        // Quest 1 specific state
        q1TreesCut: 0,

        // Quest 2 specific state
        q2Failed: false,
        q2OakCut: 0,

        startQuest: function (quest) {
            this.activeQuest = quest;
            this.timeRemaining = 5 * 60; // 5 minutes in seconds

            // Reset specific states
            this.q1TreesCut = 0;
            this.q2Failed = false;
            this.q2OakCut = 0;

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

            // Give reward
            // e.g. "+40 Gold"
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

        update: function (dt) {
            if (!this.activeQuest) return;

            this.timeRemaining -= dt;
            if (this.timeRemaining <= 0) {
                this.failQuest("Time ran out!");
                return;
            }

            this.updateHUD();
        },

        updateHUD: function () {
            const timerEl = document.getElementById("active-quest-timer");
            const progressEl = document.getElementById("active-quest-progress");
            if (!timerEl || !progressEl || !this.activeQuest) return;

            const m = Math.floor(this.timeRemaining / 60);
            const s = Math.floor(this.timeRemaining % 60);
            timerEl.textContent = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;

            if (this.activeQuest.id === 1) {
                progressEl.textContent = `Trees Cut: ${this.q1TreesCut} / 6`;
            } else if (this.activeQuest.id === 2) {
                progressEl.textContent = `Oak Trees Cut: ${this.q2OakCut}\nStatus: ${this.q2Failed ? "FAILED" : "OK"}`;
            } else {
                progressEl.textContent = "";
            }
        },

        // Called from harvest logic
        onHarvest: function (type, variant) {
            if (!this.activeQuest) return;

            if (this.activeQuest.id === 1) {
                if (type.startsWith("tree")) {
                    this.q1TreesCut++;
                    this.updateHUD();

                    if (this.q1TreesCut >= 6) {
                        this.checkQuest1Rules();
                    }
                }
            } else if (this.activeQuest.id === 2) {
                // Quest 2: Cut only oak trees. Direct CUT without IF = fail.
                if (type === "tree" && variant === "tree_oak") {
                    this.q2OakCut++;
                    this.updateHUD();
                    if (this.q2OakCut >= 1) {
                        this.completeQuest();
                    }
                } else if (type === "tree") {
                    this.q2Failed = true;
                    this.failQuest("You cut a non-oak tree!");
                }

                if (this.activeQuest) {
                    this.updateHUD();
                }
            }
        },

        checkQuest1Rules: function () {
            // Quest 1: 1 REPEAT loop, 1 CUT block inside the loop, No duplicate CUT. Total blocks allowed: 3 or fewer.
            const workspace = App.BlocklyStuff.workspace;
            if (!workspace) return;

            const blocks = workspace.getAllBlocks(false);

            // exclude "on_start" block from the 3 total? 
            // "Total blocks allowed: 3 or fewer." Usually on_start might count? Let's say user needs: on_start, repeat, cut. That's 3. Plus maybe a number block for repeat?
            // "math_number" is usually a shadow block, which doesn't count in getTopBlocks but does in getAllBlocks.
            // Let's count non-shadow non-start blocks.
            let count = 0;
            let repeats = 0;
            let cuts = 0;

            blocks.forEach(b => {
                if (b.type === "on_start") return; // Usually don't penalize the required start block
                if (b.isShadow()) return; // Don't count the built-in number shadows
                count++;
                if (b.type === "controls_repeat_ext") repeats++;
                if (b.type === "harvest_dir") cuts++;
            });

            if (repeats > 1) {
                this.failQuest("Used more than 1 REPEAT loop.");
                return;
            }
            if (cuts > 1) {
                this.failQuest("Used more than 1 CUT block.");
                return;
            }
            if (count > 3) { // 1 repeat, 1 cut, 1 number block = 3 (if number is not shadow, or if it counts). Actually standard blockly repeat has shadow.
                this.failQuest("Used more than 3 blocks.");
                return;
            }

            // check if cut is inside repeat
            let cutInsideRepeat = false;
            blocks.forEach(b => {
                if (b.type === "harvest_dir") {
                    let parent = b.getParent();
                    while (parent) {
                        if (parent.type === "controls_repeat_ext") {
                            cutInsideRepeat = true;
                            break;
                        }
                        parent = parent.getParent();
                    }
                }
            });

            if (!cutInsideRepeat) {
                this.failQuest("CUT block must be inside the REPEAT loop.");
                return;
            }

            this.completeQuest();
        },

        checkQuest2RulesBeforeRun: function () {
            // Quest 2: Must use at least 1 IF statement. Direct CUT without IF = quest fails.
            const workspace = App.BlocklyStuff.workspace;
            if (!workspace) return true;

            const blocks = workspace.getAllBlocks(false);
            let hasIf = false;
            let cutWithoutIf = false;

            blocks.forEach(b => {
                if (b.type === "controls_if") hasIf = true;
                if (b.type === "harvest_dir") {
                    let parent = b.getParent();
                    let insideIf = false;
                    while (parent) {
                        if (parent.type === "controls_if") {
                            insideIf = true;
                            break;
                        }
                        parent = parent.getParent();
                    }
                    if (!insideIf) {
                        cutWithoutIf = true;
                    }
                }
            });

            if (!hasIf) {
                this.failQuest("Must use at least 1 IF statement.");
                return false;
            }
            if (cutWithoutIf) {
                this.failQuest("Direct CUT without IF is not allowed.");
                return false;
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
