/**
 * Created by daniela on 6/17/15.
 */

var Hapi = require('hapi'),
    Good = require('good'),
    routes = require('./routes.js');


var server = new Hapi.Server();

server.connection({ port: 3000 });

//server.route(routes.home);
server.route(routes.upload);
server.route(routes.uploadPost);
server.route(routes.getFile);
server.route(routes.listFiles);

server.start(function () {
    console.log('Server running at:', server.info.uri);
});

server.register({
    register: Good,
    options: {
        reporters: [{
            reporter: require('good-console'),
             events: {
                response: '*',
                log: '*'
            }
        }]
    }
}, function (err) {
      if (err) { throw err; }
      server.start(function () {
          server.log('info', 'Server running at: ' + server.info.uri);
      });
});