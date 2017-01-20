var StrBuf = require('./StrBuf.js')

function curr_time()
{
    var tdate = new Date();
    return tdate.getTime();
}


/****************
*** C L A S S ***
*****************
Single Timer class normally used by
ElapsedTimer */
function SingleTimer(name_in, start_time) 
{
  this.aname = name_in;
  this.astart = start_time ;
  this.afirst = start_time;
  this.astop = 0;
  this.aelap = 0;

  
  function stop(tstop)
  {
 	 if (tstop == undefined)
	 { 
	   tstop = curr_time();
	 }
	 
     /* our timer is running */
	 if (this.astart > 0)
	 {
	   this.astop = tstop;
	   this.aelap = this.aelap + (this.astop - this.astart);	   
	 }
	 this.astart = -1;
  }
  
  
  
  /* starts labeld timer */
  function start(stime)
  {
    if (stime == undefined)
   {
      this.astart = curr_time();
	 }
	 else
	 {
	    this.astart = stime;
	  }
  }
  
    
  function to_buf_json(abuf,stime)
  {
     abuf.b("{"); 	  
	   abuf.add('name:"', escape(this.aname), '"');
	   abuf.b(",first:").b(this.afirst - stime);
	   abuf.b(',stop:').b(this.astop - stime);
     abuf.b(',elap:').b(this.aelap);
     abuf.b('}');	  
	   return abuf
  }	
  
  
  // - - - - - - - -
  // Assign instance methods
  // - - - - - - - -
  this.stop = stop;
  this.start = start;
  this.to_buf_json = to_buf_json;
  
  
} // end class
exports.SingleTimer = SingleTimer;

 
/****************
*** C L A S S ***
*****************
*  ac_timer is a hash containing unique entery for
*  each label.  A label can be started and stopped
*  multiple times.   Inclues utility to dump as
*  hash for easy reporting to server.
*/
// * * * * * * * * * * * * * *
function ElapsedTimer(sid, rid, pstart) 
// * * * * * * * * * * * * * *
{
   this.timers = {};
   this.myrid = rid;
   this.mysid = sid;
   this.myquery="..";
   this.myuri="..";
   if (pstart == undefined) 
   {
     pstart = curr_time();
   }
   this.astart = pstart;
   this.first  = pstart;
   
   if (this.aid == undefined)   
   {
     this.aid = 0;
   }
   
   function set_query(aquery)
   {
     this.my_query = aquery;
   }
   
   function set_uri(auri)
   {
     this.my_uri = auri;
   }
   
   
   // retrieve a timer at label if it does not
   // exist then make a new one. 
   function get(aname, ptime)
   {
     var tti = this.timers[aname];
     if (tti == undefined)
     {
       if (ptime == undefined)
       {
         ptime = curr_time();
       }
       
       tti =  new exports.SingleTimer(aname, ptime);
       this.timers[aname] = tti;
     }              
	 return tti
   }
   
   
  /* starts labeld timer */
  function start(alabel, tstart)
  {
      this.get(alabel,tstart).start(tstart);
  }
    
  function stop(tname, tstop)
  {
     this.get(tname).stop(tstop);
  }

  function stop_all()
  {
     for (var akey in this.timers)
     {
       this.timers[akey].stop();
     }
  }

  function to_buf_json(abuf)
  {
    abuf.b("[");
    for (var akey in this.timers)
	{
	  this.timers[akey].to_buf_json(abuf, this.astart);
	  abuf.b(",\n");
	}  	
	abuf[abuf.length-1] = ""; // clear our last delimiter
	abuf.b("]");
	return abuf;
  }


  /* Convert timers into a line delimited format.  
  **  first, stop, elap, label\n 
  **  Switched to this from the JSON format to make parsing with standard log tool easier. 
  */
  function to_buf_cdf(abuf)
  {    
     for (var akey in this.timers)
	  {       
       atimer = this.timers[akey];
       abuf.b(atimer.afirst - this.astart).b(",");
	     abuf.b(atimer.astop - this.astart).b(",");
       abuf.b(atimer.aelap).b(",");              
	     abuf.b(escape(atimer.aname));       
	     abuf.b("\n");
	  }  		      
	  return abuf;
  }

  function to_json()
  {
    var tb = new StrBuf.StrBuf();
    this.to_buf_json(tb) 
    return tb.to_str();
    //TODO: Remove the last , before
    // adding the final ,    	
  } 
  
  function to_str()
  {
    var tb = new StrBuf.StrBuf();
    this.to_buf_cdf(tb) 
    return tb.to_str();
    //TODO: Remove the last , before
    // adding the final ,
    	
  }  
  
  /* inserts our serialized representation 
  * into a div structure by ID name
  */  
  function to_div(div_name)
  {
    var tb = new StrBuf.StrBuf();
    tb.b("<pre>");
    tb.b("sid=").b(this.mysid).b("\n");
    tb.b("rid=").b(this.myrid).b("\n");
    tb.b("sid,rid,first,stop,elap,name\n");
    this.to_buf_cdf(tb);
    tb.b("</pre>");
    tb.to_div(div_name);  
  }  	
    
  function log(cons, astr)
  {
     if (astr != undefined)
     {
         cons.log(astr)
     }
     var astr = this.to_str();
     cons.log(astr);	 
  }

 /* parse the current document URI and query parms into 
 the instance variables this.myuri and this.myquery.  If the
 values for myuri and myquery are already set then it will
 skip setting them from the URI line.  This allows the page
 to send custom information */
 function parse_uri()
 {
    if (this.myuri == "..")
    {      
       var tt = window.location.href;
       var tarr = tt.split("?",2);
       this.myuri = tarr[0];
       if  ((tarr.length > 1) && (this.myquery == ".."))
       {
          this.myquery = tarr[1];      
       }
     } 
  }
 
 
  /* sends my accumulated timers
  * back to the server in the form
  * of a post to a URI.
  *  SID = session ID - session is shared for all requests a user makes during given session
  *  RID = request ID - Request is unique for each page requested but shared across all AJAX requests for a given page.
  */
  function report(auri)
  {
    this.parse_uri();
    var astr = this.to_str();
    var ahttp = new XMLHttpRequest();
    ahttp.open("POST", auri, true)
    ahttp.setRequestHeader("rid", this.myrid);
    ahttp.setRequestHeader("sid", this.mysid);
    ahttp.setRequestHeader("query", this.myquery);
    ahttp.setRequestHeader("uri", this.myuri);
    
    ahttp.setRequestHeader("content-type", "text/json");
    ahttp.setRequestHeader("content-length", astr.length);
    ahttp.send(astr);
    
    // don't care if we get a response so no callback.	    
  }

  //Set up method pointers
  this.get = get;
  this.start = start;
  this.stop = stop;
  this.stop_all = stop_all
  this.to_str = to_str;
  this.to_json = to_json;
  this.to_buf = to_buf_cdf;
  this.to_buf_cdf = to_buf_cdf;
  this.to_buf_json = to_buf_json;
  this.to_div = to_div;
  this.report = report; 
  this.parse_uri = parse_uri;
  

} // end class

exports.ElapsedTimer = ElapsedTimer;
