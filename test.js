/**
 * @page
 * @module
 * @author Rube
 * @date 15/7/20
 * @desc
 */

var FibWSServer = require('./app.js');

var server = new FibWSServer({
    port: 4400,
    onMessage: function (data, conn) {
        console.log(data);
        if (data === 'close') {
            conn.close();
        }
        FibWSServer.sendMessage(data, conn);
    },
    onConnection: function () {
        console.log('connection');
    },
    onClose: function () {
        console.log('close');
    }
});
server.run();