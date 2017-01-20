# mds  (Metadata Store)
High performance KV Metadaa store ideal for Web Scale data needed to fully hydrate search results.    [API DOC](doc/api-doc.md)

MDS is what I call a forward propagated data cache.   A common use it extract data as it changes in SQL or NOSQL master databases and push it through a Queue system to one or more MDS servers as JSON or XML snippets.   When this detail data is needed it can be retrieved fast with high availability while keeping the runtime load off more expensive master servers. 

MDS was originally designed to provide high speed data once you know what the keys are.  A common use case is to retrieve object ID from the search engine or database then retrieve the JSON snippets needed for those documents from MDS.   MSD scales far better than databases and is far less expensive than database engines.    It has also been used to retrieve detailed stock fundamental data and even for client side applications where it reduced the load on master RDBS enough to extend their lifes by years.     

MDS has been SOA latency optimized.  This essentially means that each HTTP request allows the client to retrieve upto 500 items by key at a time or to update as many as will fit in the max acceptable post size.  This prevents the downstream client from making many repeated calls which accumulates latency.  It also minimizes the temptation to make many requests in parralell which wastes machine resources on both machines and in the network. 

MDS Leverages Linux file cache to deliver near RAM performance for many Terrabyte data sets.  MDS is Horizontally scalable in a toaster style architecture to provide nearly unlimited read rates. 

### Performance Tests 

> During 2015 I tested this system utilizing all the available cores on a R8 virtual machine using the default local disk configuration and it stabilized at 45K requests per second with a 3K average body size body.  This worked because the requests were bypassing the network inside the same box.  The CPU Utilization never peaked above 80% even when running the clients locally.  
>
> We could only reach 22K per second when the test clients were ran on a external box because we saturated the network adapter.        Preliminary tests indicated that we could hit sustain over 60K requests per second on a physcial server with a 1 Gig network connection.
>
> At that time the client I using the MDS system was one of the largest consumer referral services in the USA.  A single MDS server running on a R8 virt could meet their entire load with 50% capacity to spare.  As a distributed architect I do not like single points of failure so I had them deploy 3 smaller virts so we could take one down for service and still be two failures away from an outage. 

Copyright (c) 2014 [Joseph Ellsworth, Bayes Analytic](http://BayesAnalytic.com/contact) - See use terms in License.txt

# Getting Started

## Starting the server ##

> **Read the section on install and configuration below**.  
>
> Change to the directory where you have placed the MDS source code.
>
> Run:
>
> ```shell
> node MDSServer.js 9839 ./config ./data  > log/mdsserver9839.log.txt
> ```
>
> The  bat files start_mds_server_9839.bat through _9848 are convienience utility to start many MDS servers.  This is enough listeners to fully occupy a 8 core box until the network is saturated. 

> #### Running Multiple Listeners####
>
> Node.js has a critical weakness in that a problem can easily crash the server.   The other main challenge is that you can not utilize all CPU cores available in a modern system using single network listener.    
>
> There are many ways to work around this and some libraries than claim to run multi-process but the most fool proof way I have found it to run # of cores -1 listeners as separate processes.  This maximizes isolation and risk between processes which is always desirable in high availability systems.   
>
> The MDS server is designed to allow many readers to run many listeners on the same data directory.    By running many readers we eliminate the risk of a problem in one crashing the others while we can easily tune the number of listeners to maximize request capacity for the available hardware.
>
> An example of this would be:
>
> > ```
> > node MDSServer.js 9839 ./config ./data  > log/mdsserver9839.log.txt
> > node MDSServer.js 9840 ./config ./data  > log/mdsserver9840log.txt
> > node MDSServer.js 9841 ./config ./data  > log/mdsserver9841.log.txt
> > node MDSServer.js 9842 ./config ./data  > log/mdsserver9842.log.txt    
> > ```
>
> It is considered best practice to publish a single URI such as http://CatalogCache.compname.org  and use haproxy to load balance requests between the node instances.   It is also possible ot use a similar configuration with many load balancers.  
>
> > > > My personal preference is to skip the extra server node add a small client library that routes requests between servers giving preference to the instances responding fastest.   
> > > >
> > > > This  routing technique is needed anyway because any single server will eventually be too small to serve very large web sites so you will need the ability to route requests between a fleet of servers anyway.   
>
> You actually need at least two physical or two isolated virtual servers each running MDS to allow a single server to be brought down for service without causing a site outage.  My preference as a distributed architect is a minimum fleet size of 3 so I am always 2 servers away from failure. 
>
> One last thing never expose these servers directly to the public internet.  They have been very stable and ran for months under high loads but the HTTP listener library has not been hardened for direct access from web clients.  If you need to expose the web traffic do it though two HAProxy nodes or something similar in your router. 
>
> ### Performance Notes###
>
> MDS primary limit is generally the IO capacity on the primary network card.   The faster this call the more data MDS can serve.  The second limit is generally the speed of the underlying file system under worst case miss storms.  These do not happen often but faster hard disks will help maximize total system performance at moderate costs. 
>
> MDS makes heavy use of the linux file cache so the Linux system should be configured to maximize the amount of RAM available for use in file cache.  This contra-indicates running MDS on the same server with other processes that consume a lot of RAM.   
>
> Never run MDS using SAN or remote storage arrays it will kill the performance. 

## Sample HTTP Rest commands ##

> >  See  (doc/api-doc.md)[doc/api-doc.md]  It will be easiest to read this from the Github web browser which renders formatted .md files. 

## Install & Configuration##

**Install Node.JS**

> > To Install Node For Linux See:   https://github.com/joyent/node/wiki/Installing-Node.js-via-package-manager

**Add nodejs executable to system PATH**

> Under windows this is normally set with PATH=Path="C:\Program Files (x86)\nodejs"   or add this the PATH envVar under System -> Enviornment Variables in the control panel. 
>
> Under linux this is  normally set in the .bashrc

**Add  .;./lib;../lib to PATH**  

> > This is needed because some of our libraries are in the .lib directory and node needs to know where to look for them. 
> >
> > On Windows this can be done with the command: 
> >
> > ​     set PATH=.;./lib;%PATH%

**Change Linux File Limits:**
   The design of the Node.js system uses async IO which may open hundreds
   of files waiting for callback. We need to have the user running MDS
   set to a soft limit of 100,000 files and hard limit of 200,000 files
   with a system wide max limit of 400,000 files. 
   http://www.cyberciti.biz/faq/linux-increase-the-maximum-number-of-open-files/

   vi /etc/sysctl.conf

​      fs.file-max = 100000

   vi /etc/security/limits.conf

​     httpd soft nofile 4096
​     httpd hard nofile 10240

















# Resources that may be Helpful

   List of Files Open by process - http://www.cyberciti.biz/tips/linux-procfs-file-descriptors.html
   Increase number of pseudo termals - http://www.cyberciti.biz/tips/howto-linux-increase-pty-session.html
   List open ports and who owns them - http://www.cyberciti.biz/tips/linux-display-open-ports-owner.html

   Diagnose file handle leaks in node - 

      http://www.blakerobertson.com/devlog/2014/1/11/how-to-determine-whats-causing-error-connect-emfile-nodejs.html
      http://stackoverflow.com/questions/8965606/node-and-error-emfile-too-many-open-files

   Scaling Node.js Applications 
      ngix and node proxy - http://cjihrig.com/blog/scaling-node-js-applications/
   Export this interface sesign patterns for Node.js modules
      http://bites.goodeggs.com/posts/export-this/ - important read.

   Simple Node HTTP Post client - 
     https://gist.github.com/isaacs/723163 
     http://ranm8.github.io/requestify/

   Headless scriptable test client for Node - http://phantomjs.org/

   Docker
     Docker Installation windows - http://docs.docker.com/installation/windows/
     Node JS Docker script - https://github.com/dockerfile/nodejs/commit/7fabdde0f6e50f2272103e7bef737622a8c2e4c3
     Official Docker Node.js - https://docs.docker.com/examples/nodejs_web_app/
       https://github.com/gasi/docker-node-hello


​     