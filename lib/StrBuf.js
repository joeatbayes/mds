// Copyright (c) 2014 <Joseph Ellsworth, Bayes Analytic> - See use terms in License.txt
/* StrBuf.js -  javascript string buffer  */

/* StrBuf for fast string building 
* general trade of is StrBuff is 
* a better choice than 2 or more
* document.write and 6 or more 
* string concatonation using +.
* all adds can transparantly handle numbers
*
*  Instance menthods
*    abuf.b - adds a single string
*    abuf.push - adds a single string
*    abuf.add  - Add one or more strings 
*    abuf.log  - add one or more strings
*
*  overloaded names such as add and log
*  used to make clear to make contextual
*  use more clear. 
*/
function StrBuf()  // CONSTRUCTOR 
{
  var arr = [];
// ------------------------
//  String buffer management
// -------------------------
  /* clean out our and set up for re-use */
  function clear()
  {
    this.length = 0;  
  }

  // single string add function
  function push_s(aStr)
  {    
    this.push(aStr); 
    return this
  } 
  
  // multi parameter buffer add
  // separated from push_s because
  // slightly slower.  so keep the b.b function
  // which is single parm only
  function add()
  {
    for (var i = 0; i < arguments.length; ++i)
    {
      var aparm = arguments[i];
      if (aparm != undefined)
      {
        this.push(aparm)
      }
    }
	return this
  }

  /* convert our array into a single
  * string that can be inserted into 
  * a string.   adelim is optional, if
  * supplied it will placed between
  * all array elements otherwise no
  * space will be inserted. 
  */
  function to_str(adelim)
  {
    this.push("");
    if (adelim == undefined)
    {
      return this.join("");
    }
    else
    {
      return this.join(adelim);
    }
  }
 
  function addQuoted(str)
  {
    this.push('"' + str + '"');
	return this;
  }
  
  function addSingleQuoted(str)
  {
    this.push("'" + str + "'");
	return this;
  }
  
  function addAttr(attribName, strVal)
  {
     if (strVal != undefined)
     {
        this.push(" " + attribName + "=");
	this.addQuoted(strVal);	
     }
     return this;
  }

  // Start a defenition such as "<img className="xtra" " leaving
  // the closing > off so other attributes such as onClick 
  // can be added 
  function addStartEle(eleName,className, id)
  {
    this.push("<" + eleName);	
    this.addAttr("class", className); 
    this.addAttr("id", id);	   
    return this;
  }
  
  function addGT()
  {
    this.push(">");
	return this;
  }
  
  
  function addEle(eleName, uriTag, uriVal, className, styleName)
  {
     this.push("<" + eleName);	
     this.addAttr("class", className); 
     this.addAttr("style", styleName);
      if (uriTag != undefined) 	  
	  this.addAttr(uriTag, uriVal);	  
      this.push(">");  
      return this;
  }
  
  
  
  function closeEle(eleName)
  {
    this.push("</" + eleName + ">");
	return this;
  }


  // A more open way to add elements that need 
  // more customization without resorting to 
  // all the extra and error prone quotes.
  // pass in the tag name and a hash containing
  // the attribute name as keys and attribute
  // value as values.  
  function addStruct(tag, attrib)
  {
    this.addStartEle(tag);
	  for (aKey in attrib)
	  {
	    this.addAttr(aKey, attrib[aKey]);
	  }
	  this.addGT();
	  return this;
  }
 
  function addAttribs(tag, struct)
  {
	  for (aKey in attrib)
	  {
	    this.addAttr(aKey, attrib[aKey]);
	  }
	  this.addGT();
	  return this;
  }
  
  
  function addImg(uri, alt)
  {
    this.addStartEle("img");
    this.addAttr("src", uri);	  
    this.addAttr("alt", alt);
    this.gt();
    return this;
  }
  
  function addHref(uri, className, styleName)
  {
    this.addEle("a", "href", uri, className, styleName);
	return this;
  }

  function addDiv(id, className)
  {
      this.addStartEle("div",className)
      this.addAttr("id", id);
      this.addGT();
      return this;
  }

  function addSpan(id, className)
  {
      this.addStartEle("span",className)
      this.addAttr("id", id);
      this.addGT();
      return this;
  }
  
  // adds link to external style sheed to the HTML buffer
  // <link rel="stylesheet" type="text/css" href="/stdtheme.css" />
  function addStyleSheet(uri)
  {
    var attrib = {'rel' : 'stylesheet', 'type' : 'text/css', 'href' : uri};
    this.addStruct('link', attrib);
    return this;
  }
   
  // adds link to external style sheed to the HTML buffer
  // <script type="text/javascript" src="external_javascript.js"></script>
  function addJavascript(uri)
  {  
     attrib = {'type' : 'text/javascript', 'src' : uri, 'href' : uri}
     this.addStruct('script', attrib);
     this.closeEle('script');
     return this;
  }
  
  // Read the content of a file from the 
  // file system and include it in the buffer.
  // just as if dynamically generated.  The
  // path of the file is relative to the 
  // executing directory.
  function incudeExternalFile(filePath)
  {
      //fs.readFile(filePath, function (err, tstr) 
	  //{
	  //}	 
    return this;
  } 
  
  function NL()
  {
    this.push("\n");
	  return this;
  }
  
  function BR() 
  {
    this.push("<br/>");
    return this;
  }
  
  function addMenuItem(text, url, onClick, className, id)
  {
    this.addEle("li", className, id);
    if (url != undefined)
    {
      this.ahref(url).onClick(onClick).class(className).gt();
      this.add(text);
      this.closeEle('a');
    }
    this.closeEle("li");    
    return this;
  }
  
  function sele(str)
  {
    this.add('<' + str);
    return this;
  }
  arr.sele = sele;
  
  // The html elements
  // add sppot for the followin semantic
  //  Img.uri('joe').alt('jim').src('jack').gt();
  function img(str)
  {
    this.sele('img');
    this.src(str);
    return this;
  }
  arr.img = img;
  
  function ahref(str)
  {
    this.sele('a');
    return this.addAttr('href', str);
  }
  arr.ahref = ahref;
  
  // attributes of the html elements
  
  function alt(val)
  {
     return this.addAttr('alt',val);
  }
  arr.alt = alt;
  
  function src(val)
  {
     return this.addAttr('src',val);
  }
  arr.src = src;
  
  function id(val)
  {
     return this.addAttr('id',val);
  }
  arr.id = id;
  
  function aclass(val)
  {
     return this.addAttr('class',val);
  }
  arr.class = aclass;
  
  function link(val)
  {
     return this.addAttr('link',val);
  }
  arr.link = link;
  
  function type(val)
  {
     return this.addAttr('type',val);
  }
  arr.type = type;
  
  function onClick(val)
  {
     return this.addAttr('onClick',val);
  }
  arr.onClick = onClick;
    
  function hover(type)
  {
     return this.addAttr('hover',val);
  }
  arr.hover = hover;
  
  
  
  
  
  
  
  
  
  
  // Adding actual method pointers to underlying 
  // array to present a buffer interface.   Did
  // this way because it allows a core object to
  // be re-used without violating rule for changing
  // the underlying template.  
  arr.b = push_s;
  arr.log = add;
  arr.add = add;
  arr.to_str = to_str;
  arr.toStr  = to_str;
  arr.clear = clear;  
  arr.addEle = addEle;
  arr.addStartEle = addStartEle;
  arr.closeEle = closeEle;
  arr.addImg = addImg;
  arr.addQuoted = addQuoted;
  arr.addSingleQuoted = addSingleQuoted;
  arr.addAttr = addAttr;
  arr.addAttribute = addAttr;
  arr.addAttribs = addAttribs;
  arr.addImg = addImg;
  arr.addHref = addHref;
  arr.addStruct = addStruct;
  arr.NL = NL;
  arr.nl = NL;
  arr.br = BR;
  arr.BR = BR;
  arr.addNewLine = NL;
  arr.newLine = NL;
  arr.addStyleSheet = addStyleSheet;
  arr.addDiv = addDiv;
  arr.addSpan = addSpan;
  arr.addJavascript = addJavascript;
  arr.addGT = addGT;
  arr.gt = addGT;
  arr.addMenuItem = addMenuItem;
  
  return arr;
}

exports.StrBuf = StrBuf;