var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');

var LIDs = {
    "ERP" : "1762",
    "HRMS" : "3515",
    "EHR" : "5432",
}

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
    var emailContent = data.text
    var UIDLocation = emailContent.search(/\*Lead /i) + 6;
    var UID = emailContent.substring(UIDLocation,UIDLocation + 8);
    var type = emailContent.search(/HRMS/i) > -1 ? "HRMS" : (emailContent.search(/EHR/i) > -1 ? "EHR" : "HRMS");
    var leadData = getLead(UID, type);
});

function getLead(UID, type){
    var LID = LIDs[type];
    var xhttp = new XMLHttpRequest();
    var today = new Date(Date.now())
    var todayStr = (today.getMonth() + 1) + '/' + today.getDate() + '/' +  today.getFullYear()
    var tomorrowStr = (today.getMonth() + 1) + '/' + (today.getDate() + 1) + '/' +  today.getFullYear()
    var query = {
        "UID" : UID
    }
    var queryJson = JSON.stringify(query)
    var payload = 
      {
        "key" : "4BE5B85E834B62AFBCC04E6AA7B36518CBA79A8B316917E3D660D7C535BD8AE5",
        "lid" : LID,
        "SortOrder" : "DESC",
        "StartDate" : todayStr,
        "EndDate" : tomorrowStr,
        "skip" : "0",
        "take" : "1",
        "query" : queryJson
      };
  xhttp.open('POST', 'https://apidata.leadexec.net/', true);
  xhttp.send(payload);
  xhttp.onreadystatechange = function() {
    if (xhttp.readyState == 4 && xhttp.status == 200) {
        console.log(xhttp.responseText);
    };
};
  
  
  
  

}