(function () {
  "use strict";

  /* Force the badge without looking at the clock.
     null uses Japan time. 'available' or 'unavailable' overrides it. */
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

  /* Not available 00:00–04:59 JST. Available 05:00–23:59 JST. */
  function statusFor(date) {
    if (AVAILABILITY_OVERRIDE === "available" || AVAILABILITY_OVERRIDE === "unavailable") {
      return AVAILABILITY_OVERRIDE;
    }
    var clock = japanClock(date || new Date());
    if (clock.hour < 5) return "unavailable";
    return "available";
  }

  function renderAvailability(date) {
    var el = document.querySelector("[data-avail]");
    if (!el) return;
    var text = COPY[locale()];
    var status = statusFor(date || new Date());
    var open = status === "available";
    el.classList.toggle("is-open", open);
    el.classList.toggle("is-closed", !open);
    var label = el.querySelector(".avail-label");
    var detail = el.querySelector(".avail-detail");
    if (label) label.textContent = open ? text.available : text.unavailable;
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

  function mountAvailability() {
    if (document.querySelector("[data-avail]")) return;
    var el = document.createElement("div");
    el.className = "avail";
    el.setAttribute("data-avail", "");
    el.setAttribute("role", "status");
    el.setAttribute("aria-live", "polite");
    el.innerHTML = '<span class="avail-dot" aria-hidden="true"></span><span class="avail-text"><strong class="avail-label"></strong><span class="avail-detail" hidden></span></span>';
    document.body.appendChild(el);
    renderAvailability(new Date());
    setInterval(function () { renderAvailability(new Date()); }, 60000);
  }

  window.AIJAvailability = {
    statusFor: statusFor,
    japanClock: japanClock,
    render: renderAvailability
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
