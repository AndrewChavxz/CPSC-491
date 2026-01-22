window.App = window.App || {};

(function () {
  // -------------------- Manual WASD --------------------
  const keys = new Set();
  window.addEventListener("keydown", (e) => keys.add(e.key.toLowerCase()));
  window.addEventListener("keyup", (e) => keys.delete(e.key.toLowerCase()));

  App.Input = { keys };
})();
