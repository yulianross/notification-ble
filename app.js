const bleno = require('bleno');
const util = require('util');
const SerialPort = require('serialport');
const xbee_api = require('xbee-api');

const C = xbee_api.constants;
const COUNTER_SERVICE_UUID = "11111111-9FAB-43C8-9231-40F6E305F96D";
const COUNTER_CHAR_UUID = "11111110-9FAB-43C8-9231-40F6E305F96D";

// xbee code
const xbeeAPI = new xbee_api.XBeeAPI({
    api_mode: 1
});

// for raspberry pi 3 the serial port is: /dev/ttyS0
const serialport = new SerialPort("/dev/ttyS0", {
    baudRate: 9600, //Tiene que ser igual que en Xbee
    parser: xbeeAPI.rawParser()
});

// bluetooth code
class CounterCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: COUNTER_CHAR_UUID,
            properties: ["notify"],
            value: null
        });

        this.counter = 0;
    }

    onSubscribe(maxValueSize, updateValueCallback) {
        console.log(`Counter subscribed, max value size is ${maxValueSize}`);
        this.updateValueCallback = updateValueCallback;
    }

    onUnsubscribe() {
        console.log("Counter unsubscribed");
        this.updateValueCallback = null;
    }    

    sendNotification(value) {
        console.log(this.updateValueCallback);
        if(this.updateValueCallback) {
            console.log(`Sending notification with value ${value}`);

            let notificationBytes = Buffer.alloc(4);

            notificationBytes.writeInt32LE(value);
            

            this.updateValueCallback(notificationBytes);
        }
    }

    // esto es para hacer pruebas con la raspberry y la app, sin el nodemcu

    // start() {
    //     console.log("Starting counter");
    //     this.handle = setInterval(() => {
    //         if (this.counter > 100) {
    //             this.counter = 0;
    //         }
    //         this.counter += 1;
    //         this.sendNotification(this.counter);
    //     }, 1000);
    // }

    // stop() {
    //     console.log("Stopping counter");
    //     clearInterval(this.handle);
    //     this.handle = null;
    // }
}

let counter = new CounterCharacteristic();
//counter.start();

serialport.on('data', (buffer) => {
    if (counter.updateValueCallback) {
        let data = new Int8Array(buffer);
        
        counter.sendNotification(data[0]);
        console.log(`value: ${data[0]}`);    
    }
});


bleno.on("stateChange", state => {

    if (state === "poweredOn") {
        
        bleno.startAdvertising("Counter", [COUNTER_SERVICE_UUID], err => {
            if (err) console.log(err);
        });

    } else {
        console.log("Stopping...");
        //counter.stop();
        bleno.stopAdvertising();
    }        
});

bleno.on("advertisingStart", err => {

    console.log("Configuring services...");
    
    if(err) {
        console.error(err);
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


bleno.on('advertisingStartError', (error) => {
    console.log('advertisingStartError: ', error);
});

bleno.on('advertisingStop', () => {
    console.log('advertisingStop');
});
bleno.on('servicesSet', (error) => {
    console.log('servicesSet', error);
});

bleno.on('servicesSetError', (error) => {
    console.log('servicesSetError', error);
});
bleno.on('accept', (clientAddress) => {
    console.log('accept', clientAddress);
    clientConnected = clientAddress;
}); // not available on OS X 10.9
bleno.on('disconnect', (clientAddress) => {
    console.log('disconnect', clientAddress);
}); // Linux only
bleno.on('rssiUpdate', (rssi) => {
    console.log('rssiUpdate', rssi);
}); // not available on OS X 10.9