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
	DB.refresh = refresh;

	//CONNECT TO GITHUB
	github = new GitHubApi({
	    // required
	    version: "3.0.0",
	    // optional
	    timeout: 5000
	});

	//CREATE EVENTS

	//START EVENT TIMER
	setTimeout(refresh, config.refreshMin*1000);

	return DB;
}

var refresh = function(){

	var options = {
		user: "mcwhittemore"
	}

	github.gists.getFromUser(options, function(err, res){
		console.log(Object.keys(res));
	});
}
