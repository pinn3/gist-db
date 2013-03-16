# Gist-DB

Treat your gist account like a database. Powered by [TaffyDB][TDB] and [Github][GHM].

## Install

	npm install gist-db

## Usage

	var config = {
		github:{
			username:"mcwhittemore"
		}
	}

	var GISTDB = require("gist-db");

	var _db = GISTDB(config);

	_db.event.on('refreshing', function(){
	  //MIGHT WANT TO LOCK DOWN THINGS FOR A BIT
	  console.log("LETS DO THIS");
	});

	_db.event.on('refreshed', function(err){
	  _db().each(function(file){
	    console.log(file);
	  });
	});

## File Object

	{
		id = gist_id+"_"+filename,
		gist_id = gist_id,
		error: undefined,
		raw: "THE RAW VALUE OF THE FILE",
		type: "mime type",
		language: "language the file is written in",
		raw_url: "https path to the raw text version of the file",
		size: numeric size of the file,
		gist: {
			id: gist_id
			public: boolean,
			created_at: date object,
			updated_at: date object,
			description: "the gist description"
		}
	}

## API

Please refer to the [TaffyDB docs](http://www.taffydb.com/workingwithdata) for more details

### GISTDB(config, fileInit)

Create a new gist-db.

**Parameters**

* config: A settings object. 

		Required: {
		  github:{
		    username:"SOME_USER_NAME"
		  }
		}

		Defaults: {
			refreshMin: 10,
			github: {
				per_page: 100,
				timeout: 5000,
				version: "3.0.0"
			},
			local: {
				save: "NEVER", //NEVER, ON_REFRESH, ALWAYS 
				location: undefined
			}
		}

* fileInit: function(file). A function that returns the file obj if it should be added to the DB and undefined if it should be excluded.

### _db({field:value})

* TaffyDB: Yes
* Returns: All rows that meet the passed criteria. Not passing an object, will return all rows.

### _db.insert({})

Inserts records into the database.

* TaffyDB: Yes
* Returns: A query pointing to the inserted records

### _db.github

Full use of the github module passed the github subsection of your config file.

### _db.event

An implementation of require("events").EventEmitter

### _db.event.on('refreshing', function(){})

Use to be notified when gist-db is connecting gist for a refresh.

### _db.event.on('refreshed', function(err){})

Use to be notified when gist-db is done its current refresh. If err is set, this refresh was ended due to error.

### _db.event.on('file_error', function(err, file){})

Use to be notified of errors in gathering data on the gist files.

**Parameters**

* err: The error object that triggered this event
* file: The file object that was being gathered when the error occurred

### _db.event.on('github_error', function(err, res){})

Use to be notified of errors when connecting with github.

**Parameters**

* err: the github module error object that triggered this event
* res: The github module response object. Might contain good data about the error.

## Chagelog

### 0.1.1

* Added gist object to file for meta data on the gist the file is from.
* Changed database refresh to use merge rather than insert so items won't duplicate
* Added check just before getRawFile and the add to database that checks if the file is in the db and if it is compares if the gist.updated_at of the new file is newer than that of the old file. This was can lower the number of calls to github and speed up the code a bit.
* Changed github module to be my fork which supports since on the gist endpoints. Will change back once a new version of node-github is in NPM
* Added since param to github calls, so we will only return gists added/edited since our last call.

## Things to be done

### 0.1.5

* Add private gist gathering
* Add local file loading
* Add local file saving
* Add tests

### 0.2.0

* Add Update gist.github
* Add Insert gist.github
* Add Delete gist.github

## Licenses

All code not otherwise specified is Copyright 2013 Matthew Chase Whittemore and is released under the MIT License.

All code found in the node_modules directory is Copyrighted by its creators. Please see each module for further details.


[TDB]: http://www.taffydb.com/
[GHM]: https://github.com/mikedeboer/node-github