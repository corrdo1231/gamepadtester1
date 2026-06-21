(function () {
  var STORAGE_KEY = "gamepadtester-theme";
  var root = document.documentElement;
  var mediaQuery = window.matchMedia ? window.matchMedia("(prefers-color-scheme: dark)") : null;

  function readPreference() {
    try {
      return localStorage.getItem(STORAGE_KEY) || "system";
    } catch (error) {
      return "system";
    }
  }

  function writePreference(value) {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch (error) {
      // Ignore storage failures.
    }
  }

  function systemTheme() {
    return mediaQuery && mediaQuery.matches ? "dark" : "light";
  }

  function resolveTheme(preference) {
    return preference === "system" ? systemTheme() : preference;
  }

  function nextPreference(current) {
    if (current === "system") {
      return "light";
    }
    if (current === "light") {
      return "dark";
    }
    return "system";
  }

  function titleCase(value) {
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  function updateControls(preference, effectiveTheme) {
    var label = preference === "system" ? "Auto" : titleCase(preference);
    var icon = effectiveTheme === "dark" ? "\u263E" : "\u2600";
    var description = preference === "system"
      ? "Theme: System (" + titleCase(effectiveTheme) + "). Click to cycle to Light."
      : "Theme: " + titleCase(preference) + ". Click to cycle.";

    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.setAttribute("title", description);
      button.setAttribute("aria-label", description);

      var iconNode = button.querySelector("[data-theme-icon]");
      var labelNode = button.querySelector("[data-theme-label]");

      if (iconNode) {
        iconNode.textContent = icon;
      }

      if (labelNode) {
        labelNode.textContent = label;
      }
    });
  }

  function applyTheme(preference) {
    var effectiveTheme = resolveTheme(preference);
    root.setAttribute("data-theme", effectiveTheme);
    root.setAttribute("data-theme-source", preference);
    if (document.body) {
      document.body.setAttribute("data-theme", effectiveTheme);
      document.body.setAttribute("data-theme-source", preference);
    }
    updateControls(preference, effectiveTheme);
  }

  function handleToggleClick() {
    var current = root.getAttribute("data-theme-source") || readPreference();
    var next = nextPreference(current);
    writePreference(next);
    applyTheme(next);
  }

  applyTheme(readPreference());

  document.addEventListener("DOMContentLoaded", function () {
    applyTheme(readPreference());

    document.querySelectorAll("[data-theme-toggle]").forEach(function (button) {
      button.addEventListener("click", handleToggleClick);
    });
  });

  if (mediaQuery) {
    var handleSystemChange = function () {
      if ((root.getAttribute("data-theme-source") || readPreference()) === "system") {
        applyTheme("system");
      }
    };

    if (typeof mediaQuery.addEventListener === "function") {
      mediaQuery.addEventListener("change", handleSystemChange);
    } else if (typeof mediaQuery.addListener === "function") {
      mediaQuery.addListener(handleSystemChange);
    }
  }
})();
