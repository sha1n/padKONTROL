//-----------------------------------------------------------------------------
// Korg padKontrol - Cubase MIDI Remote Script
//-----------------------------------------------------------------------------

var midiremote_api = require('midiremote_api_v1')
var deviceDriver = midiremote_api.makeDeviceDriver('Korg', 'padKontrol', 'User')

var midiInput = deviceDriver.mPorts.makeMidiInput()
var midiOutput = deviceDriver.mPorts.makeMidiOutput()

deviceDriver.makeDetectionUnit()
    .detectPortPair(midiInput, midiOutput)
    .expectInputNameContains('padKONTROL')
    .expectOutputNameContains('padKONTROL')

var surface = deviceDriver.mSurface

// 1. KNOBS (span full 4-column width above the pad grid)
var knob1 = surface.makeKnob(0, 0, 2, 1)
var knob2 = surface.makeKnob(2, 0, 2, 1)

knob1.mSurfaceValue.mMidiBinding.setInputPort(midiInput).bindToControlChange(9, 10)
knob2.mSurfaceValue.mMidiBinding.setInputPort(midiInput).bindToControlChange(9, 73)

// 2. SCENE NOTE MAP
// Explicit note map matching the Korg padKontrol factory Scene 16 (GM Drum layout).
// Each row is [col0, col1, col2, col3] from left to right.
// The script auto-selects Scene 16 on activation (see mOnActivate below).
var scene = [
    // Row 1 - Top (Pads 1-4): Mute, Solo, Channel Editor
    [49, 57, 53, 51],
    // Row 2 (Pads 5-8): Macros
    [48, 47, 45, 43],
    // Row 3 (Pads 9-12): Prev/Next Track, Undo/Redo
    [37, 39, 56, 44],
    // Row 4 - Bottom (Pads 13-16): Transport
    [36, 40, 42, 46]
]

// 3. PAD HELPER FUNCTIONS

/**
 * Returns { col, row } for a 1-based pad number in a 4x4 grid.
 * Pads are numbered left-to-right, top-to-bottom:
 *   1  2  3  4  → row 1 (y=1)
 *   5  6  7  8  → row 2 (y=2)
 *   9 10 11 12  → row 3 (y=3)
 *  13 14 15 16  → row 4 (y=4)
 * y is offset by 1 because y=0 is occupied by the knobs.
 */
function getPadGridPosition(padNumber) {
    var index = padNumber - 1
    return {
        col: index % 4,
        row: Math.floor(index / 4) + 1
    }
}

/**
 * Returns the MIDI note for a given pad number in the given scene.
 * scene is a 2-D note map: 4 rows × 4 columns.
 */
function getPadNote(padNumber, scene) {
    var index = padNumber - 1
    return scene[Math.floor(index / 4)][index % 4]
}

// 4. PAD FACTORY FUNCTIONS

/**
 * Creates a toggle button pad for the given pad number and scene.
 * Toggle buttons only fire on note-on (ignoring note-off), ideal
 * for Mute / Solo / Channel Editor controls.
 */
function makeToggleButtonPad(padNumber, scene) {
    var pos = getPadGridPosition(padNumber)
    var note = getPadNote(padNumber, scene)
    var btn = surface.makeButton(pos.col, pos.row, 1, 1)
    btn.setTypeToggle()
    btn.mSurfaceValue.mMidiBinding.setInputPort(midiInput).bindToNote(9, note)
    return btn
}

/**
 * Creates a trigger pad for the given pad number and scene.
 * Trigger pads fire on both note-on and note-off.
 */
function makeTriggerPad(padNumber, scene) {
    var pos = getPadGridPosition(padNumber)
    var note = getPadNote(padNumber, scene)
    var pad = surface.makeTriggerPad(pos.col, pos.row, 1, 1)
    pad.mSurfaceValue.mMidiBinding.setInputPort(midiInput).bindToNote(9, note)
    return pad
}

// 5. PADS (4x4 Grid starting at y=1)
var pads = [
    // Row 1 (Pads 1-4): Toggle Buttons — Mute, Solo, Channel Editor
    makeToggleButtonPad(1, scene),   // Pad 1:  Mute
    makeToggleButtonPad(2, scene),   // Pad 2:  Solo
    makeToggleButtonPad(3, scene),   // Pad 3:  Channel Editor
    makeToggleButtonPad(4, scene),   // Pad 4:  (unassigned)

    // Row 2 (Pads 5-8): Trigger Pads — Macros
    makeTriggerPad(5, scene),        // Pad 5:  Quick Sketch Record
    makeTriggerPad(6, scene),        // Pad 6:  (unassigned)
    makeTriggerPad(7, scene),        // Pad 7:  (unassigned)
    makeTriggerPad(8, scene),        // Pad 8:  (unassigned)

    // Row 3 (Pads 9-12): Trigger Pads — Navigation & Edit
    makeTriggerPad(9, scene),        // Pad 9:  Prev Track
    makeTriggerPad(10, scene),        // Pad 10: Next Track
    makeTriggerPad(11, scene),        // Pad 11: Undo
    makeTriggerPad(12, scene),        // Pad 12: Redo

    // Row 4 (Pads 13-16): Trigger Pads — Transport
    makeTriggerPad(13, scene),        // Pad 13: Play
    makeTriggerPad(14, scene),        // Pad 14: Record
    makeTriggerPad(15, scene),        // Pad 15: Stop
    makeTriggerPad(16, scene),        // Pad 16: Cycle
]

// 6. HOST MAPPING
var mainPage = deviceDriver.mMapping.makePage('Main Page')
var host = mainPage.mHostAccess

// Volume & Pan (Selected Track)
var selectedTrack = host.mTrackSelection.mMixerChannel.mValue
mainPage.makeValueBinding(knob1.mSurfaceValue, selectedTrack.mVolume)
mainPage.makeValueBinding(knob2.mSurfaceValue, selectedTrack.mPan)

// Row 1: Mute, Solo, Channel Editor (Selected Track)
// Mute uses a command binding ('Edit' > 'Mute') instead of mMute value binding
// to work around a known MIDI Remote API issue with mMute on the selected track.
mainPage.makeCommandBinding(pads[0].mSurfaceValue, 'Edit', 'Mute')
mainPage.makeValueBinding(pads[1].mSurfaceValue, selectedTrack.mSolo).setTypeToggle()
mainPage.makeValueBinding(pads[2].mSurfaceValue, selectedTrack.mEditorOpen).setTypeToggle() // Pad 3: Toggle Channel Editor

// Row 2: Macros (Pads 5-8)
mainPage.makeCommandBinding(pads[4].mSurfaceValue, 'Macro', 'Quick Sketch Record') // Pad 5

// Row 3: Track navigation (Pads 9-10), Undo / Redo (Pads 11-12)
mainPage.makeActionBinding(pads[8].mSurfaceValue, host.mTrackSelection.mAction.mPrevTrack)  // Pad 9:  Prev Track
mainPage.makeActionBinding(pads[9].mSurfaceValue, host.mTrackSelection.mAction.mNextTrack)  // Pad 10: Next Track
mainPage.makeCommandBinding(pads[10].mSurfaceValue, 'Edit', 'Undo')                        // Pad 11: Undo
mainPage.makeCommandBinding(pads[11].mSurfaceValue, 'Edit', 'Redo')                        // Pad 12: Redo

// Row 4: Transport (Pads 13-16) - bind via .mValue for automatic icon feedback
var transport = host.mTransport.mValue
mainPage.makeValueBinding(pads[12].mSurfaceValue, transport.mStart)                     // Pad 13: Play
mainPage.makeValueBinding(pads[13].mSurfaceValue, transport.mRecord).setTypeToggle()    // Pad 14: Record (latch)
mainPage.makeValueBinding(pads[14].mSurfaceValue, transport.mStop)                     // Pad 15: Stop
mainPage.makeValueBinding(pads[15].mSurfaceValue, transport.mCycleActive).setTypeToggle() // Pad 16: Cycle (latch)

// 7. OUTPUT BINDINGS - enable Cubase to send state feedback to transport pads
pads[12].mSurfaceValue.mMidiBinding.setOutputPort(midiOutput)
pads[13].mSurfaceValue.mMidiBinding.setOutputPort(midiOutput)
pads[14].mSurfaceValue.mMidiBinding.setOutputPort(midiOutput)
pads[15].mSurfaceValue.mMidiBinding.setOutputPort(midiOutput)

deviceDriver.mOnActivate = function (activeDevice) {
    console.log('--- [Korg padKontrol] ACTIVE ---')

    // Switch padKontrol to Scene 16 (0x0F) via SysEx.
    // Byte breakdown: F0=SysEx, 42=Korg, 40=GlobalCh1, 6E 08=padKontrol,
    //                 1F=DataDump, 14=SceneChange, 0F=Scene16, F7=End
    midiOutput.sendMidi(activeDevice, [0xF0, 0x42, 0x40, 0x6E, 0x08, 0x1F, 0x14, 0x0F, 0xF7])
    console.log('Sent SysEx: Scene 16 selected')

    console.log('Knobs: Volume/Pan | Row 1: Mute/Solo/Editor | Row 3: Nav/Undo | Row 4: Transport')
}
