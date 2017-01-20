// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
var BasicHTTPServer = require('./BasicHTTPServer');
var GenericHTTPHandler = require('./GenericHTTPHandler');
var http_get = require('./HTTPGet.js');
//var http = require('http');
//var fs = require('fs');
//var path = require('path');
//var URL = require('url');
var StrUtil = require('./StrUtil');
var lgr = require('./Logger');
//var StrBuf = require('./StrBuf');
//var ProxyLookup = {};

// Extends GenericHTTPHandler by creating an instance
// of it and then adding methods and data to it here to
// overload the required functions.   self does not
// return self actual new instance but rather returns
// a modified copy of GenericHTTPHandler. 
// * * * * * * * * * * * * 
// * * * * * CLASS * * * *
// * * * * * * * * * * * * 
function HandlerProxy(server, req, resp, extraPath, config)
{
  console.log("HandlerProxy extraPath=" + extraPath);
  
  var self = new GenericHTTPHandler.GenericHTTPHandler(server,req, resp, extraPath,config);
  //  Calls our superclass handler and sets up its main variables.	   
    
  // override handle to provide application specific behavior
  self.handle = function handle()
  {
    var lcfg = self.get_log_config();
    var extraPath = self.extraPath;
    var config = self.config;  
    var res = resp;

    var proxyURI;
    if ((extraPath == null) || (extraPath === undefined) || (extraPath.length < 1))
    {
      //tpath = self.server.conv_path_to_file_path(self.config.baseDir, req.url);
      proxyURI  = self.config
    }


    else if (config.baseDir !== undefined) {
      proxyURI = self.server.conv_path_to_file_path(self.config.baseDir, extraPath);
    }
    else {
      proxyURI = config  + extraPath;
      lgr.logcfg(lgr.TRACE, lcfg, "HandlerProxy L50: proxyURI=", proxyURI);
      proxyURI = StrUtil.makeURIWithQueryString(proxyURI, self.parms);      
      lgr.logcfg(lgr.TRACE, lcfg, "HandlerProxy L50: proxyURI with parms=" + proxyURI);
    }
    
    function onGetErrorCallback(ex, uri)
    {
      var msg = "failed request to fetch " + uri + " err=" + ex
      lgr.logcfg(lgr.INFO, lcfg, "HandlerProxy L58: 'failed request to: " + proxyURI);
      res.writeHead(500, msg);
      res.write(msg);
      res.end();
    }
    
    function onGetCallback(data, rresp, elapsed)
    {
      var rctype = rresp.headers["content-type"];      
      var mtype = self.server.getContentType(proxyURI);
      if (rctype !== undefined) 
        mtype = rctype;
      headObj =  {'Content-Type': mtype};
      headObj["Content-Length"] = "" + data.length;
      res.writeHead(200, headObj);
      res.write(data);
      res.end();
      if (lgr.LTrace(lcfg)) { lgr.logcfg(lgr.TRACE, lcfg, "HandlerProxy L75: Proxy request sucess: " + proxyURI); }
    }
    
    lgr.logcfg(lgr.NORM, lcfg, "HandlerProxy L77: handle in HandleProxy",
      "config=" + self.config,
      "extraPath=" + self.extraPath,
      "queryStr=" + self.queryStr,
      "proxyURI=" + proxyURI );

    http_get.http_get(proxyURI, onGetCallback, onGetErrorCallback);
      
  }
    
    return self;	  
  }
  
  
  exports.HandlerProxy = HandlerProxy;
  