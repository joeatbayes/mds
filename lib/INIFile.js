// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
/* INIfile.js 
  *  routines to Load, update and manage simple INI files.
*/
//var Cache = require('./Cache.js');
var Util = require('util');
var fs = require('fs');

function INIFile(fiName)
{
  self = {}
  self.groups = {};
  function load(fiName)
  {  
    self.fiName = fiName;
    if (fs.existsSync(fiName) == false)
      return undefined;
      
    var fileString = fs.readFileSync(fiName, 'utf8');
    //console.log("load() " + fiName +  " fileString = " + fileString);
    return self.parse(fileString);
  }  
  self.load = load;
  
 
 
  function get(group,key)
  {
    pass;
  }
  self.get = get;
  
  
  
  function toINIStr()
  {
    b = [];
    var groups = self.groups;
    for (var grpKey in self.groups)    
    {
      var tgrp = groups[grpKey];
      b.push("\n[" + grpKey + "]\n");
      //onsole.log(grpKey);
      for (itemKey in tgrp)
      {
        var titem = tgrp[itemKey];
        if (Util.isArray(titem) == true)
        {
          for (var eleNo in titem)
            b.push(itemKey + " = " + titem[eleNo] + "\n");
        }
        else
        {
           b.push(itemKey + " = " + titem + "\n");
        }
      }
    }
    return b.join("");
  }
  self.toINIStr = toINIStr;
 
  function save(fiName)
  {
     var tmpStr = toINIStr();
     fs.writeFileSync(fiName, tmpStr, "utf8");
  }
  self.save = save;

 
  function parse(inStr)
  {
    console.log("parse inStr=" + inStr);
    var dataLines = inStr.split("\n");
    console.log("parse dataLines=" + JSON.stringify(inStr));
    var currGroup = {}
    var currGroupName = 'main';   
    self.groups[currGroupName] = currGroup;
    for (var aCnt in dataLines)
    {       
      var aLineStr = dataLines[aCnt].trim();
      //console.log("aLineStr=" + aLineStr);
      if (aLineStr === undefined)
        continue;	   
      if (aLineStr.length <= 0) 
        continue;	  
      if (aLineStr[0] === '#') 
        continue;	    
      
      if (aLineStr[0] === "[")
      {
        // parsing a group
        aLineStr = aLineStr.replace("[", "").replace("]", "").trim().toLowerCase();
        if (aLineStr.length > 0)
        {
          currGroupName = aLineStr;
          currGroup = self.groups[currGroup];
          if (currGroup == undefined)
          {
            currGroup = {};
            self.groups[currGroupName] = currGroup;
          } 
        }
      }      
      else parseItem(currGroup, aLineStr);
    }  // end for lines      
    return self;                 
   } // function
   self.parse = parse;

  function parseItem(currGroup, aLineStr)
  {   
    // parsing an item
    var lineArr = aLineStr.split('=', 2);
    var key = lineArr[0].trim().toLowerCase();
    var valStr = lineArr[1].trim();
    //console.log("key=" + key + " valStr=" + valStr);
    var currVal = currGroup[key];
    if (currVal == undefined)
    {
      // key does not exist so create as scalar
      currVal = currGroup[key] = valStr;        
    }
    else if (Util.isArray(currVal))
    {
      // already an array so just append        
      currVal.push(valStr);
    }
    else 
    {
      // existing scalar value so convert to array
      currVal = currGroup[key] = [valStr];      
    }               
    return currVal    
  } 
  self.parseItem = parseItem;    
  
  function toJSON()
  {
    return JSON.stringify(self.groups);
  }
  self.toJSON = toJSON;
  
  if (fiName != undefined)
    self.load(fiName);
  
  return self;
  
} // end class;

exports.INIFile = INIFile;