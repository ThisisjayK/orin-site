/* Orin site script: menu, header theme, scroll motion, FAQ, filters, slider, forms.
   Motion respects prefers-reduced-motion (CSS and the checks below). */

const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => Array.from(r.querySelectorAll(s));

/* ---------- smooth scrolling (all pages): Lenis 1.3.15, MIT, self-hosted in assets/vendor ----------
   Skipped for reduced motion and when the library did not load. Paused while the phone menu is open. */
(function () {
  if (reduce || typeof window.Lenis !== "function") return;
  const lenis = new window.Lenis({
    autoRaf: true,
    prevent: node => node.closest("form, #menu")   // never interfere with form fields or the menu
  });
  // In-page links: Lenis's built-in `anchors` option overshot to the page bottom on this page
  // (tested), so scroll to the target ourselves, leaving room for the fixed header.
  document.addEventListener("click", e => {
    const a = e.target.closest('a[href^="#"]');
    if (!a || a.getAttribute("href").length < 2 || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const target = document.getElementById(decodeURIComponent(a.getAttribute("href").slice(1)));
    if (!target) return;
    e.preventDefault();
    lenis.scrollTo(target.getBoundingClientRect().top + window.scrollY - 110);
    history.pushState(null, "", a.getAttribute("href"));
  });
  new MutationObserver(() => {
    document.body.classList.contains("menu-open") ? lenis.stop() : lenis.start();
  }).observe(document.body, { attributes: true, attributeFilter: ["class"] });
})();

/* ---------- header theme + scrolled state ---------- */
(function () {
  const header = $(".site-header");
  const hero = $("[data-hero]");
  const update = () => {
    document.body.classList.toggle("scrolled", window.scrollY > 24);
    const over = hero ? hero.getBoundingClientRect().bottom > 90 : false;
    header.dataset.theme = over ? "dark" : "light";
  };
  update();
  window.addEventListener("scroll", update, { passive: true });
  window.addEventListener("resize", update);
})();

/* ---------- header dropdown menu (opens out of the pill, page blurs behind it) ---------- */
(function () {
  const card = $(".nav-card"), btn = $(".menu-btn"), drop = $("#menu"), scrim = $(".scrim");
  if (!card || !btn || !drop) return;
  const toggleSub = (li, open) => {
    li.classList.toggle("open", open);
    $(".row[aria-expanded]", li).setAttribute("aria-expanded", String(open));
  };
  const set = open => {
    card.classList.toggle("open", open);
    btn.setAttribute("aria-expanded", String(open));
    btn.setAttribute("aria-label", open ? "Close menu" : "Open menu");
    drop.inert = !open;
    document.body.classList.toggle("menu-open", open);
    document.body.style.overflow = open ? "hidden" : "";
    if (!open) $$(".has-sub.open", drop).forEach(li => toggleSub(li, false));
  };
  drop.inert = true;
  btn.addEventListener("click", () => set(!card.classList.contains("open")));
  if (scrim) scrim.addEventListener("click", () => set(false));
  $$(".has-sub > .row", drop).forEach(b => b.addEventListener("click", () => toggleSub(b.parentElement, !b.parentElement.classList.contains("open"))));
  drop.addEventListener("click", e => { if (e.target.closest("a")) set(false); });
  document.addEventListener("keydown", e => { if (e.key === "Escape" && card.classList.contains("open")) { set(false); btn.focus(); } });
})();

/* ---------- reveal on scroll ---------- */
(function () {
  const els = $$("[data-reveal], .hero-visual, .panel");
  if (!("IntersectionObserver" in window)) { els.forEach(e => e.classList.add("is-in")); return; }
  const io = new IntersectionObserver(entries => {
    entries.forEach(en => { if (en.isIntersecting) { en.target.classList.add("is-in"); io.unobserve(en.target); } });
  }, { threshold: 0.12, rootMargin: "0px 0px -6% 0px" });
  els.forEach(e => io.observe(e));
})();

/* ---------- hero word rotator ---------- */
(function () {
  const items = $$(".rot b");
  if (items.length < 2 || reduce) return;
  let i = 0;
  setInterval(() => {
    const cur = items[i];
    i = (i + 1) % items.length;
    const next = items[i];
    cur.classList.remove("on"); cur.classList.add("out");
    next.classList.remove("out"); next.classList.add("on");
    setTimeout(() => { cur.classList.remove("out"); }, 650);
  }, 2400);
})();

/* ---------- scroll-scrubbed statement: letters light up (Vantra-style) ----------
   Each letter starts at 15% opacity. Scroll progress is smoothed (about 0.8s of lag, like
   GSAP scrub:0.8) and drives a soft wave of letters from 15% to 100%. */
(function () {
  const p = $("[data-words]");
  if (!p) return;
  const text = p.textContent.trim();
  p.setAttribute("aria-label", text);
  p.innerHTML = text.split(/\s+/).map(w =>
    `<span class="w" aria-hidden="true">${Array.from(w).map(c => `<span class="ch">${c}</span>`).join("")}</span>`
  ).join(" ");
  const letters = $$(".ch", p);
  if (reduce) { letters.forEach(l => (l.style.opacity = 1)); return; }
  const N = letters.length, WAVE = 10, MIN = 0.15;
  let target = 0, shown = 0, last = performance.now(), raf = 0;
  const measure = () => {
    const r = p.getBoundingClientRect(), vh = window.innerHeight;
    // starts when the top reaches the bottom of the screen, ends when the bottom reaches 30% from the top
    target = Math.min(1, Math.max(0, (vh - r.top) / (vh * 0.7 + r.height)));
  };
  const paint = () => {
    const x = shown * (N + WAVE);
    for (let i = 0; i < N; i++) {
      const t = Math.min(1, Math.max(0, (x - i) / WAVE));
      letters[i].style.opacity = (MIN + (1 - MIN) * t).toFixed(3);
    }
  };
  const frame = now => {
    const dt = Math.min(0.1, (now - last) / 1000); last = now;
    shown += (target - shown) * (1 - Math.exp(-dt / 0.27));
    if (Math.abs(target - shown) < 0.0005) shown = target;
    paint();
    raf = shown === target ? 0 : requestAnimationFrame(frame);
  };
  const kick = () => { measure(); if (!raf) { last = performance.now(); raf = requestAnimationFrame(frame); } };
  window.addEventListener("scroll", kick, { passive: true });
  window.addEventListener("resize", kick);
  measure(); shown = target; paint();
})();

/* ---------- headline line reveals (all pages): lines rise out of a mask, 0.45s power2.inOut, staggered ---------- */
(function () {
  if (reduce || !("IntersectionObserver" in window)) return;
  const heads = $$("h2[data-reveal]");
  if (!heads.length) return;
  const split = h => {
    if (!h.dataset.text) h.dataset.text = h.textContent.trim();
    h.setAttribute("aria-label", h.dataset.text);
    h.innerHTML = h.dataset.text.split(/\s+/).map(w => `<span class="sw">${w}</span>`).join(" ");
    const lines = [];
    $$(".sw", h).forEach(w => {
      const top = w.offsetTop, line = lines[lines.length - 1];
      if (line && Math.abs(line.top - top) < 4) line.words.push(w.textContent); else lines.push({ top, words: [w.textContent] });
    });
    h.innerHTML = lines.map((l, i) =>
      `<span class="ln" aria-hidden="true"><span class="ln-i" style="--li:${i}">${l.words.join(" ")}</span></span>`).join("");
    h.classList.add("split");
  };
  const run = () => heads.forEach(split);
  (document.fonts && document.fonts.ready ? document.fonts.ready : Promise.resolve()).then(() => {
    run();
    const io = new IntersectionObserver(es => es.forEach(en => {
      if (en.isIntersecting) { en.target.classList.add("lines-in"); io.unobserve(en.target); }
    }), { rootMargin: "0px 0px -8% 0px" });
    heads.forEach(h => io.observe(h));
    let w = window.innerWidth, t;
    window.addEventListener("resize", () => {            // re-wrap lines only when the width changes
      clearTimeout(t);
      t = setTimeout(() => { if (window.innerWidth !== w) { w = window.innerWidth; run(); } }, 200);
    });
  });
})();

/* ---------- card tilt that follows the pointer ---------- */
(function () {
  if (reduce || !window.matchMedia("(hover: hover)").matches) return;
  $$("[data-tilt]").forEach(card => {
    const host = card.closest(".hero, .page-hero") || card;
    host.addEventListener("pointermove", e => {
      const r = card.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) / window.innerWidth;
      const y = (e.clientY - (r.top + r.height / 2)) / window.innerHeight;
      card.style.setProperty("--ry", (x * 14).toFixed(2) + "deg");
      card.style.setProperty("--rx", (-y * 12).toFixed(2) + "deg");
    });
    host.addEventListener("pointerleave", () => { card.style.setProperty("--rx", "0deg"); card.style.setProperty("--ry", "0deg"); });
  });
})();

/* ---------- FAQ accordion + live search ---------- */
(function () {
  $$("[data-faq]").forEach(item => {
    const btn = $(".faq-q", item);
    btn.addEventListener("click", () => {
      const open = item.classList.toggle("open");
      btn.setAttribute("aria-expanded", String(open));
    });
  });
  const search = $("#faq-search");
  if (!search) return;
  const empty = $("#faq-empty");
  search.addEventListener("input", () => {
    const q = search.value.trim().toLowerCase();
    let any = false;
    $$("[data-cat]").forEach(cat => {
      let catAny = false;
      $$("[data-faq]", cat).forEach(it => {
        const hit = !q || it.dataset.text.includes(q);
        it.hidden = !hit;
        if (hit) { catAny = true; any = true; }
      });
      cat.hidden = !catAny;
    });
    empty.hidden = any;
  });
})();

/* ---------- services filter ---------- */
(function () {
  const buttons = $$("[data-filter]");
  if (!buttons.length) return;
  buttons.forEach(b => b.addEventListener("click", () => {
    buttons.forEach(x => x.setAttribute("aria-pressed", String(x === b)));
    const f = b.dataset.filter;
    $$(".svc-list > li").forEach(li => { li.hidden = !(f === "all" || li.dataset.where === f); });
  }));
})();

/* ---------- before / after slider ---------- */
(function () {
  const ba = $("[data-ba]");
  if (!ba) return;
  const input = $("input", ba);
  const set = v => ba.style.setProperty("--pos", v + "%");
  input.addEventListener("input", () => set(input.value));
  set(input.value);
  if (reduce) return;
  let touched = false;
  ["pointerdown", "keydown", "input"].forEach(t => input.addEventListener(t, () => (touched = true), { once: true }));
  const io = new IntersectionObserver(es => {
    if (!es[0].isIntersecting) return;
    io.disconnect();
    const start = performance.now(), dur = 1800;
    (function tick(now) {
      if (touched) return;
      const t = Math.min((now - start) / dur, 1);
      const v = 50 + 24 * Math.sin(Math.PI * 2 * t);
      input.value = v; set(v);
      if (t < 1) requestAnimationFrame(tick); else { input.value = 50; set(50); }
    })(start);
  }, { threshold: 0.6 });
  io.observe(ba);
})();

/* ---------- forms ---------- */
/* SETUP: follow docs/form-setup-guide.md, then paste the web app URL below.
   FORM_TYPE: "apps-script" (Google Sheet via site/apps-script/Code.gs) or "formspree".
   Until FORM_ENDPOINT is set, submissions are NOT saved and the page says so. */
const FORM_ENDPOINT = "";
const FORM_TYPE = "apps-script";

$$("form[data-form]").forEach(form => {
  const kind = form.dataset.form;
  const msg = $(".msg", form);
  const show = (k, t) => { msg.className = "msg " + k; msg.textContent = t; };

  $$(".chip", form).forEach(c => c.addEventListener("click", () => c.setAttribute("aria-pressed", String(c.getAttribute("aria-pressed") !== "true"))));

  form.addEventListener("submit", async e => {
    e.preventDefault();
    const d = new FormData(form);
    if (d.get("website")) return;                                   // spam trap
    const name = (d.get("name") || "").trim();
    const digits = (d.get("phone") || "").replace(/[\s\-+]/g, "").replace(/^91/, "");
    const car = (d.get("car") || "").trim();
    const area = d.get("area") || "";
    const message = (d.get("message") || "").trim();

    if (!name) return show("err", "Please enter your name.");
    if (!/^[6-9]\d{9}$/.test(digits)) return show("err", "Please enter a valid 10-digit Indian mobile number.");
    if (kind === "waitlist" && (!car || !area)) return show("err", "Please fill in your car and area.");
    if (kind === "contact" && !message) return show("err", "Please write a short message.");
    if (!form.consent.checked) return show("err", "Please tick the consent box so we can contact you.");
    if (!FORM_ENDPOINT) return show("err", "This form isn't connected yet, so nothing was saved. (Site owner: set FORM_ENDPOINT in assets/app.js.)");

    const interests = $$('.chip[aria-pressed="true"]', form).map(c => c.textContent.trim()).join(", ");
    const payload = { type: kind, name, phone: digits, car, area, interests, topic: d.get("topic") || "", message,
      source: document.referrer || "direct", submitted_at: new Date().toISOString() };

    const btn = $("button[type=submit]", form);
    btn.disabled = true;
    try {
      const headers = FORM_TYPE === "apps-script" ? { "Content-Type": "text/plain;charset=utf-8" } : { "Content-Type": "application/json", Accept: "application/json" };
      const res = await fetch(FORM_ENDPOINT, { method: "POST", headers, body: JSON.stringify(payload) });
      if (!res.ok) throw new Error("bad status " + res.status);
      if (FORM_TYPE === "apps-script") { const r = await res.json(); if (!r.ok) throw new Error("rejected: " + r.message); }
      form.reset();
      $$(".chip", form).forEach(c => c.setAttribute("aria-pressed", "false"));
      show("ok", kind === "contact" ? "Thanks. We'll get back to you soon." : "You're on the list. We'll contact you when we start in your area.");
    } catch (err) {
      show("err", "Something went wrong and your details were not saved. Please try again in a moment.");
    } finally { btn.disabled = false; }
  });
});
