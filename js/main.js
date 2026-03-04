/* ==================== DOM READY ==================== */
document.addEventListener('DOMContentLoaded', () => {
    initNav();
    initScrollReveal();
    initHeroCanvas();
    initStatCounters();
    initPubFilters();
});

/* ==================== NAVIGATION ==================== */
function initNav() {
    const navbar = document.getElementById('navbar');
    const hamburger = document.getElementById('navHamburger');
    const navLinks = document.getElementById('navLinks');
    const links = navLinks.querySelectorAll('a');
    const sections = document.querySelectorAll('.section, .hero');

    // Scroll -> solid nav
    window.addEventListener('scroll', () => {
        navbar.classList.toggle('scrolled', window.scrollY > 50);
    });

    // Hamburger toggle
    hamburger.addEventListener('click', () => {
        hamburger.classList.toggle('open');
        navLinks.classList.toggle('open');
        document.body.style.overflow = navLinks.classList.contains('open') ? 'hidden' : '';
    });

    // Close mobile nav on link click
    links.forEach(link => {
        link.addEventListener('click', () => {
            hamburger.classList.remove('open');
            navLinks.classList.remove('open');
            document.body.style.overflow = '';
        });
    });

    // Active link on scroll
    const navObserver = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const id = entry.target.id;
                links.forEach(link => {
                    link.classList.toggle('active', link.getAttribute('href') === '#' + id);
                });
            }
        });
    }, { threshold: 0.2, rootMargin: '-80px 0px -50% 0px' });

    sections.forEach(section => navObserver.observe(section));
}

/* ==================== SCROLL REVEAL ==================== */
function initScrollReveal() {
    const reveals = document.querySelectorAll('.reveal');

    const observer = new IntersectionObserver(entries => {
        entries.forEach((entry, i) => {
            if (entry.isIntersecting) {
                // Stagger siblings
                const parent = entry.target.parentElement;
                const siblings = Array.from(parent.querySelectorAll(':scope > .reveal'));
                const idx = siblings.indexOf(entry.target);
                const delay = idx >= 0 ? idx * 100 : 0;

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

    function resize() {
        width = canvas.width = canvas.offsetWidth;
        height = canvas.height = canvas.offsetHeight;
        generateNodes();
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

        // Update positions
        nodes.forEach(n => {
            n.x = n.baseX + Math.sin(time * n.speed + n.phase) * n.drift;
            n.y = n.baseY + Math.cos(time * n.speed * 0.7 + n.phase) * n.drift * 0.5;
        });

        // Draw connections
        const maxDist = 120;
        ctx.strokeStyle = 'rgba(0, 212, 170, 0.06)';
        ctx.lineWidth = 1;

        for (let i = 0; i < nodes.length; i++) {
            for (let j = i + 1; j < nodes.length; j++) {
                const dx = nodes[i].x - nodes[j].x;
                const dy = nodes[i].y - nodes[j].y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                if (dist < maxDist) {
                    const alpha = (1 - dist / maxDist) * 0.08;
                    ctx.strokeStyle = `rgba(0, 212, 170, ${alpha})`;
                    ctx.beginPath();
                    ctx.moveTo(nodes[i].x, nodes[i].y);
                    ctx.lineTo(nodes[j].x, nodes[j].y);
                    ctx.stroke();
                }
            }
        }

        // Draw nodes
        nodes.forEach(n => {
            const pulse = 0.4 + 0.6 * Math.sin(time * 0.002 + n.phase);
            ctx.fillStyle = `rgba(0, 212, 170, ${0.15 + pulse * 0.2})`;
            ctx.beginPath();
            ctx.arc(n.x, n.y, n.radius, 0, Math.PI * 2);
            ctx.fill();
        });

        animId = requestAnimationFrame(draw);
    }

    resize();
    window.addEventListener('resize', resize);
    animId = requestAnimationFrame(draw);

    // Pause when not visible
    document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
            cancelAnimationFrame(animId);
        } else {
            animId = requestAnimationFrame(draw);
        }
    });
}

/* ==================== STAT COUNTERS ==================== */
function initStatCounters() {
    const stats = document.querySelectorAll('.stat-number');
    let animated = false;

    const observer = new IntersectionObserver(entries => {
        entries.forEach(entry => {
            if (entry.isIntersecting && !animated) {
                animated = true;
                stats.forEach(stat => animateCounter(stat));
                observer.disconnect();
            }
        });
    }, { threshold: 0.5 });

    const statsRow = document.querySelector('.stats-row');
    if (statsRow) observer.observe(statsRow);
}

function animateCounter(el) {
    const target = parseInt(el.dataset.target, 10);
    const duration = 1500;
    const start = performance.now();

    function update(now) {
        const elapsed = now - start;
        const progress = Math.min(elapsed / duration, 1);
        // Ease out cubic
        const ease = 1 - Math.pow(1 - progress, 3);
        const current = Math.round(ease * target);
        el.textContent = current;

        if (progress < 1) {
            requestAnimationFrame(update);
        } else {
            el.textContent = target;
        }
    }

    requestAnimationFrame(update);
}

/* ==================== PUBLICATION FILTERS ==================== */
function initPubFilters() {
    const buttons = document.querySelectorAll('.pub-filter');
    const entries = document.querySelectorAll('.pub-entry');
    const yearHeaders = document.querySelectorAll('.pub-year');

    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            const filter = btn.dataset.filter;

            // Update active button
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            // Filter entries
            entries.forEach(entry => {
                if (filter === 'all' || entry.dataset.type === filter) {
                    entry.classList.remove('hidden');
                } else {
                    entry.classList.add('hidden');
                }
            });

            // Show/hide year headers based on visible entries
            yearHeaders.forEach(header => {
                let next = header.nextElementSibling;
                let hasVisible = false;
                while (next && !next.classList.contains('pub-year')) {
                    if (next.classList.contains('pub-entry') && !next.classList.contains('hidden')) {
                        hasVisible = true;
                        break;
                    }
                    next = next.nextElementSibling;
                }
                header.style.display = hasVisible ? '' : 'none';
            });
        });
    });
}
