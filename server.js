var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');
var request = require('request');
var RequestRetry = require('node-request-retry');
var parser = require('xml2json');
var geo = require ('geoip2ws') (105273, "yIr8LibI16CA", 'city', 2000);
var io = require('socket.io')(http);

RequestRetry.setMaxRetries(12);
RequestRetry.setRetryDelay(2500);

var LIDs = {
    "ERP" : "1762",
    "HRMS" : "3515",
    "EHR" : "5432",
}

app.get('/', function(req, res){
  res.sendFile(__dirname + "/index.html");
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
    var UIDLocation = emailContent.search("Lead ") + 5;
    var UID = emailContent.substring(UIDLocation,UIDLocation + 8);
    var type = emailContent.search(/HRMS/i) > -1 ? "HRMS" : (emailContent.search(/EHR/i) > -1 ? "EHR" : "ERP");
	getLead(UID, type);
});

//gets lead information
function getLead(UID, type){
    var LID = LIDs[type];
    var today = new Date(Date.now());
    var yesterdayStr = (today.getMonth() + 1) + '/' + (today.getDate()-1) + '/' +  today.getFullYear();
    var tomorrowStr = (today.getMonth() + 1) + '/' + (today.getDate() + 1) + '/' +  today.getFullYear();
    var query = {
        "UID" : parseInt(UID)
    };
	var queryJson = JSON.stringify(query);
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
    var requestRetry = new RequestRetry();
	var retryConditions = [function (response, body) {
		var leadsData = parser.toJson(body, {object: true});
		return leadsData["Leads"]["sentcount"] == 0;
	}];
	requestRetry.setRetryConditions(retryConditions);
    requestRetry.post({uri: "https://apidata.leadexec.net/", formData: payload}, function (error, response, body) {
		var leadsData = parser.toJson(body, {object: true});
        if (leadsData["Leads"]["sentcount"] == 0) {
			console.log("too few tries");
		} else {
			console.log("Number of attempts: " + response.attempts);
		};
        var leadsData = parser.toJson(body, {object: true});
        var leadData = leadsData["Leads"]["Lead"]
		getLocation(leadData);
    });
}

io.on('connection', function(socket){
  console.log('a user connected');
});

function getLocation(leadData) {
    geo(leadData["IPAddress"], function(err, data) {
        if (err) {
            console.log(err);
        } else {
            if (typeof data.country.names.en !== undefined && data.country.names.en.length) {
             	leadData["Country"] = data.country.names.en;
           	} else if (typeof data.registered_country.names.en !== undefined && data.registered_country.names.en.length) {
                leadData["Country"] = data.registered_country.names.en;
           	};
           	if (typeof data.subdivisions !== undefined && typeof data.subdivisions.length > 0 &&  typeof data.subdivisions[0].iso_code !== undefined && data.subdivisions[0].iso_code.length) {
               	leadData.StateProvince = data.subdivisions[0].iso_code;
           	};
           	if (typeof data.traits.autonomous_system_organization !== undefined && data.traits.autonomous_system_organization.length) {
				leadData.ServerCountry = data.traits.autonomous_system_organization;
			};
		}
		if (["United States", "United Kingdom", "Canada"].indexOf(leadData.Country) > -1) {
			io.emit('lead notification', JSON.stringify({"countryKnown": leadData.hasOwnProperty("Country"), "leadData": leadData}));
	    };
        console.log(leadData.Country);
    });
};
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
