// Kaafila 2026 — shared site behaviour
// Depends on js/events-data.js being loaded first on pages that use it
// (category pages and the event detail page).

document.addEventListener("DOMContentLoaded", () => {
  renderCategoryPage();
  renderEventPage();
  renderDocumentPage();
  renderRegisterPage();
  renderTicketsPage();
  renderSchedulePage();
  initNav();
  initGallery();
  initContactForm();
  initReadMore();
  initScrollReveal();
  initWeaveRules();
});

/* Mobile nav toggle --------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector(".nav-toggle");
  const links = document.querySelector(".nav-links");
  if (!toggle || !links) return;

  toggle.addEventListener("click", () => {
    const isOpen = links.classList.toggle("is-open");
    toggle.setAttribute("aria-expanded", String(isOpen));
  });

  links.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      links.classList.remove("is-open");
      toggle.setAttribute("aria-expanded", "false");
    });
  });
}

/* -------------------------------------------------------------------------
   Register page — lists which events sit behind each of the two forms, and
   takes the form URLs from KAAFILA_REGISTRATION rather than hardcoding them,
   so the page and the event-page buttons can never point at different forms.
   ------------------------------------------------------------------------- */
function renderRegisterPage() {
  const lists = document.querySelectorAll("[data-register-list]");
  if (!lists.length || typeof KAAFILA_EVENTS === "undefined") return;

  lists.forEach((list) => {
    const wantCompetitive = list.dataset.registerList === "competitive";
    const events = KAAFILA_EVENTS.filter((e) => Boolean(e.competitive) === wantCompetitive);

    list.innerHTML = events
      .map((ev) => {
        const meta = KAAFILA_CATEGORIES[ev.category] || {};
        return `
        <li class="register-event" style="--thread: ${meta.thread || "var(--band-fg-dim)"}">
          <a href="event.html?id=${encodeURIComponent(ev.id)}">
            <span class="register-event-name">${ev.title}</span>
            ${ev.subtitle ? `<span class="register-event-sub">${ev.subtitle}</span>` : ""}
          </a>
        </li>`;
      })
      .join("");
  });

  if (typeof KAAFILA_REGISTRATION !== "undefined") {
    document.querySelectorAll("[data-register-link]").forEach((link) => {
      link.href =
        link.dataset.registerLink === "competitive"
          ? KAAFILA_REGISTRATION.competitive
          : KAAFILA_REGISTRATION.nonCompetitive;
    });
  }
}

/* -------------------------------------------------------------------------
   Ticketed events — gated on the school's admission-number format so the
   booking link is not simply sitting in the open.

   Worth being plain about what this is: the pattern lives in JavaScript the
   browser downloads, so it is a deterrent against outsiders and invented
   numbers, not a security control. Anyone who reads the source can construct a
   passing number, and anyone handed the booking URL can use it directly. A
   static site cannot do better; only the booking form itself, checking
   identity server-side, can actually restrict who gets in.
   ------------------------------------------------------------------------- */
function renderTicketsPage() {
  const gate = document.querySelector("[data-ticket-gate]");
  if (!gate || typeof KAAFILA_TICKETS === "undefined") return;

  const cfg = KAAFILA_TICKETS;
  const unlocked = document.querySelector("[data-ticket-unlocked]");
  const form = document.querySelector("[data-ticket-form]");
  const input = document.querySelector(".ticket-input");
  const status = document.querySelector("[data-ticket-status], #adm-status");
  const linkEl = document.querySelector("[data-ticket-link]");
  const linkNote = document.querySelector("[data-ticket-link-note]");
  const reset = document.querySelector("[data-ticket-reset]");
  const KEY = "kaafila-ticket-ok";

  const list = document.querySelector("[data-ticket-events]");
  if (list) {
    list.innerHTML = cfg.events.map((e) => `
      <div class="ticket-card">
        <h2 class="ticket-card-name">${e.name}</h2>
        <p class="ticket-card-when">${e.when}</p>
        <p class="ticket-card-blurb">${e.blurb}</p>
      </div>`).join("");
  }

  // The number has to be entered exactly as printed on the card — uppercase,
  // slashes. Only surrounding whitespace is forgiven, since that comes from
  // pasting rather than from the person mistyping.
  function normalise(raw) {
    return String(raw).trim();
  }

  function check(raw) {
    const value = normalise(raw);
    if (!value) return { ok: false, msg: "Enter your admission number to continue." };
    const m = cfg.admissionPattern.exec(value);
    // Every rejection gives the same message. Saying *why* a number failed
    // would hand someone probing the field a way to converge on the format.
    const REJECT = "That admission number wasn't recognised. Check it against your school ID card and try again.";
    if (!m) return { ok: false, msg: REJECT };
    // The campus letter does the real work: N is Noida, G is Gurgaon. A
    // Gurgaon number is genuine but belongs to another campus, so it is turned
    // away with the same message as anything else — the field never confirms
    // which part of a number was wrong.
    if (m[1] !== cfg.campus) return { ok: false, msg: REJECT };
    if (/^0+$/.test(m[3])) return { ok: false, msg: REJECT };
    return { ok: true };
  }

  function showUnlocked() {
    gate.hidden = true;
    if (!unlocked) return;
    unlocked.hidden = false;
    if (cfg.ticketLink) {
      if (linkEl) { linkEl.href = cfg.ticketLink; linkEl.hidden = false; }
      if (linkNote) linkNote.textContent = "Tickets are booked on the page below.";
    } else {
      if (linkEl) linkEl.hidden = true;
      if (linkNote) linkNote.textContent = "The booking page isn't open yet — it will appear here as soon as it goes live. Check back closer to the festival.";
    }
  }

  if (sessionStorage.getItem(KEY) === "1") showUnlocked();

  if (form) {
    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const res = check(input ? input.value : "");
      if (res.ok) {
        try { sessionStorage.setItem(KEY, "1"); } catch (_) {}
        if (status) status.hidden = true;
        showUnlocked();
      } else if (status) {
        status.hidden = false;
        status.textContent = res.msg;
        status.classList.add("is-error");
        if (input) input.focus();
      }
    });
  }

  if (reset) {
    reset.addEventListener("click", () => {
      try { sessionStorage.removeItem(KEY); } catch (_) {}
      if (unlocked) unlocked.hidden = true;
      gate.hidden = false;
      if (input) { input.value = ""; input.focus(); }
      if (status) status.hidden = true;
    });
  }
}

/* -------------------------------------------------------------------------
   Gallery — renders KAAFILA_GALLERY into the grid and opens photos in a
   lightbox. One undivided set, no category filters. With no photos in the
   data file the grid stays empty and the
   "coming soon" note shows instead, so the page is presentable before the
   festival and needs no edit once photos land.
   ------------------------------------------------------------------------- */
function initGallery() {
  const grid = document.querySelector(".gallery-grid");
  if (!grid || typeof KAAFILA_GALLERY === "undefined") return;

  const emptyState = document.querySelector("[data-empty-state]");
  const photos = KAAFILA_GALLERY;

  // Leave the "photos coming soon" note showing and render nothing.
  if (!photos.length) return;

  if (emptyState) emptyState.hidden = true;

  grid.innerHTML = photos
    .map(
      (photo, i) => `
      <button class="gallery-tile" type="button" data-photo-index="${i}">
        <img src="${photo.src}" alt="${escapeAttr(photo.alt || photo.caption || "")}" loading="lazy">
      </button>`
    )
    .join("");

  initLightbox(photos);
}

function escapeHtml(s) {
  return String(s).replace(/[&<>]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;" }[c]));
}
function escapeAttr(s) {
  return escapeHtml(s).replace(/"/g, "&quot;");
}

function initLightbox(photos) {
  const box = document.createElement("div");
  box.className = "lightbox";
  box.hidden = true;
  box.innerHTML = `
    <div class="lightbox-backdrop" data-lightbox-close></div>
    <div class="lightbox-panel" role="dialog" aria-modal="true" aria-label="Photo viewer">
      <button class="lightbox-btn lightbox-close" type="button" data-lightbox-close aria-label="Close">&times;</button>
      <button class="lightbox-btn lightbox-prev" type="button" data-lightbox-step="-1" aria-label="Previous photo">&#8249;</button>
      <figure class="lightbox-figure">
        <img data-lightbox-img alt="">
        <figcaption data-lightbox-caption></figcaption>
      </figure>
      <button class="lightbox-btn lightbox-next" type="button" data-lightbox-step="1" aria-label="Next photo">&#8250;</button>
    </div>`;
  document.body.appendChild(box);

  const imgEl = box.querySelector("[data-lightbox-img]");
  const capEl = box.querySelector("[data-lightbox-caption]");
  let index = 0;
  let lastFocused = null;

  function show(i) {
    // Every photo is on the page now that there are no filters, so next/prev
    // just walks the full list and wraps at either end.
    index = ((i % photos.length) + photos.length) % photos.length;
    const photo = photos[index];
    imgEl.src = photo.src;
    imgEl.alt = photo.alt || photo.caption || "";
    capEl.textContent = photo.caption || "";
  }

  function step(delta) {
    show(index + delta);
  }

  function open(i) {
    lastFocused = document.activeElement;
    show(i);
    box.hidden = false;
    document.body.style.overflow = "hidden";
    box.querySelector(".lightbox-close").focus();
  }

  function close() {
    box.hidden = true;
    document.body.style.overflow = "";
    if (lastFocused) lastFocused.focus();
  }

  document.querySelectorAll(".gallery-tile").forEach((tile) => {
    tile.addEventListener("click", () => open(Number(tile.dataset.photoIndex)));
  });

  box.addEventListener("click", (e) => {
    if (e.target.closest("[data-lightbox-close]")) close();
    const stepBtn = e.target.closest("[data-lightbox-step]");
    if (stepBtn) step(Number(stepBtn.dataset.lightboxStep));
  });

  document.addEventListener("keydown", (e) => {
    if (box.hidden) return;
    if (e.key === "Escape") close();
    if (e.key === "ArrowLeft") step(-1);
    if (e.key === "ArrowRight") step(1);
  });
}

/* Contact form ----------------------------------------------------------- */
function initContactForm() {
  const form = document.querySelector("[data-contact-form]");
  if (!form) return;
  const status = form.querySelector(".form-status");

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!form.checkValidity()) {
      form.reportValidity();
      return;
    }
    status.hidden = false;
    status.textContent =
      "This form isn't connected to a mail server yet — for now, please email kaafila.noida@sns.edu.in directly. (To activate this form, connect it to Formspree, Google Forms, or the school's mail service.)";
    form.reset();
  });
}

/* Home: "Read More" theme expander --------------------------------------- */
function initReadMore() {
  const btn = document.querySelector("[data-read-more]");
  const panel = document.querySelector("[data-read-more-panel]");
  if (!btn || !panel) return;

  btn.addEventListener("click", () => {
    const isOpen = panel.classList.toggle("is-open");
    btn.setAttribute("aria-expanded", String(isOpen));
    btn.textContent = isOpen ? "Read Less" : "Read More";
  });
}

/* -------------------------------------------------------------------------
   Woven poster placeholder — reused for gallery-style tiles, poster cards,
   and the full event poster until real artwork is uploaded.
   ------------------------------------------------------------------------- */
// Until real artwork exists, an event's poster slot shows a woven swatch in
// that category's thread colour: warp and weft crossing over and under in a
// basket weave. It is the Taana Baana motif stated literally, and it gives an
// empty slot a reason to be there rather than reading as a missing image.
function posterPlaceholderSVG(hexColor) {
  const CELL = 16;          // one over/under repeat
  const BAND = 6;           // thread thickness — kept well under CELL so the
                            // ground shows through and it reads as cloth
  const W = 200, H = 150;
  const pad = (CELL - BAND) / 2;
  let weave = "";

  for (let row = 0, y = 0; y < H; y += CELL, row++) {
    for (let col = 0, x = 0; x < W; x += CELL, col++) {
      // Checkerboard decides which thread passes over at this crossing.
      const warpOver = (row + col) % 2 === 0;
      const warp = `<rect x="${x + pad}" y="${y}" width="${BAND}" height="${CELL}" fill="${hexColor}" opacity="${warpOver ? 0.2 : 0.1}"/>`;
      const weft = `<rect x="${x}" y="${y + pad}" width="${CELL}" height="${BAND}" fill="${hexColor}" opacity="${warpOver ? 0.1 : 0.2}"/>`;
      weave += warpOver ? weft + warp : warp + weft;
    }
  }

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="Poster coming soon">
      <rect width="${W}" height="${H}" fill="var(--band-surface)"/>
      ${weave}
    </svg>`;
}

// Real artwork when the event has it, the woven swatch when it doesn't, so
// the two can mix in one grid while posters are still being made.
function posterArt(ev, threadColor) {
  return ev.poster
    ? `<img class="poster-img" src="${ev.poster}" alt="${escapeAttr(ev.title)} poster" loading="lazy">`
    : posterPlaceholderSVG(threadColor);
}

/* -------------------------------------------------------------------------
   Category page — renders poster grid for document.body.dataset.category
   ------------------------------------------------------------------------- */
function renderCategoryPage() {
  const category = document.body.dataset.category;
  if (!category || typeof KAAFILA_EVENTS === "undefined") return;

  const meta = KAAFILA_CATEGORIES[category];
  if (!meta) return;

  document.documentElement.style.setProperty("--thread-current", meta.thread);
  document.title = `${meta.label} | Kaafila 2026 — Shiv Nadar School`;

  // The brochure gives each discipline a themed name (Strings Attached,
  // Rhythmic Ringers, Iridescence, Bread & Circuses), and that is what the
  // page leads with. The plain discipline name sits above it as the small
  // label, so the page still announces which section of the nav you are in.
  const titleEl = document.querySelector("[data-category-title]");
  const eyebrowEl = document.querySelector("[data-category-eyebrow]");
  const taglineEl = document.querySelector("[data-category-tagline]");
  if (titleEl) titleEl.textContent = (meta.themed || meta.label).toUpperCase();
  if (eyebrowEl) eyebrowEl.textContent = meta.label;
  if (taglineEl) taglineEl.textContent = meta.tagline;

  const grid = document.querySelector("[data-poster-grid]");
  const emptyState = document.querySelector("[data-category-empty]");
  if (!grid) return;

  const events = KAAFILA_EVENTS.filter((ev) => ev.category === category);

  if (events.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  grid.innerHTML = events
    .map(
      (ev) => `
      <a class="poster-card" href="event.html?id=${encodeURIComponent(ev.id)}">
        <span class="poster-art${ev.poster ? " has-photo" : ""}">${posterArt(ev, meta.thread)}</span>
        <span class="poster-info">
          <span class="poster-title">${ev.title}</span>
          ${ev.subtitle ? `<span class="poster-subtitle">${ev.subtitle}</span>` : ""}
        </span>
      </a>`
    )
    .join("");
}

/* -------------------------------------------------------------------------
   Event detail page — renders from ?id= query param
   ------------------------------------------------------------------------- */
function renderEventPage() {
  const root = document.querySelector("[data-event-page]");
  if (!root || typeof KAAFILA_EVENTS === "undefined") return;

  const id = new URLSearchParams(window.location.search).get("id");
  const event = KAAFILA_EVENTS.find((ev) => ev.id === id);
  const notFound = document.querySelector("[data-event-not-found]");
  const content = document.querySelector("[data-event-content]");

  if (!event) {
    if (content) content.hidden = true;
    if (notFound) notFound.hidden = false;
    return;
  }

  const meta = KAAFILA_CATEGORIES[event.category];
  document.documentElement.style.setProperty("--thread-current", meta.thread);
  document.title = `${event.title} | Kaafila 2026 — Shiv Nadar School`;

  const backLink = document.querySelector("[data-event-back]");
  if (backLink) {
    backLink.href = meta.page;
    backLink.textContent = `← Back to ${meta.label}`;
  }

  const titleEl = document.querySelector("[data-event-title]");
  if (titleEl) titleEl.textContent = event.title;

  const subtitleEl = document.querySelector("[data-event-subtitle]");
  if (subtitleEl) {
    subtitleEl.textContent = event.subtitle || "";
    subtitleEl.hidden = !event.subtitle;
  }

  const posterEl = document.querySelector("[data-event-poster]");
  if (posterEl) {
    posterEl.classList.toggle("has-photo", Boolean(event.poster));
    posterEl.innerHTML = posterArt(event, meta.thread);
  }

  const dateEl = document.querySelector("[data-event-date]");
  if (dateEl) dateEl.textContent = event.date;

  const venueEl = document.querySelector("[data-event-venue]");
  if (venueEl) venueEl.textContent = event.venue || "TBA";

  // The Concept Note / Guidelines cards are plain links through to
  // document.html, so they behave like any other link — middle-click,
  // open-in-new-tab and browser Back all work.
  document.querySelectorAll("[data-doc-link]").forEach((link) => {
    link.href = `document.html?event=${encodeURIComponent(event.id)}&doc=${link.dataset.docLink}`;
  });

  // Registration is per-brochure, not per-event: the event's `competitive`
  // flag picks which of the two shared forms to send people to.
  const registerLink = document.querySelector("[data-event-register]");
  if (registerLink && typeof KAAFILA_REGISTRATION !== "undefined") {
    const isCompetitive = Boolean(event.competitive);
    registerLink.href = isCompetitive
      ? KAAFILA_REGISTRATION.competitive
      : KAAFILA_REGISTRATION.nonCompetitive;
    registerLink.setAttribute(
      "aria-label",
      `Register for ${event.title} (${isCompetitive ? "competitive" : "non-competitive"} events form)`
    );
    const kindEl = document.querySelector("[data-event-register-kind]");
    if (kindEl) {
      kindEl.textContent = isCompetitive ? "Competitive event" : "Non-competitive event";
    }
  }
}

function renderPageImages(container, srcs, altPrefix) {
  container.innerHTML = "";
  srcs.forEach((src, i) => {
    const img = document.createElement("img");
    img.src = src;
    img.alt = srcs.length > 1 ? `${altPrefix}, page ${i + 1}` : altPrefix;
    img.loading = "lazy";
    container.appendChild(img);
  });
}

/* -------------------------------------------------------------------------
   Document page — renders one event's concept note or guidelines as full
   page images on its own URL (document.html?event=<id>&doc=concept|guidelines),
   so each document is linkable and shareable rather than hidden behind an
   in-page toggle.
   ------------------------------------------------------------------------- */
function renderDocumentPage() {
  const page = document.querySelector("[data-document-page]");
  if (!page || typeof KAAFILA_EVENTS === "undefined") return;

  const params = new URLSearchParams(window.location.search);
  const kind = params.get("doc") === "guidelines" ? "guidelines" : "concept";
  const event = KAAFILA_EVENTS.find((e) => e.id === params.get("event"));

  const content = page.querySelector("[data-document-content]");
  const notFound = page.querySelector("[data-document-not-found]");

  if (!event) {
    if (content) content.hidden = true;
    if (notFound) notFound.hidden = false;
    return;
  }

  const meta = KAAFILA_CATEGORIES[event.category];
  document.documentElement.style.setProperty("--thread-current", meta.thread);

  const label = kind === "guidelines" ? "Guidelines" : "Concept Note";
  document.title = `${event.title} — ${label} | Kaafila 2026`;

  const kindEl = page.querySelector("[data-document-kind]");
  if (kindEl) kindEl.textContent = label;

  const titleEl = page.querySelector("[data-document-title]");
  if (titleEl) titleEl.textContent = event.title;

  const back = page.querySelector("[data-document-back]");
  if (back) {
    back.href = `event.html?id=${encodeURIComponent(event.id)}`;
    back.textContent = `← Back to ${event.title}`;
  }

  const imagesEl = page.querySelector("[data-document-images]");
  if (imagesEl) {
    const srcs =
      kind === "guidelines"
        ? Array.from(
            { length: event.guidelinesPageCount || 1 },
            (_, i) => `img/guidelines/${event.id}-${i + 1}.jpg`
          )
        : [`img/concept-notes/${event.id}.jpg`];
    renderPageImages(imagesEl, srcs, `${event.title} ${label.toLowerCase()}`);
  }

  const pdf = page.querySelector("[data-document-pdf]");
  if (pdf) {
    const href = kind === "guidelines" ? event.guidelinesPdf : null;
    pdf.hidden = !href;
    if (href) pdf.href = href;
  }
}

/* -------------------------------------------------------------------------
   Schedule page — renders KAAFILA_SCHEDULE, day by day. Items with an
   eventId link through to that event's detail page and show its category
   tag; items without one are general festival happenings shown as plain
   rows (ceremonies, food festivals, etc.).
   ------------------------------------------------------------------------- */
function renderSchedulePage() {
  const list = document.querySelector("[data-schedule-list]");
  if (!list || typeof KAAFILA_SCHEDULE === "undefined") return;

  const emptyState = document.querySelector("[data-schedule-empty]");
  if (KAAFILA_SCHEDULE.length === 0) {
    if (emptyState) emptyState.hidden = false;
    return;
  }

  list.innerHTML = KAAFILA_SCHEDULE
    .map((day) => {
      const rows = day.items
        .map((item) => {
          const event = item.eventId
            ? KAAFILA_EVENTS.find((ev) => ev.id === item.eventId)
            : null;
          const meta = event ? KAAFILA_CATEGORIES[event.category] : null;

          const titleHtml = event
            ? `<a class="event-btn" href="event.html?id=${encodeURIComponent(event.id)}">${item.title}</a>`
            : `<span class="event-btn event-btn-plain">${item.title}</span>`;

          const tagHtml = meta
            ? `<span class="tag" data-cat="${event.category}">${meta.label}</span>`
            : "";

          return `
          <div class="event-row">
            <span class="event-time">${item.time}</span>
            <span class="event-main">
              ${titleHtml}
              ${item.venue ? `<span class="event-venue">${item.venue}</span>` : ""}
              ${item.note ? `<span class="event-note">${item.note}</span>` : ""}
            </span>
            ${tagHtml}
          </div>`;
        })
        .join("");

      return `
      <div class="schedule-day">
        <div class="schedule-day-head">
          <span>${day.day}</span>
          <hr class="weft">
        </div>
        ${day.note ? `<p class="schedule-day-note">${day.note}</p>` : ""}
        ${rows}
      </div>`;
    })
    .join("");
}

/* -------------------------------------------------------------------------
   Weave rule — four strands, in the four category colours, that draw
   themselves left to right and cross over one another as they go: taana and
   baana meeting. It plays once when the section scrolls into view and then
   stops. It does not loop, and there is one per section at most — the earlier
   always-moving thread decoration read as clutter.
   ------------------------------------------------------------------------- */
function initWeaveRules() {
  const holders = document.querySelectorAll("[data-weave]");
  if (!holders.length) return;

  const W = 1200, H = 52, MID = H / 2;
  const THREADS = [
    { c: "var(--thread-music)",   amp: 13, phase: 0.0 },
    { c: "var(--thread-dance)",   amp: -13, phase: 0.5 },
    { c: "var(--thread-visual)",  amp:  7, phase: 1.1 },
    { c: "var(--thread-theatre)", amp: -7, phase: 1.6 },
  ];

  // three full over/under crossings across the span, so the weave reads as a
  // weave rather than a single lazy wave now that it travels the whole width
  const path = (amp, phase) => {
    let d = `M 0 ${MID + amp * Math.sin(phase)}`;
    for (let x = 20; x <= W; x += 20) {
      d += ` L ${x} ${(MID + amp * Math.sin(phase + (x / W) * Math.PI * 6)).toFixed(1)}`;
    }
    return d;
  };

  holders.forEach((el) => {
    if (el.dataset.weaveReady) return;
    el.dataset.weaveReady = "true";
    el.innerHTML = `
      <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" aria-hidden="true" focusable="false">
        ${THREADS.map((t, i) => `<path d="${path(t.amp, t.phase)}" stroke="${t.c}" style="--i:${i}"/>`).join("")}
      </svg>`;
  });

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion || !("IntersectionObserver" in window)) {
    holders.forEach((el) => el.classList.add("is-woven"));   // show it, just don't animate
    return;
  }

  const obs = new IntersectionObserver(
    (entries) => entries.forEach((e) => {
      if (e.isIntersecting) { e.target.classList.add("is-woven"); obs.unobserve(e.target); }
    }),
    { threshold: 0.4 }
  );
  holders.forEach((el) => obs.observe(el));
}

/* -------------------------------------------------------------------------
   Scroll reveal — progressive enhancement, respects prefers-reduced-motion.
   Grid children (category cards, poster cards, gallery tiles) fade + rise
   in with a small stagger as they enter the viewport. If JS or
   IntersectionObserver is unavailable, content simply stays visible —
   .reveal-pending is only ever added here, never present by default.
   ------------------------------------------------------------------------- */
function initScrollReveal() {
  const reduceMotion = window.matchMedia(
    "(prefers-reduced-motion: reduce)"
  ).matches;
  if (reduceMotion || !("IntersectionObserver" in window)) return;

  document.querySelectorAll("[data-reveal-group]").forEach((group) => {
    [...group.children].forEach((item, i) => {
      item.classList.add("reveal-pending");
      item.style.transitionDelay = `${Math.min(i, 6) * 40}ms`;
    });
  });

  const targets = document.querySelectorAll(".reveal-pending");
  if (!targets.length) return;

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("reveal-visible");
          observer.unobserve(entry.target);
        }
      });
    },
    { threshold: 0.15, rootMargin: "0px 0px -60px 0px" }
  );

  targets.forEach((el) => observer.observe(el));
}
