# GamepadTester.tools

Static, browser-based controller testing site built around the Gamepad API.

## Stack

- Plain HTML, CSS, and JavaScript
- No backend
- No database
- Cloudflare Pages friendly

## Local test

Use any simple static server from the project root. Examples:

```bash
python -m http.server 4173
```

Then open `http://localhost:4173`.

## Cloudflare Pages

For GitHub + Cloudflare Pages:

- Framework preset: `None`
- Build command: leave blank
- Build output directory: `.`

## Notes

- Core input loop uses `navigator.getGamepads()`
- Connection lifecycle uses `gamepadconnected` and `gamepaddisconnected`
- Live UI refresh uses `requestAnimationFrame`
