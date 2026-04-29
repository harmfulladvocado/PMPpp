# Pelckmans Portaal ++
A Chromium extension for applying custom themes on Pelckmans Portaal.
It lets you switch between themes and control persistence, so the platform looks and feels the way you want it to.

## What it does
- Applies the Midnight Sapphire theme across the login page and dashboard
- Injects a floating `P++` settings button to switch themes and toggle persistence
- Saves your preferences with Chrome sync storage
- Enforces theme persistence on SPA DOM changes

## Installation
**Chromium-based browsers (Chrome, Brave, Edge):**
1. Run `git clone https://github.com/harmfulladvocado/PMPpp` or download this repo as a zip
2. Open your extensions page:
   - Chrome: `chrome://extensions/`
   - Brave: `brave://extensions/`
   - Edge: `edge://extensions/`
3. Enable **Developer mode**
4. Click **Load unpacked**
5. Select the project folder
6. Enjoy!

## Usage
1. Open [id.pelckmans.be](https://id.pelckmans.be/nl/login/p)
2. The theme applies automatically on page load
3. Click the `P++` button to switch themes or adjust persistence settings

## Notes
- The extension does not bypass authentication
- Styling is applied inside the authenticated browser session only
