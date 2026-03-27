# PSG1 Hardware Resources — PADSIM PSG1

This folder contains PSG1 hardware references and PlayGate submission guidance
for deploying a web game to the PSG1 console.

## Files

- `CONTROLLER_MAP.md` — Official PSG1 button layout + PADSIM PSG1 Gamepad API index mapping
- `PLAYGATE.md` — PlayGate submission guide (playgate.playsolana.com)

## What is PlayGate?

**PlayGate** is the official game submission portal for the PSG1, run by Play Solana.
Submit your game at: https://playgate.playsolana.com/

## Submitting Your Game

See `PLAYGATE.md` for the full submission checklist.

For TWA/APK packaging:
- Install Bubblewrap CLI: `npm i -g @bubblewrap/cli`
- Requires JDK 11+ and Android SDK
- Target screen resolution: 1240×1080 (PSG1 portrait dimensions)
