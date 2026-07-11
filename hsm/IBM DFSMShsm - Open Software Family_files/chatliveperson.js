//<![CDATA[<!--

// rajendran@us.ibm.com 6/21/2005 1:42PM
// create contact module using 3 styles
//
// 1 - call me
var ctext = "<b>Chat now</b>";
	var skill = "LA-en-US-STG";
	var srcTC = "&SESSIONVAR!pgTacticCode='6N8AG57W'";
	var srcURL = "&SESSIONVAR!pgURL=" + escape(document.location);
	var srcTitle = "&SESSIONVAR!pgTitle=" + escape(document.title.replace(/\+/g,' '));
	var lpRandomNumber = new Date().getTime();
	document.writeln("<tr><td><img src=\"//www.ibm.com/i/v14/buttons/chat_rd.gif\" height=\"21\" alt=\"\" border=\"0\" /></a></td>");
	document.writeln("<td width=\"112\"><a class=\"smallplainlink\"  href=\"#\" target=\"chat3815120\"");
	document.writeln(" onclick=\"javascript:window.open('//sales.liveperson.net/hc/3815120/?cmd=file&file=visitorWantsToChat&site=3815120'+srcURL+srcTitle+srcTC+'&SESSIONVAR!skill='+skill+'&waitTime=0&referrer='+escape(document.location),'chat3815120','height=450,width=390,status=no,location=no,toolbar=no,directories=no,menubar=no,resizable=yes,scrollbars=auto');return false;\" >");
	document.writeln(ctext+"</a></td></tr>");

//-->]]>
