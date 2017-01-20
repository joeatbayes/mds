// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
// test function to ensure external modules prototype adds for String are working.

var strUtil = require('./StrUtil.js');

var teststr = "11817018917x81788s7s7";
console.log("testStrIn=" + teststr);
var tseg0 = strUtil.makeSegString(teststr,3);
console.log("tseg0=" + tseg0);
if (tseg0 !== "118/170/189/17x/817/88s/7s7") {
   console.log("ERROR - strUtil.makeSegString() Did not produce expected Result");
}

// check cross module string prototype extension
var tsegs1 = strUtil.replaceAll(teststr, "s", "SSS");
if (tsegs1 !== "11817018917x81788SSS7SSS7") 
{
    console.log("ERROR - StrUtil.replaceAll() Did not produce expected Result");
}
console.log("tsegs1=" + tsegs1);


