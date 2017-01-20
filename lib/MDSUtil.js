//Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
// MDSUtil.js - MDS Utility Functions used by multiple handler classes.

var path = require('path');
var fs = require('fs');
var strUtil = require('./StrUtil.js');
var fileUtil = require("./FileUtil.js");
var curr_time = strUtil.curr_time;

function makeObjFiName(dataBaseDir, objId, objVer, objType)
{
   //console.log("objType=" +  objType + " objVer=" + objVer + " objId=" + objId);
   var tstr = dataBaseDir + "/" + objType + "/" + objVer + "/" + strUtil.makeSegString(objId,3) + ".mds";
   return tstr.replace("/.mds", ".mds")
}
exports.makeObjFiName = makeObjFiName;


function makeObjFiNamePath(dataBaseDir, ppath) 
{
  var tarr = ppath.split("/");
  return makeObjFiName(dataBaseDir, tarr[0], tarr[1], tarr[2]);
}
exports.makeObjFiNamePath = makeObjFiNamePath;


 
function saveMDSFile(fiName, pbody, objPath, callback)
{
   var dirName = path.dirname(fiName);
   console.log("fiName=" + fiName + " dirName=" + dirName);
   console.log("pbody=" + pbody);
   if (fs.existsSync(dirName) == false) {
      console.log("create Dir " + dirName);      
      fileUtil.mkDirsSync(dirName);
   }
   else
   {
      console.log("dir already exists" + dirName);
   }
   fs.writeFile(fiName, pbody, 
     function (err) {       
       if (err) {
         callback(500, fiName, objPath);
       }
       else {
         callback(200, fiName, objPath);              
       } 
     })
}
exports.saveMDSFile = saveMDSFile;
