/* ============================================
   EventPulse — Three.js 3D Hero Animation
   hero3d.js
   ============================================ */

(function () {
  'use strict';

  // ─── Three.js Particle Field ───────────────────────────────────────────────
  function initThreeHero() {
    const canvas = document.getElementById('hero-canvas');
    if (!canvas || typeof THREE === 'undefined') return;

    const renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x000000, 0);

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, canvas.clientWidth / canvas.clientHeight, 0.1, 1000);
    camera.position.z = 4;

    // ── Particle System ──
    const COUNT = 1800;
    const positions = new Float32Array(COUNT * 3);
    const colors    = new Float32Array(COUNT * 3);
    const sizes     = new Float32Array(COUNT);

    const palette = [
      new THREE.Color('#6366f1'),
      new THREE.Color('#8b5cf6'),
      new THREE.Color('#a78bfa'),
      new THREE.Color('#06b6d4'),
      new THREE.Color('#f472b6'),
      new THREE.Color('#818cf8'),
    ];

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3]     = (Math.random() - 0.5) * 20;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 10;

      const col = palette[Math.floor(Math.random() * palette.length)];
      colors[i * 3]     = col.r;
      colors[i * 3 + 1] = col.g;
      colors[i * 3 + 2] = col.b;

      sizes[i] = Math.random() * 2 + 0.5;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3));
    geo.setAttribute('size',     new THREE.BufferAttribute(sizes, 1));

    const mat = new THREE.PointsMaterial({
      size: 0.04,
      vertexColors: true,
      transparent: true,
      opacity: 0.65,
      sizeAttenuation: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const particles = new THREE.Points(geo, mat);
    scene.add(particles);

    // ── Connecting Lines (sparse web) ──
    const lineMat = new THREE.LineBasicMaterial({
      color: 0x6366f1,
      transparent: true,
      opacity: 0.04,
      blending: THREE.AdditiveBlending,
    });

    const lineGeo = new THREE.BufferGeometry();
    const linePositions = [];
    const step = 12;
    for (let i = 0; i < COUNT; i += step) {
      for (let j = i + step; j < Math.min(i + step * 4, COUNT); j += step) {
        const dx = positions[i*3]   - positions[j*3];
        const dy = positions[i*3+1] - positions[j*3+1];
        const dz = positions[i*3+2] - positions[j*3+2];
        const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
        if (dist < 2.5) {
          linePositions.push(
            positions[i*3], positions[i*3+1], positions[i*3+2],
            positions[j*3], positions[j*3+1], positions[j*3+2]
          );
        }
      }
    }
    lineGeo.setAttribute('position', new THREE.Float32BufferAttribute(linePositions, 3));
    scene.add(new THREE.LineSegments(lineGeo, lineMat));

    // ── Floating Icosahedra ──
    function addFloatingShape(x, y, z, radius, color, wireframe) {
      const g = new THREE.IcosahedronGeometry(radius, 0);
      const m = new THREE.MeshBasicMaterial({
        color,
        wireframe,
        transparent: true,
        opacity: wireframe ? 0.15 : 0.06,
        blending: THREE.AdditiveBlending,
      });
      const mesh = new THREE.Mesh(g, m);
      mesh.position.set(x, y, z);
      scene.add(mesh);
      return mesh;
    }

    const shapes = [
      addFloatingShape(-3.5,  1.5, -1.5, 0.7,  0x6366f1, true),
      addFloatingShape( 3.2, -1.2, -2,   0.5,  0xf472b6, true),
      addFloatingShape( 1.5,  2.5, -3,   1.0,  0x8b5cf6, false),
      addFloatingShape(-2.0, -2.5, -1,   0.45, 0x06b6d4, true),
      addFloatingShape( 4.0,  0.5, -2,   0.6,  0xa78bfa, false),
    ];

    // ── Mouse Parallax ──
    let mx = 0, my = 0;
    document.addEventListener('mousemove', (e) => {
      mx = (e.clientX / window.innerWidth  - 0.5) * 2;
      my = (e.clientY / window.innerHeight - 0.5) * 2;
    });

    // ── Resize ──
    function resize() {
      const w = canvas.clientWidth;
      const h = canvas.clientHeight;
      renderer.setSize(w, h, false);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Animation Loop ──
    let t = 0;
    function animate() {
      requestAnimationFrame(animate);
      t += 0.004;

      // Rotate particles slowly
      particles.rotation.y = t * 0.06 + mx * 0.05;
      particles.rotation.x = t * 0.02 + my * 0.03;

      // Animate shapes
      shapes.forEach((s, i) => {
        s.rotation.x = t * (0.3 + i * 0.1);
        s.rotation.y = t * (0.2 + i * 0.08);
        s.position.y += Math.sin(t + i * 1.2) * 0.002;
      });

      // Camera subtle sway
      camera.position.x += (mx * 0.3 - camera.position.x) * 0.04;
      camera.position.y += (-my * 0.2 - camera.position.y) * 0.04;
      camera.lookAt(scene.position);

      renderer.render(scene, camera);
    }
    animate();
  }

  // ─── Counter Animations ─────────────────────────────────────────────────────
  function animateCounters() {
    const counters = document.querySelectorAll('[data-target]');
    if (!counters.length) return;

    const obs = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (!entry.isIntersecting) return;
        const el = entry.target;
        const target = parseInt(el.dataset.target, 10);
        let current = 0;
        const inc = target / 60;
        const tick = () => {
          current = Math.min(current + inc, target);
          el.textContent = Math.floor(current).toLocaleString();
          if (current < target) requestAnimationFrame(tick);
        };
        requestAnimationFrame(tick);
        obs.unobserve(el);
      });
    }, { threshold: 0.5 });

    counters.forEach(c => obs.observe(c));
  }

  // ─── Testimonials Carousel ──────────────────────────────────────────────────
  function initTestimonials() {
    const track  = document.getElementById('testimonial-track');
    const dotsEl = document.getElementById('t-dots');
    const prevBtn = document.getElementById('t-prev');
    const nextBtn = document.getElementById('t-next');
    if (!track) return;

    const cards = Array.from(track.querySelectorAll('.testimonial-card'));
    let current = 0;
    let perView = getPerView();
    let autoplay;

    function getPerView() {
      if (window.innerWidth < 640) return 1;
      if (window.innerWidth < 900) return 2;
      return 3;
    }

    const total = cards.length;
    const maxIndex = Math.max(0, total - perView);

    // Build dots
    function buildDots() {
      if (!dotsEl) return;
      dotsEl.innerHTML = '';
      for (let i = 0; i <= maxIndex; i++) {
        const d = document.createElement('div');
        d.className = 't-dot' + (i === current ? ' active' : '');
        d.addEventListener('click', () => goTo(i));
        dotsEl.appendChild(d);
      }
    }

    function goTo(idx) {
      current = Math.max(0, Math.min(idx, maxIndex));
      const cardW = cards[0].getBoundingClientRect().width + 20;
      track.style.transform = `translateX(-${current * cardW}px)`;
      buildDots();
    }

    function startAutoplay() {
      autoplay = setInterval(() => {
        current = current >= maxIndex ? 0 : current + 1;
        goTo(current);
      }, 5000);
    }

    function stopAutoplay() { clearInterval(autoplay); }

    if (prevBtn) prevBtn.addEventListener('click', () => { stopAutoplay(); goTo(current - 1); startAutoplay(); });
    if (nextBtn) nextBtn.addEventListener('click', () => { stopAutoplay(); goTo(current + 1); startAutoplay(); });

    window.addEventListener('resize', () => {
      perView = getPerView();
      buildDots();
      goTo(0);
    });

    buildDots();
    startAutoplay();
  }

  // ─── Scroll-based Navbar ────────────────────────────────────────────────────
  function initScrollIndicator() {
    const indicator = document.getElementById('scroll-indicator');
    if (!indicator) return;
    window.addEventListener('scroll', () => {
      indicator.style.opacity = window.scrollY > 80 ? '0' : '1';
    });
  }

  // ─── 3D Card Tilt Effect ────────────────────────────────────────────────────
  function initCardTilt() {
    document.querySelectorAll('.feat-card-3d').forEach(card => {
      card.addEventListener('mousemove', (e) => {
        const rect = card.getBoundingClientRect();
        const x = ((e.clientX - rect.left) / rect.width  - 0.5) * 12;
        const y = ((e.clientY - rect.top)  / rect.height - 0.5) * -12;
        card.style.transform = `perspective(600px) rotateY(${x}deg) rotateX(${y}deg) translateY(-8px)`;
      });
      card.addEventListener('mouseleave', () => {
        card.style.transform = '';
      });
    });
  }

  // ─── Init ───────────────────────────────────────────────────────────────────
  document.addEventListener('DOMContentLoaded', () => {
    initThreeHero();
    animateCounters();
    initTestimonials();
    initScrollIndicator();

    // Slight delay for tilt — wait for cards to be visible
    requestAnimationFrame(() => requestAnimationFrame(initCardTilt));
  });

})();
