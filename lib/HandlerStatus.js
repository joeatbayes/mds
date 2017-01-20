// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt

var BasicHTTPServer = require('./BasicHTTPServer');
var GenericHTTPHandler = require('./GenericHTTPHandler');

var http_get = require('./HTTPGet.js');
var url = require('url');


// Extends GenericHTTPHandler by creating an instance and adding methods to it. 

// * * * * * * * * * * * * 
// * * * * * CLASS * * * *
// * * * * * * * * * * * * 
function Status(server, req, resp, extraPath, config)
{
   //console.log("HandlerStatus extraPath=" + extraPath);
   
   var self = new GenericHTTPHandler.GenericHTTPHandler(server,req, resp, extraPath,config);
     //  Calls our superclass handler and sets up its main variables.	   
  self.self = self;
    
  // Process main form submission from End user 
  // for the search page. 
  function handle() 
  {
    self.res.writeHead(200, {'Content-Type': 'text/json'});   
    
    var b = self.b;
    stat = {};
    stat.req = {};
    stat.req.url = self.req.url;
    stat.req.extra_path = self.extraPath;
    stat.req.headers = self.req.headers;
    stat.req.parms = url.parse(self.req.url, true).query;
    stat.config_dir = server.configDir;
    stat.data_dir=server.dataDir;
    stat.config = server.config.groups;
    stat.listen_port = server.port;    
    b.add(JSON.stringify(stat, null, 2)).nl();
    self.flush();
    resp.end();
  }
    
  self.handle = handle; 
  return self;
  
}
exports.Status = Status;
