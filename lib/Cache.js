// Cache.js
// Basic in memory cache object which will 
// auto expire members from cache based on 
// a timeout.   It will use a timer to periodically
// wakes up and clean a little bit of cache from 
// memory 
// 
// ******************
// ***** This version does not attempt
// ***** LRU expiration.  It is basically
// ***** a hash table that can be loaded
// ***** either with contents of a files
// ***** or strings directly assigned.
// ******************
//
// Note:  This cache is intended to be used for things 
//   like file snipets that are used in the handlers 
//   and other resources that are used over and over
//   but where there could be enough to evenutally
//   put memory pressure on the box.     
//   Use memcache or Redis for normal items which can
//   tolerate a 5ms delay for retieval.  

// This function works from an assertion that individual hash
// lookups must be fast because so much of Javascript depends 
// on them.   It also works from a method that says that we
// can take a small amount of time all the time to do the
// cache expiration
// 
// eachObject is placed in cache with an array
//   [the item,  last_access,  access_cnt]
//
// for cleanup we basically walk through and
// take 100 items at each wakeup slice and 
// sort those items by oldest and delete the
// oldest 10.  We keep incrementing through the
// key space 500 items at a time until our max
// memory usage drops below the threashold.  

// See:  process.memoryUsage()
//  for total process memeory usage.
//  Note:  if we forced everything here to be simple
//  strings we could calcualte total size of cache
//  as we add to it.    Otherwise will need a single
//  global cache from which all users draw.

// TODO:  Need fast way to identify old keys 
//   and remove them from the set using a 
//   LRU basis.   A perfect way to do this
//   would be with a bisect algorithm on 
//   access but not sure if Javascript
//   arrays can be used this way.
function Cache()
{
  self = {}
  self.items = {}
  
  function put(key, item, lastMod)
  {
    var now = new Date().getTime();
    self.items[key] = [item, now,  lastMod];  
  }
  
  function get(key)
  {
    var item_arr = self.items[key];
    if (item_arr === undefined)
      return undefined;
      
    item_arr[1] = new Date().getTime();
    item_arr[2] = item_arr[2] + 1;  
    return item_arr[0];
  }
  
  
  function getFile(fileName)
  {
    var tvar = self.get(fileName);
  if (tvar == undefined)
  {
    if (fs.existsSync(fileName) == false)
      return undefined
    /* TODO:  Add code here to use stats to
     * retrieve last file modification time
     * if it has changed since the last mod
     * time stored when the cache was updated
     * then we reload */
    
      // Attempt to read file synchronously
    var fileString = fs.readFileSync(fiName, 'utf8');
    self.put(fileName, fileString);
      return fileString;
  }
  }

}
exports.Cache = Cache; // constructor
exports.GBLCache = Cache(); // shared global

