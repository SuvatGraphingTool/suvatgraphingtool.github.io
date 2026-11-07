// kitview.js — the twelve's camera, given to every library stage.
//
// The hand-built twelve can be dragged to pan, wheeled or pinched to zoom,
// fitted with the Fit button and reset with a double-click. All of that is
// scene.js: `createCamera`, `attachControls` (the drag, the wheel, the
// double-click) and `fitView` (the reset), with `easeCamera` travelling the
// zoom. The library's stages draw in their own pixel layout, so they only
// need one more thing: a way to read that same camera as a view onto the
// layout. That is all this file is — no second set of controls.
//
// THE MAPPING. A library stage lays itself out to fill the canvas; that
// layout is its world, in pixels, with y measured UP (as scene.js's camera
// expects: a drag down raises cy). The fit is scale 1 centred on the layout,
// which is exactly the picture the stage drew before it could move. `cam._map`
// is set so the wheel zooms about the pointer, as it does on the twelve.
//
// THE LIMITS. Zoom runs from the fit (1) in to 6: never out past the fit,
// because the whole layout scales with the view and its labels would fall
// under the 13 px floor (CLAUDE.md rule 3) — the twelve keep their labels a
// fixed size while the world zooms; a stage drawn in pixels cannot. Panning
// stops at the layout's edges, so the stage is never dragged off the canvas.

const MIN = 1, MAX = 6;

/** Read the camera as a view onto the stage's layout, and leave it on the
    canvas for fitCanvas (js/render/util.js) to apply. Call before render. */
export function kitView(canvas, cam) {
  const r = canvas.getBoundingClientRect();
  const w = Math.max(1, Math.round(r.width)), h = Math.max(1, Math.round(r.height));
  // fit: on first use, after a reset (Fit, double-click, a new scenario), or
  // when the canvas changes size — the layout itself has changed then
  if (cam.fit || cam._kit !== true || cam._kitW !== w || cam._kitH !== h) {
    cam.scale = 1; cam.cx = w / 2; cam.cy = -h / 2;
    cam.want = { scale: 1, cx: w / 2, cy: -h / 2 };
    cam.fit = false; cam._kit = true; cam._plate = false; cam.placed = true;
    cam._kitW = w; cam._kitH = h;
  }
  const clampCam = (c) => {
    if (!c) return;
    if (c.scale != null) c.scale = Math.min(MAX, Math.max(MIN, c.scale));
    const s = c.scale ?? cam.scale, hw = w / (2 * s), hh = h / (2 * s);
    if (c.cx != null) c.cx = Math.min(w - hw, Math.max(hw, c.cx));
    if (c.cy != null) c.cy = Math.min(-hh, Math.max(-h + hh, c.cy));
  };
  clampCam(cam); clampCam(cam.want);
  const s = cam.scale, cx = cam.cx, cy = cam.cy;
  cam._map = {
    px: (sx) => cx + (sx - w / 2) / s,
    pu: (sx) => cx + (sx - w / 2) / s,
    py: (sy) => cy - (sy - h / 2) / s,
  };
  canvas._view = s === 1 && Math.abs(cx - w / 2) < 1e-6 && Math.abs(cy + h / 2) < 1e-6 ? null
    : { s, tx: w / 2 - cx * s, ty: h / 2 + cy * s };
}

/** The stage has drawn: the next renderer (one of the twelve) draws unmoved. */
export function kitViewDone(canvas) { canvas._view = null; }
