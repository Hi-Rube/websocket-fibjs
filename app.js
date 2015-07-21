/**
 * @author Rube
 * @date 15/7/20
 * @desc 主入口
 */

var net = require('net');
var hash = require('hash');
var codeframe = require('./codeframe');

var FibWSServer = function (config) {
    if (!(config['port'] && config['onMessage'] && config['onClose'] && config['onConnection'])) {
        return console.log('please check your config (Include port: [Integer], onMessage: [Function], onClose: [Function], onConnection: [Function]');
    }

    this.config = config;
    this.server = null;

    /**
     * 编码 websocket-key
     * @param key
     * @returns {string}
     */
    var _challenge = function (key) {
        var salt = "258EAFA5-E914-47DA-95CA-C5AB0DC85B11";
        var finalKey = hash.sha1(new Buffer(key + salt)).digest().base64().toString();
        return finalKey;
    };

    /**
     * 转换协议
     * @param header
     * @param conn
     * @returns {string}
     */
    this._handshake = function (header, conn) {
        var output = [], br = '\r\n';

        var key = _challenge(header['Sec-WebSocket-Key']);

        output.push(
            'HTTP/1.1 101 WebSocket Protocol Handshake',
            'Upgrade: WebSocket',
            'Connection: Upgrade',
            'Sec-WebSocket-Accept: ' + key,
            'Sec-WebSocket-Origin: ' + header['Origin'],
            'Sec-WebSocket-Location: ws://' + header['Host'] + header['Method'][1],
            br
        );

        var output = output.join(br);
        return output;
    };
};

FibWSServer.prototype.run = function () {
    var that = this;
    this.server = new net.TcpServer(this.config.port, function (conn) {

        //first time request
        var headers = conn.read().toString().split('\r\n');
        that.config.onConnection(conn, headers);

        var headerObj = {};
        headers.forEach(function (header, index) {
            if (index == 0) {
                headerObj['Method'] = header.split(' ');
            }
            var h = header.split(': ');
            headerObj[h[0]] = h[1];
        });
        headers = headerObj;

        if (headers['Connection'].toLowerCase().indexOf('upgrade') != -1) {
            if (headers['Upgrade'].toLowerCase() !== 'websocket') return;
            //协议转换
            var responsestr = that._handshake(headers, conn);
            conn.write(responsestr);

            while (true) {
                try {
                    var content = conn.read();
                } catch (e) {
                    return that.config.onClose();
                }
                if (content) {
                    var receiveStr = codeframe.decodeFrame(content);
                    if (receiveStr.Opcode == 8) {
                        //return that.config.onClose();
                    }
                    that.config.onMessage(receiveStr.Payload_data.toString(), conn);
                }
            }
        }
    });

    this.server.run();
};

/**
 * 发送数据
 * @param message
 * @param conn
 */
FibWSServer.sendMessage = function (message, conn) {
    var sendStr = codeframe.encodeFrame({
        FIN: 1,
        Opcode: 1,
        MASK: 0,
        Payload_data: new Buffer(message)
    });
    conn.write(sendStr);
};

module.exports = FibWSServer;
