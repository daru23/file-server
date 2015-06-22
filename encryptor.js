/**
 * Created by daniela on 6/22/15.
 */
/*
 * Require modules
 */

var crypto = require('crypto'),
    fs = require('fs'),
    //program = require('commander'),
    ALGORITHM = 'AES-256-CBC',
    HMAC_ALGORITHM = 'SHA256';

exports.encryptFile = function (file, key, path) {

    var aes = crypto.createCipher(ALGORITHM, key);
    // ext
    ext = file.substr(file.lastIndexOf('.') + 1);

    var rstream = fs.createReadStream(file);
    var wstream = fs.createWriteStream(path);

    rstream   // reads from myfile.txt
        .pipe(aes)  // encrypts with aes256
        .pipe(wstream)  // writes to myfile.encrypted
        .on('finish', function () {  // finished
            console.log('done encrypting');
    });

};

exports.unencryptFile = function (encryptedFile, key) {

    var aes = crypto.createDecipher(ALGORITHM, key);

    ext = encryptedFile.substr(encryptedFile.lastIndexOf('.') + 1);

    var rstream = fs.createReadStream(encryptedFile);
    var wstream = fs.createWriteStream('unncrypted.'+ext);

    rstream   // reads from myfile.txt
        .pipe(aes)  // decrypt with aes256
        .pipe(wstream)  // output stdout
        .on('finish', function () {  // finished
            console.log('done unencrypting');
        });
};

 //this.encryptFile('myfile.txt', "5673dc790e84d1361e603c648e0d20b6bcc943b8001419861593d336940e430dce25d903a57a5c2b24963e7d02f7a4218c4abccfb37f5cc0143900d447537e58");
 //this.unencryptFile('esto.txt', "5673dc790e84d1361e603c648e0d20b6bcc943b8001419861593d336940e430dce25d903a57a5c2b24963e7d02f7a4218c4abccfb37f5cc0143900d447537e58" );

