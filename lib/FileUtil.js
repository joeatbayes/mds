// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
// FileUtil.js

var fs = require('fs');
var StrUtil = require('./StrUtil.js');
var os = require('os');

var lgr = require('./Logger');
var cll = lgr.cll;
var log = lgr.log;

function dirExistsSync (d) {
  try {
    return fs.statSync(d).isDirectory()
  }
  catch (er) {
    return false
  }
} 
exports.dirExistsSync = dirExistsSync;


function fileSize(apath, callback) {
  function statsHere(err, stat) {
    if (err) {
      callback(err, -1);
    }
    else if (stat.isFile === false) {
      callback("NOT FILE", -2);
    }
    else {
      callback(null, stat.size);
    }
  }
  fs.stat(apath, statsHere);
}
exports.fileSize = fileSize;


function fileSizeSync(apath) {
  try {
    var stat = fs.statSync(apath);
    if (stat.isFile === false) {
      return -1
    }
    else {
      return stat.size;
    }
  }
  catch (er)
  {
    return -3;
  }
}
exports.fileSizeSync = fileSizeSync;

// TODO: Make this reverse down the path
// so we minimize redundant checks by checking
// longest first and removing paths. 
function mkDirsSync(pathIn) 
{
     lgr.LTrace2("pathIn=" + pathIn);
     var tpath = StrUtil.replaceAll(pathIn,"\\", "/");
     lgr.LTrace2("tpath=" + tpath);
     var segs = tpath.split("/");
     lgr.LTrace2("segs =" + segs);
     var firstPathSeg = segs.shift();
     var tpath = "/" + firstPathSeg;
     if (firstPathSeg[1] == ":") // on windows can not add the leading "/"
       tpath = firstPathSeg
     
     for (var ndx in segs) {
       lgr.LTrace2("segndx=" + ndx);
       tpath = tpath + "/" + segs[ndx];         
       lgr.LTrace2("new tpath=" + tpath);
       if (tpath.length > 2)
       {
         lgr.LTrace2("l29: new tpath=" + tpath);
         if (fs.existsSync(tpath) == false) {
           lgr.LTrace2("create Dir " + tpath);
           fs.mkdirSync(tpath);
         }
       }
     }
}
exports.mkDirsSync = mkDirsSync;

function mkDirsIfMissingSync(aDir) {
  if (dirExistsSync(aDir) === false) {
    return fs.mkDirsSync(aDir);
  }
  return 1;
}
exports.mkDirsIfMissingSync = mkDirsIfMissingSync;

// Parse the input file at name  which is a set of rows delimited by \n
// and key=value on each line into a hash and return it as an array.
function loadKeyValueFile(fiName)
{
   var outHash = {};
   var fileString = fs.readFileSync(fiName, 'utf8');
   var dataLines = fileString.split("\n");
   for (var aCnt in dataLines)
   {     
     var aLineStr = dataLines[aCnt].trim();
	 if (aLineStr === undefined)
	   continue;	   
	 if (aLineStr.length <= 0) 
	   continue;	  
	 if (aLineStr[0] === '#') 
	    continue;		
	 lineArr = aLineStr.split('=', 2);
	 lgr.LTrace2(lineArr);
	 lgr.LTrace2(aLineStr);
	 outHash[lineArr[0].toLowerCase().trim()] = lineArr[1].trim();	 
   }
   return outHash;
}
exports.loadKeyValueFile = loadKeyValueFile;



/* CLASS FileJournal Appends strings to End of File in Async fashion
when the file grows to past a maximum size then creates the next 
file segment automatically in the same directory.   Ordering is not
gauranteed of writes that are pending in the async queue simutaneously
On callback from write the data has been committed to disk.
TODO: Consider holding the stream open and just appendWrite so we 
do not have to pay file open overhead every write. 
*/
function FileJournal(dataDir, maxFileSize) {
  var self = this;
  this.dataDir = dataDir;
  this.maxFileSize = maxFileSize;
  this.cntr = new StrUtil.UniqueCounter();
  this.fileName = null;
  mkDirsIfMissingSync(dataDir);

  /* Periodically check the file we are writing to and if it
  has grown too large then change to the next file.  Placed here
  so callback has full object context */
  function checkDataFileSize() {
    // use self instead of this for the callback context
    if  (self.fileName === null) {return};
    var fsize = fileSizeSync(self.fileName);
    if (fsize < 0) {
      lgr.fatal("Fatal Error trying to get size of message data file = " + self.fileName);
    }
    else if (fsize >= self.maxFileSize) {
      GBLMaxDataFileSize = self.getNextFileName(self.dataDir);
    }
  }
  setInterval(checkDataFileSize, 30000);
}
exports.FileJournal = FileJournal;

FileJournal.prototype.getNextFileName = function () {
  this.fileName = this.dataDir + "/" + this.cntr.nextId() + ".txt";    
  fs.writeFileSync(this.fileName, ""); // force empty file creation 
  return this.fileName;
}

FileJournal.prototype.addMessage = function (tstr, callback) {
  if (this.fileName == null) { this.fileName = this.getNextFileName() }  
  lgr.LTrace2("Save to FileName=" + this.fileName + " body=" + tstr );
  fs.appendFile(this.fileName, tstr, {'encoding' : 'utf8', 'mode' : 666 }, callback);
}
  
FileJournal.prototype.size = function (aMsg, callback) {
  return  fs.fileSizeSync(this.fileName);
}
