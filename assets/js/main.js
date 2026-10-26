/*
 * Portfolio: content, navigation and page wiring.
 *
 * - The projects, skills and certifications sections are built from the files
 *   in /content. You normally edit those files, not this one.
 * - motion.js (springs, reveals, scroll triggers, the stack) and fx.js
 *   (contours, chequered seams, the circuit lap, the veil) do the movement;
 *   this file connects them to the page.
 * No libraries and no build step.
 */
(function () {
  'use strict';

  var data = window.PORTFOLIO || {};
  var root = document.documentElement;
  var M = window.Motion;
  var Fx = window.Fx;
  var reduceMotion = M.reduced;
  var hasObserver = 'IntersectionObserver' in window;
  var SVGNS = 'http://www.w3.org/2000/svg';

  /* ---------------------------------------------------------------------
   * Helpers
   * ------------------------------------------------------------------- */

  /** Create an element. props: class, text, attributes, on<event> handlers. */
  function el(tag, props, children) {
    var node = document.createElement(tag);
    props = props || {};
    Object.keys(props).forEach(function (key) {
      var value = props[key];
      if (value === null || value === undefined || value === false) return;
      if (key === 'class') node.className = value;
      else if (key === 'text') node.textContent = value;
      else if (key === 'style') node.setAttribute('style', value);
      else if (key.indexOf('on') === 0 && typeof value === 'function') {
        node.addEventListener(key.slice(2), value);
      } else node.setAttribute(key, value === true ? '' : String(value));
    });
    [].concat(children || []).forEach(function (child) {
      if (child === null || child === undefined || child === false) return;
      node.append(child instanceof Node ? child : document.createTextNode(String(child)));
    });
    return node;
  }

  var ICONS = {
    external: '<path d="M9 6h9v9M18 6 6 18"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>'
  };

  function icon(name) {
    var span = document.createElement('span');
    span.innerHTML =
      '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' + (ICONS[name] || '') + '</svg>';
    return span.firstChild;
  }

  function srOnly(text) {
    return el('span', { class: 'visually-hidden', text: text });
  }

  /** A chamfered call-to-action: <a> when href is given, else <button>. */
  function cta(label, opts) {
    opts = opts || {};
    var node = el(opts.href ? 'a' : 'button', {
      class: 'cta' + (opts.ghost ? ' cta--ghost' : '') + (opts.small ? ' cta--sm' : '') + (opts.class ? ' ' + opts.class : ''),
      href: opts.href || null,
      type: opts.href ? null : 'button',
      target: opts.external ? '_blank' : null,
      rel: opts.external ? 'noopener' : null
    });
    node.innerHTML =
      '<span class="cta-flood" aria-hidden="true"></span><span class="cta-label"></span>' +
      '<svg class="cta-arrow' + (opts.down ? ' cta-arrow--down' : '') + '" viewBox="0 0 13 10.7" aria-hidden="true" focusable="false"><path d="M0 5.35H13M8 10.35L13 5.35L8 0.35"/></svg>';
    var text = node.querySelector('.cta-label');
    text.textContent = label;
    if (opts.external) text.append(srOnly(' (opens in a new tab)'));
    return node;
  }

  /** Only allow https:, mailto: and relative links from the content files. */
  function safeUrl(url) {
    if (typeof url !== 'string') return null;
    var value = url.trim();
    if (!value) return null;
    if (/^(https:|mailto:)/i.test(value)) return value;
    if (/^[a-z][a-z0-9+.-]*:/i.test(value) || value.indexOf('//') === 0) return null;
    return value;
  }

  function isExternal(url) {
    return /^https:/i.test(url);
  }

  function normalize(text) {
    return String(text || '').toLowerCase().replace(/\s+/g, ' ').trim();
  }

  /** Wrap the matching part of text in <mark>. */
  function highlight(text, query) {
    var frag = document.createDocumentFragment();
    var q = normalize(query);
    var index = q ? text.toLowerCase().indexOf(q) : -1;
    if (index < 0) {
      frag.append(text);
      return frag;
    }
    frag.append(text.slice(0, index));
    frag.append(el('mark', { text: text.slice(index, index + q.length) }));
    frag.append(text.slice(index + q.length));
    return frag;
  }

  function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : many);
  }

  /** Shown to visitors if a content file fails to load; details go to the console. */
  function showLoadError(host, what, file) {
    if (!host) return;
    host.replaceChildren(el('p', { class: 'load-error', text: 'This section is temporarily unavailable.' }));
    if (window.console) {
      console.error(
        '[portfolio] Could not build the ' + what + ' list. Check ' + file +
        ' for a typing mistake (a missing comma, quote or bracket).'
      );
    }
  }

  function safely(name, fn) {
    try {
      fn();
    } catch (error) {
      if (window.console) console.error('[portfolio] ' + name + ' failed:', error);
    }
  }

  function whenVisible(node, fn, options) {
    if (!node) return;
    if (!hasObserver) return fn();
    var observer = new IntersectionObserver(function (entries) {
      if (entries.some(function (entry) { return entry.isIntersecting; })) {
        observer.disconnect();
        fn();
      }
    }, options || { threshold: 0.2 });
    observer.observe(node);
  }

  /** A row of toggle buttons. options: [{ id, label, count }] */
  function buildFilterBar(host, options, active, onChange) {
    host.replaceChildren();
    var buttons = options.map(function (option) {
      var button = el('button', {
        class: 'filter-chip',
        type: 'button',
        'aria-pressed': String(option.id === active),
        'data-filter': option.id,
        onclick: function () { onChange(option.id); }
      }, [option.label, el('span', { class: 'count', text: String(option.count) })]);
      host.append(button);
      return button;
    });
    return function setActive(id) {
      buttons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-filter') === id));
      });
    };
  }

  /* ---------------------------------------------------------------------
   * Theme: the toggle changes only the page ground; each block keeps its surface
   * ------------------------------------------------------------------- */
  function initTheme() {
    var button = document.querySelector('[data-theme-toggle]');
    if (!button) return;
    var meta = document.querySelector('meta[name="theme-color"]');

    function apply(theme, remember) {
      root.setAttribute('data-theme', theme);
      var next = theme === 'dark' ? 'light' : 'dark';
      button.setAttribute('aria-label', 'Switch to ' + next + ' theme');
      button.setAttribute('title', 'Switch to ' + next + ' theme');
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#13151b' : '#f7fafb');
      if (remember) {
        try { localStorage.setItem('theme', theme); } catch (e) { /* private mode: the toggle still works */ }
      }
    }

    apply(root.getAttribute('data-theme') === 'dark' ? 'dark' : 'light', false);
    button.addEventListener('click', function () {
      apply(root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark', true);
    });
  }

  /* ---------------------------------------------------------------------
   * Navigation: header surface, current section, anchors, menu sheet
   * ------------------------------------------------------------------- */
  var HEADER_OFFSET = 0;

  function scrollToTarget(target) {
    if (!target) return;
    var isSection = target.tagName === 'SECTION';
    var header = document.querySelector('.site-header');
    var offset = isSection ? 0 : (header ? header.offsetHeight : 64) + 24;
    M.scrollTo(M.anchorTop(target) - offset);
    HEADER_OFFSET = offset;
  }

  function initAnchors() {
    document.addEventListener('click', function (event) {
      var link = event.target.closest && event.target.closest('a[href^="#"]');
      if (!link || event.defaultPrevented || event.metaKey || event.ctrlKey || event.shiftKey || event.button) return;
      var hash = link.getAttribute('href');
      if (hash === '#' || hash.length < 2) return;
      var target = document.getElementById(hash.slice(1));
      if (!target) return;
      event.preventDefault();
      var projectId = link.getAttribute('data-open-project');
      var open = projectId && document.getElementById(projectId);
      if (open) {
        var disclosure = open.querySelector('.disclosure');
        if (disclosure && disclosure.getAttribute('aria-expanded') !== 'true') disclosure.click();
        target = open;
      }
      scrollToTarget(target);
      try { history.replaceState(null, '', hash); } catch (e) { /* file:// */ }
      if (target.tagName !== 'SECTION') return;
      // Move focus along with the view for keyboard and screen-reader users.
      var heading = target.querySelector('h2');
      if (heading) {
        heading.setAttribute('tabindex', '-1');
        heading.focus({ preventScroll: true });
      }
    });
  }

  function initHeader() {
    var header = document.querySelector('[data-header]');
    if (!header) return;
    var surfaces = Array.prototype.slice.call(document.querySelectorAll('[data-surface]'));
    var tracked = ['about', 'projects', 'skills', 'certifications', 'contact']
      .map(function (id) { return document.getElementById(id); })
      .filter(Boolean);
    var links = Array.prototype.slice.call(document.querySelectorAll('.nav-menu a[href^="#"]'));
    var queued = false;

    function update() {
      queued = false;
      var vh = window.innerHeight || 1;
      header.classList.toggle('is-scrolled', window.scrollY > 8);

      // Which surface is under the header? Later blocks cover earlier ones.
      var under = null;
      var y = header.offsetHeight / 2;
      surfaces.forEach(function (node) {
        var r = node.getBoundingClientRect();
        if (r.top <= y && r.bottom > y) under = node;
      });
      var dark = under && under.getAttribute('data-surface') !== 'light';
      header.classList.toggle('on-dark', !!dark);

      // Which section is in the middle of the screen?
      var current = null;
      tracked.forEach(function (node) {
        var r = node.getBoundingClientRect();
        if (r.top <= vh * 0.4 && r.bottom > vh * 0.4) current = node;
      });
      links.forEach(function (link) {
        var on = current && link.getAttribute('href') === '#' + current.id;
        if (on) link.setAttribute('aria-current', 'true');
        else link.removeAttribute('aria-current');
      });
    }
    function schedule() {
      if (queued) return;
      queued = true;
      requestAnimationFrame(update);
    }
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
    update();
  }

  function initSheet() {
    var sheet = document.getElementById('menu-sheet');
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('nav-menu');
    if (!sheet || !toggle || !menu) return;
    var nav = sheet.querySelector('.sheet-nav');
    var close = sheet.querySelector('.sheet-close');

    Array.prototype.forEach.call(menu.querySelectorAll('a'), function (link, i) {
      nav.append(el('a', {
        href: link.getAttribute('href'),
        'data-reveal': 'letters',
        'data-delay': 120 + i * 55,
        'data-stagger': 20,
        'data-cfg': 'sheet',
        'data-gap': 0.2,
        text: link.textContent
      }));
    });
    M.scan(sheet);

    function focusables() {
      return Array.prototype.slice.call(sheet.querySelectorAll('a[href], button')).filter(function (n) { return n.offsetParent !== null; });
    }
    function setOpen(open) {
      sheet.hidden = !open;
      toggle.setAttribute('aria-expanded', String(open));
      M.lock(open);
      if (open) close.focus();
      else toggle.focus();
    }
    toggle.addEventListener('click', function () { setOpen(true); });
    close.addEventListener('click', function () { setOpen(false); });
    nav.addEventListener('click', function (event) {
      var link = event.target.closest('a');
      if (!link) return;
      sheet.hidden = true;
      toggle.setAttribute('aria-expanded', 'false');
      M.lock(false);
    });
    sheet.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') {
        event.preventDefault();
        setOpen(false);
      } else if (event.key === 'Tab') {
        var items = focusables();
        if (!items.length) return;
        var first = items[0];
        var last = items[items.length - 1];
        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });
    var wide = window.matchMedia('(min-width: 960px)');
    var onChange = function (e) { if (e.matches && !sheet.hidden) { sheet.hidden = true; toggle.setAttribute('aria-expanded', 'false'); M.lock(false); } };
    if (wide.addEventListener) wide.addEventListener('change', onChange);
  }

  /* ---------------------------------------------------------------------
   * Numbers counted from the content files
   * ------------------------------------------------------------------- */
  function visibleProjects() {
    return (Array.isArray(data.projects) ? data.projects : []).filter(function (project) {
      return project && project.visible !== false && project.title;
    });
  }

  function validCertificates() {
    return (Array.isArray(data.certificates) ? data.certificates : []).filter(function (cert) {
      return cert && cert.title;
    });
  }

  function initStats() {
    var projects = visibleProjects();
    var counts = {
      projects: projects.length,
      live: projects.filter(function (p) { return p.status === 'live'; }).length,
      certificates: validCertificates().length
    };
    document.querySelectorAll('[data-stat]').forEach(function (node) {
      var value = counts[node.getAttribute('data-stat')];
      if (typeof value === 'number' && value > 0) node.textContent = String(value);
    });
    document.querySelectorAll('[data-cert-total]').forEach(function (node) {
      if (counts.certificates) node.textContent = String(counts.certificates);
    });
  }

  /* ---------------------------------------------------------------------
   * Projects: a rail down the middle, one row per project
   * ------------------------------------------------------------------- */
  var STATUS = {
    live: { label: 'Live' },
    built: { label: 'Built' },
    prototype: { label: 'Prototype' },
    'in-progress': { label: 'In progress' },
    coursework: { label: 'Coursework' }
  };
  var AREAS = { web: 'Web', iot: 'IoT', mobile: 'Mobile', ai: 'AI', networking: 'Networking' };
  var PLATE_OUTLINE =
    'M13.6168 0.497469H697.378C700.858 0.497469 704.195 1.38786 706.655 2.97277C709.115 4.55769 710.498 6.70729 710.498 8.94869V411.208C710.498 413.449 709.115 415.599 706.655 417.183C704.195 418.768 700.858 419.659 697.378 419.659H460.249C454.073 419.659 447.976 420.555 442.411 422.281C436.847 424.008 431.958 426.519 428.107 429.63L399.246 452.95C395.559 455.928 390.878 458.333 385.55 459.986C380.223 461.639 374.385 462.497 368.472 462.497H13.6168C10.1373 462.497 6.80038 461.607 4.34003 460.022C1.87968 458.437 0.497469 456.288 0.497469 454.046V8.94869C0.497469 6.70729 1.87968 4.55769 4.34003 2.97277C6.80038 1.38786 10.1373 0.497469 13.6168 0.497469Z';

  function linkButton(link) {
    var url = safeUrl(link.url);
    if (!url) return null;
    return cta(String(link.label || 'Open link'), { href: url, external: isExternal(url), ghost: true, small: true });
  }

  function badges(project, featured) {
    var status = STATUS[project.status];
    var meta = [project.kind, project.year].filter(Boolean).join(' · ');
    return el('div', { class: 'badges' }, [
      featured ? el('span', { class: 'badge badge--accent', text: 'Featured' }) : null,
      status && project.status === 'live' ? el('span', { class: 'badge badge--live', text: status.label }) : null,
      meta ? el('span', { class: 'badge', text: meta }) : null,
      status && project.status !== 'live' ? el('span', { class: 'badge', text: status.label }) : null
    ]);
  }

  function builtBlock(project) {
    if (!Array.isArray(project.built) || !project.built.length) return null;
    return el('div', { class: 'project-block' }, [
      el('h4', { text: String(project.builtHeading || 'What I built') }),
      el('ul', { class: 'built-list' }, project.built.map(function (item) { return el('li', { text: String(item) }); }))
    ]);
  }

  function sectionBlocks(project) {
    return (project.sections || []).filter(function (s) { return s && s.text; }).map(function (section) {
      return el('div', { class: 'project-block' }, [
        el('h4', { text: String(section.heading || '') }),
        el('p', { text: String(section.text) })
      ]);
    });
  }

  function rolesBlock(project) {
    if (!Array.isArray(project.roles) || !project.roles.length) return null;
    return el('div', { class: 'project-block' }, [
      el('h4', { text: String(project.rolesHeading || 'User roles') }),
      el('ul', { class: 'roles' }, project.roles.map(function (role) { return el('li', { text: String(role) }); }))
    ]);
  }

  function specBlock(project) {
    if (!project.spec || !Array.isArray(project.spec.items) || !project.spec.items.length) return null;
    return el('section', { class: 'spec', 'aria-label': String(project.spec.heading || 'Specification') }, [
      el('div', { class: 'spec-head' }, [
        el('h4', { text: String(project.spec.heading || 'Specification') }),
        el('span', { class: 'badge badge--spec', text: String(project.spec.badge || 'As specified') })
      ]),
      el('dl', null, project.spec.items.map(function (item) {
        var value = String(item.value || '');
        return el('div', { class: value.length > 28 ? 'is-wide' : null }, [
          el('dt', { text: String(item.label || '') }),
          el('dd', { text: value })
        ]);
      }))
    ]);
  }

  function codeBlock(project) {
    if (!project.code || !Array.isArray(project.code.rows) || !project.code.rows.length) return null;
    return el('div', { class: 'code-sample' }, [
      el('h4', { text: String(project.code.heading || 'Example') }),
      el('dl', { class: 'code-rows' }, project.code.rows.map(function (row) {
        // Allow line breaks only after "|" and ", " so long messages wrap cleanly.
        var code = el('code');
        String(row.value || '').split(/(\||, )/).forEach(function (part) {
          if (!part) return;
          code.append(part);
          if (part === '|' || part === ', ') code.append(el('wbr'));
        });
        return el('div', null, [el('dt', { text: String(row.label || '') }), el('dd', null, [code])]);
      }))
    ]);
  }

  function projectImages(project) {
    return (project.images || []).filter(function (image) { return image && safeUrl(image.src); });
  }

  function imageEl(image) {
    return el('img', {
      src: safeUrl(image.src),
      alt: String(image.alt || ''),
      width: image.width || null,
      height: image.height || null,
      loading: 'lazy',
      decoding: 'async'
    });
  }

  function stackList(project) {
    if (!Array.isArray(project.stack) || !project.stack.length) return null;
    return el('ul', { class: 'tech-list', 'aria-label': 'Technologies' }, project.stack.map(function (tech) {
      return el('li', { class: 'tech', text: String(tech) });
    }));
  }

  function linkRow(project) {
    var links = (project.links || []).map(linkButton).filter(Boolean);
    return links.length ? el('div', { class: 'project-links' }, links) : null;
  }

  /* Plate art: drawn from the project's own data, so nothing here is invented. */
  function flowArt(steps) {
    var W = 710, bw = 128, bh = 62, n = steps.length;
    var dx = (W - 88 - bw) / (n - 1);
    var dy = n > 1 ? Math.min(72, 300 / (n - 1)) : 0;
    var boxes = steps.map(function (s, i) { return { x: 44 + dx * i, y: 54 + dy * i, s: s }; });
    var d = '';
    boxes.forEach(function (b, i) {
      var cy = b.y + bh / 2;
      if (i === 0) d += 'M' + (b.x + bw / 2) + ' ' + cy;
      d += ' L' + (b.x + bw) + ' ' + cy;
      var nb = boxes[i + 1];
      if (nb) d += ' L' + (nb.x + bw / 2) + ' ' + cy + ' L' + (nb.x + bw / 2) + ' ' + (nb.y + bh / 2);
    });
    var out = '<path class="art-dash" d="' + d + '"/>';
    boxes.forEach(function (b, i) {
      out += '<g><rect class="' + (b.s.highlight ? 'art-key' : 'art-box') + '" x="' + b.x + '" y="' + b.y + '" width="' + bw + '" height="' + bh + '"/>' +
        '<text class="art-step" x="' + (b.x + 10) + '" y="' + (b.y + 19) + '">' + String(i + 1).padStart(2, '0') + (b.s.step ? ' · ' + String(b.s.step).toUpperCase() : '') + '</text>' +
        '<text class="art-text" x="' + (b.x + 10) + '" y="' + (b.y + 44) + '"></text></g>';
    });
    out += '<circle class="art-pulse" r="4" cx="-20" cy="-20" data-art-pulse/>';
    return { markup: out, path: d };
  }

  function partMarkup(kind, cx, cy) {
    if (kind === 'web') {
      return '<g transform="translate(' + (cx - 150) + ' ' + (cy - 105) + ')"><rect class="art-box" width="300" height="210"/>' +
        '<path class="art-line" d="M0 30H300"/><circle class="art-soft" cx="16" cy="15" r="4"/><circle class="art-soft" cx="31" cy="15" r="4"/><circle class="art-soft" cx="46" cy="15" r="4"/>' +
        '<rect class="art-soft" x="18" y="48" width="264" height="26"/>' +
        '<rect class="art-key" x="18" y="90" width="80" height="96"/><rect class="art-box" x="110" y="90" width="80" height="96"/><rect class="art-box" x="202" y="90" width="80" height="96"/></g>';
    }
    if (kind === 'mobile') {
      return '<g transform="translate(' + (cx - 62) + ' ' + (cy - 115) + ')"><rect class="art-box" width="124" height="230" rx="18"/>' +
        '<rect class="art-soft" x="14" y="26" width="96" height="30"/><rect class="art-key" x="14" y="70" width="96" height="60"/>' +
        '<rect class="art-soft" x="14" y="144" width="44" height="44"/><rect class="art-soft" x="66" y="144" width="44" height="44"/><path class="art-line" d="M46 212H78"/></g>';
    }
    // iot: a board with pins
    var pins = '';
    for (var i = 0; i < 6; i += 1) {
      pins += '<path class="art-line" d="M' + (18 + i * 24) + ' 0V-12M' + (18 + i * 24) + ' 120V132"/>';
    }
    return '<g transform="translate(' + (cx - 80) + ' ' + (cy - 60) + ')"><rect class="art-box" width="160" height="120"/>' + pins +
      '<rect class="art-key" x="44" y="34" width="72" height="52"/><circle class="art-soft" cx="20" cy="100" r="6"/><circle class="art-soft" cx="140" cy="20" r="6"/></g>';
  }

  function plateArt(project) {
    var steps = (project.flow || []).filter(function (s) { return s && s.label; });
    var svg = document.createElementNS(SVGNS, 'svg');
    svg.setAttribute('class', 'plate-art');
    svg.setAttribute('viewBox', '0 0 710 463');
    svg.setAttribute('preserveAspectRatio', 'xMidYMid slice');
    svg.setAttribute('focusable', 'false');
    var art = null;
    if (steps.length >= 2) {
      art = flowArt(steps);
      svg.innerHTML = art.markup;
      var texts = svg.querySelectorAll('.art-text');
      steps.forEach(function (s, i) { texts[i].textContent = String(s.label); });
      svg.setAttribute('role', 'img');
      svg.setAttribute('aria-label', 'How it works: ' + steps.map(function (s) { return s.label; }).join(', then '));
    } else {
      var kinds = [];
      (project.areas || []).forEach(function (a) {
        if (a === 'web' || a === 'mobile' || a === 'iot') kinds.push(a);
      });
      if (!kinds.length) kinds = ['web'];
      kinds = kinds.slice(0, 2);
      var markup = '<path class="art-dash" d="M355 40V423M40 231.5H670"/>';
      if (kinds.length === 1) markup += partMarkup(kinds[0], 355, 231);
      else markup += partMarkup(kinds[0], 190, 231) + partMarkup(kinds[1], 520, 231) +
        '<path class="art-dash" d="M262 231H440"/><circle class="art-pulse" r="4" cx="-20" cy="-20" data-art-pulse/>';
      svg.innerHTML = markup;
      svg.setAttribute('aria-hidden', 'true');
      art = { path: kinds.length === 2 ? 'M262 231L440 231' : null };
    }
    return { svg: svg, path: art && art.path };
  }

  /** Moves the pulse dot along the plate's chain while it is on screen. */
  function runArtPulse(svg, pathData) {
    var dot = svg.querySelector('[data-art-pulse]');
    if (!dot || !pathData || reduceMotion()) return;
    var path = document.createElementNS(SVGNS, 'path');
    path.setAttribute('d', pathData);
    var length = path.getTotalLength();
    var watch = M.watch(svg);
    M.subscribe(function (now) {
      if (!watch.live()) return;
      var v = (now % 4200) / 4200;
      var pt = path.getPointAtLength(length * v);
      dot.setAttribute('cx', pt.x.toFixed(1));
      dot.setAttribute('cy', pt.y.toFixed(1));
      dot.style.opacity = String(Math.min(1, v * 8, (1 - v) * 8));
    }, 33);
  }

  function projectRow(project, index) {
    var id = String(project.id || '');
    var titleId = id ? id + '-title' : null;
    var images = projectImages(project);
    var side = index % 2 === 0 ? 'left' : 'right';
    var sections = sectionBlocks(project);
    var panelId = id ? id + '-case-study' : null;
    var panel = null;
    var toggle = null;

    if (sections.length) {
      panel = el('div', { class: 'case-study', id: panelId, hidden: true }, sections);
      toggle = cta('Read the case study', {
        class: 'disclosure',
        down: true
      });
      toggle.setAttribute('aria-expanded', 'false');
      toggle.setAttribute('aria-controls', panelId);
      toggle.addEventListener('click', function () {
        var open = toggle.getAttribute('aria-expanded') !== 'true';
        toggle.setAttribute('aria-expanded', String(open));
        panel.hidden = !open;
        toggle.querySelector('.cta-label').textContent = open ? 'Hide the case study' : 'Read the case study';
      });
    }

    var art = images.length ? null : plateArt(project);
    var slot = el('div', { class: 'plate-slot', 'data-slot': true });
    if (images.length) slot.append(imageEl(images[0]));
    else slot.append(art.svg);

    var outline = document.createElementNS(SVGNS, 'svg');
    outline.setAttribute('class', 'plate-outline');
    outline.setAttribute('viewBox', '0 0 710.995 462.995');
    outline.setAttribute('preserveAspectRatio', 'none');
    outline.setAttribute('aria-hidden', 'true');
    outline.innerHTML = '<path d="' + PLATE_OUTLINE + '"/>';

    var tag = [project.kind, STATUS[project.status] ? STATUS[project.status].label : null].filter(Boolean).join(' · ');
    var plate = el('div', { class: 'plate' }, [
      el('div', { class: 'plate-fill' }, [slot]),
      outline,
      tag ? el('p', { class: 'plate-tag', text: tag }) : null
    ]);

    var year = project.year ? el('p', {
      class: 'row-year',
      'data-year': true,
      'data-reveal': 'letters',
      'data-delay': 160,
      'data-stagger': 26,
      'data-cfg': 'year',
      text: String(project.year)
    }) : null;

    var rest = images.slice(1);
    var copyBlocks = [
      badges(project, !!project.featured),
      el('div', { class: 'project-head' }, [
        el('h3', { class: 'project-title', id: titleId, text: String(project.title || '') }),
        project.subtitle ? el('p', { class: 'project-subtitle', text: String(project.subtitle) }) : null
      ]),
      project.summary ? el('p', { class: 'project-summary', text: String(project.summary) }) : null,
      builtBlock(project),
      toggle,
      panel,
      specBlock(project),
      codeBlock(project),
      rolesBlock(project),
      rest.length ? el('figure', { class: 'project-shots' }, rest.map(imageEl)) : null,
      project.stack && project.stack.length
        ? el('div', { class: 'project-block' }, [el('h4', { text: 'Stack' }), stackList(project)])
        : null,
      linkRow(project),
      project.note ? el('p', { class: 'project-note', text: String(project.note) }) : null
    ].filter(Boolean);
    copyBlocks.forEach(function (block, i) {
      if (block === panel) return; // the case study opens inside its own button's flow
      block.setAttribute('data-rise', '');
      block.setAttribute('data-delay', String(80 + Math.min(i, 7) * 70));
      block.setAttribute('data-cfg', 'copy');
    });

    var row = el('article', {
      class: 'row' + (project.featured ? ' row--feature' : ''),
      id: id || null,
      'data-stage': true,
      'data-side': side,
      'aria-labelledby': titleId
    }, [
      el('div', { class: 'row-plate', 'data-rise': '', 'data-cfg': 'reveal' }, [plate, year]),
      el('div', { class: 'row-copy', 'data-copy': true }, copyBlocks)
    ]);
    row.__art = art;
    return row;
  }

  /** Parallax and the year's settle for one row. */
  function wireRow(row) {
    var slot = row.querySelector('[data-slot]');
    var year = row.querySelector('[data-year]');
    var copy = row.querySelector('[data-copy]');
    if (slot) {
      // The photograph overscans by 10%; the overscan is the travel.
      M.scrub(row, {
        start: 'top bottom',
        end: 'top center',
        rest: 1,
        apply: function (p) { slot.style.top = (-10 + 10 * p).toFixed(2) + '%'; }
      });
    }
    if (year) {
      M.scrub(row, {
        rest: 0.5,
        apply: function (p) { year.style.translate = '0 ' + ((0.5 - p) * 60).toFixed(1) + 'px'; }
      });
    }
    if (copy) {
      M.scrub(row, {
        rest: 0.5,
        apply: function (p) { copy.style.translate = '0 ' + ((0.5 - p) * 28).toFixed(1) + 'px'; }
      });
    }
    if (row.__art && row.__art.path) runArtPulse(row.__art.svg, row.__art.path);

    // After a hold the year settles back to 40% so the picture can speak.
    if (year && hasObserver && !reduceMotion()) {
      var io = new IntersectionObserver(function (entries) {
        if (!entries.some(function (e) { return e.isIntersecting; })) return;
        io.disconnect();
        setTimeout(function () {
          M.spring(M.config.settle, function (p) { year.style.opacity = String(1 - 0.6 * p); }).to(1);
        }, 160 + 4 * 26 + 2200);
      }, { rootMargin: '0px 0px -25% 0px' });
      io.observe(row);
    }
  }

  /** The rail: a track, a white progress thread, and a square that turns five times. */
  var railScrub = null;
  function buildRail() {
    var rail = document.querySelector('[data-rail]');
    var body = document.querySelector('.work-body');
    var rows = document.querySelectorAll('#project-list .row');
    if (!rail || !body) return;
    var svg = rail.querySelector('svg');
    if (railScrub) {
      M.unscrub(railScrub);
      railScrub = null;
    }
    svg.replaceChildren();
    if (!rows.length || window.innerWidth < 1024) return;
    var height = body.offsetHeight;
    var last = rows[rows.length - 1];
    var rest = Math.max(120, last.offsetTop + last.offsetHeight / 2 - 50);
    svg.setAttribute('viewBox', '0 0 16 ' + height);
    var ns = function (name, attrs) {
      var n = document.createElementNS(SVGNS, name);
      Object.keys(attrs).forEach(function (k) { n.setAttribute(k, attrs[k]); });
      svg.appendChild(n);
      return n;
    };
    ns('line', { class: 'rail-track', x1: 8, y1: 0, x2: 8, y2: Math.min(98, rest) });
    if (rest > 102) ns('line', { class: 'rail-track', x1: 8, y1: 102, x2: 8, y2: rest, 'stroke-dasharray': '6 6' });
    var bar = ns('rect', { class: 'rail-progress', x: 7.5, y: 0, width: 1, height: 0 });
    var marker = ns('rect', { class: 'rail-marker', x: -4.5, y: -4.5, width: 9, height: 9 });
    function apply(p) {
      var run = p * rest;
      bar.setAttribute('height', run.toFixed(1));
      marker.setAttribute('transform', 'translate(8 ' + run.toFixed(1) + ') rotate(' + ((run / rest) * 1800).toFixed(1) + ')');
    }
    apply(0);
    railScrub = M.scrub(rail, { start: 'top center', end: 'bottom bottom', smooth: true, rest: 1, apply: apply, margin: '300px 0px' });
  }

  function renderProjects() {
    var host = document.getElementById('project-list');
    if (!host) return;
    if (!Array.isArray(data.projects)) return showLoadError(host, 'projects', 'content/projects.js');

    var projects = visibleProjects();
    var bar = document.getElementById('project-filters');
    var status = document.getElementById('project-status');
    var active = 'all';

    var areaIds = Object.keys(AREAS).filter(function (area) {
      return projects.some(function (project) { return (project.areas || []).indexOf(area) !== -1; });
    });

    function draw() {
      var list = projects.filter(function (project) {
        return active === 'all' || (project.areas || []).indexOf(active) !== -1;
      });
      M.forget(host);
      host.replaceChildren.apply(host, list.map(projectRow));
      Array.prototype.forEach.call(host.querySelectorAll('.row'), wireRow);
      M.scan(host);
      buildRail();
      if (status) {
        status.textContent =
          active === 'all'
            ? 'Showing all ' + plural(list.length, 'project', 'projects') + '.'
            : 'Showing ' + plural(list.length, 'project', 'projects') + ' in ' + AREAS[active] + '.';
      }
    }

    var setActive = function () {};
    if (bar && areaIds.length > 1) {
      var options = [{ id: 'all', label: 'All', count: projects.length }].concat(
        areaIds.map(function (area) {
          return {
            id: area,
            label: AREAS[area],
            count: projects.filter(function (project) { return (project.areas || []).indexOf(area) !== -1; }).length
          };
        })
      );
      setActive = buildFilterBar(bar, options, active, function (id) {
        active = id;
        setActive(id);
        draw();
      });
    } else if (bar) {
      bar.hidden = true;
    }
    draw();

    // Keep the rail the right length as the layout changes.
    var work = document.querySelector('.work-body');
    if (work && 'ResizeObserver' in window) {
      var lastH = work.offsetHeight;
      var lastW = window.innerWidth;
      new ResizeObserver(function () {
        if (Math.abs(work.offsetHeight - lastH) < 2 && window.innerWidth === lastW) return;
        lastH = work.offsetHeight;
        lastW = window.innerWidth;
        buildRail();
      }).observe(work);
    }
  }

  /* ---------------------------------------------------------------------
   * Skills: a skill × project table, then everything else by group
   * ------------------------------------------------------------------- */
  function renderSkills() {
    var host = document.getElementById('skills-list');
    if (!host) return;
    var groups = data.skills;
    if (!Array.isArray(groups)) return showLoadError(host, 'skills', 'content/skills.js');

    var input = document.getElementById('skill-search');
    var status = document.getElementById('skill-status');
    var visibleTitles = visibleProjects().map(function (p) { return String(p.title); });

    function usedIn(item) {
      return (Array.isArray(item.usedIn) ? item.usedIn : []).filter(function (title) {
        return visibleTitles.indexOf(title) !== -1;
      });
    }

    var columns = visibleTitles.filter(function (title) {
      return groups.some(function (group) {
        return (group.items || []).some(function (item) { return usedIn(item).indexOf(title) !== -1; });
      });
    });

    var total = 0;
    var proven = 0;
    groups.forEach(function (group) {
      (group.items || []).forEach(function (item) {
        total += 1;
        if (usedIn(item).length) proven += 1;
      });
    });

    function matches(item, q) {
      if (normalize(item.name).indexOf(q) !== -1) return true;
      return (item.aliases || []).some(function (alias) { return normalize(alias).indexOf(q) !== -1; });
    }

    function draw(rawQuery) {
      var query = (rawQuery || '').trim();
      var q = normalize(query);
      var rows = [];
      var studiedGroups = [];
      var shown = 0;

      groups.forEach(function (group) {
        var categoryMatch = q && normalize(group.category).indexOf(q) !== -1;
        var items = (group.items || []).filter(function (item) { return !q || categoryMatch || matches(item, q); });
        var rest = [];
        items.forEach(function (item) {
          shown += 1;
          if (usedIn(item).length) rows.push({ item: item, group: group, categoryMatch: categoryMatch });
          else rest.push(item);
        });
        if (rest.length) studiedGroups.push({ group: group, items: rest, categoryMatch: categoryMatch });
      });

      var parts = [];

      // Group the rows by project so the marks form a readable staircase:
      // skills shared by several projects first, then each project's own.
      rows.forEach(function (row, i) {
        var used = usedIn(row.item);
        var first = Math.min.apply(null, used.map(function (t) { return columns.indexOf(t); }));
        row.key = (used.length > 1 ? 0 : 1) * 1000 + first * 100 + i;
      });
      rows.sort(function (a, b) { return a.key - b.key; });

      if (rows.length && columns.length) {
        var table = el('table', { class: 'matrix' }, [
          el('caption', { text: 'Skill × project: where each skill was applied' }),
          el('thead', null, [
            el('tr', null, [el('th', { scope: 'col', text: 'Skill' })].concat(columns.map(function (title) {
              return el('th', { scope: 'col', text: title });
            })))
          ]),
          el('tbody', null, rows.map(function (row) {
            var used = usedIn(row.item);
            return el('tr', null, [
              el('th', { scope: 'row' }, [highlight(String(row.item.name), row.categoryMatch ? '' : query)])
            ].concat(columns.map(function (title) {
              var yes = used.indexOf(title) !== -1;
              return el('td', null, [
                yes
                  ? el('span', { class: 'used-mark', role: 'img', 'aria-label': 'Used in ' + title, title: 'Used in ' + title })
                  : srOnly('Not used in ' + title)
              ]);
            })));
          }))
        ]);
        parts.push(el('div', { class: 'matrix-card' }, [el('div', { class: 'matrix-scroll' }, [table])]));
      }

      if (studiedGroups.length) {
        parts.push(el('div', { class: 'studied' }, [
          el('h3', { class: 'eyebrow studied-head', text: 'Coursework and self-study' })
        ].concat(studiedGroups.map(function (entry) {
          return el('div', { class: 'skill-group' }, [
            el('h3', { class: 'skill-cat' }, [highlight(String(entry.group.category), entry.categoryMatch ? query : '')]),
            entry.group.note ? el('p', { class: 'skill-note', text: entry.group.note }) : null,
            el('ul', { class: 'skill-chips' }, entry.items.map(function (item) {
              return el('li', { class: 'skill' }, [highlight(String(item.name), entry.categoryMatch ? '' : query)]);
            }))
          ]);
        }))));
      }

      if (!shown) {
        parts.push(el('div', { class: 'empty-state' }, [
          el('p', { text: 'No skills match “' + query + '”.' }),
          el('p', { text: 'Try a broader term, such as “web”, “network”, or “Firebase”.' }),
          el('button', {
            class: 'text-btn',
            type: 'button',
            text: 'Clear search',
            onclick: function () {
              input.value = '';
              draw('');
              input.focus();
            }
          })
        ]));
      }

      host.replaceChildren.apply(host, parts);
      if (status) {
        status.textContent = q
          ? shown + ' of ' + total + ' skills match “' + query + '”'
          : total + ' skills · ' + proven + ' applied in projects';
      }
    }

    draw('');
    if (input) {
      input.addEventListener('input', function () { draw(input.value); });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && input.value) {
          input.value = '';
          draw('');
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
   * Certifications
   * ------------------------------------------------------------------- */
  var CERT_TYPES = {
    'career-path': 'Career path completion',
    course: 'Course completion',
    workshop: 'Workshop participation',
    'academic-event': 'Academic event',
    certification: 'Professional certification',
    'in-progress': 'In progress'
  };

  function renderCertHighlight(items, featuredIds) {
    var host = document.getElementById('cert-highlight');
    if (!host) return;
    var top = items.filter(function (cert) { return cert.type === 'certification' || cert.type === 'career-path'; });
    var picked = top.slice(0, 1);

    var issuers = {};
    items.forEach(function (cert) {
      if (cert.issuer) issuers[cert.issuer] = (issuers[cert.issuer] || 0) + 1;
    });
    var topIssuer = Object.keys(issuers).sort(function (a, b) { return issuers[b] - issuers[a]; })[0];
    var featuredCount = items.filter(function (cert) { return featuredIds.indexOf(cert.category) !== -1; }).length;
    var mini = [];
    if (topIssuer) mini.push({ value: issuers[topIssuer], label: 'from ' + topIssuer });
    if (featuredCount) mini.push({ value: featuredCount, label: 'in cybersecurity, networking and software development' });

    var parts = picked.map(function (cert) {
      var label = (CERT_TYPES[cert.type] || 'Course') + (cert.issuer ? ' · ' + cert.issuer : '');
      return el('div', { class: 'highlight-card' }, [
        el('span', { class: 'highlight-icon', 'aria-hidden': 'true' }, [icon('shield')]),
        el('div', null, [el('p', { class: 'eyebrow', text: label }), el('h3', { text: String(cert.title) })])
      ]);
    });
    if (mini.length) {
      parts.push(el('ul', { class: 'mini-list' }, mini.map(function (tile) {
        return el('li', null, [
          el('strong', { text: String(tile.value) }),
          el('span', { text: plural(tile.value, 'course', 'courses').replace(/^\d+ /, '') + ' ' + tile.label })
        ]);
      })));
    }
    host.replaceChildren.apply(host, parts);
  }

  function renderCertificates() {
    var host = document.getElementById('cert-list');
    if (!host) return;
    var categories = data.certificateCategories;
    var certificates = data.certificates;
    if (!Array.isArray(categories) || !Array.isArray(certificates)) {
      return showLoadError(host, 'certifications', 'content/certificates.js');
    }

    var bar = document.getElementById('cert-filters');
    var barsHost = document.getElementById('cert-bars');
    var input = document.getElementById('cert-search');
    var status = document.getElementById('cert-status');

    var labels = {};
    categories.forEach(function (category) { labels[category.id] = category.label; });
    var featuredIds = categories.filter(function (c) { return c.featured; }).map(function (c) { return c.id; });
    var items = validCertificates();

    var options = [];
    var featuredCount = items.filter(function (cert) { return featuredIds.indexOf(cert.category) !== -1; }).length;
    if (featuredCount && featuredCount < items.length) options.push({ id: 'featured', label: 'Featured', count: featuredCount });
    options.push({ id: 'all', label: 'All', count: items.length });
    var categoryCounts = [];
    categories.forEach(function (category) {
      var count = items.filter(function (cert) { return cert.category === category.id; }).length;
      if (count) {
        options.push({ id: category.id, label: category.label, count: count });
        categoryCounts.push({ id: category.id, label: category.label, count: count });
      }
    });

    var active = options[0].id;
    var setChips = function () {};
    var barButtons = [];

    function setActive(id) {
      active = id;
      setChips(id);
      barButtons.forEach(function (button) {
        button.setAttribute('aria-pressed', String(button.getAttribute('data-filter') === id));
      });
    }

    if (bar) {
      setChips = buildFilterBar(bar, options, active, function (id) {
        setActive(id);
        draw();
      });
      // On phones the row scrolls sideways; drop the edge fade once at the end.
      var updateEdge = function () {
        bar.classList.toggle('is-at-end', bar.scrollLeft + bar.clientWidth >= bar.scrollWidth - 4);
      };
      bar.addEventListener('scroll', updateEdge, { passive: true });
      window.addEventListener('resize', updateEdge);
      updateEdge();
    }

    // "By area" bar chart; each bar is also a filter button.
    if (barsHost && categoryCounts.length) {
      var max = Math.max.apply(null, categoryCounts.map(function (c) { return c.count; }));
      categoryCounts.sort(function (a, b) { return b.count - a.count; });
      barButtons = categoryCounts.map(function (category) {
        var pct = Math.max(4, Math.round((category.count / max) * 100));
        return el('button', {
          class: 'cert-bar',
          type: 'button',
          'aria-pressed': 'false',
          'data-filter': category.id,
          'aria-label': category.label + ': ' + plural(category.count, 'course', 'courses') + '. Show only these.',
          onclick: function () {
            setActive(active === category.id ? 'all' : category.id);
            draw();
            var list = document.getElementById('cert-list');
            if (list && list.getBoundingClientRect().top > window.innerHeight * 0.8) {
              M.scrollTo(M.anchorTop(bar || list) - window.innerHeight * 0.3);
            }
          }
        }, [
          el('span', { class: 'bar-label', text: category.label }),
          el('span', { class: 'bar-track', 'aria-hidden': 'true' }, [el('span', { class: 'bar-fill', style: 'width:' + pct + '%' })]),
          el('span', { class: 'bar-count', 'aria-hidden': 'true', text: String(category.count) })
        ]);
      });
      barsHost.replaceChildren.apply(barsHost, barButtons);
      if (!reduceMotion() && hasObserver) {
        barsHost.classList.add('is-waiting');
        whenVisible(barsHost, function () { barsHost.classList.remove('is-waiting'); }, { threshold: 0.3 });
      }
    }

    renderCertHighlight(items, featuredIds);

    function inFilter(cert) {
      if (active === 'all') return true;
      if (active === 'featured') return featuredIds.indexOf(cert.category) !== -1;
      return cert.category === active;
    }

    function inQuery(cert, q) {
      if (!q) return true;
      return [cert.title, cert.issuer, labels[cert.category], CERT_TYPES[cert.type], cert.year].some(function (value) {
        return value && normalize(value).indexOf(q) !== -1;
      });
    }

    function tile(cert, query) {
      var file = safeUrl(cert.file);
      var verify = safeUrl(cert.verifyUrl);
      var target = file || verify;
      return el('li', { class: 'cert' }, [
        el('h3', { class: 'cert-title' }, [highlight(String(cert.title), query)]),
        cert.issuer || cert.year
          ? el('p', { class: 'cert-issuer' }, [
              cert.issuer ? el('span', null, [highlight(String(cert.issuer), query)]) : null,
              cert.year ? el('span', { text: String(cert.year) }) : null
            ])
          : null,
        el('p', { class: 'cert-foot' }, [
          el('span', { class: 'cert-cat', text: labels[cert.category] || 'Other' }),
          el('span', { class: 'cert-type', text: CERT_TYPES[cert.type] || 'Course completion' })
        ]),
        target
          ? el('a', {
              class: 'cert-link',
              href: target,
              target: isExternal(target) || file ? '_blank' : null,
              rel: 'noopener'
            }, [file ? 'View certificate' : 'Verify credential', icon('external'), srOnly(' for ' + cert.title + ' (opens in a new tab)')])
          : null
      ]);
    }

    function draw() {
      var query = input ? input.value.trim() : '';
      var q = normalize(query);
      var list = items.filter(function (cert) { return inFilter(cert) && inQuery(cert, q); });
      host.replaceChildren.apply(host, list.map(function (cert) { return tile(cert, query); }));

      if (!list.length) {
        host.append(el('li', { class: 'empty-state' }, [
          el('p', { text: 'No certifications match “' + query + '”' + (active !== 'all' ? ' in this category.' : '.') }),
          el('button', {
            class: 'text-btn',
            type: 'button',
            text: 'Show all certifications',
            onclick: function () {
              if (input) input.value = '';
              setActive('all');
              draw();
            }
          })
        ]));
      }

      if (status) {
        var where =
          active === 'all' ? '' :
          active === 'featured' ? ' (cybersecurity, networking, and software development)' :
          ' in ' + labels[active];
        status.textContent = q
          ? plural(list.length, 'result', 'results') + ' for “' + query + '”' + where
          : active === 'all'
            ? 'Showing all ' + items.length
            : 'Showing ' + list.length + ' of ' + items.length + where;
      }
    }

    draw();

    if (input) {
      input.addEventListener('input', function () {
        // A search always looks through every certificate.
        if (active !== 'all' && input.value.trim()) setActive('all');
        draw();
      });
      input.addEventListener('keydown', function (event) {
        if (event.key === 'Escape' && input.value) {
          input.value = '';
          draw();
        }
      });
    }
  }

  /* ---------------------------------------------------------------------
   * Small ambient motions, all on the shared ticker
   * ------------------------------------------------------------------- */
  function initAmbient() {
    if (reduceMotion()) return;

    // The status dot's pulse ring.
    var dots = document.querySelectorAll('[data-pulse]');
    if (dots.length) {
      var dw = M.watch(dots[0]);
      M.subscribe(function (now) {
        if (!dw.live()) return;
        var v = (now % 2400) / 2400;
        var spread = (v * 8).toFixed(2);
        var alpha = Math.round(55 * (1 - v) * (1 - v));
        var colour = Fx.css('--live-on-ground');
        dots.forEach(function (dot) {
          dot.style.boxShadow = '0 0 0 ' + spread + 'px color-mix(in srgb, ' + colour + ' ' + alpha + '%, transparent)';
        });
      }, 33);
    }

    // The plate's globe: a meridian turning once every ten seconds.
    var meridian = document.querySelector('[data-orbit]');
    if (meridian) {
      var mw = M.watch(meridian);
      M.subscribe(function (now) {
        if (!mw.live()) return;
        var turn = ((now % 10000) / 10000) * Math.PI * 2;
        meridian.setAttribute('rx', Math.max(0.5, Math.abs(Math.cos(turn)) * 18).toFixed(2));
      }, 33);
    }

    // The education strip: dashes crawl toward the live round, which pulses.
    var strip = document.querySelector('.edu-strip');
    if (strip) {
      var live = strip.querySelector('.edu-card--live');
      var frame = el('span', { class: 'edu-live-frame', 'aria-hidden': 'true' });
      var pulse = el('span', { class: 'edu-pulse', 'aria-hidden': 'true' });
      if (live) {
        live.append(frame, pulse);
      }
      var sw = M.watch(strip);
      M.subscribe(function (now) {
        if (!sw.live()) return;
        strip.style.setProperty('--crawl', (((now % 5200) / 5200) * 11.45).toFixed(2) + 'px');
        var v = (now % 3200) / 3200;
        var ease = 1 - (1 - v) * (1 - v);
        pulse.style.transform = 'scale(' + (1 + ease * 3.4).toFixed(3) + ')';
        pulse.style.opacity = String(0.5 * (1 - ease) * (1 - ease));
      }, 33);
    } else {
      /* no strip */
    }
  }

  /** The sign-off figure rides back into place as the page bottoms out. */
  function initFigure() {
    var figure = document.querySelector('[data-figure]');
    var section = document.getElementById('contact');
    if (!figure || !section) return;
    M.scrub(section, {
      start: 'top bottom',
      end: 'bottom bottom',
      rest: 1,
      apply: function (p) { figure.style.translate = '0 ' + ((1 - p) * 60).toFixed(1) + 'px'; }
    });
  }

  /* ---------------------------------------------------------------------
   * Phone action bar, copy email, footer year
   * ------------------------------------------------------------------- */
  function initActionBar() {
    var bar = document.querySelector('.action-bar');
    var hero = document.getElementById('home');
    var contact = document.getElementById('contact');
    if (!bar) return;
    if (!hasObserver || !hero) {
      bar.classList.add('is-visible');
      return;
    }
    var state = { hero: true, contact: false };
    function update() { bar.classList.toggle('is-visible', !state.hero && !state.contact); }
    new IntersectionObserver(function (entries) {
      state.hero = entries[0].isIntersecting;
      update();
    }, { threshold: 0, rootMargin: '-120px 0px 0px 0px' }).observe(hero);
    if (contact) {
      new IntersectionObserver(function (entries) {
        state.contact = entries[0].isIntersecting;
        update();
      }, { threshold: 0.25 }).observe(contact);
    }
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () { return legacyCopy(text); });
    }
    return Promise.resolve(legacyCopy(text));
  }

  function legacyCopy(text) {
    var area = el('textarea', { readonly: true, 'aria-hidden': 'true' });
    area.value = text;
    area.style.position = 'fixed';
    area.style.opacity = '0';
    document.body.append(area);
    area.select();
    var ok = false;
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    area.remove();
    return ok;
  }

  function initCopy() {
    var status = document.getElementById('copy-status');
    document.querySelectorAll('[data-copy]').forEach(function (button) {
      var label = button.querySelector('.copy-label');
      var original = label ? label.textContent : '';
      var timer = null;
      button.addEventListener('click', function () {
        copyText(button.getAttribute('data-copy')).then(function (ok) {
          if (label) label.textContent = ok ? 'Copied' : 'Copy failed: select the address';
          button.classList.toggle('is-done', ok);
          if (status) status.textContent = ok ? 'Email address copied to the clipboard.' : 'Copying failed. Select the email address and copy it manually.';
          clearTimeout(timer);
          timer = setTimeout(function () {
            if (label) label.textContent = original;
            button.classList.remove('is-done');
            if (status) status.textContent = '';
          }, 2400);
        });
      });
    });
  }

  function setYear() {
    var year = String(new Date().getFullYear());
    document.querySelectorAll('[data-year]').forEach(function (node) {
      if (node.tagName === 'SPAN') node.textContent = year;
    });
  }

  /* ---------------------------------------------------------------------
   * Effects: stack, contours, seams, circuit, veil
   * ------------------------------------------------------------------- */
  function initEffects() {
    var stack = document.querySelector('[data-stack]');
    if (stack) M.stack(stack);

    var firstFrame = null;
    document.querySelectorAll('[data-contour]').forEach(function (canvas) {
      var kind = canvas.getAttribute('data-contour');
      var opts = { colour: kind === 'hero' ? '--contour' : kind === 'paper' ? '--contour-paper' : '--contour-foot' };
      if (kind === 'hero') opts.pointerHost = document.getElementById('home');
      var c = Fx.contours(canvas, opts);
      if (kind === 'hero') firstFrame = c;
    });

    document.querySelectorAll('[data-dissolve]').forEach(function (canvas) {
      Fx.dissolve(canvas, { carry: canvas.getAttribute('data-dissolve') });
    });

    // The circuit draws the Smart Gate signal chain from the project data.
    var host = document.querySelector('[data-circuit]');
    var about = document.getElementById('about');
    if (host && about) {
      var featured = visibleProjects().filter(function (p) { return Array.isArray(p.flow) && p.flow.length >= 2; })[0];
      Fx.circuit(host, {
        steps: featured ? featured.flow : [],
        frame: host.parentElement,
        arrive: about,
        pointerHost: about
      });
      var caption = document.querySelector('[data-circuit-caption]');
      if (caption && featured) {
        var link = caption.querySelector('a');
        link.setAttribute('href', '#' + featured.id);
        link.setAttribute('data-open-project', featured.id);
        link.textContent = featured.title + ': how ' + (featured.flow[0].label || 'the input').toLowerCase().replace(/^rfid/, 'an RFID') + ' reaches the dashboard';
        caption.hidden = false;
      }
    }
    return firstFrame;
  }

  function fontsReady() {
    if (!document.fonts || !document.fonts.load) return Promise.resolve();
    return Promise.all([
      document.fonts.load('700 1em Oswald'),
      document.fonts.load('400 1em "Space Grotesk"')
    ]).catch(function () {});
  }

  /* ---------------------------------------------------------------------
   * Start
   * ------------------------------------------------------------------- */
  safely('theme', initTheme);
  safely('numbers', initStats);
  safely('projects', renderProjects);
  safely('skills', renderSkills);
  safely('certifications', renderCertificates);
  safely('copy button', initCopy);
  safely('footer year', setYear);
  var contourReady = null;
  safely('effects', function () { contourReady = initEffects(); });
  safely('header', initHeader);
  safely('anchors', initAnchors);
  safely('menu', initSheet);
  safely('ambient', initAmbient);
  safely('figure', initFigure);
  safely('action bar', initActionBar);
  safely('reveals', function () { M.scan(document); });

  var ready = Promise.all([fontsReady(), M.initSmoothScroll()]).then(function () {
    // Open at a deep link such as #smart-gate once the layout has settled.
    var hash = window.location.hash.slice(1);
    if (!hash) return;
    var target = document.getElementById(hash);
    if (!target) return;
    var disclosure = target.querySelector('.disclosure');
    if (disclosure && target.classList.contains('row')) disclosure.click();
    setTimeout(function () {
      var header = document.querySelector('.site-header');
      var offset = target.tagName === 'SECTION' ? 0 : (header ? header.offsetHeight : 64) + 24;
      M.scrollTo(M.anchorTop(target) - offset, true);
    }, 50);
  });
  Fx.veil(document.getElementById('veil'), ready);
})();
