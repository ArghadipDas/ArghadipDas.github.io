/* ==================== SETUP ==================== */
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    initNav();
    initScrollUI();
    initScrollReveal();
    initHeroCanvas();
    initStatCounters();
    initPublications();
    initChipFilter({
        bar: 'researchFilters',
        items: '#researchGrid .research-card',
        attr: 'themes'
    });
    initChipFilter({
        bar: 'talkFilters',
        items: '#talksWrap .talk-item',
        attr: 'kind',
        groups: '#talksWrap .talk-group'
    });
    initPalette();
    initPrintHelpers();
    initCounts();
});

/* Keep numbers and counts right when entries are added or removed by hand */
function initCounts() {
    const papers = [...document.querySelectorAll('#pubList .pub-entry:not([data-type="patent"]) .pub-num')];
    papers.forEach((num, i) => { num.textContent = '[' + (papers.length - i) + ']'; });
    const patents = [...document.querySelectorAll('#pubList .pub-entry[data-type="patent"] .pub-num')];
    patents.forEach((num, i) => { num.textContent = '[P' + (patents.length - i) + ']'; });

    const olderNews = document.querySelectorAll('.news-more .news-item').length;
    const newsLabel = document.querySelector('.news-more .when-closed');
    if (newsLabel) newsLabel.textContent = `Show ${olderNews} older updates`;

    const honors = document.querySelectorAll('.honors-all .honor-list li').length;
    const honorsLabel = document.querySelector('.honors-all .when-closed');
    if (honorsLabel) honorsLabel.textContent = `Show the full list (${honors} honors)`;
}

/* Lowercase, strip accents and unify dashes so search matches loosely */
function normalize(text) {
    return (text || '')
        .toLowerCase()
        .normalize('NFD')
        .replace(/[̀-ͯ]/g, '')
        .replace(/[‐-―]/g, '-')
        .replace(/\s+/g, ' ')
        .trim();
}

function scrollBehavior() {
    return prefersReducedMotion ? 'auto' : 'smooth';
}

/* ==================== THEME ==================== */
function initTheme() {
    const toggle = document.getElementById('themeToggle');
    if (toggle) toggle.addEventListener('click', toggleTheme);
    updateThemeControls();
}

function updateThemeControls() {
    const isLight = document.documentElement.getAttribute('data-theme') === 'light';
    const toggle = document.getElementById('themeToggle');
    if (toggle) {
        toggle.setAttribute('aria-label', isLight ? 'Switch to dark theme' : 'Switch to light theme');
        toggle.setAttribute('data-tip', isLight ? 'Dark theme' : 'Light theme');
    }
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', isLight ? '#f6f7f9' : '#0a0a0f');
}

function toggleTheme() {
    const root = document.documentElement;
    const next = root.getAttribute('data-theme') === 'light' ? 'dark' : 'light';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('theme', next); } catch (e) { /* storage unavailable: theme lasts for this visit */ }
    updateThemeControls();
    document.dispatchEvent(new CustomEvent('themechange'));
}

/* ==================== NAVIGATION ==================== */
function initNav() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('navHamburger');
    const navLinks = document.getElementById('navLinks');
    const overlay = document.getElementById('navOverlay');
    if (!navbar || !hamburger || !navLinks) return;
    const links = navLinks.querySelectorAll('a');

    function setOpen(open) {
        hamburger.classList.toggle('open', open);
        navLinks.classList.toggle('open', open);
        if (overlay) overlay.classList.toggle('open', open);
        hamburger.setAttribute('aria-expanded', String(open));
        hamburger.setAttribute('aria-label', open ? 'Close menu' : 'Open menu');
        document.body.style.overflow = open ? 'hidden' : '';
        if (open) {
            const first = navLinks.querySelector('a');
            if (first) first.focus();
        }
    }

    hamburger.addEventListener('click', () => setOpen(!navLinks.classList.contains('open')));
    if (overlay) overlay.addEventListener('click', () => setOpen(false));

    links.forEach(link => {
        link.addEventListener('click', () => {
            if (navLinks.classList.contains('open')) setOpen(false);
        });
    });

    document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && navLinks.classList.contains('open')) {
            setOpen(false);
            hamburger.focus();
        }
    });

    // Leaving the mobile layout with the drawer open should not lock scrolling
    const wide = window.matchMedia('(min-width: 1240px)');
    if (wide.addEventListener) {
        wide.addEventListener('change', e => {
            if (e.matches && navLinks.classList.contains('open')) setOpen(false);
        });
    }
}

/* ==================== SCROLL UI: nav state, progress, active section, rail, back to top ==================== */
function initScrollUI() {
    const navbar = document.getElementById('navbar');
    const progress = document.querySelector('.scroll-progress span');
    const backToTop = document.getElementById('backToTop');
    const navLinks = document.querySelectorAll('#navLinks a[href^="#"]');
    const sections = [...document.querySelectorAll('main section[id]')];
    const rail = buildRail(sections);
    const railLinks = rail ? rail.querySelectorAll('a') : [];
    let ticking = false;
    let currentId = null;

    function setActive(id) {
        if (id === currentId) return;
        currentId = id;
        navLinks.forEach(link => {
            const on = link.getAttribute('href') === '#' + id;
            link.classList.toggle('active', on);
            if (on) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
        railLinks.forEach(link => {
            const on = link.getAttribute('href') === '#' + id;
            link.classList.toggle('active', on);
            if (on) link.setAttribute('aria-current', 'true');
            else link.removeAttribute('aria-current');
        });
        if (rail) rail.classList.toggle('on-hero', id === 'hero');
    }

    function update() {
        ticking = false;
        const y = window.scrollY;
        const vh = window.innerHeight;
        if (navbar) navbar.classList.toggle('scrolled', y > 50);

        const max = document.documentElement.scrollHeight - vh;
        if (progress) progress.style.transform = 'scaleX(' + (max > 0 ? Math.min(y / max, 1) : 0) + ')';
        if (backToTop) backToTop.classList.toggle('visible', y > vh * 0.9);

        // Active section: the last one whose top has passed 35% of the viewport
        let active = sections.length ? sections[0].id : null;
        const line = vh * 0.35;
        for (const section of sections) {
            if (section.getBoundingClientRect().top <= line) active = section.id;
            else break;
        }
        // At the very bottom, the last section is the active one
        if (max > 0 && y >= max - 2 && sections.length) active = sections[sections.length - 1].id;
        setActive(active);
    }

    window.addEventListener('scroll', () => {
        if (!ticking) {
            ticking = true;
            requestAnimationFrame(update);
        }
    }, { passive: true });
    window.addEventListener('resize', update);
    update();

    if (backToTop) {
        backToTop.addEventListener('click', () => {
            window.scrollTo({ top: 0, behavior: scrollBehavior() });
            const logo = document.querySelector('.nav-logo');
            if (logo) logo.focus({ preventScroll: true });
        });
    }
}

function buildRail(sections) {
    const rail = document.getElementById('sectionRail');
    if (!rail) return null;
    const list = document.createElement('ol');
    sections.forEach(section => {
        const label = section.dataset.label;
        if (!label) return;
        const li = document.createElement('li');
        const a = document.createElement('a');
        a.href = '#' + section.id;
        a.innerHTML = '<span class="rail-dot" aria-hidden="true"></span><span class="rail-label"></span>';
        a.querySelector('.rail-label').textContent = label;
        a.setAttribute('aria-label', label);
        li.appendChild(a);
        list.appendChild(li);
    });
    rail.appendChild(list);
    return rail;
}

/* ==================== SCROLL REVEAL ==================== */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');
    if (!('IntersectionObserver' in window)) {
        reveals.forEach(el => el.classList.add('revealed'));
        return;
    }

    const observer = new IntersectionObserver(entries => {
        // Stagger elements that come into view together; cap the delay so
        // entries deep in long lists don't lag behind the scroll
        let batchIdx = 0;
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const delay = Math.min(batchIdx++, 5) * 100;

                setTimeout(() => {
                    entry.target.classList.add('revealed');
                }, delay);

                observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.1, rootMargin: '0px 0px -40px 0px' });

    reveals.forEach(el => observer.observe(el));
}

/* ==================== HERO CANVAS ==================== */
function initHeroCanvas() {
    const canvas = document.getElementById('heroCanvas');
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    let animId;
    let nodes = [];
    let width, height;
    let rgb = '0, 212, 170';
    let strength = 1;

    function readColors() {
        const styles = getComputedStyle(document.documentElement);
        rgb = (styles.getPropertyValue('--canvas-rgb') || rgb).trim();
        strength = parseFloat(styles.getPropertyValue('--canvas-strength')) || 1;
    }

    function resize() {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
        generateNodes();
        // Static frame when motion is reduced (resizing clears the canvas)
        if (prefersReducedMotion) draw(0);
    }

    function generateNodes() {
        nodes = [];
        const spacing = 80;
        const cols = Math.ceil(width / spacing) + 1;
        const rows = Math.ceil(height / spacing) + 1;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                nodes.push({
                    x: c * spacing + (Math.random() - 0.5) * 20,
                    y: r * spacing + (Math.random() - 0.5) * 20,
                    baseX: c * spacing,
                    baseY: r * spacing,
                    radius: 1.5 + Math.random() * 1.5,
                    phase: Math.random() * Math.PI * 2,
                    speed: 0.003 + Math.random() * 0.005,
                    drift: 8 + Math.random() * 12
                });
            }
        }
    }

    function draw(time) {
        ctx.clearRect(0, 0, width, height);

        nodes.forEach(n => {
            n.x = n.baseX + Math.sin(time * n.speed + n.phase) * n.drift;
            n.y = n.baseY + Math.cos(time * n.speed * 0.7 + n.phase) * n.drift * 0.5;
        });

        const maxDist = 120;
        ctx.lineWidth = 1;

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.08 * strength;
                    ctx.strokeStyle = `rgba(${rgb}, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        nodes.forEach(n => {
            const pulse = 0.4 + 0.6 * Math.sin(time * 0.002 + n.phase);
            ctx.fillStyle = `rgba(${rgb}, ${(0.15 + pulse * 0.2) * strength})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        if (!prefersReducedMotion) animId = requestAnimationFrame(draw);
    }

    readColors();
    resize();
    window.addEventListener('resize', resize);
    if (!prefersReducedMotion) animId = requestAnimationFrame(draw);

    document.addEventListener('themechange', () => {
        readColors();
        if (prefersReducedMotion) draw(0);
    });

    // Pause when not visible; cancel first so a frame still pending (e.g. a
    // page opened in a background tab) can't start a second loop
    document.addEventListener('visibilitychange', () => {
        cancelAnimationFrame(animId);
        if (!document.hidden && !prefersReducedMotion) animId = requestAnimationFrame(draw);
    });
}

/* ==================== STAT COUNTERS ==================== */
function initStatCounters() {
    const stats = document.querySelectorAll('.stat-number');
    const statsRow = document.querySelector('.stats-row');
    if (!stats.length || !statsRow || !('IntersectionObserver' in window)) return;
    let animated = false;

    // The markup holds the final values (shown without JS); start from 0 only
    // when the count-up animation will run.
    if (!prefersReducedMotion) stats.forEach(stat => { stat.textContent = format(0, stat); });

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                stats.forEach(stat => animateCounter(stat));
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });

    observer.observe(statsRow);

    function format(value, el) {
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        return value.toFixed(decimals);
    }

    function animateCounter(el) {
        const target = parseFloat(el.dataset.target);
        if (prefersReducedMotion) {
            el.textContent = format(target, el);
            return;
        }
        const duration = 1500;
        const start = performance.now();

        function update(now) {
            const progress = Math.min((now - start) / duration, 1);
            const ease = 1 - Math.pow(1 - progress, 3);
            el.textContent = format(progress < 1 ? Math.round(ease * target * 10) / 10 : target, el);
            if (progress < 1) requestAnimationFrame(update);
        }

        requestAnimationFrame(update);
    }
}

/* ==================== PUBLICATIONS: search, type filter, first-author toggle ==================== */
function initPublications() {
    const list = document.getElementById('pubList');
    if (!list) return;
    const entries = [...list.querySelectorAll('.pub-entry')];
    const groups = [...list.querySelectorAll('.pub-group')];
    const chips = [...document.querySelectorAll('#pubFilters .chip')];
    const search = document.getElementById('pubSearch');
    const firstOnly = document.getElementById('pubFirst');
    const status = document.getElementById('pubStatus');
    const empty = document.getElementById('pubEmpty');
    const reset = document.getElementById('pubReset');

    entries.forEach(entry => {
        entry._hay = normalize(entry.textContent + ' ' + (entry.dataset.keywords || ''));
    });

    chips.forEach(chip => {
        const types = chip.dataset.filter.split(' ');
        const count = chip.dataset.filter === 'all'
            ? entries.length
            : entries.filter(e => types.includes(e.dataset.type)).length;
        const badge = chip.querySelector('.chip-count');
        if (badge) badge.textContent = count;
    });

    const state = { filter: 'all', query: '', first: false };
    let timer;

    function apply() {
        const types = state.filter.split(' ');
        const tokens = normalize(state.query).split(' ').filter(Boolean);
        let shown = 0;

        entries.forEach(entry => {
            const typeOk = state.filter === 'all' || types.includes(entry.dataset.type);
            const firstOk = !state.first || entry.dataset.first === 'true';
            const queryOk = tokens.every(t => entry._hay.includes(t));
            const visible = typeOk && firstOk && queryOk;
            entry.hidden = !visible;
            if (visible) {
                shown++;
                // Filtered-in entries may never have been scrolled past
                entry.classList.add('revealed');
            }
        });

        groups.forEach(group => {
            group.hidden = !group.querySelector('.pub-entry:not([hidden])');
        });

        if (status) {
            status.textContent = shown === entries.length
                ? `Showing all ${entries.length} items`
                : `Showing ${shown} of ${entries.length} items`;
        }
        if (empty) empty.hidden = shown !== 0;
    }

    chips.forEach(chip => {
        chip.addEventListener('click', () => {
            state.filter = chip.dataset.filter;
            chips.forEach(c => c.setAttribute('aria-pressed', String(c === chip)));
            apply();
        });
    });

    if (search) {
        search.addEventListener('input', () => {
            clearTimeout(timer);
            timer = setTimeout(() => {
                state.query = search.value;
                apply();
            }, 80);
        });
        search.addEventListener('keydown', e => {
            if (e.key === 'Escape' && search.value) {
                e.stopPropagation();
                search.value = '';
                state.query = '';
                apply();
            }
        });
    }

    if (firstOnly) {
        firstOnly.addEventListener('change', () => {
            state.first = firstOnly.checked;
            apply();
        });
    }

    function resetAll() {
        state.filter = 'all';
        state.query = '';
        state.first = false;
        if (search) search.value = '';
        if (firstOnly) firstOnly.checked = false;
        chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === 'all')));
        apply();
    }

    if (reset) reset.addEventListener('click', () => {
        resetAll();
        if (search) search.focus();
    });

    list._reset = resetAll;
    apply();
}

/* ==================== GENERIC CHIP FILTER (research themes, talks) ==================== */
function initChipFilter({ bar, items, attr, groups }) {
    const barEl = document.getElementById(bar);
    if (!barEl) return;
    const chips = [...barEl.querySelectorAll('.chip')];
    const nodes = [...document.querySelectorAll(items)];
    const groupEls = groups ? [...document.querySelectorAll(groups)] : [];

    chips.forEach(chip => {
        const value = chip.dataset.filter;
        const count = value === 'all'
            ? nodes.length
            : nodes.filter(n => (n.dataset[attr] || '').split(' ').includes(value)).length;
        const badge = chip.querySelector('.chip-count');
        if (badge) badge.textContent = count;
    });

    function apply(value) {
        nodes.forEach(node => {
            const visible = value === 'all' || (node.dataset[attr] || '').split(' ').includes(value);
            node.hidden = !visible;
            if (visible) node.classList.add('revealed');
        });
        groupEls.forEach(group => {
            group.hidden = !group.querySelector(items.split(' ').pop() + ':not([hidden])');
        });
        chips.forEach(c => c.setAttribute('aria-pressed', String(c.dataset.filter === value)));
    }

    chips.forEach(chip => chip.addEventListener('click', () => apply(chip.dataset.filter)));
    barEl._reset = () => apply('all');
}

/* ==================== SITE SEARCH PALETTE ==================== */
function initPalette() {
    const palette = document.getElementById('palette');
    const input = document.getElementById('paletteInput');
    const results = document.getElementById('paletteResults');
    const closeBtn = document.getElementById('paletteClose');
    const openers = document.querySelectorAll('[data-open-search]');
    if (!palette || !input || !results) return;

    let index = null;
    let shown = [];
    let selected = 0;
    let lastFocus = null;

    function text(el, selector) {
        const node = selector ? el.querySelector(selector) : el;
        return node ? node.textContent.replace(/\s+/g, ' ').trim() : '';
    }

    function buildIndex() {
        const items = [];
        const add = (kind, title, sub, target, extra) => {
            if (!title) return;
            items.push({ kind, title, sub: sub || '', target, hay: normalize(title + ' ' + (sub || '') + ' ' + (extra || '')) });
        };

        document.querySelectorAll('main section[data-label]').forEach(s => {
            add('Section', s.dataset.label, text(s, '.section-subtitle') || text(s, '.section-title'), s, s.dataset.keywords);
        });
        document.querySelectorAll('.research-card').forEach(c => {
            add('Project', text(c, '.card-title'), text(c, '.card-subtitle'), c, text(c, '.card-desc'));
        });
        document.querySelectorAll('.pub-entry').forEach(p => {
            const kind = p.dataset.type === 'patent' ? 'Patent' : 'Paper';
            add(kind, text(p, '.pub-title'), text(p, '.pub-venue') + ' – ' + text(p, '.pub-authors'), p, text(p, '.pub-source') + ' ' + (p.dataset.keywords || ''));
        });
        document.querySelectorAll('.talk-item').forEach(t => {
            add('Talk', text(t, '.talk-title'), text(t, '.talk-date') + ', ' + text(t, '.talk-event'), t, text(t, '.talk-note'));
        });
        document.querySelectorAll('.award-card').forEach(a => {
            add('Honor', text(a, '.award-title'), text(a, '.award-year'), a, text(a, '.award-desc'));
        });
        document.querySelectorAll('.honor-list li').forEach(li => {
            add('Honor', text(li, '.honor-name'), text(li, '.honor-year'), li, text(li, 'small'));
        });
        document.querySelectorAll('.timeline-entry').forEach(t => {
            add('Experience', text(t, 'h3'), text(t, '.timeline-company') + ', ' + text(t, '.timeline-date'), t, text(t, '.timeline-bullets'));
        });
        document.querySelectorAll('.news-item').forEach(n => {
            const textEl = n.querySelector('.news-text');
            if (!textEl) return;
            const copy = textEl.cloneNode(true);
            const tag = copy.querySelector('.news-tag');
            const tagText = tag ? tag.textContent.trim() : '';
            if (tag) tag.remove();
            const body = copy.textContent.replace(/\s+/g, ' ').trim();
            const date = text(n, '.news-date');
            add('News', body.length > 110 ? body.slice(0, 107) + '…' : body, tagText ? date + ', ' + tagText : date, n, body);
        });
        document.querySelectorAll('[data-search-action]').forEach(a => {
            add('Link', a.dataset.searchAction, a.dataset.searchSub || '', a, a.dataset.keywords);
        });
        add('Action', 'Switch light/dark theme', 'Change the color theme', 'theme', 'dark mode light mode appearance');
        return items;
    }

    function escapeHtml(s) {
        return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }

    function highlight(title, tokens) {
        let html = escapeHtml(title);
        tokens.forEach(t => {
            if (t.length < 2) return;
            const safe = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
            html = html.replace(new RegExp('(' + safe + ')', 'i'), '<mark>$1</mark>');
        });
        return html;
    }

    function search(query) {
        const tokens = normalize(query).split(' ').filter(Boolean);
        if (!tokens.length) {
            return index.filter(i => i.kind === 'Section' || i.kind === 'Link').slice(0, 24);
        }
        const q = tokens.join(' ');
        const scored = [];
        index.forEach((item, order) => {
            if (!tokens.every(t => item.hay.includes(t))) return;
            const title = normalize(item.title);
            let score = 0;
            if (title.startsWith(q)) score += 100;
            else if (title.includes(q)) score += 60;
            tokens.forEach(t => { if (title.includes(t)) score += 10; });
            if (item.kind === 'Section') score += 8;
            if (item.kind === 'Project') score += 6;
            if (item.kind === 'Link' || item.kind === 'Action') score += 4;
            scored.push({ item, score, order });
        });
        scored.sort((a, b) => b.score - a.score || a.order - b.order);

        // Group by kind, in the order each kind first appears, so headings don't repeat
        const kinds = [];
        const byKind = {};
        scored.forEach(({ item }) => {
            if (!byKind[item.kind]) {
                byKind[item.kind] = [];
                kinds.push(item.kind);
            }
            if (byKind[item.kind].length < 8) byKind[item.kind].push(item);
        });
        return kinds.flatMap(k => byKind[k]).slice(0, 40);
    }

    function render() {
        const query = input.value;
        const tokens = normalize(query).split(' ').filter(Boolean);
        shown = search(query);
        selected = 0;
        results.innerHTML = '';

        if (!shown.length) {
            results.innerHTML = '<p class="palette-empty">No matches. Try a project name like “GraNNite”, a venue like “DAC”, or a topic like “state space”.</p>';
            input.removeAttribute('aria-activedescendant');
            return;
        }

        let lastKind = null;
        shown.forEach((item, i) => {
            if (item.kind !== lastKind) {
                const head = document.createElement('div');
                head.className = 'palette-group';
                head.setAttribute('role', 'presentation');
                head.textContent = groupName(item.kind);
                results.appendChild(head);
                lastKind = item.kind;
            }
            const opt = document.createElement('div');
            opt.className = 'palette-option';
            opt.id = 'palette-opt-' + i;
            opt.setAttribute('role', 'option');
            opt.setAttribute('aria-selected', String(i === selected));
            opt.innerHTML = '<span class="palette-option-title"></span><span class="palette-option-sub"></span><span class="palette-option-kind"></span>';
            opt.querySelector('.palette-option-title').innerHTML = highlight(item.title, tokens);
            opt.querySelector('.palette-option-sub').textContent = item.sub;
            opt.querySelector('.palette-option-kind').textContent = item.kind;
            opt.addEventListener('mousemove', () => select(i, false));
            opt.addEventListener('click', () => activate(item));
            results.appendChild(opt);
        });
        input.setAttribute('aria-activedescendant', 'palette-opt-0');
    }

    function groupName(kind) {
        return {
            Section: 'Sections', Project: 'Research projects', Paper: 'Publications', Patent: 'Patents',
            Talk: 'Talks and presentations', Honor: 'Honors', Experience: 'Experience', News: 'News',
            Link: 'Links', Action: 'Actions'
        }[kind] || kind;
    }

    function select(i, scroll = true) {
        if (!shown.length) return;
        selected = (i + shown.length) % shown.length;
        results.querySelectorAll('.palette-option').forEach((opt, idx) => {
            opt.setAttribute('aria-selected', String(idx === selected));
        });
        const current = document.getElementById('palette-opt-' + selected);
        input.setAttribute('aria-activedescendant', 'palette-opt-' + selected);
        if (scroll && current) current.scrollIntoView({ block: 'nearest' });
    }

    function open() {
        if (!index) index = buildIndex();
        lastFocus = document.activeElement;
        palette.hidden = false;
        document.body.classList.add('palette-open');
        input.value = '';
        render();
        input.focus();
    }

    function close(restoreFocus = true) {
        palette.hidden = true;
        document.body.classList.remove('palette-open');
        if (restoreFocus && lastFocus && lastFocus.focus) lastFocus.focus({ preventScroll: true });
    }

    function reveal(el) {
        // Undo filters or open disclosures that hide the target
        const pubList = el.closest('#pubList');
        if (pubList && el.hidden && pubList._reset) pubList._reset();
        const grid = el.closest('#researchGrid');
        if (grid && el.hidden) {
            const bar = document.getElementById('researchFilters');
            if (bar && bar._reset) bar._reset();
        }
        const talks = el.closest('#talksWrap');
        if (talks && (el.hidden || (el.closest('.talk-group') || {}).hidden)) {
            const bar = document.getElementById('talkFilters');
            if (bar && bar._reset) bar._reset();
        }
        let details = el.closest('details');
        while (details) {
            details.open = true;
            details = details.parentElement ? details.parentElement.closest('details') : null;
        }
        el.classList.add('revealed');
    }

    function activate(item) {
        if (item.target === 'theme') {
            close();
            toggleTheme();
            return;
        }
        const el = item.target;
        if (el.tagName === 'A' && el.dataset.searchAction) {
            close(false);
            el.click();
            return;
        }
        close(false);
        reveal(el);
        requestAnimationFrame(() => {
            el.scrollIntoView({ behavior: scrollBehavior(), block: el.tagName === 'SECTION' ? 'start' : 'center' });
            if (!el.hasAttribute('tabindex') && !/^(A|BUTTON|INPUT)$/.test(el.tagName)) el.setAttribute('tabindex', '-1');
            el.focus({ preventScroll: true });
            if (el.tagName !== 'SECTION') {
                el.classList.remove('is-target');
                void el.offsetWidth;
                el.classList.add('is-target');
                setTimeout(() => el.classList.remove('is-target'), 1900);
            }
        });
    }

    input.addEventListener('input', render);
    input.addEventListener('keydown', e => {
        if (e.key === 'ArrowDown') { e.preventDefault(); select(selected + 1); }
        else if (e.key === 'ArrowUp') { e.preventDefault(); select(selected - 1); }
        else if (e.key === 'Enter') {
            e.preventDefault();
            if (shown[selected]) activate(shown[selected]);
        } else if (e.key === 'Escape') {
            e.preventDefault();
            close();
        }
    });

    palette.addEventListener('click', e => {
        if (e.target === palette) close();
    });
    if (closeBtn) closeBtn.addEventListener('click', () => close());

    // Keep Tab inside the dialog
    palette.addEventListener('keydown', e => {
        if (e.key !== 'Tab') return;
        const focusables = [input, closeBtn].filter(Boolean);
        const idx = focusables.indexOf(document.activeElement);
        e.preventDefault();
        const next = e.shiftKey ? idx - 1 : idx + 1;
        focusables[(next + focusables.length) % focusables.length].focus();
    });

    openers.forEach(btn => btn.addEventListener('click', open));

    document.addEventListener('keydown', e => {
        const typing = /^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement.tagName) || document.activeElement.isContentEditable;
        if ((e.key === 'k' || e.key === 'K') && (e.metaKey || e.ctrlKey)) {
            e.preventDefault();
            if (palette.hidden) open();
            else close();
        } else if (e.key === '/' && !typing && palette.hidden) {
            e.preventDefault();
            open();
        }
    });
}

/* ==================== PRINT ==================== */
function initPrintHelpers() {
    let opened = [];
    window.addEventListener('beforeprint', () => {
        opened = [...document.querySelectorAll('details:not([open])')];
        opened.forEach(d => { d.open = true; });
        document.querySelectorAll('.reveal').forEach(el => el.classList.add('revealed'));
    });
    window.addEventListener('afterprint', () => {
        opened.forEach(d => { d.open = false; });
        opened = [];
    });
}
