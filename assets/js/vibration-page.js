(function () {
  var doc = document;
  var body = doc.body;

  if (!body || body.dataset.page !== "vibration") {
    return;
  }

  var hasGamepadApi = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";
  var buttonMap = [
    { key: "a", index: 0 },
    { key: "b", index: 1 },
    { key: "x", index: 2 },
    { key: "y", index: 3 },
    { key: "lb", index: 4 },
    { key: "rb", index: 5 },
    { key: "lt", index: 6, analog: true },
    { key: "rt", index: 7, analog: true },
    { key: "select", index: 8 },
    { key: "start", index: 9 },
    { key: "up", index: 12 },
    { key: "down", index: 13 },
    { key: "left", index: 14 },
    { key: "right", index: 15 }
  ];
  var state = {
    selectedIndex: null,
    rafId: null,
    supportsVibration: false,
    activeSequenceToken: 0,
    isRunning: false,
    lastAvailability: ""
  };
  var elements = {
    unsupported: doc.querySelector("[data-unsupported]"),
    status: doc.querySelector("[data-status]"),
    controllerList: doc.querySelector("[data-controller-list]"),
    controllerName: doc.querySelector("[data-controller-name]"),
    controllerSlot: doc.querySelector("[data-controller-slot]"),
    support: doc.querySelector("[data-vibration-support]"),
    startButton: doc.querySelector("[data-vibration-start]"),
    statusPanel: doc.querySelector("[data-vibration-status]"),
    presetButtons: Array.from(doc.querySelectorAll("[data-vibration-preset]")),
    leftSlider: doc.querySelector("[data-vibration-left]"),
    rightSlider: doc.querySelector("[data-vibration-right]"),
    durationSlider: doc.querySelector("[data-vibration-duration]"),
    leftValue: doc.querySelector("[data-vibration-left-value]"),
    rightValue: doc.querySelector("[data-vibration-right-value]"),
    durationValue: doc.querySelector("[data-vibration-duration-value]"),
    leftStick: doc.querySelector("[data-stick-point='left']"),
    rightStick: doc.querySelector("[data-stick-point='right']"),
    leftTriggerMeter: doc.querySelector("[data-trigger-meter='left']"),
    rightTriggerMeter: doc.querySelector("[data-trigger-meter='right']")
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function toFixed(value, digits) {
    return Number(value || 0).toFixed(digits);
  }

  function setStatus(connected, text) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = text;
    elements.status.classList.toggle("connected", connected);
    elements.status.classList.toggle("disconnected", !connected);
  }

  function setMessage(text, tone) {
    if (!elements.statusPanel) {
      return;
    }

    elements.statusPanel.textContent = text;
    elements.statusPanel.classList.remove("is-success", "is-warn", "is-error", "is-busy");

    if (tone) {
      elements.statusPanel.classList.add(tone);
    }
  }

  function updateSliderLabels() {
    if (elements.leftValue && elements.leftSlider) {
      elements.leftValue.textContent = elements.leftSlider.value + "%";
    }

    if (elements.rightValue && elements.rightSlider) {
      elements.rightValue.textContent = elements.rightSlider.value + "%";
    }

    if (elements.durationValue && elements.durationSlider) {
      elements.durationValue.textContent = elements.durationSlider.value + "ms";
    }
  }

  function getGamepads() {
    if (!hasGamepadApi) {
      return [];
    }

    return Array.from(navigator.getGamepads() || []).filter(Boolean);
  }

  function choosePad(gamepads) {
    if (!gamepads.length) {
      state.selectedIndex = null;
      return null;
    }

    var preferred = gamepads.find(function (pad) {
      return pad.index === state.selectedIndex;
    });

    if (preferred) {
      return preferred;
    }

    state.selectedIndex = gamepads[0].index;
    return gamepads[0];
  }

  function supportsVibration(pad) {
    return Boolean(
      pad && (
        (pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === "function") ||
        (pad.vibrationActuator && typeof pad.vibrationActuator.pulse === "function") ||
        (Array.isArray(pad.hapticActuators) && pad.hapticActuators[0] && typeof pad.hapticActuators[0].pulse === "function")
      )
    );
  }

  function setControlsEnabled(enabled) {
    var disabled = !enabled || state.isRunning;

    if (elements.startButton) {
      elements.startButton.disabled = disabled;
    }

    elements.presetButtons.forEach(function (button) {
      button.disabled = disabled;
    });
  }

  function renderControllerList(gamepads, activePad) {
    if (!elements.controllerList) {
      return;
    }

    elements.controllerList.innerHTML = "";

    gamepads.forEach(function (pad, position) {
      var button = doc.createElement("button");
      var isActive = activePad && activePad.index === pad.index;

      button.type = "button";
      button.className = "controller-chip" + (isActive ? " active" : "");
      button.setAttribute("data-controller-select", String(pad.index));
      button.textContent = "P" + (position + 1);
      button.title = pad.id || "Connected controller";
      elements.controllerList.appendChild(button);
    });
  }

  function resetButtons() {
    buttonMap.forEach(function (entry) {
      doc.querySelectorAll('[data-button="' + entry.key + '"]').forEach(function (node) {
        node.classList.remove("active");
      });
    });
  }

  function resetTriggers() {
    [elements.leftTriggerMeter, elements.rightTriggerMeter].forEach(function (meter) {
      if (!meter) {
        return;
      }

      var baseY = Number(meter.getAttribute("data-base-y") || 72);
      var maxHeight = Number(meter.getAttribute("data-max-height") || 58);

      meter.setAttribute("height", "0");
      meter.setAttribute("y", String(baseY + maxHeight));
    });
  }

  function updateStick(node, x, y) {
    if (!node) {
      return;
    }

    var range = Number(node.getAttribute("data-stick-range") || 42);
    var clampedX = clamp(x || 0, -1, 1);
    var clampedY = clamp(y || 0, -1, 1);

    node.style.transform = "translate(" + toFixed(clampedX * range, 2) + "px, " + toFixed(clampedY * range, 2) + "px)";
  }

  function updateTrigger(side, value) {
    var clamped = clamp(value || 0, 0, 1);
    var meter = side === "left" ? elements.leftTriggerMeter : elements.rightTriggerMeter;
    var groupKey = side === "left" ? "lt" : "rt";

    doc.querySelectorAll('[data-button="' + groupKey + '"]').forEach(function (node) {
      node.classList.toggle("active", clamped > 0.03);
    });

    if (!meter) {
      return;
    }

    var baseY = Number(meter.getAttribute("data-base-y") || 72);
    var maxHeight = Number(meter.getAttribute("data-max-height") || 58);
    var height = maxHeight * clamped;
    var y = baseY + maxHeight - height;

    meter.setAttribute("height", toFixed(height, 2));
    meter.setAttribute("y", toFixed(y, 2));
  }

  function zeroVisualizer() {
    resetButtons();
    resetTriggers();
    updateStick(elements.leftStick, 0, 0);
    updateStick(elements.rightStick, 0, 0);
  }

  function renderPad(pad, gamepads) {
    renderControllerList(gamepads, pad);

    if (!pad) {
      zeroVisualizer();
      setStatus(false, "Press any button to connect");

      if (elements.controllerName) {
        elements.controllerName.textContent = "No controller detected";
      }

      if (elements.controllerSlot) {
        elements.controllerSlot.textContent = "--";
      }

      if (elements.support) {
        elements.support.textContent = "Waiting for controller";
      }

      state.supportsVibration = false;
      setControlsEnabled(false);

      if (state.lastAvailability !== "disconnected") {
        setMessage("Connect a controller with rumble support to begin testing.", "is-warn");
        state.lastAvailability = "disconnected";
      }

      return;
    }

    setStatus(true, "Controller connected");

    if (elements.controllerName) {
      elements.controllerName.textContent = pad.id || "Standard controller";
    }

    if (elements.controllerSlot) {
      elements.controllerSlot.textContent = "P" + (pad.index + 1);
    }

    state.supportsVibration = supportsVibration(pad);
    setControlsEnabled(state.supportsVibration);

    if (elements.support) {
      elements.support.textContent = state.supportsVibration ? "Supported" : "Not exposed";
    }

    if (!state.isRunning) {
      if (state.supportsVibration && state.lastAvailability !== "supported") {
        setMessage("Ready. Use a preset or send a custom dual-rumble command.", "is-success");
        state.lastAvailability = "supported";
      } else if (!state.supportsVibration && state.lastAvailability !== "unsupported") {
        setMessage("Vibration is not supported by this browser or controller.", "is-error");
        state.lastAvailability = "unsupported";
      }
    }

    buttonMap.forEach(function (entry) {
      var button = pad.buttons && pad.buttons[entry.index];
      var value = button ? Number(button.value || 0) : 0;
      var isActive = Boolean(button && (button.pressed || value > 0.15));

      if (!entry.analog) {
        doc.querySelectorAll('[data-button="' + entry.key + '"]').forEach(function (node) {
          node.classList.toggle("active", isActive);
        });
      }
    });

    updateTrigger("left", pad.buttons && pad.buttons[6] ? pad.buttons[6].value : 0);
    updateTrigger("right", pad.buttons && pad.buttons[7] ? pad.buttons[7].value : 0);
    updateStick(elements.leftStick, pad.axes && pad.axes.length > 0 ? pad.axes[0] : 0, pad.axes && pad.axes.length > 1 ? pad.axes[1] : 0);
    updateStick(elements.rightStick, pad.axes && pad.axes.length > 2 ? pad.axes[2] : 0, pad.axes && pad.axes.length > 3 ? pad.axes[3] : 0);
  }

  function wait(ms) {
    return new Promise(function (resolve) {
      window.setTimeout(resolve, ms);
    });
  }

  async function playEffect(pad, effect) {
    if (!pad) {
      return false;
    }

    var duration = clamp(Math.round(effect.duration || 120), 100, 3000);
    var strongMagnitude = clamp(Number(effect.strongMagnitude || 0), 0, 1);
    var weakMagnitude = clamp(Number(effect.weakMagnitude || 0), 0, 1);

    if (pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === "function") {
      await pad.vibrationActuator.playEffect("dual-rumble", {
        startDelay: 0,
        duration: duration,
        strongMagnitude: strongMagnitude,
        weakMagnitude: weakMagnitude
      });
      return true;
    }

    var fallbackMagnitude = Math.max(strongMagnitude, weakMagnitude);

    if (pad.vibrationActuator && typeof pad.vibrationActuator.pulse === "function") {
      await pad.vibrationActuator.pulse(fallbackMagnitude, duration);
      return true;
    }

    if (Array.isArray(pad.hapticActuators) && pad.hapticActuators[0] && typeof pad.hapticActuators[0].pulse === "function") {
      await pad.hapticActuators[0].pulse(fallbackMagnitude, duration);
      return true;
    }

    return false;
  }

  function getPresetSteps(name) {
    var presets = {
      light: {
        label: "Light preset sent.",
        steps: [{ duration: 130, strongMagnitude: 0.2, weakMagnitude: 0.14 }]
      },
      medium: {
        label: "Medium preset sent.",
        steps: [{ duration: 240, strongMagnitude: 0.48, weakMagnitude: 0.34 }]
      },
      heavy: {
        label: "Heavy preset sent.",
        steps: [{ duration: 360, strongMagnitude: 0.95, weakMagnitude: 0.72 }]
      },
      pulse: {
        label: "Pulse preset sent.",
        steps: [
          { duration: 140, strongMagnitude: 0.72, weakMagnitude: 0.22, pause: 90 },
          { duration: 140, strongMagnitude: 0.72, weakMagnitude: 0.22, pause: 40 }
        ]
      },
      heartbeat: {
        label: "Heartbeat preset sent.",
        steps: [
          { duration: 90, strongMagnitude: 0.7, weakMagnitude: 0.18, pause: 75 },
          { duration: 160, strongMagnitude: 0.95, weakMagnitude: 0.22, pause: 240 }
        ]
      },
      explosion: {
        label: "Explosion preset sent.",
        steps: [
          { duration: 90, strongMagnitude: 0.18, weakMagnitude: 0.36, pause: 25 },
          { duration: 160, strongMagnitude: 0.52, weakMagnitude: 0.48, pause: 25 },
          { duration: 320, strongMagnitude: 1, weakMagnitude: 0.82, pause: 0 }
        ]
      },
      click: {
        label: "Click preset sent.",
        steps: [{ duration: 100, strongMagnitude: 0.14, weakMagnitude: 0.24 }]
      }
    };

    return presets[name] || null;
  }

  async function runSequence(steps, label) {
    var gamepads = getGamepads();
    var pad = choosePad(gamepads);

    renderPad(pad, gamepads);

    if (!pad) {
      setMessage("Connect a controller first.", "is-warn");
      return;
    }

    if (!supportsVibration(pad)) {
      setMessage("Vibration is not supported by this browser or controller.", "is-error");
      return;
    }

    var token = ++state.activeSequenceToken;
    state.isRunning = true;
    setControlsEnabled(true);
    setMessage("Sending vibration command...", "is-busy");

    try {
      for (var i = 0; i < steps.length; i += 1) {
        if (token !== state.activeSequenceToken) {
          return;
        }

        var supported = await playEffect(pad, steps[i]);

        if (!supported) {
          setMessage("Vibration is not supported by this browser or controller.", "is-error");
          return;
        }

        if (steps[i].pause) {
          await wait(steps[i].pause);
        }
      }

      if (token === state.activeSequenceToken) {
        setMessage(label, "is-success");
        state.lastAvailability = "supported";
      }
    } catch (error) {
      setMessage("The browser rejected the vibration request.", "is-error");
    } finally {
      if (token === state.activeSequenceToken) {
        state.isRunning = false;
        setControlsEnabled(state.supportsVibration);
      }
    }
  }

  function runCustomVibration() {
    if (!elements.leftSlider || !elements.rightSlider || !elements.durationSlider) {
      return;
    }

    runSequence([{
      duration: Number(elements.durationSlider.value || 320),
      strongMagnitude: Number(elements.leftSlider.value || 0) / 100,
      weakMagnitude: Number(elements.rightSlider.value || 0) / 100
    }], "Custom vibration sent.");
  }

  function tick() {
    var gamepads = getGamepads();
    var activePad = choosePad(gamepads);

    renderPad(activePad, gamepads);
    state.rafId = window.requestAnimationFrame(tick);
  }

  function boot() {
    updateSliderLabels();
    zeroVisualizer();

    if (!hasGamepadApi) {
      if (elements.unsupported) {
        elements.unsupported.classList.remove("hidden");
      }

      setStatus(false, "Gamepad API unavailable");

      if (elements.support) {
        elements.support.textContent = "Browser unsupported";
      }

      setMessage("This browser does not expose the Gamepad API, so vibration testing cannot run here.", "is-error");
      setControlsEnabled(false);
      return;
    }

    if (elements.controllerList) {
      elements.controllerList.addEventListener("click", function (event) {
        var target = event.target;

        if (!(target instanceof HTMLElement)) {
          return;
        }

        var button = target.closest("[data-controller-select]");

        if (!button) {
          return;
        }

        state.selectedIndex = Number(button.getAttribute("data-controller-select"));
        var pads = getGamepads();
        renderPad(choosePad(pads), pads);
      });
    }

    [elements.leftSlider, elements.rightSlider, elements.durationSlider].forEach(function (input) {
      if (!input) {
        return;
      }

      input.addEventListener("input", updateSliderLabels);
    });

    elements.presetButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        var preset = getPresetSteps(button.getAttribute("data-vibration-preset"));

        if (!preset) {
          return;
        }

        runSequence(preset.steps, preset.label);
      });
    });

    if (elements.startButton) {
      elements.startButton.addEventListener("click", runCustomVibration);
    }

    window.addEventListener("gamepadconnected", function (event) {
      state.selectedIndex = event.gamepad.index;
      setStatus(true, "Controller connected");
      renderPad(choosePad(getGamepads()), getGamepads());
    });

    window.addEventListener("gamepaddisconnected", function () {
      renderPad(choosePad(getGamepads()), getGamepads());
    });

    tick();
  }

  boot();
})();
