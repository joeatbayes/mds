// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
//
// File Driver for MDS Server Stores and retrieves Records in underlying 
// File system depending on OS file caching and async IO for Speed.
// Updates may be direclty executed or scheduled for latter update.
//  
// The idea behind this sismple system is that the linux file cache is supposed
// to use all unused memory for file caching.   If I have a system with lots of 
// RAM I could concievably have all the data I need in cache even though I am
// using simple file IO.   If this is true then these reads should be nearly
// as fast as storing in process RAM but more flexible and the linux os should
// automatically manage LRU eviction in native C code so it should be very fast.
// Could consider using tempfs in liue of direct mount.
//  
// http://www.linuxatemyram.com/play.html - See: free -m
// http://www.tldp.org/LDP/sag/html/system-monitoring.html
// http://docs.neo4j.org/chunked/stable/linux-performance-guide.html 
//    vm.dirty_background_ratio = 50
//    vm.dirty_ratio = 80
// http://www.thomas-krenn.com/en/wiki/Linux_Page_Cache_Basics
//    echo "2000" > /proc/sys/vm/vfs_cache_pressure
var path = require('path');
var fs = require('fs');
var mdsUtil = require('./MDSUtil');
var fileUtil = require("./FileUtil.js");

var MaxConPerReq = 30;
var MaxOpenReadReq = 100;

//######
//# CLASS
//######
function Driver(server, config) 
{
  this.config = config;
  this.server = server;
  this.baseDir = server.dataDir;
  console.log("Driver() baseDir=" + this.baseDir);
}
exports.Driver = Driver;




// Forces all queue items to be flushed to back end system.
// some drivers do not require flush.
Driver.prototype.flush = function(callback)
{
  var self = this;
}


// Retrieves a single item from the back end system. Callback
// will be called with itemPath, record_body for that items.  May be 
// This forces immediate execution.   Will call callback with 404
// in record body if the file did not exist. 
// _getItem is private because id does not manage number of open
// files to prevent 
Driver.prototype._getItem = function(recPath, callback) 
{
  var self = this;
  //console.log("driver.getItem() path=" + recPath);
  var fiName = mdsUtil.makeObjFiNamePath(this.baseDir, recPath);
  //console.log("fiName=" + fiName);
  fs.readFile(fiName, 
    function (err, fiData) {     
      if (err) {
        // TODO: ENOENT is special case that should retry 3 times but only
        // after a 15ms delay to allow some file handles to become 
        // available. 
       console.log("err=" + err, " fiName=" + fiName + " fiData=" + fiData);
       callback(recPath, 404);
      }
     else
     {   
        callback(recPath, fiData);
        //console.log("Finished send path=" + path +  " fiName=" + fiName);
     }                                
  }) 
}


// Retrieves a single item from back end system.  Callback
// will be called with itemPath, record_body, Forces immediate
// execution. 
// Get Items must limit number of pending reads because each one
// uses a file handle and we encountered ENOENT errors indicating
// that we had used up all available file handles.  By limiting each
// request a max number of pending requests we can control the rate
// of pending requests. 
// 
// It would be better keep a global counter so
// we can eliminate the global risk of using up all the file handles
// as well. 
//
Driver.prototype.getItems = function(pathsReq, callback)
{
  //console.log("driver.updateItem()");
  var self = this;
  var numItem = paths.length;
  var pathsReq = [];
  var pathsSub = [];
  var totReqCnt = 0;
  var pendReqCnt = 0;
  var doneReqCnt = 0;
  var indx = 0;
  function OnItemDone(pathDone, doneStatus) {
    // record our item that has been completed
    // and notify our original caller 
    if (pathDone !== null) {
      pathDone.push(pathDone);
      callback(pathDone, doneStatus); // call the original client
    }
    // Add items to the queue until we either 
    // run out of items or until we go over the
    // max Items requested. 
    for (;;) {
      var openReqCnt = pathsSub.length - pathDone.length;
      var reqRemCnt = pathsReq.length - pathsSub.length;
      if (reqRemCnt == 0) {
        break; 
      }
      else if ((openReqCnt <= MaxConPerReq)) {
        var indx = pathsSub.length
        var itemPath = pathsSub[indx];
        pathsSub.push(itemPath);
        this._getItem(itemPath, onItemDone)
      }      
    }
  }
  // Simulate a callback to OnItemDone force start of
  // logic to add the first group of requests. 
  OnItemDone(null,0);
}


// This method is intended to provide a way to initiate operation
// of queued requests when dealing with back end systems which
// may need to back single requests into larger sets of requests
// before initiating requests to the back end storage systems.
Driver.prototype.finishedGets = function(paths, callback)
{
  var self = this;
  //console.log("driver.finishedGets()");
}


// Updates item in back end storage system.  May be queued
// for last item in request for some back ends.  The callback
// will not be executed until flush.
Driver.prototype._updateItem = function (recPath, recBody, callback) {
  var self = this;
  //console.log("driver.updateItem() recPath=" + recPath);
  var fiName = mdsUtil.makeObjFiNamePath(self.baseDir, recPath);
  var dirName = path.dirname(fiName);
  //console.log("fiName=" + fiName);
  //console.log("dirName=" + dirName);
  if (fs.existsSync(dirName) == false) {
    //console.log("create Dir " + dirName);
    fileUtil.mkDirsSync(dirName);
  }
  //console.log("Write " + fiName + " = " + recBody);
  fs.writeFile(fiName, recBody,
    function (err) {                       
      if (err) {
        console.log("error save recPath=" + recPath + " fiName=" + fiName + " err=" + err);
        callback(recPath, 500);
      }
      else  {
        callback(recPath, 200);
      }
  })
}


// TODO: URGENT ACTION:
// Updates mutliple items in back end storage system.  May be 
// queued until the flush is called.  callback will not be executed
// until flush has completed.  Path is a array containing keys,
// recBodys is array containing the strings to be saved. 
// Update Items must manage a list of items so we have less than 30 items
// queued for saving at any single time.
Driver.prototype.updateItems = function (paths, recBodys, callback) {
  var self = this;
}


Driver.prototype.deleteItem = function (recPath, callback) {
  var self = this;
  console.log("deleteItem " + recPath);
  var fiName = mdsUtil.makeObjFiNamePath(self.baseDir, recPath);
  console.log("deletefile " + fiName + " recPath=" + recPath);
  if (fs.existsSync(fiName)) {
    fs.unlink(fiName,
      function (err) {
        if (err) {
          console.log("error delete recPath=" + recPath + " fiName=" + fiName + " err=" + err);
          callback(recPath, 500);
        }
        else {
          callback(recPath, 204);
        }
      })
  }
  else {
    callback(recPath, 200);
  }
}