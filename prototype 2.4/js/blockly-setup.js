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
    return `async function onStart(){\n${body}}\n`;
  };

  generator.forBlock["move_dir"] = function (block) {
    const dir = block.getFieldValue("DIR");
    const map = {
      UP: "await GameAPI.moveUp()",
      DOWN: "await GameAPI.moveDown()",
      LEFT: "await GameAPI.moveLeft()",
      RIGHT: "await GameAPI.moveRight()",
    };
    return (map[dir] || "") + ";\n";
  };

  Blockly.Blocks["harvest_dir"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("harvest")
        .appendField(new Blockly.FieldDropdown([
          ["anything", "ANY"],
          ["trees", "TREE"],
          ["rocks", "ROCK"]
        ]), "TARGET");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    },
  };

  generator.forBlock["harvest_dir"] = function (block) {
    const target = block.getFieldValue("TARGET");
    return `await GameAPI.harvest("${target}");\n`;
  };

  // Sensor block to get currently harvested items
  Blockly.Blocks["get_resource_count"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("total")
        .appendField(new Blockly.FieldDropdown([
          ["trees", "treeCount"],
          ["rocks", "rockCount"],
          ["gold", "goldCount"]
        ]), "RESOURCE");
      this.setOutput(true, "Number");
      this.setColour(45);
    }
  };

  generator.forBlock["get_resource_count"] = function (block) {
    const res = block.getFieldValue("RESOURCE");
    return [`GameAPI.getResource("${res}")`, generator.ORDER_NONE];
  };

  // Sensor block to check adjacent tiles
  Blockly.Blocks["is_next_to"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("is next to")
        .appendField(new Blockly.FieldDropdown([
          ["tree", "TREE"],
          ["rock", "ROCK"],
          ["anything", "ANY"]
        ]), "TARGET");
      this.setOutput(true, "Boolean");
      this.setColour(45);
    }
  };

  generator.forBlock["is_next_to"] = function (block) {
    const target = block.getFieldValue("TARGET");
    return [`GameAPI.isNextTo("${target}")`, generator.ORDER_NONE];
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
