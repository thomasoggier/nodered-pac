module.exports = function (RED) {
    function LWCV(config) {
        //"use strict";
        //Init node
        RED.nodes.createNode(this,config);
        var node = this;
        // Require
        var ws = require("ws");
        var url = require("url");
        var HttpsProxyAgent = require('https-proxy-agent');
//        var XMLParser = require('fast-xml-parser');
        const {XMLParser, XMLBuilder, XMLValidator} = require('fast-xml-parser');

        // Create websocket connection
        node.path = "ws://192.168.1.40:8214";
        node.subprotocol = "Lux_WS"

        // match absolute url
        node.isServer = !/^ws{1,2}:\/\//i.test(node.path);
        var options = {};

        connectSocket();

        function connectSocket() {
            console.log("Try to connect socket");
            var socket = new ws(node.path, node.subprotocol, options);
            node.socket = socket;
    
            socket.on('open', function () {
                console.log("Socket Opened");
                // Connect wih the password
                socket.send("LOGIN;"+310790);
                console.log("Done");
            });

            socket.on('error', function (err) {
                console.log("Socket Error");
                console.log(err);
                connectSocket();
            });
            socket.on('close', function (code, reason) {
                console.log("Socket closed");
                connectSocket();
            });
            socket.on('message', function (data, flags) {
                console.log("Get message");
                var datastring = data.toString();
                const options = {   ignoreAttributes : false    };
                const parser = new XMLParser(options);
                let jsonObj = parser.parse(datastring); 
                //console.log(jsonObj);
                console.log(jsonObj['Navigation']);
                const { item } = jsonObj['Navigation'];
                item.forEach(getItemIdForNavigation);
                
            });
            //socket.on('ping', function () { console.log("ping"); });
            //socket.on('pong', function () { console.log("pong"); });
        };
        function getItemIdForNavigation(item)
        {
            switch (item['name'])
                {
                case "Informations":
                    node.informationsId = item['@_id'];
                    console.log("informationsId: "+node.informationsId);
                    break;
                case "Configuration":
                    node.configurationId = item['@_id'];
                    console.log("configurationIdnode: "+node.configurationId);
                    break;
                case "Programme horaire":
                    node.programmeHoraireID = item['@_id'];
                    console.log("programmeHoraireID: "+node.programmeHoraireID);
                    break;
                case "Accès: Utilisateur":
                    node.AccesUtilisateurID = item['@_id'];
                    console.log("AccesUtilisateurID: "+node.AccesUtilisateurID);
                    break;
                case "remote control":
                    node.RemoteControlID = item['@_id'];
                    console.log("RemoteControlID: "+node.RemoteControlID);
                    break;
                }
        }
        // On msg
        node.on('input', function(msg) {
            switch (msg.payload) { 
                case "refresh":
                    node.socket.ping();
                    break;
            }
            node.send(msg);
        });
    }
    RED.nodes.registerType("LWCV",LWCV);
}