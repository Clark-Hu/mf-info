function RaqItem(section,url)
 {
  this.section = section;
  this.url = url;
 }

var raqs = new Array();
raqs[0] = new RaqItem("disk","//www.ibm.com/vrm/raq/104BL03W/77/disksystems");
raqs[1] = new RaqItem("tape","//www.ibm.com/vrm/raq/104BL03W/96/tapestorage");
raqs[2] = new RaqItem("media","//www.ibm.com/vrm/raq/104BL03W/98/tapemedia");
raqs[3] = new RaqItem("san","//www.ibm.com/vrm/raq/104BL03W/95/san");
raqs[4] = new RaqItem("nas","//www.ibm.com/vrm/raq/104BL03W/103/nas");
raqs[5] = new RaqItem("network","//www.ibm.com/vrm/raq/104BL03W/103/nas");
raqs[6] = new RaqItem("solutions","//www.ibm.com/vrm/raq/104BL03W/97/storagesolution");
raqs[7] = new RaqItem("software","//www.ibm.com/vrm/raq/104BL03W/97/storagesolution");
raqs[8] = new RaqItem("proven","//www.ibm.com/vrm/raq/104BL03W/97/storagesolution");
raqs[9] = new RaqItem("services","//www.ibm.com/vrm/raq/104BL03W/97/storagesolution");
raqs[10] = new RaqItem("virtualization","//www.ibm.com/vrm/raq/104BL03W/159/storagevirtualization");

var defRaq = "//www.ibm.com/vrm/raq/104BL03W/94/storageus";

var section = "";
var searchString = "/storage/";
var offset = 9;
var start = 0;
var end = 0;

function geturl()
 {
  section = document.location.href;
  start = section.indexOf(searchString) + offset;
  section = section.substring(start,section.length); 
  end = section.indexOf("/");
  section = section.substring(0,end);
 }

 function getIndex()
  {
   var n = -1;
   for (i = 0 ; i < raqs.length ; i++)
    {
	 if (section == raqs[i].section) { n = i; }
    }
   return n;	
  }

geturl();

var i = getIndex();
var tempString = "";
if (i >= 0) { tempString = raqs[i].url; }
else { tempString = defRaq; }
document.write("<a class=\"smallplainlink\" href=\"" + tempString + "\"><b>Request a quote</b></a>");
