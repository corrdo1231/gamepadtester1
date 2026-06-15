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
    visualizer: doc.querySelector("[data-visualizer]"),
    connectedCount: doc.querySelector("[data-connected-count]"),
    controllerList: doc.querySelector("[data-controller-list]"),
    controllerName: doc.querySelector("[data-controller-name]"),
    controllerId: doc.querySelector("[data-controller-id]"),
    controllerIndex: doc.querySelectorAll("[data-controller-index]"),
    deviceConnected: doc.querySelectorAll("[data-device-connected]"),
    deviceButtons: doc.querySelectorAll("[data-device-buttons]"),
    deviceAxes: doc.querySelectorAll("[data-device-axes]"),
    mapping: doc.querySelectorAll("[data-mapping]"),
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
    leftDriftState: doc.querySelectorAll("[data-drift-state='left']"),
    rightDriftState: doc.querySelectorAll("[data-drift-state='right']"),
    recommendedDeadzone: doc.querySelector("[data-metric='recommended-deadzone']"),
    driftAxis: {
      leftX: doc.querySelectorAll("[data-drift-axis='left-x']"),
      leftY: doc.querySelectorAll("[data-drift-axis='left-y']"),
      rightX: doc.querySelectorAll("[data-drift-axis='right-x']"),
      rightY: doc.querySelectorAll("[data-drift-axis='right-y']")
    },
    triggerMeters: {
      left: doc.querySelector("[data-trigger-meter='left']"),
      right: doc.querySelector("[data-trigger-meter='right']")
    },
    axis: {
      leftX: doc.querySelectorAll("[data-axis='left-x']"),
      leftY: doc.querySelectorAll("[data-axis='left-y']"),
      rightX: doc.querySelectorAll("[data-axis='right-x']"),
      rightY: doc.querySelectorAll("[data-axis='right-y']"),
      leftTrigger: doc.querySelectorAll("[data-axis='left-trigger']"),
      rightTrigger: doc.querySelectorAll("[data-axis='right-trigger']")
    },
    buttons: new Map()
  };

  doc.querySelectorAll("[data-button]").forEach((node) => {
    const key = node.getAttribute("data-button");
    const list = elements.buttons.get(key) || [];
    list.push(node);
    elements.buttons.set(key, list);
  });

  function formatAxis(value) {
    return (Math.round(value * 1000) / 1000).toFixed(3);
  }

  function clamp(value, min, max) {
    return Math.min(max, Math.max(min, value));
  }

  function isSvgNode(node) {
    return typeof SVGElement !== "undefined" && node instanceof SVGElement;
  }

  function setText(nodes, value) {
    (Array.isArray(nodes) ? nodes : Array.from(nodes || [])).forEach((node) => {
      node.textContent = value;
    });
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

    elements.status.textContent = connected ? "Controller connected" : "Waiting for controller";
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
      empty.textContent = "Connect a controller";
      elements.controllerList.appendChild(empty);
      return;
    }

    gamepads.forEach((pad) => {
      const chip = doc.createElement("button");
      chip.type = "button";
      chip.className = "controller-chip";
      chip.textContent = `P${pad.index + 1}`;
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

    setText(elements.deviceConnected, activePad ? "Connected" : "Disconnected");

    if (!activePad) {
      if (elements.controllerName) {
        elements.controllerName.textContent = "No controller detected";
      }
      if (elements.controllerId) {
        elements.controllerId.textContent = "Waiting for browser access";
      }
      setText(elements.controllerIndex, "--");
      setText(elements.mapping, "--");
      setText(elements.deviceButtons, "0");
      setText(elements.deviceAxes, "0");
      return;
    }

    if (elements.controllerName) {
      elements.controllerName.textContent = activePad.id || "Unknown controller";
    }
    if (elements.controllerId) {
      elements.controllerId.textContent = activePad.id || "Unknown";
    }
    setText(elements.controllerIndex, `#${activePad.index}`);
    setText(elements.mapping, activePad.mapping || "raw");
    setText(elements.deviceButtons, String(activePad.buttons.length));
    setText(elements.deviceAxes, String(activePad.axes.length));
  }

  function updateButtonCard(key, button) {
    const nodes = elements.buttons.get(key);
    if (!nodes || !nodes.length) {
      return;
    }

    const value = button ? button.value : 0;
    const pressed = button ? button.pressed : false;

    nodes.forEach((node) => {
      node.classList.toggle("active", pressed || value > 0.2);
      node.style.setProperty("--pressure", clamp(value, 0, 1));

      const valueNode = node.classList.contains("button-card") ? node.querySelector("span") : null;
      if (valueNode) {
        valueNode.textContent = pressed ? `Pressed - ${value.toFixed(2)}` : `Idle - ${value.toFixed(2)}`;
      }
    });
  }

  function updateAxisNode(nodes, value) {
    (nodes || []).forEach((node) => {
      node.textContent = formatAxis(value);
    });
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

  function updateStatePill(nodes, magnitude) {
    const next = driftState(magnitude);
    (nodes || []).forEach((node) => {
      node.textContent = next.label;
      node.className = "state-pill";
      if (next.className) {
        node.classList.add(next.className);
      }
    });
  }

  function updateStick(zone, x, y) {
    if (!zone.point || !zone.deadzone) {
      return;
    }

    const safeX = clamp(x, -1, 1);
    const safeY = clamp(y, -1, 1);

    if (isSvgNode(zone.point) && isSvgNode(zone.deadzone)) {
      const deadzoneBase = Number(zone.deadzone.getAttribute("data-deadzone-base")) || 8;
      const deadzoneScale = Number(zone.deadzone.getAttribute("data-deadzone-scale")) || 34;
      const stickRange = Number(zone.point.getAttribute("data-stick-range")) || 26;
      zone.deadzone.setAttribute("r", String(deadzoneBase + state.deadzone * deadzoneScale));
      zone.point.setAttribute("transform", `translate(${safeX * stickRange} ${safeY * stickRange})`);
    } else {
      zone.deadzone.style.setProperty("--deadzone-size", `${state.deadzone * 50}%`);
      zone.point.style.transform = `translate(${safeX * 78}px, ${safeY * 78}px)`;
    }

    if (zone.x) {
      zone.x.textContent = formatAxis(x);
    }
    if (zone.y) {
      zone.y.textContent = formatAxis(y);
    }
  }

  function updateAxisSummary(leftX, leftY, rightX, rightY, leftTrigger, rightTrigger) {
    updateAxisNode(elements.axis.leftX, leftX);
    updateAxisNode(elements.axis.leftY, leftY);
    updateAxisNode(elements.axis.rightX, rightX);
    updateAxisNode(elements.axis.rightY, rightY);
    updateAxisNode(elements.axis.leftTrigger, leftTrigger);
    updateAxisNode(elements.axis.rightTrigger, rightTrigger);

    updateAxisNode(elements.driftAxis.leftX, leftX);
    updateAxisNode(elements.driftAxis.leftY, leftY);
    updateAxisNode(elements.driftAxis.rightX, rightX);
    updateAxisNode(elements.driftAxis.rightY, rightY);

    [
      { node: elements.triggerMeters.left, value: leftTrigger },
      { node: elements.triggerMeters.right, value: rightTrigger }
    ].forEach(({ node, value }) => {
      if (!node) {
        return;
      }

      const clamped = clamp(value, 0, 1);

      if (isSvgNode(node)) {
        const baseY = Number(node.getAttribute("data-base-y")) || 0;
        const maxHeight = Number(node.getAttribute("data-max-height")) || 0;
        const nextHeight = maxHeight * clamped;
        node.setAttribute("height", String(nextHeight));
        node.setAttribute("y", String(baseY + (maxHeight - nextHeight)));
      } else {
        node.style.transform = `scaleX(${clamped})`;
      }
    });

    if (elements.visualizer) {
      elements.visualizer.style.setProperty("--left-stick-x", String(clamp(leftX, -1, 1)));
      elements.visualizer.style.setProperty("--left-stick-y", String(clamp(leftY, -1, 1)));
      elements.visualizer.style.setProperty("--right-stick-x", String(clamp(rightX, -1, 1)));
      elements.visualizer.style.setProperty("--right-stick-y", String(clamp(rightY, -1, 1)));
      elements.visualizer.style.setProperty("--lt-pressure", String(clamp(leftTrigger, 0, 1)));
      elements.visualizer.style.setProperty("--rt-pressure", String(clamp(rightTrigger, 0, 1)));
    }
  }

  function zeroUi() {
    buttonMap.forEach((item) => updateButtonCard(item.key, { pressed: false, value: 0 }));

    updateAxisSummary(0, 0, 0, 0, 0, 0);
    updateStick(elements.leftStick, 0, 0);
    updateStick(elements.rightStick, 0, 0);

    if (elements.leftMagnitude) {
      elements.leftMagnitude.textContent = "0.000";
    }
    if (elements.rightMagnitude) {
      elements.rightMagnitude.textContent = "0.000";
    }
    if (elements.leftPeak) {
      elements.leftPeak.textContent = "0.000";
    }
    if (elements.rightPeak) {
      elements.rightPeak.textContent = "0.000";
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

    updateAxisSummary(leftX, leftY, rightX, rightY, leftTrigger, rightTrigger);
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
        if (elements.visualizer) {
          elements.visualizer.style.setProperty("--deadzone-threshold", String(state.deadzone));
        }
      });
      elements.deadzoneValue.textContent = formatAxis(state.deadzone);
    }

    if (elements.visualizer) {
      elements.visualizer.style.setProperty("--deadzone-threshold", String(state.deadzone));
    }

    doc.querySelectorAll(".meta-button-group .meta-button-label").forEach((node, index) => {
      node.textContent = index === 0 ? "S" : "M";
    });

    if (elements.resetDriftButton) {
      elements.resetDriftButton.addEventListener("click", function () {
        state.peak.left = 0;
        state.peak.right = 0;
      });
    }

    if (elements.refreshButton) {
      elements.refreshButton.addEventListener("click", function () {
        const pads = getGamepads();
        renderPad(choosePad(pads), pads);
      });
    }

    window.addEventListener("gamepadconnected", function (event) {
      state.selectedIndex = event.gamepad.index;
      const pads = getGamepads();
      renderPad(choosePad(pads), pads);
    });

    window.addEventListener("gamepaddisconnected", function () {
      const pads = getGamepads();
      renderPad(choosePad(pads), pads);
    });

    zeroUi();
    tick();
  }

  body.dataset.page = body.dataset.page || "index";
  boot();
})();
