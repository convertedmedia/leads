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

// Handle email
mailin.on('message', function(connection, data, content) {
    var emailContent = data.text;
    var UIDLocation = emailContent.search(/Lead /i) + 5;
    var UID = emailContent[UIDLocation, UIDLocation + 8];
    console.log(UID);
});
