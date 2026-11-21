(function () {
  "use strict";

  /* AVAILABILITY_OVERRIDE is the highest priority. Leave it null on the live site.
     null: follow /status.json. That file is what /admin/ writes.
       mode "auto": unavailable 00:00–04:59 JST, available otherwise.
       mode "available" or "unavailable": forced, until "until" if that time has passed.
     'available' or 'unavailable': ignore status.json and the clock.
     A failed fetch of status.json falls back to the automatic schedule. */
  var AVAILABILITY_OVERRIDE = null; // 'available' | 'unavailable'

  var COPY = {
    en: {
      available: "Interpreters available",
      unavailable: "Interpreters not available",
      hours: "Available daily 5:00–24:00 JST.",
      suggest: "Send a request with the form and we will write back.",
      href: "/contact.html",
      link: "Contact form"
    },
    ja: {
      available: "通訳者は対応できます",
      unavailable: "通訳者はただいま対応できません",
      hours: "対応時間は毎日 5:00〜24:00（日本時間）です。",
      suggest: "フォームからご依頼ください。確認できしだいご連絡します。",
      href: "/ja/contact.html",
      link: "お問い合わせフォーム"
    },
    es: {
      available: "Intérpretes disponibles",
      unavailable: "Intérpretes no disponibles",
      hours: "Disponibles todos los días de 5:00 a 24:00 (hora de Japón).",
      suggest: "Envíe el formulario y le responderemos.",
      href: "/es/contact.html",
      link: "Formulario de contacto"
    }
  };

  var remote = null;

  function locale() {
    var lang = (document.documentElement.getAttribute("lang") || "en").toLowerCase();
    if (lang.indexOf("ja") === 0) return "ja";
    if (lang.indexOf("es") === 0) return "es";
    return "en";
  }

  function japanClock(date) {
    var fmt = new Intl.DateTimeFormat("en-US", {
      timeZone: "Asia/Tokyo",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23"
    });
    var hour = 0;
    var minute = 0;
    fmt.formatToParts(date).forEach(function (part) {
      if (part.type === "hour") hour = parseInt(part.value, 10);
      if (part.type === "minute") minute = parseInt(part.value, 10);
    });
    if (hour === 24) hour = 0;
    return { hour: hour, minute: minute };
  }

  function scheduleStatus(date) {
    return japanClock(date).hour < 5 ? "unavailable" : "available";
  }

  function noteText(note, lang) {
    if (!note) return "";
    if (typeof note === "string") return note;
    if (typeof note === "object") {
      if (typeof note[lang] === "string" && note[lang]) return note[lang];
      if (typeof note.en === "string") return note.en;
    }
    return "";
  }

  /* record: status.json object, or null when the file could not be read. */
  function resolveStatus(record, date) {
    var now = date || new Date();
    if (AVAILABILITY_OVERRIDE === "available" || AVAILABILITY_OVERRIDE === "unavailable") {
      return { state: AVAILABILITY_OVERRIDE, mode: "override", note: null, expired: false };
    }
    var mode = "auto";
    var note = null;
    var expired = false;
    if (record && typeof record === "object") {
      var untilMs = record.until ? Date.parse(record.until) : NaN;
      expired = !!(record.until && !isNaN(untilMs) && untilMs <= now.getTime());
      if (!expired && (record.mode === "available" || record.mode === "unavailable" || record.mode === "auto")) {
        mode = record.mode;
      }
      note = record.note || null;
    }
    var state = mode === "auto" ? scheduleStatus(now) : mode;
    return { state: state, mode: mode, note: note, expired: expired };
  }

  function renderAvailability(date) {
    var el = document.querySelector("[data-avail]");
    if (!el) return;
    var text = COPY[locale()];
    var resolved = resolveStatus(remote, date || new Date());
    var open = resolved.state === "available";
    var extra = noteText(resolved.note, locale());
    el.classList.toggle("is-open", open);
    el.classList.toggle("is-closed", !open);
    el.classList.toggle("has-note", !!extra);
    var label = el.querySelector(".avail-label");
    var noteEl = el.querySelector(".avail-note");
    var detail = el.querySelector(".avail-detail");
    if (label) label.textContent = open ? text.available : text.unavailable;
    if (noteEl) {
      noteEl.hidden = !extra;
      noteEl.textContent = extra;
    }
    if (detail) {
      detail.hidden = open;
      if (!open) {
        detail.innerHTML = "";
        detail.appendChild(document.createTextNode(text.hours + " " + text.suggest + " "));
        var link = document.createElement("a");
        link.href = text.href;
        link.textContent = text.link;
        detail.appendChild(link);
      }
    }
  }

  function refresh() {
    return fetch("/status.json?t=" + Date.now(), { cache: "no-store" })
      .then(function (response) {
        if (!response.ok) throw new Error(String(response.status));
        return response.json();
      })
      .then(function (data) {
        remote = data;
        renderAvailability(new Date());
      })
      .catch(function () {
        remote = null;
        renderAvailability(new Date());
      });
  }

  function mountAvailability() {
    if (document.querySelector("[data-avail]")) return;
    var el = document.createElement("div");
    el.className = "avail";
    el.setAttribute("data-avail", "");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = '<span class="avail-dot" aria-hidden="true"></span><span class="avail-text"><strong class="avail-label"></strong><span class="avail-note" hidden></span><span class="avail-detail" hidden></span></span>';
    document.body.appendChild(el);
    renderAvailability(new Date());
    refresh();
    setInterval(refresh, 60000);
  }

  window.AIJAvailability = {
    statusFor: function (date, record) {
      if (arguments.length > 1) return resolveStatus(record, date || new Date()).state;
      return resolveStatus(remote, date || new Date()).state;
    },
    resolve: resolveStatus,
    japanClock: japanClock,
    render: renderAvailability,
    refresh: refresh
  };

  mountAvailability();

  var header = document.querySelector("[data-header]");
  var toggle = document.querySelector("[data-nav-toggle]");
  var nav = document.querySelector("[data-nav]");
  var body = document.body;

  if (!toggle || !nav) return;

  function setOpen(open) {
    toggle.setAttribute("aria-expanded", open ? "true" : "false");
    nav.classList.toggle("is-open", open);
    body.classList.toggle("nav-open", open);
    toggle.setAttribute("aria-label", open ? toggle.getAttribute("data-label-close") : toggle.getAttribute("data-label-open"));
  }

  toggle.addEventListener("click", function () {
    var open = toggle.getAttribute("aria-expanded") !== "true";
    setOpen(open);
  });

  nav.querySelectorAll("a").forEach(function (link) {
    link.addEventListener("click", function () {
      setOpen(false);
    });
  });

  document.addEventListener("keydown", function (event) {
    if (event.key === "Escape") setOpen(false);
  });

  document.addEventListener("click", function (event) {
    if (!header) return;
    if (toggle.getAttribute("aria-expanded") === "true" && !header.contains(event.target)) {
      setOpen(false);
    }
  });
})();
