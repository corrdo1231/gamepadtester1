(function () {
  var doc = document;
  var root = doc.documentElement;
  var body = doc.body;
  var locale = root.lang === "pt-BR" ? "pt-BR" : "en";
  var page = "home";
  var messages = {};

  var routeMap = {
    en: {
      home: "/",
      drift: "/controller-drift-test.html",
      deadzone: "/deadzone-test.html",
      "polling-rate": "/polling-rate-test.html",
      vibration: "/vibration-test.html"
    },
    "pt-BR": {
      home: "/pt-br/",
      drift: "/pt-br/controller-drift-test.html",
      deadzone: "/pt-br/deadzone-test.html",
      "polling-rate": "/pt-br/polling-rate-test.html",
      vibration: "/pt-br/vibration-test.html"
    }
  };

  function getValue(source, path) {
    return path.split(".").reduce(function (acc, key) {
      return acc && Object.prototype.hasOwnProperty.call(acc, key) ? acc[key] : undefined;
    }, source);
  }

  function interpolate(text, vars) {
    if (!vars) {
      return text;
    }

    return text.replace(/\{(\w+)\}/g, function (_, key) {
      return Object.prototype.hasOwnProperty.call(vars, key) ? vars[key] : "";
    });
  }

  function t(key, fallback, vars) {
    var value = getValue(messages, key);

    if (typeof value === "string") {
      return interpolate(value, vars);
    }

    return typeof fallback === "string" ? interpolate(fallback, vars) : key;
  }

  function applyDataTranslations(scope) {
    (scope || doc).querySelectorAll("[data-i18n]").forEach(function (node) {
      node.textContent = t(node.getAttribute("data-i18n"), node.textContent);
    });

    (scope || doc).querySelectorAll("[data-i18n-html]").forEach(function (node) {
      node.innerHTML = t(node.getAttribute("data-i18n-html"), node.innerHTML);
    });

    [
      { attribute: "title", dataset: "i18nTitle" },
      { attribute: "placeholder", dataset: "i18nPlaceholder" },
      { attribute: "aria-label", dataset: "i18nAriaLabel" }
    ].forEach(function (entry) {
      (scope || doc).querySelectorAll("[" + toDataSelector(entry.dataset) + "]").forEach(function (node) {
        var key = node.dataset[entry.dataset];
        node.setAttribute(entry.attribute, t(key, node.getAttribute(entry.attribute) || ""));
      });
    });
  }

  function toDataSelector(name) {
    return "data-" + name.replace(/[A-Z]/g, function (match) {
      return "-" + match.toLowerCase();
    });
  }

  function applyBindings(scope, bindings) {
    bindings.forEach(function (binding) {
      (scope || doc).querySelectorAll(binding.selector).forEach(function (node) {
        var nextValue = t(binding.key, binding.html ? node.innerHTML : node.textContent);
        if (binding.html) {
          node.innerHTML = nextValue;
        } else {
          node.textContent = nextValue;
        }
      });
    });
  }

  function localizeLinks() {
    doc.querySelectorAll("[data-localized-link]").forEach(function (node) {
      var pageKey = node.getAttribute("data-localized-link");
      var href = routeMap[locale] && routeMap[locale][pageKey];
      if (href) {
        node.setAttribute("href", href);
      }
    });
  }

  function getRouteForLocale(targetLocale) {
    var routes = routeMap[targetLocale] || routeMap.en;
    return routes[page] || routes.home;
  }

  function closeLanguageMenus() {
    doc.querySelectorAll(".language-menu.is-open").forEach(function (menu) {
      var button = menu.querySelector(".language-menu-button");
      var dropdown = menu.querySelector(".language-menu-dropdown");

      menu.classList.remove("is-open");

      if (button) {
        button.setAttribute("aria-expanded", "false");
      }

      if (dropdown) {
        dropdown.hidden = true;
      }
    });
  }

  function createLanguageIcon() {
    var icon = doc.createElement("span");
    icon.className = "language-menu-icon";
    icon.setAttribute("aria-hidden", "true");
    icon.innerHTML = '<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true"><circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="1.8"></circle><path d="M3 12h18M12 3a14 14 0 0 1 0 18M12 3a14 14 0 0 0 0 18" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg>';
    return icon;
  }

  function createLanguageCaret() {
    var caret = doc.createElement("span");
    caret.className = "language-menu-caret";
    caret.setAttribute("aria-hidden", "true");
    caret.innerHTML = '<svg viewBox="0 0 12 12" focusable="false" aria-hidden="true"><path d="M2.25 4.5 6 8.25 9.75 4.5" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"></path></svg>';
    return caret;
  }

  function setupLanguageSwitcher() {
    if (!doc.__languageMenuBound) {
      doc.addEventListener("click", function (event) {
        if (!event.target.closest(".language-menu")) {
          closeLanguageMenus();
        }
      });

      doc.addEventListener("keydown", function (event) {
        if (event.key === "Escape") {
          closeLanguageMenus();
        }
      });

      doc.__languageMenuBound = true;
    }

    doc.querySelectorAll("[data-language-switcher]").forEach(function (node) {
      node.innerHTML = "";

      var menu = doc.createElement("div");
      menu.className = "language-menu";

      var button = doc.createElement("button");
      button.type = "button";
      button.className = "language-menu-button";
      button.setAttribute("aria-haspopup", "true");
      button.setAttribute("aria-expanded", "false");
      button.setAttribute("aria-label", t("common.language.label", "Language"));

      var currentLabel = doc.createElement("span");
      currentLabel.className = "language-menu-current";
      currentLabel.textContent = locale === "pt-BR" ? "PT-BR" : "EN";

      var dropdown = doc.createElement("div");
      dropdown.className = "language-menu-dropdown";
      dropdown.hidden = true;

      [
        {
          value: "en",
          shortLabel: "EN",
          label: t("common.language.english", "English"),
          href: getRouteForLocale("en")
        },
        {
          value: "pt-BR",
          shortLabel: "PT-BR",
          label: t("common.language.portugueseBrazil", "Portugu锚s (Brasil)"),
          href: getRouteForLocale("pt-BR")
        }
      ].forEach(function (entry) {
        var option = doc.createElement("a");
        option.className = "language-menu-option";
        option.setAttribute("href", entry.href);

        if (entry.value === locale) {
          option.classList.add("active");
          option.setAttribute("aria-current", "page");
        }

        var optionLabel = doc.createElement("span");
        optionLabel.textContent = entry.label;

        var optionBadge = doc.createElement("span");
        optionBadge.className = "language-menu-badge";
        optionBadge.textContent = entry.shortLabel;

        option.appendChild(optionLabel);
        option.appendChild(optionBadge);
        dropdown.appendChild(option);
      });

      button.appendChild(createLanguageIcon());
      button.appendChild(currentLabel);
      button.appendChild(createLanguageCaret());

      button.addEventListener("click", function (event) {
        event.preventDefault();
        event.stopPropagation();

        var isOpen = menu.classList.contains("is-open");
        closeLanguageMenus();

        if (!isOpen) {
          menu.classList.add("is-open");
          button.setAttribute("aria-expanded", "true");
          dropdown.hidden = false;
        }
      });

      menu.appendChild(button);
      menu.appendChild(dropdown);
      node.appendChild(menu);
    });

    return;

    doc.querySelectorAll("[data-language-switcher]").forEach(function (node) {
      node.innerHTML = "";

      var select = doc.createElement("select");
      select.className = "language-switcher-select";
      select.setAttribute("aria-label", t("common.language.label", "Language"));

      [
        { value: "en", label: t("common.language.english", "English") },
        { value: "pt-BR", label: t("common.language.portugueseBrazil", "Português (Brasil)") }
      ].forEach(function (entry) {
        var option = doc.createElement("option");
        option.value = entry.value;
        option.textContent = entry.label;
        select.appendChild(option);
      });

      select.value = locale;
      select.addEventListener("change", function () {
        var nextLocale = select.value === "pt-BR" ? "pt-BR" : "en";
        var nextHref = routeMap[nextLocale] && routeMap[nextLocale][page];
        window.location.href = nextHref || routeMap[nextLocale].home;
      });

      node.appendChild(select);
    });
  }

  var commonBindings = [
    { selector: ".brand-label span", key: "common.brand.tagline" },
    { selector: ".language-switcher-label", key: "common.language.label" },
    { selector: "nav[aria-label='Primary'] a[data-nav='home'] span", key: "common.nav.home" },
    { selector: "nav[aria-label='Primary'] a[data-nav='drift'] span", key: "common.nav.drift" },
    { selector: "nav[aria-label='Primary'] a[data-nav='calibration'] span", key: "common.nav.calibration" },
    { selector: "nav[aria-label='Primary'] a[data-nav='polling'] span", key: "common.nav.pollingRate" },
    { selector: "nav[aria-label='Primary'] a[data-nav='vibration'] span", key: "common.nav.vibration" },
    { selector: "nav[aria-label='Primary'] a[data-nav='tools'] span", key: "common.nav.tools" },
    { selector: "nav[aria-label='Primary'] a[data-nav='widgets'] span", key: "common.nav.widgets" },
    { selector: ".footer-box .muted", key: "common.footer.tagline" },
    { selector: ".footer-links a[data-footer='home']", key: "common.footer.links.home" },
    { selector: ".footer-links a[data-footer='drift']", key: "common.footer.links.drift" },
    { selector: ".footer-links a[data-footer='deadzone']", key: "common.footer.links.deadzone" },
    { selector: ".footer-links a[data-footer='xbox']", key: "common.footer.links.xbox" },
    { selector: ".footer-links a[data-footer='ps5']", key: "common.footer.links.ps5" },
    { selector: ".footer-links a[data-footer='about']", key: "common.footer.links.about" },
    { selector: ".footer-links a[data-footer='privacy']", key: "common.footer.links.privacy" },
    { selector: ".footer-links a[data-footer='terms']", key: "common.footer.links.terms" },
    { selector: ".footer-links a[data-footer='contact']", key: "common.footer.links.contact" },
    { selector: "[data-unsupported]", key: "common.status.unsupportedBrowser" }
  ];

  var pageBindings = {
    home: [
      { selector: ".hero-copy .eyebrow", key: "home.hero.eyebrow" },
      { selector: ".hero-copy h1", key: "home.hero.title" },
      { selector: ".hero-copy > p", key: "home.hero.description" },
      { selector: ".hero-actions a[data-home-link='tester']", key: "home.hero.launch" },
      { selector: ".hero-actions a[data-home-link='drift']", key: "home.hero.driftGuide" },
      { selector: ".hero-side .stat-card:nth-child(1) .muted", key: "home.stats.refreshLabel" },
      { selector: ".hero-side .stat-card:nth-child(1) strong", key: "home.stats.refreshValue" },
      { selector: ".hero-side .stat-card:nth-child(2) .muted", key: "home.stats.connectionLabel" },
      { selector: ".hero-side .stat-card:nth-child(2) strong", key: "home.stats.connectionValue" },
      { selector: ".hero-side .stat-card:nth-child(3) .muted", key: "home.stats.deploymentLabel" },
      { selector: ".hero-side .stat-card:nth-child(3) strong", key: "home.stats.deploymentValue" },
      { selector: ".hero-side .stat-card:nth-child(4) .muted", key: "home.stats.runtimeLabel" },
      { selector: ".hero-side .stat-card:nth-child(4) strong", key: "home.stats.runtimeValue" },
      { selector: ".hero-side .page-note .tag", key: "home.note.tag" },
      { selector: ".hero-side .page-note p", key: "home.note.description" },
      { selector: ".panel-header .section-title h2", key: "home.panel.title" },
      { selector: ".panel-header .section-title p", key: "home.panel.subtitle" },
      { selector: ".dashboard-card-main .dashboard-heading h3", key: "home.visualizer.title" },
      { selector: ".dashboard-card-main .dashboard-heading .mini-note", key: "home.visualizer.note" },
      { selector: ".controller-legend-row .controller-legend-item:nth-child(1) .controller-legend-text", key: "home.visualizer.legendActive" },
      { selector: ".controller-legend-row .controller-legend-item:nth-child(2) .controller-legend-text", key: "home.visualizer.legendIdle" },
      { selector: ".dashboard-stick-card .dashboard-heading h3", key: "home.stick.title" },
      { selector: ".dashboard-stick-card .dashboard-heading .mini-note", key: "home.stick.note" },
      { selector: ".dashboard-stick-card .stick-compact-card:nth-child(1) > strong", key: "common.labels.leftStick" },
      { selector: ".dashboard-stick-card .stick-compact-card:nth-child(2) > strong", key: "common.labels.rightStick" },
      { selector: ".dashboard-stick-card .card-footnote", key: "home.stick.footnote" },
      { selector: ".dashboard-trigger-card .dashboard-heading h3", key: "home.trigger.title" },
      { selector: ".dashboard-trigger-card .dashboard-heading .mini-note", key: "home.trigger.note" },
      { selector: ".dashboard-vibration-card .dashboard-heading h3", key: "home.vibration.title" },
      { selector: ".dashboard-vibration-card .dashboard-heading .mini-note", key: "home.vibration.note" },
      { selector: ".dashboard-vibration-card [data-vibration='light']", key: "common.vibrationPresets.light" },
      { selector: ".dashboard-vibration-card [data-vibration='medium']", key: "common.vibrationPresets.medium" },
      { selector: ".dashboard-vibration-card [data-vibration='heavy']", key: "common.vibrationPresets.heavy" },
      { selector: ".dashboard-vibration-card [data-vibration='pulse']", key: "common.vibrationPresets.pulse" },
      { selector: ".advanced-panel summary", key: "home.advanced.title" },
      { selector: ".advanced-item:nth-child(1) span", key: "home.advanced.currentDevice" },
      { selector: ".advanced-item:nth-child(2) span", key: "home.advanced.browserDeviceId" },
      { selector: ".advanced-item:nth-child(3) span", key: "home.advanced.controllerSlot" },
      { selector: ".advanced-item:nth-child(4) span", key: "home.advanced.connection" },
      { selector: ".advanced-item:nth-child(5) span", key: "home.advanced.controllerCount" },
      { selector: ".advanced-item:nth-child(6) span", key: "home.advanced.buttonCount" },
      { selector: ".advanced-item:nth-child(7) span", key: "home.advanced.axisCount" },
      { selector: ".advanced-item:nth-child(8) span", key: "home.advanced.mapping" },
      { selector: ".advanced-item:nth-child(9) span", key: "home.advanced.suggestedDeadzone" },
      { selector: ".tools .section-title h2", key: "home.tools.title" },
      { selector: ".tools .section-title p", key: "home.tools.subtitle" },
      { selector: ".tools-grid .tool-card:nth-child(1) .tag", key: "home.tools.card1.tag" },
      { selector: ".tools-grid .tool-card:nth-child(1) h3", key: "home.tools.card1.title" },
      { selector: ".tools-grid .tool-card:nth-child(1) p", key: "home.tools.card1.description" },
      { selector: ".tools-grid .tool-card:nth-child(2) .tag", key: "home.tools.card2.tag" },
      { selector: ".tools-grid .tool-card:nth-child(2) h3", key: "home.tools.card2.title" },
      { selector: ".tools-grid .tool-card:nth-child(2) p", key: "home.tools.card2.description" },
      { selector: ".tools-grid .tool-card:nth-child(3) .tag", key: "home.tools.card3.tag" },
      { selector: ".tools-grid .tool-card:nth-child(3) h3", key: "home.tools.card3.title" },
      { selector: ".tools-grid .tool-card:nth-child(3) p", key: "home.tools.card3.description" },
      { selector: ".tools-grid .tool-card:nth-child(4) .tag", key: "home.tools.card4.tag" },
      { selector: ".tools-grid .tool-card:nth-child(4) h3", key: "home.tools.card4.title" },
      { selector: ".tools-grid .tool-card:nth-child(4) p", key: "home.tools.card4.description" },
      { selector: ".tools-grid .tool-card:nth-child(5) .tag", key: "home.tools.card5.tag" },
      { selector: ".tools-grid .tool-card:nth-child(5) h3", key: "home.tools.card5.title" },
      { selector: ".tools-grid .tool-card:nth-child(5) p", key: "home.tools.card5.description", html: true },
      { selector: ".tools-grid .tool-card:nth-child(6) .tag", key: "home.tools.card6.tag" },
      { selector: ".tools-grid .tool-card:nth-child(6) h3", key: "home.tools.card6.title" },
      { selector: ".tools-grid .tool-card:nth-child(6) p", key: "home.tools.card6.description" },
      { selector: ".guide .section-title h2", key: "home.guide.title" },
      { selector: ".guide .section-title p", key: "home.guide.subtitle" },
      { selector: ".steps-grid .step:nth-child(1) h3", key: "home.guide.step1.title" },
      { selector: ".steps-grid .step:nth-child(1) p", key: "home.guide.step1.description" },
      { selector: ".steps-grid .step:nth-child(2) h3", key: "home.guide.step2.title" },
      { selector: ".steps-grid .step:nth-child(2) p", key: "home.guide.step2.description" },
      { selector: ".steps-grid .step:nth-child(3) h3", key: "home.guide.step3.title" },
      { selector: ".steps-grid .step:nth-child(3) p", key: "home.guide.step3.description" },
      { selector: ".faq > .shell > h2", key: "home.faq.title" },
      { selector: ".faq-intro", key: "home.faq.subtitle" },
      { selector: ".faq-grid .faq-item:nth-child(1) h3", key: "home.faq.item1.question" },
      { selector: ".faq-grid .faq-item:nth-child(1) p", key: "home.faq.item1.answer" },
      { selector: ".faq-grid .faq-item:nth-child(2) h3", key: "home.faq.item2.question" },
      { selector: ".faq-grid .faq-item:nth-child(2) p", key: "home.faq.item2.answer" },
      { selector: ".faq-grid .faq-item:nth-child(3) h3", key: "home.faq.item3.question" },
      { selector: ".faq-grid .faq-item:nth-child(3) p", key: "home.faq.item3.answer" },
      { selector: ".faq-grid .faq-item:nth-child(4) h3", key: "home.faq.item4.question" },
      { selector: ".faq-grid .faq-item:nth-child(4) p", key: "home.faq.item4.answer" }
    ],
    drift: [
      { selector: ".drift-breadcrumb", key: "drift.breadcrumb" },
      { selector: ".drift-title-row .eyebrow", key: "drift.header.eyebrow" },
      { selector: ".drift-title-row h1", key: "drift.header.title" },
      { selector: ".drift-title-row p", key: "drift.header.description" },
      { selector: ".drift-monitor-topbar h2", key: "drift.monitor.title" },
      { selector: ".drift-monitor-topbar .mini-note", key: "drift.monitor.note" },
      { selector: ".drift-stick-card:nth-child(1) .drift-stick-head h3", key: "common.labels.leftStick" },
      { selector: ".drift-stick-card:nth-child(2) .drift-stick-head h3", key: "common.labels.rightStick" },
      { selector: ".drift-metric-grid .drift-metric-item:nth-child(3) span", key: "common.labels.current" },
      { selector: ".drift-metric-grid .drift-metric-item:nth-child(4) span", key: "common.labels.peak" },
      { selector: ".drift-monitor-footer .controller-legend-item:nth-child(1) .controller-legend-text", key: "drift.monitor.legendCurrent" },
      { selector: ".drift-monitor-footer .controller-legend-item:nth-child(2) .controller-legend-text", key: "drift.monitor.legendDeadzone" },
      { selector: ".drift-footnote", key: "drift.monitor.footnote" },
      { selector: ".drift-settings-head h2", key: "drift.settings.title" },
      { selector: ".drift-settings-head .mini-note", key: "drift.settings.note" },
      { selector: ".drift-settings-block label span", key: "drift.settings.deadzone" },
      { selector: ".deadzone-helper", key: "drift.settings.helper" },
      { selector: "[data-reset-drift]", key: "drift.settings.reset" },
      { selector: "[data-refresh]", key: "common.buttons.refreshControllers" },
      { selector: ".drift-summary-head h2", key: "drift.summary.title" },
      { selector: ".drift-summary-head .mini-note", key: "drift.summary.note" },
      { selector: ".drift-summary-item:nth-child(1) span", key: "common.labels.currentController" },
      { selector: ".drift-summary-item:nth-child(2) span", key: "common.labels.slot" },
      { selector: ".drift-summary-item:nth-child(3) span", key: "common.labels.detected" },
      { selector: ".drift-summary-item:nth-child(4) span", key: "common.labels.recommendedDeadzone" },
      { selector: ".drift-summary-item:nth-child(5) span", key: "common.labels.leftStatus" },
      { selector: ".drift-summary-item:nth-child(6) span", key: "common.labels.rightStatus" },
      { selector: ".advanced-panel summary", key: "common.labels.advancedDebug" },
      { selector: ".advanced-item:nth-child(1) span", key: "common.labels.browserDeviceId" },
      { selector: ".advanced-item:nth-child(2) span", key: "common.labels.mapping" },
      { selector: ".advanced-item:nth-child(3) span", key: "common.labels.connection" },
      { selector: ".advanced-item:nth-child(4) span", key: "common.labels.buttonCount" },
      { selector: ".advanced-item:nth-child(5) span", key: "common.labels.axisCount" },
      { selector: ".guide .section-title h2", key: "drift.guide.title" },
      { selector: ".guide .section-title p", key: "drift.guide.subtitle" },
      { selector: ".steps-grid .step:nth-child(1) h3", key: "drift.guide.step1.title" },
      { selector: ".steps-grid .step:nth-child(1) p", key: "drift.guide.step1.description" },
      { selector: ".steps-grid .step:nth-child(2) h3", key: "drift.guide.step2.title" },
      { selector: ".steps-grid .step:nth-child(2) p", key: "drift.guide.step2.description" },
      { selector: ".steps-grid .step:nth-child(3) h3", key: "drift.guide.step3.title" },
      { selector: ".steps-grid .step:nth-child(3) p", key: "drift.guide.step3.description" },
      { selector: ".faq .section-title h2", key: "drift.faq.title" },
      { selector: ".faq .section-title p", key: "drift.faq.subtitle" },
      { selector: ".faq-grid .faq-item:nth-child(1) h3", key: "drift.faq.item1.question" },
      { selector: ".faq-grid .faq-item:nth-child(1) p", key: "drift.faq.item1.answer" },
      { selector: ".faq-grid .faq-item:nth-child(2) h3", key: "drift.faq.item2.question" },
      { selector: ".faq-grid .faq-item:nth-child(2) p", key: "drift.faq.item2.answer" },
      { selector: ".faq-grid .faq-item:nth-child(3) h3", key: "drift.faq.item3.question" },
      { selector: ".faq-grid .faq-item:nth-child(3) p", key: "drift.faq.item3.answer" },
      { selector: ".faq-grid .faq-item:nth-child(4) h3", key: "drift.faq.item4.question" },
      { selector: ".faq-grid .faq-item:nth-child(4) p", key: "drift.faq.item4.answer" }
    ],
    deadzone: [
      { selector: ".deadzone-title-row .eyebrow", key: "deadzone.header.eyebrow" },
      { selector: ".deadzone-title-row h1", key: "deadzone.header.title" },
      { selector: ".deadzone-title-row p", key: "deadzone.header.description" },
      { selector: ".deadzone-monitor-topbar h2", key: "deadzone.monitor.title" },
      { selector: ".deadzone-monitor-topbar .mini-note", key: "deadzone.monitor.note" },
      { selector: ".deadzone-stick-card:nth-child(1) .deadzone-stick-head h3", key: "common.labels.leftStick" },
      { selector: ".deadzone-stick-card:nth-child(2) .deadzone-stick-head h3", key: "common.labels.rightStick" },
      { selector: ".deadzone-metric-grid .deadzone-metric-item:nth-child(3) span", key: "common.labels.current" },
      { selector: ".deadzone-metric-grid .deadzone-metric-item:nth-child(4) span", key: "common.labels.peak" },
      { selector: ".deadzone-monitor-footer .controller-legend-item:nth-child(1) .controller-legend-text", key: "deadzone.monitor.legendLive" },
      { selector: ".deadzone-monitor-footer .controller-legend-item:nth-child(2) .controller-legend-text", key: "deadzone.monitor.legendRing" },
      { selector: ".deadzone-footnote", key: "deadzone.monitor.footnote" },
      { selector: ".deadzone-settings-head h2", key: "deadzone.settings.title" },
      { selector: ".deadzone-settings-head .mini-note", key: "deadzone.settings.note" },
      { selector: ".deadzone-settings-block label span", key: "deadzone.settings.activeDeadzone" },
      { selector: ".deadzone-range-note span", key: "deadzone.settings.suggestedRange" },
      { selector: ".deadzone-range-note strong", key: "deadzone.settings.rangeValue" },
      { selector: ".deadzone-helper", key: "deadzone.settings.helper" },
      { selector: ".deadzone-actions [data-reset-drift]", key: "deadzone.settings.reset" },
      { selector: ".deadzone-actions [data-refresh]", key: "common.buttons.refreshControllers" },
      { selector: ".deadzone-summary-head h2", key: "deadzone.summary.title" },
      { selector: ".deadzone-summary-head .mini-note", key: "deadzone.summary.note" },
      { selector: ".deadzone-summary-item:nth-child(1) span", key: "common.labels.currentController" },
      { selector: ".deadzone-summary-item:nth-child(2) span", key: "common.labels.slot" },
      { selector: ".deadzone-summary-item:nth-child(3) span", key: "common.labels.detected" },
      { selector: ".deadzone-summary-item:nth-child(4) span", key: "common.labels.recommendedDeadzone" },
      { selector: ".advanced-panel summary", key: "common.labels.advancedDebug" },
      { selector: ".advanced-item:nth-child(1) span", key: "common.labels.browserDeviceId" },
      { selector: ".advanced-item:nth-child(2) span", key: "common.labels.mapping" },
      { selector: ".advanced-item:nth-child(3) span", key: "common.labels.connection" },
      { selector: ".advanced-item:nth-child(4) span", key: "common.labels.buttonCount" },
      { selector: ".advanced-item:nth-child(5) span", key: "common.labels.axisCount" },
      { selector: ".guide .section-title h2", key: "deadzone.guide.title" },
      { selector: ".guide .section-title p", key: "deadzone.guide.subtitle" },
      { selector: ".steps-grid .step:nth-child(1) h3", key: "deadzone.guide.step1.title" },
      { selector: ".steps-grid .step:nth-child(1) p", key: "deadzone.guide.step1.description" },
      { selector: ".steps-grid .step:nth-child(2) h3", key: "deadzone.guide.step2.title" },
      { selector: ".steps-grid .step:nth-child(2) p", key: "deadzone.guide.step2.description" },
      { selector: ".steps-grid .step:nth-child(3) h3", key: "deadzone.guide.step3.title" },
      { selector: ".steps-grid .step:nth-child(3) p", key: "deadzone.guide.step3.description" },
      { selector: ".faq .section-title h2", key: "deadzone.faq.title" },
      { selector: ".faq .section-title p", key: "deadzone.faq.subtitle" },
      { selector: ".faq-grid .faq-item:nth-child(1) h3", key: "deadzone.faq.item1.question" },
      { selector: ".faq-grid .faq-item:nth-child(1) p", key: "deadzone.faq.item1.answer" },
      { selector: ".faq-grid .faq-item:nth-child(2) h3", key: "deadzone.faq.item2.question" },
      { selector: ".faq-grid .faq-item:nth-child(2) p", key: "deadzone.faq.item2.answer" },
      { selector: ".faq-grid .faq-item:nth-child(3) h3", key: "deadzone.faq.item3.question" },
      { selector: ".faq-grid .faq-item:nth-child(3) p", key: "deadzone.faq.item3.answer" },
      { selector: ".faq-grid .faq-item:nth-child(4) h3", key: "deadzone.faq.item4.question" },
      { selector: ".faq-grid .faq-item:nth-child(4) p", key: "deadzone.faq.item4.answer" }
    ],
    vibration: [
      { selector: ".vibration-panel-header .eyebrow", key: "vibration.header.eyebrow" },
      { selector: ".vibration-panel-header h1", key: "vibration.header.title" },
      { selector: ".vibration-panel-header p", key: "vibration.header.description" },
      { selector: ".vibration-visualizer-card .dashboard-heading h2", key: "vibration.visualizer.title" },
      { selector: ".vibration-visualizer-card .dashboard-heading .mini-note", key: "vibration.visualizer.note" },
      { selector: ".vibration-visualizer-card .controller-legend-item:nth-child(1) .controller-legend-text", key: "vibration.visualizer.legendActive" },
      { selector: ".vibration-visualizer-card .controller-legend-item:nth-child(2) .controller-legend-text", key: "vibration.visualizer.legendIdle" },
      { selector: ".vibration-controls-card .dashboard-heading h2", key: "vibration.controls.title" },
      { selector: ".vibration-controls-card .dashboard-heading .mini-note", key: "vibration.controls.note" },
      { selector: ".vibration-meta-item:nth-child(1) span", key: "common.labels.currentController" },
      { selector: ".vibration-meta-item:nth-child(2) span", key: "common.labels.slot" },
      { selector: ".vibration-meta-item:nth-child(3) span", key: "vibration.controls.rumbleSupport" },
      { selector: ".vibration-slider-group:nth-child(1) label span", key: "vibration.controls.leftMotor" },
      { selector: ".vibration-slider-group:nth-child(2) label span", key: "vibration.controls.rightMotor" },
      { selector: ".vibration-slider-group:nth-child(3) label span", key: "vibration.controls.duration" },
      { selector: ".vibration-inline-note", key: "vibration.controls.inlineNote", html: true },
      { selector: ".vibration-block-heading h3", key: "vibration.controls.presetsTitle" },
      { selector: ".vibration-block-heading p", key: "vibration.controls.presetsNote" },
      { selector: "[data-vibration-preset='light']", key: "common.vibrationPresets.light" },
      { selector: "[data-vibration-preset='medium']", key: "common.vibrationPresets.medium" },
      { selector: "[data-vibration-preset='heavy']", key: "common.vibrationPresets.heavy" },
      { selector: "[data-vibration-preset='pulse']", key: "common.vibrationPresets.pulse" },
      { selector: "[data-vibration-preset='heartbeat']", key: "common.vibrationPresets.heartbeat" },
      { selector: "[data-vibration-preset='explosion']", key: "common.vibrationPresets.explosion" },
      { selector: "[data-vibration-preset='click']", key: "common.vibrationPresets.click" },
      { selector: "[data-vibration-start]", key: "vibration.controls.startButton" },
      { selector: ".guide .section-title h2", key: "vibration.guide.title" },
      { selector: ".guide .section-title p", key: "vibration.guide.subtitle" },
      { selector: ".steps-grid .step:nth-child(1) h3", key: "vibration.guide.step1.title" },
      { selector: ".steps-grid .step:nth-child(1) p", key: "vibration.guide.step1.description" },
      { selector: ".steps-grid .step:nth-child(2) h3", key: "vibration.guide.step2.title" },
      { selector: ".steps-grid .step:nth-child(2) p", key: "vibration.guide.step2.description" },
      { selector: ".steps-grid .step:nth-child(3) h3", key: "vibration.guide.step3.title" },
      { selector: ".steps-grid .step:nth-child(3) p", key: "vibration.guide.step3.description" },
      { selector: ".faq .section-title h2", key: "vibration.faq.title" },
      { selector: ".faq .section-title p", key: "vibration.faq.subtitle" },
      { selector: ".faq-grid .faq-item:nth-child(1) h3", key: "vibration.faq.item1.question" },
      { selector: ".faq-grid .faq-item:nth-child(1) p", key: "vibration.faq.item1.answer" },
      { selector: ".faq-grid .faq-item:nth-child(2) h3", key: "vibration.faq.item2.question" },
      { selector: ".faq-grid .faq-item:nth-child(2) p", key: "vibration.faq.item2.answer" },
      { selector: ".faq-grid .faq-item:nth-child(3) h3", key: "vibration.faq.item3.question" },
      { selector: ".faq-grid .faq-item:nth-child(3) p", key: "vibration.faq.item3.answer" },
      { selector: ".faq-grid .faq-item:nth-child(4) h3", key: "vibration.faq.item4.question" },
      { selector: ".faq-grid .faq-item:nth-child(4) p", key: "vibration.faq.item4.answer" }
    ],
    "polling-rate": [
      { selector: ".polling-panel-header .eyebrow", key: "polling.header.eyebrow" },
      { selector: ".polling-panel-header h1", key: "polling.header.title" },
      { selector: ".polling-panel-header p", key: "polling.header.description" },
      { selector: ".polling-visualizer-card .dashboard-heading h2", key: "polling.visualizer.title" },
      { selector: ".polling-visualizer-card .dashboard-heading .mini-note", key: "polling.visualizer.note" },
      { selector: ".polling-metric-card-feature span", key: "polling.metrics.browserObserved" },
      { selector: ".polling-metric-card:nth-child(2) span", key: "polling.metrics.averageInterval" },
      { selector: ".polling-metric-card:nth-child(3) span", key: "polling.metrics.minInterval" },
      { selector: ".polling-metric-card:nth-child(4) span", key: "polling.metrics.maxInterval" },
      { selector: ".polling-metric-card-wide span", key: "polling.metrics.samplesCollected" },
      { selector: ".polling-controls-card .dashboard-heading h2", key: "polling.controls.title" },
      { selector: ".polling-controls-card .dashboard-heading .mini-note", key: "polling.controls.note" },
      { selector: ".polling-meta-item:nth-child(1) span", key: "common.labels.currentController" },
      { selector: ".polling-meta-item:nth-child(2) span", key: "common.labels.slot" },
      { selector: ".polling-meta-item:nth-child(3) span", key: "polling.controls.session" },
      { selector: ".polling-block-heading h3", key: "polling.controls.durationTitle" },
      { selector: ".polling-block-heading p", key: "polling.controls.durationNote" },
      { selector: "[data-polling-start]", key: "polling.controls.startButton" },
      { selector: "[data-polling-reset]", key: "polling.controls.resetButton" },
      { selector: ".polling-result-head span", key: "polling.controls.resultSummary" },
      { selector: ".polling-progress-row span", key: "polling.controls.timeLeft" },
      { selector: ".guide .section-title h2", key: "polling.guide.title" },
      { selector: ".guide .section-title p", key: "polling.guide.subtitle" },
      { selector: ".steps-grid .step:nth-child(1) h3", key: "polling.guide.step1.title" },
      { selector: ".steps-grid .step:nth-child(1) p", key: "polling.guide.step1.description" },
      { selector: ".steps-grid .step:nth-child(2) h3", key: "polling.guide.step2.title" },
      { selector: ".steps-grid .step:nth-child(2) p", key: "polling.guide.step2.description" },
      { selector: ".steps-grid .step:nth-child(3) h3", key: "polling.guide.step3.title" },
      { selector: ".steps-grid .step:nth-child(3) p", key: "polling.guide.step3.description" },
      { selector: ".faq .section-title h2", key: "polling.faq.title" },
      { selector: ".faq .section-title p", key: "polling.faq.subtitle" },
      { selector: ".faq-grid .faq-item:nth-child(1) h3", key: "polling.faq.item1.question" },
      { selector: ".faq-grid .faq-item:nth-child(1) p", key: "polling.faq.item1.answer" },
      { selector: ".faq-grid .faq-item:nth-child(2) h3", key: "polling.faq.item2.question" },
      { selector: ".faq-grid .faq-item:nth-child(2) p", key: "polling.faq.item2.answer" },
      { selector: ".faq-grid .faq-item:nth-child(3) h3", key: "polling.faq.item3.question" },
      { selector: ".faq-grid .faq-item:nth-child(3) p", key: "polling.faq.item3.answer" },
      { selector: ".faq-grid .faq-item:nth-child(4) h3", key: "polling.faq.item4.question" },
      { selector: ".faq-grid .faq-item:nth-child(4) p", key: "polling.faq.item4.answer" }
    ]
  };

  function applyAllTranslations() {
    syncPageContext();
    applyDataTranslations(doc);
    applyBindings(doc, commonBindings);
    applyBindings(doc, pageBindings[page] || []);
    localizeLinks();
    setupLanguageSwitcher();
  }

  var api = {
    locale: locale,
    page: page,
    routes: routeMap,
    t: t,
    ready: fetch("/assets/i18n/" + locale + ".json")
      .then(function (response) {
        return response.ok ? response.json() : {};
      })
      .catch(function () {
        return {};
      })
      .then(function (nextMessages) {
        messages = nextMessages || {};

        if (doc.readyState === "loading") {
          doc.addEventListener("DOMContentLoaded", applyAllTranslations, { once: true });
        } else {
          applyAllTranslations();
        }

        window.dispatchEvent(new CustomEvent("i18n:ready", {
          detail: { locale: locale, page: page }
        }));

        return messages;
      }),
    apply: applyAllTranslations
  };

  window.GamepadI18n = api;
})();
  function syncPageContext() {
    body = doc.body;
    page = body && body.dataset && body.dataset.page ? body.dataset.page : "home";
    api.page = page;
  }
