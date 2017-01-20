# Read a list of known available keys. Use this to randomly
# select a number of items for each request and make a request
# against the mds server measuring a number of requests per second.
# and a number of items retrieved per second average.  Each request
# is computed by randomly selecting a set of ID to fill out the request
# to approximate worst case random behavior expected from end users.

import socket
import time
import sys
import random
import json
import httplib

def elapRun(msg, begin1):
  curr = time.time()
  print "\n", msg, "elap1=%0.3f sec "  % (curr - begin1)


class PerfTest:
  def __init__(self, serverName, serverPort, sourceFile):
    self.unique_id = {}
    self.serverName = serverName
    self.serverPort = serverPort
    self.itemsPerReq = 50    
    self.numReqPerMeasure = 100   
    self.numPass = 500
    f = open(sourceFile, "r")
    self.keys = f.readlines()
    self.maxKeyNdx = len(self.keys) - 1
    print "read ", len(self.keys), " from ", sourceFile
    f.close()
        

  def esHTTP(self, verb, uri, postStr="", headers  = {}):
     begPos = time.time()
     r1  = ""     
     #print "verb=", verb, " uri=", uri, "len(postStr)=", len(postStr) #, " postStr=", postStr
     try:
         conn = httplib.HTTPConnection(self.serverName, self.serverPort, timeout=5)
         if len(postStr) > 1:  
           conn.request(verb, uri, postStr, headers)
         else:
           conn.request(verb, uri)   
         r1 = conn.getresponse()
         data1 = ""
         #print "resp.status=", r1.status
         if r1.status != 200:
            print "status code error from server = ", r1.status, r1.msg, r1.reason
         else:
           data1 = r1.read()
         #print "L140: data1=", data1
         conn.close()     
         #elapRun(verb + " " + uri +  " sent=" + str(len(postStr)) + " returnBytes=" + str(len(data1)), begPos)             
         return data1     
     except httplib.HTTPException,e:
        print "httpException", e  #//  " status=", r1.status, " msg=", r1.msg, " reason=", r1.reason
        time.sleep(15)
        return "-1"
     except socket.error,e:
       print "failed http fetch ", e
       time.sleep(15)
       return "-1"
      
  def getRandomKeys(self):
    tout = []
    for ndx in range(1, self.itemsPerReq,1):
      keyndx =  random.randint(0, self.maxKeyNdx)      
      tout.append(self.keys[keyndx])
    return tout

  def makeRequest(self):
    keys = self.getRandomKeys()
    #print "keys=", keys
    postStr = "\n".join(keys)
    begFi = time.time()
    tres = self.esHTTP("POST", "/mds/", postStr, headers  = {})
    #print tres[:350]    
    return len(tres)

  def makeGroupOfRequest(self, passNum):
    begTime = time.time()
    totBytes = 0
    for rqnum in range(1, self.numReqPerMeasure,1):
      numByte = self.makeRequest()
      totBytes = totBytes + numByte
    tout = {}
    elap= time.time() - begTime
    totItems = self.numReqPerMeasure * self.itemsPerReq
    totMegBytes = totBytes / 1000000.0
    itemsPerSec = round(totItems / elap,1)
    reqPerSec   = round(self.numReqPerMeasure / elap,1)
    megBytesPerSec = totMegBytes / elap
    mbitsPerSec =  megBytesPerSec * 9    
    megBytesPerSec = round(megBytesPerSec, 2)
    mbitsPerSec  = round(mbitsPerSec, 2)
    totMegBytes = round(totMegBytes,2)
    elap = round(elap,2)
    xo = {}
    xo["pass"]        = passNum    
    xo["elapSec"]     = elap
    xo["itemsPerSec"] = itemsPerSec
    xo["reqPerSec"]   = reqPerSec
    xo["mBs"]         = megBytesPerSec
    xo["totMB"]       = totMegBytes
    xo["totItems"]    = totItems    
    xo["mbs"]         = mbitsPerSec
    return xo
  
    
  def RunTest(self):
    for xx in range(1, self.numPass):
      tres = self.makeGroupOfRequest(xx)
      tstr = json.dumps(tres)
      print tstr

port = 9839
if len(sys.argv) > 1:
  port = int(sys.argv[1])
print "using port ", port
tObj = PerfTest("127.0.0.1", port, "../tmp/mds_keys.txt")
tObj.RunTest()
