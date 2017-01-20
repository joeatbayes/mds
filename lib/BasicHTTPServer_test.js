// to run this teset module from the parent
// directory of this lib run  
// node lib\BasicHTTPServer_test.js

var HTTPServer = require('./BasicHTTPServer.js');
HTTPServer.loadMimeTypes("MimeTypes.txt");
HTTPServer.add_handler("joe", HTTPServer.GenericHTTPHandler);
HTTPServer.listen(9514, ".\\doc");



