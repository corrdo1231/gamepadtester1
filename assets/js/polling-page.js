(function () {
  var doc = document;
  var body = doc.body;

  if (!body || body.dataset.page !== "polling-rate") {
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
    selectedDuration: 5,
    testRunning: false,
    testEndsAt: 0,
    lastSignature: "",
    lastChangeTime: null,
    intervals: [],
    changeCount: 0
  };
  var elements = {
    unsupported: doc.querySelector("[data-unsupported]"),
    status: doc.querySelector("[data-status]"),
    controllerList: doc.querySelector("[data-controller-list]"),
    controllerName: doc.querySelector("[data-controller-name]"),
    controllerSlot: doc.querySelector("[data-controller-slot]"),
    leftStick: doc.querySelector("[data-stick-point='left']"),
    rightStick: doc.querySelector("[data-stick-point='right']"),
    leftDeadzone: doc.querySelector("[data-stick-deadzone='left']"),
    rightDeadzone: doc.querySelector("[data-stick-deadzone='right']"),
    leftTriggerMeter: doc.querySelector("[data-trigger-meter='left']"),
    rightTriggerMeter: doc.querySelector("[data-trigger-meter='right']"),
    pollingRate: doc.querySelector("[data-polling-rate]"),
    pollingAvg: doc.querySelector("[data-polling-avg]"),
    pollingMin: doc.querySelector("[data-polling-min]"),
    pollingMax: doc.querySelector("[data-polling-max]"),
    pollingSamples: doc.querySelector("[data-polling-samples]"),
    sessionState: doc.querySelector("[data-polling-session-state]"),
    result: doc.querySelector("[data-polling-result]"),
    note: doc.querySelector("[data-polling-note]"),
    timeLeft: doc.querySelector("[data-polling-time-left]"),
    startButton: doc.querySelector("[data-polling-start]"),
    resetButton: doc.querySelector("[data-polling-reset]"),
    durationButtons: Array.from(doc.querySelectorAll("[data-polling-duration]"))
  };

  function clamp(value, min, max) {
    return Math.min(Math.max(value, min), max);
  }

  function formatMs(value) {
    return value == null ? "--" : value.toFixed(2) + " ms";
  }

  function formatHz(value) {
    return value == null ? "0 Hz" : value.toFixed(1) + " Hz";
  }

  function setStatus(connected) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = connected ? "Controller connected" : "Press any button to connect";
    elements.status.classList.toggle("connected", connected);
    elements.status.classList.toggle("disconnected", !connected);
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

  function renderControllerList(gamepads, activePad) {
    if (!elements.controllerList) {
      return;
    }

    elements.controllerList.innerHTML = "";

    if (!gamepads.length) {
      var empty = doc.createElement("span");
      empty.className = "muted";
      empty.textContent = "Press any button to connect";
      elements.controllerList.appendChild(empty);
      return;
    }

    gamepads.forEach(function (pad) {
      var chip = doc.createElement("button");
      chip.type = "button";
      chip.className = "controller-chip" + (activePad && activePad.index === pad.index ? " active" : "");
      chip.textContent = "P" + (pad.index + 1);
      chip.title = pad.id || "Connected controller";
      chip.addEventListener("click", function () {
        state.selectedIndex = pad.index;
      });
      elements.controllerList.appendChild(chip);
    });
  }

  function resetButtons() {
    buttonMap.forEach(function (entry) {
      doc.querySelectorAll('[data-button="' + entry.key + '"]').forEach(function (node) {
        node.classList.remove("active");
      });
    });
  }

  function updateStick(node, x, y) {
    if (!node) {
      return;
    }

    var range = Number(node.getAttribute("data-stick-range") || 42);
    var safeX = clamp(x || 0, -1, 1);
    var safeY = clamp(y || 0, -1, 1);
    node.style.transform = "translate(" + safeX * range + "px, " + safeY * range + "px)";
  }

  function updateTrigger(side, value) {
    var clamped = clamp(value || 0, 0, 1);
    var meter = side === "left" ? elements.leftTriggerMeter : elements.rightTriggerMeter;
    var key = side === "left" ? "lt" : "rt";

    doc.querySelectorAll('[data-button="' + key + '"]').forEach(function (node) {
      node.classList.toggle("active", clamped > 0.03);
    });

    if (!meter) {
      return;
    }

    var baseY = Number(meter.getAttribute("data-base-y") || 72);
    var maxHeight = Number(meter.getAttribute("data-max-height") || 58);
    var height = maxHeight * clamped;
    var y = baseY + maxHeight - height;
    meter.setAttribute("height", String(height));
    meter.setAttribute("y", String(y));
  }

  function zeroVisualizer() {
    resetButtons();
    updateStick(elements.leftStick, 0, 0);
    updateStick(elements.rightStick, 0, 0);
    updateTrigger("left", 0);
    updateTrigger("right", 0);
  }

  function renderPad(pad, gamepads) {
    renderControllerList(gamepads, pad);
    setStatus(Boolean(pad));

    if (!pad) {
      zeroVisualizer();
      if (elements.controllerName) {
        elements.controllerName.textContent = "No controller detected";
      }
      if (elements.controllerSlot) {
        elements.controllerSlot.textContent = "--";
      }
      if (elements.startButton) {
        elements.startButton.disabled = true;
      }
      if (!state.testRunning) {
        setResult("No input detected", "Connect a controller, start the test, then move either stick continuously or press buttons during the session.");
        setSessionState("Idle");
      }
      return;
    }

    if (elements.controllerName) {
      elements.controllerName.textContent = pad.id || "Standard controller";
    }
    if (elements.controllerSlot) {
      elements.controllerSlot.textContent = "P" + (pad.index + 1);
    }
    if (elements.startButton) {
      elements.startButton.disabled = state.testRunning;
    }

    buttonMap.forEach(function (entry) {
      var button = pad.buttons && pad.buttons[entry.index];
      var value = button ? Number(button.value || 0) : 0;
      var active = Boolean(button && (button.pressed || value > 0.15));

      if (!entry.analog) {
        doc.querySelectorAll('[data-button="' + entry.key + '"]').forEach(function (node) {
          node.classList.toggle("active", active);
        });
      }
    });

    updateTrigger("left", pad.buttons && pad.buttons[6] ? pad.buttons[6].value : 0);
    updateTrigger("right", pad.buttons && pad.buttons[7] ? pad.buttons[7].value : 0);
    updateStick(elements.leftStick, pad.axes && pad.axes.length > 0 ? pad.axes[0] : 0, pad.axes && pad.axes.length > 1 ? pad.axes[1] : 0);
    updateStick(elements.rightStick, pad.axes && pad.axes.length > 2 ? pad.axes[2] : 0, pad.axes && pad.axes.length > 3 ? pad.axes[3] : 0);
  }

  function buildSignature(pad) {
    if (!pad) {
      return "";
    }

    var axes = (pad.axes || []).map(function (value) {
      return Number(value || 0).toFixed(2);
    });
    var buttons = (pad.buttons || []).map(function (button) {
      var pressed = button && button.pressed ? "1" : "0";
      var value = button ? Number(button.value || 0).toFixed(2) : "0.00";
      return pressed + ":" + value;
    });

    return axes.join(",") + "|" + buttons.join(",");
  }

  function setSessionState(text) {
    if (elements.sessionState) {
      elements.sessionState.textContent = text;
    }
  }

  function setResult(title, note) {
    if (elements.result) {
      elements.result.textContent = title;
    }
    if (elements.note) {
      elements.note.textContent = note;
    }
  }

  function updateDurationButtons() {
    elements.durationButtons.forEach(function (button) {
      button.classList.toggle("active", Number(button.getAttribute("data-polling-duration")) === state.selectedDuration);
    });
  }

  function resetMetrics() {
    state.lastSignature = "";
    state.lastChangeTime = null;
    state.intervals = [];
    state.changeCount = 0;

    if (elements.pollingRate) {
      elements.pollingRate.textContent = "0 Hz";
    }
    if (elements.pollingAvg) {
      elements.pollingAvg.textContent = "--";
    }
    if (elements.pollingMin) {
      elements.pollingMin.textContent = "--";
    }
    if (elements.pollingMax) {
      elements.pollingMax.textContent = "--";
    }
    if (elements.pollingSamples) {
      elements.pollingSamples.textContent = "0";
    }
    if (elements.timeLeft) {
      elements.timeLeft.textContent = "--";
    }
  }

  function updateMetrics() {
    var intervals = state.intervals;
    var avg = null;
    var min = null;
    var max = null;
    var hz = null;

    if (intervals.length) {
      var total = intervals.reduce(function (sum, value) {
        return sum + value;
      }, 0);
      avg = total / intervals.length;
      min = Math.min.apply(null, intervals);
      max = Math.max.apply(null, intervals);
      hz = avg > 0 ? 1000 / avg : null;
    }

    if (elements.pollingRate) {
      elements.pollingRate.textContent = formatHz(hz);
    }
    if (elements.pollingAvg) {
      elements.pollingAvg.textContent = formatMs(avg);
    }
    if (elements.pollingMin) {
      elements.pollingMin.textContent = formatMs(min);
    }
    if (elements.pollingMax) {
      elements.pollingMax.textContent = formatMs(max);
    }
    if (elements.pollingSamples) {
      elements.pollingSamples.textContent = String(state.changeCount);
    }
  }

  function classifyResult() {
    if (state.intervals.length < 2 || state.changeCount < 3) {
      return {
        label: "No input detected",
        note: "The test finished without enough changing input. Start again and keep a stick moving or press buttons during the session."
      };
    }

    var avg = state.intervals.reduce(function (sum, value) {
      return sum + value;
    }, 0) / state.intervals.length;
    var min = Math.min.apply(null, state.intervals);
    var max = Math.max.apply(null, state.intervals);
    var spread = max - min;
    var ratio = spread / Math.max(avg, 1);

    if (ratio <= 0.18 && avg <= 20) {
      return {
        label: "Excellent",
        note: "The browser-observed updates stayed frequent and tightly grouped during active input."
      };
    }

    if (ratio <= 0.45 && avg <= 28) {
      return {
        label: "Stable",
        note: "The observed update timing stayed reasonably consistent, with some normal browser-level variation."
      };
    }

    return {
      label: "Inconsistent",
      note: "The interval spread varied noticeably. That can come from browser scheduling, Bluetooth transport, adapters, or uneven input movement."
    };
  }

  function finishTest() {
    state.testRunning = false;
    setSessionState("Complete");
    if (elements.startButton) {
      elements.startButton.disabled = !choosePad(getGamepads());
    }
    if (elements.timeLeft) {
      elements.timeLeft.textContent = "0.0s";
    }

    var result = classifyResult();
    setResult(result.label, result.note);
    updateMetrics();
  }

  function startTest() {
    var pad = choosePad(getGamepads());

    if (!pad || state.testRunning) {
      return;
    }

    resetMetrics();
    state.testRunning = true;
    state.testEndsAt = performance.now() + state.selectedDuration * 1000;
    state.lastSignature = buildSignature(pad);
    state.lastChangeTime = null;

    if (elements.startButton) {
      elements.startButton.disabled = true;
    }
    setSessionState("Testing");
    setResult("No input detected", "Move either stick continuously or press buttons during the test.");
  }

  function resetTestState() {
    state.testRunning = false;
    state.testEndsAt = 0;
    resetMetrics();
    setSessionState("Idle");
    setResult("No input detected", "Connect a controller, start the test, then move either stick continuously or press buttons during the session.");
    if (elements.startButton) {
      elements.startButton.disabled = !choosePad(getGamepads());
    }
  }

  function processPolling(activePad, now) {
    if (!state.testRunning || !activePad) {
      return;
    }

    var remaining = Math.max(0, state.testEndsAt - now);
    if (elements.timeLeft) {
      elements.timeLeft.textContent = (remaining / 1000).toFixed(1) + "s";
    }

    var signature = buildSignature(activePad);

    if (signature !== state.lastSignature) {
      if (state.lastChangeTime != null) {
        state.intervals.push(now - state.lastChangeTime);
      }
      state.changeCount += 1;
      state.lastChangeTime = now;
      state.lastSignature = signature;
      updateMetrics();
    }

    if (now >= state.testEndsAt) {
      finishTest();
    }
  }

  function tick(now) {
    var gamepads = getGamepads();
    var activePad = choosePad(gamepads);

    renderPad(activePad, gamepads);
    processPolling(activePad, now || performance.now());

    state.rafId = window.requestAnimationFrame(tick);
  }

  function boot() {
    updateDurationButtons();
    resetMetrics();
    zeroVisualizer();
    resetTestState();

    if (!hasGamepadApi) {
      if (elements.unsupported) {
        elements.unsupported.classList.remove("hidden");
      }
      setStatus(false);
      if (elements.startButton) {
        elements.startButton.disabled = true;
      }
      setSessionState("Unavailable");
      setResult("No input detected", "This browser does not expose the Gamepad API, so polling rate testing cannot run here.");
      return;
    }

    elements.durationButtons.forEach(function (button) {
      button.addEventListener("click", function () {
        if (state.testRunning) {
          return;
        }
        state.selectedDuration = Number(button.getAttribute("data-polling-duration")) || 5;
        updateDurationButtons();
      });
    });

    if (elements.startButton) {
      elements.startButton.addEventListener("click", startTest);
    }

    if (elements.resetButton) {
      elements.resetButton.addEventListener("click", resetTestState);
    }

    window.addEventListener("gamepadconnected", function (event) {
      state.selectedIndex = event.gamepad.index;
    });

    window.addEventListener("gamepaddisconnected", function () {
      if (!choosePad(getGamepads()) && state.testRunning) {
        resetTestState();
      }
    });

    tick();
  }

  boot();
})();
