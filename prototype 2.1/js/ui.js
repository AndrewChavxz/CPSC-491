window.App = window.App || {};

(function () {
  const codeBox = document.getElementById("codeBox");

  App.UI = {
    codeBox,
    setStatus: App.BlocklyStuff.setStatus,
  };
})();
