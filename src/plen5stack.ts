import { I2C } from 'pins/i2c'
import Digital from 'pins/digital'
import NeoPixel from 'neopixel'

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
  #servoAngles: ServoAngles8 = INITIAL_SERVO_ANGLE
  #initialized = false
  #write8: (address: number, command: number) => void = (address, command) => {
    this.#i2c.write(address, command)
  }
  get initialized(): boolean {
    return this.#initialized
  }
  get angles(): ServoAngles8 {
    return [...this.#servoAngles]
  }

  /* public fields */
  constructor() {
    this.#powerpin.write(0) // poweron
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
    angles.forEach((angle, index) => {
      if (angle != null) {
        this.servoWrite(index, angle / 10)
      }
    })
    return
  }
  setEyeColor(r: number, g: number, b: number): void {
    const color = this.#led.makeRGB(r, g, b)
    this.#led.fill(color)
    this.#led.update()
  }
  getMotion(motionKey: MotionKey, num: number): string {
    this.#i2c.write(EEPROM_ADDRESS)
    return 'hoge'
  }
  playMotion(mitionKey: MotionKey): void {
    return
  }
}
