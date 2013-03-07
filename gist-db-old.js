var http = require("https");


var config = {};
config.apikey = undefined;
config.username = undefined;
config.groupRules = undefined;

var github = module.exports;

github.gists = {};
github.groups = {};
github.isLoaded = false;
github.status = 200;


String.prototype.regexIndexOf = function(regex, startpos) {
	var indexOf = this.substring(startpos || 0).search(regex);
	return (indexOf >= 0) ? (indexOf + (startpos || 0)) : indexOf;
}

Array.prototype.unique = function(){
	var a = this.concat();
	for(var i=0; i<a.length; ++i){
		for(var j=i+1; j<a.length; ++j){
			if(a[i]===a[j]){
				a.splice(j--,1);
			}
		}
	}
	return a;
}

var document = {};
document.write = function(html){
	return html;
}


github.debug = function(where){
	/*console.log("======= "+where+" ========");
	console.log(Object.keys(github.gists));
	console.log();*/
}

github.init = function(configData){
	github.debug("init");
	
	if(typeof configData=="string"){
		config = require(configData);
	}
	else{
		config = configData;
	}
	
	github.loadGists();
	return github;
}

github.onceLoaded = function(callback){
	github.debug("onceloaded");
	setTimeout(function(){
		if(github.isLoaded){
			callback();
		}
		else{
			github.onceLoaded(callback);
		}
	}, 500);
}

github.getGroupGists = function(rule, flatten, data){
	
	data = data || github.groups;
	flatten = flatten || false;

	var result = {};

	if( Object.prototype.toString.call( rule ) === '[object Array]' ){
		console.log(data);
		for(var i=0; i<rule.length; i++){
			var key = rule[i];
			console.log("RULE: "+key);
			result[key] = github.getGroupGists(key, flatten, data);
			console.log(result);
		}
	}
	else if(typeof rule == "object" && Object.keys(rule)>0){
		var keys = Object.keys(rule);
		for(var i=0; i<keys; i++){
			var key = keys[i];
			result[key] = github.getGroupGists(rule[key], flatten, data[key]);
		}
	}
	else{
		result = data[rule];
	}

	if(flatten){
		return flattenGroup(result);
	}
	else{
		return result;
	}
	
	
}

github.getGist = function(id){
	github.debug("get post "+id);
	return github.gists[id];
}

github.loadGists = function(){
	github.debug("load");
	var url = "https://api.github.com/users/"+config.username+"/gists?callback=success";

	var success = function(res){

		if(typeof res.data != "undefined"){
			for(var i=0; i<res.data.length; i++){
				var gist = res.data[i];
				
				github.gists[gist.id] = gist;

				//GATHER GITHUB STYLED HTML
				var s = function(id, res){
					var parts = res.split("\n");
					var css = eval(parts[0]);
					var html = "";
					for(var i=1; i<parts.length; i++){
						html+=parts[i];
					}
					html = eval(html);

					github.gists[id].html = html;
					github.gists[id].css = css;

				}

				var u = "https://gist.github.com/"+config.username+"/"+gist.id+".js";

				curl(gist.id, u, s, s);


				//GET RAW VALUES FOR ALL THE FILES
				var fileNames = Object.keys(gist.files);
				for(var j=0; j<fileNames.length; j++){

					var fileName = fileNames[j];
					var ru = gist.files[fileName].raw_url;

					ru = ru.replace("raw/"+gist.id, config.username+"/"+gist.id+"/raw");
					
					curl({gist:gist.id, file:fileName}, ru, function(key, data){

						github.gists[key.gist].files[key.file].raw = data;

					},
					function(key, data){
						console.log(data);
					});

				}
			}
		}
		else{
			github.status = 500;
		}
		
		github.debug("categorize start");
		github.groups = group(config.groupRules);
		github.isLoaded = true;
		github.debug("categorize end");
	}

	var failure = function(res){
		github.status = 500;
		console.log(res);
	}

	github.isLoaded = false;

	callJSONP(url, success, success);
}





var flattenGroup = function(data){
	var result = [];

	if(Object.prototype.toString.call( data ) === '[object Array]'){
		result = result.concat(data);
	}
	else if(typeof data == "object"){
		var keys = Object.keys(data);
		for(var i=0; i<keys.length; i++){
			var key = keys[i];
			result = result.concat(flattenGroup(data[key]));
		}
	}
	else{
		result[result.length] = data;
	}

	return result.unique();
}


var group = function(rule){

	var result = {};

	var cats = Object.keys(rule);

	var gist_ids = Object.keys(github.gists);

	for(var i=0; i<cats.length; i++){
		var cat = cats[i];
		var test = rule[cat];

		if(Object.keys(test).length>0){
			result[cat] = group(test);
		}
		else{
			result[cat] = [];
			for(var j=0; j<gist_ids.length; j++){

				var id = gist_ids[j];
				var gist = github.gists[id];

				var files = Object.keys(gist.files);

				for(var k=0; k<files.length; k++){
					var file = files[k];
					if(file.regexIndexOf(test,0)!=-1){
						result[cat][result[cat].length] = id;
						break;
					}
				}
			}
		}
	}

	return result;
}

var callJSONP = function(url, success, failure){
	github.debug("callJSONP");
	http.get(url, function(res){
		var data = "";
		res.on("data", function(chunk){
			data+=chunk;
		});
		res.on("end", function(){
            eval(data);
		})
	}).on("error", function(e){
        data = {
            status: "error",
            error: e,
            results: []
        }
        failure(data);
    });
}


var curl = function(id, url, success, failure){
	github.debug("callJSONP");
	http.get(url, function(res){
		var data = "";
		res.on("data", function(chunk){
			data+=chunk;
		});
		res.on("end", function(){
            success(id, data);
		})
	}).on("error", function(e){
        data = {
            status: "error",
            error: e,
            results: []
        }
        failure(id, data);
    });
}


var auth = function(client_id, client_secret, callback){

	var args = {
		scopes: ["gist"],
		client_id: client_id,		
		client_secret: client_secret
	};

}