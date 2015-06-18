/**
 * Created by daniela on 6/18/15.
 */


/*
 * Require modules
 */
var fs = require('fs'),
    multiparty = require('multiparty'),
    walk = require('walk'),
    Config = require('./config.js'),
    Q = require('q');

/* Public Functions */

/**
 * Display upload form
 **/

exports.display_form = {
    handler: function(request, response) {

        var client = request.params.client;

        response(
            '<form action="/upload/'+client+'" method="post" enctype="multipart/form-data">' +
            '<input type="file" name="file">' +
            '<input type="submit" value="Send">' +
            '</form>'
        );
    }
};

/**
 * Upload file to the gluterfs
 **/

exports.uploadFile = {

    payload: {
        maxBytes: 209715200,
        output: 'stream',
        parse: false
    },
    handler: function(request, response) {

        var client = request.params.client,
            form = new multiparty.Form();

        form.parse(request.payload, function(err, fields, files) {
            if (err)
                return response(err);
            else
                upload(files, client, response);
        });
    }
};


/**
 * Get file
 **/

exports.getFile = {

    handler: function(request, response) {

        var file = request.params.file,
            client = request.params.client,
            path = Config.publicFolder + client +'/' + file,
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
    }
};

/**
 *get fileList
 */

exports.fileList = {

    handler: function(request, response) {

        var files = [];

        // Walker configuration
        var walker = walk.walk(Config.publicFolder, {
            followLinks: false
        });

        walker.on('file', function(root, stat, next) {
            // Add this file to the list of files
            files.push(stat.name);

            next();
        });

        walker.on('end', function() {
            return response(files);
        });
    }
};

/* Private Functions */

/**
 * Upload file
 * Private function
 **/

var upload = function(files, client, response) {
    fs.readFile(files.file[0].path, function(err, data) {


        checkFileExist(client).then(function (err) {
            fs.writeFile(Config.publicFolder + client + '/' + files.file[0].originalFilename, data, function(err) {
                if (err)
                    return response(err);
                else
                    return response('File uploaded to: ' + Config.publicFolder + client + '/' + files.file[0].originalFilename);

            });
        });
    });
};

/**
 * Check file existence and create if not exist
 **/

var checkFileExist = function(folder) {

    var deferred = Q.defer();

        var main = Config.publicFolder;

        fs.exists(main + folder, function (exists) {

            if (exists === false) {
                fs.mkdirSync(main + folder);
                deferred.resolve(true);
            }
            fs.exists(main + folder, function (exists) {
                if (exists === false) {
                    fs.mkdirSync(main + folder);
                    deferred.resolve(true);
                }
            });
        });

    return deferred.promise;

};
