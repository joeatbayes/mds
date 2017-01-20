// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt

// StrUtil.js - functions for strings that should have been included 
//   but where left out.

//var fs = require('fs');
var os = require('os');

function numberWithCommas(n) {
  var parts = n.toString().split(".");
  return parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, ",") + (parts[1] ? "." + parts[1] : "");
}
exports.numberWithCommas = numberWithCommas;

function comma_formated(aVal, numDec) {
  var tnum = aVal;
  if (isString(tnum)) tnum = parseFloat(tnum.trim());
  tnum = tnum.toFixed(numDec);
  tnum = numberWithCommas(tnum);
  return tnum;
}
exports.comma_formated = comma_formated;

function isObject(aVar) {
  return (aVar instanceof Object);
}
exports.isObject = isObject;

function isArray(aVar) {
  return (aVar instanceof Array);
}
exports.isArray = isArray;

function isString(aVar) {
  return (typeof aVar === 'string')
}
exports.isString = isString;

function isFloat(aVar) {
  return ((typeof aVar === 'float') || (typeof aVar === 'number'))
}
exports.isFloat = isFloat;

function isInt(aVar) {
  return ((typeof aVar === 'int') || (typeof aVar === 'number'))
}
exports.isInt = isInt;

function isNum(aVar) {
  return ((typeof aVar === 'number') || (isFloat(aVar)) || (isInt(aVar)))
}
exports.isNum = isNum;

function randRange(pmin, pmax) {
  var range = pmax - pmin;
  var randNum = Math.random();
  var portRange = randNum * range;
  return pmin + portRange;
}
exports.randRange = randRange;


// Convert a object / hashtable which has
// a series of top level keys into a query
// string.  Assumes that the values are
// already strings or could fail with complex
// object.
function toHTTPQueryStr(aObj)
{  
  var tOutArr = [];
  for (var p in obj) {
    tOutArr.push(encodeURIComponent(p) + "=" + encodeURIComponent(obj[p]));
  }
  return tOutArr.join("&");
}
exports.toHTTPQeryStr = toHTTPQueryStr;

// Returns an array of keys found in a object 
// because array.keys() seems to be missing
// from node. 
function keys(pobj) {
  var tout = [];
  for (var akey in pobj) {
    tout.push(akey);
  }
  return tout;
}
exports.keys = keys;

function removeQueryFromURL(aURL)
{
   //console.log("removeQueryFromURL=" + aURL);
   var qstart = aURL.indexOf("?");
   if (qstart <= 0) {
     return aURL;
   }
   var tout = aURL.substr(0,qstart);
   console.log("tout=" + tout);
   return tout; 
}
exports.removeQueryFromURL = removeQueryFromURL;

// Remove the leading occurences of toTrim from
// the beginning string and return the result. 
function trimLeading(strIn, toTrim)
{
  var ts = strIn;
  while (ts.indexOf(toTrim) == 0)
  {
    ts = ts.substr(toTrim.length);
  }
  ts
}
exports.trimLeading = trimLeading;



//-- This kind of extension does not seem to work correctly on version 0.10.29
// -- on linux but does work on windows.  The more traditional method does work
// -- so will just use it even it not as clean.
//String.prototype.replaceAll = function (oldSub, newSub) {
//    var tarr = this.split(oldSub);
//    return tarr.join(newSub);
//}

/* Replace all occurances of sub strings with the new sub string.  The Javascript
* native function normally only replaces the first but it depends on the browser. */
function replaceAll(pstr, oldSub, newSub) {
    var tarr = pstr.split(oldSub);
    return tarr.join(newSub);
}
exports.replaceAll = replaceAll



// take an arbitrary string and break it into segments
// separated by / where each seg contains segLen characters
function makeSegString(pstr,segLen) {   
   var tarr = [];
   var ccnt = 0;
   var maxLen = pstr.length;
   //console.log("makeSegString str=" + pstr + " segLen=" + segLen + "----");
   for (var ndx=0;  ndx < maxLen; ndx++)
   {
     var achar = pstr[ndx];
     tarr.push(achar);
     ccnt += 1;
     if (ccnt >= segLen)  {
        tarr.push("/");
        ccnt = 0;
     }
   }
   //console.log("tarr = " + tarr);
   //console.log("tarr.length=" + tarr.length);
   //console.log("tarr last=" + tarr[(tarr.length - 1)]);
   while(tarr[(tarr.length - 1)] === "/")  {
    tarr.pop();
   }   
   return tarr.join("");      
}
exports.makeSegString = makeSegString;


/* Return Current time in float which contains
 seconds and fractional seconds */
function curr_time()
{    
    return (new Date()).getTime();
}
exports.curr_time = curr_time;

function elap(oldtime) {
  return (curr_time()  - oldtime);
}
exports.elap = elap;


/*  Parse HTTP Query String and return a dictonary 
 containing the parameter names as keys and the 
 values as strings */
function parseQueryStr(qstr) {
    var segs = qstr.split('&');
    var q = {}
    for (var i = 0; i < segs.length; i++) {
        var pair = segs[i].split('=');
        q[pair[0]] = decodeURIComponent(pair[1]);
        
    }
    return q;    
}
exports.parseQueryStr = parseQueryStr;


/* Produce a properly URI escaped query URI where the query 
paramters are supplied with the tag names as keys in a dictionary
and values are the encodeURI verison of those values.  All values
must be strings before calling this function.   */
function makeURIWithQueryString(uriPrefix, parms) {
  b = []
  for (akey in parms) {
    b.push(akey + "=" + encodeURI(parms[akey]));
  }
  return uriPrefix + "?" + b.join("&");
}
exports.makeURIWithQueryString = makeURIWithQueryString;


/* Parse Comma Delimited List of Integers in a string
and return as a list containing integers */
function parseCommaDelimIntList(astr) {
  if ((astr === null) || (astr === undefined)) {
    return astr
  }
  var tlst = astr.split(",");
  var tout = [];
  for (var ndx in tlst) {
    var ts = tlst[ndx].trim();
    if (ts > " ") {
      tout.push(parseInt(ts));
    }
  }
  return tout;
}
exports.parseCommaDelimIntList = parseCommaDelimIntList;



/* Parse a commad delimited list of float values in a string
and return a list containing floats */
function parseCommaDelimFloatList(astr) {
  if ((astr === null) || (astr === undefined)) {
    return astr
  }
  var tlst = astr.split(",");
  var tout = [];
  for (var ndx in tlst) {
    var ts = tlst[ndx].trim();
    if (ts > " ") {
      tout.push(parseFloat(ts));
    }
  }
  return tout;
}
exports.parseCommaDelimFloatList = parseCommaDelimFloatList;



function parseCommaDelimAsDict(pstr, convFun)
{
  if ((pstr === undefined) || (pstr === null)) {
    return pstr;
  }
  else {
    var tout = {};
    var spa = pstr.split(',');
    for (var tndx in spa) {
      var aseg = spa[tndx];
      var sa = aseg.split("=");
      var segKey = sa[0].trim();
      if (sa.length === 1) {
        tout[segKey] = ''; // default place holder if set to null will not serialize in JSON.
      }
      else {
        var segVal = sa[1].trim();
        if (convFun !== undefied) {
          segVal = convFun(segVal);
        }
        tout[segKey] = segVal;
      }

    }
    return tout;
  }
}
exports.parseCommaDelimAsDict = parseCommaDelimAsDict;


/* DEPRECATE.  Use the  (key in obj)
*  instead */
function hasKey(aObj, keyName) {
  if (keyName in aObj) return true;
  else return false;
}
exports.hasKey = hasKey;


/* Processes the supplied list to remove
any duplicates and returns a new list with
all duplicates removed */
function unique(aList) {
  var tobj = {}
  for (ndx in aList) {
    tobj[aList[ndx]] = null;
  }
  var tout = [];
  for (akey in tobj) {
    tout.push(aky);
  }
  return tout;
}
exports.unique = unique;


/* Takes a unique URI Prefix and a dictionary of
key,values and encodes them as a complete URI
assuming the keys are tag names and the values
are arbitrary data values.  Returns the complete
URI */
function makeURI(uriPrefix, parms) {
  b = []
  for (akey in parms) {
    b.push(akey + "=" + encodeURI(parms[akey]));
  }
  return uriPrefix + "?" + b.join("&");
}
exports.makeURI = makeURI


function renderTag(tagName, attr, autoClose) {
  var sb = [];
  sb.push("<" + tagName);
  for (var vkey in attr) {
    var vval = attr[vkey];
    sb.push(" " + vkey + "=\"" + vval + "\"");
  }
  if (autoClose == true) {
    sb.push("/>");
  }
  else {
    sb.push(">");
  };
  return sb.join("");
}
exports.renderTag = renderTag;


/* #######
### Add some missing methods to Array
### Node corrupts the original defenition of list if 
### try to add as prototype.
//########### */

//if (!indexOf) {
// function indexOf(aList, avalue) {
//   for (var i = 0; i < aList.length; i++) {
//      if (self[i] === avalue) {
//        return i;
//      }
//    }
//    return -1;
// }
// exports.indexOf = indexOf;
//}


//if (!contains) {
//  function contains(aList, avalue) {
//    return (aList.indexOf(avalue) !== -1)
//  }
//}


/************
* Utility and Parsing Routines 
* commonly used by a wide variety
* of pages so included here. 
*************/

// parse simple file containing a
// list of strings on separate lines
// similar to symbol list files 
// used in the symbol-list directory
function parseSimpleList(dataStr) {
  var tout = [];
  var tarr = dataStr.split("\n");
  for (var rowndx in tarr) {
    var rowstr = tarr[rowndx].trim();
    rowstr = rowstr.split("#")[0].trim();
    if (rowstr.length > 0) {
      tout.push(rowstr);
    }
  }
  return tout;
}
exports.parseSimpleList = parseSimpleList;


function parseQueryString(queryString) {
  var parms = {};
  var queries = queryString.replace("?", "").split("#")[0].split("&");
  for (var i in queries) {
    var temp = queries[i].split('=');
    parms[temp[0]] = temp[1];
  }
  return parms;
};
exports.parseQueryString = parseQueryString;


function parseURLHash(purl) {
  var pa = purl.split("#", 2);
  if (pa.length > 1)
    return pa[1];
  else
    return null;
}
exports.parseURLHash = parseURLHash;


function parseAssocArray(dataStr) {
  var trows = dataStr.split("\n");
  var ts = "";
  var tobj = {};
  for (ndx in trows) {
    var trow = trows[ndx].split("#")[0].trim();
    if (trow.length > 1) {
      var tarr = trow.split("=", 2);
      if (tarr.length == 2) {
        var tkey = tarr[0].toLowerCase().trim().replaceAll(" ", "_").replaceAll("-", "_");
        tobj[tkey] = tarr[1].trim();
      }
    }
  }
  return tobj;
}
exports.parseAssocArray = parseAssocArray;


var barDateRE = /^\d\d\d\d-\d\d-\d\d$/;
function isValidBarDatePattern(aDateStr) {
  var res = aDateStr.match(barDateRE);
  //console.log("datein=" + aDateStr + " result=" + res);
  if (res == null) {
    return false;
  }
  return true;
}
exports.isValidBarDatePattern = isValidBarDatePattern;


function parseDate(aDateStr) {
  if (isValidDatePattern(aDateStr) = false) {
    return null;
  }
  return new Date(aDateStr);
}
exports.parseDate = parseDate;

// Many of our input dates come as bar dates 
// ccyy-mm-dd hh:mm:ss but do not include the
// time zone offset so the javascript parser
// assumes UMT. By adding the EST to those 
// dates we get the proper time zone adjustment.
function parseDateAdjustedToEST(aDateStr) {
  if (aDateStr.indexOf(" EST") == -1) {
    aDateStr = aDateStr + " EST"
  };
  return parseDate(aDateStr);
}
exports.parseDateAdjustedToEST = parseDateAdjustedToEST;


function formatJSONOutput(pobj, prettyFlg) {
  if ((prettyFlg === "TRUE") || (prettyFlg === "T") || prettyFlg === true) {
    return JSON.stringify(pobj, null, 2);
  }
  else {
    return JSON.stringify(pobj);
  }
}
exports.formatJSONOutput = formatJSONOutput;


//////////////
// SUSPECT BUT KEPT JUST IN CASE
//////////////
//fs.writeFileSync("resbody.txt", pobj.respBody);
//var tstr = UTF8_decode(pobj.respBody).replace("\\n", "\n").replace("\00009", "\n");
//fs.writeFileSync("respbody.2.txt", tstr);


/*#################
##### IPV4 
##### functions to obtain local ethernet IP address kept here 
##### because only known user is the unique counters below 
###################*/

var GBLIpAddress = null;

// don't export this one because we want to force 
// users to call the getLocalIPAddress which uses the
// cached value.
function findLocalIPAddress() {
  var ifaces = os.networkInterfaces();
  for (var dev in ifaces) {
    var iface = ifaces[dev];
    //console.log ("dev=" + dev + " iface=" + JSON.stringify(iface));
    for (var detndx in iface) {
      var details = iface[detndx];
      if (details.family == "IPv4") {
        if ((details.address !== "127.0.0.1") && (details.internal !== "true")) {          
          return details.address;
        }
      }
    }
  }
  return ""; // fallback if we don't find a IP
}


/* Return the first IPV4 address which appears to represent
 a externally visibile IP.   This should give us a LAN unqiue
 address we can use to seed counters. */
function getLocalIPAddress() {
  if (GBLIpAddress !== null) {
    return GBLIpAddress
  }
  else {
    GBLIpAddress = findLocalIPAddress();
    console.log("GBLIpAddress = " + GBLIpAddress);
    return GBLIpAddress;
  }
}
exports.getLocalIPAddress = getLocalIPAddress;


function getLastIPGroupAsInt() {
  return parseInt(getLocalIPAddress().split(".").pop());
}
exports.getLastIPGroupAsInt = getLastIPGroupAsInt;

function printIPV4Address() {
  var ifaces = os.networkInterfaces();
  for (var dev in ifaces) {
    var iface = ifaces[dev];
    for (var detndx in iface) {
      var details = iface[detndx];
      if (details.family == "IPv4") {
        if ((details.address !== "127.0.0.1")) {
          console.log("dev=" + dev + " ndx=" + detndx + " details=" + JSON.stringify(details));
        }
      }
    }
  }
}
exports.printIPV4Address = printIPV4Address;


/*#################
##### Unique Time + Cntr Alternative to GUID
###################*/

GBLUCntr = 0;

/* CLASS UniqueCounter() combines local timestamp with 
 an internal counter to return a string which is gauranteed
 to be unique within this process.  If multiple counters
 are requested for the same time measurement it will incrment
 a counter to maintain uniqueness */
function UniqueCounter(suffix) {
  this.cntr = 0;
  this.cntrLastTime = null;
  /* If they supply suffix the use it to suffix the answers this
  can gaurantee unique answers between machines if the IP address
  is used to seed.  If in same network the last 4 digits of IP address
  will gaurantee uniqueness */
  if ((suffix === null) || (suffix === undefined) || (suffix === "")) {
    this.suffix = getLastIPGroupAsInt().toString(36);
  }
  else if (typeof (suffix) == 'number') {
    this.suffix = suffix.toString(36) + GBLUCntr.toString(36);
  }
  else {
    // just keep the string;
    this.suffix = suffix.toString();
  }
  console.log("this.suffix=" + this.suffix);
}
exports.UniqueCounter = UniqueCounter;

// returns unqiue counter based on timestamp
// plus internal counter to make unique if used
// for same timestamp.  Encoded to base(36) to
// save time and cntr is separted by "." 
UniqueCounter.prototype.nextId = function () {
  var ctime = curr_time();
  GBLUCntr++; if (GBLUCntr > 99) { GBLUCntr = 0 }
  if (ctime === this.cntrLastTime) {
    this.cntr++;
  }
  else {
    this.cntr = 0;
    this.cntrLastTime = ctime;
  }  
  if (this.cntr > 0)
    return  ctime.toString(36) + this.cntr.toString(36) +  GBLUCntr.toString(36) + this.suffix;
  else
    return ctime.toString(36) + GBLUCntr.toString(36) + this.suffix
}

// Returns the unqiue counter in form of ISO date 
// uses incrementing counter to make unqiue if multiple
// requests during the same timestamp.
UniqueCounter.prototype.nextIdISO = function () {
  var ctime = (new Date()).toISOString();
  GBLUCntr++; if (GBLUCntr > 99) { GBLUCntr = 0 }
  if (ctime === this.cntrLastTime) {
    this.cntr++;
  }
  else {
    this.cntr = 0;
    this.cntrLastTime = ctime;
  }
  this.cntrLastTime = ctime;
  if (this.cntr > 0)
    return ctime + "^" + this.cntr.toString() + "^" + GBLUCntr.toString(36) +  this.suffix;
  else
    return ctime + "^" + GBLUCntr.toString(36) + this.suffix;
}


