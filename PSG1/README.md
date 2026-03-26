# PSG1 Hardware Resources — PADSIM PSG1

This folder contains PSG1 hardware references, packaging helpers, and PlayGate submission
asssets for deploying a web game to the PSG1.

## Files

- `CONTROLLER_MAP.md` — Official PSG1 button layout + PADSIM PSG1 Gamepad API index mapping
- `PLAYGATE.md` — PlayGate submission guide (playgate.playsolana.com)
- `twa-manifest.json` — TWA manifest configured for PSG1 screen dimensions (1240×1080)
- `build-psg1.ps1` — PowerShell helper to build a TWA APK via Bubblewrap

## What is PlayGate?

**PlayGate** is the official game submission portal for the PSG1, run by Play Solana.
Submit your game at: https://playgate.playsolana.com/

The PSG1 player base is 10,000+ devices. Submitting gets your game in front of
15+ Solana communities.

## Building the APK

Run `build-psg1.ps1` from this folder. Requires:
- Java (JDK 11+)
- Android SDK / Bubblewrap CLI (`npm i -g @bubblewrap/cli`)

The TWA wraps your web game URL and targets PSG1 screen dimensions.
