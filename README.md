# Do Not Press

**Do Not Press** is a small meme-inspired clicker/tycoon game built for the CashFactories developer test assignment. The player is punished for pressing buttons, earns Press Energy by destroying them, buys persistent upgrades, and gradually becomes strong enough to survive increasingly dangerous boss stages.

> Project status: playable frontend MVP. The complete run loop, four boss stages, stage-scaled targets, five purchasable progression options, persistent local saving, responsive UI, sound effects, and background music are implemented. Random events, a dedicated final victory flow, screenshots, and backend persistence are planned.

## Live demo

[Play the current Netlify build](https://deluxe-conkies-fd1d1b.netlify.app/)

## Game concept

The game starts with a warning: **do not press**. Pressing starts a run in which the player's finger continuously loses health.

The player must:

1. Hunt small buttons that appear at random positions.
2. Destroy them to earn Press Energy.
3. Survive until a boss button appears.
4. Decide whether to attack the boss or keep farming small buttons.
5. Lose, purchase permanent upgrades, and try again.
6. Defeat a boss to unlock the next, harder stage.

The intended experience is intentionally punishing: the first runs focus on resource gathering, and reaching a boss does not mean the player is ready to defeat it.

## Implemented features

- Randomly positioned small buttons with individual durability bars.
- Continuous spawning during both the preparation and boss phases.
- Four configured boss tiers with different durability, damage, rewards, colors, and meme-themed messages.
- Stage scaling that increases small-button durability and rewards after each defeated boss.
- Continuous finger-health drain instead of one large damage tick per second.
- Press Power upgrade that increases damage per click.
- Finger Health upgrade that increases health available for every run.
- Button Spawn Rate upgrade with multiple levels and a maximum level.
- One-time Chain Lightning unlock that damages the nearest additional small target and renders a short SVG lightning effect.
- Consumable Finger Repair Kits that restore 50% of maximum health during an active run.
- Increasing upgrade prices based on the purchased level.
- Press Energy that remains available between runs.
- Persistent currency, upgrade levels, unlocked mechanics, and repair-kit inventory after page reloads.
- Three-second recovery cooldown after losing a run.
- Stage-complete intermissions between bosses.
- Button press, shake, fade, and destruction feedback.
- Pointer Capture input handling, so a press remains reliable even while the button moves during its pressed animation.
- Generated break sound using the Web Audio API.
- Looping background music during active gameplay, paused during intermissions and cooldowns.
- Responsive desktop/mobile layout.
- Production build and manual Netlify deployment.

## Core game logic

### Runs and phases

The UI is controlled by a small phase state machine:

- `waiting`: the player has not started yet.
- `smallButtons`: small targets spawn while health drains.
- `boss`: the boss appears and small targets continue spawning.
- `stageComplete`: damage and music pause while the player chooses to continue to the next stage.
- `cooldown`: the run has ended and restart is temporarily disabled.

Temporary run data, such as current health, active targets, button durability, and phase, is held in React state. A new run resets this temporary state but does not remove permanent progression.

### Economy

Press Energy is currently earned by destroying small buttons and bosses. It can be spent only when a run is not active. Small targets become tougher and more rewarding in later stages, while bosses act as progression gates and provide larger milestone rewards.

- **Press Power** gains `+1` damage per purchased level.
- **Finger Health** increases maximum health for every future run.
- **Button Spawn Rate** has several configured tiers that shorten the interval between targets.
- **Chain Lightning** is a one-time unlock that deals 50% of the original press damage to the nearest valid small target.
- **Finger Repair Kit** is a consumable that restores 50% of maximum health; its price rises with the number currently owned.
- Power and health upgrade prices currently follow a simple linear rule: `base cost × (current level + 1)`.

All balance values are centralized in `src/data/gameConfig.js` and are still being play-tested. Some current health, spawn-rate, damage, and reward values are deliberately exaggerated for rapid development testing. The intended final balance should make early progress difficult without turning repeated attempts into idle grinding.

## Data storage

The prototype uses browser `localStorage`, which satisfies the current need for a simple structured local save without requiring an account or server.

Saved keys:

- `energy`
- `powerLevel`
- `healthLevel`
- `spawnSpeedLevel`
- `hasChainLightning`
- `healItemCount`

The save belongs to one browser and one website origin. It is not synchronized between devices, browsers, localhost, or different Netlify deploy URLs.

No personal data, password, or secret key is stored. A manual reset option will be added before the save system is considered complete.

## Technology

- React 19
- JavaScript and JSX
- Vite 8
- CSS animations and responsive media queries
- Browser `localStorage`
- Web Audio API
- Netlify for the current deployment

The first prototype intentionally keeps the stack small. It has no runtime AI dependency, external API, backend, or database yet.

## Project structure

```text
do-not-press/
├── public/
│   └── audio/             # Background music files
├── src/
│   ├── components/
│   │   └── LightningEffect.jsx # SVG chain-lightning presentation
│   ├── data/
│   │   └── gameConfig.js  # Bosses, upgrades, rewards, and balance values
│   ├── utils/
│   │   ├── audio.js       # Web Audio sound helpers
│   │   ├── buttonUtils.js # Target creation and stage scaling
│   │   └── lightning.js   # Target selection and lightning geometry
│   ├── App.jsx            # Game state, phase transitions, actions, and UI
│   ├── main.jsx           # React entry point
│   └── styles.css         # Layout, responsive styles, and animations
├── index.html
├── package.json
└── vite.config.js
```

The main state machine and player actions remain in `App.jsx`, while balance configuration, reusable effects, audio helpers, target creation, and lightning calculations have been separated into focused files. This keeps the current loop readable without introducing a large architecture too early.

## Running locally

### Requirements

- Node.js `20.19+` or `22.12+`
- npm

### Installation

```bash
git clone <repository-url>
cd do-not-press
npm install
```

### Development server

```bash
npm run dev
```

Open the local URL printed by Vite, usually `http://localhost:5173`.

### Production build

```bash
npm run build
```

The deployable static files are generated in `dist/`.

## Deployment

The current version is deployed manually to Netlify:

1. Run `npm run build`.
2. Open the existing Netlify project's **Deploys** page.
3. Upload the generated `dist` folder.

No environment variables are required for the frontend prototype.

## AI usage

AI tools were used as a development assistant, not as a runtime feature of the game. ChatGPT and Codex helped with:

- Comparing the assignment options and shaping the game concept.
- Breaking implementation into small, understandable steps.
- Explaining React hooks, timers, state updates, browser audio, and CSS animations.
- Suggesting and debugging gameplay behavior.
- Reasoning about economy and balance values.
- Reviewing the current implementation and drafting documentation.

Changes were applied incrementally, reviewed manually, and tested in the browser. No AI-generated result was accepted as an opaque final solution, and the deployed game does not send player data to an AI service.

## Roadmap

### Phase 1 - Complete the required game content

- Add at least one more permanent mechanic-changing upgrade, such as an auto-clicking bot or temporary shield, so the upgrade requirement does not depend on counting the consumable Repair Kit.
- Refine the existing Spawn Rate, Chain Lightning, Press Power, Finger Health, and Repair Kit economy.
- Add at least three meme-themed events: a reward, a crisis/penalty, and a surprising stage modifier.
- Add a proper final victory state after the fourth boss instead of repeating the last configured stage.
- Add a visible save reset action with confirmation.
- Continue economy balancing using short play-test sessions.

### Phase 2 - Improve progression and presentation

- Add more small-button types with different behavior, rewards, and risk.
- Add clearer stage identities, boss introductions, and progression feedback.
- Replace temporary development balance values with play-tested values.
- Improve mobile interaction and accessibility.
- Add screenshots under `docs/screenshots/` before final submission.
- Add focused tests for economy calculations, upgrades, persistence, and phase transitions.

### Phase 3 - Backend and database

The planned full-stack version will keep `localStorage` as a guest fallback and add a small Django REST Framework API with PostgreSQL.

Possible stored entities:

- Player profile.
- Save-game snapshot and version.
- Purchased upgrades.
- Completed/failed run summaries.
- Triggered event history.
- Server-managed game configuration and balance values.

Initial API responsibilities would be loading/saving progress, recording completed runs, and returning game configuration. Authentication can be added only when cross-device accounts are needed.

### Phase 4 - Internal management interface

An optional Django Admin or small internal dashboard could allow an administrator to change upgrade costs, boss parameters, rewards, and event probabilities without editing frontend code. This phase would demonstrate a practical backend/admin workflow while keeping the public game simple.

## Monetization concepts

No real payment integration is implemented. Possible non-blocking monetization ideas are:

1. Cosmetic packs for fingers, cursors, buttons, effects, and chamber themes.
2. Optional rewarded ads that grant a temporary shield, revive, or short automation boost.
3. Paid themed content packs or a supporter edition with new meme worlds and bosses, without selling raw permanent power.

The core game should remain playable without payment, and monetization should not hide required progression behind purchases.

## Current limitations

- The shop currently has four permanent progression systems plus one consumable item; another permanent mechanic-changing upgrade is still planned.
- Random events are not implemented yet.
- The fourth boss does not yet lead to a dedicated victory screen.
- Persistence is local to one browser and has no reset button yet.
- There is no backend, database, account synchronization, or admin interface yet.
- Automated tests and repository screenshots still need to be added.
- Game balance is provisional and will change after more play-testing.

## Audio credit

Background music: **"Monkeys Spinning Monkeys" by Kevin MacLeod**  
Source: [Incompetech](https://incompetech.com/music/royalty-free/?isrc=USUAN1400011)  
License: [Creative Commons Attribution 4.0](https://creativecommons.org/licenses/by/4.0/)

## Author

[Khalil Abboud](https://github.com/Khalil-Abboud)
