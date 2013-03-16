var config = {
	github:{
		username:"mcwhittemore"
	}
}

var GISTDB = require("../gist-db");

var fileInit = function(file){

  //init custom group object
  file.groups = {};

  //define groups and their regex include rules
  var group_rules = {
    "blog" : /^Blog_/,
    "project": /^Project_/,
    "icon": /^Icon_$/,
    "about": /^BlogAboutPage.md$/
	}

  //get group names
  var groups = Object.keys(group_rules);

  //set file as excluded as we only want to include it if it has a group
  var include = false;

  //loop through the groups
  for(var i=0; i<groups.length; i++){
    var group = groups[i];
    var rule = group_rules[group];

    //check if filename matches regex rule
    if(file.filename.search(rule)>-1){
      file.groups[group] = true; //set included in group as true
      include = true; //set include file as true
    }
    else{
      file.groups[group] = false;
    }
  }

  if(include){
    return file;
  }
  else{
    return undefined;
  }

}

var _db = GISTDB(config, fileInit);

_db.event.on('github_error', function(err, res){
  console.log("github error");
  console.log(err);
  console.log();
});

_db.event.on('file_error', function(err, file){
  console.log("file error");
  console.log(err);
  console.log();
});

_db.event.on('refreshing', function(){
  //MIGHT WANT TO LOCK DOWN THINGS FOR A BIT
  console.log("LETS DO THIS");
});

_db.event.on('refreshed', function(err){
  _db().each(function(file){
    console.log(file.id);
    console.log(file.groups);
    console.log();
  });
});