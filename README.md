# mds  (Metadata Store)
High performance KV Metadaa store ideal for Web Scale systems that are struggling to meet performance and data freshness demands at a reasonable cost.   [API DOC](doc/api-doc.md)

# BROKEN PLEASE DO NOT ATTEMPT TO USE THIS YET.  
## CONTACT ME IF YOU WANT TO TRY IT AND I WILL PUT PRIORITY ON LOCATING A CORRECT VERSION
** When I was working on the API document I found that this vesion of the code is horribly broke.   I know I had a good version when working on it previously.   I should have added it to github then but wated a couple years and a couple 
of laptops.  Well live and learn.  If somebody wants to try this version then please let me know and I will make it a priority to either fix this version or locate the good version. **


---------------

MDS is what I call a forward propagated data cache.   A common use is to extract data as it changes in SQL or NOSQL master databases and push it through a Queue system to one or more MDS servers as JSON, XML or TXT snippets.   When this detail data is needed it can be retrieved fast with high availability while keeping the runtime load off more expensive master servers. 

MDS was originally designed to provide high speed data once you know what the keys are.  A common use case is to retrieve object ID from the search engine or database then retrieve the JSON snippets needed for those documents from MDS.   MSD scales better than databases and it is less expensive to add more nodes.   With horizontal scalability it becomes relatively easy to meet very large scale demands.   MDS has also been used to retrieve detailed stock fundamental data and even for client side applications where it reduced the load on master RDBS enough to extend the server life by years.     

##### We sell consulting services [contact](http://BayesAnalytic.com/contact)

> #### Why not a traditional cache strategy:

> > The main reason is that cache with return to origin on miss in a SOA architecture suffers from accumulated latency and services still have to be scaled to meet read storms demands which is expensive.
> >
> > One of the larger companies I worked at had a web page that ended up making over 300 SOA calls to services.  These services made their own SOA calls so the call chain ended was  7 layers deep.   
> >
> > In a big company each SOA service has to live within a budget so they end up using  a local cache to reduce load on their database master servers.     The Web page calls service-A which caches for 4 minutes.  Service-A calls service-B which caches for 8 minutes.   Service-B  calls service-C  which caches for 6 minutes. 
> >
> > Each of these data freshness commitments were scrupulously negotiated with the service consumers but they still added up to 4 + 8 + 6 = 18 minutes of data staleness.  It also incurred significant redundant costs since each of these services has to be scaled to meet load from miss storms.   
> >
> > When pieces of data  changed in service-C they can be packaged as a JSON, XML or txt object.   The serialization can be done by database trigger or more often by the service writing into the database.  The packaged data snippets are pushed into a Queue and can be delivered to the entire fleet of MDS servers in under 200ms using Kafka or typically under 10ms when using [FastQueueFS](https://github.com/joeatbayes/fastQueueFS).
> >
> > We are looking at forward propagation sub 200ms compared to layered SOA cache of 18 18 minutes stale data.  The 200ms version makes it easier to meet business demands that require fresh data.    
> >
> > There are a few cases such as Availability to Ship that absolutely must be checked against the master database but with web commerce you could have multiple people looking at the same items ready to purchase.  It isn't until they press the order button that it becomes critical and must be reserved in the master.    If you don't have that item available to sell you probably don't want to show it as available on prior screens.   Having a version of  availability to ship that is gauranteed to be no more than 200ms old is much better than a 18 minute old version because it allows services other than the actual order placement to access the cached data without any load on the availability to ship service.   Without the forward propagated cache, every time the items is displayed in a search or web page it may produce multiple hits against a mission critical service.    Scaling transitionally safe databases used for mission critical services to meet high read loads when what you really need it to meet is the worst case order submission rate is wasteful.  
> >
> > When service consumers know a given piece of data might be 18 minutes they object and start demanding the availability to ship service to be massively and expensively over scaled.  This kind of over scaling when replicated across many services is tremendously expensive so even leading ecommerce companies result to caching.  If they make the easy but wrong choice and put a traditional caches in-front of individual services it makes the data freshness problem worse and total cost per page rises.
> >
> > This assumes the traffic load is heavily read weighted.   When it is more heavily write oriented we have to do a little more planning because we can end up in scenarios where the network can not carry the traffic from the Queue to MDS fast enough to maintain the latency promises.     In very large data environments we also have to shard or partition the data across multiple MDS servers.  

MDS has been SOA latency optimized.  This essentially means that each HTTP request allows the client to retrieve upto 500 items by key at a time or to update as many as will fit in the max acceptable post size.  This prevents the downstream client from making many repeated calls which accumulates latency.  It also minimizes the temptation to make many requests in parralell which wastes machine resources on both machines and in the network. 

MDS Leverages Linux file cache to deliver near RAM performance for many Terrabyte data sets.  MDS is Horizontally scalable in a toaster style architecture to provide nearly unlimited read rates. 

### Performance Tests 

> During 2015 I tested this system utilizing all the available cores on a R8 virtual machine using the default local disk configuration and it stabilized at 45K requests per second with a 3K average body size body.  This worked because the requests were bypassing the network inside the same box.  The CPU Utilization never peaked above 80% even when running the clients locally.  
>
> We could only reach 22K per second when the test clients ran on external boxes because we saturated the server network adapter.        Preliminary tests indicated that we could hit sustain over 60K requests per second on a physcial server with a 10 Gig network connection.
>
> At that time the client I using the MDS system was one of the largest consumer referral services in the USA.  A single MDS server running on a R8 virt could meet their entire load with 50% capacity to spare.  As a distributed architect I do not like single points of failure so I had them deploy 3 smaller virts so we could take one down for service and still be two failures away from an outage. 
>
> One of the difficult aspect of scaling a MDS fleet is that we rapidly exceed the data capacity of powerful load balancers.  This is one reason I tend to prefer building client side dispatch into the services calling MDS so the traffic can bypass the load balancer bottleneck.   Modern network routers and switches have more options to manage traffic with large data volumes. In very large data environments we may still have to partition the MDS servers into different network segments so heavy traffic doesn't have to cross the segment boundary.  Otherwise we risk overwhelming the network choke points and they are expensive to upgrade.  Luckily this is relatively easy with the queue feed system.    

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
> It is considered best practice to publish a single URI such as http://CatalogCache.compname.org  and use haproxy or nginx to balance requests between the node instances.   It is also possible to accomplish the same  many load balancers.  
>
> > > > My personal preference is to skip the extra server node add a small client library that routes requests between servers giving preference to the instances responding fastest.   
> > > >
> > > > This  routing technique is needed anyway because any single server will eventually be too small to serve very large web sites so you will need the ability to route requests between a fleet of servers anyway.   
>
> You need at least two physical or two isolated virtual servers each running MDS to allow a single server to be brought down for service without causing a site outage.  My preference as a distributed architect is a minimum fleet size of 3 so I am always 2 servers away from failure. 
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

**Change Linux File Limits:**
   The design of the Node.js system uses async IO which may open hundreds
   of files waiting for callback. We need to have the user running MDS
   set to a soft limit of 100,000 files and hard limit of 200,000 files
   with a system wide max limit of 400,000 files. 
   http://www.cyberciti.biz/faq/linux-increase-the-maximum-number-of-open-files/

> > > > ```
> > > >   vi /etc/sysctl.conf
> > > >
> > > >       fs.file-max = 100000
> > > >
> > > >    vi /etc/security/limits.conf
> > > >
> > > >      httpd soft nofile 4096
> > > >
> > > >      httpd hard nofile 10240
> > > >
> > > > ```

 

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

## Some of my Other Projects



> - **[Quantized Classifier](https://bitbucket.org/joexdobs/ml-classifier-gesture-recognition)** A Machine Learning classifier using novel techniques that delivers precision at 100% recall comparable to with Deep Learning CNN for many classification tasks while running many times faster.  If is written in GO  and available on a MIT license. 
> - [**Solve Water Scarcity Using DEM**](http://AirSolarWater.com/dem)  A Novel way of using micro reservoirs to reduce the impact of water scarcity. Ideal for adoption on poor countries especially in the very poor rural agricultural regions.   It is based on the premis of building very small micro capture dams using stones and dam.   The DEM (Digital Elevation Model) work models water flow so we can show people where to build these small reservoirs so each reservoir will refill with 1,000's of gallons of water everytime there is more than 0.3 inches of runoff.  Water soaks in to nurture food producing trees while also refilling local aquifer.
> - **[Bayesanlytic.com Articles About Machine Learning](http://bayesanalytic.com/main/technical-engineering/machine-learning/)**  - Many articles including conceptual approach to building KNN engines.     A description of our  predictive Analytic engine using AI techniques with high volume, high speed and big data capability.  Designed to predict stock price moves using technical data.  
>
>
> - [The **Air Solar Water product line A2WH**](http://airsolarwater.com/)  is a fully renewable extraction of water from air.  Provides systems which extract liquid potable water from air using solar energy.   This technology  can deliver water cost effectively in the most hostile locations and can scale from 1 gallon per day up through millions of gallons per day. A2WH patented technology provides world leading ability to extract water from air using only renewable energy. 
> - [**FastQueueFS**](https://github.com/joeatbayes/fastQueueFS) Fast Queue with many reader capacity using HTTP Protocol and REST API. Similar to Kafka but faster and with more flexible topics and queue configuration. Written in FSharp automatically handles multiple topics. Very high performance, Low Latency with N-Tier data propagation
> - [**CNCUtil**](https://bitbucket.org/joexdobs/cncutil)  Ruby Code to Generate optimized GCODE using high level scripting commands.
>
>
> - [**Correct Energy Solutions**](http://correctenergysolutions.com/) -  provides  unique energy solutions designed solve real world energy and conservation problems.  This includes [micro-wind turbines](http://correctenergysolutions.com/wind) suitable for near ground installation,  renewable cooling and air to water technologies.  
> - [**CSVTablesInBrowser**](https://github.com/joeatbayes/CSVTablesInBrowser)  Render CSV files on the server in nice tables fetched using AJAX. Very easy to use with repeated headers, value override via callbacks.
>
>
> -  My personal site [**JoeEllsworth.com**](http://joeellsworth.com/) which contains my [resume](http://joeellsworth.com/resume/2013-v04-joe-bio-dir-cto-architect.pdf)



