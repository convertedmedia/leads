var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});

http.listen(8080, function(){
  console.log('listening on *:8080');
});

mailin.start({
    port: 25,
    disableWebhook:true
});

mailin.on('message', function(connection, data, content) {
    console.log("received email!");
});