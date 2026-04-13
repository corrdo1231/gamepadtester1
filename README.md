# Gamepad Tester

A free, browser-based gamepad and controller testing tool. Test buttons, analog sticks, triggers, vibration, and stick drift — no download, no login, no tracking.

## Features

- **All buttons** — every face, shoulder, trigger, D-pad, and stick click lights up in real time
- **Analog sticks** — XY axis position shown as a moving dot with numeric readout
- **Stick drift monitor** — resting offset measured per axis; flags values above 2%
- **Trigger pressure** — full 0–100% range for LT and RT as live fill bars
- **Vibration** — light, medium, heavy, and pulse rumble patterns (Chrome/Edge on Windows)
- **Input latency** — approximate round-trip detection time in milliseconds
- **Controller info** — ID string, axis/button count, mapping type

## How it works

Uses the standard browser [Gamepad API](https://developer.mozilla.org/en-US/docs/Web/API/Gamepad_API) (`navigator.getGamepads()`). All processing happens locally in your browser. No data is sent to any server.

## Supported controllers

- PlayStation: PS5 DualSense, PS4 DualShock, PS3
- Xbox: Series X/S, One, 360 (wired or adapter)
- Nintendo: Switch Pro Controller, Joy-Con (paired)
- Generic USB and Bluetooth HID gamepads

## Browser support

| Feature | Chrome | Edge | Firefox | Safari |
|---|---|---|---|---|
| Button/axis detection | ✅ | ✅ | ✅ | ⚠️ partial |
| Vibration | ✅ | ✅ | ❌ | ❌ |
| Mobile | ✅ Android | ✅ Android | ❌ | ❌ |

## Pages

- `index.html` — main tester UI
- `about.html` — how it works, supported controllers, browser compatibility
- `contact.html` — bug reports and feature requests
- `privacy.html` — privacy policy (no data collected)
- `terms.html` — terms of service

## License

MIT
