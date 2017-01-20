var http_get = require('./HTTPGet.js')

function callback(data, resp, elapsed)
{
   console.log('STATUS: ' + resp.statusCode);
   console.log('HEADERS: ' + JSON.stringify(resp.headers));  
   //  Note all the headers are still in string form
   //  so if representing a number must be parsed 
   console.log('content-length=' + resp.headers['content-length']);
   console.log('length = ' + resp.length);   
   console.log("callback  data=" + data);
   console.log("callback  elapsed=" + elapsed);   
}

function err_callback(ex, resp)
{
  console.log('problem with request: ' + e.message);
}


var uri = 'http://apiint64.corbis.com/Search/V3/CorbisImage/US/en-US/Search?IsAnonymous=True&EnableOutlineForAll=True&Permissions=HasPermissionSearchRM%2cHasPermissionSearchRF%2cHasPermissionSearchRS&Sort=score&PageLength=25&PageNumber=1&EnableSlotting=true&SearchText=family&ActivityId=aac2cd58-c1ba-4708-a97fcd146402080e&SessionId=223f47bd-2a3b-4122-ae7d-82344a1d5d6d';



http_get.http_get(uri, callback, err_callback);




