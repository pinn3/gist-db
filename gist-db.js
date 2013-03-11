var url = require("url");

var GitHubApi = require("github");
var TAFFY = require("taffydb").taffy;
//var request = require("request");

var config = require("./config");

var document = {};
document.write = function(html){
	return html;
}

var github = undefined;

var _db = undefined;

var githubMeta = undefined;

var numGistPending = -1;
var status = "LOCKED";


module.exports = function(c){

	//merge configs
	//config = c;

	_db = TAFFY([]);

	//ADD REFRESH FUNCTION TO _db
	_db.refresh = refresh;
	_db.ready = ready;

	//CONNECT TO GITHUB
	github = new GitHubApi({
	    // required
	    version: "3.0.0",
	    // optional
	    timeout: 5000
	});

	//CREATE EVENTS

	//START EVENT TIMER
	setTimeout(startRefresh, config.refreshMin*1000);

	return _db;
}

var ready = function(callback){

	//console.log("STATUS: "+status+" | NumCalls: "+numGistPending);

	if(numGistPending!=0){
		status = "LOCKED";
	}

	if(status=="UNLOCKED"){
		callback();
	}
	else if(typeof githubMeta!="undefined"&&parseInt(githubMeta['x-ratelimit-remaining'])<=0){
		//EMIT WARNING
		console.log("NUM CALLS ERROR");
		callback();
	}
	else{
		setTimeout(function(){ ready(callback); }, 100);
	}
}

var startRefresh = function(){
	refresh(1);
}

var refresh = function(pageNum){

	numGistPending==-1 ? numGistPending=1 : numGistPending++;

	var options = {
		user: config.username,
		per_page: 100,
		page: pageNum
	}

	numGistPending==-1 ? numGistPending=1 : numGistPending++;
	github.gists.getFromUser(options, callGithub);

	numGistPending--;
}

var continueRefresh = function(){

	if(typeof githubMeta.link != "undefined"){
		var links = githubMeta.link.split(", ");

		var next = -1;
		var last = 2;

		for(var i=0; i<links.length; i++){
			var link_tag = links[i];
			var link_parts = link_tag.split("; ");
			
			var link = link_parts[0];
			link = link.substring(1, link.length-1);
			var details = url.parse(link, true);
			
			if(link_parts[1]=="rel=\"next\""){
				next = details.query.page;
			}
			else{
				last = details.query.page;
			}
		}

		//FIGURE OUT HOW TO DO THIS IN A LOOP
		//SO A BUNCH CAN GO AT ONCE
		if(next>-1){

			refresh(next);
		}
	}

	numGistPending--;
}

var evalGroups = function(file){
	return {};
}

var callGithub = function(err, res){

	if(err){
		//EMIT SOME ERROR
		console.log(err);
		status = "UNLOCKED";
	}
	else{

		githubMeta = res.meta;
		delete res.meta;

		numGistPending==-1 ? numGistPending=1 : numGistPending++;
		continueRefresh();

		for(var i=0; i<res.length; i++){
			gatherGithubInfo(res[i]);
		}
	}

	numGistPending--;
}

var gatherGithubInfo = function(gist){

	var htmlUrl = "https://gist.github.com/"+config.username+"/"+gist.id+".js";

	var filenames = Object.keys(gist.files);

	for(var i=0; i<filenames.length; i++){

		var filename = filenames[i];

		var rawFileUrl = gist.files[filename].raw_url;
		
		//GATHER RAW AND SAVE FILE TO DB
		var getRawFile = function(err, res, body){
			numGistPending--;
			if(err){
				//EMIT SOME ERROR
			}
			else{
				var file = gist.files[filename];
				file.id = gist.id+"_"+file.filename;
				file.gist_id = gist.id;
				file.raw = body;
				file.groups = evalGroups(file);
				_db.insert(file);
			}

			if(numGistPending==0){
				status = "UNLOCKED";
			}
		}

		numGistPending==-1 ? numGistPending=1 : numGistPending++;
		require("request")({uri:rawFileUrl}, getRawFile);
	}
}

String.prototype.regexIndexOf = function(regex, startpos) {
	var indexOf = this.substring(startpos || 0).search(regex);
	return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}