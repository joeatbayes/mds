curl --trace-time  http://127.0.0.1:9839/q/108282/8.2/sp
curl  "http://127.0.0.1:9839/q/?rt=sp&v=8.2&id=108283,108285,108286,108284,108282" --trace-time 
curl  "http://127.0.0.1:9839/q/?rt=sp,metric&v=8.2&id=108283,108285,108286,108284,108282" --trace-time 
curl  "http://127.0.0.1:9839/q/?rt=metric,review&v=8.2&id=108283,108285,108286,108284,108282" --trace-time 
  
