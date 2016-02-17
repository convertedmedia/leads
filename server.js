var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');
var request = require('requestretry');
var parser = require('xml2json');
var geo = require ('geoip2ws') (105273, "yIr8LibI16CA", 'city', 2000);
var io = require('socket.io')(http);

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
    var today = new Date();
    var yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    var tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    var yesterdayStr = (yesterday.getMonth() + 1) + '/' + yesterday.getDate() + '/' +  yesterday.getFullYear();
    var tomorrowStr = (tomorrow.getMonth() + 1) + '/' + tomorrow.getDate() + '/' +  tomorrow.getFullYear();
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
    function leadGetSuccess(err, response, body) {
		var leadsData = parser.toJson(body, {object: true});
		return err || leadsData["Leads"]["sentcount"] == 0;
	};
	request({
		method: "post",
		uri: "https://apidata.leadexec.net/",
		formData: payload,
		maxAttempts: 10,
		retryDelay: 2000,
		retryStrategy: leadGetSuccess
	}, function (error, response, body) {
		if (response) {
			console.log("The number of request attempts: " + response.attempts);
        };
        var leadsData = parser.toJson(body, {object: true});
		if (leadsData["Leads"]["sentcount"] > 0) {
			var leadData = leadsData["Leads"]["Lead"];
			leadData.Market = type;
			leadData.gotLead = true;
			getLocation(leadData);
		} else {
			console.log("needed more attempts, response: " + leadsData);
			io.emit('lead notification', JSON.stringify({"gotLead": false, "gotLocation": false, "UID": UID, "Market" = type}));
		}
    });
}

io.on('connection', function(socket){
  console.log('a user connected');
});

function getLocation(leadData) {
	try {
		geo(leadData["IPAddress"], function(err, data) {
			if (err) {
				console.log(err);
			} else {
				if (typeof data.country !== undefined && typeof data.country.names.en !== undefined && data.country.names.en.length) {
					leadData["Country"] = data.country.names.en;
					leadData.gotLocation = true;
				} else if (typeof data.registered_country.names.en !== undefined && data.registered_country.names.en.length) {
					leadData["Country"] = data.registered_country.names.en;
					leadData.gotLocation = true;
				} else {
					leadData.gotLocation = false;
				}
				if (typeof data.subdivisions !== undefined && typeof data.subdivisions.length > 0 &&  typeof data.subdivisions[0].iso_code !== undefined && data.subdivisions[0].iso_code.length) {
					leadData.StateProvince = data.subdivisions[0].iso_code;
				};
				if (typeof data.traits.autonomous_system_organization !== undefined && data.traits.autonomous_system_organization.length) {
					leadData.ServerCountry = data.traits.autonomous_system_organization;
				};
			}
			if (["United States", "United Kingdom", "Canada", "Ireland"].indexOf(leadData.Country) > -1) {
				io.emit('lead notification', JSON.stringify(leadData));
			};
			console.log(leadData.Country);
		});
	} catch (err) {
		console.log(err);
	};
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
