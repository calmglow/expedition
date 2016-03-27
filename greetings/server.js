var server = require('http').createServer()
  , url = require('url')
  , WebSocketServer = require('ws').Server
  , wss = new WebSocketServer({ server: server })
  , express = require('express')
  , app = express()
  , port = 1234;

// static express server
app.use(express.static('.'));
server.on('request', app);
server.listen(port, function () { console.log('Listening on ' + server.address().port) });

// listen socket and broadcast msg to other
wss.on('connection', function (ws){
    ws.on('message', function (msg){
        console.log('received: %s', msg);
        wss.clients.forEach(function(other){
            if (other === ws){
                return;
            }else{
                other.send(msg);
            }
        });

    });
});