/* Logger.js  - create a place holder for more sophisticated logging latter */


var util = require('util');
var os = require("os");

var TRACE3 = 0;
var TRACE2 = 1;
var TRACE = 2;
var DEBUG = 3;
var NORM  = 4;
var INFO = 5;
var WARN = 6;
var ERROR = 7;
var FATAL = 8;
var LogLevel = NORM; 
//var LogLevel = TRACE3;
//var LogLevel = DEBUG;
exports.LogLevel = LogLevel;

exports.TRACE3 = TRACE3; // most detailed trace only used for intense debugging
exports.TRACE2 = TRACE2; // more detailed trace
exports.TRACE = TRACE;
exports.DEBUG = DEBUG;
exports.NORM = NORM;
exports.INFO = INFO;
exports.WARN = WARN;
exports.ERROR = ERROR;
exports.FATAL = FATAL;
 
// Intended to be used as a index
exports.STRACE3="TRACE3";
exports.STRACE2="TRACE2";
exports.STRACE = "TRACE";
exports.SDEBUG="DEBUG";
exports.SNORM="NORM";
exports.SINFO="INFO";
exports.SWARN="WARN";
exports.SERROR="ERROR";
exports.SFATAL ="FATAL";
var LogLevels = [exports.STRACE3, exports.STRACE2, exports.STRACE, exports.SDEBUG, exports.SNORM, exports.SINFO,exports.SWARN, exports.SERROR, exports.SFATAL];

function lookupLogLevel(logLevelStr) {
  var lls = logLevelStr.trim().toUpperCase();
  var logLevelNdx = LogLevels.indexOf(lls);
  exports.logl(NORM,"Logger L46: logLevelStr=" + logLevelStr + " lls=" + lls + " logLevelNdx=" + logLevelNdx);
  if (logLevelNdx === -1) {
    exports.logl(NORM, "Logger L48: Cound not find matching log level for " + lls);
    return exports.LogLevel;
  }
  else {
    return logLevelNdx;
  }
}
exports.lookupLogLevel = lookupLogLevel;


function ReadLogLevelFromEnviornment() {
  var tenv = process.env;
  if ("LOG_LEVEL" in tenv) {
    exports.logl(NORM, "Logger L61: Env variable LOG_LEVEL=" + tenv.LOG_LEVEL);
    var logLevPos = lookupLogLevel(tenv.LOG_LEVEL);
    if (logLevPos !== -1) {
      LogLevel = logLevPos;
      exports.logl(NORM,"Logger L65: ReadLogLevelFromEnviornment() Reset Log Level to " + LogLevel + " = " + LogLevels[LogLevel]);
    }
  }
  else {
    exports.logl(NORM, "Logger L69: ReadLogLevelFromEnviornment() Enviornment Variable LOG_LEVEL not set defaulting to " + LogLevel + " = " + LogLevels[LogLevel]);
  }
}

var LogLevelsCnt = LogLevels.length;
exports.LogLevels = LogLevels;

/* Check log level return true if current log level would allow this log otherwise return false*/
function cll(aLevel) {
  if (aLevel >= LogLevel) return true;
  else return false;
}
exports.cll = cll;

/* Since we allow the default process wide log level be changed at the 
request level we need to compute actual effective log level which defaults
to the process level if nothing was specified at the request level */
function getEffectLogLevel(lcfg) {  
  if (!(lcfg)) return LogLevel;
  if (lcfg.log_filter_level === undefined)  return LogLevel;
  return lcfg.log_filter_level;  
}

exports.LTrace3 = function (lcfg) {
  return (TRACE3 >= getEffectLogLevel(lcfg));
}

exports.LTrace2 = function (lcfg) {
  return (TRACE2 >= getEffectLogLevel(lcfg));
}

exports.LTrace = function (lcfg) {
  return (TRACE >= getEffectLogLevel(lcfg));
}

exports.LDebug = function (lcfg) {
  return (DEBUG >= getEffectLogLevel(lcfg));
}

exports.LNorm = function (lcfg) {
  return (NORM >= getEffectLogLevel(lcfg));
}

exports.LInfo = function (lcfg) {
  return (INFO >= getEffectLogLevel(lcfg));
}

exports.LWarn = function (lcfg) {
  return (WARN >= getEffectLogLevel(lcfg));
}

exports.LError = function (lcfg) {
  return (ERROR >= getEffectLogLevel(lcfg));
}

exports.LFatal = function (lcfg) {
  return (FATAL >= getEffectLogLevel(lcfg));
}

/* logl accepts a variable number of parameters to make logging complex things easier */
function logl() {
  var aLevel = arguments[0];
  var threasLevel = arguments[1];
  if (aLevel >= threasLevel) {
    // lookup log level string for output
    var levelStr = aLevel;
    if ((aLevel >= 0) && (aLevel < LogLevelsCnt)) {
      levelStr = LogLevels[aLevel];
    }

    var b = [];
    b.push(levelStr);
    b.push(process.pid);
    for (var i = 2; i < arguments.length; i++) {
      if (arguments[i]) {
        b.push(arguments[i].toString());
      }
    }
    console.log((new Date()).toISOString(), " -\t", b.join("\t"));
  }
}
exports.logl = logl


/* Added logcfg that will add a block of request specific attributes
right after the main header and before the main log msg.  logcfg can
take an arbitrary number of parameters but if you need JSON output caller
must use JSON.stringify as we only use the toString() method internally 
cfg is a object containing a arbitray number of key value pairs. */
var ASCIISTX = String.fromCharCode(02); // ASCII STX (Start of Text) 
var ASCIIGS = String.fromCharCode(29, 09);  // ASCII GS (Group Separator)
var ASCIISOH = String.fromCharCode(01); // ASCII SOH (Start Of Header)
var ASCIIRS = String.fromCharCode(30); // ASCII RS (Record Separator)
exports.ASCIISTX = ASCIISTX;
exports.ASCIIGS = ASCIIGS;
exports.ASCIISOH = ASCIISOH;
exports.ASCIIRS = ASCIIRS;

exports.logcfg = function () {
  var level = arguments[0];
  var cfg = arguments[1];
  var b = [];
  var threasLevel = LogLevel;
  var logPref = ASCIISTX;
  
  if (cfg !== undefined) {
    // if the log level for the request has been upgraded then
    // use it to override the current module level default
    if (cfg["log_filter_level"] !== undefined) {
      threasLevel = cfg["log_filter_level"];
      if (level < threasLevel) { return; } // skip adding anything to buffer 
    }
    if (cfg["_log_pref_cache"] === undefined) {
      cfgPref = [];
      // cached log prefix needs to be generated the first time for
      // each request context. but after that we can use the cached
      // verison 
      for (var akey in cfg) {
        if (akey !== "log_filter_level") {
          cfgPref.push("[" + akey + ":" + cfg[akey].toString() + "]");
        }
      }
      cfg._log_pref_cache = ASCIISOH + cfgPref.join("\t") + ASCIISTX;
    }
    logPref = cfg._log_pref_cache;
  }
      
  if (level >= threasLevel) {
    var logitems = [];
    /* copy the arbitrary number of parameters supplied to the call into the log buffer */
    for (var i = 2; i < arguments.length; i++) {
      var targ = arguments[i];
      if (typeof (targ) === "object") {
        logitems.push(JSON.stringify(targ));
      }
      else {
        logitems.push(targ.toString());
      }
    }
    var logstr = logPref + logitems.join(ASCIIGS); // separate each log element by \t.
    logl(level, threasLevel, logstr);
  }
}


exports.log = function (msg) {
  logl(exports.NORM, LogLevel, msg);
}

exports.trace3 = function (msg) {
  logl(TRACE3, LogLevel, msg);
}

exports.trace2 = function (msg) {
  logl(TRACE2, LogLevel, msg);
}

exports.trace = function (msg) {
  logl(TRACE,  LogLevel,  msg);
}

exports.debug = function (msg) {
  logl(DEBUG, LogLevel, msg);
}

exports.norm = function (msg) {
  logl(NORM, LogLevel, msg);
}

exports.info = function info(msg) {
  //console.log("info");
  logl(INFO, LogLevel, msg);
}

exports.warn = function (msg) {
  logl(WARN, LogLevel, msg);
}

exports.error = function (msg) {
  logl(ERROR, LogLevel, msg);
}

exports.fatal = function (msg) {
  logl(FATAL, LogLevel, msg);
}

// override our default log level
// with value from enviornment.
ReadLogLevelFromEnviornment();
