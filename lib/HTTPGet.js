// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
// http_get.js
//  automate some of the plumbing when making a HTTP call
//  simply get a callback when the entire response has
//  arrived.

var https = require('https');
var http = require('http');
var StrUtil = require('./StrUtil');
var fs = require('fs');
var path = require('path');
var Util = require('util');
var querystring = require('querystring');
var lgr = require('./Logger');
var GBLAjaxQueues = {};
var GBLDefaultQueueMaxOpenItems = 23; // 25 //40;
// elasticSearch - no errors at 25
// elasticSerch - errors start occuring at 35
// elasticSearch - lots of errors at 100

var GBLDefaultQueueMaxQueueSize = 100000;
var GBLMaxHTTPTimeoutRetry = 3; //3;
var GBLUseNodeConnPool = true;
var GBLSaveQueriesDir = process.env.SAVE_HTTTP_DIR;
if (GBLSaveQueriesDir !== undefined) {
  GBLSaveQueriesDir = GBLSaveQueriesDir.trim()
}
lgr.warn("GBLSaveQueriesDir=" + GBLSaveQueriesDir)



exports.GBLRequestTimeout =  19000;
exports.GBLResponseTimeout = 19000;

function setUseNodeConnPool(aBool) {
  GBLUseNodeConnPool = aBool;
}
exports.setUseNodeConnPool = setUseNodeConnPool;

function setHTTPTimeout(numMillSec) {
  exports.GBLRequestTimeout = numMillSec;
  exports.GBLResponseTimeout = numMillSec;
}
exports.setHTTPTimeout = setHTTPTimeout;


function set_content_length(res, respBody)
{
  if ((res !== undefined) && (res !== null))
  {
    var ttl = res.headers['content-length'];
    if (ttl == undefined)
    {
      res.length = respBody.length;
    }
    else
    {
      res.length = parseInt(ttl)
    }
  }
}

function saveQueryIfNeeded(options, postStr) {
	function onAppendDone(err) {
     if (err) {
		   lgr.warn("Could not save Query due to error ", err);
     }
	}

  function onSaveDirExists(dirExists) {
	  if (dirExists) {
	    var timeSeg =  Math.floor(tdate = new Date().getTime() / 990000);
		  var fiName = GBLSaveQueriesDir + "/queries-" + timeSeg + ".log.txt";
		  if (lgr.LTrace3()) { lgr.trace3("HTTPGet L74: attempt to save to " + fiName); }
	  //saveStr = "method=" + options.method + "\turi=" + options.path + "\tbody=" +  postStr + "\n";
		  saveStr = "" + (new Date()).toISOString() + "\t" + options.method + "\t" + options.path + "\t" + postStr + "\n";
		  fs.appendFile(fiName, saveStr, onAppendDone)
	  }
	  else
	  {
      lgr.warn("Could not save Query because dir does not exist " + GBLSaveQueriesDir);
	  }
  } // saveDirExists()

  if ((GBLSaveQueriesDir !== undefined) && (GBLSaveQueriesDir.length > 2)) {
     //lgr.warn("attempt to save to " + GBLSaveQueriesDir)
     fs.exists(GBLSaveQueriesDir, onSaveDirExists)
  } // if saveQueries
}



/* Makes a HTTP Request and aggregates the result.
* Accepts A request Parms Object parms which must contain
* the following but it may contain additional values
* intended to be used by the callback.
*    parms.postStr = String to send as post or Put body. Null or empty if none to send.
*    parms.uri =  URI to send with request to the remote server eg: "/jobs/_search";
*    parms.method = "GET","POST","PUT","DELETE" - HTTP Method to send to server.
*    parms.server = "127.0.0.1"; = Server Name or IP address
*    parms.header = ""; = HTTP Headers to send to remote server.
*
*  makes a callback with pobj =
*    pobj.res = response object from socket.
*    pobj.req = request object from stream.
*    pobj.err = error object from onError if called otherwise Null.
*    pobj.respBody = body of text read from post string
*    pobj.elap = time elapsed from beginning of call to either onEnd or onError.
*    pobj.options = options structure passed to http request.
*    pobj.postBody = post body sent to request.
*    pobj.parms  = original parms passed in.
*/
function httpRequest(parms, callback, reqQueue) {
  if (parms.startTime === undefined) { parms.startTime = start_query };

  var ts_start = new Date().getTime();
  var pobj = { "err": []}
  pobj.respBody = ""


  function onGet(res) {
    pobj.resp = res;
    pobj.status = res.status;
    pobj.statuscode = res.statusCode;


    if(lgr.LTrace3()) {
      lgr.trace3("HTTPGet L74: httpRequest.doGet()",
        'STATUS: ' + res.statusCode,
        'HEADERS: ' + JSON.stringify(res.headers));
    }
    res.setEncoding('utf8');

    function onData(chunk) {      
      pobj.respBody = pobj.respBody + chunk;
    }

    function onEnd() {      
      pobj.elap = new Date().getTime() - ts_start;
      set_content_length(res, pobj.respBody);
      if (reqQueue) {        
        reqQueue.onFinish(pobj, parms);
      }
      if (lgr.LTrace3()) { lgr.trace3("HTTPGet L147: httpRequest.onEnd", "respBody=" + pobj.respBody) };
      callback(pobj, parms);
    }

    function onResTimeout(err) {
      if (cll(lgr.LNorm())) { lgr.norm("HTTPGet L152: httpRequest.res.timeout") };
      pobj.elap = new Date().getTime() - ts_start;
      var msg = "ERROR: httpRequest Res Timeout err=Timeout host=" + parms.server + " port=" + parms.port + " uri=" + parms.uri + " err=" + err;
      pobj.err.push(msg);
      if (lgr.LWarn()) { lgr.warn(msg); }
      if (reqQueue) {
        var willRetry = reqQueue.reqTimeOut(parms, callback)
        if (willREtry === false) {
          callback(pobj, parms);
        }
      }
      else {
        // no queue involved so just call the callback.
        callback(pobj, parms);
      }
    }

    function onResError(err) {
      if (lgr.LNorm()) { lgr.norm("HTTPGet L170: httpResponse.onError", Error) };
      pobj.elap = new Date().getTime() - ts_start;
      var msg = "ERROR: httpRequest unable to connect err=" + err + " msg=" + err.message + " host=" + parms.server + " port=" + parms.port + " uri=" + parms.uri;
      pobj.err.push(msg);
      if (lgr.LWarn()) { lgr.warn(msg); }
      callback(pobj, parms);
      if (reqQueue) { reqQueue.onFinish(pobj, xparms); }
    }

    if (lgr.LTrace3()) { lgr.trace3(res); }
    res.on('data', onData);
    res.on('end', onEnd);
    res.on('error', onResError);
    res.setEncoding('utf8');
    res.setTimeout(exports.GBLResponseTimeout, onResTimeout);
  }

  // setup my callbacks.
  function onReqError(err) {
    if (lgr.LTrace3()) { lgr.trace3("HTTPGet L189: httpRequest.onError", Error) };
    if (reqQueue) { reqQueue.onFinish(pobj, parms); }
    pobj.elap = new Date().getTime() - ts_start;
    var msg = "ERROR: httpRequest unable to connect err=" + err + " msg=" + err.message + " host=" + parms.server + " port=" + parms.port + " uri=" + parms.uri;
    pobj.err.push(msg);
    if (lgr.LWarn()) { lgr.warn("HTTPGet L194: " +  msg); }
    callback(pobj, parms);
  }

  function onReqTimeout(err) {
    if (lgr.LInfo()) { lgr.info("HTTPGet L199: httpRequest.onTimeout") };
    pobj.elap = new Date().getTime() - ts_start;
    var msg = "ERROR: httpRequest Req Timeout err=timeout host=" + parms.server + " port=" + parms.port + " uri=" + parms.uri;
    pobj.err.push(msg);
    if (lgr.LWarn()) { lgr.warn("HTTPGet L203: " + msg); }
    if (reqQueue) {
      var willRetry = reqQueue.reqTimeOut(parms, callback)
      if (willRetry === false) {
        callback(pobj, parms);
      }
    }
    else {
      // no queue involved so just call the callback.
      callback(pobj, parms);
    }
  }

  // Setup Options for the HTTP Call
  var options = {
    hostname: parms.server,
    port: parms.port,
    path: parms.uri,
    method: parms.method
  };
  if (GBLUseNodeConnPool == false) {
    options.agent = false;
  }

  // It loooks like the node Pool manager is flawed for short term will just
  // bypass it under the idea that it will be fixed in a future release and
  // we can just inherit the fix.
  // http://stackoverflow.com/questions/15533448/node-js-http-request-problems-with-connection-pooling
  // https://github.com/coopernurse/node-pool
  // https://github.com/brianc/node-postgres/issues/227
  //

  parms.options = options;
  if ((parms.headers !== null) && (parms.headers !== undefined))  {
    options.headers = parms.headers;
  }

  if ((parms.postStr !== null) && (parms.postStr !== undefined) && (parms.postStr.length > 0)) {
    //options.body = parms.postStr;
  }

  // Make the Actual HTTP Call
  if (lgr.LDebug()) {
    lgr.trace3("HTTPGet L246: .options = ", JSON.stringify(options));
    if (parms.postStr) {
      lgr.trace3("HTTPGet L248: postStr = " + parms.postStr);
    }
  }

  saveQueryIfNeeded(options, parms.postStr)

  // Make the actual HTTP CALL
  if (reqQueue) {
    reqQueue.onStart(parms)
  };
  var req = http.request(options, onGet)
  pobj.req = req;
  pobj.options = options;
  req.setSocketKeepAlive(false);
  req.on('error', onReqError);
  //req.on('socket', onSocket);
  req.setTimeout(exports.GBLRequestTimeout, onReqTimeout);

  if ((parms.postStr !== null) && (parms.postStr !== undefined) && (parms.postStr.length > 0)) {
    //options.body = parms.postStr;
    req.write(parms.postStr);
    req.write("\n");
  }
  req.write("\n");
  req.end();
}
exports.httpRequest = httpRequest;




// Makes the same http Request as httpRequest() but adds
// Automatic parses JSON responses into pobj.parsedBody and if there is a
// problem auto creates the error message.  It will automatically add
// the took parameter from elastic search to timer array and will record
// it's time to parse the JSON into a native object.
// Also checks for a status code
// not equal to 200 and auto creates the err object to make it easy
// to pass the information back to the client.   If error is not set
// to a value other than null in the callback then can be gauranteed
// to have a valid json object from the call in pobj.parsedBody.  For error
// conditions we construct a custom output object by copying strategic values
// in a form safe to call with JSON.stringify.
function httpRequestJSON(parms, callback, reqQueue) {
  var qtype = parms.qtype;
  var lcfg = parms.in.lcfg;
  if (parms.startTime === undefined) { parms.startTime = StrUtil.curr_time(); };
  if (parms.took === undefined) { parms.took = [] };

  function onhttpRequestJSONData(pobj, xparms, elap) {
    pobj.parsedBody = null;
    
    if (lgr.LTrace2(lcfg)) { lgr.logcfg(lgr.TRACE2, lcfg, "HTTPGet L299: httpRequestJSON.onhttpRequestJSONData qtype pobj.respBody=" + pobj.respBody); }
    var tout = pobj;    
    var errBody = pobj.respBody; // reset to parsed version if parse sucessful
    parms.took.push(["" + parms.qtype + "_http", StrUtil.elap(parms.startTime)]);

    try {
      if ((pobj.respBody) && (pobj.respBody.length > 0)) {
        pobj.parsedBody = JSON.parse(pobj.respBody);
        if (pobj.parsedBody.err) {
          if (lgr.LWarn(lcfg)) { lgr.logcfg(lgr.WARN, lcfg, "HTTPGet L308: httpRequestJSON found .err in result object" + pobj.parsedBody.err) };
          tout.err.push(pobj.parsedBody.err);
        }
        if (pobj.parsedBody.error) {
          if (lgr.LWarn(lcfg)) { lgr.logcfg(lgr.WARN, lcfg, "HTTPGet L312: httpRequestJSON found .error in result object =" + pobj.parsedBody.err) };
          tout.err.push(pobj.error);
        }
      }
      else {
        var msg = "ERROR: httpRequestJSON - no Response body received"
        pobj.err.push(msg);
      }

      errBody = pobj.respBody;
      if ((pobj.parsedBody) && (pobj.parsedBody.took)) {
        parms.took.push(["i_" + qtype + "_took", pobj.parsedBody.took]);
      }
      parms.took.push(["" + qtype + "_json_parse", StrUtil.elap(parms.startTime)]);
    }
    catch (parseErr) {
      pobj.err.push( { 'msg': qtype + " JSON error parsing " + parseErr + " " + parseErr.message + " respBody=" + pobj.respBody });
    }
    if (!(pobj.resp)) {
      pobj.err.push("No http response object");
    }
    else {
      if ((pobj.resp.statusCode < 200) || (pobj.resp.statusCode > 299)) {
        pobj.err.push("http status code not 200 series " + qtype);
        if (pobj.resp) {
          pobj.err.push("statusCode = " + pobj.resp.statusCode);
        }
      }
      if (pobj.err.length)  {
        pobj.err.push("statusCode = " +  pobj.resp.statusCode + " " + pobj.resp.status);
      }
    }


    // special elastic search code that makes it a little easer
    // to read elastic search errors.
    if ((pobj.err) && (pobj.err.length)) {      
      if ((pobj.parsedBody) && (pobj.parsedBody.error) && (pobj.parsedBody.error.length)) {
        // partial decode of the elastic search errors to make render easier.
        if (lgr.LInfo(lcfg)) {
          var errBody = pobj.parsedBody.error;
          errBody = StrUtil.replaceAll(errBody, "\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u00006", "  ");
          errBody = StrUtil.replaceAll(errBody, "\u0001\u0000\u0000\u0000\u0000\u0000\u0000\u0000\u00009", "  ");
          lgr.logcfg(lgr.INFO, lcfg, "HTTPGet L353: elerr httpRequestJSON=" + errBody + " respBody=" + StrUtil.replaceAll("" + pobj.respBody, "\n", "\t"));
        }
      }
      else {
        if (lgr.LInfo(lcfg)) { lgr.logcfg(lgr.INFO, lcfg, "HTTPGet L357: elerr httpRequestJSON=" + pobj.err.join("\t") + " respBody=" + StrUtil.replaceAll("" + pobj.respBody, "\n", "\t")); }
      }
    }    

    // Save the work for setting up response to client in the error condition
    // since all the client wants to do most of the time is to pass it back to
    // the client.

    var hdrs = {};
    if ((pobj.resp) && (pobj.resp.headers)) {
      hdrs = pobj.resp.headers;
    }
    tout = {
      'in': xparms.in,
      'q': parms.q,
      'qtype' : parms.qtype,
      'server': parms.server,
      'port': parms.port,
      'uri': parms.uri,
      'method': parms.method,
      'err': pobj.err,
      'respBody': errBody,
      'took': parms.took,
      'headers': hdrs,
      'parsedBody': pobj.parsedBody,
      'statusCode': pobj.statuscode,
      'status' : pobj.status
    };

    if (parms.q) {
      tout.q = parms.q
    }
    if (parms.postStr) {
      tout.postStr = parms.postStr;
    }
    callback(tout, xparms);
  }
  if (lgr.LTrace3(lcfg)) { lgr.logcfg(lgr.TRACE3, lcfg, "HTTPGet L387: httpRequestJSON parms = " + JSON.stringify(parms.in) + "\tURI=" + JSON.stringify(parms.uri) + "\tq=" + JSON.stringify(parms.q) + "\tpost=" + parms.postStr); }

  httpRequest(parms, onhttpRequestJSONData, reqQueue)
}
exports.httpRequestJSON = httpRequestJSON;




function HTTPGet(uri, callback, errorCallback)
{
  var ts_start = new Date().getTime();
  var RespBody = "";

  function onError(err)
  {
    lgr.info("HTTPGet L403: unable to connect to " + uri);
    lgr.info("HTTPGet L404: " + err);
    errorCallback(err, uri);
  }

  function onGet(res)
  {
    if (lgr.LTrace3()) { lgr.trace3("HTTPGet L410: doGet ") };
    function onData(chunk)
    {      
      RespBody = RespBody + chunk;
    }

    function onEnd()
    {
      if (lgr.LTrace3()) { lgr.trace3("HTTPGet L418: onEnd") };
      ts_elap = new Date().getTime() - ts_start;
      res.RespBody = RespBody;
      set_content_length(res);
      callback(RespBody, res, ts_elap);
    }

    res.on('data', onData);
    res.on('end' , onEnd);

    if (lgr.LTrace()) { lgr.trace("HTTPGet L428: " +  res) };
    res.setEncoding('utf8');
  }
  if (uri.toLowerCase().indexOf("https://") === -1) {
    var req = http.get(uri, onGet).on('error', onError);
  }
  else {
    var req = https.get(uri, onGet).on('error', onError);
  }

}
exports.http_get = HTTPGet;
exports.HTTPGet = HTTPGet;



/************************
*** AJAX JSON QUEUE *****
*************************
* The Node connection pooling seems to be flawed and we have found that we increase
* error rates for some services like elastic search if we hit them with too many
* concurrent requests.  This gives us a light weight way to create a large number
* of pending requests and feed them to the downstream service at a meetered rate.
* that can be controlled by queue so we can vary the downstream load based on the
* known capacity of that service.
*/
function AjaxQueue(qname, maxOpenRequests, maxQueueSize) {
  this.qname = qname;
  this.maxOpenRequests = maxOpenRequests;
  this.maxQueueSize = maxQueueSize;
  this.requestQueue = [];
  this.queueTimer = null;
  this.openRequestCnt = 0;
  this.abortFlag = false;
  this.pollingInterval = 250;
}
exports.AjaxQueue = AjaxQueue;


AjaxQueue.prototype.onStart = function (parms) {
  parms.QTStartHTTP = StrUtil.curr_time();
  if (lgr.LTrace3()) { lgr.trace3("HTTPGet L465: AjaxQueue HTTPGet onstart"); }
}


AjaxQueue.prototype.onFinish = function (pobj, parms) {
  this.openRequestCnt--;
  parms.QTFinishProcess = StrUtil.curr_time();
  parms.QTProcessElap = parms.QTFinishProcess - parms.QTStartProcess;
  parms.QTTotalElap = parms.QTFinishProcess - parms.QTEnqueue;
  if (lgr.LTrace3()) { lgr.trace3("HTTPGet L474: AjaxQueue HTTPGet onfinish openCnt=" + this.openRequestCnt); }
  if (this.openRequestCnt < 0) {
    this.openRequestCnt = 0;
  }
  this.doProcess(); // Start requests for anything else in queue.
}

// caller to call this method when it encounters a onTimeout
// if we plan to re-try then return true.  Otherwise return
// false.   If we return a false then the caller callback method
// should be called.
AjaxQueue.prototype.reqTimeOut = function (parms, callback) {
  var lcfg = null;
  if ((parms.in) && (parms.in.lcfg)) {
    lcfg = parms.in.lcfg;
  }
  if (lgr.LNorm(lcfg)) { lgr.logcfg(lgr.NORM, lcfg, "HTTPGet L468: AjaxQueue reqTimeOut  parms.tryCnt=" + parms.tryCount); }
  parms.QTTimeOutCnt++;
  this.onFinish(null, parms);
  if (this.abortFlag === false) {
    if (parms.tryCount < GBLMaxHTTPTimeoutRetry) {
      if (lgr.LNorm(lcfg)) { lgr.logcfg(lgr.NORM, lcfg, "HTTPGet L491: AjaxQueue Retry due to prior timeout " + parms.tryCount); }
      this.requeue(parms, callback);
      return true;
    }
    else {
      if (lgr.LNorm(lcfg)) { lgr.logcfg(lgr.NORM, lcfg, "HTTPGet L496: AjaxQueue too many retry giving up "); }
      return false;
    }
  }
  return false;
}


/*  Aborts any pending items held in queue */
AjaxQueue.prototype.abortPendingRequests = function () {
  this.openRequestCnt = 0;
  this.requestQueue = [];
  this.abortFlag = false;
  this.queueTimer = null;
}


/* Non blocking request to feed items from a queue into the
Open queries.   will open at most maxOpenRequests prior to
queing them */
AjaxQueue.prototype.doProcess = function () {
  // Made it here so we have something to process
  // go ahead and make the request.
  
  if (lgr.LTrace3()) { lgr.trace3("HTTPGet L520: AjaxQueue.doProcess() abortFlag=" + this.abortFlag + " requestQueue.length = " + this.requestQueue.length + " openRequestCnt=" + this.openRequestCnt + " maxOpenRequests=" + this.maxOpenRequests); }
  while ((this.abortFlag == false) && (this.requestQueue.length > 0) && (this.openRequestCnt <= this.maxOpenRequests)) {
    var qitem = this.requestQueue.shift(); // pull first item from queue
    var reqParms = qitem[0];
    var lcfg = reqParms.in.lcfg;
    var reqCallback = qitem[1];    
    reqParms.tryCount++; // = reqParms.tryCount + 1;
    if (lgr.LTrace2(lcfg)) {
      lgr.logcfg(lgr.TRACE2, lcfg,
      "HTTPGet L527: AjaxQueue.doProcess reqParms = " + JSON.stringify(reqParms.in)
      + " tryCount = " + (reqParms.tryCount - 1)," making request",
      + " abortFlag=" + this.abortFlag, " requestQueue.length = " + this.requestQueue.length,
      + " openRequestCnt="  + this.openRequestCnt, " maxOpenRequests=" + this.maxOpenRequests);
      }
    reqParms.QTStartProcess = StrUtil.curr_time();
    reqParms.QTWaitTime = reqParms.QTStartProcess - reqParms.QTEnqueue;
    this.openRequestCnt++;
    httpRequestJSON(reqParms, reqCallback, this); // make the actual call
  }
  this.startTimer(); // will start the timer only if data remains in queue
}

AjaxQueue.prototype.onProcessTimerElap = function(self) {
  if (self === undefined) {
    lgr.error("HTTPGet L524: AjaxQueue ERROR: SELF MUST BE SET FOR AjaxQueue.prototype.onProcessTimerElap()");
  }
  else {
    self.queueTimer = null;
    self.doProcess();
  }
}

AjaxQueue.prototype.startTimer = function () {
  if ((this.queueTimer === null) && (this.abortFlag == false) && (this.requestQueue.length > 0)) {
    this.queueTimer = setTimeout(this.onProcessTimerElap, this.pollingInterval, this); // loopback to try and process again
  }
  else {
    this.queueTimer = null;
  }
}

// some sort of error occured that we think might be recoverable
// so re-queue this item but insert at front of queue so it is
// serviced next.  Ignores queue count limits as this is a item
// we most likely pulled out of the queue a few ms ago.
AjaxQueue.prototype.requeue = function (parms, callback) {
  var lcfg = parms.in.lcfg;
  if (lgr.LDebug(lcfg)) { lgr.logcfg(lgr.DEBUG, parms.in.lcfg, "HTTPGet L564: AjaxQueue Request Reqeue()  parms.tryCount = " + parms.tryCount); }
  parms.err = [];
  this.requestQueue.unshift([parms, callback]);
  this.doProcess();
}

AjaxQueue.prototype.enqueue = function (parms, callback) {
  // create required parms.in.lcfg to support logging if not already present.  
  if (!(parms)) {
    parms = {};
  }
  if (!(parms.in)) {
    parms.in = {};
  }
  if (!(parms.in.lcfg)) {
    parms.in.lcfg = {};
  }
  var lcfg = parms.in.lcfg;

  if (this.requestQueue.length > this.maxQueueSize) {
    if (lgr.LInfo(lcfg)) { lgr.logcfg(lgr.INFO, lcfg, "HTTPGet L583: AjaxQueue Max Queue Size Exceeded " + this.requestQueue.length); }
    return false;
  }
  else {
    if (parms.tryCount === undefined) {
      parms.tryCount = 0
    };
    parms.QTTimeOutCnt = 0;
    parms.QTEnqueue = StrUtil.curr_time();
    this.requestQueue.push([parms, callback]);

    if (lgr.LTrace2(lcfg)) { lgr.logcfg(lgr.TRACE2, lcfg, "HTTPGet L594: AjaxQueue server=" + parms.server + ":" + parms.port + " method=" + parms.method + " qtype=" + parms.qtype + " uri=" + parms.uri + " query=" + parms.postStr); }

    this.doProcess();
    return true;
  }
}

AjaxQueue.prototype.itemsRemaining = function () {
  return this.requestQueue.length;
}

AjaxQueue.prototype.isEmpty = function () {
  if (this.requestQueue.length === 0) {
    return true;
  }
  else {
    return false;
  }
}


// Return an Ajax queue with the specified name or create a new
// queue if one is not available.  When creating a queue use the
// supplied optional maxOpenItems and maxQueueSize if supplied otherwise
// use global defaults.
function GetAjaxQueue(queueName, maxOpenItems, maxQueueSize) {  
  var tqueue = GBLAjaxQueues[GBLAjaxQueues];
  if (tqueue === undefined) {
    // Create a new Queue if we don't already
    // have one with this name.
    if (maxOpenItems === undefined) {
      maxOpenItems = GBLDefaultQueueMaxOpenItems;
    }
    if (GBLDefaultQueueMaxQueueSize === undefined) {
      GBLDefaultQueueMaxQueueSize = GBLDefaultQueueMaxQueueSize
    }

    tqueue = new AjaxQueue(queueName, maxOpenItems, maxQueueSize);
    GBLAjaxQueues[queueName] = tqueue;
  }
  if (lgr.LNorm()) { lgr.log("HTTPGet L634: GetAjaxQueue queueName=" + queueName + " maxOpenItems=" + maxOpenItems + " maxQueueSize = " + maxQueueSize); }
  return tqueue;
}
exports.GetAjaxQueue = GetAjaxQueue;
