window.App = window.App || {};

(function () {
  const codeBox = document.getElementById("codeBox");

  App.UI = {
    codeBox,
    setStatus: App.BlocklyStuff.setStatus,
    updateCounters: (trees, rocks, gold) => {
      document.getElementById("treeCount").textContent = trees;
      document.getElementById("rockCount").textContent = rocks;
      if (document.getElementById("goldCount")) {
        document.getElementById("goldCount").textContent = gold || 0;
      }
    }
  };
})();
