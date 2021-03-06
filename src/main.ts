import { PLEN5Stack, ServoAngles8 } from 'plen5stack'
import Timer from 'timer'
import type { Monitor } from 'pins/digital'
import { Application, Label, Style, Skin } from 'piu/MC'
import Sound from 'piu/Sound'

declare function trace(message: unknown): void
declare const button: {
  a: Monitor
  b: Monitor
  c: Monitor
}

const helloSound = new Sound({
  path: 'goodAfternoon.wav',
})
const niceToMeetYouSound = new Sound({
  path: 'niceToMeetYou.wav',
})
const implenSound = new Sound({
  path: 'implen.wav',
})
const actions: [number, Sound, string][] = [[0x08, niceToMeetYouSound, 'Greeting']]

const motionLabel = new Label(null, {
  top: 0,
  bottom: 0,
  left: 0,
  right: 0,
  skin: new Skin({
    fill: 'black',
  }),
  style: new Style({
    color: 'white',
    font: 'OpenSans-Regular-16',
  }),
  string: '',
})
const ap = new Application(null, {
  contents: [motionLabel],
})
function updateMotionLabel(i: number) {
  motionLabel.string = `Motion: 0x${i.toString(16).toUpperCase()}`
}

const plen5Stack = new PLEN5Stack()
plen5Stack.setEyeColor(0, 255, 0)

const anglesA = [0, 0, 0, 0, 0, 0, 0, 0] as ServoAngles8
const anglesB = [900, 0, 0, 0, 0, 0, 0, 0] as ServoAngles8
const flag = false

/*
Timer.repeat(() => {
  flag = !flag
  const angles = flag ? anglesA : anglesB
  plen5Stack.setAngle(angles, 500)
}, 1000)
*/

let i = 0x08
updateMotionLabel(i)
button.a.onChanged = function () {
  if (this.read()) {
    i -= 1
    updateMotionLabel(i)
    trace(`motion: ${i}\n`)
  }
}
button.b.onChanged = function () {
  if (this.read()) {
    // plen5Stack.playMotion(i)
    helloSound.play()
    plen5Stack.playMotion(0x08)
    Timer.delay(500)
    implenSound.play()
    plen5Stack.playMotion(0x06)
    Timer.delay(500)
    niceToMeetYouSound.play()
    plen5Stack.playMotion(0x05)
  }
}
button.c.onChanged = function () {
  if (this.read()) {
    i += 1
    updateMotionLabel(i)
    trace(`motion: ${i}\n`)
  }
}
