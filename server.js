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
    request({
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
            handleLead(leadData);
	});
    });
}

function handleLead(leadData) {
    var url = "https://geoip.maxmind.com/geoip/v2.1/city/" + leadData["IPAddress"];
    var auth = {
        'Authorization' : "Basic " + Utilities.base64Encode("105273:yIr8LibI16CA")
      }
    request({
        uri: url,
        method: "GET",
        headers: auth
    });
    }, function (error, response, body) {
	var responseJSON = JSON.parse(response);
        console.log("Country: " + responseJSON["country"]["names"]["en"]);
        console.log("Subdivision: " + responseJSON["subdivisions"][0]["names"]["en"]);
        console.log("iso code: " + responseJSON["subdivisions"][0]["iso_code"]);
        console.log("Registered country: " + responseJSON["registered_country"][0]["names"]["en"]);
        console.log("Organisation: " + responseJSON["traits"]["autonomous_system_organization"]);
    });
}


/*
 var success = true
      var url = "https://geoip.maxmind.com/geoip/v2.1/city/" + ip
      var headers = {
        'Authorization' : "Basic " + Utilities.base64Encode("105273:yIr8LibI16CA")
      }
      var options = {
        'method' : 'get',
        'headers' : headers,
        "muteHttpExceptions" : true
      }
      var response = UrlFetchApp.fetch(url, options);
      var json =  response.getContentText();
      var data = JSON.parse(json);
      trials++;
    } catch(error) {
      success = false;
      trials++;
    }
  } while ((success == false || typeof data == "undefined") && trials < 3);
  if (success == true) {
    try {
      var region = data["subdivisions"][0]["names"]["en"]
    } catch(error) {
      var region = "";
    }
    try {
      var org = data["traits"]["autonomous_system_organization"]
    } catch(error) {
      var org = "";
    }
    try {
      var state = data["subdivisions"][0]["iso_code"]
    } catch(error) {
      var state = "";
    }
    try {
      var answer = [data["country"]["names"]["en"],region,org];
    } catch(error) {
      try {
        var country = data["registered_country"][0]["names"]["en"]
      } catch(error) {
        var country = "";
      }
      var answer = [country, region, org]
    }
    */