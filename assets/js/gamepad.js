(function () {
  const doc = document;
  const body = doc.body;
  const hasGamepadApi = typeof navigator !== "undefined" && typeof navigator.getGamepads === "function";

  const state = {
    selectedIndex: null,
    deadzone: 0.12,
    driftThreshold: 0.12,
    peak: { left: 0, right: 0 },
    rafId: null
  };

  const buttonMap = [
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

  const elements = {
    unsupported: doc.querySelector("[data-unsupported]"),
    status: doc.querySelector("[data-status]"),
    connectedCount: doc.querySelector("[data-connected-count]"),
    controllerList: doc.querySelector("[data-controller-list]"),
    controllerName: doc.querySelector("[data-controller-name]"),
    controllerId: doc.querySelector("[data-controller-id]"),
    controllerIndex: doc.querySelector("[data-controller-index]"),
    mapping: doc.querySelector("[data-mapping]"),
    deadzoneInput: doc.querySelector("[data-deadzone-input]"),
    deadzoneValue: doc.querySelector("[data-deadzone-value]"),
    refreshButton: doc.querySelector("[data-refresh]"),
    resetDriftButton: doc.querySelector("[data-reset-drift]"),
    leftStick: {
      point: doc.querySelector("[data-stick-point='left']"),
      deadzone: doc.querySelector("[data-stick-deadzone='left']"),
      x: doc.querySelector("[data-stick-x='left']"),
      y: doc.querySelector("[data-stick-y='left']")
    },
    rightStick: {
      point: doc.querySelector("[data-stick-point='right']"),
      deadzone: doc.querySelector("[data-stick-deadzone='right']"),
      x: doc.querySelector("[data-stick-x='right']"),
      y: doc.querySelector("[data-stick-y='right']")
    },
    leftMagnitude: doc.querySelector("[data-metric='left-magnitude']"),
    rightMagnitude: doc.querySelector("[data-metric='right-magnitude']"),
    leftPeak: doc.querySelector("[data-metric='left-peak']"),
    rightPeak: doc.querySelector("[data-metric='right-peak']"),
    leftDriftState: doc.querySelector("[data-drift-state='left']"),
    rightDriftState: doc.querySelector("[data-drift-state='right']"),
    recommendedDeadzone: doc.querySelector("[data-metric='recommended-deadzone']"),
    axis: {
      leftX: doc.querySelector("[data-axis='left-x']"),
      leftY: doc.querySelector("[data-axis='left-y']"),
      rightX: doc.querySelector("[data-axis='right-x']"),
      rightY: doc.querySelector("[data-axis='right-y']"),
      leftTrigger: doc.querySelector("[data-axis='left-trigger']"),
      rightTrigger: doc.querySelector("[data-axis='right-trigger']")
    },
    buttons: new Map()
  };

  doc.querySelectorAll("[data-button]").forEach((node) => {
    elements.buttons.set(node.getAttribute("data-button"), node);
  });

  function formatAxis(value) {
    return (Math.round(value * 1000) / 1000).toFixed(3);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
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

    const preferred = gamepads.find((pad) => pad.index === state.selectedIndex);

    if (preferred) {
      return preferred;
    }

    state.selectedIndex = gamepads[0].index;
    return gamepads[0];
  }

  function setStatus(connected) {
    if (!elements.status) {
      return;
    }

    elements.status.textContent = connected ? "Controller connected" : "Waiting for a controller";
    elements.status.classList.toggle("connected", connected);
    elements.status.classList.toggle("disconnected", !connected);
  }

  function renderControllerList(gamepads) {
    if (!elements.controllerList) {
      return;
    }

    elements.controllerList.textContent = "";

    if (!gamepads.length) {
      const empty = doc.createElement("span");
      empty.className = "muted";
      empty.textContent = "Connect a controller and press any button to begin.";
      elements.controllerList.appendChild(empty);
      return;
    }

    gamepads.forEach((pad) => {
      const chip = doc.createElement("button");
      chip.type = "button";
      chip.className = "controller-chip";
      chip.textContent = `Pad ${pad.index + 1}`;
      if (pad.index === state.selectedIndex) {
        chip.classList.add("active");
      }
      chip.addEventListener("click", function () {
        state.selectedIndex = pad.index;
      });
      elements.controllerList.appendChild(chip);
    });
  }

  function updateMeta(activePad, count) {
    if (elements.connectedCount) {
      elements.connectedCount.textContent = String(count);
    }

    if (!activePad) {
      if (elements.controllerName) {
        elements.controllerName.textContent = "No controller detected";
      }
      if (elements.controllerId) {
        elements.controllerId.textContent = "Waiting for browser access";
      }
      if (elements.controllerIndex) {
        elements.controllerIndex.textContent = "--";
      }
      if (elements.mapping) {
        elements.mapping.textContent = "--";
      }
      return;
    }

    if (elements.controllerName) {
      elements.controllerName.textContent = activePad.id || "Unknown controller";
    }
    if (elements.controllerId) {
      elements.controllerId.textContent = activePad.id || "Unknown";
    }
    if (elements.controllerIndex) {
      elements.controllerIndex.textContent = `#${activePad.index}`;
    }
    if (elements.mapping) {
      elements.mapping.textContent = activePad.mapping || "raw";
    }
  }

  function updateButtonCard(key, button) {
    const node = elements.buttons.get(key);
    if (!node) {
      return;
    }

    const value = button ? button.value : 0;
    const pressed = button ? button.pressed : false;

    node.classList.toggle("active", pressed || value > 0.2);
    node.style.setProperty("--pressure", clamp(value, 0, 1));

    const valueNode = node.querySelector("span");
    if (valueNode) {
      valueNode.textContent = pressed ? `Pressed • ${value.toFixed(2)}` : `Idle • ${value.toFixed(2)}`;
    }
  }

  function updateAxisNode(node, value) {
    if (node) {
      node.textContent = formatAxis(value);
    }
  }

  function driftState(magnitude) {
    if (magnitude >= Math.max(state.driftThreshold, state.deadzone)) {
      return { label: "Potential drift", className: "danger" };
    }
    if (magnitude >= Math.max(0.05, state.deadzone * 0.5)) {
      return { label: "Slight offset", className: "warn" };
    }
    return { label: "Centered", className: "" };
  }

  function updateStatePill(node, magnitude) {
    if (!node) {
      return;
    }

    const next = driftState(magnitude);
    node.textContent = next.label;
    node.className = "state-pill";
    if (next.className) {
      node.classList.add(next.className);
    }
  }

  function updateStick(zone, x, y) {
    if (!zone.point || !zone.deadzone) {
      return;
    }

    zone.deadzone.style.setProperty("--deadzone-size", `${state.deadzone * 50}%`);
    zone.point.style.transform = `translate(${clamp(x, -1, 1) * 78}px, ${clamp(y, -1, 1) * 78}px)`;
    if (zone.x) {
      zone.x.textContent = formatAxis(x);
    }
    if (zone.y) {
      zone.y.textContent = formatAxis(y);
    }
  }

  function zeroUi() {
    buttonMap.forEach((item) => updateButtonCard(item.key, { pressed: false, value: 0 }));

    Object.keys(elements.axis).forEach((key) => updateAxisNode(elements.axis[key], 0));
    updateStick(elements.leftStick, 0, 0);
    updateStick(elements.rightStick, 0, 0);

    if (elements.leftMagnitude) {
      elements.leftMagnitude.textContent = "0.000";
    }
    if (elements.rightMagnitude) {
      elements.rightMagnitude.textContent = "0.000";
    }
    updateStatePill(elements.leftDriftState, 0);
    updateStatePill(elements.rightDriftState, 0);
  }

  function renderPad(activePad, gamepads) {
    renderControllerList(gamepads);
    updateMeta(activePad, gamepads.length);
    setStatus(Boolean(activePad));

    if (!activePad) {
      zeroUi();
      return;
    }

    buttonMap.forEach((item) => {
      updateButtonCard(item.key, activePad.buttons[item.index]);
    });

    const leftX = activePad.axes[0] || 0;
    const leftY = activePad.axes[1] || 0;
    const rightX = activePad.axes[2] || 0;
    const rightY = activePad.axes[3] || 0;
    const leftTrigger = activePad.buttons[6] ? activePad.buttons[6].value : 0;
    const rightTrigger = activePad.buttons[7] ? activePad.buttons[7].value : 0;

    updateAxisNode(elements.axis.leftX, leftX);
    updateAxisNode(elements.axis.leftY, leftY);
    updateAxisNode(elements.axis.rightX, rightX);
    updateAxisNode(elements.axis.rightY, rightY);
    updateAxisNode(elements.axis.leftTrigger, leftTrigger);
    updateAxisNode(elements.axis.rightTrigger, rightTrigger);

    updateStick(elements.leftStick, leftX, leftY);
    updateStick(elements.rightStick, rightX, rightY);

    const leftMagnitude = Math.hypot(leftX, leftY);
    const rightMagnitude = Math.hypot(rightX, rightY);
    state.peak.left = Math.max(state.peak.left, leftMagnitude);
    state.peak.right = Math.max(state.peak.right, rightMagnitude);

    if (elements.leftMagnitude) {
      elements.leftMagnitude.textContent = formatAxis(leftMagnitude);
    }
    if (elements.rightMagnitude) {
      elements.rightMagnitude.textContent = formatAxis(rightMagnitude);
    }
    if (elements.leftPeak) {
      elements.leftPeak.textContent = formatAxis(state.peak.left);
    }
    if (elements.rightPeak) {
      elements.rightPeak.textContent = formatAxis(state.peak.right);
    }

    updateStatePill(elements.leftDriftState, leftMagnitude);
    updateStatePill(elements.rightDriftState, rightMagnitude);

    const recommended = clamp(Math.max(state.peak.left, state.peak.right) + 0.02, 0.06, 0.35);
    if (elements.recommendedDeadzone) {
      elements.recommendedDeadzone.textContent = formatAxis(recommended);
    }
  }

  function tick() {
    const gamepads = getGamepads();
    const activePad = choosePad(gamepads);
    renderPad(activePad, gamepads);
    state.rafId = window.requestAnimationFrame(tick);
  }

  function boot() {
    if (!hasGamepadApi) {
      if (elements.unsupported) {
        elements.unsupported.classList.remove("hidden");
      }
      setStatus(false);
      zeroUi();
      return;
    }

    if (elements.deadzoneInput && elements.deadzoneValue) {
      elements.deadzoneInput.addEventListener("input", function (event) {
        const next = Number(event.target.value) || 0.12;
        state.deadzone = clamp(next, 0.02, 0.35);
        state.driftThreshold = state.deadzone;
        elements.deadzoneValue.textContent = formatAxis(state.deadzone);
      });
      elements.deadzoneValue.textContent = formatAxis(state.deadzone);
    }

    if (elements.resetDriftButton) {
      elements.resetDriftButton.addEventListener("click", function () {
        state.peak.left = 0;
        state.peak.right = 0;
      });
    }

    if (elements.refreshButton) {
      elements.refreshButton.addEventListener("click", function () {
        renderPad(choosePad(getGamepads()), getGamepads());
      });
    }

    window.addEventListener("gamepadconnected", function (event) {
      state.selectedIndex = event.gamepad.index;
      renderPad(choosePad(getGamepads()), getGamepads());
    });

    window.addEventListener("gamepaddisconnected", function () {
      renderPad(choosePad(getGamepads()), getGamepads());
    });

    zeroUi();
    tick();
  }

  body.dataset.page = body.dataset.page || "index";
  boot();
})();
