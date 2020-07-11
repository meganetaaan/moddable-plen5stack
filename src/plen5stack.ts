import { I2C } from 'pins/i2c'
import Digital, { Monitor } from 'pins/digital'
import NeoPixel from 'neopixel'

declare function trace(message: unknown): void

/* i2c list memo
main
0x68 mpu
0x75
sub
0x48 ADC
0x6A CA9865
0x70 IP5306
0x56 eeprom
*/

export type ServoAngles8 = [number, number, number, number, number, number, number, number]
export type MotionKey = number

const TIMING_WS2812B = {
  mark: { level0: 1, duration0: 900, level1: 0, duration1: 350 },
  space: { level0: 1, duration0: 350, level1: 0, duration1: 900 },
  reset: { level0: 0, duration0: 100, level1: 0, duration1: 100 },
}
Object.freeze(TIMING_WS2812B)

// TODO: use config
const LED_PIN = 26
const LED_LENGTH = 2
const SERVO_POWER_PIN = 5
const SERVO_ADDRESS = 0x6a
const SERVO_NUM = 8
const EEPROM_ADDRESS = 0x56
const INITIAL_SERVO_ANGLE: ServoAngles8 = [1000, 630, 300, 600, 240, 600, 1000, 720]
Object.freeze(INITIAL_SERVO_ANGLE)

export class PLEN5Stack {
  /* private fields */
  #i2c: I2C = new I2C({
    address: SERVO_ADDRESS,
  })
  #eeprom: I2C = new I2C({
    address: EEPROM_ADDRESS,
  })
  #powerpin: Digital = new Digital({
    pin: SERVO_POWER_PIN,
    mode: Digital.Output,
  })
  #led: NeoPixel = new NeoPixel({
    pin: LED_PIN,
    length: LED_LENGTH,
    order: 'RGB',
    timing: TIMING_WS2812B,
  })
  #initialServoAngles: ServoAngles8 = INITIAL_SERVO_ANGLE
  #servoAngles: ServoAngles8 = [...INITIAL_SERVO_ANGLE]
  #initialized = false

  /* accessors */
  get initialized(): boolean {
    return this.#initialized
  }
  get angles(): ServoAngles8 {
    return [...this.#servoAngles]
  }

  /* private methods */
  #write8: (address: number, command: number) => void = (address, command) => {
    this.#i2c.write(address, command)
  }
  #readEEPROM: (address: number) => string = (address) => {
    this.#eeprom.write(address >> 8, address & 0xff)
    // avoid 40 bytes limit of i2c#read
    const buf1 = this.#eeprom.read(40)
    const buf2 = this.#eeprom.read(3)
    const buffer = new Uint8Array([...buf1, ...buf2])
    let str = ''
    new Uint8Array(buffer).forEach(function (byte: number) {
      str += String.fromCharCode(byte)
    })
    return str
  }

  /* public methods */
  constructor() {
    this.#powerpin.write(0) // poweroff
    this.servoInitialSet()
    this.#powerpin.write(1) // poweron
    this.#led.brightness = 64
  }
  servoWrite(index: number, degrees: number): void {
    if (!this.initialized) {
      this.initPCA9865()
    }
    const pwmVal = Math.round((degrees * 100 * 226) / 10000) + 0x66
    const highByte = pwmVal > 0xff ? 0x01 : 0x00
    this.#write8(SERVO_NUM + index * 4, pwmVal)
    this.#write8(SERVO_NUM + index * 4 + 1, highByte)
    return
  }
  initPCA9865(): void {
    this.#i2c.write(0xfe, 0x85) //PRE_SCALE
    this.#i2c.write(0xfa, 0x00) //ALL_LED_ON_L
    this.#i2c.write(0xfb, 0x00) //ALL_LED_ON_H
    this.#i2c.write(0xfc, 0x66) //ALL_LED_OFF_L
    this.#i2c.write(0xfd, 0x00) //ALL_LED_OFF_H
    this.#i2c.write(0x00, 0x01)
    this.#initialized = true
    return
  }
  servoInitialSet(): void {
    INITIAL_SERVO_ANGLE.forEach((angle, index) => {
      this.servoWrite(index, angle / 10)
    })
    return
  }
  setAngle(angles: ServoAngles8, duration: number): void {
    const steps = [0, 0, 0, 0, 0, 0, 0, 0]
    const speed = 10
    duration = duration / speed
    angles.forEach((angle, index) => {
      const target = this.#initialServoAngles[index] - angle
      if (target != angle) {
        steps[index] = (target - this.#servoAngles[index]) / duration
      }
    })
    for (let i = 0; i < duration; i++) {
      for (let n = 0; n < SERVO_NUM; n++) {
        this.#servoAngles[n] += steps[n]
        this.servoWrite(n, this.#servoAngles[n] / 10)
      }
    }
    return
  }
  setEyeColor(r: number, g: number, b: number): void {
    const color = this.#led.makeRGB(r, g, b)
    this.#led.fill(color)
    this.#led.update()
  }
  playMotion(motionKey: MotionKey): string {
    let readAddr = 0x32 + 860 * motionKey
    let file = ''
    // eslint-disable-next-line no-constant-condition
    while (true) {
      let str = ''
      file = this.#readEEPROM(readAddr)
      readAddr += 43
      let listNum = 0
      if (file.substr(0, 3) !== '>MF') {
        break
      }
      listNum += 3
      str = file.substring(listNum, listNum + 2)
      if (motionKey != Number.parseInt(str, 16)) {
        break
      }
      listNum += 4
      str = file.substring(listNum, listNum + 4)
      const time = Number.parseInt(str, 16)

      const angles = []
      listNum += 4
      for (let i = 0; i < SERVO_NUM; i++) {
        str = file.substring(listNum, listNum + 4)
        const n = Number.parseInt(str, 16)
        if (n >= 0x7fff) {
          angles.push(n - 0x10000)
        } else {
          angles.push(n & 0xffff)
        }
        listNum += 4
      }
      trace(`angles: ${angles}\n`)
      this.setAngle(angles as ServoAngles8, time)
    }
    return file
  }
}
