/**
 * MakeCode extension for ESP8266 Wifi modules and ThinkSpeak and IFTTT. https://thingspeak.com/ e https://maker.ifttt.com/
 */
//% weight=9 color=#54AB9B icon="\uf20e" block="Hackbit IoT"
namespace ESP8266ThingSpeak {

    let wifi_connected: boolean = false
    let thingspeak_connected: boolean = false
    let last_upload_successful: boolean = false

// ---- MQTT
    enum Cmd {
        None,
        ConnectWifi,
        ConnectThingSpeak,
        ConnectMqtt,
    }

    export enum SchemeList {
        //% block="TCP"
        TCP = 1,
        //% block="TLS"
        TLS = 2
    }

    export enum QosList {
        //% block="0"
        Qos0 = 0,
        //% block="1"
        Qos1,
        //% block="2"
        Qos2
    }

    const EspEventSource = 3000

    const EspEventValue = {
        None: Cmd.None,
        ConnectWifi: Cmd.ConnectWifi,
        ConnectThingSpeak: Cmd.ConnectThingSpeak,
        ConnectMqtt: Cmd.ConnectMqtt,
        PostIFTTT: 255
    }

    let mqtthost_def = "HACKIDS"
    let currentCmd: Cmd = Cmd.None
    const mqttSubscribeHandlers: { [topic: string]: (message: string) => void } = {}
    const mqttSubscribeQos: { [topic: string]: number } = {}
    let mqttBrokerConnected: boolean = false
// ---- MQTT


    // ------- WiFi -------

    /**
    * Initialize ESP8266 module and connect it to Wifi router
    */
    //% block="Initialize ESP8266|RX (Tx of micro:bit) %tx|TX (Rx of micro:bit) %rx|Baud rate %baudrate|Wifi SSID = %ssid|Wifi PW = %pw"
    //% tx.defl=SerialPin.P16
    //% rx.defl=SerialPin.P15
    //% tx.fieldEditor="gridpicker"
    //% tx.fieldOptions.columns=3
    //% rx.fieldEditor="gridpicker"
    //% rx.fieldOptions.columns=3
    //% baudrate.fieldEditor="gridpicker"
    //% baudrate.fieldOptions.columns=3
    //% ssid.defl=your_ssid
    //% pw.defl=your_pw
    //% color=#75BBAE    
    export function connectWifi(tx: SerialPin, rx: SerialPin, baudrate: BaudRate, ssid: string, pw: string) {
        wifi_connected = false
        thingspeak_connected = false
        serial.redirect(
            tx,
            rx,
            baudrate
        )
        sendAT("AT+RESTORE", 1000) // restore to factory settings
        sendAT("AT+CWMODE=1") // set to STA mode
        sendAT("AT+RST", 1000) // reset
        sendAT("AT+CWJAP=\"" + ssid + "\",\"" + pw + "\"", 0) // connect to Wifi router
        wifi_connected = waitResponse()
        basic.pause(100)
    }

    // ------- ThingSpeak -------
    // write AT command with CR+LF ending
    function sendAT(command: string, wait: number = 100) {
        serial.writeString(command + "\u000D\u000A")
        basic.pause(wait)
    }

    // wait for certain response from ESP8266
    function waitResponse(): boolean {
        let serial_str: string = ""
        let result: boolean = false
        let time: number = input.runningTime()
        while (true) {
            serial_str += serial.readString()
            if (serial_str.length > 200) serial_str = serial_str.substr(serial_str.length - 200)
            if (serial_str.includes("OK") || serial_str.includes("ALREADY CONNECTED")) {
                result = true
                break
            } else if (serial_str.includes("ERROR") || serial_str.includes("SEND FAIL")) {
                break
            }
            if (input.runningTime() - time > 30000) break
        }
        return result
    }

    /**
    * Connect to ThingSpeak and upload data. It would not upload anything if it failed to connect to Wifi or ThingSpeak.
    */
    //% block="Upload data to ThingSpeak|URL/IP = %ip|Write API key = %write_api_key|Field 1 = %n1|Field 2 = %n2|Field 3 = %n3|Field 4 = %n4|Field 5 = %n5|Field 6 = %n6|Field 7 = %n7|Field 8 = %n8"
    //% ip.defl=api.thingspeak.com
    //% write_api_key.defl=your_write_api_key
    //% subcategory="IoT Service" 
    //% weight=130 group="Thingspeak"
    //% color=#75BBAE    
    export function connectThingSpeak(ip: string, write_api_key: string, n1: number, n2: number, n3: number, n4: number, n5: number, n6: number, n7: number, n8: number) {
        if (wifi_connected && write_api_key != "") {
            thingspeak_connected = false
            sendAT("AT+CIPSTART=\"TCP\",\"" + ip + "\",80", 0) // connect to website server
            thingspeak_connected = waitResponse()
            basic.pause(100)
            if (thingspeak_connected) {
                last_upload_successful = false
                let str: string = "GET /update?api_key=" + write_api_key + "&field1=" + n1 + "&field2=" + n2 + "&field3=" + n3 + "&field4=" + n4 + "&field5=" + n5 + "&field6=" + n6 + "&field7=" + n7 + "&field8=" + n8
                sendAT("AT+CIPSEND=" + (str.length + 2))
                sendAT(str, 0) // upload data
                last_upload_successful = waitResponse()
                basic.pause(100)
            }
        }
    }

    /**
    * Wait between uploads
    */
    //% block="Wait %delay ms"
    //% delay.min=0 delay.defl=5000
    //% color=#75BBAE    
    export function wait(delay: number) {
        if (delay > 0) basic.pause(delay)
    }

    /**
    * Check if ESP8266 successfully connected to Wifi
    */
    //% block="Wifi connected ?"
    //% color=#75BBAE    
    export function isWifiConnected() {
        return wifi_connected
    }

    /**
    * Check if ESP8266 successfully connected to ThingSpeak
    */
    //% block="ThingSpeak connected ?"
    //% subcategory="IoT Service" 
    //% weight=130 group="Thingspeak"
    //% color=#75BBAE
    export function isThingSpeakConnected() {
        return thingspeak_connected
    }

    /**
    * Check if ESP8266 successfully uploaded data to ThingSpeak
    */
    //% block="Last data upload successful ?"
    //% subcategory="IoT Service" 
    //% weight=130 group="Thingspeak"
    //% color=#75BBAE
    export function isLastUploadSuccessful() {
        return last_upload_successful
    }

    // ------- IFTTT -------
    function sendAtCmd(cmd: string) {
        serial.writeString(cmd + "\u000D\u000A")
    }

    function waitAtResponse(target1: string, target2: string, target3: string, timeout: number) {
        let buffer = ""
        let start = input.runningTime()

        while ((input.runningTime() - start) < timeout) {
            buffer += serial.readString()

            if (buffer.includes(target1)) return 1
            if (buffer.includes(target2)) return 2
            if (buffer.includes(target3)) return 3

            basic.pause(100)
        }

        return 0
    }

    /**
     * Send data to IFTTT
     */
    //% block="Send Data to your IFTTT Event|Event %event|Key %key|value1 %value1|value2 %value2|value3 %value3"
    //% event.defl="Event"
    //% key.defl="Key"
    //% value1.defl="hello"
    //% value2.defl="hack:"
    //% value3.defl="bit"
    //% subcategory="IoT Service" 
    //% weight=130 group="IFTTT"
    //% color=#75BBAE    
    export function sendToIFTTT(event: string, key: string, value1: string, value2: string, value3: string) {
        let result = 0
        let retry = 2

        // close the previous TCP connection
        if (isWifiConnected) {
            sendAtCmd("AT+CIPCLOSE")
            waitAtResponse("OK", "ERROR", "None", 2000)
        }

        while (isWifiConnected && retry > 0) {
            retry = retry - 1;
            // establish TCP connection
            sendAtCmd("AT+CIPSTART=\"TCP\",\"maker.ifttt.com\",80")
            result = waitAtResponse("OK", "ALREADY CONNECTED", "ERROR", 2000)
            if (result == 3) continue

            let data = "GET /trigger/" + event + "/with/key/" + key
            data = data + "?value1=" + value1
            data = data + "&value2=" + value2
            data = data + "&value3=" + value3
            data = data + " HTTP/1.1"
            data = data + "\u000D\u000A"
            data = data + "User-Agent: curl/7.58.0"
            data = data + "\u000D\u000A"
            data = data + "Host: maker.ifttt.com"
            data = data + "\u000D\u000A"
            data = data + "Accept: */*"
            data = data + "\u000D\u000A"

            sendAtCmd("AT+CIPSEND=" + (data.length + 2))
            result = waitAtResponse(">", "OK", "ERROR", 2000)
            if (result == 3) continue
            sendAtCmd(data)
            result = waitAtResponse("SEND OK", "SEND FAIL", "ERROR", 5000)

            // // close the TCP connection
            // sendAtCmd("AT+CIPCLOSE")
            // waitAtResponse("OK", "ERROR", "None", 2000)

            if (result == 1) break
        }
    }
    // ------- MQTT -------
    /**
     * Set  MQTT client
     */
    //% blockId=initMQTT block="Set MQTT client config|scheme: %scheme clientID: %clientID username: %username password: %password path: %path"
    //% subcategory="IoT Service" 
    //% weight=130 group="MQTT"
    //% color=#75BBAE
    export function setMQTT(scheme: SchemeList, clientID: string, username: string, password: string, path: string): void {
        sendAT(`AT+MQTTUSERCFG=0,${scheme},"${clientID}","${username}","${password}",0,0,"${path}"`, 1000)
    }

    /**
     * Connect to MQTT broker
     */
    //% blockId=connectMQTT block="connect MQTT broker host: %host port: %port reconnect: $reconnect"
    //% subcategory="IoT Service" 
    //% weight=130 group="MQTT"
    //% color=#75BBAE
    export function connectMQTT(host: string, port: number, reconnect: boolean): void {
        mqtthost_def = host
        const rec = reconnect ? 0 : 1
        currentCmd = Cmd.ConnectMqtt
        sendAT(`AT+MQTTCONN=0,"${host}",${port},${rec}`)
        control.waitForEvent(EspEventSource, EspEventValue.ConnectMqtt)
        Object.keys(mqttSubscribeQos).forEach(topic => {
            const qos = mqttSubscribeQos[topic]
            sendAT(`AT+MQTTSUB=0,"${topic}",${qos}`, 1000)
        })
    }

    /**
     * Check if ESP8266 successfully connected to mqtt broker
     */
    //% block="MQTT broker is connected"
    //% subcategory="IoT Service" 
    //% weight=130 group="MQTT"
    //% color=#75BBAE
    export function isMqttBrokerConnected() {
        return mqttBrokerConnected
    }

    /**
     * send message
     */
    //% blockId=sendMQTT block="publish %msg to Topic:%topic with Qos:%qos"
    //% msg.defl=hello
    //% topic.defl=topic/1
    //% subcategory="IoT Service" 
    //% weight=130 group="MQTT"
    //% color=#75BBAE
    export function publishMqttMessage(msg: string, topic: string, qos: QosList): void {
        sendAT(`AT+MQTTPUB=0,"${topic}","${msg}",${qos},0`, 1000)
    }

    /**
     * disconnect MQTT broker
     */
    //% blockId=breakMQTT block="Disconnect from broker"
    //% subcategory="IoT Service" 
    //% weight=130 group="MQTT"
    //% color=#75BBAE
    export function breakMQTT(): void {
        sendAT("AT+MQTTCLEAN=0", 1000)
    }

    //% block="when Topic: %topic have new $message with Qos: %qos"
    //% draggableParameters
    //% topic.defl=topic/1
    //% subcategory="IoT Service" 
    //% weight=130 group="MQTT"
    //% color=#75BBAE
    export function MqttEvent(topic: string, qos: QosList, handler: (message: string) => void) {
        mqttSubscribeHandlers[topic] = handler
        mqttSubscribeQos[topic] = qos
    }


}