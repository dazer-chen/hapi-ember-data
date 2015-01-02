// BASE SETUP
// =============================================================================

var Hapi = require('hapi');
var hapiEmberDataPlugin = require('../');


// Setup Server
// =============================================================================

var server = new Hapi.Server();
server.connection({ port: 3000 });

// Plug-in register
// =============================================================================

server.register(hapiEmberDataPlugin, function (err) {
    if (err) {
        console.error('Failed to load plugin:', err);
    }
});

// Run the server
// =============================================================================

server.start(function () {
    console.log('Ember Data Server is running at:', server.info.uri);
});