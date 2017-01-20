/* The purpose of update queue is to record the 
* set of changes which have occured and save each
* item to disk one at a time until all the saves
* have been completed.  Since some updates can be
* required for the same item at different points
* in time then a single item may have already
* been saved before it is processed in the queue.
* in this condition another save is wasted and
* just consumes IO bandwidth.
*
* The fundemental assertion of this particular 
* queue is that we have a single spindle for 
* a single queue and the as such we will gain
* nothing by multi-threading the saves while
* increasing the risk that we have wierd overrite
* contention. 
* 
* Items added to this queue must present a interfae
* that supplies .lastSaved as a numeric timestamp
* .save() as a method.  Save must call the function
* passed in when the save is complete
*/


function UpdateQueue()
{
   var self = [];   
   // Add a item to the queue for service
   // and record the time when inserted
   // so we can know if we can skip this
   // item.  Set up a timer every 1000ms
   // to fire off and service the queue.
   function add(aItem) 
   {
      var tEle = [aItem, new Date().getTime()];
      self.push(tEle);  
   }
   self.add = add;
   
   
   function service()
   {
     if (self.length <= 0) // nothing to service
     {
       self.setTimeout(self.service, 300);
       return
     }
  
     var tEle = this.pop();
     var tItem = tEle[0];
     var timeWhenQueued = tEle[1];     
     if (timeWhenQueued <= tItem.lastSaved)
     {
       setTimeout(self.service, 1); // item already saved after the
       // item was added to the queue so just return
       return; // and callback fast for next time to service
     }
     
     tItem.save(function saveDone(err, item) {
       if (err != undefined)
       {
         console.log("Save Failed " + err);
         self.push(item); // add the item to the end of queue for reservice.
       }
       setTimeout(self.service,1);
     });          
   }   
   self.service = service;
   
   
   function ItemServiceComplete(aItem)
   {
     self.activeSaves = self.activeSaves - 1;
   }
   self.ItemServiceComplete = ItemServiceComplete;   
   self.timer = setTimeout(self.service,300);   
   return self;
}
