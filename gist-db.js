var GitHubApi = require("github");

var config = require("./config");

var github = undefined;

var gists = {};
var groups = {};

module.exports = function(c){

	config = c;

	//CONNECT TO GITHUB
	init();

	//CREATE EVENTS

	//START EVENT TIMER

	gistDb = {
		select: select,
		update: update,
		insert: insert,
		delete: remove
	}

	return gistDb;
}


var init = function(config){
	//connect to github
	github = new GitHubApi({
	    // required
	    version: "3.0.0",
	    // optional
	    timeout: 5000
	});
	updateDB();
}

var updateDB = function(){

	github.gists.getFromUser({user: "mcwhittemore"}, function(err, res){
		for(var i=0; i<res.length; i++){
			manageDB(res[i]);
		}
	});

}

var manageDB = function(gist){
	console.log(Object.keys(gist));

	if(gists[gist.id]==undefined){
		processGist(gist);
	}
	else if(gists[gist.id].updated_at < gist.updated_at){
		delete gists[gist.id];
		//SOME CORE TO REMOVE GIST FROM ALL GROUPS
	}

}

var processGist = function(gist){
	gists[gist.id] = gist;
	console.log(gist.id);
}

/*********************************************************************/

var select = function(where){
	//4431121
	console.log("SELECT");
}

var update = function(where, what){
	var item = select(where);
	console.log("UPDATE");

}

var insert = function(what){
	console.log("INSERT");
}

var remove = function(where){
	var item = select(where);
	console.log("DELETE");
}