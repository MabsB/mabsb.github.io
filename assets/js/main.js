/*
 * Portfolio interactions: theme, navigation, scroll reveals, and the
 * projects, skills and certifications sections (built from the files in /content).
 * No libraries and no build step. You normally won't need to edit this file;
 * change the content files instead.
 */
(function () {
  'use strict';

  var data = window.PORTFOLIO || {};
  var root = document.documentElement;
  var reduceMotion = window.matchMedia
    ? window.matchMedia('(prefers-reduced-motion: reduce)')
    : { matches: false };
  var hasObserver = 'IntersectionObserver' in window;

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
    code: '<path d="m8.5 8-4 4 4 4M15.5 8l4 4-4 4"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    chevron: '<path d="m6 9 6 6 6-6"/>',
    shield: '<path d="M12 3 4.5 6v5.5c0 4.6 3.2 8.4 7.5 9.5 4.3-1.1 7.5-4.9 7.5-9.5V6Z"/><path d="m9 12 2 2 4-4"/>'
  };

  function icon(name) {
    var span = document.createElement('span');
    span.innerHTML =
      '<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
      (ICONS[name] || '') +
      '</svg>';
    return span.firstChild;
  }

  function srOnly(text) {
    return el('span', { class: 'visually-hidden', text: text });
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
    return String(text || '')
      .toLowerCase()
      .replace(/\s+/g, ' ')
      .trim();
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

  function listToText(items) {
    if (items.length <= 1) return items.join('');
    if (items.length === 2) return items[0] + ' and ' + items[1];
    return items.slice(0, -1).join(', ') + ', and ' + items[items.length - 1];
  }

  function plural(count, one, many) {
    return count + ' ' + (count === 1 ? one : many);
  }

  /** Shown to visitors if a content file fails to load; details go to the console. */
  function showLoadError(host, what, file) {
    if (!host) return;
    host.replaceChildren(
      el('p', { class: 'load-error', text: 'This section is temporarily unavailable.' })
    );
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

  /** Run fn once when node scrolls into view (immediately without observer support). */
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
      var button = el(
        'button',
        {
          class: 'filter-chip',
          type: 'button',
          'aria-pressed': String(option.id === active),
          'data-filter': option.id,
          onclick: function () {
            onChange(option.id);
          }
        },
        [option.label, el('span', { class: 'count', text: String(option.count) })]
      );
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
   * Theme
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
      if (meta) meta.setAttribute('content', theme === 'dark' ? '#0A111D' : '#F5F7FA');
      if (remember) {
        try {
          localStorage.setItem('theme', theme);
        } catch (e) {
          /* Storage can be unavailable (private mode); the toggle still works. */
        }
      }
    }

    apply(root.getAttribute('data-theme') === 'light' ? 'light' : 'dark', false);
    button.addEventListener('click', function () {
      apply(root.getAttribute('data-theme') === 'light' ? 'dark' : 'light', true);
    });
  }

  /* ---------------------------------------------------------------------
   * Navigation: mobile menu, header border, current section
   * ------------------------------------------------------------------- */
  function initNav() {
    var header = document.querySelector('.site-header');
    var toggle = document.querySelector('.nav-toggle');
    var menu = document.getElementById('nav-menu');
    if (!header || !toggle || !menu) return;
    var compact = window.matchMedia('(max-width: 959px)');

    function setOpen(open, returnFocus) {
      header.classList.toggle('nav-open', open);
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
      if (!open && returnFocus) toggle.focus();
    }

    toggle.addEventListener('click', function () {
      setOpen(toggle.getAttribute('aria-expanded') !== 'true', false);
    });
    menu.addEventListener('click', function (event) {
      if (event.target.closest('a') && compact.matches) setOpen(false, false);
    });
    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && header.classList.contains('nav-open')) setOpen(false, true);
    });
    document.addEventListener('click', function (event) {
      if (header.classList.contains('nav-open') && !header.contains(event.target)) setOpen(false, false);
    });
    var onBreakpoint = function (event) {
      if (!event.matches) setOpen(false, false);
    };
    if (compact.addEventListener) compact.addEventListener('change', onBreakpoint);
    else if (compact.addListener) compact.addListener(onBreakpoint);

    var onScroll = function () {
      header.classList.toggle('is-scrolled', window.scrollY > 8);
    };
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });

    // Mark the link for the section in the middle of the screen.
    var links = Array.prototype.slice.call(menu.querySelectorAll('a[href^="#"]'));
    if (!hasObserver) return;
    var sections = [];
    links.forEach(function (link) {
      var section = document.getElementById(link.getAttribute('href').slice(1));
      if (section) sections.push({ section: section, link: link });
    });
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return;
          sections.forEach(function (item) {
            if (item.section === entry.target) item.link.setAttribute('aria-current', 'true');
            else item.link.removeAttribute('aria-current');
          });
        });
      },
      { rootMargin: '-40% 0px -55% 0px', threshold: 0 }
    );
    sections.forEach(function (item) {
      observer.observe(item.section);
    });
  }

  /* ---------------------------------------------------------------------
   * Hero numbers, counted from the content files
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
   * Projects
   * ------------------------------------------------------------------- */
  var STATUS = {
    live: { label: 'Live', modifier: 'badge--live' },
    built: { label: 'Built', modifier: '' },
    prototype: { label: 'Prototype', modifier: '' },
    'in-progress': { label: 'In progress', modifier: '' },
    coursework: { label: 'Coursework', modifier: '' }
  };

  var AREAS = { web: 'Web', iot: 'IoT', mobile: 'Mobile', ai: 'AI', networking: 'Networking' };

  function linkButton(link, index) {
    var url = safeUrl(link.url);
    if (!url) return null;
    var external = isExternal(url);
    var iconName = link.kind === 'source' ? 'code' : link.kind === 'video' ? 'play' : 'external';
    return el(
      'a',
      {
        class: 'btn ' + (index === 0 ? 'btn-ghost' : 'btn-ghost'),
        href: url,
        target: external ? '_blank' : null,
        rel: external ? 'noopener' : null
      },
      [
        link.kind === 'source' ? icon('code') : null,
        String(link.label || 'Open link'),
        link.kind !== 'source' ? icon(iconName) : null,
        external ? srOnly(' (opens in a new tab)') : null
      ]
    );
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

  function flowDiagram(project) {
    var steps = (project.flow || []).filter(function (step) {
      return step && step.label;
    });
    if (steps.length < 2) return null;
    var description = steps.map(function (step) { return step.label; }).join(', then ');
    return el('ol', { class: 'flow', 'aria-label': 'How it works: ' + description }, steps.map(function (step, i) {
      return el('li', { class: 'flow-step' + (step.highlight ? ' is-key' : ''), style: '--i:' + i }, [
        el('span', { class: 'step', text: String(step.step || '') }),
        el('span', { class: 'label', text: String(step.label) })
      ]);
    }));
  }

  function builtBlock(project) {
    if (!Array.isArray(project.built) || !project.built.length) return null;
    return el('div', { class: 'project-block' }, [
      el('h4', { text: String(project.builtHeading || 'What I built') }),
      el('ul', { class: 'built-list' }, project.built.map(function (item) {
        return el('li', { text: String(item) });
      }))
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
      el('ul', { class: 'roles' }, project.roles.map(function (role) {
        return el('li', { text: String(role) });
      }))
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

  function gallery(project) {
    var images = (project.images || []).filter(function (image) {
      return image && safeUrl(image.src);
    });
    if (!images.length) return null;
    return el('figure', { class: 'project-shots' }, images.map(function (image) {
      return el('img', {
        src: safeUrl(image.src),
        alt: String(image.alt || ''),
        width: image.width || null,
        height: image.height || null,
        loading: 'lazy',
        decoding: 'async'
      });
    }));
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

  function featuredCard(project, id, titleId) {
    var sections = sectionBlocks(project);
    var panelId = id ? id + '-case-study' : null;
    var panel = null;
    var toggle = null;
    if (sections.length) {
      panel = el('div', { class: 'case-study', id: panelId, hidden: true }, sections);
      toggle = el('button', {
        class: 'btn btn-primary disclosure',
        type: 'button',
        'aria-expanded': 'false',
        'aria-controls': panelId,
        onclick: function () {
          var open = toggle.getAttribute('aria-expanded') !== 'true';
          toggle.setAttribute('aria-expanded', String(open));
          panel.hidden = !open;
          toggle.firstChild.textContent = open ? 'Hide the case study' : 'Read the case study';
        }
      }, ['Read the case study', icon('chevron')]);
    }

    return el('article', { class: 'project project--feature', id: id || null, 'aria-labelledby': titleId }, [
      el('div', { class: 'feature-band dotgrid' }, [badges(project, true), flowDiagram(project)]),
      el('div', { class: 'feature-body' }, [
        el('div', { class: 'feature-main' }, [
          el('h3', { class: 'project-title', id: titleId, text: String(project.title || '') }),
          project.subtitle ? el('p', { class: 'project-subtitle', text: String(project.subtitle) }) : null,
          project.summary ? el('p', { class: 'project-summary', text: String(project.summary) }) : null,
          builtBlock(project),
          toggle,
          panel
        ]),
        el('div', { class: 'feature-side' }, [
          specBlock(project),
          codeBlock(project),
          rolesBlock(project),
          project.stack && project.stack.length
            ? el('div', { class: 'project-block' }, [el('h4', { text: 'Stack' }), stackList(project)])
            : null,
          linkRow(project),
          project.note ? el('p', { class: 'project-note', text: String(project.note) }) : null
        ])
      ]),
      gallery(project) ? el('div', { class: 'feature-body' }, [gallery(project)]) : null
    ]);
  }

  function projectCard(project) {
    var id = String(project.id || '');
    var titleId = id ? id + '-title' : null;
    if (project.featured) return featuredCard(project, id, titleId);

    return el('article', { class: 'project', id: id || null, 'aria-labelledby': titleId }, [
      gallery(project),
      badges(project, false),
      el('h3', { class: 'project-title', id: titleId, text: String(project.title || '') }),
      project.subtitle ? el('p', { class: 'project-subtitle', text: String(project.subtitle) }) : null,
      project.summary ? el('p', { class: 'project-summary', text: String(project.summary) }) : null,
      codeBlock(project),
      builtBlock(project)
    ]
      .concat(sectionBlocks(project))
      .concat([
        rolesBlock(project),
        specBlock(project),
        project.note ? el('p', { class: 'project-note', text: String(project.note) }) : null,
        el('footer', { class: 'project-foot' }, [stackList(project), linkRow(project)])
      ]));
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
      return projects.some(function (project) {
        return (project.areas || []).indexOf(area) !== -1;
      });
    });

    function draw() {
      var list = projects.filter(function (project) {
        return active === 'all' || (project.areas || []).indexOf(active) !== -1;
      });
      host.replaceChildren.apply(host, list.map(projectCard));
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
            count: projects.filter(function (project) {
              return (project.areas || []).indexOf(area) !== -1;
            }).length
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

    // Links such as #smart-gate open straight to that project's case study.
    var hash = window.location.hash.slice(1);
    if (hash) {
      var target = document.getElementById(hash);
      var button = target && target.querySelector('.disclosure');
      if (button && host.contains(target)) button.click();
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

    // Columns: projects that at least one skill points to, in project order.
    var columns = visibleTitles.filter(function (title) {
      return groups.some(function (group) {
        return (group.items || []).some(function (item) {
          return usedIn(item).indexOf(title) !== -1;
        });
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
      return (item.aliases || []).some(function (alias) {
        return normalize(alias).indexOf(q) !== -1;
      });
    }

    function draw(rawQuery) {
      var query = (rawQuery || '').trim();
      var q = normalize(query);
      var rows = [];
      var studiedGroups = [];
      var shown = 0;

      groups.forEach(function (group) {
        var categoryMatch = q && normalize(group.category).indexOf(q) !== -1;
        var items = (group.items || []).filter(function (item) {
          return !q || categoryMatch || matches(item, q);
        });
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
          el('caption', { text: 'SKILL × PROJECT — where each skill was applied' }),
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
        parts.push(
          el('div', { class: 'empty-state' }, [
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
          ])
        );
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
      input.addEventListener('input', function () {
        draw(input.value);
      });
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
    var top = items.filter(function (cert) {
      return cert.type === 'certification' || cert.type === 'career-path';
    });
    var picked = top.slice(0, 1);

    // Summary tiles: the most common provider, and the featured areas.
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
        el('div', null, [
          el('p', { class: 'eyebrow', text: label }),
          el('h3', { text: String(cert.title) })
        ])
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
    categories.forEach(function (category) {
      labels[category.id] = category.label;
    });
    var featuredIds = categories
      .filter(function (category) { return category.featured; })
      .map(function (category) { return category.id; });

    var items = validCertificates();

    var options = [];
    var featuredCount = items.filter(function (cert) {
      return featuredIds.indexOf(cert.category) !== -1;
    }).length;
    if (featuredCount && featuredCount < items.length) {
      options.push({ id: 'featured', label: 'Featured', count: featuredCount });
    }
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
              (bar || list).scrollIntoView({ behavior: reduceMotion.matches ? 'auto' : 'smooth', block: 'center' });
            }
          }
        }, [
          el('span', { class: 'bar-label', text: category.label }),
          el('span', { class: 'bar-track', 'aria-hidden': 'true' }, [
            el('span', { class: 'bar-fill', style: 'width:' + pct + '%' })
          ]),
          el('span', { class: 'bar-count', 'aria-hidden': 'true', text: String(category.count) })
        ]);
      });
      barsHost.replaceChildren.apply(barsHost, barButtons);
      if (!reduceMotion.matches && hasObserver) {
        barsHost.classList.add('is-waiting');
        whenVisible(barsHost, function () {
          barsHost.classList.remove('is-waiting');
        }, { threshold: 0.3 });
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
      return [cert.title, cert.issuer, labels[cert.category], CERT_TYPES[cert.type], cert.year]
        .some(function (value) {
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
          ? el(
              'a',
              {
                class: 'cert-link',
                href: target,
                target: isExternal(target) || file ? '_blank' : null,
                rel: 'noopener'
              },
              [
                file ? 'View certificate' : 'Verify credential',
                icon('external'),
                srOnly(' for ' + cert.title + ' (opens in a new tab)')
              ]
            )
          : null
      ]);
    }

    function draw() {
      var query = input ? input.value.trim() : '';
      var q = normalize(query);
      var list = items.filter(function (cert) {
        return inFilter(cert) && inQuery(cert, q);
      });
      host.replaceChildren.apply(host, list.map(function (cert) {
        return tile(cert, query);
      }));

      if (!list.length) {
        host.append(
          el('li', { class: 'empty-state' }, [
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
          ])
        );
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
   * Scroll reveals and the phone action bar
   * ------------------------------------------------------------------- */
  function initReveal() {
    if (reduceMotion.matches || !hasObserver) return;
    var targets = document.querySelectorAll(
      '.section-head, .project, .matrix-card, .skill-group, .about-copy, .edu-card, .cert-areas, .cert-highlight, .contact-panel'
    );
    var observer = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        if (!entry.isIntersecting) return;
        entry.target.classList.add('is-in');
        observer.unobserve(entry.target);
      });
    }, { rootMargin: '0px 0px -8% 0px', threshold: 0.08 });
    targets.forEach(function (node) {
      // Anything already on screen stays put; only content below the fold animates in.
      if (node.getBoundingClientRect().top < window.innerHeight) return;
      node.classList.add('reveal');
      observer.observe(node);
    });
  }

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
    function update() {
      bar.classList.toggle('is-visible', !state.hero && !state.contact);
    }
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

  /* ---------------------------------------------------------------------
   * Copy email, footer year
   * ------------------------------------------------------------------- */
  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) {
      return navigator.clipboard.writeText(text).then(function () { return true; }, function () {
        return legacyCopy(text);
      });
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
    try {
      ok = document.execCommand('copy');
    } catch (e) {
      ok = false;
    }
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
        var text = button.getAttribute('data-copy');
        copyText(text).then(function (ok) {
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
      node.textContent = year;
    });
  }

  /* ---------------------------------------------------------------------
   * Start
   * ------------------------------------------------------------------- */
  safely('theme', initTheme);
  safely('navigation', initNav);
  safely('hero numbers', initStats);
  safely('projects', renderProjects);
  safely('skills', renderSkills);
  safely('certifications', renderCertificates);
  safely('copy button', initCopy);
  safely('footer year', setYear);
  safely('reveal', initReveal);
  safely('action bar', initActionBar);
})();
