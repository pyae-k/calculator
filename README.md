# CalcKit

Offline calculator toolkit: standard, scientific, unit conversion, and health calculators.

## Features
- Standard and scientific calculators
- Unit conversion
- Health calculators
- Offline-first PWA

## Run Locally
This is a PWA and uses a Service Worker, so it requires an HTTP origin (not `file://`).

```bash
python3 -m http.server 8000
# Then open http://localhost:8000
```

## Deploy to GitHub Pages
1. Push this repository to GitHub.
2. Go to **Settings → Pages**.
3. Select **GitHub Actions** (or **Deploy from a branch**) as the build source.

## License
MIT — Free to use, modify, and distribute.
