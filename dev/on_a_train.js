
var dataPoints = {};

module.exports = function(root){
    //LOAD DATA POINTS

    return mock;
}


var train = function(path, callback){
    callback(undefined, []);
}

var mock = function(msg, block, callback) {
    var method = block.method.toLowerCase();
    var hasBody = ("head|get|delete".indexOf(method) === -1);
    var format = hasBody && this.constants.requestFormat
        ? this.constants.requestFormat
        : "query";
    var obj = getQueryAndUrl(msg, block, format);
    var query = obj.query;
    var url = this.config.url ? this.config.url + obj.url : obj.url;

    var path = (!hasBody && query.length)
        ? url + "?" + query.join("&")
        : url;

    train(url, callback);
}

function getQueryAndUrl(msg, def, format) {
    var ret = {
        url: def.url,
        query: format == "json" ? {} : []
    };
    if (!def || !def.params)
        return ret;
    var url = def.url;
    Object.keys(def.params).forEach(function(paramName) {
        paramName = paramName.replace(/^[$]+/, "");
        if (!(paramName in msg))
            return;

        var isUrlParam = url.indexOf(":" + paramName) !== -1;
        var valFormat = isUrlParam || format != "json" ? "query" : format;
        var val;
        if (valFormat != "json" && typeof msg[paramName] == "object") {
            try {
                msg[paramName] = JSON.stringify(msg[paramName]);
                val = encodeURIComponent(msg[paramName]);
            }
            catch (ex) {
                return Util.log("httpSend: Error while converting object to JSON: "
                    + (ex.message || ex), "error");
            }
        }
        else
            val = valFormat == "json" ? msg[paramName] : encodeURIComponent(msg[paramName]);

        if (isUrlParam) {
            url = url.replace(":" + paramName, val);
        }
        else {
            if (format == "json")
                ret.query[paramName] = val;
            else
                ret.query.push(paramName + "=" + val);
        }
    });
    ret.url = url;
    return ret;
}