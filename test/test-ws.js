//import WebSocket from 'ws';


module.exports = function (RED) {
    "use strict";



    


    function testws(config) {
        RED.nodes.createNode(this, config);
    
        var node = this;
        node.closing = false;

        node.on('input', function (msg) {

            ws = new WebSocket('ws://192.168.1.40:8214', 'Lux_WS');
            /*
            const ws = new WebSocket('ws://192.168.1.40:8214', {
                perMessageDeflate: false
            });
            ws.on('error', function error() {
                msg.payload = 'error';
                node.send(msg);
            });

            ws.on('open', function open() {
                msg.payload = 'open';
                node.send(msg);
                ws.send('LOGIN;310790');
            });

            ws.on('message', function message(data) {
                msg.payload = 'message';
                node.send(msg);
            });
            */
            msg.payload = 'done1';
            node.send(msg);
        });
    }

    RED.nodes.registerType("test-ws",testws);
}