/* ============================================================
   LONGBOARD — shared behavior · LB-FB 1.0 production build
   No frameworks, no WebGL, no canvas gating first paint.
   Everything degrades: without JS the site is fully readable.
   ============================================================ */
(function () {
  "use strict";
  var doc = document, root = doc.documentElement;
  root.classList.remove("no-js");
  var REDUCE = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (REDUCE) root.classList.add("reduce-motion");

  /* ---------- finish state (single source of truth: data-finish on <html>) ---------- */
  var FINISHES = ["cherry", "walnut", "fir", "slate"];
  var FINISH_NAMES = { cherry: "Light Cherry", walnut: "National Walnut", fir: "Dark Fir", slate: "Slate" };
  function getFinish() {
    try {
      var saved = localStorage.getItem("lb-finish");
      if (saved && FINISHES.indexOf(saved) !== -1) return saved;
    } catch (e) {}
    return "walnut";
  }
  function setFinish(key, opts) {
    if (FINISHES.indexOf(key) === -1) return;
    try { localStorage.setItem("lb-finish", key); } catch (e) {}
    root.setAttribute("data-finish", key);
    doc.querySelectorAll(".finish-btn[data-finish-key]").forEach(function (b) {
      b.setAttribute("aria-pressed", b.getAttribute("data-finish-key") === key ? "true" : "false");
    });
    doc.querySelectorAll("[data-active-finish-name]").forEach(function (el) {
      el.textContent = FINISH_NAMES[key];
    });
    if (!opts || !opts.silent) sublimate();
  }
  root.setAttribute("data-finish", getFinish());

  /* ---------- sublimation crossfade ----------
     For each .sublimate surface: clone the current material layer on top,
     let the new finish render underneath, fade the clone out (500ms).
     Pure DOM + CSS opacity — no canvas, nothing blocks paint.        */
  function sublimate() {
    if (REDUCE) return;
    doc.querySelectorAll(".sublimate").forEach(function (host) {
      var live = host.querySelector(".grain-live");
      if (!live) return;
      var old = live.cloneNode(true);
      old.classList.add("grain-layer");
      old.setAttribute("aria-hidden", "true");
      // freeze the clone's colors to the *previous* finish values
      var cs = getComputedStyle(live);
      old.style.background = cs.background;
      host.appendChild(old);
      requestAnimationFrame(function () {
        requestAnimationFrame(function () {
          old.classList.add("is-fading");
          setTimeout(function () { old.remove(); }, 600);
        });
      });
      var sweep = host.querySelector(".sweep");
      if (sweep) {
        sweep.classList.remove("is-on");
        void sweep.offsetWidth;
        sweep.classList.add("is-on");
      }
    });
  }

  /* ---------- reveal on scroll (one shared observer for the whole page) ---------- */
  function initReveal() {
    var els = Array.prototype.slice.call(doc.querySelectorAll("[data-reveal]"));
    if (!els.length) return;
    if (REDUCE || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("is-in"); });
      return;
    }
    els.forEach(function (el) {
      var n = 0, s = el.previousElementSibling;
      while (s) { if (s.hasAttribute && s.hasAttribute("data-reveal")) n++; s = s.previousElementSibling; }
      el.style.setProperty("--reveal-delay", Math.min(n * 90, 450) + "ms");
    });
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (e) {
        if (e.isIntersecting || e.boundingClientRect.top < 0) {
          e.target.classList.add("is-in");
          io.unobserve(e.target);
        }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -4% 0px" });
    els.forEach(function (el) { io.observe(el); });
    // safety: anything above the fold or missed by IO gets shown
    setTimeout(function () {
      els.forEach(function (el) {
        if (!el.classList.contains("is-in") && el.getBoundingClientRect().top < window.innerHeight) {
          el.classList.add("is-in");
        }
      });
    }, 900);
  }

  /* ---------- header: transparent over dark hero, solid past it ---------- */
  function initHeader() {
    var h = doc.querySelector(".site-header");
    if (!h) return;
    if (h.hasAttribute("data-header-solid")) { h.classList.add("is-solid"); return; }
    var was = null;
    function onScroll() {
      var on = window.scrollY > window.innerHeight * 0.72;
      if (on === was) return;
      was = on;
      h.classList.toggle("is-solid", on);
    }
    window.addEventListener("scroll", onScroll, { passive: true });
    onScroll();
  }

  /* ---------- mobile nav ---------- */
  function initMobileNav() {
    var toggle = doc.querySelector(".nav-toggle");
    var panel = doc.querySelector(".mobile-nav");
    if (!toggle || !panel) return;
    var close = panel.querySelector(".overlay-close");
    function set(open) {
      panel.classList.toggle("is-open", open);
      toggle.setAttribute("aria-expanded", open ? "true" : "false");
      doc.body.style.overflow = open ? "hidden" : "";
      if (open) (close || panel).focus();
    }
    toggle.addEventListener("click", function () { set(!panel.classList.contains("is-open")); });
    if (close) close.addEventListener("click", function () { set(false); toggle.focus(); });
    panel.addEventListener("keydown", function (e) { if (e.key === "Escape") { set(false); toggle.focus(); } });
    panel.querySelectorAll("a").forEach(function (a) { a.addEventListener("click", function () { set(false); }); });
  }

  /* ---------- index hover preview (pointer devices only) ---------- */
  function initIndexPreview() {
    doc.querySelectorAll("[data-index]").forEach(function (idx) {
      var prev = idx.querySelector(".index-preview");
      if (!prev || !window.matchMedia("(hover: hover)").matches) return;
      var raf = null, mx = 0, my = 0;
      idx.addEventListener("mousemove", function (e) {
        mx = e.clientX; my = e.clientY;
        if (raf) return;
        raf = requestAnimationFrame(function () {
          raf = null;
          var x = Math.min(mx + 28, window.innerWidth - 316);
          var y = Math.max(12, Math.min(my - 190, window.innerHeight - 392));
          prev.style.transform = "translate(" + x + "px, " + y + "px)";
        });
      });
      idx.addEventListener("mouseover", function (e) {
        var row = e.target.closest("[data-img]");
        if (row) {
          var src = row.getAttribute("data-img");
          if (prev.getAttribute("src") !== src) prev.setAttribute("src", src);
          prev.style.opacity = "1";
        } else {
          prev.style.opacity = "0";
        }
      });
      idx.addEventListener("mouseleave", function () { prev.style.opacity = "0"; });
    });
  }

  /* ---------- tabs (WAI-ARIA pattern) ---------- */
  function initTabs() {
    doc.querySelectorAll("[data-tabs]").forEach(function (widget) {
      var tabs = Array.prototype.slice.call(widget.querySelectorAll('[role="tab"]'));
      var panels = tabs.map(function (t) { return doc.getElementById(t.getAttribute("aria-controls")); });
      function select(i, focus) {
        tabs.forEach(function (t, j) {
          t.setAttribute("aria-selected", i === j ? "true" : "false");
          t.tabIndex = i === j ? 0 : -1;
          if (panels[j]) panels[j].hidden = i !== j;
        });
        if (focus) tabs[i].focus();
      }
      tabs.forEach(function (t, i) {
        t.addEventListener("click", function () { select(i); });
        t.addEventListener("keydown", function (e) {
          var n = null;
          if (e.key === "ArrowRight") n = (i + 1) % tabs.length;
          if (e.key === "ArrowLeft") n = (i - 1 + tabs.length) % tabs.length;
          if (e.key === "Home") n = 0;
          if (e.key === "End") n = tabs.length - 1;
          if (n !== null) { e.preventDefault(); select(n, true); }
        });
      });
    });
  }

  /* ---------- faceted filters (Finishes grid, Projects index) ----------
     Buttons: .chip[data-facet][data-value] inside [data-filterbar]
     Items:   [data-filter-item] with data-<facet>="a b c" attributes.
     One value active per facet ("all" clears); AND across facets.    */
  function initFilters() {
    doc.querySelectorAll("[data-filterbar]").forEach(function (bar) {
      var targetSel = bar.getAttribute("data-filterbar");
      var items = Array.prototype.slice.call(doc.querySelectorAll(targetSel + " [data-filter-item]"));
      var state = {};
      var count = doc.querySelector(bar.getAttribute("data-count") || "#none");
      function apply() {
        var shown = 0;
        items.forEach(function (it) {
          var ok = Object.keys(state).every(function (facet) {
            var want = state[facet];
            if (!want || want === "all") return true;
            var have = (it.getAttribute("data-" + facet) || "").split(/\s+/);
            return have.indexOf(want) !== -1;
          });
          it.classList.toggle("is-hidden", !ok);
          it.toggleAttribute("hidden", !ok);
          if (ok) shown++;
        });
        if (count) count.textContent = shown;
      }
      bar.querySelectorAll(".chip[data-facet]").forEach(function (chip) {
        chip.addEventListener("click", function () {
          var facet = chip.getAttribute("data-facet");
          var value = chip.getAttribute("data-value");
          var isToggle = chip.classList.contains("chip-toggle");
          var already = chip.getAttribute("aria-pressed") === "true";
          bar.querySelectorAll('.chip[data-facet="' + facet + '"]').forEach(function (c) {
            c.setAttribute("aria-pressed", "false");
          });
          if (isToggle && already) {
            state[facet] = null;
          } else if (already && value !== "all") {
            state[facet] = null;
            var all = bar.querySelector('.chip[data-facet="' + facet + '"][data-value="all"]');
            if (all) all.setAttribute("aria-pressed", "true");
          } else {
            chip.setAttribute("aria-pressed", "true");
            state[facet] = value;
          }
          apply();
        });
      });
      apply();
    });
  }

  /* ---------- content toggle (Gallery <-> Case Studies etc.) ---------- */
  function initViewToggle() {
    doc.querySelectorAll("[data-viewtoggle]").forEach(function (bar) {
      var btns = bar.querySelectorAll(".chip[data-view]");
      btns.forEach(function (btn) {
        btn.addEventListener("click", function () {
          btns.forEach(function (b) { b.setAttribute("aria-pressed", "false"); });
          btn.setAttribute("aria-pressed", "true");
          var view = btn.getAttribute("data-view");
          doc.querySelectorAll("[data-view-panel]").forEach(function (p) {
            p.hidden = p.getAttribute("data-view-panel") !== view;
          });
        });
      });
    });
  }

  /* ---------- finish detail overlay ---------- */
  function initOverlay() {
    var overlay = doc.querySelector("[data-overlay]");
    if (!overlay) return;
    var panel = overlay.querySelector(".overlay-panel");
    var lastFocus = null;
    function open(card) {
      lastFocus = card;
      overlay.querySelector("[data-ov-name]").textContent = card.getAttribute("data-name");
      overlay.querySelector("[data-ov-meta]").textContent = card.getAttribute("data-meta");
      overlay.querySelector("[data-ov-tags]").textContent = card.getAttribute("data-tags");
      var mono = overlay.querySelector("[data-ov-monograph]");
      if (mono) {
        var href = card.getAttribute("data-monograph");
        mono.hidden = !href;
        if (href) mono.setAttribute("href", href);
      }
      var sw = overlay.querySelector("[data-ov-swatch]");
      sw.className = "grain " + (card.getAttribute("data-grainclass") || "");
      sw.style.setProperty("--g1", card.getAttribute("data-g1"));
      sw.style.setProperty("--g2", card.getAttribute("data-g2"));
      overlay.classList.add("is-open");
      doc.body.style.overflow = "hidden";
      overlay.querySelector(".overlay-close").focus();
    }
    function close() {
      overlay.classList.remove("is-open");
      doc.body.style.overflow = "";
      if (lastFocus) lastFocus.focus();
    }
    doc.querySelectorAll(".finish-card[data-name]").forEach(function (card) {
      card.addEventListener("click", function () { open(card); });
    });
    overlay.querySelector(".overlay-close").addEventListener("click", close);
    overlay.addEventListener("click", function (e) { if (e.target === overlay) close(); });
    doc.addEventListener("keydown", function (e) {
      if (e.key === "Escape" && overlay.classList.contains("is-open")) close();
    });
    // rudimentary focus trap
    overlay.addEventListener("keydown", function (e) {
      if (e.key !== "Tab") return;
      var f = panel.querySelectorAll("a[href], button:not([disabled])");
      if (!f.length) return;
      var first = f[0], last = f[f.length - 1];
      if (e.shiftKey && doc.activeElement === first) { e.preventDefault(); last.focus(); }
      else if (!e.shiftKey && doc.activeElement === last) { e.preventDefault(); first.focus(); }
    });
  }

  /* ---------- HITCH spacing calculator ----------
     Published anchors (HITCH technical documentation, LB-CS 1.0):
     · up to 94% thermal efficiency at standard 32" x 48" spacing
     · effective R-values above R60 achievable
     · continuous insulation 1"-16"
     · up to 50% fewer clips than conventional continuous-girt systems
     The calculator computes geometry (clip count/density) exactly and
     reports published performance only at published conditions —
     non-standard spacings are flagged for project-specific analysis. */
  function initCalculator() {
    var form = doc.querySelector("[data-calc]");
    if (!form) return;
    var R_PER_INCH = { mineralwool: 4.2, polyiso: 6.0, eps: 3.85 };
    function fmt(n) { return n.toLocaleString("en-US"); }
    function run() {
      var w = parseFloat(form.querySelector("#calc-w").value);
      var h = parseFloat(form.querySelector("#calc-h").value);
      var sx = parseFloat(form.querySelector("#calc-sx").value);
      var sy = parseFloat(form.querySelector("#calc-sy").value);
      var ci = parseFloat(form.querySelector("#calc-ci").value);
      var ins = form.querySelector("#calc-ins").value;
      var out = doc.querySelector("[data-calc-out]");
      if (!(w > 0) || !(h > 0)) { out.hidden = true; return; }
      ci = Math.max(1, Math.min(16, ci || 4));
      form.querySelector("#calc-ci").value = ci;
      var area = w * h;
      var cols = Math.ceil((w * 12) / sx) + 1;
      var rows = Math.ceil((h * 12) / sy) + 1;
      var clips = cols * rows;
      var density = clips / area;
      var girtClips = Math.ceil(clips / 0.5);
      var rEff = ci * R_PER_INCH[ins];
      var standard = sx === 32 && sy === 48;
      doc.querySelector("#calc-clips").textContent = fmt(clips);
      doc.querySelector("#calc-density").textContent = density.toFixed(2);
      doc.querySelector("#calc-saved").textContent = fmt(Math.max(girtClips - clips, 0));
      doc.querySelector("#calc-r").textContent = "R-" + Math.round(rEff);
      doc.querySelector("#calc-eff").textContent = standard ? "94%" : "—";
      doc.querySelector("#calc-note").textContent = standard
        ? "Thermal efficiency at the published standard 32″ × 48″ spacing. Effective R-values above R60 are achievable per HITCH thermal modeling."
        : "Non-standard spacing — thermal efficiency requires project-specific analysis. Published value: up to 94% at 32″ × 48″. Talk to Design Assist.";
      out.hidden = false;
    }
    form.addEventListener("submit", function (e) { e.preventDefault(); run(); });
    form.addEventListener("change", run);
    run();
  }

  /* ---------- mailto form (zero-backend interim submit) ----------
     <form data-mailto-form data-subject="..."> — builds a mailto: from
     labeled fields. Swapped for a real endpoint when one exists. */
  function initMailtoForms() {
    doc.querySelectorAll("form[data-mailto-form]").forEach(function (form) {
      form.addEventListener("submit", function (e) {
        e.preventDefault();
        var lines = [];
        form.querySelectorAll("input, textarea, select").forEach(function (el) {
          var label = form.querySelector('label[for="' + el.id + '"]');
          lines.push((label ? label.textContent : el.name || el.id) + ": " + el.value);
        });
        var to = form.getAttribute("data-mailto") || "info@longboardproducts.com";
        var subject = form.getAttribute("data-subject") || "Website enquiry";
        window.location.href = "mailto:" + to + "?subject=" + encodeURIComponent(subject) + "&body=" + encodeURIComponent(lines.join("\n"));
      });
    });
  }

  /* ---------- lazy loading is native (loading="lazy" in markup) ---------- */

  /* ---------- boot ---------- */
  function boot() {
    doc.querySelectorAll(".finish-btn[data-finish-key]").forEach(function (b) {
      b.addEventListener("click", function () { setFinish(b.getAttribute("data-finish-key")); });
    });
    setFinish(getFinish(), { silent: true });
    initReveal();
    initHeader();
    initMobileNav();
    initIndexPreview();
    initTabs();
    initFilters();
    initViewToggle();
    initOverlay();
    initCalculator();
    initMailtoForms();
  }
  if (doc.readyState === "loading") doc.addEventListener("DOMContentLoaded", boot);
  else boot();
})();
