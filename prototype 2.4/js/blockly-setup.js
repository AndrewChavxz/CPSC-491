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

  Blockly.Blocks["move_forward"] = {
    init: function () {
      this.appendDummyInput().appendField("move forward");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(125);
    },
  };
  generator.forBlock["move_forward"] = function () { return "await GameAPI.moveForward();\n"; };

  Blockly.Blocks["move_backward"] = {
    init: function () {
      this.appendDummyInput().appendField("move backward");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(125);
    },
  };
  generator.forBlock["move_backward"] = function () { return "await GameAPI.moveBackward();\n"; };

  Blockly.Blocks["turn_left"] = {
    init: function () {
      this.appendDummyInput().appendField("turn left");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(125);
    },
  };
  generator.forBlock["turn_left"] = function () { return "await GameAPI.turnLeft();\n"; };

  Blockly.Blocks["turn_right"] = {
    init: function () {
      this.appendDummyInput().appendField("turn right");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(125);
    },
  };
  generator.forBlock["turn_right"] = function () { return "await GameAPI.turnRight();\n"; };

  Blockly.Blocks["drop_resources"] = {
    init: function () {
      this.appendDummyInput().appendField("drop resources");
      this.setPreviousStatement(true);
      this.setNextStatement(true);
      this.setColour(160);
    },
  };
  generator.forBlock["drop_resources"] = function () { return "await GameAPI.dropResources();\n"; };

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

  Blockly.Blocks["distance_to"] = {
    init: function () {
      this.appendDummyInput()
        .appendField("distance to nearest")
        .appendField(new Blockly.FieldDropdown([
          ["tree", "TREE"],
          ["rock", "ROCK"],
          ["water", "WATER"],
          ["anything", "ANY"]
        ]), "TARGET");
      this.setOutput(true, "Number");
      this.setColour(45);
    }
  };
  generator.forBlock["distance_to"] = function (block) {
    const target = block.getFieldValue("TARGET");
    return [`GameAPI.getDistanceTo("${target}")`, generator.ORDER_NONE];
  };

  Blockly.Blocks["is_blocked_ahead"] = {
    init: function () {
      this.appendDummyInput().appendField("is path blocked ahead?");
      this.setOutput(true, "Boolean");
      this.setColour(45);
    }
  };
  generator.forBlock["is_blocked_ahead"] = function () {
    return [`GameAPI.isPathBlockedAhead()`, generator.ORDER_NONE];
  };

  Blockly.Blocks["is_on_base"] = {
    init: function () {
      this.appendDummyInput().appendField("is standing on base?");
      this.setOutput(true, "Boolean");
      this.setColour(45);
    }
  };
  generator.forBlock["is_on_base"] = function () {
    return [`GameAPI.isOnBase()`, generator.ORDER_NONE];
  };

  // Stop Code block
  Blockly.Blocks["stop_code"] = {
    init: function () {
      this.appendDummyInput().appendField("stop code");
      this.setPreviousStatement(true);
      // No next statement, since this halts execution
      this.setColour(0);
    },
  };

  generator.forBlock["stop_code"] = function (block) {
    // We call resetQueue to stop any pending actions, and throw to halt the async function
    return "if (App.GameAPI) App.GameAPI.resetQueue();\nthrow new Error('STOP_CODE');\n";
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

  // Manual fallback for block deletion if Blockly's default shortcuts fail
  document.addEventListener("keydown", function(e) {
    if (e.key === "Delete" || e.key === "Backspace") {
      // Don't delete if user is typing in a text input (like naming a variable)
      const tag = document.activeElement ? document.activeElement.tagName : "";
      if (tag === "INPUT" || tag === "TEXTAREA" || tag === "SELECT") return;

      const selected = Blockly.common ? Blockly.common.getSelected() : Blockly.selected;
      if (selected && selected.isDeletable()) {
        selected.dispose(true, true);
        e.preventDefault(); // Prevent browser back navigation
      }
    }
  });
})();
