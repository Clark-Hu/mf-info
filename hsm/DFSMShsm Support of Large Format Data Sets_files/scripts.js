// popup window
function popup( url, type, height, width ) {
newWin=window.open(url,'popupWindow','height='+height+',width='+width+',resizable=yes,menubar=no,status=no,toolbar=no,scrollbars=yes'); 
newWin.focus(); 
void(0);
}

function toggle(c,r) {
	var c = document.getElementById(c);
	var r = document.getElementById(r);
	if(c.checked) {r.disabled=false;}
	else {r.checked=false;r.disabled=true;} 
}

