/**
 * Created by daniela on 6/22/15.
 */
/*
 * Require modules
 */

var crypto = require('crypto'),
    bufferIndexOf = require('buffer-indexof'),
    fs = require('fs'),
    //bsplit = require('buffer-split'),
    config = require('./config.json'),
    ALGORITHM = config.crypto. algorithm;

exports.encrypt = function (buffer, key, hash){
    var cipher = crypto.createCipher(ALGORITHM,key);
    //var bufferHash = Buffer.concat([buffer, (new Buffer(hash))]);
    //If you want to concat the hash encrypt bufferHash
    var crypted = Buffer.concat([cipher.update(buffer),cipher.final()]);
    return crypted;
};

exports.decrypt = function (buffer, key, hash) {
    var decipher = crypto.createDecipher(ALGORITHM, key);
    var dec = Buffer.concat([decipher.update(buffer), decipher.final()]);

    return dec;

    /* For check decryption with hash uncomment this */
    /*var n = result.length - 1;
    var delim = new Buffer(hash);
    var result = bsplit(dec, delim);
    var hashDeco = result[n].toString('utf8');

    if (hash.search(hashDeco) != -1) {
        console.log('Good Decryption!');
        return result[0];
    }else{
        console.log('Bad Decryption!');
    }
    */
};

function bsplit (buf,splitBuf){

    var search = -1,
        lines = [];

    while((search = bufferIndexOf(buf,splitBuf)) > -1){
        lines.push(buf.slice(0,search));
        buf = buf.slice(splitBuf.length,buf.length);
    }

    if(buf.length) lines.push(buf);

    return lines;
}

exports.checksum = function (str, algorithm, encoding) {
    return crypto
        .createHash(algorithm || 'md5')
        .update(str, 'utf8')
        .digest(encoding || 'hex')
};

exports.checksumBigFiles = function (file, algorithm){

    var stream = fs.createReadStream(file),
        hash = crypto.createHash('md5');

    stream.on('data', function (data) {
        hash.update(data, 'utf8')
    });

    stream.on('end', function () {
        hash.digest('hex');
    });

    return hash;
};

//fs.readFile('/gluster/data/uploads/Lars395/rata.png', function (err,data) {
//
//    var test = decrypt(data,"5673dc790e84d1361e603c648e0d20b6bcc943b8001419861593d336940e430dce25d903a57a5c2b24963e7d02f7a4218c4abccfb37f5cc0143900d447537e58", "aabbccddeef" );
//
//    fs.writeFile('/gluster/data/uploads/Lars395/Decrypted_rata.png',test, function (err) {
//        if (err) console.log(err);
//    });
//
//
//});



