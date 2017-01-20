// MDSClient.fsx
#load "Util.fsx"
#load "HTTPUtil.fsx"
open Util
open System.Collections
open System.Collections.Generic
open System.Text

let RecDelim = "\t-\t-\t-\n";

// Call MDS for the set of ID and return an array of items
// that where retrived from MDS. 
// TODO:  Added caching in a latter version of this library
//   and will need caching for this application. 

let MDSFetch(uriPref : string, tids : string[]) =     
  let turi = uriPref + System.String.Join(",", tids)
  let aRes,errMsg = HTTPUtil.httpFetch(turi)
  //printfn "aRes=%A" aRes
  let dRes = new Dictionary<string,string>()
  if errMsg <> null then dRes, errMsg // return empty set if error
  else  
    let trows = aRes.Split([|RecDelim|], 10000, System.StringSplitOptions.RemoveEmptyEntries)
    for tline in trows do
       let tarr = aRes.Split([|'='|], 2)
       if tarr.Length = 2 then                
         dRes.Add(tarr.[0].Trim(), tarr.[1].Trim())
    dRes, null


//// Return localized string from local cache or 
//// load from MDS if not available locally.  If can not
//// find the localized code then just return the code
//let GetLocalizedString(fldName : string, language : string, itemCode : string) =
//  //printfn "FieldSpec=%s lang=%s  itemCode=%s" fieldSpec language itemCode
//  let lookupPrefix = GetLocalizedPrefix(fieldSpec)
//  if lookupPrefix = null then
//    itemCode // not a lookup field
//  else
//    let tKey =  lookupPrefix + itemCode + language
//    if LocalizedStrings.ContainsKey(tKey) then 
//      LocalizedStrings.[tKey].ToString() // fetch from cache
//    else
//      let tUri = URIPrefix + tKey
//      let fRes = FetchLocalizedString(tUri, itemCode)
//      LocalizedStrings.Add(tKey, fRes) // cache for next time
//      fRes
//
