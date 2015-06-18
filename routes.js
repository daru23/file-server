/**
 * Created by daniela on 6/18/15.
 */

var	uploads = require('./uploads.js'),
    static    = require('./static.js');

// API Server Endpoints
exports.home         = { method: 'GET',    path: '/',                       config: static.get             };
exports.upload       = { method: 'GET',    path: '/upload/{client}',        config: uploads.display_form   };
exports.uploadPost   = { method: 'POST',   path: '/upload/{client}',        config: uploads.uploadFile     };
exports.getFile      = { method: 'GET',    path: '/get/{client}/{file}',    config: uploads.getFile        };
exports.listFiles    = { method: 'GET',    path: '/fileList',               config: uploads.fileList       };
