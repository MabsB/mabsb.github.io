/*
 * Motion engine for the portfolio. No build step, no dependencies of its own
 * (smooth scrolling uses the small Lenis library vendored in /assets/js/vendor).
 *
 *   ticker    one shared requestAnimationFrame loop, reference-counted
 *   springs   a damped-spring solver (tension / friction, mass 1)
 *   reveals   word and letter text reveals, block rises, rules, fades
 *   scrub     scroll-linked values with optional spring smoothing
 *   stack     pinned sections that recede as the next one covers them
 *
 * Everything is driven from the HTML with data attributes; see scan() below.
 * Under prefers-reduced-motion nothing is split, hidden or animated.
 */
(function () {
  'use strict';

  var win = window;
  var doc = document;
  var root = doc.documentElement;
  var mq = win.matchMedia ? win.matchMedia('(prefers-reduced-motion: reduce)') : { matches: false };
  var SCRIPT_SRC = (doc.currentScript && doc.currentScript.src) || '';
  var M = (win.Motion = {});
  M.reduced = function () { return mq.matches; };
  M.ready = false;

  var clamp = function (v, a, b) { return Math.min(b, Math.max(a, v)); };
  M.clamp = clamp;
  M.lerp = function (a, b, t) { return a + (b - a) * t; };

  /* ---------------------------------------------------------------------
   * Ticker: one rAF loop. Subscribers run only when
   * `time - last > getFramerate()`; 0 means every frame.
   * ------------------------------------------------------------------- */
  var subs = [];
  var rafId = 0;

  function frame(time) {
    rafId = requestAnimationFrame(frame);
    var snapshot = subs.slice();
    for (var i = 0; i < snapshot.length; i += 1) {
      var s = snapshot[i];
      if (s.dead) continue;
      if (time - s.last > s.rate()) {
        var dt = time - s.last;
        s.last = time;
        s.fn(time, dt);
      }
    }
  }

  M.subscribe = function (fn, rate) {
    var sub = { fn: fn, rate: typeof rate === 'function' ? rate : function () { return rate || 0; }, last: 0, dead: false };
    subs.push(sub);
    if (!rafId) rafId = requestAnimationFrame(frame);
    return function unsubscribe() {
      sub.dead = true;
      var i = subs.indexOf(sub);
      if (i !== -1) subs.splice(i, 1);
      if (!subs.length && rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
      }
    };
  };

  /* ---------------------------------------------------------------------
   * Springs
   * ------------------------------------------------------------------- */
  var CFG = {
    reveal: { tension: 90, friction: 26 },
    row: { tension: 170, friction: 24 },
    sheet: { tension: 190, friction: 26 },
    figure: { tension: 200, friction: 24 },
    type: { tension: 210, friction: 24 },
    year: { tension: 190, friction: 24 },
    copy: { tension: 110, friction: 26 },
    copyFast: { tension: 150, friction: 24 },
    name: { tension: 190, friction: 24 },
    veil: { tension: 70, friction: 24 },
    clear: { tension: 140, friction: 26 },
    label: { tension: 110, friction: 26 },
    entrance: { tension: 90, friction: 26 },
    waiting: { tension: 10, friction: 30 },
    ready: { tension: 170, friction: 26 },
    settle: { tension: 32, friction: 26 },
    trigger: { tension: 140, friction: 30 }
  };
  M.config = CFG;

  /** Advance a {p, v} state toward `target` by dt ms (1ms substeps, 64ms cap). Returns true when at rest. */
  function stepSpring(s, target, cfg, dt) {
    var steps = Math.min(64, Math.max(1, Math.round(dt)));
    for (var i = 0; i < steps; i += 1) {
      var force = -cfg.tension * (s.p - target);
      var damping = -cfg.friction * s.v;
      s.v += (force + damping) * 0.001;
      s.p += s.v * 0.001;
    }
    if (Math.abs(s.v) < 0.01 && Math.abs(target - s.p) < 0.001) {
      s.p = target;
      s.v = 0;
      return true;
    }
    return false;
  }
  M.stepSpring = stepSpring;

  /** A standalone spring: spring(cfg, apply).to(target, delay). */
  M.spring = function (cfg, apply, initial) {
    var s = { p: initial || 0, v: 0 };
    var target = s.p;
    var goAt = 0;
    var off = null;
    function tick(time, dt) {
      if (time < goAt) return;
      var rest = stepSpring(s, target, cfg, dt);
      apply(s.p);
      if (rest && off) {
        off();
        off = null;
      }
    }
    return {
      state: s,
      to: function (value, delay) {
        target = value;
        goAt = performance.now() + (delay || 0);
        if (M.reduced()) {
          s.p = value;
          s.v = 0;
          apply(value);
          return;
        }
        if (!off) off = M.subscribe(tick, 0);
      },
      set: function (value) {
        s.p = value;
        s.v = 0;
        target = value;
        apply(value);
      }
    };
  };

  /* ---------------------------------------------------------------------
   * Choreographed units (text units, rises, rules) on one shared ticker
   * ------------------------------------------------------------------- */
  var live = []; // units that are pending or moving
  var offSprings = null;
  var lastT = 0;

  function springTick(time) {
    var dt = lastT ? Math.min(64, time - lastT) : 16;
    lastT = time;
    for (var i = live.length - 1; i >= 0; i -= 1) {
      var u = live[i];
      if (time < u.goAt) continue;
      var rest = stepSpring(u, u.target, u.cfg, dt);
      u.apply(u.p);
      if (rest) {
        u.queued = false;
        live.splice(i, 1);
      }
    }
    if (!live.length && offSprings) {
      offSprings();
      offSprings = null;
      lastT = 0;
    }
  }

  function wake(unit) {
    if (!unit.queued) {
      unit.queued = true;
      live.push(unit);
    }
    if (!offSprings) {
      lastT = 0;
      offSprings = M.subscribe(springTick, 0);
    }
  }

  /* Text splitting. Keeps a visually-hidden plain copy for assistive tech
     and hides the animated spans from it. No overflow clip: the tight display
     line-heights would shave descenders. */
  function splitText(el, mode, gap) {
    var text = el.textContent.replace(/\s+/g, ' ').trim();
    el.textContent = '';
    var sr = doc.createElement('span');
    sr.className = 'visually-hidden';
    sr.textContent = text;
    var vis = doc.createElement('span');
    vis.className = 'rv rv--' + mode;
    vis.setAttribute('aria-hidden', 'true');
    if (gap !== null && gap !== undefined) vis.style.columnGap = gap + 'em';
    var units = [];
    text.split(' ').forEach(function (word) {
      var w = doc.createElement('span');
      w.className = 'rv-unit rv-word';
      if (mode === 'letters') {
        w.className = 'rv-word rv-word--letters';
        Array.prototype.forEach.call(word, function (ch) {
          var l = doc.createElement('span');
          l.className = 'rv-unit rv-letter';
          l.textContent = ch;
          w.appendChild(l);
          units.push(l);
        });
      } else {
        w.textContent = word;
        units.push(w);
      }
      vis.appendChild(w);
    });
    el.appendChild(sr);
    el.appendChild(vis);
    return units;
  }

  function makeUnit(el, kind, cfg) {
    var rise = kind === 'letters' ? 0.3 : kind === 'words' ? 0.35 : 0;
    var unit = { el: el, p: 0, v: 0, target: 0, goAt: 0, cfg: cfg, queued: false };
    var apply;
    if (kind === 'letters' || kind === 'words') {
      apply = function (p) {
        var o = clamp(p, 0, 1);
        el.style.opacity = o >= 0.999 ? '' : String(o);
        el.style.transform = p >= 0.999 && p <= 1.001 ? '' : 'translateY(' + ((1 - p) * rise).toFixed(4) + 'em)';
      };
    } else if (kind === 'rise') {
      var y = el.getAttribute('data-y') || '0.75rem';
      var m = /^(-?[\d.]+)(.*)$/.exec(y) || [0, '0.75', 'rem'];
      apply = function (p) {
        el.style.opacity = String(clamp(p, 0, 1));
        el.style.transform = p >= 0.999 && p <= 1.001 ? '' : 'translateY(' + ((1 - p) * parseFloat(m[1])).toFixed(4) + m[2] + ')';
      };
    } else if (kind === 'rule') {
      apply = function (p) {
        el.style.opacity = String(clamp(p, 0, 1));
        el.style.transform = p >= 0.999 && p <= 1.001 ? '' : 'scaleX(' + clamp(p, 0, 1.02).toFixed(4) + ')';
      };
    } else {
      apply = function (p) { el.style.opacity = String(clamp(p, 0, 1)); if (p >= 0.999) el.style.opacity = ''; };
    }
    unit.apply = apply;
    apply(0);
    return unit;
  }

  /* ---------------------------------------------------------------------
   * Stages: a block whose entrance plays when it enters view. Every reveal
   * inside it starts at its own delay after the stage enables.
   * ------------------------------------------------------------------- */
  var stages = [];
  var stageByEl = new Map();
  var observers = {};

  function observerFor(margin) {
    if (observers[margin]) return observers[margin];
    observers[margin] = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        var st = stageByEl.get(e.target);
        if (!st) return;
        // Above the viewport: hold the played state rather than reversing.
        var box = e.boundingClientRect;
        var shown = box.width > 0 || box.height > 0; // display:none reports an empty box
        var enabled = shown && (e.isIntersecting || box.top <= 0);
        if (enabled === st.enabled) return;
        st.enabled = enabled;
        if (M.ready) applyStage(st);
      });
    }, { rootMargin: margin, threshold: 0 });
    return observers[margin];
  }

  function applyStage(st) {
    var now = performance.now();
    st.items.forEach(function (item) {
      item.units.forEach(function (u, i) {
        if (st.enabled) {
          u.target = 1;
          u.goAt = now + item.delay + i * item.stagger;
          wake(u);
        } else {
          // Left below the fold: snap back so it plays again on the way down.
          u.target = 0;
          u.p = 0;
          u.v = 0;
          u.apply(0);
          u.queued = false;
          var at = live.indexOf(u);
          if (at !== -1) live.splice(at, 1);
        }
      });
    });
  }

  /** Forget every stage and trigger inside `scope` (call before re-rendering a list). */
  M.forget = function (scope) {
    stages = stages.filter(function (st) {
      if (!scope.contains(st.el)) return true;
      stageByEl.delete(st.el);
      st.items.forEach(function (item) {
        item.units.forEach(function (u) {
          var at = live.indexOf(u);
          if (at !== -1) live.splice(at, 1);
          u.queued = false;
        });
      });
      Object.keys(observers).forEach(function (k) { observers[k].unobserve(st.el); });
      return false;
    });
    M.unscrubWithin(scope);
  };

  function stageFor(el) {
    var host = el.closest('[data-stage]') || el;
    var st = stageByEl.get(host);
    if (!st) {
      st = { el: host, items: [], enabled: false };
      stageByEl.set(host, st);
      stages.push(st);
      observerFor(host.getAttribute('data-stage-margin') || '0px 0px -12% 0px').observe(host);
    }
    return st;
  }

  function num(el, name, fallback) {
    var v = el.getAttribute(name);
    return v === null || v === '' ? fallback : parseFloat(v);
  }

  /** Wire up every reveal inside `scope` (the whole document by default). */
  M.scan = function (scope) {
    if (M.reduced() || !('IntersectionObserver' in win)) return;
    scope = scope || doc;
    var nodes = scope.querySelectorAll('[data-reveal],[data-rise],[data-fade],[data-rule]');
    Array.prototype.forEach.call(nodes, function (el) {
      if (el.__motion) return;
      el.__motion = true;
      var delay = num(el, 'data-delay', 0);
      var cfgName = el.getAttribute('data-cfg');
      var item;
      if (el.hasAttribute('data-reveal')) {
        var mode = el.getAttribute('data-reveal') === 'letters' ? 'letters' : 'words';
        var stagger = num(el, 'data-stagger', mode === 'letters' ? 22 : 34);
        var cfg = CFG[cfgName] || (mode === 'letters' ? CFG.type : CFG.copyFast);
        var units = splitText(el, mode, el.hasAttribute('data-gap') ? parseFloat(el.getAttribute('data-gap')) : null)
          .map(function (u) { return makeUnit(u, mode, cfg); });
        item = { units: units, delay: delay, stagger: stagger };
      } else {
        var kind = el.hasAttribute('data-rise') ? 'rise' : el.hasAttribute('data-rule') ? 'rule' : 'fade';
        var u = makeUnit(el, kind, CFG[cfgName] || CFG.reveal);
        item = { units: [u], delay: delay, stagger: 0 };
      }
      var st = stageFor(el);
      st.items.push(item);
      if (M.ready && st.enabled) applyStage(st);
    });
  };

  /** Release the stages once the loading veil has lifted. */
  M.start = function () {
    if (M.ready) return;
    M.ready = true;
    stages.forEach(function (st) { if (st.enabled) applyStage(st); });
    doc.dispatchEvent(new CustomEvent('motion:ready'));
  };

  /* ---------------------------------------------------------------------
   * Visibility: "loop only in view, plus ten frames after leaving"
   * ------------------------------------------------------------------- */
  M.watch = function (el, margin) {
    var w = { visible: true, grace: 10 };
    if ('IntersectionObserver' in win) {
      w.visible = false;
      w.grace = 0;
      new IntersectionObserver(function (entries) {
        var e = entries[entries.length - 1];
        w.visible = e.isIntersecting;
        if (!e.isIntersecting) w.grace = 10;
      }, { rootMargin: margin || '120px 0px' }).observe(el);
    }
    w.live = function () {
      if (w.visible) return true;
      if (w.grace > 0) {
        w.grace -= 1;
        return true;
      }
      return false;
    };
    return w;
  };

  /* ---------------------------------------------------------------------
   * Scroll triggers (scrub)
   * ------------------------------------------------------------------- */
  var triggers = [];
  var offTriggers = null;

  function poses(bb, vh) {
    return {
      top_top: bb.top, center_top: bb.top + bb.height / 2, bottom_top: bb.bottom,
      top_bottom: bb.top - vh, center_bottom: bb.top + bb.height / 2 - vh, bottom_bottom: bb.bottom - vh,
      top_center: bb.top - vh / 2, center_center: bb.top + bb.height / 2 - vh / 2, bottom_center: bb.bottom - vh / 2
    };
  }

  function triggerTick(time, dt) {
    var vh = win.innerHeight || 1;
    var batch = [];
    for (var i = 0; i < triggers.length; i += 1) {
      var t = triggers[i];
      if (!t.watch.live()) continue;
      var bb = (t.ref || t.el).getBoundingClientRect();
      var p = poses(bb, vh);
      var a = p[t.start.replace(' ', '_')];
      var b = p[t.end.replace(' ', '_')];
      var length = Math.abs(a - b) || 1;
      batch.push({ t: t, progress: Math.min(Math.max(0, 1 - (a + length) / length), 1) });
    }
    for (var j = 0; j < batch.length; j += 1) {
      var item = batch[j];
      var tr = item.t;
      tr.progress = item.progress;
      if (tr.smooth) {
        stepSpring(tr.sp, item.progress, CFG.trigger, Math.min(64, dt || 16));
        tr.apply(tr.sp.p, item.progress);
      } else {
        tr.apply(item.progress, item.progress);
      }
    }
  }

  /**
   * M.scrub(el, { start: 'top bottom', end: 'bottom top', apply(p), smooth, ref })
   * `apply` receives progress 0..1 (spring-smoothed when `smooth` is set).
   */
  M.scrub = function (el, opts) {
    if (!el) return null;
    var tr = {
      el: el,
      ref: opts.ref || null,
      start: opts.start || 'top bottom',
      end: opts.end || 'bottom top',
      apply: opts.apply,
      smooth: !!opts.smooth,
      sp: { p: 0, v: 0 },
      progress: 0,
      watch: M.watch(opts.ref || el, opts.margin || '200px 0px')
    };
    if (M.reduced()) {
      // Park at the design position (halfway) rather than animating.
      tr.apply(opts.rest === undefined ? 0.5 : opts.rest, opts.rest === undefined ? 0.5 : opts.rest);
      return tr;
    }
    triggers.push(tr);
    if (!offTriggers) offTriggers = M.subscribe(triggerTick, 10);
    return tr;
  };

  M.unscrub = function (tr) {
    var i = triggers.indexOf(tr);
    if (i !== -1) triggers.splice(i, 1);
    if (!triggers.length && offTriggers) {
      offTriggers();
      offTriggers = null;
    }
  };

  /** Drop every trigger whose element lives inside `scope` (used when a list is re-rendered). */
  M.unscrubWithin = function (scope) {
    triggers.slice().forEach(function (tr) {
      if (scope.contains(tr.el)) M.unscrub(tr);
    });
  };

  /* ---------------------------------------------------------------------
   * Sticky stack: each pinned layer recedes (scale 0.9, shade 55%) while the
   * next one covers it. The transform lives on an inner wrapper, never on
   * the sticky element itself.
   * ------------------------------------------------------------------- */
  var RECEDE_SCALE = 0.9;
  var RECEDE_SHADE = 0.55;

  M.stack = function (container) {
    var layers = Array.prototype.slice.call(container.querySelectorAll('[data-layer]'));
    var pinned = layers.slice(0, -1).map(function (layer, i) {
      return {
        layer: layer,
        inner: layer.querySelector('[data-layer-inner]'),
        shade: layer.querySelector('[data-layer-shade]'),
        next: layers[i + 1]
      };
    });
    var phone = win.matchMedia('(max-width: 639px)');
    var queued = false;

    function fit() {
      // A layer taller than the screen pins by its bottom edge, so all of it can be read.
      var view = win.innerHeight || 1;
      pinned.forEach(function (item) {
        item.layer.style.top = Math.min(0, view - item.layer.offsetHeight) + 'px';
      });
    }

    function apply() {
      queued = false;
      var view = win.innerHeight || 1;
      var shrink = phone.matches || M.reduced() ? 0 : 1 - RECEDE_SCALE;
      pinned.forEach(function (item) {
        var p = Math.min(1, Math.max(0, 1 - item.next.getBoundingClientRect().top / view));
        // No transform at rest: a scale(1) would re-parent fixed descendants.
        item.inner.style.transform = p > 0 && shrink > 0 ? 'scale(' + (1 - shrink * p) + ')' : '';
        item.inner.style.willChange = p > 0 && shrink > 0 ? 'transform' : '';
        if (item.shade) item.shade.style.opacity = M.reduced() ? '0' : String(RECEDE_SHADE * p);
        item.inner.style.visibility = p >= 1 ? 'hidden' : 'visible';
      });
    }

    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(apply);
    }

    win.addEventListener('scroll', schedule, { passive: true });
    win.addEventListener('resize', function () { fit(); schedule(); });
    if ('ResizeObserver' in win) {
      var ro = new ResizeObserver(function () { fit(); schedule(); });
      layers.forEach(function (layer) { ro.observe(layer); });
    }
    fit();
    apply();
    return { refresh: function () { fit(); apply(); } };
  };

  /** Document Y at which `el` sits when its layer is unpinned (sticky layers report their stuck position otherwise). */
  M.anchorTop = function (el) {
    var layer = el.closest('[data-layer]');
    var scroll = win.pageYOffset;
    if (!layer || !layer.hasAttribute('data-pinned')) return el.getBoundingClientRect().top + scroll;
    var parent = layer.parentElement;
    var y = parent.getBoundingClientRect().top + scroll;
    var sib = layer.previousElementSibling;
    while (sib) {
      y += sib.offsetHeight;
      sib = sib.previousElementSibling;
    }
    // Where the element sits inside its own layer.
    var inLayer = 0;
    var node = el;
    while (node && node !== layer) {
      inLayer += node.offsetTop;
      node = node.offsetParent;
      if (node === layer) break;
    }
    return y + inLayer;
  };

  /* ---------------------------------------------------------------------
   * Smooth scrolling (Lenis, from the shared ticker) and programmatic scroll
   * ------------------------------------------------------------------- */
  var lenis = null;

  M.initSmoothScroll = function () {
    if (M.reduced() || !win.matchMedia('(hover: hover)').matches) return Promise.resolve(false);
    // The site also opens from file://, where module imports are blocked; it just scrolls natively then.
    var path = SCRIPT_SRC ? SCRIPT_SRC.replace(/[^/]*$/, '') + 'vendor/lenis.mjs' : 'assets/js/vendor/lenis.mjs';
    return import(path)
      .then(function (mod) {
        var Lenis = mod.default;
        lenis = new Lenis({ smoothWheel: true });
        root.classList.add('lenis');
        // Registered first, so every scroll reader sees this frame's scrollY.
        subs.unshift({ fn: function (time) { lenis.raf(time); }, rate: function () { return 0; }, last: 0, dead: false });
        if (!rafId) rafId = requestAnimationFrame(frame);
        return true;
      })
      .catch(function () {
        lenis = null;
        return false;
      });
  };

  M.scrollTo = function (y, immediate) {
    var target = Math.max(0, Math.round(y));
    if (lenis) {
      lenis.scrollTo(target, { immediate: !!immediate || M.reduced(), duration: 1.15 });
    } else {
      win.scrollTo({ top: target, behavior: immediate || M.reduced() ? 'auto' : 'smooth' });
    }
  };

  M.lock = function (on) {
    if (lenis) {
      if (on) lenis.stop();
      else lenis.start();
    }
    root.classList.toggle('is-locked', !!on);
  };
})();
