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

// 2. PADS (4x4 Grid starting at y=1)
// Explicit note map matching the Korg padKontrol factory Scene 16 (GM Drum layout).
// Each row is [col0, col1, col2, col3] from left to right.
// The script auto-selects Scene 16 on activation (see mOnActivate below).
var noteMap = [
    // Row 1 - Top (Pads 1-4): Mute, Solo, Channel Editor
    [49, 57, 53, 51],
    // Row 2 (Pads 5-8): Macros
    [48, 47, 45, 43],
    // Row 3 (Pads 9-12): Prev/Next Track, Undo/Redo
    [37, 39, 56, 44],
    // Row 4 - Bottom (Pads 13-16): Transport
    [36, 40, 42, 46]
]

var pads = []

// Row 1 (Pads 1-4): Toggle Buttons for Mute, Solo, and Channel Editor.
// TriggerPad sends 0 on note-off which would immediately reset the state;
// a toggle Button only changes state on note-on and ignores note-off.
for (var col = 0; col < 4; col++) {
    var btn = surface.makeButton(col, 1, 1, 1)
    btn.setTypeToggle()
    btn.mSurfaceValue.mMidiBinding.setInputPort(midiInput).bindToNote(9, noteMap[0][col])
    pads.push(btn)
}

// Rows 2-4 (Pads 5-16): standard TriggerPads
for (var row = 1; row < 4; row++) {
    for (var col = 0; col < 4; col++) {
        var pad = surface.makeTriggerPad(col, row + 1, 1, 1)
        pad.mSurfaceValue.mMidiBinding.setInputPort(midiInput).bindToNote(9, noteMap[row][col])
        pads.push(pad)
    }
}

// Pad-to-index mapping:
//   Row 1: pads[0..3]  = Pads 1-4   (Mute, Solo, Channel Editor, —)
//   Row 2: pads[4..7]  = Pads 5-8   (Macros)
//   Row 3: pads[8..11] = Pads 9-12  (Prev/Next Track, Undo/Redo)
//   Row 4: pads[12..15] = Pads 13-16 (Play, Record, Stop, Cycle)

// 3. HOST MAPPING
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

// 4. OUTPUT BINDINGS - enable Cubase to send state feedback to transport pads
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
