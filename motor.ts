/**
 * MakeCode extension for DC Motor, Steep Motor and Servo Motor
 */
//% color=#FF1344 icon="\uf1b6" block="Hackbit Motors"

namespace hackbitmotors {
    const PCA9685_ADDRESS = 0x40
    const MODE1 = 0x00
    const PRESCALE = 0xFE

    const LED0_ON_L = 0x06

    const STP_CHA_L = 2047
    const STP_CHA_H = 4095

    const STP_CHB_L = 1
    const STP_CHB_H = 2047

    const STP_CHC_L = 1023
    const STP_CHC_H = 3071

    const STP_CHD_L = 3071
    const STP_CHD_H = 1023

    export enum Servos {
        S1 = 0x01,
        S2 = 0x02,
        S3 = 0x03,
        S4 = 0x04,
        S5 = 0x05,
        S6 = 0x06,
        S7 = 0x07,
        S8 = 0x08
    }

    export enum Motors {
        M1A = 0x1,
        M1B = 0x2,
        M2A = 0x3,
        M2B = 0x4
    }

    export enum Steppers {
        M1 = 0x1,
        M2 = 0x2
     }

    export enum Turns {
        //% blockId="T1B4" block="1/4"
        T1B4 = 90,
        //% blockId="T1B2" block="1/2"
        T1B2 = 180,
        //% blockId="T1B0" block="1"
        T1B0 = 360,
        //% blockId="T2B0" block="2"
        T2B0 = 720,
        //% blockId="T3B0" block="3"
        T3B0 = 1080,
        //% blockId="T4B0" block="4"
        T4B0 = 1440,
        //% blockId="T5B0" block="5"
        T5B0 = 1800
    }

    let initialized = false

    function i2cwrite(addr: number, reg: number, value: number) {
        let buf = pins.createBuffer(2)
        buf[0] = reg
        buf[1] = value
        pins.i2cWriteBuffer(addr, buf)
    }

    function i2cread(addr: number, reg: number) {
        pins.i2cWriteNumber(addr, reg, NumberFormat.UInt8BE);
        let val = pins.i2cReadNumber(addr, NumberFormat.UInt8BE);
        return val;
    }

    export function initPCA9685(): void {
        i2cwrite(PCA9685_ADDRESS, MODE1, 0x00)
        setFreq(50);
        for (let idx = 0; idx < 16; idx++) {
            setPwm(idx, 0, 0);
        }
        initialized = true
    }

    function setFreq(freq: number): void {
        // Constrain the frequency
        let prescaleval = 25000000;
        prescaleval /= 4096;
        prescaleval /= freq;
        prescaleval -= 1;
        let prescale = prescaleval; //Math.Floor(prescaleval + 0.5);
        let oldmode = i2cread(PCA9685_ADDRESS, MODE1);
        let newmode = (oldmode & 0x7F) | 0x10; // sleep
        i2cwrite(PCA9685_ADDRESS, MODE1, newmode); // go to sleep
        i2cwrite(PCA9685_ADDRESS, PRESCALE, prescale); // set the prescaler
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode);
        control.waitMicros(5000);
        i2cwrite(PCA9685_ADDRESS, MODE1, oldmode | 0xa1);
    }

    export function setPwm(channel: number, on: number, off: number): void {
        if (channel < 0 || channel > 15)
            return;
        //serial.writeValue("ch", channel)
        //serial.writeValue("on", on)
        //serial.writeValue("off", off)

        let buf = pins.createBuffer(5);
        buf[0] = LED0_ON_L + 4 * channel;
        buf[1] = on & 0xff;
        buf[2] = (on >> 8) & 0xff;
        buf[3] = off & 0xff;
        buf[4] = (off >> 8) & 0xff;
        pins.i2cWriteBuffer(PCA9685_ADDRESS, buf);
    }

    function setStepper(index: number, dir: boolean): void {
        if (index == 1) {
            if (dir) {
                setPwm(0, STP_CHA_L, STP_CHA_H);
                setPwm(2, STP_CHB_L, STP_CHB_H);
                setPwm(1, STP_CHC_L, STP_CHC_H);
                setPwm(3, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(3, STP_CHA_L, STP_CHA_H);
                setPwm(1, STP_CHB_L, STP_CHB_H);
                setPwm(2, STP_CHC_L, STP_CHC_H);
                setPwm(0, STP_CHD_L, STP_CHD_H);
            }
        } else {
            if (dir) {
                setPwm(4, STP_CHA_L, STP_CHA_H);
                setPwm(6, STP_CHB_L, STP_CHB_H);
                setPwm(5, STP_CHC_L, STP_CHC_H);
                setPwm(7, STP_CHD_L, STP_CHD_H);
            } else {
                setPwm(7, STP_CHA_L, STP_CHA_H);
                setPwm(5, STP_CHB_L, STP_CHB_H);
                setPwm(6, STP_CHC_L, STP_CHC_H);
                setPwm(4, STP_CHD_L, STP_CHD_H);
            }
        }
    }

    function stopMotor(index: number) {
        setPwm((index - 1) * 2, 0, 0);
        setPwm((index - 1) * 2 + 1, 0, 0);
    }

    /**
     * Servo Execute
     * @param index Servo Channel; eg: S1
     * @param degree [0-180] degree of servo; eg: 0, 90, 180
    */
    //% blockId=hackbit_servo block="Servo|%index|degree %degree"
    //% weight=100
    //% degree.min=0 degree.max=180
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% subcategory="Servo Motor"  group="Servo Motor" color=#FF3D65 icon="\uf1eb"

    export function Servo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = (degree * 1800 / 180 + 600) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    /**
     * Geek Servo
     * @param index Servo Channel; eg: S1
     * @param degree [-45-225] degree of servo; eg: -45, 90, 225
    */
    //% blockId=hackbit_gservo block="Geek Servo|%index|degree %degree"
    //% weight=99
    //% degree.min=-45 degree.max=225
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% subcategory="Servo Motor"  group="Servo Motor" color=#FF3D65 icon="\uf1eb"
    export function GeekServo(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        let v_us = ((degree - 90) * 20 / 3 + 1500) // 0.6 ~ 2.4
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

        /**
     * GeekServo2KG
     * @param index Servo Channel; eg: S1
     * @param degree [0-360] degree of servo; eg: 0, 180, 360
    */
    //% blockId=hackbit_gservo2kg block="GeekServo2KG|%index|degree %degree"
    //% weight=98
    //% blockGap=50
    //% degree.min=0 degree.max=360
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% subcategory="Servo Motor"  group="Servo Motor" color=#FF3D65 icon="\uf1eb"

    export function GeekServo2KG(index: Servos, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        // 50hz: 20,000 us
        //let v_us = (degree * 2000 / 360 + 500)  0.5 ~ 2.5
        let v_us = (Math.floor((degree) * 2000 / 350) + 500) //fixed
        let value = v_us * 4096 / 20000
        setPwm(index + 7, 0, value)
    }

    //% blockId=hackbit_stepper_degree block="Stepper 28BYJ-48|%index|degree %degree"
    //% weight=90
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% degree.fieldEditor="gridpicker"
    //% degree.fieldOptions.columns=2
    //% subcategory="Stepper Motor"  group="Stepper Motor" color=#FF597C icon="\uf1eb"

    export function StepperDegree(index: Steppers, degree: number): void {
        if (!initialized) {
            initPCA9685()
        }
        setStepper(index, degree > 0);
        degree = Math.abs(degree);
        basic.pause(10240 * degree / 360);
        MotorStopAll()
    }


    //% blockId=hackbit_stepper_turn block="Stepper 28BYJ-48|%index|turn %turn"
    //% weight=90
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% turn.fieldEditor="gridpicker"
    //% turn.fieldOptions.columns=2
    //% subcategory="Stepper Motor"  group="Stepper Motor" color=#FF597C icon="\uf1eb"
    export function StepperTurn(index: Steppers, turn: Turns): void {
        let degree = turn;
        StepperDegree(index, degree);
    }

    //% blockId=hackbit_stepper_dual block="Dual Stepper(Degree) |M1 %degree1| M2 %degree2"
    //% degree1.fieldEditor="gridpicker"
    //% degree1.fieldOptions.columns=2
    //% degree2.fieldEditor="gridpicker"
    //% degree2.fieldOptions.columns=2
    //% weight=89
    //% subcategory="Stepper Motor"  group="Stepper Motor" color=#FF597C icon="\uf1eb"
    export function StepperDual(degree1: number, degree2: number): void {
        if (!initialized) {
            initPCA9685()
        }
        setStepper(1, degree1 > 0);
        setStepper(2, degree2 > 0);
        degree1 = Math.abs(degree1);
        degree2 = Math.abs(degree2);
        basic.pause(10240 * Math.min(degree1, degree2) / 360);
        if (degree1 > degree2) {
            stopMotor(3); stopMotor(4);
            basic.pause(10240 * (degree1 - degree2) / 360);
        } else {
            stopMotor(1); stopMotor(2);
            basic.pause(10240 * (degree2 - degree1) / 360);
        }

        MotorStopAll()
    }

    /**
     * Stepper Car move forward
     * @param distance Distance to move in cm; eg: 10, 20
     * @param diameter diameter of wheel in mm; eg: 48
    */
    //% blockId=hackbit_stpcar_move block="Car Forward|Distance(cm) %distance|Wheel Diameter(mm) %diameter"
    //% weight=88
    //% subcategory="Stepper Motor"  group="Stepper Motor" color=#FF597C icon="\uf1eb"

    export function StpCarMove(distance: number, diameter: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let delay = 10240 * 10 * distance / 3 / diameter; // use 3 instead of pi
        setStepper(1, delay > 0);
        setStepper(2, delay > 0);
        delay = Math.abs(delay);
        basic.pause(delay);
        MotorStopAll()
    }

    /**
     * Stepper Car turn by degree
     * @param turn Degree to turn; eg: 90, 180, 360
     * @param diameter diameter of wheel in mm; eg: 48
     * @param track track width of car; eg: 125
    */
    //% blockId=hackbit_stpcar_turn block="Car Turn|Degree %turn|Wheel Diameter(mm) %diameter|Track(mm) %track"
    //% weight=87
    //% blockGap=50
    //% subcategory="Stepper Motor"  group="Stepper Motor" color=#FF597C icon="\uf1eb"

    export function StpCarTurn(turn: number, diameter: number, track: number): void {
        if (!initialized) {
            initPCA9685()
        }
        let delay = 10240 * turn * track / 360 / diameter;
        setStepper(1, delay < 0);
        setStepper(2, delay > 0);
        delay = Math.abs(delay);
        basic.pause(delay);
        MotorStopAll()
    }

    //% blockId=hackbit_motor_run block="Motor|%index|speed %speed"
    //% weight=85
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% speed.min=-255 speed.max=255
    //% subcategory="DC Motor"  group="DC Motor" color=#FF7692 icon="\uf1eb"

    export function MotorRun(index: Motors, speed: number): void {
        if (!initialized) {
            initPCA9685()
        }
        speed = speed * 16; // map 255 to 4096
        if (speed >= 4096) {
            speed = 4095
        }
        if (speed <= -4096) {
            speed = -4095
        }
        if (index > 4 || index <= 0)
            return
        let pp = (index - 1) * 2
        let pn = (index - 1) * 2 + 1
        if (speed >= 0) {
            setPwm(pp, 0, speed)
            setPwm(pn, 0, 0)
        } else {
            setPwm(pp, 0, 0)
            setPwm(pn, 0, -speed)
        }
    }


    /**
     * Execute two motors at the same time
     * @param motor1 First Motor; eg: M1A, M1B
     * @param speed1 [-255-255] speed of motor; eg: 150, -150
     * @param motor2 Second Motor; eg: M2A, M2B
     * @param speed2 [-255-255] speed of motor; eg: 150, -150
    */
    //% blockId=hackbit_motor_dual block="Motor|%motor1|speed %speed1|%motor2|speed %speed2"
    //% weight=84
    //% motor1.fieldEditor="gridpicker"
    //% motor1.fieldOptions.columns=2
    //% motor2.fieldEditor="gridpicker"
    //% motor2.fieldOptions.columns=2
    //% speed1.min=-255 speed1.max=255
    //% speed2.min=-255 speed2.max=255
    //% subcategory="DC Motor"  group="DC Motor" color=#FF7692 icon="\uf1eb"

    export function MotorRunDual(motor1: Motors, speed1: number, motor2: Motors, speed2: number): void {
        MotorRun(motor1, speed1);
        MotorRun(motor2, speed2);
    }

    /**
     * Execute single motors with delay
     * @param index Motor Index; eg: M1A, M1B, M2A, M2B
     * @param speed [-255-255] speed of motor; eg: 150, -150
     * @param delay seconde delay to stop; eg: 1
    */
    //% blockId=hackbit_motor_rundelay block="Motor|%index|speed %speed|delay %delay|s"
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% weight=81
    //% speed.min=-255 speed.max=255
    //% subcategory="DC Motor"  group="DC Motor" color=#FF7692 icon="\uf1eb"

    export function MotorRunDelay(index: Motors, speed: number, delay: number): void {
        MotorRun(index, speed);
        basic.pause(delay * 1000);
        MotorRun(index, 0);
    }

    //% blockId=hackbit_stop block="Motor Stop|%index|"
    //% index.fieldEditor="gridpicker"
    //% index.fieldOptions.columns=2
    //% weight=80
    //% subcategory="DC Motor"  group="DC Motor" color=#FF7692 icon="\uf1eb"

    export function MotorStop(index: Motors): void {
        MotorRun(index, 0);
    }

    //% blockId=hackbit_stop_all block="Motor Stop All"
    //% weight=79
    //% blockGap=50
    //% color=#FF1344 

    export function MotorStopAll(): void {
        if (!initialized) {
            initPCA9685()
        }
        for (let idx = 1; idx <= 4; idx++) {
            stopMotor(idx);
        }
    }

}   