// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt

var BasicHTTPServer = require('./BasicHTTPServer');
var GenericHTTPHandler = require('./GenericHTTPHandler');
var path = require('path');
var fs = require('fs');
var url = require('url');
var fileUtil = require("./FileUtil.js");
var http_get = require('./HTTPGet.js');
var strUtil = require('./StrUtil.js');
var mdsUtil = require('./MDSUtil');
var URL = require('url');
var curr_time = strUtil.curr_time;


// Extends GenericHTTPHandler by creating an instance and adding methods to it. 
// * * * * * * * * * * * * 
// * * * * * CLASS * * * *
// * * * * * * * * * * * * 
function BulkAdd(server, req, resp, extraPath, config)
{
   //console.log("HandlerStatus extraPath=" + extraPath);
   
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

      
      
  function handle_POST()     
  {        
    var begRead = curr_time();     
    //console.log("handle_post");
    function readPostCallback(postStr) 
    {
      var elapRead = curr_time() - begRead;
      //console.log("postStr=" + postStr);
      //console.log("post read " + postStr.length + " bytes");        
      if (postStr == 413) {
        server.post_too_big(self.req, self.resp);
        return;
      }
      else if (postStr.length <= 0)
      {
        server.post_can_not_be_empty(self.req, self.resp);
        return;
      }
        
      else {
          var begWriteFile = curr_time();
          var finishedParse = false;
          var lines = postStr.split("\n");
          var numLines = lines.length;
          if (numLines == 0) 
          {
            self.resp.writeHead(400, {'Content-Type' : 'text/plain'})
            self.resp.write("Can not save empty body");
            self.resp.end();  
            return;
          }          
          //console.log("read " + lines.length + " lines");          
          postStr = ""; // freeup memory -not needed after split.
          var pathNames = [];
          var pathsDone = [];          
          for (lndx = 0; lndx < numLines; lndx++)
          {
            var aline = lines[lndx];
            var delimPos = aline.indexOf("=");
            var keySeg = aline.slice(0, delimPos);
            //console.log("keySeg=" + keySeg);
            var bodyStr = aline.slice(delimPos + 1, aline.length);
            var fldarr = keySeg.split("/");
            //console.log("fldarr=" + JSON.stringify(fldarr));
            if (fldarr.length >= 3) {
              var id = fldarr[0];
              var ver = fldarr[1];
              var rt = fldarr[2];
              var objPath = id + "/" + ver + "/" + rt
              //console.log(" path=" + objPath + " bodyLen=" + bodyStr.length);              
              //console.log("bodyStr=" + bodyStr);
              //console.log("aline=" + aline);
              pathNames.push(objPath);
              self.driver.updateItem(objPath, bodyStr,
                function (donePath, doneStat) {                   
                  //console.log("finished save " + donePath + " res=" + doneStat );
                  pathsDone.push(donePath + "=" + doneStat);                                    
                  if (finishedParse && (pathsDone.length >= pathNames.length))
                  { // We got the callback from the last file we were trying to
                    // to save.
                    elapWrite = curr_time() - begWriteFile;
                    self.resp.writeHead(200, {'Content-Type': 'text/plain', "elapWrite" : elapWrite, "elapRead" : elapRead});           
                    self.resp.write(pathsDone.join("\n"));
                    self.resp.end();                      
                  }                  
                })                   
            }
          }
          finishedParse = true;
          lines = ""; // freeup memory
        }           
  }
  self.server.read_post_str(readPostCallback, self.req, self.resp);   
}
          
message.method
  // Main Handler End point to receive Request.
  // Must use data dispatch here to various kinds of
  // processing. 
  function handle() 
  {
    //console.log("HandlerBulkAdd.BulkAdd.handle");
    var begTime = curr_time();
    var extra_path = self.extraPath;
    var method =  req.method;    
    var b = self.b;    
    //console.log("method =" + method);
    if (method == "POST") {
       handle_POST();
    }
    else {
      self.resp.writeHead(405, {'Content-Type': 'text/json'});   
      self.resp.write('Method Not Allowed\n');   
      self.flush();
      self.resp.end();
    }
    elap = curr_time() - begTime;
       
  }
    
  self.handle = handle; 
  return self;
  
}
exports.BulkAdd = BulkAdd;
