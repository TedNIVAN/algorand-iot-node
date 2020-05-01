const SerialPort = require('serialport');
const Readline = require('@serialport/parser-readline');
const aesjs = require('aes-js');
const algosdk = require('algosdk');

require('dotenv').config();

const mcu = process.env.SERIAL_DEVICE;
const serialPort = new SerialPort(mcu, { baudRate: JSON.parse(process.env.SERIAL_SPEED) });

const parser = new Readline();
serialPort.pipe(parser);

const key = JSON.parse(process.env.AES_KEY);
const iv = JSON.parse(process.env.IV);

parser.on('data', encryptedBytes => {

    var encryptedBytes = encryptedBytes.split(' ').map(Number);
    encryptedBytes = encryptedBytes.slice(0, -1);

    var aesCbc = new aesjs.ModeOfOperation.cbc(key, iv);
    var decryptedBytes = aesCbc.decrypt(encryptedBytes);
    var decryptedText = aesjs.utils.utf8.fromBytes(decryptedBytes);

    sendToAlgorandBlockchain(decryptedText);

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

