var INI = require('./INIFile.js');

var tIni = new INI.INIFile("INIFile_test.data.txt");
var toutStr = tIni.toJSON();

console.log("JSON of INI.groups() read");
console.log(toutStr);


toutStr = JSON.stringify(tIni);
console.log("JSON of INI read");
console.log(toutStr);


toutStr = tIni.toINIStr();
console.log("\n As INI Str\n");
console.log(toutStr);


tIni.save("INIfile_test.data.out.txt");
