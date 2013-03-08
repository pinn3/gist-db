var GitHubApi = require("github");
var TAFFY = require("taffydb").taffy;

var config = require("./config");

var github = undefined;

var DB = undefined;

module.exports = function(c){

	//merge configs
	//config = c;

	DB = TAFFY([]);

	//ADD REFRESH FUNCTION TO DB
	DB.refresh = function(){

	}

	//CONNECT TO GITHUB
	github = new GitHubApi({
	    // required
	    version: "3.0.0",
	    // optional
	    timeout: 5000
	});

	//CREATE EVENTS

	//START EVENT TIMER

	return DB;
}


/*********************************************************************/
