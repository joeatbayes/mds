# Read a Elastic search bulk import directory and produce
# a file containing a list of ID's and record types read
# from this data.    This data will be used by another test
# client which randomly selects sets of 50 ID's to use for
# query purposes.

import Queue
#import Timer
import socket
#from util import *
import os.path
import time
import sys
import glob
import json

def elapRun(msg, begin1):
  curr = time.time()
  print "\n", msg, "elap1=%0.3f sec "  % (curr - begin1)


class MDSIDHarvest:
  def __init__(self):
    self.unique_id = {}
 
    
  # the es bulk load files have format
  # of "index metadata\nrecord" so we will read them
  # in pairs and get the object type and id
  # from the meta line and create a bulk insert line
  # for MDS. Accumulate those lines until we have
  # enough data and the post to MDS.
  def processFile(self, fiName):
     begFi = time.time()
     headers = {"Content-type": "text/txt"}
     f = open(fiName)
     while True:
       l1 = f.readline()
       l2 = f.readline()
       if not l1:
         break
       if not l2:
         break
        
       o1      =  json.loads(l1)
       objType = o1["index"]["_type"]
       objId   = o1["index"]["_id"]       
       mdsKey  = str(objId) + "/000/" + objType
       self.unique_id[mdsKey] = ""
     f.close()
     elapRun("read File" + fiName, begFi)
     
  def flushAndSave(self):
     
     if len(self.unique_id) > 0:
         begt = time.time()
         print "begin Save ", len(self.unique_id), " keys"
         allkey = self.unique_id.keys()
         elapRun("obtained keys", begt)
         begt = time.time()
         self.acumItems = {}
         keysstr = "\n".join(allkey)
         elapRun("made save Str", begt)
         begt = time.time()
         allkey = ""
         f = open("../tmp/mds_keys.txt", "w")
         f.write(keysstr)
         f.close()
         elapRun("finished save", begt)

  def produceKeySet(self, dirIn):    
     self.begRun = time.time()
     print "produceKeySet ", dirIn
     globPath =dirIn + "/*.json.txt"   
     fnames = glob.glob(globPath) #[:10]
     print "found ", len(fnames), " files "
     fnames.sort()     
     for fname in fnames:
       self.processFile(fname)
     elapRun("Finished Read", self.begRun)
     self.flushAndSave()
     elapRun("produceKeySet", self.begRun)

tObj = MDSIDHarvest()
#tObj.produceKeySet("/...../tmp/report")
tObj.produceKeySet("/....../el-bulk")

