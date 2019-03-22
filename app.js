const bleno = require('bleno');
const SerialPort = require('serialport');
const ByteLength = require('@serialport/parser-byte-length');

const COUNTER_SERVICE_UUID = "11111111-9FAB-43C8-9231-40F6E305F96D";
const COUNTER_CHAR_UUID = "11111110-9FAB-43C8-9231-40F6E305F96D";

// for raspberry pi 3 the serial port is: /dev/ttyS0
const serialport = new SerialPort("/dev/ttyS0", {
    baudRate: 9600 //it has to be the arduino baudRate
});
const parser = serialport.pipe(new ByteLength({length: 2}));


// bluetooth code
class CounterCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: COUNTER_CHAR_UUID,
            properties: ['notify'],
            value: null
        });

        this.counter = 0;
    }

    onSubscribe(maxValueSize, updateValueCallback) {
        this.updateValueCallback = updateValueCallback;
    }

    onUnsubscribe() {
        console.log("Counter unsubscribed");
        this.updateValueCallback = null;
    }    

    sendNotification(value) {
        if(this.updateValueCallback) {
            console.log(`Sending notification with value ${value}`);

            let notificationBytes = Buffer.alloc(4);

            notificationBytes.writeInt32LE(value);
            this.updateValueCallback(notificationBytes);
        }
    }
}

let counter = new CounterCharacteristic();

parser.on('data', (buffer) => { 
    if (counter.updateValueCallback) {
        let data = new Int8Array(buffer);
        let number = (data[0] * 128) + data[1];
        
        counter.sendNotification(number);   
    }
});

bleno.on("stateChange", state => {

    if (state === "poweredOn") {
        
        bleno.startAdvertising("Counter", [COUNTER_SERVICE_UUID], err => {
            if (err) console.log(err);
        });

    } else {
        console.log("Stopping...");
        bleno.stopAdvertising();
    }        
});

bleno.on("advertisingStart", err => {

    if(err) {
        return;
    }

    let service = new bleno.PrimaryService({
        uuid: COUNTER_CHAR_UUID,
        characteristics: [counter]
    });

    bleno.setServices([service], err => {
        if(err)
            console.log(err);
        else
            console.log("Services configured");
    });
});
