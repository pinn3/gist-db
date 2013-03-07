var config = {}

var gistDb = require("../gist-db")(config);

gistDb.select();
gistDb.update();
gistDb.insert();
gistDb.delete();

