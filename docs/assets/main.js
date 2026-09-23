/* Porta Blu — site behavior. No dependencies. */
(() => {
  "use strict";

  const TZ = "America/Los_Angeles";
  const PHONE = "(503) 555-0143";
  const TEL = "tel:+15035550143";

  // Opening hours in minutes after midnight. Sunday = 0.
  const HOURS = {
    0: [720, 1260],
    1: [690, 1290],
    2: [690, 1290],
    3: [690, 1290],
    4: [690, 1290],
    5: [690, 1350],
    6: [690, 1350],
  };
  const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

  /* ---------- Time helpers (always in the restaurant's time zone) ---------- */

  function portlandNow() {
    const parts = {};
    new Intl.DateTimeFormat("en-US", {
      timeZone: TZ,
      weekday: "short",
      year: "numeric",
      month: "numeric",
      day: "numeric",
      hour: "numeric",
      minute: "numeric",
      hourCycle: "h23",
    })
      .formatToParts(new Date())
      .forEach((p) => (parts[p.type] = p.value));
    return {
      day: WEEKDAYS.indexOf(parts.weekday),
      minutes: (Number(parts.hour) % 24) * 60 + Number(parts.minute),
      y: Number(parts.year),
      m: Number(parts.month),
      d: Number(parts.day),
    };
  }

  function fmtTime(min) {
    let h = Math.floor(min / 60) % 24;
    const m = min % 60;
    const ap = h >= 12 ? "pm" : "am";
    h = h % 12 || 12;
    return m ? `${h}:${String(m).padStart(2, "0")} ${ap}` : `${h} ${ap}`;
  }

  // A calendar date (no time) as a UTC-noon Date so DST never shifts the day.
  function calendarDate(offsetDays = 0) {
    const n = portlandNow();
    return new Date(Date.UTC(n.y, n.m - 1, n.d + offsetDays, 12));
  }
  const isoDate = (d) => d.toISOString().slice(0, 10);
  function prettyDate(iso, opts = { weekday: "long", month: "long", day: "numeric" }) {
    const [y, m, d] = iso.split("-").map(Number);
    return new Date(Date.UTC(y, m - 1, d, 12)).toLocaleDateString("en-US", { ...opts, timeZone: "UTC" });
  }

  /* ---------- Live open / closed status ---------- */

  function currentStatus() {
    const { day, minutes } = portlandNow();
    const [open, close] = HOURS[day];
    if (minutes >= open && minutes < close) {
      return {
        open: true,
        label: close - minutes <= 45 ? "Closing soon" : "Open now",
        detail: `until ${fmtTime(close)}`,
      };
    }
    if (minutes < open) return { open: false, label: "Closed", detail: `opens today at ${fmtTime(open)}` };
    const next = HOURS[(day + 1) % 7][0];
    return { open: false, label: "Closed", detail: `opens tomorrow at ${fmtTime(next)}` };
  }

  function renderStatus() {
    const s = currentStatus();
    document.querySelectorAll("[data-status]").forEach((el) => {
      el.innerHTML =
        `<span class="dot ${s.open ? "is-open" : "is-closed"}" aria-hidden="true"></span>` +
        `<strong>${s.label}</strong> · ${s.detail}`;
    });

    const today = portlandNow().day;
    document.querySelectorAll("[data-hours] tr[data-day]").forEach((row) => {
      const isToday = Number(row.dataset.day) === today;
      row.classList.toggle("is-today", isToday);
      const th = row.querySelector("th");
      const pill = th.querySelector(".today-pill");
      if (isToday && !pill) th.insertAdjacentHTML("beforeend", '<span class="today-pill">Today</span>');
      if (!isToday && pill) pill.remove();
    });
  }
  renderStatus();
  setInterval(renderStatus, 60 * 1000);

  /* ---------- Header: scrolled state + mobile menu ---------- */

  const header = document.querySelector(".site-header");
  const toggle = document.querySelector(".nav-toggle");

  const onScroll = () => header && header.classList.toggle("is-scrolled", window.scrollY > 4);
  onScroll();
  window.addEventListener("scroll", onScroll, { passive: true });

  function setNav(open) {
    if (!header || !toggle) return;
    header.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-expanded", String(open));
    toggle.setAttribute("aria-label", open ? "Close menu" : "Open menu");
  }
  toggle?.addEventListener("click", () => setNav(!header.classList.contains("nav-open")));
  header?.querySelectorAll(".nav a").forEach((a) => a.addEventListener("click", () => setNav(false)));
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && header?.classList.contains("nav-open")) {
      setNav(false);
      toggle.focus();
    }
  });
  document.addEventListener("click", (e) => {
    if (header?.classList.contains("nav-open") && !header.contains(e.target)) setNav(false);
  });

  /* ---------- Demo links → toast ---------- */

  const toast = document.querySelector(".toast");
  let toastTimer;
  function showToast(html) {
    if (!toast) return;
    toast.innerHTML = html;
    toast.classList.add("is-visible");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toast.classList.remove("is-visible"), 5200);
  }
  document.addEventListener("click", (e) => {
    const link = e.target.closest("[data-demo]");
    if (!link) return;
    e.preventDefault();
    showToast(`<strong>Demo link.</strong> ${link.dataset.demo}`);
  });

  /* ---------- Hide the mobile bar while typing ---------- */

  const isField = (el) => el && el.matches && el.matches("input:not([type=radio]):not([type=checkbox]), select, textarea");
  document.addEventListener("focusin", (e) => isField(e.target) && document.body.classList.add("is-typing"));
  document.addEventListener("focusout", (e) => isField(e.target) && document.body.classList.remove("is-typing"));

  /* ---------- Reservation finder ---------- */

  const resForm = document.getElementById("reserve-form");
  if (resForm) {
    const partySel = resForm.querySelector("#res-party");
    const dateSel = resForm.querySelector("#res-date");
    const timeSel = resForm.querySelector("#res-time");
    const results = document.getElementById("reserve-results");

    dateSel.innerHTML = "";
    for (let i = 0; i < 30; i++) {
      const d = calendarDate(i);
      const short = d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
      const label =
        i === 0 ? `Today, ${short}` :
        i === 1 ? `Tomorrow, ${short}` :
        d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
      const opt = new Option(label, String(i));
      opt.dataset.dow = String(d.getUTCDay());
      opt.dataset.long = d.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", timeZone: "UTC" });
      dateSel.add(opt);
    }

    function fillTimes() {
      const dow = Number(dateSel.selectedOptions[0].dataset.dow);
      const [open, close] = HOURS[dow];
      const wanted = Number(timeSel.value) || 1140;
      timeSel.innerHTML = "";
      for (let t = open + 30; t <= close - 60; t += 30) timeSel.add(new Option(fmtTime(t), String(t)));
      const options = [...timeSel.options].map((o) => Number(o.value));
      const closest = options.reduce((a, b) => (Math.abs(b - wanted) < Math.abs(a - wanted) ? b : a), options[0]);
      timeSel.value = String(closest);
    }
    fillTimes();
    dateSel.addEventListener("change", () => {
      fillTimes();
      results.innerHTML = "";
    });
    [partySel, timeSel].forEach((el) => el.addEventListener("change", () => (results.innerHTML = "")));

    // Stable pseudo-random "already booked" pattern so results feel real but repeatable.
    const booked = (seed) => ((seed * 9301 + 49297) % 233280) / 233280 < 0.34;

    resForm.addEventListener("submit", (e) => {
      e.preventDefault();
      const party = Number(partySel.value);
      if (party >= 7) {
        results.innerHTML =
          `<p class="reserve-note">For 7 or more we set the long table and plan a family-style menu together. ` +
          `Call us at <a href="${TEL}">${PHONE}</a> or <a href="catering.html#quote">send the details</a>.</p>`;
        return;
      }
      const dayIndex = Number(dateSel.value);
      const opt = dateSel.selectedOptions[0];
      const [open, close] = HOURS[Number(opt.dataset.dow)];
      const wanted = Number(timeSel.value);
      const nowMin = dayIndex === 0 ? portlandNow().minutes + 30 : -1;

      const slots = [-45, -30, -15, 0, 15, 30, 45]
        .map((x) => wanted + x)
        .filter((t) => t >= open + 15 && t <= close - 45 && t > nowMin)
        .filter((t) => !booked(dayIndex * 97 + t + party * 13));

      const when = dayIndex === 0 ? "tonight" : `on ${opt.dataset.long}`;
      const guests = `${party} ${party === 1 ? "guest" : "guests"}`;

      if (!slots.length) {
        results.innerHTML =
          `<p class="reserve-note">We’re fully booked around ${fmtTime(wanted)} ${when}. ` +
          `Try another time, or walk in: the bar and patio are always first come, first served.</p>`;
        return;
      }

      results.innerHTML =
        `<p class="reserve-summary">Tables for ${guests} ${when} <span>· tap a time to book</span></p>` +
        `<div class="slots">${slots.map((t) => `<button type="button" class="slot" data-t="${t}">${fmtTime(t)}</button>`).join("")}</div>`;

      results.querySelectorAll(".slot").forEach((btn) =>
        btn.addEventListener("click", () => {
          const t = Number(btn.dataset.t);
          results.innerHTML =
            `<div class="reserve-confirm">` +
            `<span class="check"><svg class="icon" aria-hidden="true"><use href="#i-check"/></svg></span>` +
            `<div><p class="confirm-title">Table for ${guests} · ${opt.dataset.long} at ${fmtTime(t)}</p>` +
            `<p>Demo site: on the live version, this step confirms through the restaurant’s booking system (Resy, OpenTable or Tock) and texts the guest a reminder.</p>` +
            `<button type="button" class="text-btn" data-res-reset>Pick a different time</button></div></div>`;
          results.querySelector("[data-res-reset]").addEventListener("click", () => resForm.requestSubmit());
        })
      );
    });
  }

  /* ---------- Forms: inline validation + success state ---------- */

  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

  document.querySelectorAll("form[data-validate]").forEach((form) => {
    const success = document.querySelector(form.dataset.success);
    const fields = [...form.querySelectorAll("[data-rule]")];
    const minEventDate = isoDate(calendarDate(2));

    form.querySelectorAll('[data-rule="event-date"]').forEach((input) => (input.min = minEventDate));

    function check(field) {
      const value = field.value.trim();
      const rule = field.dataset.rule;
      let msg = "";
      if (!value) msg = field.dataset.msg || "Please fill this in.";
      else if (rule === "email" && !EMAIL.test(value)) msg = "That email looks incomplete. Try something like name@example.com.";
      else if (rule === "event-date" && value < minEventDate)
        msg = `We need 48 hours’ notice. Pick ${prettyDate(minEventDate, { weekday: "long", month: "short", day: "numeric" })} or later, or call us for a rush order.`;

      const wrap = field.closest(".field");
      const err = wrap && wrap.querySelector(".error");
      wrap && wrap.classList.toggle("has-error", Boolean(msg));
      field.setAttribute("aria-invalid", msg ? "true" : "false");
      if (err) err.textContent = msg;
      return !msg;
    }

    fields.forEach((f) => {
      f.addEventListener("blur", () => f.value.trim() && check(f));
      f.addEventListener("input", () => f.closest(".field")?.classList.contains("has-error") && check(f));
      f.addEventListener("change", () => f.closest(".field")?.classList.contains("has-error") && check(f));
    });

    form.addEventListener("submit", (e) => {
      e.preventDefault();
      const invalid = fields.filter((f) => !check(f));
      if (invalid.length) {
        invalid[0].focus();
        return;
      }
      if (success) {
        const data = new FormData(form);
        const fill = {
          firstname: String(data.get("name") || "").trim().split(/\s+/)[0] || "friend",
          email: String(data.get("email") || "").trim(),
          guests: String(data.get("guests") || ""),
          date: data.get("date") ? prettyDate(String(data.get("date"))) : "",
        };
        success.querySelectorAll("[data-fill]").forEach((el) => (el.textContent = fill[el.dataset.fill] || ""));
        form.hidden = true;
        success.hidden = false;
        success.focus();
      }
    });

    success?.querySelector("[data-reset-form]")?.addEventListener("click", () => {
      form.reset();
      fields.forEach((f) => {
        f.closest(".field")?.classList.remove("has-error");
        f.removeAttribute("aria-invalid");
      });
      success.hidden = true;
      form.hidden = false;
      form.querySelector("input, select, textarea")?.focus();
    });
  });

  /* ---------- Menu page: section tabs follow the scroll ---------- */

  const tabStrip = document.querySelector(".menu-tabs-strip");
  if (tabStrip && "IntersectionObserver" in window) {
    const links = [...tabStrip.querySelectorAll("a")];
    const byId = new Map(links.map((a) => [a.getAttribute("href").slice(1), a]));

    function setActive(id) {
      const link = byId.get(id);
      if (!link || link.getAttribute("aria-current") === "true") return;
      links.forEach((a) => a.removeAttribute("aria-current"));
      link.setAttribute("aria-current", "true");
      const left = link.offsetLeft - tabStrip.clientWidth / 2 + link.clientWidth / 2;
      tabStrip.scrollTo({ left, behavior: "smooth" });
    }

    const observer = new IntersectionObserver(
      (entries) => entries.forEach((en) => en.isIntersecting && setActive(en.target.id)),
      { rootMargin: "-35% 0px -60% 0px" }
    );
    byId.forEach((_, id) => {
      const section = document.getElementById(id);
      if (section) observer.observe(section);
    });
    setActive(links[0].getAttribute("href").slice(1));
  }

  /* ---------- Footer year ---------- */
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = String(new Date().getFullYear())));
})();
