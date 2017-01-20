# mds  (Metadata Store)
High performance KV Metadaa store ideal for Web Scale data needed to fully hydrate search results.   

Leverages Linux file cache to deliver near RAM performance for many Terrabyte data sets.

Horizontally scalable in a toaster style architecture to provide nearly unlimited read rates. 

Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt

# Getting Started

## Starting the server ##

> Read the section on install and configuration below.  
>
> Change to the directory where you have placed the MDS source code.
>
> Run:
>
>   node 
>
> ```shell
> MDSServer.js 9839 ./config ./data  > log/mdsserver9839.log.txt
> ```
>
> 

> #### Running Multiple Listeners####
>
> Node.js has one critical weakness in that a problem can easily crash the server.   The other main challenge is that you can not utilize all CPU cores available in a modern system using single network listener.    
>
> There are many ways to work around this and some libraries than claim to run multi-process but the most fool proof way I have found it to run # of cores -1 listeners.     
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
> It is considered best practice to publish a single URI such as http://CatalogCache  and use haproxy to load balance requests between the node instances.   It is also possible ot use a similar configuration with many load balancers.  
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