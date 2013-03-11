var config = {}

var GISTDB = require("../gist-db");

var _db = GISTDB(config);

_db.ready(function(){
	_db().each(function(file){
		console.log("DB: "+file.id);
	});
});