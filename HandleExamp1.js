/* HandlerStatus.js

  Returns basic status for the service including our ability to connect to the Elastic
  search server and get basic query results.  Can be used as a primitive health check.

*/

var lgr = require('./lib/Logger');
var cll = lgr.cll;
var log = lgr.log;

var BasicHTTPServer = require('./lib/BasicHTTPServer');
var GenericHTTPHandler = require('./lib/GenericHTTPHandler');

var http_get = require('./lib/HTTPGet.js');
var url = require('url');


// Extends GenericHTTPHandler by creating an instance and adding methods to it. 

// * * * * * * * * * * * * 
// * * * * * CLASS * * * *
// * * * * * * * * * * * * 
function Handler(server, req, resp, extraPath, config) {
  //console.log("HandlerStatus extraPath=" + extraPath);

  var self = new GenericHTTPHandler.GenericHTTPHandler(server, req, resp, extraPath, config);
  //  Calls our superclass handler and sets up its main variables.	   
  self.self = self;
  var stat = {};
  var begRead = curr_time();

  function onPostStringRead(postStr) {
    var elapRead = curr_time() - begRead;
    if (postStr == 413) {
      server.post_too_big(self.req, self.resp);
      return;
    }
    else if (postStr.length <= 0) {
      stat.message = "Post String is Empty when METHOD was set to POST";
      return;
    }
    else {
      var begWriteFile = curr_time();
      var finishedParse = false;
      stat.post_string = postStr;
      self.resp.writeHead(200, { 'Content-Type': 'text/json', "elapWrite": elapWrite, "elapRead": elapRead });
      b.add(StrUtil.formatJSONOutput(pobj, xparms.in.pretty));      
      handler.resEnd();
    }
    finishedParse = true;
    lines = ""; // freeup memory
  }
    
  

  // Process main form submission from End user 
  // for the search page. 
  function handle() {
    self.res.writeHead(200, { 'Content-Type': 'application/json' });
    var qparms = url.parse(req.url, true).query;
    var b = self.b;
    
    stat.req = {};
    stat.method = req.method;
    stat.in = {};
    stat.elast = {};
    stat.config = {};
    stat.req.url = self.req.url;
    stat.req.extra_path = self.extraPath;
    stat.req.headers = self.req.headers;
    stat.req.parms = url.parse(self.req.url, true).query;
    stat.config.dir = server.configDir;
    stat.config.data_dir = server.dataDir;
    stat.config_file_groups = server.config.groups;
    stat.config.listen_port = server.port;
    stat.config.docs_dir = server.config.groups.main.doc_dir;
    stat.in.pretty = self.parseParmsStr("pretty", "TRUE").toUpperCase();
    stat.in.stats = self.parseParmsStr("stats", "FALSE").toUpperCase();
    stat.in.mapping = self.parseParmsStr("mapping", "FALSE").toUpperCase();
    stat.elast.connect = "TODO";

    if ((stat.in.mapping === "TRUE") || (stat.in.mapping === "T")) {
      stat.elast.mapping = "TODO";
    }

    if ((stat.in.stats === "TRUE") || (stat.in.stats === "T")) {
      stat.elast.stats = "TODO";
    }
    
    if (req.method == "POST") {
      self.server.read_post_str(onPostStringRead, self.req, self.resp);
    }
    else {
      b.add(StrUtil.formatJSONOutput(pobj, xparms.in.pretty));     
      self.resEnd();
    }
  }

  self.handle = handle;
  return self;

}
exports.Handler = Handler;
