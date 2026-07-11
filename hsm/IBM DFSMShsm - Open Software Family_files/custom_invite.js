
//max number of times to create custom invite before aborting
var LP_CUSTOM_INVITE_MAX_LOOPS = 5;

function lpCreateCustomInvitation() 
{

    var lpCustomInnerInvitationHtml = "";
    var lpForceInviteCreate = false;
    
    //Wait for the Monitor tag to create the original "mylayer" DIV (that's where the standard invitation is created)
    if (!document.getElementById("mylayer")) 
     {
     
        //Loop no more than LP_CUSTOM_INVITE_MAX_LOOPS times, to avoid endless loop in case
        //the DIV is not found
        if(LP_CUSTOM_INVITE_MAX_LOOPS > 0)
        {
            LP_CUSTOM_INVITE_MAX_LOOPS--;
            setTimeout('lpCreateCustomInvitation()', 1000);
            return;
        }
        else
        {
            //Max loops has passed, so mark we need to create the invitation
            lpForceInviteCreate = true;
        }
    }
    
    //set the invitation content into the lpCustomInnerInvitationHtml variable(WITHOUT THE WRAPPING DIV)
    lpCustomInnerInvitationHtml = '';
    lpCustomInnerInvitationHtml += '<!--MASTHEAD_BEGIN -->';
    lpCustomInnerInvitationHtml += '<table border="0" cellpadding="0" cellspacing="0" id="v14-pop-mast" width="100%">';
    lpCustomInnerInvitationHtml += '<tr><td class="bbg"><img alt="IBM&reg;" border="0" height="30" src="http://www.ibm.com/i/v14/t/ibm-logo-small.gif" width="55"/></td><td align="right" class="bbg"><h1>Chat with an IBM representative</h1></td></tr>';
    lpCustomInnerInvitationHtml += '<tr><td class="lgray" colspan="2"><img alt="" height="2" src="http://www.ibm.com/i/c.gif" width="1"/></td></tr></table>';
    lpCustomInnerInvitationHtml += '<!--MASTHEAD_END -->';
    
    lpCustomInnerInvitationHtml += '<!--CONTENT_BEGIN -->';
  lpCustomInnerInvitationHtml += '<img src="//www.ibm.com/systems/storage/resource/chat_deployment_global/lp/storage.gif" alt="" width="350" height="100" border="0"/>';
    lpCustomInnerInvitationHtml += '<table width="350" border="0" cellspacing="0" cellpadding="0" id="v14-body-table">';
    lpCustomInnerInvitationHtml += '<tr><td width="10"><img alt="" height="1" src="http://www.ibm.com/i/c.gif" width="10"/></td><td><img alt="" height="6" src="http://www.ibm.com/i/c.gif" width="1"/><br />';
    
    lpCustomInnerInvitationHtml += '<!-- POPUP_TEXT_BEGIN -->';    
    lpCustomInnerInvitationHtml += '<p>We&#8217;re here to help. Click "Chat now" for a live text <br />chat with an IBM System Storage representative.</p>';
    lpCustomInnerInvitationHtml += '<table width="350" border="0" cellspacing="0" cellpadding="0"><tr valign="middle"><td colspan="4"><img alt="" height="20" src="http://www.ibm.com/i/c.gif" width="10"/></td> </tr>';
    lpCustomInnerInvitationHtml += '<td><img src="//www.ibm.com/i/v14/buttons/chat_rd.gif" border="0" width="21" height="21" alt="" align="middle" /></td>';
    lpCustomInnerInvitationHtml += '<td><a class="fbox" name="needRef" id="needRef" href="#" onclick="return hcAcceptCall();"><b>Chat now</b></a></td>';
    lpCustomInnerInvitationHtml += '<td width="10"><img alt="" height="1" src="http://www.ibm.com/i/c.gif" width="10"/></td>';
    lpCustomInnerInvitationHtml += '<td><img src="//www.ibm.com/i/v14/buttons/cancel_rd.gif" border="0" width="21" height="21" alt="" align="middle" /></td>'
    lpCustomInnerInvitationHtml += '<td><a class="fbox" href="#" onclick="return hcRejectCall();"><b>No, thanks</b></a></td></tr></table>';
    lpCustomInnerInvitationHtml += '<br /> <br /><p class="small">Chat service provided by IBM in conjunction with&nbsp;<br />LIVEperson.</p>';
    lpCustomInnerInvitationHtml += '<!-- POPUP_TEXT_END -->';
    
    lpCustomInnerInvitationHtml += '<img alt="" height="13" src="http://www.ibm.com/i/c.gif" width="1"/></td>';
    lpCustomInnerInvitationHtml += '</tr></table>';
    
    lpCustomInnerInvitationHtml += '<!--FOOTER_BEGIN-->';
    lpCustomInnerInvitationHtml += '<br /><table  summary="" border="0" cellpadding="0" cellspacing="0" width="100%"> <tr class="bbg"> <td height="19"> &nbsp; </td>';
    lpCustomInnerInvitationHtml += '<td align="right"><a href="" class="mainlink" onClick="return hcRejectCall();">Close [x]</a><span class="spacer">&nbsp;&nbsp;</span></td></tr></table>';

    //if need to create the DIV
    if(lpForceInviteCreate)
    {
        //call a method of the Monitor tag to create the div with our own content
        lpCreateGenericDiv('mylayer', 350, 170, 90, lpInnerInvitationHtml, null, null, false);
    }
    else
    {
         //replace current invitation content with custom one
         document.getElementById("mylayer").innerHTML = lpCustomInnerInvitationHtml;
    }
    
    //mark the invitation has loaded
     hcFloatIconLoaded();
    
    //If needed, modify any styling details of the invitation DIV now (e.g, change width and height)
    document.getElementById("mylayer").style.width = "350px";
	document.getElementById("mylayer").style.overflow = "hidden";
    document.getElementById("mylayer").style.backgroundColor = "#fff";
    document.getElementById("mylayer").style.border = "solid 1px #000";
    //document.getElementById("mylayer").top = "90px";
    //document.getElementById("mylayer").left = "170px";
    
}

//call method to create custom invite
lpCreateCustomInvitation();

function openChat(param, openVars, isAuto)
{
    if (typeof(isAuto) == "undefined")
        isAuto = false;

	visitorStatus = "CHAT_STATUS";
	var s = document.location;
	if (param != null)
		s = "(" + param + ") " + s;
	s = escape(s);

    var oparms = "";
    if (openVars != null)
        oparms = oparms + "&" + openVars;

    var url;
    var name;
    if (lpVoiceEngageFlag)
    {
        url = hcBase + '?cmd=file&file=visitorWantsToCallback' + oparms + '&site='+lpNumber+'&d=' + hcDate()+'&referrer='+s;
        name = 'call'+lpNumber;
    } else
    {
        url = hcBase + '?cmd=file&file=visitorWantsToChat' + oparms + '&site='+lpNumber+'&channel=web'+'&d=' + hcDate()+'&referrer='+s;
        name = 'chat'+lpNumber;
    }

    var params = 'top=90,left=170,width=365,height=470,menubar=no,scrollbars=0';
    if (lpVoiceEngageFlag && (typeof(lpOpenVoice) == "function")) {
        lpOpenVoice(url, name, params);
    } else
    if ((! lpVoiceEngageFlag) && (typeof(lpOpenChat) == "function")) {
        lpOpenChat(url, name, params);
    } else {
        var ow = window.open(url, name, params);
        if ((ow == null) && isAuto)
            openEngageChat("engage", null);
    }
}

