function sendCapture() {
	var dbData = processLead(leadData, type);
	connection.query('INSERT INTO capture VALUES (?);', dbData, function(err, result) {
	progress.tick();
	if(err) {
		console.log(err);
	};
});
