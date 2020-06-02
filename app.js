const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const algosdk = require('algosdk');

require('dotenv').config();

const mcu = process.env.SERIAL_DEVICE;
const serialPort = new SerialPort(mcu, { baudRate: JSON.parse(process.env.SERIAL_SPEED) });

const parser = new Readline();
serialPort.pipe(parser);

parser.on('data', temperature => {

    temperature = temperature.split(' ').map(Number);
    temperature = String.fromCharCode(temperature[0], temperature[1]);
    
    sendToAlgorandBlockchain(temperature);

});

sendToAlgorandBlockchain = (value) => {

    const baseServer = process.env.NODE;
    const port = "";
    const token = {
        'X-API-Key': process.env.APIKEY
    }

    const algodclient = new algosdk.Algod(token, baseServer, port);

    var mnemonic = process.env.MN;
    var account = algosdk.mnemonicToSecretKey(mnemonic);

    let note = algosdk.encodeObj(value);

    (async () => {

        let params = await algodclient.getTransactionParams();
        let endRound = params.lastRound + parseInt(1000);

        let txn = {
            "from": account.addr,
            "to": account.addr,
            "fee": 10,
            "amount": 0,
            "firstRound": params.lastRound,
            "lastRound": endRound,
            "genesisID": params.genesisID,
            "genesisHash": params.genesishashb64,
            "note": note,
        };

        const txHeaders = {
            'Content-Type': 'application/x-binary'
        }
        let signedTxn = algosdk.signTransaction(txn, account.sk);
        let tx = (await algodclient.sendRawTransaction(signedTxn.blob, txHeaders));
        console.log("Transaction : " + tx.txId);
    })().catch(e => {
        console.log(e);
    });

}

