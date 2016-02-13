var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');

app.get('/', function(req, res){
  res.send('<h1>Hello world</h1>');
});


app.post('/incoming_mail', function(req, res){
  var form = new formidable.IncomingForm()
  form.parse(req, function(err, fields, files) {
    console.log(fields.from)
    console.log(fields.headers['Subject'])
    console.log(fields.plain)
    console.log(fields.html)
    console.log(fields.reply_plain)
    res.writeHead(200, {'content-type': 'text/plain'})
    res.end('Message Received. Thanks!\r\n')
  })
})


http.listen(8080, function(){
  console.log('listening on *:8080');
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