# Pelckmansportaal ++

Pelckmansportaal ++ is a Chromium extension that applies multiple themes on Pelckmans Portaal.

## What this project includes

- Clean MV3 setup with only required permissions.
- Login page theme with your background image: `Midnight_sapphire.png`.
- Compact centered login card natively applied (smpp-inspired style, original implementation).
- Top-right in-page floating settings button (`P++`) to switch theme and set persistence.

## How it works

- `background.js` sets default config in `chrome.storage.sync` on install and listens to cookies to enforce persistency.
- `content.js` reads settings, injects the settings menu, applies classes, and updates UI on SPA DOM changes.
- `inject.css` contains all Midnight Sapphire styling for:
  - login (`id.pelckmans.be/.../login/...`)
  - dashboard readability tweaks (`.orb__title`, `.row.user-modules`, `.panel`)

## Sideload for testing (Chrome / Edge / Brave)

1. Open extension management page:
   - Chrome: `chrome://extensions`
   - Edge: `edge://extensions`
   - Brave: `brave://extensions`
2. Enable **Developer mode**.
3. Click **Load unpacked**.
4. Select this folder: `C:\Users\victor.bonte\Documents\Projects\PMPpp`.
5. Open `https://id.pelckmans.be/nl/login/p` and test the on-page settings menu via the `P++` button.

## Notes

- The extension does not bypass authentication.
- Styling is applied inside the authenticated browser session only.
