/**
 * Created by daniela on 6/18/15.
 */
/*
 * Require modules
 */
var fs = require('fs'),
    multiparty = require('multiparty'),
    walk = require('walk'),
    config = require('./config.json'),
    Q = require('q'),
    redis = require("redis"),
    listenClient = redis.createClient(config.redis.port, config.redis.server, {}),
    listenClient2 = redis.createClient(config.redis.port, config.redis.server, {}),
    publishClient = redis.createClient(config.redis.port, config.redis.server, {}),
    timeouts = [],
    encryptor = require('./encryptor.js');

/************* Comunication to Redis Channel to get the key and encrypt the files *************************************/
var requestKey = function(message) {
    publishClient.publish(config.publishChannel, JSON.stringify(message));
};


var requestObject = function (message) {
    publishClient.publish(config.checksumChannel, JSON.stringify(message));
};

// Catch redis errors
listenClient.on("error", function (err) {
    console.log("Redis listen error " + err);
});

publishClient.on("error", function (err) {
    console.log("Redis publish error " + err);
});

var readKey = function (clientID, hash) {

    var deferred = Q.defer();
    var reqObject = {method:"READ"};

    reqObject.client = {clientID:clientID, hash:hash};
    reqObject.publishChannel = config.listenChannel;

    requestKey(reqObject);

    listenClient.on("message", function (channel, message) {
        clearTimeout(timeouts[message.clientID]);
        var answer = JSON.parse(message);
        if (answer.clientID && answer.clientID == clientID && answer.hash && answer.hash == hash){
            deferred.resolve(message);
        }
    });
    return deferred.promise;
};

var createObject = function (clientID, hash, file, checksum) {
    var reqObject = {method:"CREATE"};
    reqObject.file = {clientID:clientID, hash:hash, file:file, checksum:checksum};
    reqObject.publishChannel = config.checksumChannel;
    requestObject(reqObject);
};

var readObject = function (clientID, hash, file) {

    var deferred = Q.defer();

    var reqObject = {method:"READ"};

    reqObject.file = {clientID:clientID, hash:hash, file:file};
    reqObject.publishChannel = config.checksumChannel;
    requestObject(reqObject);

    listenClient2.on("message", function (channel, message) {
        clearTimeout(timeouts[message.clientID]);
        var answer = JSON.parse(message);
        console.log(answer);
        if (answer.clientID && answer.clientID == clientID && answer.hash && answer.hash == hash && answer.file == file){
            deferred.resolve(message);
        }
    });
    return deferred.promise;
};

// Listen to channel for requests
listenClient.subscribe(config.listenChannel);
listenClient2.subscribe(config.checksumChannel);

/*********************************************** Public Functions *****************************************************/
/**
 * Display upload form
 */
exports.display_form = {
    handler: function(request, response) {
        var clientID = request.params.clientID;
        var hash = request.params.hash;
        response(
            '<form action="/upload/'+clientID+'/'+hash+'" method="post" enctype="multipart/form-data">' +
            '<input type="file" name="file">' +
            '<input type="submit" value="Send">' +
            '</form>'
        );
    }
};

/**
 * Upload file to the gluterfs
 */
exports.uploadFile = {

    payload: {
        maxBytes: 209715200,
        output: 'stream',
        parse: false
    },
    handler: function(request, response) {

        var clientID = request.params.clientID,
            hash = request.params.hash,
            form = new multiparty.Form();

        form.parse(request.payload, function(err, fields, files) {
            if (err)
                return response(err);
            else {
                // Ask for the key and the folder name
                // promise!!!
                readKey(clientID, hash).then(function (message, err) {
                    var clientObject = JSON.parse(message);
                    console.log(clientObject);
                    upload(files, clientObject.clientID, clientObject.folder, clientObject.key, clientObject.hash, response);
                });
            }
        });
    }
};

/**
 * Get file
 */
exports.getFile = {

    handler: function(request, response) {

        var file = request.params.file,
            clientID = request.params.clientID,
            hash = request.params.hash;

        // Promise
        readKey(clientID, hash).then(function (message, err) {
            var clientObject = JSON.parse(message);
            var path = config.publicFolder + clientObject.folder +'/' + file,
                ext = file.substr(file.lastIndexOf('.') + 1);
            fs.readFile(path, function(error, content) {
                if (error)
                    return response("file not found");

                var dfile = encryptor.decrypt(content, clientObject.key, clientObject.hash);

                /* Checksum Md5*/
                var checksum = encryptor.checksum(path, 'md5');

                readObject(clientID, hash,file).then(function (message) {
                    var checksumObject = JSON.parse(message);
                    var checksum = encryptor.checksum(path, 'md5');

                    if (checksumObject.checksum == checksum)
                        return response(dfile).header("Content-Disposition", "attachment; filename=" + file);
                    else
                        return response("ERROR");
                });

                //return response(dfile).header("Content-Disposition", "attachment; filename=" + file);

            });
        });
    }
};

/**
 *Get fileList by clientID and hash
 */
exports.fileList = {

    handler: function(request, response) {

        var files = [];
        var clientID = request.params.clientID;
        var hash = request.params.hash;

        // promise!!
        readKey(clientID, hash).then(function (message, err) {
            var clientObject = JSON.parse(message);
            // Walker configuration
            var walker = walk.walk(config.publicFolder+clientObject.folder, {
                followLinks: false
            });
            // After this promise I get the files
            walker.on('file', function(root, stat, next) {
                // Add this file to the list of files
                files.push(stat.name);
                next();
            });
            //Close the connection to fs
            walker.on('end', function() {
                return response(files);
            });
        })
    }
};

/********************************************* Private Functions ******************************************************/
/**
 * Upload file
 */
var upload = function(files, clientID, folderName, key, hash, response) {

    // Should encrypt file using the key

    fs.readFile(files.file[0].path, function(err, data) {

        var fileName = files.file[0].originalFilename,
            size = files.file[0].size,
            path = config.publicFolder + folderName + '/' + fileName,
            efile = encryptor.encrypt(data, key, hash);

        checkFileExist(folderName).then(function (err) {
            if (err) console.log('Error ' + err);

            fs.writeFile(path, efile, function (err) {
                if (err) console.log(err);

                /* Checksum Md5*/
                var checksum = encryptor.checksum(path, 'md5');

                createObject(clientID, hash, fileName,checksum);

                console.log(checksum);

                //var decryptBuffer = encryptor.decrypt(test, key, hash);
                //fs.writeFile(config.publicFolder + folderName + '/' + 'Decrypted_' + files.file[0].originalFilename,decryptBuffer, function (err) {
                //    if (err) console.log(err);
                return response('Uploaded complete!');
                //});

            });
        });
    });
};

/**
 * Check file existence and create if not exist
 */
var checkFileExist = function(folder) {

    var deferred = Q.defer();
        var main = config.publicFolder;
        fs.exists(main + folder, function (exists) {
            if (exists === false) {
                fs.mkdirSync(main + folder);
                deferred.resolve(true);
            }
            deferred.resolve(true);
        });
    return deferred.promise;
};
