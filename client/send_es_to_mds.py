import Queue
#import Timer
import socket
#from util import *
import os.path
import os
import time
import sys
import glob
import httplib
import json

def elapRun(msg, begin1):
  curr = time.time()
  print "\n", msg, "elap1=%0.3f sec "  % (curr - begin1)


class MDSSend:
  def __init__(self, serverName, serverPort):    
    self.serverName = serverName
    self.serverPort = serverPort
    self.acumItems = []
    self.acumBytes = 0
  
  def esHTTP(self, verb, uri, postStr="", headers  = {}):
     begPos = time.time()
     r1  = ""     
     print "verb=", verb, " uri=", uri, "len(postStr)=", len(postStr) #, " postStr=", postStr
     try:
         conn = httplib.HTTPConnection(self.serverName, self.serverPort, timeout=30)
         if len(postStr) > 1:  
           conn.request(verb, uri, postStr, headers)
         else:
           conn.request(verb, uri)   
         r1 = conn.getresponse()
         data1 = ""
         print "resp.status=", r1.status
         if r1.status != 200:
            print "status code error from server = ", r1.status, r1.msg, r1.reason
         else:
           data1 = r1.read()
         #print "L140: data1=", data1
         conn.close()     
         elapRun(verb + " " + uri +  " sent=" + str(len(postStr)) + " returnBytes=" + str(len(data1)), begPos)             
         return data1
     except httplib.HTTPException,e:
        print "httpException", e  #//  " status=", r1.status, " msg=", r1.msg, " reason=", r1.reason
        time.sleep(15)
        return "-1"
         
     except socket.error,e:
       print "failed http fetch ", e
       time.sleep(15)
       return "-1"       
      
      
    
  # the es bulk load files have format
  # of "index metadata\nrecord" so we will read them
  # in pairs and get the object type and id
  # from the meta line and create a bulk insert line
  # for MDS. Accumulate those lines until we have
  # enough data and the post to MDS.
  def processFile(self, fiName):     
     headers = {"Content-type": "text/txt"}
     f = open(fiName)
     while True:
       l1 = f.readline()
       l2 = f.readline()
       if not l1:
         break
       if not l2:
         break
        
       o1 =  json.loads(l1)
       objType = o1["index"]["_type"]
       objId = o1["index"]["_id"]
       mdsStr = str(objId) + "/000/" + objType + "=" + l2       
       self.acumItems.append(mdsStr)
       self.acumBytes += len(mdsStr)
       if self.acumBytes >  2000000:
         self.flushAndSend()       
     f.close()
     

  def flushAndSend(self):
     if len(self.acumItems) > 0:
         headers = {"Content-type": "text/txt"}
         respStr = "-1"
         postStr = "\n".join(self.acumItems)
         tryCnt = 0 
         while respStr == "-1":             
           tryCnt += 1
           respStr = self.esHTTP("POST", "/add", postStr, headers)          
           print "respStr[:100]=", respStr[:100]
           if respStr.find("\"errors\":true") != -1:
              print "Error BulkUpdate ", respStr
           self.acumItems = []
           self.acumBytes = 0
           if respStr == "-1" and tryCnt > 15:
             print "giving up"
             break
           return ""


  def sendUpdatesFromDir(self, dirIn):    
     print "SendUpdatesFrom ", dirIn
     globPath =dirIn + "/*.json.txt"   
     fnames = glob.glob(globPath)
     print "found ", len(fnames), " files "
     fnames.sort()
     self.finishedParse = False
     for fname in fnames:
       self.processFile(fname)
     self.begSend = time.time()
     self.flushAndSend()
     elapRun("Finished All Send", self.begSend)

tObj = MDSSend("127.0.0.1", 9839)
#tObj.sendUpdatesFromDir("/ag/tmp/reports")
tObj.sendUpdatesFromDir("/cores/consult/el-bulk")
