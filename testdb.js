
var fs = require("fs");
var file = "test.db";
var exists = fs.existsSync(file);

var sqlite3 = require("sqlite3").verbose();
var db = new sqlite3.Database(file);

db.serialize(function() {
	if(!exists) {
		db.run("CREATE TABLE testdb(id int NOT NULL PRIMARY KEY,Name varchar(255) NOT NULL)")
	};
	
	var stmt = db.prepare("INSERT INTO testdb VALUES (1, 'something')");
	
	stmt.run;
	
	stmt.finalize();
	
});

