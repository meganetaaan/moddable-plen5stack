import { PLEN5Stack } from 'plen5stack'
import Timer from 'timer'

const plen5Stack = new PLEN5Stack()
Timer.delay(100)
plen5Stack.setEyeColor(0, 255, 0)

const offset = 40
const TICK = 8
let r = 0
Timer.repeat(() => {
  r = (r + 1) % 200
  const v = offset + Math.floor(Math.sin((Math.PI * r) / 100) * 30)
  plen5Stack.servoWrite(0, v)
}, TICK)
