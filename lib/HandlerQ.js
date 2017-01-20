// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt

var BasicHTTPServer = require('./BasicHTTPServer');
var GenericHTTPHandler = require('./GenericHTTPHandler');
var path = require('path');
var fs = require('fs');
var url = require('url');

var http_get = require('./HTTPGet.js');
var strUtil = require('./StrUtil.js');
var mdsUtil = require('./MDSUtil');

var URL = require('url');
var curr_time = strUtil.curr_time;
var betweenFileDelim = "\0x1E\n";

// Extends GenericHTTPHandler by creating an instance and adding methods to it. 
// * * * * * * * * * * * * 
// * * * * * CLASS * * * *
// * * * * * * * * * * * * 
function Q(server, req, resp, extraPath, config)
{
   console.log("HandlerStatus extraPath=" + extraPath);
   
   var self = new GenericHTTPHandler.GenericHTTPHandler(server,req, resp, extraPath,config);
     //  Calls our superclass handler and sets up its main variables.	   
   self.extraPath = extraPath;
   // copy our parameters so they are availble in the self context. 
   self.req = req;
   self.resp = resp;
   self.server = server;
   self.config = config;
   self.self = self;
   self.driver = new server.BEDriver(server, self.config);

  function parse_query()
  {
    var q = {};
    var pathArr = extraPath.split("/", 3);        
    var qparms = url.parse(req.url, true).query;
    console.log("qparms=" + JSON.stringify(qparms));
    q.parms = qparms;
    q.id = [];
    q.rt = ["."];
    q.v = "000";
    if (extraPath.length > 0) {
      q.id = [ pathArr[0] ];  
    }         
    if (pathArr.length == 3) {
      // fully qualified single get
      q.v = pathArr[1];
      q.rt = [ pathArr[2] ];        
    }
    else if (pathArr.length == 2)  {  
      q.id = [ pathArr[0]];
      q.v = pathArr[1];       
    }    
    if (qparms.id !== undefined)  {
      q.id = qparms.id.split(",");
    }
    if (qparms.rt !== undefined) {
      q.rt = qparms.rt.split(",");
    }
    if (qparms.v !== undefined) {
      q.v = qparms.v;   
    }
    return q;
  }
  

  
  
  /*    
   http://mds1.angies.com:8300/q
   http://mds1.angies.com:8300/q?v=8.2
   http://mds1.angies.com:8300/q?rt=sp,sploc,spglobmet
   http://mds1.angies.com:8300/q?v=8.2&rt=sp,sploc,spglobmet
   --POST String--
   id=1018x3&v=8.2&rt=sp,splog,spglobmet
   id=1019
   id=1030&v=8.3
   id=1090&rt=spglobmet
   id=87,97,121,738&rt=map_cat&v=US-EN 
  */
  function handle_POST()
  {
    var q = parse_query();
    //console.log("q=" + JSON.stringify(q));
    var begRead = curr_time();      
    function OnPostDataRead(postStr) 
    {
      var elapRead = curr_time() - begRead;
      //console.log("postStr=" + postStr);
      if (postStr == 413) {
        server.post_too_big(self.req, self.resp);
        return;
      }
      else if (postStr.length <= 0){
        server.post_can_not_be_empty(self.req, self.resp);
        return;
      }
              
      var lines = postStr.split("\n");
      var numLines = lines.length;
      if (numLines == 0)  {
        server.post_can_not_be_empty(self.req, self.resp); 
        return;
      }
      //console.log("lines=" + lines);
      console.log("read " + lines.length + " lines");          
      var paths = [];
      var pathsDone = [];
      self.resp.writeHead(200, {'Content-Type': 'text/plain'}); 
      for (lndx = 0; lndx < numLines; lndx++) {
        var aline = lines[lndx].trim();
        //console.log("zzzz aline=" + aline);
        lfld = aline.split("/")
        var lineq = { "id": lfld[0], "v": lfld[1], "rt": lfld[2] };
        // uses trick of lfld[x] will return undefined when 
        // that position does not exist.         
        console.log("lineq=" + JSON.stringify(lineq));
        // copy missing paramaters from defaults for
        // the query and if still missing supply default
        if ((lineq.id == undefined) || (lineq.id === ""))
        { lineq.id = q.id; } else { lineq.id = lineq.id.split(","); }
        if (lineq.id == undefined) { lineq.id = "default"; }
        if ((lineq.rt == undefined) || (lineq.rt === ""))
        { lineq.rt = q.rt; } else { lineq.rt = lineq.rt.split(","); }
        if (lineq.rt == undefined) { lineq.rt = "x"; }
        if ((lineq.v == undefined) || (lineq.v == ""))
        { lineq.v = q.v; }
        if (lineq.v == undefined) { lineq.v = "000"; }
        console.log("lineq=" + JSON.stringify(lineq));
        for (idndx in lineq.id) {
          var recId = lineq.id[idndx];
          for (rtndx in lineq.rt) {
            var recType = lineq.rt[rtndx];
            var apath = recId + "/" + lineq.v + "/" + recType;
            //console.log(" recId=" + recId + " recType=" + recType + " ver=" + lineq.v);
            paths.push(apath);
          }
        }
      }
      self.driver.getItems(apaths, 
        function(aPath, aBody) 
        {
                self.resp.write(aPath + "=" + aBody);
                resp.write(betweenFileDelim);           
                pathsDone.push(aPath);
                //console.log(" sent " + fiName);
                //console.log(" data = " + fiData);
                if (pathsDone.length >= paths.length)
                {
                   self.resp.end();  
                }
      });            
    } // OnPostDataRead()

    self.server.read_post_str(OnPostDataRead, self.req, self.resp); 
  } // function handle_post
  
  
  
  function handle_PUT()     
  {
    //console.log("Q.handle_PUT");      
    pathArr = extraPath.split("/",3);
    if (pathArr.length != 3) {
      //console.log("invalid number of parameters");
      self.resp.writeHead(400, {'Content-Type': 'text/json'});   
      self.resp.write("PUT Requests Require ObjectId/ObjectVersion/ObjectType");
    }
    else
    {            
      var objId = pathArr[0];
      var objVer= pathArr[1];
      var objType=pathArr[2];
      var apath = objId + "/" + objVer + "/" + objType;
      //console.log("apath=" + apath);
      var begRead = curr_time();      
      function OnPostDataRead(postStr) 
      {
        var elapRead = curr_time() - begRead;
        //console.log("postStr=" + postStr);
        if (postStr == 413) 
          { server.post_too_big(self.req, self.resp); }
        else if (postStr.length <= 0)
          { server.post_can_not_be_empty(self.req, self.resp); }    
        else {
          var begWriteFile = curr_time();
          self.driver.updateItem(apath, postStr,           
            function (savedPath, status) {            
              var elapWriteFile = curr_time() - begWriteFile;
              if (status == 500) {
                self.resp.writeHead(500, {'Content-Type': 'text/plain'});
                self.resp.write(savedPath + "=" + status);
                self.resp.end();        
              }
              else
              {
                var b = self.b;
                //console.log("Saved " + savedPath + " stat=" + status );
                self.resp.writeHead(200, {'Content-Type': 'text/plain', "elap_read=" :elapRead, "elap_write" :elapWriteFile });           
                self.resp.write(savedPath + "=" + status);              
                self.resp.end();              
                //console.log("Finished handle_PUT");              
              }
          });
        }
      }
      self.server.read_post_str(OnPostDataRead, self.req, self.resp);                   
    }    
  }
  

  
  // http://mds1.angies.com:8300/q/10181X3/8.2/sp 
  // http://mds1.angies.com:8300/q/10181X3/8.2?rt=sp,sploc,spglogmet,spbestrev 
  // http://mds1.angies.com:8300/q?rt=sp,sploc,spglogmet,spbestrev&v=8.2&id=10181X3,10189X2,101817,918187,08989
  function handle_GET() 
  {    
    var q = parse_query();    
    //console.log(JSON.stringify(q));
    if ((q.id.length == 0) || (q.rt.length == 0) || (q.v.length == 0)) {
      self.resp.writeHead(400, { 'Content-Type': 'text/json' });
      tobj.msg = "could not parse request.";
      self.resp.write(JSON.stringify(q));
      self.resp.end();
    }
    else {
      // TODO: Move this to makeNames Function
      self.resp.writeHead(200, { 'Content-Type': 'text/json' });
      var paths = [];
      var pathsDone = [];
      var finishedParse = false;
      for (var idndx in q.id) {
        var objId = q.id[idndx];
        for (var rtndx in q.rt) {
          var objType = q.rt[rtndx];
          var apath = objId + "/" + q.v + "/" + objType;
          paths.push(apath);
        }
      }
      self.driver.getItem(apath,
        function (donePath, aBody) {
          self.resp.write(donePath + "=" + aBody);
          resp.write(betweenFileDelim);
          pathsDone.push(donePath);
          //console.log(" sent " + fiName);
          //console.log(" data = " + fiData);
          if (pathsDone.length >= paths.length) {
            self.resp.end();
          }
        });
    } // else
  } // function 
  

  function handle_DELETE() {
    var q = parse_query();
    console.log("handle_delete()");
    console.log(JSON.stringify(q));
    if ((q.id.length == 0) || (q.rt.length == 0) || (q.v.length == 0)) {
      self.resp.writeHead(400, { 'Content-Type': 'text/json' });
      tobj.msg = "could not parse request.";
      self.resp.write(JSON.stringify(q));
      self.resp.end();
    }
    else {
      // TODO: Move this to makeNames Function
      self.resp.writeHead(200, { 'Content-Type': 'text/json' });
      var paths = [];
      var pathsDone = [];
      var finishedParse = false;
      for (var idndx in q.id) {
        var objId = q.id[idndx];
        for (var rtndx in q.rt) {
          var objType = q.rt[rtndx];
          var apath = objId + "/" + q.v + "/" + objType;
          paths.push(apath);
          self.driver.deleteItem(apath,
             function (donePath, doneStat) {
               self.resp.write(donePath + "=" + doneStat);
               resp.write(betweenFileDelim);
               pathsDone.push(donePath);
               //console.log(" sent " + fiName);
               //console.log(" data = " + fiData);
               if ((finishedParse) && (pathsDone.length >= paths.length)) {
                 self.resp.end();
               }
             });
        }
      }
      finishedParse = true;
    } // else            
  } // function 

  
  
  // Main Handler End point to receive Request.
  // Must use data dispatch here to various kinds of
  // processing. 
  function handle() 
  {
    var begTime = curr_time();
    var extra_path = self.extraPath;
    var method =  req.method;    
    var b = self.b;
    console.log("extraPath ="  + extra_path);
    console.log("method =" + method);
    if (method == "PUT") {
       handle_PUT();
    }
    else if (method == "GET") {
       handle_GET();
    }
    else if (method == "POST") {
       handle_POST();
    }
    else if (method == "DELETE") {
      handle_DELETE();
    }
    else {
      self.resp.writeHead(405, { 'Content-Type': 'text/json' });
      self.resp.write('Method Not Allowed\n');
      self.flush();
      self.resp.end();
    }
    elap = curr_time() - begTime;    
  }
    
  self.handle = handle; 
  return self;
  
}
exports.Q = Q;
