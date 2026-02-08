window.App = window.App || {};

(function () {
    const { createCharacter, getActiveCharacter, setActiveCharacter, characters } = App.Engine;
    const { workspace } = App.BlocklyStuff;
    const { setStatus } = App.UI;

    function refreshCharList() {
        const list = document.getElementById("charList");
        console.log("Refreshing char list. Characters:", characters.length, characters);
        if (!list) return;
        list.innerHTML = "";

        characters.forEach(char => {
            const btn = document.createElement("button");
            btn.textContent = char.id;
            btn.style.backgroundColor = char.color;
            btn.style.margin = "5px";
            btn.onclick = () => switchToCharacter(char.id);

            const active = getActiveCharacter();
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
    }

    let isSwitching = false;

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

    function switchToCharacter(id, saveCurrent = true) {
        console.log(`[Switch] Request to switch to ${id}. saveCurrent=${saveCurrent}`);
        try {
            isSwitching = true; // Block auto-save
            const current = getActiveCharacter();
            if (current && saveCurrent) {
                // Save current workspace BEFORE switching active char
                const xmlDom = Blockly.Xml.workspaceToDom(workspace);
                const xmlText = Blockly.Xml.domToText(xmlDom);
                current.workspaceXML = xmlText;
                console.log(`[Switch] Saved ${current.id} workspace. XML len: ${xmlText.length}`);
                App.Engine.saveToStorage();
            } else {
                console.log("[Switch] No current character or saveCurrent=false. Skipping save.");
            }

            setActiveCharacter(id);
            const next = getActiveCharacter();
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

    function createNewCharacter() {
        // Find first available ID
        let idIndex = 1;
        while (characters.some(c => c.id === `char_${idIndex}`)) {
            idIndex++;
        }
        const id = `char_${idIndex}`;

        // Random position near spawn
        const x = 50 + Math.floor(Math.random() * 6) - 3;
        const y = 50 + Math.floor(Math.random() * 6) - 3;
        // Random color
        const colors = ["#ff6e6e", "#6eff6e", "#6e6eff", "#ffff6e", "#ff6eff", "#6effff"];
        const color = colors[Math.floor(Math.random() * colors.length)];

        createCharacter(id, x, y, color);
        App.Engine.saveToStorage(); // Save new char
        switchToCharacter(id);
    }

    // Auto-save on block changes
    function onBlocklyChange(event) {
        if (isSwitching) return; // Prevent saving during switch (e.g. clearing workspace)
        if (event.type === Blockly.Events.UI) return; // Ignore UI events like scrolling

        const current = getActiveCharacter();
        if (current) {
            // console.log(`[AutoSave] Saving ${current.id}...`); // Optional: might spam
            const xml = Blockly.Xml.workspaceToDom(workspace);
            current.workspaceXML = Blockly.Xml.domToText(xml);
            App.Engine.saveToStorage();
        } else {
            console.warn("[AutoSave] No active character!");
        }
    }
    workspace.addChangeListener(onBlocklyChange);

    // Initial load handling: 
    // If we loaded from storage, we need to load the active character's workspace into Blockly
    try {
        const initialChar = getActiveCharacter();
        if (initialChar && initialChar.workspaceXML) {
            try {
                const xml = Blockly.Xml.textToDom(initialChar.workspaceXML);
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
        refreshCharList();
    }

    // Initial UI Setup
    const panel = document.createElement("div");
    panel.className = "panel";
    panel.style.marginTop = "10px";
    panel.innerHTML = `
    <div class="hint">Characters</div>
    <div id="charList" style="display:flex; flex-wrap:wrap;"></div>
    <button id="newCharBtn">New Character</button>
  `;

    // Insert before controls
    const controls = document.getElementById("controls");
    controls.parentNode.insertBefore(panel, controls);

    document.getElementById("newCharBtn").addEventListener("click", createNewCharacter);

    // Refresh initially
    refreshCharList();

    App.CharManager = {
        switchToCharacter,
        refreshCharList
    };
})();
