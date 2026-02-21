# Korg padKontrol - Cubase 13 MIDI Remote Script

This project provides a custom MIDI Remote script for the **Korg padKontrol** MIDI controller to integrate seamlessly with **Steinberg Cubase 13**.

> [!NOTE]
> This script was tested on **Cubase 13** and **macOS** using a single hardware unit with Scene 16 configured as the factory GM Drum layout. The Scene 16 note mapping is believed to match the Korg factory default, but individual units may differ. If pads trigger the wrong functions, update the `noteMap` array in `src/korg_padkontrol.js` to match your hardware.

## Features
*   **Visual Integration:** Correct 4x4 pad grid and knob layout in the Cubase Surface Editor.
*   **Mixer Control:** Knob 1 → Volume, Knob 2 → Pan of the selected track.
*   **Channel Strip & Macros (Row 1):** Pads 1-3 toggle Mute, Solo, and Channel Editor. Pad 4 triggers Quick Sketch Record macro.
*   **Devices & Tempo (Row 2):** Pad 5 taps tempo; Pads 6-8 open MixConsole 2, 3, and 4.
*   **Navigation (Row 3):** Pads 9-10 select Prev/Next track; Pads 11-12 trigger Undo/Redo.
*   **Transport (Row 4):** Pads 13-16 map to Play, Record, Stop, and Cycle with automatic icon feedback.
*   **MIDI Sync:** Optimized for MIDI Channel 10 (Scene 16 GM Drum layout).
*   **Auto Scene Select:** On activation the script sends a SysEx command to switch the padKontrol to Scene 16.

## Factory Scene 16 MIDI Mapping

All pads transmit on **MIDI Channel 10** (note-on / note-off). The note numbers follow the GM Drum layout.

### Pads

| Pad | Position    | Note     | Cubase Function       |
| --- | ----------- | -------- | --------------------- |
| 1   | Row 1 Col 1 | 49 (C#3) | Mute (selected track) |
| 2   | Row 1 Col 2 | 57 (A3)  | Solo (selected track) |
| 3   | Row 1 Col 3 | 53 (F3)  | Channel Editor toggle |
| 4   | Row 1 Col 4 | 51 (D#3) | Quick Sketch Record   |
| 5   | Row 2 Col 1 | 48 (C3)  | Tap Tempo             |
| 6   | Row 2 Col 2 | 47 (B2)  | MixConsole 2          |
| 7   | Row 2 Col 3 | 45 (A2)  | MixConsole 3          |
| 8   | Row 2 Col 4 | 43 (G2)  | MixConsole 4          |
| 9   | Row 3 Col 1 | 37 (C#2) | Prev Track            |
| 10  | Row 3 Col 2 | 39 (D#2) | Next Track            |
| 11  | Row 3 Col 3 | 56 (G#3) | Undo                  |
| 12  | Row 3 Col 4 | 44 (G#2) | Redo                  |
| 13  | Row 4 Col 1 | 36 (C2)  | Play                  |
| 14  | Row 4 Col 2 | 40 (E2)  | Record (latch)        |
| 15  | Row 4 Col 3 | 42 (F#2) | Stop                  |
| 16  | Row 4 Col 4 | 46 (A#2) | Cycle (latch)         |

### Knobs

| Knob | CC  | Cubase Function         |
| ---- | --- | ----------------------- |
| 1    | 10  | Volume (selected track) |
| 2    | 73  | Pan (selected track)    |

## Project Structure
*   `src/korg_padkontrol.js`: The main JavaScript script for the Cubase MIDI Remote API.
*   `Makefile`: Manages script validation (`verify`) and deployment (`deploy`).
*   `.github/workflows/ci.yml`: GitHub Actions workflow that runs `make verify` on every push and pull request.

## Installation
1.  Connect your Korg padKontrol to your Mac.
2.  The script automatically switches the padKontrol to **Scene 16** on activation (assumes default global MIDI channel 1).
3.  Deploy the script to the local Cubase directory (automatically validates syntax first):
    ```bash
    make deploy
    ```
4.  In Cubase 13, open the **MIDI Remote** tab in the Lower Zone and click the **Reload Scripts** button (circular arrow).
5.  If the device is not automatically detected, use the **MIDI Remote Manager** to manually add the **Korg padKontrol** surface and link it to your MIDI ports.

## Development

Validate the script syntax locally at any time:
```bash
make verify
```

`make deploy` runs `make verify` automatically, so a broken script can never be deployed. The same check runs on CI for every push and pull request.

## Debugging
You can monitor the script's activity and any potential errors by opening the **MIDI Remote Scripting Console** in Cubase (`Studio > MIDI Remote Manager > Scripts tab > Open Script Console`).

To add debug output, use `console.log()` anywhere in the script — messages appear in the console in real time:

```js
deviceDriver.mOnActivate = function (activeDevice) {
    console.log('padKontrol activated')
}

mainPage.mOnActivate = function (activeDevice) {
    console.log('Main Page activated')
}
```

You can also log inside bindings or callbacks to trace specific events:

```js
bindPad(1).toCommand(mainPage, 'Edit', 'Mute')
// To debug: temporarily add a value binding callback, or check the console
// after pressing the pad to confirm the command fires.
```
