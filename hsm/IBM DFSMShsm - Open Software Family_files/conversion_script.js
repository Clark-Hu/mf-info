if (typeof(tagVars)=="undefined")
	tagVars = "";
	
if (typeof(lpUASorderTotal)!="undefined" && lpUASorderTotal!=""){
	tagVars = tagVars + '&PAGEVAR!OrderTotal=' + escape(lpUASorderTotal);
	tagVars = tagVars + '&PAGEVAR!' + lpUASunit + '_OrderTotal=' + escape(lpUASorderTotal);
	tagVars = tagVars + '&SESSIONVAR!Conversion=1';
}

//<Place Vars Here>

var INITIAL_MAX_SIZE = 300;
var MAX_TAGVARSURL_SIZE = 1600;
var INITIAL_STRING = document.location.toString() + document.title;
var STRING_MAX_SIZE = INITIAL_STRING.length + INITIAL_MAX_SIZE;

if ((typeof(tagVars) == "undefined") || (tagVars == null))
	tagVars = "";
while ((tagVars.length + STRING_MAX_SIZE > MAX_TAGVARSURL_SIZE) && (tagVars.length > 0)) {
	var idx = tagVars.lastIndexOf("&");
	if (idx > 0)
		tagVars = tagVars.substring(0, idx);
	else
		tagVars = "";
}