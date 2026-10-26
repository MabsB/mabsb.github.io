/*
 * Visual effects, all drawn by hand on 2D canvases and SVG:
 *
 *   contours    animated marching-squares contour field (+ pointer trail)
 *   dissolve    the chequered seam between two sections, scrubbed by scroll
 *   circuit     the Smart Gate signal chain as a 6-second lap, over a halftone
 *               map, with a lattice reticle that follows the cursor afterwards
 *   veil        the loading veil
 *
 * Needs motion.js. Everything pauses when off screen.
 */
(function () {
  'use strict';

  var win = window;
  var doc = document;
  var root = doc.documentElement;
  var M = win.Motion;
  var Fx = (win.Fx = {});
  var clamp = M.clamp;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------------------
   * Colours from the CSS tokens (re-read when the theme changes)
   * ------------------------------------------------------------------- */
  var colourCache = {};
  var themeListeners = [];
  Fx.css = function (name, fallback) {
    if (colourCache[name] === undefined) {
      colourCache[name] = getComputedStyle(root).getPropertyValue(name).trim() || fallback || '#888';
    }
    return colourCache[name];
  };
  Fx.onTheme = function (fn) { themeListeners.push(fn); };
  if ('MutationObserver' in win) {
    new MutationObserver(function () {
      colourCache = {};
      themeListeners.forEach(function (fn) { fn(); });
    }).observe(root, { attributes: true, attributeFilter: ['data-theme'] });
  }

  function dpr() {
    var coarse = win.matchMedia && win.matchMedia('(pointer: coarse)').matches;
    return coarse ? 1 : Math.min(win.devicePixelRatio || 1, 2);
  }

  /** Match a canvas's backing store to its CSS size. Returns the CSS size. */
  function fitCanvas(canvas) {
    var r = dpr();
    var w = Math.max(1, Math.round(canvas.clientWidth));
    var h = Math.max(1, Math.round(canvas.clientHeight));
    if (canvas.width !== Math.round(w * r) || canvas.height !== Math.round(h * r)) {
      canvas.width = Math.round(w * r);
      canvas.height = Math.round(h * r);
    }
    return { w: w, h: h, r: r };
  }

  function onResize(el, fn) {
    if ('ResizeObserver' in win) {
      var pending = 0;
      new ResizeObserver(function () {
        cancelAnimationFrame(pending);
        pending = requestAnimationFrame(fn);
      }).observe(el);
    } else {
      win.addEventListener('resize', fn);
    }
  }

  /* ---------------------------------------------------------------------
   * Contour field: marching squares over an animated scalar field
   * ------------------------------------------------------------------- */
  var LINE_SCALE = 3.8;
  var LINE_COUNT = 2.5;
  var WAVE_AMOUNT = 0.37;
  var WAVE_SPEED = 1.66;
  var LINE_OPACITY = 0.85;

  function field(x, y, t) {
    var f = Math.sin(x * 1.0 + t * 0.6) * 0.5;
    f += Math.sin(y * 0.85 - t * 0.45) * 0.45;
    f += Math.sin((x + y) * 0.65 + t * 0.35) * 0.35;
    f += Math.sin((x - y) * 0.95 - t * 0.55) * 0.25;
    return f * 0.5 + 0.5;
  }

  function contourPath(width, height, cells, t) {
    var cols = width >= height ? cells : Math.max(8, Math.round((cells * width) / height));
    var rows = Math.max(8, Math.round((cols * height) / width));
    var stepX = width / cols;
    var stepY = height / rows;
    var aspect = width / height;
    var values = new Float32Array((cols + 1) * (rows + 1));
    var j, i;
    for (j = 0; j <= rows; j += 1) {
      for (i = 0; i <= cols; i += 1) {
        var nx = ((i / cols) * 2 - 1) * aspect * LINE_SCALE;
        var ny = ((j / rows) * 2 - 1) * LINE_SCALE;
        var qx = nx + Math.sin(ny * 0.8 + t * 0.7) * WAVE_AMOUNT;
        var qy = ny + Math.cos(nx * 0.7 - t * 0.6) * WAVE_AMOUNT;
        values[j * (cols + 1) + i] = field(qx, qy, t) * LINE_COUNT;
      }
    }
    var path = new Path2D();
    var seg = function (p, q) {
      path.moveTo(p[0], p[1]);
      path.lineTo(q[0], q[1]);
    };
    for (var level = 0.5; level < LINE_COUNT; level += 1) {
      for (j = 0; j < rows; j += 1) {
        for (i = 0; i < cols; i += 1) {
          var a = values[j * (cols + 1) + i];
          var b = values[j * (cols + 1) + i + 1];
          var c = values[(j + 1) * (cols + 1) + i + 1];
          var d = values[(j + 1) * (cols + 1) + i];
          var index = (a > level ? 8 : 0) | (b > level ? 4 : 0) | (c > level ? 2 : 0) | (d > level ? 1 : 0);
          if (index === 0 || index === 15) continue;
          var x0 = i * stepX;
          var y0 = j * stepY;
          var top = [x0 + stepX * ((level - a) / (b - a)), y0];
          var right = [x0 + stepX, y0 + stepY * ((level - b) / (c - b))];
          var bottom = [x0 + stepX * ((level - d) / (c - d)), y0 + stepY];
          var left = [x0, y0 + stepY * ((level - a) / (d - a))];
          switch (index) {
            case 1: case 14: seg(left, bottom); break;
            case 2: case 13: seg(bottom, right); break;
            case 3: case 12: seg(left, right); break;
            case 4: case 11: seg(top, right); break;
            case 6: case 9: seg(top, bottom); break;
            case 7: case 8: seg(left, top); break;
            case 5: seg(left, top); seg(bottom, right); break;
            case 10: seg(left, bottom); seg(top, right); break;
          }
        }
      }
    }
    return path;
  }

  /**
   * Fx.contours(canvas, { colour: '--contour', accent: '--accent', pointerHost, cells })
   * With `pointerHost`, the cursor's recent path reveals the field in the accent colour.
   */
  Fx.contours = function (canvas, o) {
    o = o || {};
    var ctx = canvas.getContext('2d');
    var cells = o.cells || (win.matchMedia('(max-width: 767px)').matches ? 56 : 96);
    var watch = M.watch(canvas);
    var start = performance.now();
    var size = fitCanvas(canvas);
    var layer = null; // accent layer for the pointer trail
    var lctx = null;
    var trail = [];
    var last = null;
    var sweep = false;
    var drawnOnce = false;
    var fine = win.matchMedia('(hover: hover) and (pointer: fine)').matches;
    var animate = !M.reduced();

    function ensureLayer() {
      if (!layer) {
        layer = doc.createElement('canvas');
        lctx = layer.getContext('2d');
      }
      if (layer.width !== canvas.width || layer.height !== canvas.height) {
        layer.width = canvas.width;
        layer.height = canvas.height;
      }
    }

    function draw(now) {
      var t = ((now - start) / 1000) * WAVE_SPEED;
      var path = contourPath(size.w, size.h, cells, t);
      ctx.setTransform(size.r, 0, 0, size.r, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      ctx.lineWidth = 1;
      ctx.globalAlpha = LINE_OPACITY;
      ctx.strokeStyle = Fx.css(o.colour || '--contour');
      ctx.stroke(path);

      // Trail: the accent field, kept only where the cursor has just been.
      if (o.pointerHost && trail.length) {
        ensureLayer();
        lctx.setTransform(size.r, 0, 0, size.r, 0, 0);
        lctx.globalCompositeOperation = 'source-over';
        lctx.clearRect(0, 0, size.w, size.h);
        lctx.globalAlpha = 1;
        lctx.lineWidth = 1.6;
        lctx.strokeStyle = Fx.css(o.accent || '--accent');
        lctx.stroke(path);
        lctx.globalCompositeOperation = 'destination-in';
        var life = 1700;
        for (var k = trail.length - 1; k >= 0; k -= 1) {
          var pt = trail[k];
          var age = (now - pt.t) / life;
          if (age >= 1) {
            trail.splice(0, k + 1);
            break;
          }
          var radius = (o.radius || 120) * (0.4 + 0.6 * (1 - age));
          var g = lctx.createRadialGradient(pt.x, pt.y, 0, pt.x, pt.y, radius);
          g.addColorStop(0, 'rgba(0,0,0,' + (1 - age).toFixed(3) + ')');
          g.addColorStop(0.55, 'rgba(0,0,0,' + (0.7 * (1 - age)).toFixed(3) + ')');
          g.addColorStop(1, 'rgba(0,0,0,0)');
          lctx.fillStyle = g;
          lctx.beginPath();
          lctx.arc(pt.x, pt.y, radius, 0, Math.PI * 2);
          lctx.fill();
        }
        lctx.globalCompositeOperation = 'source-over';
        ctx.setTransform(1, 0, 0, 1, 0, 0);
        ctx.globalAlpha = 1;
        ctx.drawImage(layer, 0, 0);
        ctx.setTransform(size.r, 0, 0, size.r, 0, 0);
      }
      ctx.globalAlpha = 1;
      drawnOnce = true;
    }

    function addPoint(x, y, now) {
      if (last && Math.hypot(x - last.x, y - last.y) < 10) return;
      last = { x: x, y: y };
      trail.push({ x: x, y: y, t: now });
      if (trail.length > 70) trail.shift();
    }

    if (o.pointerHost && animate) {
      if (fine) {
        o.pointerHost.addEventListener('pointermove', function (e) {
          if (e.pointerType === 'touch') return;
          var r = canvas.getBoundingClientRect();
          if (e.clientY < r.top || e.clientY > r.bottom) return;
          addPoint(e.clientX - r.left, e.clientY - r.top, performance.now());
        }, { passive: true });
      } else {
        sweep = true; // no cursor: a slow idle sweep stands in for it
      }
    }

    function frameFn(now) {
      if (!watch.live()) return;
      if (sweep) {
        var x = size.w * (0.5 + 0.38 * Math.sin(now * 0.00031));
        var y = size.h * (0.5 + 0.32 * Math.sin(now * 0.00047 + 1.2));
        addPoint(x, y, now);
      }
      draw(now);
    }

    function relayout() {
      size = fitCanvas(canvas);
      draw(performance.now());
    }
    onResize(canvas, relayout);
    Fx.onTheme(function () { draw(performance.now()); });

    draw(performance.now());
    if (animate) M.subscribe(frameFn, 24);
    return { drawn: function () { return drawnOnce; } };
  };

  /* ---------------------------------------------------------------------
   * Chequered dissolve: the seam between two sections
   * ------------------------------------------------------------------- */
  var SOLID_UNTIL = 0.16;
  var LIFT = 2;
  var ACCENT_SHARE = 0.06;

  function noise(x, y) {
    var h = Math.imul(x, 374761393) + Math.imul(y, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }

  /** Fx.dissolve(canvas, { carry: 'light' | 'dark' }) */
  Fx.dissolve = function (canvas, o) {
    var ctx = canvas.getContext('2d');
    var carry = (o && o.carry) || 'light';
    var progress = 0;
    var drawn = -1;

    function render() {
      var size = fitCanvas(canvas);
      var cell = parseFloat(getComputedStyle(canvas).getPropertyValue('--flag-cell')) || 24;
      var surface = Fx.css(carry === 'light' ? '--ground' : '--surface-black');
      var accent = Fx.css('--accent');
      ctx.setTransform(size.r, 0, 0, size.r, 0, 0);
      ctx.clearRect(0, 0, size.w, size.h);
      var columns = Math.ceil(size.w / cell);
      var rows = Math.ceil(size.h / cell);
      var lift = progress * LIFT;
      for (var y = 0; y < rows; y += 1) {
        var depth = y / Math.max(1, rows - 1) + lift;
        if (depth > 1) break;
        var solid = depth <= SOLID_UNTIL;
        var fade = clamp(1 - (depth - SOLID_UNTIL) / (1 - SOLID_UNTIL), 0, 1);
        if (!solid && fade <= 0) break;
        for (var x = 0; x < columns; x += 1) {
          if (!solid) {
            if ((x + y) % 2 !== 0) continue;
            if (noise(x, y) > fade) continue;
          }
          ctx.fillStyle = !solid && noise(x + 101, y + 57) < ACCENT_SHARE ? accent : surface;
          ctx.fillRect(x * cell, y * cell, cell, cell);
        }
      }
      drawn = progress;
    }

    if (M.reduced()) return;
    M.scrub(canvas, {
      start: 'top bottom',
      end: 'top top',
      apply: function (p) {
        progress = p;
        if (Math.abs(p - drawn) > 0.002) render();
      }
    });
    onResize(canvas, function () { drawn = -1; render(); });
    Fx.onTheme(function () { render(); });
    render();
  };

  /* ---------------------------------------------------------------------
   * Circuit: the Smart Gate signal chain as a lap
   * ------------------------------------------------------------------- */
  var ART = { w: 1440, h: 800 };
  // Corners of the loop, clockwise on screen. The lap starts on the bottom straight.
  var START = [1090, 672];
  var CORNERS = [
    [790, 672], [680, 575], [680, 385], [790, 285], [930, 285], [1010, 150],
    [1230, 150], [1330, 230], [1330, 470], [1240, 560], [1190, 672]
  ];
  // Corners that carry a signal-chain stop, in lap order, with label placement.
  var STOPS = [
    { corner: 1, dx: 20, dy: 6, anchor: 'start' },
    { corner: 3, dx: 18, dy: 22, anchor: 'start' },
    { corner: 6, dx: 0, dy: -20, anchor: 'middle' },
    { corner: 8, dx: -22, dy: 5, anchor: 'end' }
  ];
  var TRACK_BOX = { x: 594, y: 104, w: 782, h: 614 }; // the loop's bounding box, padded 46
  var LAP_MS = 6000;
  var HUB = [1010, 410];
  var SPACING = 14;

  function roundedLoop(start, corners, r) {
    var d = 'M' + start[0] + ' ' + start[1];
    for (var i = 0; i < corners.length; i += 1) {
      var prev = i === 0 ? start : corners[i - 1];
      var c = corners[i];
      var next = i === corners.length - 1 ? start : corners[i + 1];
      var inLen = Math.hypot(c[0] - prev[0], c[1] - prev[1]);
      var outLen = Math.hypot(next[0] - c[0], next[1] - c[1]);
      var k = Math.min(r, inLen / 2, outLen / 2);
      var a = [c[0] + ((prev[0] - c[0]) / inLen) * k, c[1] + ((prev[1] - c[1]) / inLen) * k];
      var b = [c[0] + ((next[0] - c[0]) / outLen) * k, c[1] + ((next[1] - c[1]) / outLen) * k];
      d += ' L' + a[0].toFixed(2) + ' ' + a[1].toFixed(2) + ' Q' + c[0] + ' ' + c[1] + ' ' + b[0].toFixed(2) + ' ' + b[1].toFixed(2);
    }
    return d + ' Z';
  }

  function smoothstep(a, b, x) {
    var t = clamp((x - a) / (b - a), 0, 1);
    return t * t * (3 - 2 * t);
  }

  /** Samples the lap and builds the speed curve: braking into corners, running away down straights. */
  function buildLap(pathEl) {
    var length = pathEl.getTotalLength();
    var n = Math.max(240, Math.round(length / 2.5));
    var ds = length / n;
    var pts = [];
    var i;
    for (i = 0; i <= n; i += 1) {
      var p = pathEl.getPointAtLength(Math.min(length, i * ds));
      pts.push([p.x, p.y]);
    }
    var at = function (k) { return pts[((k % n) + n) % n]; };
    var speed = new Float32Array(n + 1);
    for (i = 0; i < n; i += 1) {
      var a = at(i - 4), b = at(i), c = at(i + 4);
      var v1x = b[0] - a[0], v1y = b[1] - a[1], v2x = c[0] - b[0], v2y = c[1] - b[1];
      var ang = Math.abs(Math.atan2(v1x * v2y - v1y * v2x, v1x * v2x + v1y * v2y));
      var curvature = ang / ((Math.hypot(v1x, v1y) + Math.hypot(v2x, v2y)) / 2 || 1);
      speed[i] = 1 - 0.72 * smoothstep(0.004, 0.03, curvature);
    }
    var BRAKE = 0.0023;
    var ACCEL = 0.0014;
    for (var pass = 0; pass < 2; pass += 1) {
      for (i = n - 1; i >= 0; i -= 1) {
        speed[i] = Math.min(speed[i], Math.sqrt(speed[(i + 1) % n] * speed[(i + 1) % n] + 2 * BRAKE * ds));
      }
    }
    speed[0] = Math.min(speed[0], 0.3);
    for (pass = 0; pass < 2; pass += 1) {
      for (i = 1; i <= n; i += 1) {
        var prev = speed[(i - 1) % n];
        speed[i % n] = Math.min(speed[i % n], Math.sqrt(prev * prev + 2 * ACCEL * ds));
      }
    }
    speed[n] = speed[0];
    var time = new Float32Array(n + 1);
    for (i = 1; i <= n; i += 1) time[i] = time[i - 1] + ds / ((speed[i - 1] + speed[i]) / 2);
    var total = time[n];
    for (i = 0; i <= n; i += 1) time[i] = (time[i] / total) * LAP_MS;
    return {
      pts: pts,
      n: n,
      ds: ds,
      length: length,
      /** Fractional sample index reached after `ms` of the lap. */
      indexAt: function (ms) {
        if (ms <= 0) return 0;
        if (ms >= LAP_MS) return n;
        var lo = 0, hi = n;
        while (hi - lo > 1) {
          var mid = (lo + hi) >> 1;
          if (time[mid] <= ms) lo = mid;
          else hi = mid;
        }
        return lo + (ms - time[lo]) / (time[hi] - time[lo] || 1);
      }
    };
  }

  // Deterministic value noise for the halftone landmass.
  function hash2(x, y) {
    var h = Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
    h = Math.imul(h ^ (h >>> 13), 1274126177);
    return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
  }
  function vnoise(x, y) {
    var xi = Math.floor(x), yi = Math.floor(y);
    var xf = x - xi, yf = y - yi;
    var u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf);
    var a = hash2(xi, yi), b = hash2(xi + 1, yi), c = hash2(xi, yi + 1), d = hash2(xi + 1, yi + 1);
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  }
  function fbm(x, y) {
    var s = 0, amp = 0.5, f = 1;
    for (var o = 0; o < 4; o += 1) {
      s += amp * vnoise(x * f, y * f);
      f *= 2;
      amp *= 0.5;
    }
    return s;
  }

  function svgEl(name, attrs, parent) {
    var node = doc.createElementNS(SVGNS, name);
    Object.keys(attrs || {}).forEach(function (k) { node.setAttribute(k, attrs[k]); });
    if (parent) parent.appendChild(node);
    return node;
  }

  /**
   * Fx.circuit(host, { steps: [{ step, label, highlight }], frame, arrive })
   * `host` is an empty element; the stage is built inside it.
   */
  Fx.circuit = function (host, o) {
    o = o || {};
    var steps = (o.steps || []).filter(function (s) { return s && s.label; });
    var frame = o.frame || host.parentElement;
    var narrow = function () { return win.innerWidth < 1024; };
    var reduce = M.reduced();

    // ---- DOM -----------------------------------------------------------
    var stage = doc.createElement('div');
    stage.className = 'circuit-stage';
    stage.style.width = ART.w + 'px';
    stage.style.height = ART.h + 'px';
    var halftone = doc.createElement('canvas');
    halftone.className = 'circuit-canvas';
    var svg = svgEl('svg', { viewBox: '0 0 ' + ART.w + ' ' + ART.h, class: 'circuit-map', focusable: 'false' });
    var trace = doc.createElement('canvas');
    trace.className = 'circuit-canvas';
    var reticle = doc.createElement('canvas');
    reticle.className = 'circuit-canvas';
    stage.appendChild(halftone);
    stage.appendChild(svg);
    stage.appendChild(trace);
    stage.appendChild(reticle);
    host.appendChild(stage);

    // ---- map -----------------------------------------------------------
    var gridGroup = svgEl('g', { class: 'c-grid' }, svg);
    var far = 4000;
    var axes = [];
    [HUB[0] - 230, HUB[0], HUB[0] + 230].forEach(function (x) {
      axes.push(svgEl('line', { x1: x, y1: -far, x2: x, y2: ART.h + far, class: 'c-axis' }, gridGroup));
    });
    axes.push(svgEl('line', { x1: -far, y1: HUB[1], x2: ART.w + far, y2: HUB[1], class: 'c-axis' }, gridGroup));
    svgEl('circle', { cx: HUB[0], cy: HUB[1], r: 38, class: 'c-ring c-ring--near' }, gridGroup);
    svgEl('circle', { cx: HUB[0], cy: HUB[1], r: 150, class: 'c-ring c-ring--far' }, gridGroup);
    svgEl('circle', { cx: HUB[0], cy: HUB[1], r: 188, class: 'c-ring c-ring--far' }, gridGroup);
    var ping = svgEl('circle', { cx: HUB[0], cy: HUB[1], r: 6, class: 'c-ping' }, gridGroup);
    svgEl('circle', { cx: HUB[0], cy: HUB[1], r: 5.5, class: 'c-hub' }, gridGroup);
    [[46, 54], [1394, 54], [46, 746], [1394, 746]].forEach(function (m) {
      svgEl('rect', { x: m[0] - 8, y: m[1] - 8, width: 16, height: 16, class: 'c-mark' }, gridGroup);
    });

    var d = roundedLoop(START, CORNERS, 52);
    var ribbon = svgEl('path', { d: d, class: 'c-ribbon' }, svg);
    var centre = svgEl('path', { d: d, class: 'c-centre' }, svg);
    var lap = buildLap(centre);

    // Hub label: the step the whole chain turns on.
    var key = steps.filter(function (s) { return s.highlight; })[0];
    if (key) {
      var hubLabel = svgEl('text', { x: HUB[0], y: HUB[1] + 30, class: 'c-label c-label--hub', 'text-anchor': 'middle' }, svgEl('g', { class: 'c-hublabel' }, svg));
      hubLabel.textContent = key.label;
    }

    // Stops: a triangle on each corner, lit as the head passes.
    function nearest(point) {
      var best = 0, bd = Infinity;
      for (var i = 0; i < lap.n; i += 1) {
        var dd = Math.hypot(lap.pts[i][0] - point[0], lap.pts[i][1] - point[1]);
        if (dd < bd) { bd = dd; best = i; }
      }
      return best;
    }
    var stops = STOPS.map(function (s, i) {
      var index = nearest(CORNERS[s.corner]);
      var p = lap.pts[index];
      var q = lap.pts[(index + 3) % lap.n];
      var o2 = lap.pts[(index - 3 + lap.n) % lap.n];
      var angle = (Math.atan2(q[1] - o2[1], q[0] - o2[0]) * 180) / Math.PI;
      var g = svgEl('g', { class: 'c-stop', transform: 'translate(' + p[0].toFixed(1) + ' ' + p[1].toFixed(1) + ')' }, svg);
      svgEl('polygon', { points: '13.7,0 -6.85,11.86 -6.85,-11.86', class: 'c-tri', transform: 'rotate(' + angle.toFixed(1) + ')' }, g);
      var step = steps[i + 1];
      if (step) {
        var t = svgEl('text', { x: s.dx, y: s.dy, class: 'c-label', 'text-anchor': s.anchor }, g);
        t.textContent = step.label;
      }
      return { index: index, g: g, lit: false };
    });

    // The chequered flag over the start of the lap.
    var flag = svgEl('g', { class: 'c-flag' }, svg);
    var fp = lap.pts[0];
    var fa = lap.pts[3];
    var fAngle = (Math.atan2(fa[1] - fp[1], fa[0] - fp[0]) * 180) / Math.PI;
    var fg = svgEl('g', { transform: 'translate(' + fp[0] + ' ' + fp[1] + ') rotate(' + fAngle.toFixed(1) + ')' }, flag);
    for (var cx = 0; cx < 2; cx += 1) {
      for (var cy = 0; cy < 6; cy += 1) {
        if ((cx + cy) % 2 === 0) svgEl('rect', { x: cx * 5 - 5, y: cy * 5 - 15, width: 5, height: 5 }, fg);
      }
    }
    if (steps[0]) {
      var ft = svgEl('text', { x: 0, y: 38, class: 'c-label c-label--lit', 'text-anchor': 'middle' }, flag);
      ft.setAttribute('transform', 'translate(' + fp[0] + ' ' + fp[1] + ')');
      ft.textContent = steps[0].label;
    }

    // ---- fit -------------------------------------------------------------
    var scale = 1;
    var cssScale = 1;
    function fit() {
      var fw = frame.clientWidth;
      var fh = frame.clientHeight;
      if (!fw || (!narrow() && !fh)) return;
      var tx, ty;
      if (narrow()) {
        scale = fw / TRACK_BOX.w;
        tx = -TRACK_BOX.x * scale;
        ty = -TRACK_BOX.y * scale;
        frame.style.height = Math.round(TRACK_BOX.h * scale) + 'px';
      } else {
        frame.style.height = '';
        fh = frame.clientHeight;
        scale = Math.max(fw / ART.w, fh / ART.h);
        tx = (fw - ART.w * scale) / 2;
        ty = (fh - ART.h * scale) / 2;
      }
      cssScale = scale;
      stage.style.transform = 'translate(' + tx.toFixed(2) + 'px,' + ty.toFixed(2) + 'px) scale(' + scale.toFixed(5) + ')';
      [halftone, trace, reticle].forEach(function (c) {
        var k = dpr() * scale;
        c.style.width = ART.w + 'px';
        c.style.height = ART.h + 'px';
        c.width = Math.round(ART.w * k);
        c.height = Math.round(ART.h * k);
      });
      drawHalftone();
      drawTrace(state.elapsed);
    }

    // ---- halftone landmass -----------------------------------------------
    var cols = Math.floor(ART.w / SPACING);
    var rowsN = Math.floor(ART.h / SPACING);
    function dotAt(i, j) {
      var x = (i + 0.5) * SPACING;
      var y = (j + 0.5) * SPACING;
      var n = fbm(i / 15 + 3.1, j / 15 + 7.7);
      // The landmass thickens toward the loop and thins under the copy on the left.
      var bias = 0.12 * Math.exp(-Math.pow((x - 1000) / 520, 2) - Math.pow((y - 410) / 380, 2));
      var density = n + bias;
      var left = smoothstep(120, 720, x);
      return { x: x, y: y, r: 0.7 + 2.1 * smoothstep(0.43, 0.72, density), keep: density > 0.43, a: 0.15 + 0.85 * left };
    }
    var dots = [];
    for (var j = 0; j < rowsN; j += 1) {
      for (var i = 0; i < cols; i += 1) {
        var dot = dotAt(i, j);
        if (dot.keep) dots.push(dot);
      }
    }
    function drawHalftone() {
      var ctx = halftone.getContext('2d');
      var k = dpr() * cssScale;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, ART.w, ART.h);
      ctx.fillStyle = Fx.css('--map-dot');
      for (var n = 0; n < dots.length; n += 1) {
        var t = dots[n];
        ctx.globalAlpha = 0.6 * t.a;
        ctx.beginPath();
        ctx.arc(t.x, t.y, t.r, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }

    // ---- the lap -----------------------------------------------------------
    var state = { elapsed: 0, started: false, done: false, begin: 0 };

    function drawTrace(ms) {
      var ctx = trace.getContext('2d');
      var k = dpr() * cssScale;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, ART.w, ART.h);
      if (!state.started && !state.done) return;
      var idx = state.done ? lap.n : lap.indexAt(ms);
      var whole = Math.floor(idx);
      var accent = Fx.css('--accent');
      var cooling = state.done ? 1 - clamp((ms - LAP_MS) / 900, 0, 1) : 1;
      var pts = lap.pts;
      var head = pts[Math.min(whole, lap.n)];
      if (whole < lap.n) {
        var nx = pts[whole + 1];
        var f = idx - whole;
        head = [pts[whole][0] + (nx[0] - pts[whole][0]) * f, pts[whole][1] + (nx[1] - pts[whole][1]) * f];
      }
      function run(from, to, closed) {
        ctx.beginPath();
        ctx.moveTo(pts[from][0], pts[from][1]);
        for (var s = from + 1; s <= to; s += 1) ctx.lineTo(pts[s][0], pts[s][1]);
        if (!closed && to < lap.n) ctx.lineTo(head[0], head[1]);
        if (closed) ctx.closePath();
      }
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      // ribbon fill, lightly
      ctx.globalAlpha = 0.14;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 26;
      run(0, whole, state.done && ms >= LAP_MS);
      ctx.stroke();
      ctx.globalAlpha = 1;
      // additive glow
      if (cooling > 0) {
        ctx.globalCompositeOperation = 'lighter';
        ctx.strokeStyle = accent;
        ctx.globalAlpha = 0.12 * cooling;
        ctx.lineWidth = 16;
        run(0, whole, false);
        ctx.stroke();
        ctx.globalAlpha = 0.22 * cooling;
        ctx.lineWidth = 8;
        run(0, whole, false);
        ctx.stroke();
        ctx.globalCompositeOperation = 'source-over';
      }
      // the line itself
      ctx.globalAlpha = 1;
      ctx.strokeStyle = accent;
      ctx.lineWidth = 3;
      run(0, whole, state.done && ms >= LAP_MS);
      ctx.stroke();
      // the hot head
      if (cooling > 0 && !(state.done && ms >= LAP_MS + 900)) {
        var from = Math.max(0, whole - 14);
        ctx.strokeStyle = '#ffffff';
        ctx.globalAlpha = cooling;
        ctx.lineWidth = 2.4;
        ctx.beginPath();
        ctx.moveTo(pts[from][0], pts[from][1]);
        for (var s2 = from + 1; s2 <= whole; s2 += 1) ctx.lineTo(pts[s2][0], pts[s2][1]);
        ctx.lineTo(head[0], head[1]);
        ctx.stroke();
        ctx.globalCompositeOperation = 'lighter';
        var g = ctx.createRadialGradient(head[0], head[1], 0, head[0], head[1], 30);
        g.addColorStop(0, 'rgba(255,255,255,0.85)');
        g.addColorStop(0.35, 'rgba(2,210,227,0.45)');
        g.addColorStop(1, 'rgba(2,210,227,0)');
        ctx.globalAlpha = cooling;
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(head[0], head[1], 30, 0, Math.PI * 2);
        ctx.fill();
        ctx.globalCompositeOperation = 'source-over';
      }
      ctx.globalAlpha = 1;
      // light the stops the head has passed
      stops.forEach(function (s) {
        if (!s.lit && idx >= s.index) {
          s.lit = true;
          s.g.classList.add('is-lit');
        }
      });
      if (idx >= 1) flag.classList.add('is-lit');
    }

    var offLap = null;
    function lapTick(time) {
      state.elapsed = time - state.begin;
      if (state.elapsed >= LAP_MS) {
        state.done = true;
      }
      drawTrace(state.elapsed);
      if (state.elapsed >= LAP_MS + 900) {
        if (offLap) offLap();
        offLap = null;
        document.dispatchEvent(new CustomEvent('circuit:rest'));
        armReticle();
      }
    }

    function run() {
      if (state.started) return;
      state.started = true;
      if (reduce) {
        state.done = true;
        state.elapsed = LAP_MS + 1000;
        drawTrace(state.elapsed);
        armReticle();
        return;
      }
      state.begin = performance.now();
      offLap = M.subscribe(lapTick, 0);
    }

    // ---- ambient loops (grid crawl and hub ping) ---------------------------
    var watch = M.watch(frame);
    if (!reduce) {
      M.subscribe(function (now) {
        if (!watch.live()) return;
        var crawl = ((now % 7000) / 7000) * 20.5;
        for (var a = 0; a < axes.length; a += 1) axes[a].style.strokeDashoffset = String(-crawl);
        var v = (now % 4200) / 4200;
        var ease = 1 - (1 - v) * (1 - v);
        ping.setAttribute('r', (10.63 * 0.6 + ease * 86 * 0.78).toFixed(2));
        ping.style.opacity = String(0.4 * (1 - ease) * (1 - ease));
      }, 33);
    }

    // ---- reticle -----------------------------------------------------------
    var armed = false;
    var rpos = null;
    var rQueued = false;
    function paintReticle() {
      rQueued = false;
      var ctx = reticle.getContext('2d');
      var k = dpr() * cssScale;
      ctx.setTransform(k, 0, 0, k, 0, 0);
      ctx.clearRect(0, 0, ART.w, ART.h);
      if (!rpos) return;
      var ci = clamp(Math.round(rpos.x / SPACING - 0.5), 0, cols - 1);
      var cj = clamp(Math.round(rpos.y / SPACING - 0.5), 0, rowsN - 1);
      var accent = Fx.css('--accent');
      ctx.fillStyle = accent;
      var reach = 20;
      var m;
      for (m = 0; m < cols; m += 1) {
        var dist = Math.abs(m - ci);
        if (dist <= 2) continue;
        var a = 1 - dist / reach;
        if (a <= 0) continue;
        ctx.globalAlpha = a * 0.9;
        ctx.beginPath();
        ctx.arc((m + 0.5) * SPACING, (cj + 0.5) * SPACING, 1.4 + 1.6 * a, 0, Math.PI * 2);
        ctx.fill();
      }
      for (m = 0; m < rowsN; m += 1) {
        var dd = Math.abs(m - cj);
        if (dd <= 2) continue;
        var b = 1 - dd / reach;
        if (b <= 0) continue;
        ctx.globalAlpha = b * 0.9;
        ctx.beginPath();
        ctx.arc((ci + 0.5) * SPACING, (m + 0.5) * SPACING, 1.4 + 1.6 * b, 0, Math.PI * 2);
        ctx.fill();
      }
      // where the arms cross, the dots square up into a chequer
      for (var di = -2; di <= 2; di += 1) {
        for (var dj = -2; dj <= 2; dj += 1) {
          if ((di + dj) % 2 !== 0) continue;
          var edge = Math.max(Math.abs(di), Math.abs(dj));
          ctx.globalAlpha = edge === 0 ? 1 : 0.85 - edge * 0.2;
          ctx.fillStyle = edge === 0 ? '#ffffff' : accent;
          var sz = edge === 0 ? 6.4 : 5;
          ctx.fillRect((ci + di + 0.5) * SPACING - sz / 2, (cj + dj + 0.5) * SPACING - sz / 2, sz, sz);
        }
      }
      ctx.globalAlpha = 1;
    }
    function queueReticle() {
      if (rQueued) return;
      rQueued = true;
      requestAnimationFrame(paintReticle);
    }
    function armReticle() {
      if (armed || reduce || !win.matchMedia('(hover: hover) and (pointer: fine)').matches) return;
      armed = true;
      var target = o.pointerHost || frame;
      target.addEventListener('pointermove', function (e) {
        var r = stage.getBoundingClientRect();
        var k = r.width / ART.w;
        var x = (e.clientX - r.left) / k;
        var y = (e.clientY - r.top) / k;
        rpos = x >= 0 && x <= ART.w && y >= 0 && y <= ART.h ? { x: x, y: y } : null;
        queueReticle();
      }, { passive: true });
      target.addEventListener('pointerleave', function () {
        rpos = null;
        queueReticle();
      });
    }

    // ---- start -----------------------------------------------------------
    onResize(frame, fit);
    Fx.onTheme(function () { drawHalftone(); drawTrace(state.elapsed); });
    fit();

    // The lap runs when the block arrives.
    var arrive = o.arrive || frame;
    if ('IntersectionObserver' in win) {
      var io = new IntersectionObserver(function (entries) {
        if (entries.some(function (e) { return e.isIntersecting; }) && M.ready) {
          io.disconnect();
          run();
        }
      }, { threshold: narrow() ? 0.35 : 0.55 });
      io.observe(arrive);
      doc.addEventListener('motion:ready', function () {
        io.disconnect();
        io.observe(arrive);
      });
    } else {
      run();
    }
    return { run: run, refit: fit };
  };

  /* ---------------------------------------------------------------------
   * Loading veil
   * ------------------------------------------------------------------- */
  /**
   * Fx.veil(el, readyPromise): fills the mark from the top while the page
   * compiles, then lifts. Calls Motion.start() when it has gone.
   */
  Fx.veil = function (el, ready) {
    var CLEAR_MS = 430;
    var PAUSE_MS = 240;
    var LIFT_TIMEOUT_MS = 3000;
    if (!el || M.reduced()) {
      if (el) el.remove();
      root.classList.remove('is-veiled');
      M.start();
      return;
    }
    var rect = el.querySelector('[data-veil-fill]');
    var meter = el.querySelector('[data-veil-meter]');
    var isReady = false;
    var finished = false;
    // While waiting the fill creeps toward 70%; once ready the spring tightens and finishes it.
    var cfg = { tension: M.config.waiting.tension, friction: M.config.waiting.friction };
    var progress = M.spring(cfg, function (p) {
      if (rect) rect.setAttribute('height', (clamp(p, 0, 1) * 64).toFixed(2));
      if (meter) meter.style.transform = 'scaleX(' + clamp(p, 0, 1).toFixed(4) + ')';
      if (p >= 0.999 && isReady) lift();
    });
    progress.to(0.7);

    function lift() {
      if (finished) return;
      finished = true;
      setTimeout(function () {
        var clear = M.spring(M.config.clear, function (p) {
          el.style.transform = 'translateY(' + (-p * 100).toFixed(2) + '%)';
          if (p >= 0.999) {
            el.remove();
            root.classList.remove('is-veiled');
          }
        });
        clear.to(1);
        // The page starts a beat before the veil has fully gone.
        setTimeout(M.start, CLEAR_MS * 0.55);
      }, PAUSE_MS);
    }

    function release() {
      if (isReady) return;
      isReady = true;
      cfg.tension = M.config.ready.tension;
      cfg.friction = M.config.ready.friction;
      progress.to(1);
    }

    Promise.resolve(ready).then(release, release);
    setTimeout(release, LIFT_TIMEOUT_MS);
  };
})();
