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
getLead("ERP");

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
				});
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
			typeof leadData.UID === undefined ? DEFAULT : leadData.UID,
			typeof leadData.FirstName === undefined ? DEFAULT : leadData.FirstName,
			typeof leadData.LastName === undefined ? DEFAULT : leadData.LastName,
			typeof leadData.Company === undefined ? DEFAULT : leadData.Company,
			typeof leadData.Email === undefined ? DEFAULT : leadData.Email,
			typeof leadData.Phone === undefined ? DEFAULT : leadData.Phone,
			typeof leadData.JobTitle === undefined ? DEFAULT : leadData.JobTitle,
			typeof leadData.City === undefined ? DEFAULT : leadData.City,
			typeof leadData.State === undefined ? DEFAULT : leadData.State,
			typeof leadData.Website === undefined ? DEFAULT : leadData.Website,
			typeof leadData.NumberofEmployees === undefined ? DEFAULT : leadData.NumberofEmployees,
			typeof leadData.UsingERP === undefined ? DEFAULT : leadData.UsingERP,
			typeof leadData.ConsideringERP === undefined ? DEFAULT : leadData.ConsideringERP,
			typeof leadData.Timeframe === undefined ? DEFAULT : leadData.Timeframe,
			typeof leadData.DecisionMaker === undefined ? DEFAULT : leadData.DecisionMaker,
			typeof leadData.EstimatedBudget === undefined ? DEFAULT : leadData.EstimatedBudget,
			typeof leadData.CompanySector === undefined ? DEFAULT : leadData.CompanySector,
			typeof leadData.RequiredFunctions === undefined ? DEFAULT : leadData.RequiredFunctions,
			typeof leadData.OperatingSystem === undefined ? DEFAULT : leadData.OperatingSystem,
			typeof leadData.Industry === undefined ? DEFAULT : leadData.Industry,
			typeof leadData.Demo === undefined ? DEFAULT : leadData.Demo,
			typeof leadData.LeadRating === undefined ? DEFAULT : leadData.LeadRating,
			typeof leadData.DecisionMakerName === undefined ? DEFAULT : leadData.DecisionMakerName,
			typeof leadData.Comments === undefined ? DEFAULT : leadData.Comments,
			typeof leadData.IPAddress === undefined ? DEFAULT : leadData.IPAddress,
			typeof leadData.Name === undefined ? DEFAULT : leadData.Name,
			typeof leadData.TelephoneNumber === undefined ? DEFAULT : leadData.TelephoneNumber,
			type = "ERP" ? (typeof leadData.YouNotes === undefined ? DEFAULT : leadData.YouNotes) : (typeof leadData.YourNotes === undefined ? DEFAULT : leadData.YourNotes),
			typeof leadData.Classification === undefined ? DEFAULT : leadData.Classification,
			typeof leadData.LeadOwner === undefined ? DEFAULT : leadData.LeadOwner,
			typeof leadData.SearchTerm === undefined ? DEFAULT : leadData.SearchTerm,
			typeof leadData.Country === undefined ? DEFAULT : leadData.Country,
			typeof leadData.Address === undefined ? DEFAULT : leadData.Address,
			typeof leadData.CurrentVendor === undefined ? DEFAULT : leadData.CurrentVendor,
			typeof leadData.WouldAttendEvent === undefined ? DEFAULT : leadData.WouldAttendEvent,
			typeof leadData.ZipPostal === undefined ? DEFAULT : leadData.ZipPostal,
			typeof leadData.NumberofUsers === undefined ? DEFAULT : leadData.NumberofUsers,
			typeof leadData.PurchasingInvolvement === undefined ? DEFAULT : leadData.PurchasingInvolvement,
			typeof leadData.AnnualRevenue === undefined ? DEFAULT : leadData.AnnualRevenue,
			typeof leadData.StateProvince === undefined ? DEFAULT : leadData.StateProvince,
			typeof leadData.SageIndustry === undefined ? DEFAULT : leadData.SageIndustry,
			typeof leadData.SageBudget === undefined ? DEFAULT : leadData.SageBudget,
			typeof leadData.LeadRevenue === undefined ? DEFAULT : leadData.LeadRevenue,
			typeof leadData.LastCall === undefined ? DEFAULT : leadData.LastCall,
			typeof leadData.DateofCall === undefined ? DEFAULT : leadData.DateofCall,
			typeof leadData.CallNote === undefined ? DEFAULT : leadData.CallNote,
			typeof leadData.LastEmail === undefined ? DEFAULT : leadData.LastEmail,
			typeof leadData.DateofEmail === undefined ? DEFAULT : leadData.DateofEmail,
			typeof leadData.EmailNote === undefined ? DEFAULT : leadData.EmailNote,
			typeof leadData.SageJobTitle === undefined ? DEFAULT : leadData.SageJobTitle,
			typeof leadData.SageDepartment === undefined ? DEFAULT : leadData.SageDepartment,
			typeof leadData.TimeDifference === undefined ? DEFAULT : leadData.TimeDifference,
			typeof leadData.Download === undefined ? DEFAULT : leadData.Download,
			typeof leadData.LinkedInProfile === undefined ? DEFAULT : leadData.LinkedInProfile,
			typeof leadData.IndustrySector === undefined ? DEFAULT : leadData.IndustrySector,
			typeof leadData.Territory === undefined ? DEFAULT : leadData.Territory,
			typeof leadData.CampaignSource === undefined ? DEFAULT : leadData.CampaignSource,
			typeof leadData.DownloadURL === undefined ? DEFAULT : leadData.DownloadURL,
			typeof leadData.ERPProject === undefined ? DEFAULT : leadData.ERPProject,
			typeof leadData.utm_source === undefined ? DEFAULT : leadData.utm_source,
			typeof leadData.utm_medium === undefined ? DEFAULT : leadData.utm_medium,
			typeof leadData.utm_campaign === undefined ? DEFAULT : leadData.utm_campaign,
			typeof leadData.gclid === undefined ? DEFAULT : leadData.gclid,
			typeof leadData.IndustrySub-Category === undefined ? DEFAULT : leadData.IndustrySub-Category,
			typeof leadData.LeadType === undefined ? DEFAULT : leadData.LeadType,
			typeof leadData.Status === undefined ? DEFAULT : leadData.Status,
			typeof leadData.CommentsContinued === undefined ? DEFAULT : leadData.CommentsContinued,
			typeof leadData.DateofQualification === undefined ? DEFAULT : leadData.DateofQualification,
			typeof leadData.SageRevenue === undefined ? DEFAULT : leadData.SageRevenue,
			typeof leadData.Multilingual === undefined ? DEFAULT : leadData.Multilingual,
			typeof leadData.UKRevenue === undefined ? DEFAULT : leadData.UKRevenue,
			typeof leadData.InitialClassification === undefined ? DEFAULT : leadData.InitialClassification,
			typeof leadData.Sage2016CampaignIndustries === undefined ? DEFAULT : leadData.Sage2016CampaignIndustries,
			typeof leadData.UsingHRsoftware === undefined ? DEFAULT : leadData.UsingHRsoftware,
			typeof leadData.NumberofUsersOld === undefined ? DEFAULT : leadData.NumberofUsersOld,
			typeof leadData.CloudInstalled === undefined ? DEFAULT : leadData.CloudInstalled,
			typeof leadData.ConsideringPurchaseofHRMS === undefined ? DEFAULT : leadData.ConsideringPurchaseofHRMS,
			typeof leadData.SentEmail === undefined ? DEFAULT : leadData.SentEmail,
			typeof leadData.Project === undefined ? DEFAULT : leadData.Project,
			typeof leadData.InternationalOffices === undefined ? DEFAULT : leadData.InternationalOffices,
			typeof leadData.Requirements === undefined ? DEFAULT : leadData.Requirements,
			typeof leadData.SeniorJobTitle === undefined ? DEFAULT : leadData.SeniorJobTitle,
			typeof leadData.NumberofEmployeesNonRange === undefined ? DEFAULT : leadData.NumberofEmployeesNonRange,
			typeof leadData.SageEmployees === undefined ? DEFAULT : leadData.SageEmployees,
			typeof leadData.SageCampaignIndustries === undefined ? DEFAULT : leadData.SageCampaignIndustries,
			typeof leadData.PracticeSize === undefined ? DEFAULT : leadData.PracticeSize,
			typeof leadData.PracticeSpecialty === undefined ? DEFAULT : leadData.PracticeSpecialty,
			typeof leadData.ProjectTimeframe === undefined ? DEFAULT : leadData.ProjectTimeframe,
			typeof leadData.PurachasingTimeline === undefined ? DEFAULT : leadData.PurachasingTimeline,
			typeof leadData.UsingEHR === undefined ? DEFAULT : leadData.UsingEHR,
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
	
