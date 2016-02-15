var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');
var request = require('request');
var parseString = require('xml2js').parseString;

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
    var type = emailContent.search(/HRMS/i) > -1 ? "HRMS" : (emailContent.search(/EHR/i) > -1 ? "EHR" : "ERP");
    getLead(UID, type);
});

//gets lead information
function getLead(UID, type){
    var LID = LIDs[type];
    var today = new Date(Date.now())
    var yesterdayStr = (today.getMonth() + 1) + '/' + (today.getDate()-1) + '/' +  today.getFullYear()
    var tomorrowStr = (today.getMonth() + 1) + '/' + (today.getDate() + 1) + '/' +  today.getFullYear()
    var query = {
        "UID" : parseInt(UID)
    }
    var queryJson = JSON.stringify(query)
    var payload = 
      {
        "key" : "4BE5B85E834B62AFBCC04E6AA7B36518CBA79A8B316917E3D660D7C535BD8AE5",
        "lid" : parseInt(LID),
        "SortOrder" : "DESC",
        "StartDate" : yesterdayStr,
        "EndDate" : tomorrowStr,
        "skip" : "0",
        "take" : "1",
        "query" : queryJson
      };
    var responseData = request({
        uri: "https://apidata.leadexec.net/",
        method: "POST",
        form: payload
    }, function (error, response, body) {
        return parseString(body, function(err,result){
	    var leadData = result["Leads"]["Lead"][0];
	    for (var name in leadData) {
                if (leadData.hasOwnProperty(name)){
                    leadData[name] = leadData[name][0];
                };
            };
            console.log(leadData["UID"]);
	});
    });
}
