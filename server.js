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
	console.log(data.text);
	console.log("data type: " + (typeof data.text));
});

//app.post('/', function(req, res, next) {
    //req.form.complete(function(err, fields, files) {
    //if (err) { next(err); }
    //else {
    //        console.log(fields);
    //        console.log('---------------');
    //        console.log(files);
    //        res.redirect(req.url);
    //    }
    //});
  //  console.log('received post');
//});
