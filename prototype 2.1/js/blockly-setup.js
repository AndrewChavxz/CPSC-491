window.App = window.App || {};

(function () {
  const statusEl = document.getElementById("status");

  function setStatus(msg) {
    statusEl.textContent = msg;
  }

  // Modern Blockly (v10+) uses the 'javascript' global from javascript.min.js
  const generator = window.javascript && window.javascript.javascriptGenerator;

  if (!generator) {
    setStatus("Error: javascript.javascriptGenerator not found. Is javascript.min.js loaded?");
    console.error("Blockly JavaScript generator missing.");
    return; // Stop execution to prevent further crashes
  }

  // 1. Define Blocks
  Blockly.Blocks["on_start"] = {
    init: function () {
      this.appendDummyInput().appendField("on start");
      this.appendStatementInput("DO").appendField("do");
      this.setColour(285);
      this.setDeletable(false);
    },
  };

  Blockly.Blocks["move_dir"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("move")
        .appendField(
          new Blockly.FieldDropdown([
            ["up", "UP"],
            ["down", "DOWN"],
            ["left", "LEFT"],
            ["right", "RIGHT"],
          ]),
          "DIR"
        );
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(125);
    },
  };

  // 2. Define Generator Logic (using the new generator object)
  generator.forBlock["on_start"] = function (block) {
    // Use generator.statementToCode instead of Blockly.JavaScript
    const body = generator.statementToCode(block, "DO");
    return `function onStart(){\n${body}}\n`;
  };

  generator.forBlock["move_dir"] = function (block) {
    const dir = block.getFieldValue("DIR");
    const map = {
      UP: "GameAPI.moveUp()",
      DOWN: "GameAPI.moveDown()",
      LEFT: "GameAPI.moveLeft()",
      RIGHT: "GameAPI.moveRight()",
    };
    return (map[dir] || "") + ";\n";
  };

  // 3. Inject Workspace
  const workspace = Blockly.inject("blocklyDiv", {
    toolbox: document.getElementById("toolbox"),
    scrollbars: true,
    trashcan: true,
    grid: { spacing: 20, length: 3, colour: "rgba(255,255,255,0.08)", snap: true },
    zoom: { controls: true, wheel: true, startScale: 0.95 },
  });

  Blockly.Xml.domToWorkspace(document.getElementById("startBlocks"), workspace);

  // Expose to App
  App.BlocklyStuff = { workspace, setStatus, generator };
})();
