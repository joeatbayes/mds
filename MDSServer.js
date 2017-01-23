// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
// HTTPServer.js
//
// Main HTTP listner for the MDS Server
//
// To run this server from the command line run:
//     node mdsServer.js  listenPort ConfigDir DataDir
//     port# must be int.  lisentPort and configDir
//     can be relative file paths to where current directory
//     when node is invoked. 

var path = require('path');
var BasicHTTPServer = require('./lib/BasicHTTPServer');
var http_get = require('./lib/HTTPGet.js');
var URL = require('url');


var GenericHTTPHandler = require("./lib/GenericHTTPHandler.js");
var HandlerProxy = require("./lib/HandlerProxy.js");

var HTTPServer = require("./lib/BasicHTTPServer.js");
var LINI = require("./lib/INIFile.js");

// MDS Specific Libraries
var HandlerStatus = require("./lib/HandlerStatus.js");
var HandlerQ = require("./lib/HandlerQ.js");
var HandlerBulkAdd = require("./lib/HandlerBulkAdd.js");
var FileDriver = require("./lib/BEDriverFile.js");



// Parse basic command line parameters
var port =  parseInt(process.argv[2]);
var configDir = path.resolve(process.argv[3]);
var dataDir = path.resolve(process.argv[4]);
var configFiName = configDir + "/config.ini";
var config =  new LINI.INIFile(configFiName);
console.log("configDir=" + configDir);
console.log("configFiName=" + configFiName);
console.log("dataDir=" + dataDir);
console.log("config=" + config.toINIStr());
console.log("listenPort=" + port);

var listener = new BasicHTTPServer.BasicHTTPServer(port, "./doc");

// Copy important configuration data so it is accessible to 
// the handlers. via ther server parameter.
listener.configDir = configDir;
listener.dataDir = dataDir;
listener.port  = port;
listener.config = config;
listener.BEDriver = FileDriver.Driver;

// Copy some of the loaded library modules so handler modules don't have
// to reload them.
listener.LINI = LINI;


// register dynamic handlers
listener.add_handler("joe",     GenericHTTPHandler.GenericHTTPHandler);
listener.add_handler("status",  HandlerStatus.Status);
listener.add_handler("mds",     HandlerQ.Q);
listener.add_handler("add",     HandlerBulkAdd.BulkAdd);
listener.add_handler("config",  GenericHTTPHandler.GenericHTTPHandler, configDir);

//listener.add_handler("dyn",     HandlerProxy.HandlerProxy, "http://127.0.0.1:81/");
listener.listen();


