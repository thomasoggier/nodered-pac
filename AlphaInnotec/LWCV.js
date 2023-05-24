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
            socket.on('error', function (err) {
                console.log("Socket Error");
                console.log(err);
                connectSocket();
            });
            socket.on('close', function (code, reason) {
                console.log("Socket closed");
                connectSocket();
            });
            //socket.on('ping', function () { console.log("ping"); });
            //socket.on('pong', function () { console.log("pong"); });
            socket.on('open', function () {
                console.log("Socket Opened");
                // Connect wih the password
                socket.send("LOGIN;"+310790);
                console.log("Done");
                socket.once('message', handlerNavigationRequest);
            });
        };
// Navigations
        function handlerNavigationRequest(data) {
            console.log("handlerNavigationRequest");
            var datastring = data.toString();
            const options = {   ignoreAttributes : false    };
            const parser = new XMLParser(options);
            let jsonObj = parser.parse(datastring); 
            //console.log(jsonObj);
            //console.log(jsonObj['Navigation']);
            const { item } = jsonObj['Navigation'];
            item.forEach(getItemIdForNavigation);
            node.socket.once('message', handlerInformationsRequest);
            node.socket.send("GET;"+node.informationsId);
        }
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
// Informations
        function handlerInformationsRequest(data) {
            console.log("handlerInformationsRequest");
            shortResult(data);
            node.socket.once('message', handlerConfigurationRequest);
            node.socket.send("GET;"+node.configurationId);
        }
// Configuration
        function handlerConfigurationRequest(data) {
            console.log("handlerConfigurationRequest");
            shortResult(data);
            //node.socket.once('message', handlerInformationsRequest);
            //node.socket.send("GET;"+node.configurationId);
        }
// Common Result
        function shortResult(data) {
            var datastring = data.toString();
            const options = {   ignoreAttributes : false    };
            const parser = new XMLParser(options);
            let jsonObj = parser.parse(datastring);
            const { item } = jsonObj['Content'];

            if (Array.isArray(item))
                item.forEach(function (elementgroup) {
                    console.log("============================");
                    //console.log(elementgroup);
                    const { item } = elementgroup;
                    const groupName = elementgroup['name'][0];
                    if (Array.isArray(item))
                        item.forEach(function (element) { 
                            sendResultValue(groupName, element['name'], element['value']);
                            if (groupName == "Mode de fonctionnement") {
                                console.log(element['name']);
                                if (element['name'] == "Eau Chaude Sanitaire") {
                                    node.ecsId = element['@_id'];
                                }
                                if (element['name'] == "Circuit chauffage") {
                                    node.heatingId = element['@_id'];
                                }
                            }
                        })
                    else
                        sendResultValue(groupName, item['name'], item['value']);                    
                });
        }

// Result
        function getValueAndUnit(value)
        {
            var unitsToRemove = ["kWh", "°C", "bar", "l/h", "%", "h", "RPM", "V", "K"];
            var unit;
            for (var unit_pos in unitsToRemove)
            {
                value = value.toString();
                if(value.includes(unitsToRemove[unit_pos]))
                {
                    value = value.replace(unitsToRemove[unit_pos], '');
                    unit = unitsToRemove[unit_pos];
                }
            }
            value.trim();
            return [value, unit];
        }
        function sendResultValue(group, name, value) {
            var msg = {};
            var valueWithUnits = getValueAndUnit(value)
            msg.payload = {
                'group': group,
                'name': name,
                'value': valueWithUnits[0],
                'units': valueWithUnits[1]
            }
            console.log(group + ": " + name + " -> " + valueWithUnits[0] +"["+valueWithUnits[1]+"]");
            node.send(msg);
        }




        function stringModeToInt(modeName)
        {
            console.log("stringModeToInt: "+modeName);
            switch (modeName) {
                case "auto":
                    return 0;
                case "appoint":
                    return 1;
                case "party":
                    return 2;
                case "holiday":
                    return 3;
                case "off":
                    return 4;
                default:
                    return 0;
            }
        }
 // node.on msg
        node.on('input', function (msg, send, done) {
            console.log(msg);
            switch (msg.payload.function) {
                case "refresh":
                    console.log("refresh");
                    node.socket.once('message', handlerInformationsRequest);
                    node.socket.send("GET;" + node.informationsId);
                    break;
                case "ecs":
                    node.socket.send("SET;set_" + node.ecsId +";"+ stringModeToInt(msg.payload.mode));
                    node.socket.send("SAVE;1");
                    break;
                case "heating":
                    node.socket.send("SET;set_"+node.heatingId+";"+stringModeToInt(msg.payload.mode));
                    node.socket.send("SAVE;1");
                    break;
            }
            done();
        });
    }
    RED.nodes.registerType("LWCV",LWCV);
}