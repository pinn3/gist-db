var url = require("url");

var GitHubApi = require("github");
var TAFFY = require("taffydb").taffy;
var EventEmitter = require('events').EventEmitter;
//var request = require("request");

var config = require("./config");

var _db = undefined;

var githubMeta = undefined;

var numGistPending = -1;
var status = "LOCKED";

var fileInit = undefined;
var fileSave = undefined;

var last_call = undefined;

module.exports = function(userConfig, userFileInit, userFileSave){

	//merge configs
	if(typeof userConfig == "object"){
		config = mergeConfigs(config, userConfig);
	}
	else if(typeof userConfig == "function"){
		userFileInit = userConfig;
		userConfig = {};
	}


	if(typeof userFileInit == "object" || userFileInit == undefined){
		userFileInit = function(file){ return file; }
	}

	if(typeof userFileSave == "object" || userFileSave == undefined){
		userFileSave = function(file, callback){ }
	}

	fileInit = userFileInit;
	fileSave = userFileSave;

	_db = initDB();

	_db.event = new EventEmitter();

	//ADD REFRESH FUNCTION TO _db
	_db.refresh = refresh;

	//CONNECT TO GITHUB
	_db.github = new GitHubApi({
	    version: config.github.version,
	    timeout: config.github.timeout
	});

	if(config.github.authenticate != undefined){
		_db.github.authenticate(config.github.authenticate);
	}

	//CREATE EVENTS

	//START TIMER
	runRefresh();

	return _db;
}

var initDB = function(){

	var data = [];

	if(config.local.save!="NEVER"){
		if(typeof config.local.save== "undefined"){
			//EMIT SOME ERR
		}
		else{
			var fs = require("fs");
			//OPEN FILE

			//CONVERT STRING TO OBJECT

			//CHECK OBJECT IS ARRAY

			//SET DATA TO OBJECT
		}
	}

	return TAFFY(data);
}

var saveDB = function(){

	//GATHER DATA

	//TURN DATA INTO A STRING

	//SAVE DATA

}

var mergeConfigs = function(keep, add){

	var keys = Object.keys(add);

	for(var i=0; i<keys.length; i++){
		var key = keys[i];
		if(typeof keep[key]=="undefined" || typeof add[key]!="object"){
			keep[key] = add[key];
		}
		else{
			keep[key] = mergeConfigs(keep[key], add[key]);
		}
	}

	return keep;
}

var runRefresh = function(){
	_db.event.emit('refreshing');
	refresh(1);
	setTimeout(runRefresh, config.refreshMin*1000*60);
}

var refresh = function(pageNum){

	trackPendingGists(true, "start of refresh");

	if(pageNum==undefined){
		pageNum = 1;
	}

	var options = {
		user: config.github.username,
		per_page: config.github.per_page,
		page: pageNum
	}

	if(last_call!=undefined){
		options.since = last_call;
	}
	
	_db.github.gists.getFromUser(options, callGithub);

	trackPendingGists(false, "end of refresh");
}

var continueRefresh = function(){

	if(githubMeta != undefined && githubMeta.link != undefined){
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
			console.log("NEXT PAGE: "+next);
			refresh(next);
		}
	}
}

var endRefresh = function(err){
	_db.event.emit('refreshed', err);
	last_call = (new Date()).toISOString();
	if(config.local.save!="NEVER"){
		saveDB();
	}
}

var callGithub = function(err, res){

	trackPendingGists(true, "start of callGithub");
	
	if(err){
		_db.event.emit('github_error', err, res);
		endRefresh(err);
	}
	else{

		githubMeta = res.meta;
		delete res.meta;

		
		continueRefresh();

		trackPendingGists(true, "gather Github Info callGithub");
		gatherGithubInfo(res, 0, 0);
	}

	trackPendingGists(false, "end of callGithub");

	if(numGistPending==0){
		endRefresh();
	}

}

var gatherGithubInfo = function(gists, gist_index, file_index){

	if(gist_index<gists.length){
		var gist=gists[gist_index];

		var filenames = Object.keys(gist.files);

		if(file_index<filenames.length){

			var filename = filenames[file_index];

			var rawFileUrl = gist.files[filename].raw_url;

			var file = gist.files[filename];
			file.id = gist.id+"_"+file.filename;
			file.gist_id = gist.id;
			file.gist = {
				id: gist.id,
				public: gist.public,
				created_at: new Date(gist.created_at),
				updated_at: new Date(gist.updated_at),
				description: gist.description
			}
			
			file = fileInit(file); //returns undefined if it shouldn't be in the DB
			
			var oldFile = undefined;
			if(file!=undefined){
				oldFile = _db({id:file.id}).first();
				if(!oldFile){
					oldFile = undefined;
				}
			}

			if(file!=undefined&&(oldFile==undefined||file.gist.updated_at.getTime()>oldFile.gist.updated_at.getTime())){
				//GATHER RAW AND SAVE FILE TO DB
				var getRawFile = function(err, res, body){

					if(err){
						file.error = 'dropped_raw_file';
						file.raw = undefined;

						_db.event.emit('file_error', err, file);
					}
					else{
						file.error = undefined;
						file.raw = body;
					}

					_db.merge(file);
					fileSave(file, function(the_file){
						_db.merge(the_file);
					});

					trackPendingGists(false, "got file getRawFile");

					if(file_index==filenames.length-1 && gist_index==gists.length-1 && numGistPending==0){
						endRefresh();
					}
					else{
						trackPendingGists(true, "get raw file getRawFile");
						gatherGithubInfo(gists, gist_index, file_index+1);
					}
				}

				trackPendingGists(true, "get raw file gatherGithubInfo");
				require("request")({uri:rawFileUrl}, getRawFile);
			}
			else{
				trackPendingGists(true, "next file gatherGithubInfo");
				gatherGithubInfo(gists, gist_index, file_index+1);
			}
		}
		else{
			trackPendingGists(true, "next gist gatherGithubInfo");
			gatherGithubInfo(gists, gist_index+1, 0);
		}
	}

	trackPendingGists(false, "end of gatherGithubInfo");
	if(numGistPending==0){
		endRefresh();
	}
}

var trackPendingGists = function(add, note){
	if(add){
		numGistPending==-1 ? numGistPending=1 : numGistPending++
	}
	else{
		numGistPending--
	}
	//console.log("ADD: "+add+" | NOTE: "+note + " | NUM: "+numGistPending);
}