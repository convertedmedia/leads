var app = require('express')();
var http = require('http').Server(app);
var mailin = require('mailin');
var request = require('requestretry');
var parser = require('xml2json');
var geo = require ('geoip2ws') (105273, "yIr8LibI16CA", 'city', 2000);
var io = require('socket.io')(http);
var validator = require('validator');
var mysql = require('mysql');
var ProgressBar = require('progress');

var LIDs = {
	"ERP" : "1762",
	"HRMS" : "3515",
	"EHR" : "5432",
}

app.get('/', function(req, res){
	res.sendFile(__dirname + "/index.html");
});

http.listen(80, function(){
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
function getLead(type) {
	var connection = mysql.createConnection({
		host : 'leadsdb.crijmtwg9nkv.us-west-1.rds.amazonaws.com',
		user : 'gabriel',
		password : 'NEWnewyear2412',
		ssl : 'Amazon RDS'
	});
	console.log(Date.now() + " " + type);
	var LID = LIDs[type];
	var today = new Date();
	var yesterday = new Date(today);
	yesterday.setDate(today.getDate() - 1);
	var tomorrow = new Date(today);
	tomorrow.setDate(today.getDate() + 1);
	var yesterdayStr = (yesterday.getMonth() + 1) + '/' + yesterday.getDate() + '/' +  yesterday.getFullYear();
	var tomorrowStr = (tomorrow.getMonth() + 1) + '/' + tomorrow.getDate() + '/' +  tomorrow.getFullYear();
	var payload = {
		"key" : "4BE5B85E834B62AFBCC04E6AA7B36518CBA79A8B316917E3D660D7C535BD8AE5",
		"lid" : parseInt(LID),
		"SortOrder" : "DESC",
		"StartDate" : "01/01/2016",
		"EndDate" : tomorrowStr,
		"skip" : "0",
		"take" : "100"
	};
	function leadGetSuccess(err, response, body) {
		var leadsData = parser.toJson(body, {object: true});
		return err || leadsData["Leads"]["sentcount"] == 0;
	};
	request({
		method: "post",
		uri: "https://apidata.leadexec.net/",
		formData: payload,
		maxAttempts: 12,
		retryDelay: 1500,
		retryStrategy: leadGetSuccess
	}, function (error, response, body) {
		var leadsData = parser.toJson(body, {object: true});
		if (leadsData["Leads"]["sentcount"] > 0) {
			var progress = new ProgressBar(':bar', {total: leadsData["Leads"]["sentcount"]});
			for (i = 0; i < leadsData["Leads"]["sentcount"]; i++) {
				var leadData = leadsData["Leads"]["Leads"][i];
				var dbData = processLead(leadData, type);
				connection.query('INSERT INTO capture SET ?', dbData, function(err, result) {
					progress.tick;
				};
			};
		} else {
			console.log("needed more attempts, response: " + leadsData);
			io.emit('lead notification', JSON.stringify({"gotLead": false, "gotLocation": false, "UID": UID, "Market" : type}));
		}
	});
}

io.on('connection', function(socket){
	console.log('a user connected');
});

function processLead(leadData, type) {
	var dbData = 
		[
			if (typeof leadData.UID === undefined) {DEFAULT} else {leadData.UID},
			if (typeof leadData.FirstName === undefined) {DEFAULT} else {leadData.FirstName},
			if (typeof leadData.LastName === undefined) {DEFAULT} else {leadData.LastName},
			if (typeof leadData.Company === undefined) {DEFAULT} else {leadData.Company},
			if (typeof leadData.Email === undefined) {DEFAULT} else {leadData.Email},
			if (typeof leadData.Phone === undefined) {DEFAULT} else {leadData.Phone},
			if (typeof leadData.JobTitle === undefined) {DEFAULT} else {leadData.JobTitle},
			if (typeof leadData.City === undefined) {DEFAULT} else {leadData.City},
			if (typeof leadData.State === undefined) {DEFAULT} else {leadData.State},
			if (typeof leadData.Website === undefined) {DEFAULT} else {leadData.Website},
			if (typeof leadData.NumberofEmployees === undefined) {DEFAULT} else {leadData.NumberofEmployees},
			if (typeof leadData.UsingERP === undefined) {DEFAULT} else {leadData.UsingERP},
			if (typeof leadData.ConsideringERP === undefined) {DEFAULT} else {leadData.ConsideringERP},
			if (typeof leadData.Timeframe === undefined) {DEFAULT} else {leadData.Timeframe},
			if (typeof leadData.DecisionMaker === undefined) {DEFAULT} else {leadData.DecisionMaker},
			if (typeof leadData.EstimatedBudget === undefined) {DEFAULT} else {leadData.EstimatedBudget},
			if (typeof leadData.CompanySector === undefined) {DEFAULT} else {leadData.CompanySector},
			if (typeof leadData.RequiredFunctions === undefined) {DEFAULT} else {leadData.RequiredFunctions},
			if (typeof leadData.OperatingSystem === undefined) {DEFAULT} else {leadData.OperatingSystem},
			if (typeof leadData.Industry === undefined) {DEFAULT} else {leadData.Industry},
			if (typeof leadData.Demo === undefined) {DEFAULT} else {leadData.Demo},
			if (typeof leadData.LeadRating === undefined) {DEFAULT} else {leadData.LeadRating},
			if (typeof leadData.DecisionMakerName === undefined) {DEFAULT} else {leadData.DecisionMakerName},
			if (typeof leadData.Comments === undefined) {DEFAULT} else {leadData.Comments},
			if (typeof leadData.IPAddress === undefined) {DEFAULT} else {leadData.IPAddress},
			if (typeof leadData.Name === undefined) {DEFAULT} else {leadData.Name},
			if (typeof leadData.TelephoneNumber === undefined) {DEFAULT} else {leadData.TelephoneNumber},
			if ( type = "ERP") { if (typeof leadData.YouNotes === undefined) {DEFAULT} else {leadData.YouNotes}} else { if (typeof leadData.YourNotes === undefined) {DEFAULT} else {leadData.YourNotes}},
			if (typeof leadData.Classification === undefined) {DEFAULT} else {leadData.Classification},
			if (typeof leadData.LeadOwner === undefined) {DEFAULT} else {leadData.LeadOwner},
			if (typeof leadData.SearchTerm === undefined) {DEFAULT} else {leadData.SearchTerm},
			if (typeof leadData.Country === undefined) {DEFAULT} else {leadData.Country},
			if (typeof leadData.Address === undefined) {DEFAULT} else {leadData.Address},
			if (typeof leadData.CurrentVendor === undefined) {DEFAULT} else {leadData.CurrentVendor},
			if (typeof leadData.WouldAttendEvent === undefined) {DEFAULT} else {leadData.WouldAttendEvent},
			if (typeof leadData.ZipPostal === undefined) {DEFAULT} else {leadData.ZipPostal},
			if (typeof leadData.NumberofUsers === undefined) {DEFAULT} else {leadData.NumberofUsers},
			if (typeof leadData.PurchasingInvolvement === undefined) {DEFAULT} else {leadData.PurchasingInvolvement},
			if (typeof leadData.AnnualRevenue === undefined) {DEFAULT} else {leadData.AnnualRevenue},
			if (typeof leadData.StateProvince === undefined) {DEFAULT} else {leadData.StateProvince},
			if (typeof leadData.SageIndustry === undefined) {DEFAULT} else {leadData.SageIndustry},
			if (typeof leadData.SageBudget === undefined) {DEFAULT} else {leadData.SageBudget},
			if (typeof leadData.LeadRevenue === undefined) {DEFAULT} else {leadData.LeadRevenue},
			if (typeof leadData.LastCall === undefined) {DEFAULT} else {leadData.LastCall},
			if (typeof leadData.DateofCall === undefined) {DEFAULT} else {leadData.DateofCall},
			if (typeof leadData.CallNote === undefined) {DEFAULT} else {leadData.CallNote},
			if (typeof leadData.LastEmail === undefined) {DEFAULT} else {leadData.LastEmail},
			if (typeof leadData.DateofEmail === undefined) {DEFAULT} else {leadData.DateofEmail},
			if (typeof leadData.EmailNote === undefined) {DEFAULT} else {leadData.EmailNote},
			if (typeof leadData.SageJobTitle === undefined) {DEFAULT} else {leadData.SageJobTitle},
			if (typeof leadData.SageDepartment === undefined) {DEFAULT} else {leadData.SageDepartment},
			if (typeof leadData.TimeDifference === undefined) {DEFAULT} else {leadData.TimeDifference},
			if (typeof leadData.Download === undefined) {DEFAULT} else {leadData.Download},
			if (typeof leadData.LinkedInProfile === undefined) {DEFAULT} else {leadData.LinkedInProfile},
			if (typeof leadData.IndustrySector === undefined) {DEFAULT} else {leadData.IndustrySector},
			if (typeof leadData.Territory === undefined) {DEFAULT} else {leadData.Territory},
			if (typeof leadData.CampaignSource === undefined) {DEFAULT} else {leadData.CampaignSource},
			if (typeof leadData.DownloadURL === undefined) {DEFAULT} else {leadData.DownloadURL},
			if (typeof leadData.ERPProject === undefined) {DEFAULT} else {leadData.ERPProject},
			if (typeof leadData.utm_source === undefined) {DEFAULT} else {leadData.utm_source},
			if (typeof leadData.utm_medium === undefined) {DEFAULT} else {leadData.utm_medium},
			if (typeof leadData.utm_campaign === undefined) {DEFAULT} else {leadData.utm_campaign},
			if (typeof leadData.gclid === undefined) {DEFAULT} else {leadData.gclid},
			if (typeof leadData.IndustrySub-Category === undefined) {DEFAULT} else {leadData.IndustrySub-Category},
			if (typeof leadData.LeadType === undefined) {DEFAULT} else {leadData.LeadType},
			if (typeof leadData.Status === undefined) {DEFAULT} else {leadData.Status},
			if (typeof leadData.CommentsContinued === undefined) {DEFAULT} else {leadData.CommentsContinued},
			if (typeof leadData.DateofQualification === undefined) {DEFAULT} else {leadData.DateofQualification},
			if (typeof leadData.SageRevenue === undefined) {DEFAULT} else {leadData.SageRevenue},
			if (typeof leadData.Multilingual === undefined) {DEFAULT} else {leadData.Multilingual},
			if (typeof leadData.UKRevenue === undefined) {DEFAULT} else {leadData.UKRevenue},
			if (typeof leadData.InitialClassification === undefined) {DEFAULT} else {leadData.InitialClassification},
			if (typeof leadData.Sage2016CampaignIndustries === undefined) {DEFAULT} else {leadData.Sage2016CampaignIndustries},
			if (typeof leadData.UsingHRsoftware === undefined) {DEFAULT} else {leadData.UsingHRsoftware},
			if (typeof leadData.NumberofUsersOld === undefined) {DEFAULT} else {leadData.NumberofUsersOld},
			if (typeof leadData.CloudInstalled === undefined) {DEFAULT} else {leadData.CloudInstalled},
			if (typeof leadData.ConsideringPurchaseofHRMS === undefined) {DEFAULT} else {leadData.ConsideringPurchaseofHRMS},
			if (typeof leadData.SentEmail === undefined) {DEFAULT} else {leadData.SentEmail},
			if (typeof leadData.Project === undefined) {DEFAULT} else {leadData.Project},
			if (typeof leadData.InternationalOffices === undefined) {DEFAULT} else {leadData.InternationalOffices},
			if (typeof leadData.Requirements === undefined) {DEFAULT} else {leadData.Requirements},
			if (typeof leadData.SeniorJobTitle === undefined) {DEFAULT} else {leadData.SeniorJobTitle},
			if (typeof leadData.NumberofEmployeesNonRange === undefined) {DEFAULT} else {leadData.NumberofEmployeesNonRange},
			if (typeof leadData.SageEmployees === undefined) {DEFAULT} else {leadData.SageEmployees},
			if (typeof leadData.SageCampaignIndustries === undefined) {DEFAULT} else {leadData.SageCampaignIndustries},
			if (typeof leadData.PracticeSize === undefined) {DEFAULT} else {leadData.PracticeSize},
			if (typeof leadData.PracticeSpecialty === undefined) {DEFAULT} else {leadData.PracticeSpecialty},
			if (typeof leadData.ProjectTimeframe === undefined) {DEFAULT} else {leadData.ProjectTimeframe},
			if (typeof leadData.PurachasingTimeline === undefined) {DEFAULT} else {leadData.PurachasingTimeline},
			if (typeof leadData.UsingEHR === undefined) {DEFAULT} else {leadData.UsingEHR},
		]
	return dbData;
}

function getLocation(leadData) {
	try {
		geo(leadData["IPAddress"], function(err, data) {
			if (err) {
				console.log(err);
			} else {
				if (typeof data.country !== undefined && typeof data.country.names !== undefined && data.country.names.en.length) {
					leadData["Country"] = data.country.names.en;
					leadData.gotLocation = true;
					console.log(leadData.Country);
				} else if (typeof data.registered_country.names.en !== undefined && data.registered_country.names.en.length) {
					leadData["Country"] = data.registered_country.names.en;
					leadData.gotLocation = true;
					console.log(leadData.Country);
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
			if ("United States" == leadData.Country) {
				validatePhone(leadData);
			} else 	if (["United Kingdom", "Canada", "Ireland"].indexOf(leadData.Country) > -1 || !(leadData.hasOwnProperty("Country"))) {
				io.emit('lead notification', JSON.stringify(leadData));
				console.log("sent notification");
			};
		});
	} catch (err) {
		console.log(err);
	};
};

function validatePhone(leadData) {
	var phoneNumber = leadData.TelephoneNumber;
	phoneNumber = validator.whitelist(phoneNumber, '0123456789x');
	phoneNumber = phoneNumber.split('x')[0];
	if (phoneNumber.substring(0,1) == '1') {
		phoneNumber = phoneNumber.substring(1);
	};
	phoneNumber = phoneNumber.substring(0,10);
	if ([0,1].indexOf(phoneNumber.substring(0,1)) > -1 || phoneNumber.length < 10) {
		leadData.PhoneValid = 'bad'
		io.emit('lead notification', JSON.stringify(leadData));
		console.log(leadData.Country + 'phone invalid');
	} else {
		var payload = {
			token : '723CB24B-85FC-0681-D441-F752993151EA',
			phone : phoneNumber
		};
		request({
			method: "post",
			uri: "https://api.realvalidation.com/rpvWebService/RealPhoneValidationTurbo.php",
			formData: payload,
			maxAttempts: 5,
			retryDelay: 2000,
			retryStrategy: request.RetryStrategies.HTTPOrNetworkError
		}, function (error, response, body) {
			if (response) {
				var bodyJSON = parser.toJson(body, {object: true});
				leadData.PhoneValid = bodyJSON.response.status;
				leadData.PhoneIsCell = bodyJSON.response.iscell == 'Y'
			}
			io.emit('lead notification', JSON.stringify(leadData));
			console.log("sent notification");
		});
	};
}
	
