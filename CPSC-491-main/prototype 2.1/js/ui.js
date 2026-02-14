window.App = window.App || {};

(function () {
  const codeBox = document.getElementById("codeBox");

  App.UI = {
    codeBox,
    setStatus: App.BlocklyStuff.setStatus,
    updateCounters: (trees, rocks) => {
      document.getElementById("treeCount").textContent = trees;
      document.getElementById("rockCount").textContent = rocks;
    }
  };
})();
