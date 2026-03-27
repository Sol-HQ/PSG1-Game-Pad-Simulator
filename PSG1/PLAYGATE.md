# PlayGate Submission Guide

> **PlayGate** is Play Solana's official game publishing portal for the PSG1.
> Submit your game at: https://playgate.playsolana.com/

## What is PlayGate?

PlayGate is how developers get their games featured on the PSG1. Once approved,
your game is available to PSG1 owners across the Solana gaming community.

## PSG1 Hardware Quick Reference

| Spec | Value |
|------|-------|
| Screen resolution | 1240 × 1080 |
| Physical screen size | 3.92" diagonal |
| Touch | Multi-touch capacitive |
| Buttons | A (right/confirm), B (bottom/back), X (top/secondary), Y (left/action) |
| Shoulder buttons | L1, R1 only — **no L2/R2 triggers** |
| Sticks | Left stick (cursor/nav), Right stick (scroll), L3, R3 (click) |
| D-pad | 4-directional |
| Other | Start, Select, Home |

## Before You Submit — Test with PADSIM PSG1

Add `?gp` to any URL in your game. The PADSIM overlay appears in the lower corner.
Every button fires the same events as real PSG1 hardware. Use this to verify:

- All buttons respond correctly (A=confirm, B=back, Y=action, X=secondary)
- D-pad and sticks navigate your game as expected
- No L2/R2 inputs required anywhere (PSG1 has no triggers)
- Screenshots taken at 1240×1080 match what players will see on device

## Submission Checklist

1. **Test with PADSIM PSG1** — `?gp` overlay in your browser at 1240×1080 viewport
2. **App icon** — 512×512 PNG
3. **Cover image** — recommended 1200×600 (verify at PlayGate portal for current requirements)
4. **Screenshots** — captured at PSG1 resolution (1240×1080), simulator or device
5. **Privacy policy URL** — required for PlayGate submission
6. **Game description** — title, short description, long description
7. Sign in at https://playgate.playsolana.com/ and complete the submission form

## Submission Format

PlayGate accepts:
- **Web games** — hosted URL (must be HTTPS)
- **PWA** — Progressive Web App with manifest
- **TWA (Trusted Web Activity)** — APK wrapping your HTTPS game URL via Bubblewrap

Check the PlayGate portal for the latest accepted formats and requirements.
PlayGate review is handled by the Play Solana team — allow time for review.
