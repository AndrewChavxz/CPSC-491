window.App = window.App || {};

(function () {
    // We remove the DOMContentLoaded wrapper here. 
    // Engine.js will explicitly call App.CharManager.init() when it is ready.
    const { workspace } = App.BlocklyStuff;
    const { setStatus } = App.UI;

    // -------------------- UI Updates --------------------
    // Refreshes the top-left character selection list
    function refreshCharList() {
        const list = document.getElementById("charList");
        console.log("Refreshing char list. Characters:", App.Engine.characters.length, App.Engine.characters);
        if (!list) return;
        list.innerHTML = "";

        App.Engine.characters.forEach(char => {
            const btn = document.createElement("button");
            btn.textContent = char.id;
            btn.style.backgroundColor = char.color;
            btn.style.margin = "5px";
            btn.onclick = () => switchToCharacter(char.id);

            const active = App.Engine.getActiveCharacter();
            if (active && active.id === char.id) {
                btn.style.border = "2px solid white";
                btn.style.fontWeight = "bold";
            } else {
                btn.style.border = "1px solid #555";
            }

            const container = document.createElement("div");
            container.style.display = "inline-flex";
            container.style.alignItems = "center";
            container.style.margin = "5px";

            const delBtn = document.createElement("button");
            delBtn.textContent = "x";
            delBtn.style.fontSize = "10px";
            delBtn.style.marginLeft = "2px";
            delBtn.style.padding = "2px 5px";
            delBtn.style.background = "#555";
            delBtn.onclick = (e) => {
                e.stopPropagation(); // prevent select
                if (confirm(`Delete ${char.id}?`)) {
                    const isActive = (char.id === App.Engine.getActiveCharacter()?.id);

                    App.Engine.deleteCharacter(char.id);

                    if (isActive) {
                        const newActive = App.Engine.getActiveCharacter();
                        if (newActive) {
                            // Pass false to skip saving the DELETED character's code into the NEW character's storage
                            switchToCharacter(newActive.id, false);
                        } else {
                            createNewCharacter();
                        }
                    }
                    refreshCharList();
                }
            };

            container.appendChild(btn);
            container.appendChild(delBtn);
            list.appendChild(container);
        });

        // ----------------------------------------------------
        // Fix for Blockly workspace squishing when list changes height
        if (workspace && typeof Blockly !== 'undefined' && Blockly.svgResize) {
            // Need to let the browser relayout the DOM flexbox before Blockly measures it
            setTimeout(() => {
                Blockly.svgResize(workspace);
            }, 50);
        }
    }

    let isSwitching = false;

    // -------------------- Workspace Loading & Switching --------------------

    // Helper to safely parse XML strings into DOM elements
    function textToDom(text) {
        if (typeof Blockly.Xml.textToDom === 'function') {
            return Blockly.Xml.textToDom(text);
        }
        // Fallback for newer Blockly versions or if helper is missing
        if (Blockly.utils && Blockly.utils.xml && typeof Blockly.utils.xml.textToDom === 'function') {
            return Blockly.utils.xml.textToDom(text);
        }
        // Manual DOM parser
        const oParser = new DOMParser();
        const dom = oParser.parseFromString(text, "text/xml");
        // check for errors?
        return dom.documentElement;
    }

    // Core function that swaps the currently active character and loads their blocks
    function switchToCharacter(id, saveCurrent = true) {
        console.log(`[Switch] Request to switch to ${id}. saveCurrent=${saveCurrent}`);
        try {
            isSwitching = true; // Block auto-save
            const current = App.Engine.getActiveCharacter();
            if (current && saveCurrent) {
                // Save current workspace BEFORE switching active char
                const xmlDom = Blockly.Xml.workspaceToDom(workspace);
                const xmlText = Blockly.Xml.domToText(xmlDom);
                current.workspaceXML = xmlText;
                console.log(`[Switch] Saved ${current.id} workspace. XML len: ${xmlText.length}`);
                App.Storage.saveToStorage();
            } else {
                console.log("[Switch] No current character or saveCurrent=false. Skipping save.");
            }

            App.Engine.setActiveCharacter(id);
            const next = App.Engine.getActiveCharacter();
            console.log(`[Switch] Active set to ${id}. Loading workspace...`);

            // Load next workspace
            workspace.clear(); // This triggers 'delete' events, which we now ignore
            if (next && next.workspaceXML) {
                console.log(`[Switch] Loading XML for ${next.id}. Len: ${next.workspaceXML.length}`);
                try {
                    const xml = textToDom(next.workspaceXML);
                    Blockly.Xml.domToWorkspace(xml, workspace);
                } catch (e) {
                    console.error("Failed to load workspace for " + id, e);
                    // Fallback to default
                    const defaultXml = document.getElementById("startBlocks");
                    if (defaultXml) Blockly.Xml.domToWorkspace(defaultXml, workspace);
                }
            } else {
                console.log(`[Switch] No XML for ${next ? next.id : 'null'}, loading default.`);
                // Load default start block if empty
                const defaultXml = document.getElementById("startBlocks");
                if (defaultXml) {
                    Blockly.Xml.domToWorkspace(defaultXml, workspace);
                }
            }

            // Allow main.js or other listeners to know we switched
            if (App.GameAPI && App.GameAPI.resetQueue) {
                App.GameAPI.resetQueue();
            }

            refreshCharList();
            setStatus(`Selected ${id}`);
        } catch (err) {
            console.error("Error switching character:", err);
            setStatus("Error switching character");
        } finally {
            isSwitching = false; // logic done, re-enable auto-save
            console.log("[Switch] Switch complete. Auto-save re-enabled.");
            // Force one save of the new state?
        }
    }

    // -------------------- Character Creation --------------------
    // Generates a new character if the user has none or wants a new one
    function createNewCharacter() {
        // Find first available ID
        let idIndex = 1;
        while (App.Engine.characters.some(c => c.id === `char_${idIndex}`)) {
            idIndex++;
        }
        const id = `char_${idIndex}`;

        // Exact center position
        const x = 20;
        const y = 20;
        // Random color
        const colors = ["#ff6e6e", "#6eff6e", "#6e6eff", "#ffff6e", "#ff6eff", "#6effff"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        App.Engine.createCharacter(id, x, y, color);
        App.Storage.saveToStorage(); // Save new char
        switchToCharacter(id);
    }

    // Auto-save on block changes
    // -------------------- Auto-Save Integration --------------------
    // Triggers every time the user drags or connects a block
    function onBlocklyChange(event) {
        if (isSwitching) return; // Prevent saving during switch (e.g. clearing workspace)
        if (event.type === Blockly.Events.UI) return; // Ignore UI events like scrolling

        const current = App.Engine.getActiveCharacter();
        if (current) {
            // console.log(`[AutoSave] Saving ${current.id}...`); // Optional: might spam
            const xml = Blockly.Xml.workspaceToDom(workspace);
            current.workspaceXML = Blockly.Xml.domToText(xml);
            App.Storage.saveToStorage();
        } else {
            console.warn("[AutoSave] No active character!");
        }
    }
    workspace.addChangeListener(onBlocklyChange);

    // Initial load handling logic packaged into an init function
    // -------------------- Initialization --------------------
    // Called once when the game loads to restore the last active character
    function init() {
        try {
            const initialChar = App.Engine.getActiveCharacter();
            if (initialChar && initialChar.workspaceXML) {
                try {
                    workspace.clear(); // Prevent duplicate blocks on refresh
                    const xml = textToDom(initialChar.workspaceXML);
                    Blockly.Xml.domToWorkspace(xml, workspace);
                    setStatus(`Loaded ${initialChar.id}`);
                } catch (blocklyErr) {
                    console.error("Failed to restore workspace on init:", blocklyErr);
                    setStatus(`Error loading ${initialChar.id} workspace`);
                }
            }
        } catch (err) {
            console.error("Critical error during char-manager init:", err);
        } finally {
            // Always refresh list so users can see/delete characters even if load fails
            // It uses a timeout here to ensure it runs after the DOM processes the panel insertion.
            setTimeout(refreshCharList, 10);
        }

        // Initial UI Setup removed to only allow one character
        if (workspace && typeof Blockly !== 'undefined' && Blockly.svgResize) {
            setTimeout(() => {
                Blockly.svgResize(workspace);
            }, 50);
        }
    }

    App.CharManager = {
        switchToCharacter,
        refreshCharList,
        init
    };
})();
