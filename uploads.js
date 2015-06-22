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
    publishClient = redis.createClient(config.redis.port, config.redis.server, {}),
    timeouts = [],
    encryptor = require('./encryptor.js');

/************* Comunication to Redis Channel to get the key and encrypt the files *************************************/
var requestKey = function(message) {
    publishClient.publish(config.publishChannel, JSON.stringify(message));
    // Set timeout to catch keyvault error if response stays out
    // timeouts[message.client.clientID] = setTimeout(
    //    function(){
    //        throw new Error('The KeyVault did not respond.');
    //    }, 1500);
};

// Catch redis errors
listenClient.on("error", function (err) {
    console.log("Redis listen error " + err);
});

publishClient.on("error", function (err) {
    console.log("Redis publish error " + err);
});

//// Catch redis errors
//listenClient.on("message", function (channel, message) {
//    clearTimeout(timeouts[message.clientID]);
//    console.log(JSON.parse(message));
//    //publishClient.quit();
//    //listenClient.quit();
//    //process.exit(0);
//});

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

// Listen to channel for requests
listenClient.subscribe(config.listenChannel);

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
            form = new multiparty.Form(),
            count = 0;

        form.on('error', function(err) {
            console.log('Error parsing form: ' + err.stack);
        });

        form.on('file', function (name, file) {
            readKey(clientID, hash).then(function (message, err) {
                var clientObject = JSON.parse(message);
                console.log(clientObject);
                upload(file.path, file.originalFilename, clientObject.folder, clientObject.key, response);
            });
        });

        //form.parse(request.payload, function(err, fields, files) {
        //    if (err)
        //        return response(err);
        //    else {
        //        // Ask for the key and the folder name
        //        // promise!!!
        //        readKey(clientID, hash).then(function (message, err) {
        //            var clientObject = JSON.parse(message);
        //            console.log(clientObject);
        //            upload(files, clientObject.folder, clientObject.key, response);
        //        });
        //    }
        //});

        // Close emitted after form parsed
        form.on('close', function() {
            console.log('Upload completed!');
            return response('Uploaded complete!');
        });

        // Parse req
        form.parse(request.payload);
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
                var contentType;
                switch (ext) {
                    case "pdf":
                        contentType = 'application/pdf';
                        break;
                    case "ppt":
                        contentType = 'application/vnd.ms-powerpoint';
                        break;
                    case "pptx":
                        contentType = 'application/vnd.openxmlformats-officedocument.preplyentationml.preplyentation';
                        break;
                    case "xls":
                        contentType = 'application/vnd.ms-excel';
                        break;
                    case "xlsx":
                        contentType = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
                        break;
                    case "doc":
                        contentType = 'application/msword';
                        break;
                    case "docx":
                        contentType = 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
                        break;
                    case "csv":
                        contentType = 'application/octet-stream';
                        break;
                    default:
                        return response.file(path);
                }
                return response(content).header('Content-Type', contentType).header("Content-Disposition", "attachment; filename=" + file);
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
var upload = function(path, filename, folderName, key, response) {
    // Should encrypt file using the key
    fs.readFile(files.file[0].path, function(err, data) {
        checkFileExist(folderName).then(function (err) {
            console.log(config.publicFolder + folderName + '/' + filename);
            encryptor.encryptFile(path, key, config.publicFolder + folderName + '/' + filename);
            return response('Uploaded complete!');
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