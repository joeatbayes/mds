// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
var util = require('util');
var http = require('http');
var fs = require('fs');
var path = require('path');
var URL = require('url');
var StrUtil = require('./StrUtil');
var FileUtil= require('./FileUtil');
var StrBuf = require('./StrBuf');
var replaceAll = StrUtil.replaceAll;
var BasicHTTPServer = require('./BasicHTTPServer');
var lgr = require('./Logger');
var curr_time = StrUtil.curr_time;
var last_req_id_timestamp =  (new Date).getTime();
var last_req_id_cntr = 0;

function get_default_request_id() {
  var curr_ts = (new Date).getTime();
  if (curr_ts === last_req_id_timestamp) {
    last_req_id_cntr += 1;
    return curr_ts + "." + last_req_id_cntr;
  }
  else {
    last_req_id_cntr = 0;
    return curr_ts;
  }
}

//console.log("GenericHTTPHandler");
function GenericHTTPHandler(server, req, resp, extraPath, requestConfig)
{
  var self = this;
  self.server = server;
  self.res = resp;
  self.resp = resp; // same as self.res for backward compatibility
  self.req  = req;
  self.extraPath = extraPath;
  self.config = requestConfig;
  self.queryStr = null;
  self.parms = URL.parse(self.req.url, true).query;
  self.b = new StrBuf.StrBuf();
  self.ts_start = StrUtil.curr_time();
  self.retCode = 999;
  self.err = [];
  self.took = [];
  self.pin = {};
  self.closed = false;



  var ta = extraPath.split("?")
  self.extraPath = ta[0];
  if (ta.length > 1)
  {
    self.queryStr  = ta.slice(1).join("&");
  }

 

  // override handle to provide application specific behavior
  self.handle = function handle()
  {
    var extraPath = self.extraPath;
    var config = self.config;
    var tpath;
    if (self.config) {
      if ((extraPath == null) || (extraPath === undefined) || (extraPath.length < 1)) {
        //tpath = self.server.conv_path_to_file_path(self.config.baseDir, req.url);
        tpath = self.config
      }
      else {
        tpath = self.server.conv_path_to_file_path(self.config, extraPath);
      }
    }
    else {
      if (lgr.LTrace3()) { lgr.logcfg(lgr.TRACE3, self.get_log_config(), "using docDir=" + server.docDir); }
      tpath = self.server.conv_path_to_file_path(server.docDir, extraPath);
    }
    if (lgr.LTrace3()) { lgr.logcfg(lgr.TRACE3, self.get_log_config(), "GenericHTTPHandler L79: tpath=" + tpath + "  abs=" + path.resolve(tpath)); }
    if (lgr.LNorm()) { lgr.logcfg(lgr.NORM, self.get_log_config(), "GenericHTTPHandler L80: uri=" + encodeURI(self.req.url) + "&abs=" + encodeURI(tpath)); }
    if (lgr.LTrace3()) { lgr.logcfg(lgr.TRACE3, self.get_log_config(), "GenericHTTPHandler L81: tpath=" + tpath); }
    if (fs.existsSync(tpath))
    {
      if (lgr.LTrace3()) { lgr.logcfg(lgr.TRACE3, self.get_log_config(), "GenericHTTPHandler L84: Handle as file " + tpath); }
      server.handle_as_file(req, resp, tpath);
    }
    else
    {
      // Default loop back if no file available
      if (self.res.isClosed == false) {
          self.writeHead(404, { 'Content-Type': 'text/plain' });
          self.write('Resource not found\n');
          self.write('url=' + self.req.url + '\n');
          self.write("extraPath=" + self.extraPath + '\n');
          self.write('headers=' + JSON.stringify(self.req.headers) + '\n');
          self.resEnd();
      }
    }
  }

  //override handle_pre to do any contextual setup
  // needed before handle can be completed
  self.handle_pre = function handle_pre() {
    self.parsedURL = URL.parse(self.req.url, true)
  }

  //override handle_post to do any contextual cleanup
  // needed after handle is done.  This is a good place
  // to calculate timers.
  self.handle_post = function handle_post() {

  }

  self.buff = function () {
    for (var i = 0; i < arguments.length; i++) {
      self.b.add(arguments[i].toString());
    }
    return self;
  }



  self.writeHead = function (acode, ahash) {
    self.server.writeHead(self.res, acode, ahash);
    return self;
  }

  self.write = function (astr) {
    self.server.write(self.res, astr);
    return self;
  }


  // Send anything we have in out buffer on to the
  // client so we do not have to wait for the query
  // to complete before we have things ready.
  // Note.   Converted from join to direct loop write
  //   to eliminate a step of garbage collection
  //   overhead.  Not sure if that saves more than
  //   it costs to go through the write system multiple
  //   times.  Need to confirm with measurement tests.
  // TODO: Perf Note:  Find out how to do this in a 
  //   non blocking fashion so we process the callbacks
  //   rather than blocking in the writes.  Also need
  //   to test this compared concat to string and send
  //   with single write. 
  self.flush = function flush() {
    var tarr = self.b;
    for (var ndx = 0; ndx < tarr.length; ndx++) {
      self.write(tarr[ndx]);
    }
    tarr.clear();
    return self;
  }

  /*  send any buffered data,  close the connection and
  record the fact that we closed it so we don't try to
  send anything else which can cause process abort when
  trying to send data to closed connections */
  self.resEnd = function () {
    self.flush();
    self.server.resEnd(self.res);
    return self;
  }


  /* Returns a structure with basic log header information */
  self.get_log_config = function get_log_config() {
    var tparms = self.parms;
    /* Return the existing log config record if one already
    exits for this HTTP handler */

    if (self.log_config !== undefined) {
      return self.log_config
    }


    /* create a new log config if the first time past for this
    handler instance */    
    self.log_config = {
      "request": self.parseParmsStr("request", get_default_request_id()),
      "user": self.parseParmsStr("user", "nouser")
    }
    /* copy any parameters that contain log_ prefix to the log config
    records in addition to the user and request query parameters */
    if (tparms) {
      var lcfg = self.log_config;
      for (var akey in tparms) {
        if (akey.indexOf("log_") === 0) {
          var new_key = akey.replace("log_", "");
          lcfg[new_key] = tparms[akey];
          // strip the log_ prefix off because it will just waste
          // space in the log.            
        }
        
      }

      /* If the log level was specified then we need to lookup
      the numeric log level based on the value str. */
      var tlevels = lcfg["level"];
      if (tlevels) {
        var tleveln = lgr.lookupLogLevel(tlevels);
        if (tleveln > -1) {
          lcfg["log_filter_level"] = tleveln;
        }
        else {
          lgr.logcfg(lgr.INFO, lcfg, "GenericHTTPHandler L203: Could not find matching log level for log_level=" + tlevels);
        }
      }      
    }
    return self.log_config;
  }


  self.parseParmsStr = function (name, defVal) {
    if (self.parms === null) { return defVal };
    var tout = self.parms[name];
    if ((tout === undefined) || (tout === null)){
      return defVal;
    }
    else {
      return tout.trim();
    }
  }


  self.parseParmsInt = function (name, defVal) {
    if (self.parms === null) { return defVal };
    var tout = self.parms[name];
    if ((tout === undefined)  || (tout === null)) {
      return defVal;
    }
    else {
      return parseInt(tout);
    }
  }


  self.parseParmsBool = function (name, defVal) {
    if (self.parms === null) { return defVal };
    var tout = self.parms[name];
    if ((tout === undefined) || (tout === null)) {
      return defVal;
    }
    else {
      tout = tout.toLowerCase().trim();
      if (tout in ["yes", "true", "on", "1"]) {
        return true;
      }
      else {
        return false;
      }
    }
  }


  self.parseParmsFloat = function (name, defVal) {
    if (self.parms === null) { return defVal };
    var tout = self.parms[name];
    if ((tout === undefined) || (tout === null)){
      return defVal;
    }
    else {
      return parseFloat(tout);
    }
  }




  // Parses a string containing either comma delimited set of keys or
  // comman delimited set of key=value returns a dictionary.
  // Values are in string form unless transformed by optional
  // valConvertFun.
  self.parseParmsStrAsDict = function (name, defValStr, valConvertFun) {
    var tval = self.parseParmsStr(name, defValStr);
    return StrUtil.parseCommaDelimAsDict(tval);
  }


  // Returns the names of required parms that are not present
  // in the input list.
  self.checkMandatoryMembers = function (parmsin, requiredParms) {
    var tout = [];
    for (var pndx in requiredParms) {
      var pkey = requiredParms[pndx];
      if (parmsin[pkey] === undefined) {
        tout.push(pkey);
      }
    }
    return tout;
  }

  // Check for a list of mandatory parms in the parsed input
  // parms and
  self.checkMandatoryParms = function (requiredParms) {
    return self.checkMandatoryMembers(self.parms, requiredParms);
  }



  /* Copy parameters values from src that are specified
  in the array of names.   Normally to used to copy a subset
  of fiels from the parsed input fields to the in portion
  of result handlers so users don't get confused by parameters
  the hander is not rated to use */
  self.copyParms = function(src, names) {
    var tout = {}
    for (var nndx in names) {
      var aname = names[nndx];
      if (aname in src) {
        tout[aname] = src[aname];
      }
    }
    return tout;
  }

  /* FormatJSONOutput using the pretty fla and send buffer
  and then flush the existing buffer. 
  ouputput stream.  strips pobj.err if it is empty */
  self.formatJSONOutput = function (retCode, hobj, pretty) {

    self.writeHead(retCode, { 'Content-Type': 'text/json' });

    if ((hobj.err) && (!(hobj.err.length))) {
      delete hobj.err;
    }
    if (pretty in ["TRUE", "T", "Y", "YES"]) {
      self.b.add(JSON.stringify(hobj, null, 2));
    }
    else {
      self.b.add(JSON.stringify(hobj));
    }
    if (lgr.LTrace3()) { lgr.logcfg(lgr.TRACE3, self.get_log_config(), "GenericHTTPHandler L297: start flush"); }
    if (self.resp.isClosed == false) {
      self.flush();
      self.respEnd();
    }
    if (lgr.LTrace3()) { lgr.logcfg(lgr.TRACE3, self.get_log_config(), "GenericHTTPHandler L302: finished formatJSONOutputEnd()"); }
  }

  self.recordTime = function (alabel) {
    self.took.push([alabel,  StrUtil.elap(self.ts_start)]);
  }


  self.sanitize_uri = function (epath) {
    if (epath === undefined) {
      return epath
    }
    else
    {
      epath = replaceAll(epath, "\\", "/");
      epath = replaceAll(epath, "//","/");
      epath = replaceAll(epath, " ",".");
      epath = replaceAll(epath, ":",".");
      epath = replaceAll(epath, "?",".");
      epath = replaceAll(epath, "#",".");
      epath = replaceAll(epath, "&",".");
      epath = replaceAll(epath, "\t",".");
      return epath;
    }
  }

  /* Finish our setup after all instance methods have been configured */
  if (lgr.LTrace3()) {
    var msg = "GenericHttpHandler construct L338: "
      + " url=" + self.req.url
      + " requestConfig=" + requestConfig 
      + " server.docRoot=" + server.docRoot + " abs=" + path.resolve(server.docRoot)
      + " url =" + self.req.url      
      + " headers = " + JSON.stringify(req.headers)
      + " self.config JSON=" + JSON.stringify(self.config)      
      + " process.memoryUsage=" + JSON.stringify(process.memoryUsage())
    if (self.extraPath) {
      msg += " extra_path =" + self.extraPath;
    }
    if (self.parms) {
      var tparms = {};
      for (var pkey in self.parms) {
        tparms[pkey] = self.parms[pkey];        
      }
      msg += " parms=" + JSON.stringify(tparms);
    }

    lgr.logcfg(lgr.TRACE3, self.get_log_config(),msg);
  }
  // Must be after all Instance declarations
  return self;


}
exports.GenericHTTPHandler = GenericHTTPHandler



