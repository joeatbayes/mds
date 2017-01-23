#HTTP REST API

> ## Add data to MDS with HTTP Post
>> See [sample-post-update.py](sample-post-update.py) and [sample-post-update.bat](sample-post-update.bat) which uses curl.
> > ```
> > curl -X POST http://127.0.0.1:9839/add --data-binary @sample-post-update.txt
> >
> > Where Content of the POST STRING IS:
> > 12737/001/xjoe=I am a random test body for 12737/xjoe
> > 12738/001/xjoe=I am a random test body for 12738/xjoe
> > 12739/001/xjoe=I am a random test body for 12739/xjoe
> > 12740/001/xjoe=I am a random test body for 12740/xjoe
> > 12741/001/xjoe=I am a random test body for 12741/xjoe
> > 12742/001/xjoe=I am a random test body for 12742/xjoe
> > 12743/001/xjoe=I am a random test body for 12743/xjoe
> > 12744/001/xjoe=I am a random test body for 12744/xjoe
> >
> > The Key is everything up to the first '='' while the body is everything after that upto the first \n for the body.   Many objects can be updated in a single post.   Recomendation is to base64 encode body strings but any encoding the escapes \n will work.
> > ```

> TODO:  FIND WHERE I PUT THE documentation I wrote for this 





## Sample clients that show how to  

### Add Data to the queue###

> > ../client/sample-post-query.py
> >
> > ../client/sample-update.py

### Retrived data in the queue###

> > ../client/sample-get.bat
> >
> > ../client/sample-query.py

### Stress Test Reader###

> > The stress test to fully utilize all the core on the box requires that multiple mds listeners as is described in main [readme](../README.md)  Then on a separate box run one or more copies of each of these testers.  They will report the number of requests per second in the shell window where each one is running.      
> >
> > Once you have them all running you will take a screenshot showing the results form each of the testers assuming that you have each window shrunk down so they all fit.  Then you have to add the TPS numbers from all the clients together to get the net cumulative  TPS. 
> >
> > I admit this is a primitive approach but it works and it makes it easy to run the test clients on many different client boxes or to run all of them  on the main box. 
> >
> > ../client/random_key_perf_test.py
> >
> > ../client/random_key_test_9839.bat
> >
> > ../client/random_key_test_9840.bat
> >
> > ../client/random_key_test_9841.bat
> >
> > ../client/random_key_test_9842.bat
> >
> > ../client/random_key_test_9843.bat
> >
> > ../client/random_key_test_9844.bat
> >
> > ../client/random_key_test_9845.bat
> >
> > ../client/random_key_test_9846.bat
> >
> > ../client/random_key_test_9847.bat
> >
> > ../client/random_key_test_9848.bat
> >
> > NOTE:  In linux you will need to chmod the .bat files to allow execution privilege.
> >
> > 



    import urllib
    data = """12737/001/xjoe=I am a random test body for 12737/xjoe
    12738/001/xjoe=I am a random test body for 12738/xjoe
    12739/001/xjoe=I am a random test body for 12739/xjoe
    12740/001/xjoe=I am a random test body for 12740/xjoe
    12741/001/xjoe=I am a random test body for 12741/xjoe
    12742/001/xjoe=I am a random test body for 12742/xjoe
    12743/001/xjoe=I am a random test body for 12743/xjoe
    12744/001/xjoe=I am a random test body for 12744/xjoe"""
    resp  = urllib.urlopen("http://127.0.0.1:9839/add", data)
    print resp.read()