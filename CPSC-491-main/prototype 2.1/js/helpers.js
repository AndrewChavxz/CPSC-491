// -------------------- Helpers --------------------
window.App = window.App || {};

App.roundRectPath = function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
};

App.shade = function shade(hex, amt) {
  const clamp = (v) => Math.max(0, Math.min(255, v));
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const f = (c) => clamp(Math.round(c + (amt * 255)));
  return (
    "#" +
    f(r).toString(16).padStart(2, "0") +
    f(g).toString(16).padStart(2, "0") +
    f(b).toString(16).padStart(2, "0")
  );
};
