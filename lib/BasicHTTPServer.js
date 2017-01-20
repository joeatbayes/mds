// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt

// Sets up a basic http server which will listen
// on a port and serve up files from a specified
// root doc folder.   It provides a mechanism
// to register handlers based on the path
// prefix.

// Handlers are always called most specific
// handler first.  so we take the longest URI
// and attempt a match working backwards in
// length of the URI until we run out or find
// a match.

// The this pointer in the callback was getting overridden
// by the this of the http handler converted to module
// level coded.  This works but is not ideal because
// we need the callbacks to work for object instances
// to make other advanced concepts work.
var lgr = require('./Logger');
var cll = lgr.cll;
var log = lgr.log;

// node.js libraries
var http = require('http');
var fs = require('fs');
var path = require('path');
var URL = require('url');
var util = require('util');

// jnode shared http libraries
var StrUtil = require('./StrUtil');
var StrBuf = require('./StrBuf');
var FileUtil = require('./FileUtil');
var GenericHTTPHandler = require('./GenericHTTPHandler.js');
var curr_time = StrUtil.curr_time;


//let makeSafeURI(aStr : string) =
//  aStr.Replace(":","").Replace(" ", "").Replace("+", "").Replace(">", "")
//      .Replace("//", "").Replace("/", "\\")


//let ParseFieldFromMultipartForm(formStr : string, fieldName : string) =
//  let mutable tstr = formStr
//  let begStr = "name=\"" + fieldName + "\""
//  let mutable ndx = tstr.IndexOf(begStr) + 8
//  tstr <- tstr.Remove(0, ndx)
//  ndx <- tstr.IndexOf("Content-Type: text/plain")
//  tstr <- tstr.Remove(0, (ndx + 25))
//  ndx <- tstr.IndexOf("-----") - 1
//  if (ndx >= tstr.Length) then ndx <- tstr.Length - 1
//  tstr <- (tstr.[0..ndx]).Trim()
//  tstr


//let SendUTF8DataString(aStr : string, resp : HttpListenerResponse) =
//    let UEncoder = new System.Text.UTF8Encoding(true,false)
//    let respBA = UEncoder.GetBytes(aStr)
//    let tPreamb =  UEncoder.GetPreamble()
//    resp.ContentEncoding <-  UEncoder
//    resp.ContentLength64 <- respBA.LongLength + tPreamb.LongLength
//    resp.OutputStream.Write(tPreamb, 0, tPreamb.Length)
//    resp.OutputStream.Write(respBA, 0, respBA.Length)
//    ()



function BasicHTTPServer(lport, droot)
{
  self = this;
  self.mimeTypes = -1;
  self.docRoot = droot;
  self.listenPort = lport;
  self.handlers = {};


  self.loadMimetypes = function(fiName)
  {
    if (fs.existsSync(fiName)) {
      self.mimeTypes = FileUtil.loadKeyValueFile(fiName);
      //console.log(JSON.stringify(MimeTypes));
      return self.mimeTypes;
    }
    else {
      return null;
    }
  }


  self.conv_path_to_file_path = function (baseDir, uriPath)
  {
     var tpath = baseDir + "/" + (path.normalize(uriPath));
     // Strip leading "../../";
     tpath = StrUtil.replaceAll(tpath,"\\", "/");
     tpath = StrUtil.replaceAll(tpath,"//", "/");
     tpath = StrUtil.replaceAll(tpath,"/./", "/");
     return tpath;
  }

  self.getContentType = function (filePath)
   {
     var fiExt = path.extname(filePath).toLowerCase().trim();
     var mtype = self.mimeTypes[fiExt];
     if (mtype === undefined)
       mtype = "text/plain";
     //console.log("fiExt=" + fiExt + " mtype=", mtype);
     return mtype;
   }


   self.deliver_as_file = function (filePath, req, res)
   {
     function deliverAsFileOnReadFile(err, tstr)
     {
	     if (err) {
	       handle_as_error(500, "error retrieving file", req, res)
	       return;
	     }
	     var mtype = self.getContentType(filePath);

       // TODO: Lookup file extension in MimeTypes
	     if (res.isClosed == false) {
	       // Note: Added the Access-Control-Allow-Origin header so demo pages
         // can make ajax calls to other domains.  
	       res.writeHead(200, { 'Content-Type': mtype });
	       res.write(tstr);
	     }
       //res.write('\n');
       //res.write('url=' + req.url + '\n');
       //res.write('headers=' + JSON.stringify(req.headers) + '\n');
       self.resEnd(res);
	   }
     fs.readFile(filePath, deliverAsFileOnReadFile);
   }


   self.deliver_as_dir = function (filePath, req, res)
   {
      lgr.trace3("BasicHTTPServer L138: deliver_as_dir filePath=" + filePath);
      function onAsDirOnRead(err, files)
      {
	      if (err)
        {
          handle_as_error(500, "error retrieving file", req, res)
	        return;
	      }
	      if (res.isClosed == false) {
	        res.writeHead(200, { 'Content-Type': "text/plain" });
	      }
        for (ndx in files)
        {
          if (res.isClosed == false) {
            res.write(files[ndx]);
            res.write('\n');
          }
          lgr.trace3("BasicHTTPServer L155: file=" + files[ndx]);
	      }
        self.resEnd(res);
      }
      lgr.trace3("BasicHTTPServer L138: deliver_ad_dir begin readdir on " + filePath);
      fs.readdir(filePath, onAsDirOnRead);
   }


   self.handle_as_error = function (status, message, req, res)
   {
     if (res.isClosed == false) {
       lgr.log("BasicHTTPServer L168: handle_as_error ?ERR=" + "ERROR+in+Request&uri=" + encodeURI(req.url) + "&status=" + encodeURI(status) + "&message=" + encodeURI(message));
       self.writeHead(res, status, { 'Content-Type': 'text/plain' });
       self.write(res, message);
       self.resEnd(res);     }
   }

  // Reads Post, Get, Put body from socket in an async fashion
  // calling callback when it is complete.  If the post body
  // is too long then will send a int(413) to client.
  // otherwise will send the collected data string.  If it encounters
  // an error during the read the will callback wtih int(598).
  // if client recieves either 413 or 598 in callback they must
  // call self.req.connection.destroy(); to cleanup the stream
  // or it could continue to consume resources and memory.
  self.read_post_str = function(callback, req, res)
  {
    lgr.trace3("BasicHTTPServer L183: begin read post");
    if (req.isClosed == false) {
      var dstr = "";
      req.on('data', function (data) {
        //console.log("read chunk " + data);
        dstr += data;
        if (dstr.length > 50000000) {
          dstr = 413;
          callback(dstr);
        }
      });
      req.on('end', function () {
        lgr.trace3("BasicHTTPServer L95: done read post " + dstr.length + " characters");
        callback(dstr);
      });
      req.on('error', function () {
        lgr.INFO("BasicHTTPServer L200: error reading post string ")
        callback("598");
      });
    }
  }


   self.handle_as_file =  function (req, res, fiPath)
   {
     if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L208 handle as file req.url=" + req.url + " fiPath=", fiPath); }
     var tpath = fiPath; //self.conv_path_to_file_path(baseDir, req.url);
     function asFileOnStat(error, stats)
     {
	      if (error) {
          if (error.errno == 34) {
	  	      self.handle_as_error(404, "file not found", req, res);
		        return;
	        }
	        self.handle_as_error(500, "Non recoverable server error", req, res);
	        if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L218: error=" + error) };
		      return;
	      }

	      if (lgr.LTrace3()) { lgr.trace3('file:' + tpath + ' : isFile = ' + stats.isFile()); }
        // here you can go on working with the existing file if it exists
	      if (stats.isFile()) {
	        if (lgr.LTrace3()) { lgr.trace3('BasicHTTPServer L225: deliver as file' + tpath); }
	        self.deliver_as_file(tpath, req, res);
		      return;
	      }

	      if (stats.isDirectory())
	      {

  		    if (fs.existsSync(tpath + "/index.html"))  {
		        self.deliver_as_file(tpath + "/index.html", req, res);
		        return;
  		    }
  		    else if (fs.existsSync(tpath + "/index.txt")) {
  		      self.deliver_as_file(tpath + "/index.txt", req, res);
  		      return;
  		    }
          else {
  		      if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L242: deliver as dir" + tpath); }
            self.deliver_as_dir(tpath, req, res);
            return;
          }
	      }
	      self.handle_as_error(404, "document not found");
	      return;
	    }
  	  fs.stat(tpath, asFileOnStat);
  }


  self.findHandler = function(url)
  {
    var uriOnly = url.split("?")[0];
    var path_seg = uriOnly.split('/').slice(1);
	  var tHandArr = undefined;
	  if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L259: path_seg=" + path_seg); }	  
	  for (i = path_seg.length; i >= 0; i--)
	  {      
	    var hand_path = path_seg.slice(0,i).join("/");
	    if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L263: hand_path=" + hand_path); }
	    thand = self.handlers[hand_path];
	    //if (thand === undefined) {
      //  // try it with the extra slash added
	    //  thand = self.handlers[hand_path + "/" ];
	    //}
      if (thand !== undefined)
      {
        if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L271: found hander at " + hand_path); }
        var eSegs =  path_seg.slice(i).join("/");
        var extraPathSeg = StrUtil.removeQueryFromURL(eSegs);
        if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L274: eSegs=" + eSegs + "extraPathSeg=" + extraPathSeg); }
        return {
          'hand_path' : hand_path,
          'hand' : thand.hand,
          'parms' : thand.parms,
          'extraPathSeg' : extraPathSeg};
      }
    }
  }


  self.handle = function (req, res)
  {
    // Need to capture our premature client exit
    // so we know not to send anything more to
    // the output.
    req.isClosed = false;
    res.isClosed = false;
    function onReqClose() {
      if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L293: req Closed"); }
      req.isClosed = true;
    }
    function onRespClose() {
      if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L297:resp Closed"); }
      res.isClosed = true;
    }
    //req.connection.addListener("close", onReqClose);
    //res.connection.addListener("close", onRespClose);
    req.on('end', onReqClose);
    res.on('end', onRespClose);

    if (req.url == "/favicon.ico")
    {
      self.resEnd(res);
     return;
    }
    var ts_begin_handle = new Date().getTime();
    //res.setTimeout(3000);
    // try to handle as loaded handler
    lgr.trace3("BasicHTTPServer L313: req.url=" + req.url);
	  if (req.url === "/")
    {
	    self.handle_as_file(req, res, self.docRoot);
	    return;
	  }
	  var tHandSpec = self.findHandler(req.url);
    if (tHandSpec === undefined)
    {
      lgr.trace3("BasicHTTPServer L322: No handler found so using generic handler");
      tHandSpec = {'hand' : GenericHTTPHandler.GenericHTTPHandler,
        'extraPathSeg' : req.url,
        'parms' : self.docRoot};
    }
    try
    {
         lgr.log("BasicHTTPSever L329: &url=" + encodeURI(req.url));
         if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L330: /handle?tHandSpec_parms=" + encodeURI(JSON.stringify(tHandSpec.parms))); }
         thand = new tHandSpec.hand(self, req, res, tHandSpec.extraPathSeg, tHandSpec.parms);
         thand.handle_pre();
         thand.handle();
         thand.handle_post();
       }
     catch(err)
       {
         var txt="There was an error on this page.\n" + req.url + "\n";
         txt+="Error description: " + err.message + "\n\n";
         txt+=err.toString();
         txt+=err;
         txt+=err.stack;
         txt += "Click OK to continue.\n\n";
         lgr.info("BasicHTTPServer L344: " + txt);
         self.handle_as_error(500, txt, req, res);
       }
	  var ts_end_handle = new Date().getTime();
	  
    if (lgr.LTrace3()) {
      var ts_elap = ts_end_handle - ts_begin_handle;
      lgr.trace3("BasicHTTPSever L351: elapsed=" + ts_elap + " &url=" + encodeURI(req.url));
    }
	  return;
  }


  self.add_handler = function(path_prefix,  handlerClassFunction, parms)  {
    self.handlers[path_prefix.toLowerCase()] = { 'hand': handlerClassFunction, 'parms': parms };

    lgr.log("BasicHTTPServer L360: /add_handler?handlers" + encodeURI(self.handlers)
      + "&doc_root=" + encodeURI(self.docRoot)
      + "&parms= " + encodeURI(JSON.stringify(parms)));
  }

  self.listen = function()  {
    lgr.log("BasicHTTPServer L366: /listen?listenPort=" + self.listenPort + "&docRoot=" + encodeURI(self.docRoot));
    self.httpd = http.createServer(self.handle);
    self.httpd.listen(self.listenPort);
  }


  // Attempt to load mime types from current directory. If don't
  // find then look at parent.  If still don't find then try
  // parent/parent.
  var ttypes = self.loadMimetypes("MimeTypes.txt");
  if (ttypes == null) {
    ttypes = self.loadMimetypes("../MimeTypes.txt");
    if (ttypes == null) {
      ttypes = self.loadMimetypes("../../MimeTypes.txt");
    }
  }


  self.writeHead = function(resp, status, headers) {
    if (resp.isClosed == false) {
      resp.writeHead(status, headers);
    }
    else {
      lgr.info("BasicHTTPServer L389: writeHead resp already closed status=" + status + " headers=" + headers);
    }
  }


  self.write = function(resp, string) {
    if (resp.isClosed == false) {
      resp.write(string);
    }
    else {
      lgr.info("BasicHTTPServer L399: write() already closed " + String);
    }
  }

  self.resEnd = function (resp, writestr) {
    if (resp.isClosed === false) {
      resp.isClosed = true;
      if (writestr) {
        resp.end(writestr);
      }
      else {
        resp.end();
      }
    }
    else {
      lgr.info("BasicHTTPServer L414: resEnd already closed");
    }
  }

  self.destroyConnection = function (req, resp) {
    if (resp.isClosed == false) {
       resp.end();
    }
    else {
      lgr.info("BasicHTTPServer L423: destroyConnection resp already ended");
    }
    req.isClosed = true;
    resp.isClosed = true;
    req.connection.destroy();
  }

  self.post_too_big = function (req, resp) {
    self.writeHead(resp, 413, { 'Content-Type': 'text/plain' })
    self.write(resp, "PUT STRING TOO BIG\n");
    self.resEnd(resp);
    self.destroyConnection(req, resp);
  }


  self.post_can_not_be_empty = function (req, resp) {
      self.writeHead(resp, 400, { 'Content-Type': 'text/plain' })
      self.write(resp, "POST BODY Can not be empty");
      self.resEnd(resp);
      self.destroyConnection(req, resp);

  }

  // extends the resp object to
  // sends contents of a list of files back to client in chunks.
  // files may arrive out of order specified as we depend on async
  // callback for when files are ready.
  // This is a little tricky because the async calls do not gaurantee
  // completion in order and we want to send the files as fast as we
  // can obtain them from disk so we have to track the entire set to
  // makes sure we have recieved the completion event for all of them
  // before ending the conneciton.
  self.send_files = function(resp, fiNames, betweenFileDelim)  {
    util.log("BasicHTTPServer L456: /send_files?fiNames=" + encodeURI(JSON.stringify(files)) + "&delim=" + encodeURI(betweenFileDelim));
    var begRetrieve = curr_time();
    if (fiNames.length == 0)
    {
      this.end();
    }
    else {
      filesDone = [];
      for (var findx in fiNames)
      {
        var fiName = fiNames[findx];
        var begRead = curr_time();
        if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L468 try read " + fiName); }
        fs.readFile(fiName,
        function (err, fiData) {
          filesDone.push(fiName);
          if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L472: findx=" + findx + " fiName=" + fiName + " filesDone.length=" + filesDone.length + "fiNames.Length=" + fiNames.length); }
          if (err) {
            lgr.info("BasicHTTPServer L474: Failed to read " + fiName);
          }
          else
          {
            if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L478: sent " + fiName); }
            if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L479: data = " + fiData); }
            self.write(resp, fiData);
            self.write(resp, betweenFileDelim);

            if (filesDone.length >= fiNames.length) {
              if (lgr.LTrace3()) { lgr.trace3("BasicHTTPServer L484: end of files"); }
              //self.flush();
              self.resEnd(resp);
              var elapRetrieve = curr_time() - begRetrieve
              console.log("BasicHTTPServer L488: Finished send " + fiNames.length + " elap=" + elapRetrieve);
            }
          }
        })
      }  // for
    }
  }
} // end class

//exports.HandlerSearch = HandlerSearch;
exports.BasicHTTPServer = BasicHTTPServer;
