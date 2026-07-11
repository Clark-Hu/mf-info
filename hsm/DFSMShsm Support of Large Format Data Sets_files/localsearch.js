function DoSearch(n){
//alert(n.toString());
var loc=document.forms[0].lsearch.checked;
if (n>0) var st=document.forms[n].query.value;
else {n=0; var st=document.forms[0].query.value}

//var fl=document.forms.length;
//alert(fl.toString());
//if (st=='') st=document.forms[1].q.value;
if (st=='') alert("Enter one or more keywords in the 'Search' box. For an exact phrase search, enclose keywords in double quotes.");
else {  if (loc || n>0)
	{
		var sepStr = "+AND+";
		if (st.toUpperCase().indexOf(' AND ')!=-1) sepStr = "+";
		if (st.toUpperCase().indexOf(' OR ')!=-1) sepStr = "+";
		if (st.toUpperCase().indexOf(' NOT ')!=-1) sepStr = "+";
		//if (st.toUpperCase().indexOf('"')!=-1) sepStr = "+";
		
		var target = "http://w3.itso.ibm.com/cgi-bin/searchsite.cgi?query="+queryFormat(st, ' ', sepStr)

		if (n>0) {
			fuzzy='';
			if (document.forms[n].SearchFuzzy.checked) fuzzy = '&SearchFuzzy=TRUE';
			target = target + '&SearchOrder=' + (document.forms[n].SearchOrder.options[document.forms[n].SearchOrder.selectedIndex].value) + fuzzy;
			}
		window.location.href = target
	}
	else
		window.location.href="http://w3.ibm.com/search/w3results.jsp?qt="+st
     }
}

function queryFormat(origStr, findText, replaceText) {
	var pos = 0	
	var len = findText.length
	
	pos = origStr.indexOf(findText)
	while (pos != -1) {
		var q = 0
		var newSep = replaceText
		preString = origStr.substring(0, pos)	
		
		// skip text in quotes
		for (var i = 0; i < preString.length+1; i++) {
		   if (preString.charAt(i)=='"') q++;
		}
		if (q/2 != Math.round(q/2)) newSep = '+'
		
		postString = origStr.substring(pos+1, origStr.length)
		origStr = preString + newSep + postString
		pos = origStr.indexOf(findText)
		
	}
	return origStr
}