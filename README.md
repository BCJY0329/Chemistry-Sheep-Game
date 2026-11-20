# Chemistry Sheep – SK025 Functional Groups (Phase 1, offline)

A Sheep-a-Sheep style matching game. Collect the 4 cards of one homologous series
(Name, Functional group, General formula, Example) to clear them from the tray.

## Run it
- **Quickest:** double-click `index.html`. It opens in your browser and needs no internet or install.
- **In Antigravity:** open this folder, then open `index.html` with a live-preview or Live Server extension.
  To test on your phone, run the preview on your network or copy the folder to the phone and open `index.html`.

## Files
| File | What it holds |
|---|---|
| `index.html` | Page layout: all screens |
| `css/styles.css` | Look and feel, plus the 4 themes (lab, minimal, garden, notebook) |
| `js/data.js` | **Chemistry content:** the 14 series. Edit cards here |
| `js/engine.js` | Game rules: layers, covering, tray, matching, undo, hint, shuffle, solvable boards, modes |
| `js/ui.js` | Screens, animations, timer, sound, saved records |
| `js/deco.js` | Background art for each theme and the board-shape plate under the cards |
| `tests/engine.test.js` | Logic tests: `node tests/engine.test.js` |

## Where to change things
- **Cards / series:** `js/data.js` (`_{...}` makes a subscript, e.g. `C_{n}H_{2n+1}OH`).
- **Mode sizes, undos (3), hints (3), shuffles (1):** the `MODES` table at the top of `js/engine.js`.
- **Board shapes** (Square, Diamond, Pyramid, Circle, Hexagon, Flask – one picked at random each round): add more in `SHAPES` in `js/engine.js`.
- **New theme:** add its name to `THEMES` in `js/engine.js`, a `.theme-<name>` block in `css/styles.css`, and its doodles in `ART` in `js/deco.js`.

## Saved data
Wins, unlocks, best times and recent rounds are saved in the browser (localStorage) on each device.
Clearing browser data resets them. Online ranking and Battle are planned for Phase 2.

## Install it as a phone app (PWA)
The game is an installable web app: once it is online, students open the link and tap **Install app**
(Android/Chrome) or **Share → Add to Home Screen** (iPhone/Safari). It gets its own icon, opens full screen,
and works offline. Installing needs an `https://` link, so put the folder online first, for free:

**GitHub Pages**
1. Create a public repository on github.com (e.g. `chemistry-sheep`) and upload everything *inside* this folder.
2. Repository → **Settings → Pages** → Source: *Deploy from a branch* → branch `main`, folder `/ (root)` → Save.
3. After about a minute your link is `https://<your-username>.github.io/chemistry-sheep/`. Open it on the phone and install.

**Netlify (drag and drop):** go to app.netlify.com/drop and drop this folder; it gives you an https link.

**After changing any game file:** raise `VERSION` in `sw.js` (e.g. `chemsheep-v2`) and upload again,
so installed apps pick up the update.
