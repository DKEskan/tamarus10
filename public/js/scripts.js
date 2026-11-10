const DisplayId = 0x00;
const GetStatusCommand = 0x03;
const GetBuildInfo = 0x19;
const GetIpCommand = 0x07;
const SetIpCommand = 0x08;
const socket = new WebSocket('ws://127.0.0.1:8080');
const progress = document.querySelector('.progress-done');
let reloadWebpageFlag = 0;  //flag to reload browser page if comms crash

let narrowSweepAlertVisible = false;
let narrowSweepAckPending = false;

//DECLARATION
// COMMAND NAME BEGIN
const getVerb = 'GET';
const configGetCommand = 'user/config';
const passwordGetCommand = 'user/passwordVerify';
const configCommand = 'config';
const passwordVerifyCommand = 'passwordVerify';
const opFillGetCommand = 'user/opFill';
const opFillCommand = 'opFill';
const destroyPutCommand = 'user/destroyConfirm';
const destroyCommand = 'destroyConfirm';
const currentOpFillGetCommand = "user/currentOpFill";
const currentOpFillCommand = "currentOpFill";

// COMMAND NAME BEGIN

var cycleMessage = 0;
  function refreshData(){
    setTimeout(refreshData,5000);
  }
  setTimeout(refreshData, 5000);

  function reloadWebpage(){
    if(reloadWebpageFlag === 1)
    {
      $(hdn_currentScreen).val(0);
      location.reload(); //re-load webpage to re-initialise communication
    }
  }
 
  socket.addEventListener('open', function(event) {
    //console.log('connected to WS Server!');
    getConfig();
  })
  socket.addEventListener('error', function(event) {
    console.log('socket error message ' + event);
  })
socket.addEventListener('message', function(event) {
    reloadWebpageFlag = 0;
    if(event.data === null)
    {
        return;
    }
    if((event.data).length < 3)
    {
      //getCurrentScreenNavBar(event.data);
      
      if(!handleAlarmNavigation(event.data))
      {
          getCurrentScreenNavBar(event.data);
      }
    }
    else
    {
      var object = JSON.parse(event.data);
      //console.log(object);
      receivedSocketMessage(object);
    }
    //document.getElementById("responseData").innerHTML = "Button Pressed: " + event.data;     
  })

  let globalModulationEnabled = false;
  let modulationEnabledByPath = Array(7).fill(false);

  function showModulationButton() {
      const button = document.getElementById("c_btn_10");
      button.textContent = globalModulationEnabled ? "☑ Mod" : "☐ Mod";
      button.setAttribute("aria-checked", String(globalModulationEnabled));
  }

  function toggleAllModulation() {
      globalModulationEnabled = !globalModulationEnabled;
      modulationEnabledByPath.fill(globalModulationEnabled);
      showModulationButton();
      setConfigMenuParameterChangeCss(1); // mark settings as changed
  }

  function getConfig()
  {
    let message = {};

    message = {
      "type" : "",
      "command" : "",
      "body":{}
    };

    // message.type = "GET";
    // message.command = "user/config";
    // message.body = {};

    message.type = getVerb;
    message.command = configGetCommand;
    message.body = {};

    //returns userConfig.json

    sendMessage(message);
  }
  function getOpFill(op)
  {
    let message = {};

    message = {
      "type" : "",
      "command" : "",
      "body":{}
    };

    //message.type = "GET";
    //message.command = "user/opFill";
    //message.body = {"op":op}; //1 to 7

    message.type = getVerb;
    message.command = opFillGetCommand;
    message.body = {"op":op}; //1 to 7

    //returns opFill.json of specific opFill and states current setting

    sendMessage(message);
  }
  function putUploadOpFill(op)
  {
    let message = {};

    message = {
      "type" : "",
      "command" : "",
      "body":{}
    };

    message.type = "PUT";
    message.command = "user/uploadOpFill";
    message.body = {"op":op}; //1 to 7

     //returns http code accepted if successful

    sendMessage(message);
    //debugger;
  }
  function getPassword(){
    try{
      message = {
      "type" : "",
      "command" : "",
      "body":{}
      };
      message.type = "GET";
      message.command = passwordGetCommand;
      message.body = {}; 
      sendMessage(message);
    }
    catch(err){
    console.log(err);
    }
  }
  function getCurrentOpfill(){
    try{
      message = {
      "type" : "",
      "command" : "",
      "body":{}
      };
      message.type = "GET";
      message.command = currentOpFillGetCommand;
      message.body = {}; 
      sendMessage(message);
    }
    catch(err){
    console.log(err);
    }
  }
  function putDestroyConfirm(){
    try{
      message = {
      "type" : "",
      "command" : "",
      "body":{}
      };
      message.type = "PUT";
      message.command =  destroyPutCommand;
      message.body = {}; 
      sendMessage(message);
    }
    catch(err){
    console.log(err);
    }
  }
  function putPasswordVerify(password)
  {
    let message = {};

    message = {
      "type" : "",
      "command" : "",
      "body":{}
    };

    message.type = "PUT";
    message.command = "user/passwordVerify";
    message.body = {"password":password}; //string

    //returns http code accepted is correct or unauthorised if incorrect

    sendMessage(message);
  }
  function putNewPassword(password)
  {
    let message = {};

    message = {
      "type" : "",
      "command" : "",
      "body":{}
    };

    message.type = "PUT";
    message.command = "user/newPassword";
    message.body = {"password":password}; //string

    //returns http code accepted is correct or unauthorised if incorrect

    sendMessage(message);
  }
  function putSaveOpFill(op)
  {
    let message = {};

    message = {
      "type" : "",
      "command" : "",
      "body":{}
    };

    message.type = "PUT";
    message.command = "user/saveOpFill";
    message.body = op;
    //console.log(message);
    sendMessage(message);
  }
  const sendMessage = (message) => {
    if(socket.readyState === socket.OPEN)
    {
      socket.send(JSON.stringify(message));
    }
    else
    {
      if(reloadWebpageFlag !== 1)
      {
        reloadWebpageFlag = 1;
        setTimeout(reloadWebpage, 5000);
      }
    }
  }
/* ElementNameDeclaration */
/* SCREEN NAME */
var initScreen = '#initScreen';
var mainScreen = '#mainScreen';
var configScreen = '#configScreen';
var covertScreen = '#covertScreen';
var batteryScreen = '#batteryScreen';



/* BUTTON ELEMENT NAME */
var mainButtonElementName = '#m_btn_';
let opFillButtonElementName = '#m_btn_op_';
var opFillSelElementName = '#opFillSelection';
var configButtonElementName = '#c_btn_';
var configTitleElementName = '#c_title_';
var configSignalButtonElementName = '#c_s_btn_';
var configPowerButtonElementName = '#c_p_btn_';
var m_t_password_span = '#m_t_password_span';


/* SPAN ELEMENT NAME */
var m_span_temp = '#m_span_temp_';
var m_span_power = '#m_span_power_';
var m_span_pwr = '#m_span_pwr_';
var m_span_btr = '#m_span_btr';
var b_span_btr = '#b_span_btr';
var b_span_battery = '#b_span_btr_';
var m_span_title = '#s_title_';
/* I ELEMENT NAME */
var m_i_signal = '#m_i_signal_';
var m_i_battery = '#m_i_battery_';
var d_i_battery = '#d_i_battery_';
var m_i_icon_signal = '#m_i_icon_signal_';
var s_i_pwr = '#s_i_pwr_';
var b_i_battery = '#b_i_battery_';

var m_tick = '#m_tick_';
var m_span_tick = 'm_span_';
var m_range = '#m_range_';
var c_range = '#c_range_';

var m_span_progress = 'm_span_progress_';   
var m_progress = '#m_progress_'; 
var hdn_m_progress = '#hdn_m_progress_';
var m_s_error = '#m_s_error'; 
var s_s_error = '#s_s_error'; 
let s_s_error_type_text = '#s_s_error_type_text'; 
let m_s_error_type = '#m_s_error_type';
var m_s_password = '#m_s_password'; 
var m_t_password = '#m_t_password_'; 
var m_t_frequency = '#m_t_frequency_'; 
var m_t_frequency_nav = '#m_t_frequency_nav_'; 
let m_s_deviceInfo = '#m_s_deviceInfo'; 

var m_s_confirm = '#m_s_confirm'; 
var m_c_confirm = '#m_c_confirm_';
var m_s_covert = '#m_s_covert';  
var m_t_covert_span = '#m_t_covert_span'; 
var m_s_frequency = '#m_s_frequency'; 
var m_s_frequency_title = '#m_s_frequency_title'; 
var m_s_opFill = '#m_s_opFill'; 

/* DIV ELEMENT NAME */
var m_div_1 = '#m_div_1';
var responseData = '#responseData';
let configOpFillCurrent = '#configOpFillCurrent';
/* HIDDEN BUTTON ELEMENT NAME */

var hdn_m_div_1 = '#hdn_m_div_1';
var hdn_covertScreen = '#hdn_covertScreen';
var hdn_batteryScreen = '#hdn_batteryScreen';

var hdn_currentScreen = '#hdn_currentScreen';
var hdn_currentButton = '#hdn_currentButton';
var hdn_currentConfigButton = '#hdn_currentConfigButton';
var hdn_currentButtonHighlighted = '#hdn_currentButtonHighlighted';
var hdn_currentConfigButtonHighlighted = '#hdn_currentConfigButtonHighlighted';
var hdn_currentConfigMenu = '#hdn_currentConfigMenu';
var hdn_currentConfigMenuNavButton = '#hdn_currentConfigMenuNavButton';
var hdn_currentFrequencyRange = '#hdn_currentFrequencyRange';
var hdn_currentFrequencyRangePos = '#hdn_currentFrequencyRangePos';
var hdn_currentFrequencyRangeSteps = '#hdn_currentFrequencyRangeSteps';
var hdn_password_menu = '#hdn_password_menu';
let hdn_device_info_menu = '#hdn_device_info_menu';
var hdn_frequency_menu = '#hdn_frequency_menu';
var hdn_frequency_row_pos = '#hdn_frequency_row_pos';
var hdn_password = '#hdn_password';
var hdn_password_pos = '#hdn_password_pos';
var hdn_set_new_password = '#hdn_set_new_password';
var hdn_confirm = '#hdn_confirm';
var hdn_confirm_menu = '#hdn_confirm_menu';
var hdn_confirm_pos = '#hdn_confirm_pos';
var hdn_tx_unit = '#hdn_tx_unit';
var hdn_covert_menu = '#hdn_covert_menu';
let hdn_opFill_menu = '#hdn_opFill_menu';
let hdn_opFill_pos = '#hdn_opFill_pos';

/* cssClassNameDeclaration */
var btn = '.btn';
var btnsecondary = 'btn-secondary';
var btnfocus = 'btn-focus';
var btnhighlight = 'btn-highlight';
var btnalerthighlight = 'btn-alerthighlight';
var btnprimary = 'btn-primary';
var btndark = 'btn-dark';
var btnlight = 'btn-light';

var borderwarning = 'border-warning';
var borderwhite = 'border-white';
var borderyellow = 'border-yellow';
var borderblack = 'border-black';
var bordergreen = 'border-green';

var titlefont24 = 'title-font-24';
var titlefont18 = 'title-font-18';
var bggreen = 'bg-green';
var bggrey = 'bg-grey';
var bgblue = 'bg-blue';
var bgsecondary = 'bg-secondary';

var batteryEmpty = 'bi-battery';
var batteryHalf  = 'bi-battery-half';
var batteryFull  = 'bi-battery-full';

var batteryIconSize2 = 'battery-icon-size2';
var batteryIconGreen  = 'battery-icon-green';
var batteryIconAmber  = 'battery-icon-amber';
var batteryIconRed  = 'battery-icon-red';

let batteryScreenNotCharging = 'battery-not-charging';
let batteryScreenCharging = 'battery-charging';
let batteryScreenWarning = 'battery-warning';
let batteryScreenEmpty = 'battery-empty';
let batteryScreenNotPresent = 'battery-not-present';
let batteryScreenFull = 'battery-full';

let batteryEskan ='battery-eskan';
let batteryEskanWarn ='battery-eskan-warn';
let batteryEskanError ='battery-eskan-error';

let batteryLevel ="battery-level";
let batteryLevelWarn ="battery-level-warn";
let batteryLevelError ="battery-level-error";


const BatteryNotPresent = 0;
const BatteryPresentNotCharging = 1;
const BatteryPresentCharging = 2;
const PresentButFlatAndNotCharging = 3;

var cfg = '.cfg';
var title = '.title';
var titleWhite = 'title-white';
var titleGreen = 'title-green';
var titleYellow = 'title-yellow';
var hzLine = '.hz-line';
var range = '.range';
var iconSignal = 'iconsignalstrength';
var iconSignalStrength = 'signal-';
var progressBar = 'progress-bar';
var progressBarGreen = 'progress-bar-green';
var textfocus = 'text-focus';
var textnonfocus = 'text-nonfocus';
var onefocus = 'one-focus';
var onenonfocus = 'one-nonfocus';
var onehighlight = 'one-highlight';
var warningmessage = 'warning-message';
let warningmessagealarm ='warning-message-alarm'
let errormessagealarm ='error-message-alarm'

/* Initial Value */
var initScreenVal = 1;
var mainScreenVal = 2;
var configScreenVal = 3;
var covertScreenVal = 4;
var batteryScreenVal = 5;
// var frequencyScreenVal = 7;
// let opFillScreenVal = 8;

/* Home Screen Nav Button */
var mainScreenMinButtonPosition = 0;
var mainScreenMaxButtonPosition = 11;
var IsHighlighted = 0;
var splitter = '@@';
var bandSplitter = '-';

var configMenuButton = 1;
var configSignalButton = 2;
var configPowerButton = 3;

var navLeftArrow = 4;
var navRightArrow = 6;
var navUpArrow = 8;
var navDownArrow = 2;
var navEnterKey = 5;

var rangeStep1 = 220; //128;
var rangeStep2 = 100; //96;
var rangeStep3 = 100; //126;
var rangeStep4 = 100; //162;
var rangeStep5 = 100; //98;

var mainScreenPasswordText = 'Enter Password';
var configScreenPasswordText = 'Change Password';
var batteryCharge = '--charge: ';
let frequencyValue = '';
let mhz = 'MHz';

let enterInputFrequencyScreenFlag = 0;  //flag for entering start / stop frequency cell
let emptySubbandsFrequencyNav = 0;  //keeps count of number of frequency subbands displayed

let highlightedValue = 1;
let nonHighlightedValue = 0;
let configMenuNumberButton = 4;
let configScreenMinButtonPosition = 8;
let configScreenMaxButtonPosition = 11;
let configScreenMinButton = 1;
let configScreenMaxButton = 25;

let keyRadioFrequencyPath = 'RadioFrequencyPath';
let keyId = 'Id';
let keyName = 'Name';
let keyradioFrequency = 'radioFrequency';
let keyfrequencyRange = 'FrequencyRange';
let upper = 'Upper';
let lower = 'Lower';

const minFrequencies = [];
const maxFrequencies = [];

const bandSpanWidth = [];

let WarningAlertBlockTimer = 0;

let passwordNavConfirm = 0; //toggle between new password input and confirm
let passwordNavConfirmPos = 0;

let configJsonArr = []; //location to store received JSON config 
let radioFrequencyId = 255; //track band frequency input tables for clearing if new table. 0 == band 1, 1 == band 2 etc
let sweepSettingEditRow = 0; // 0: navigation, 8: step digits, 9: ramp digits
let radioFreqObj =  //array with index for each band, inside each is an object of the subbands set in the frequency table
[
  {
    "band": 1,
    "subbands": [
      {
        "Id": 1,
        "Lower": 20000,
        "Upper": 40000
      }
    ]
  },
  {
    "band": 2,
    "subbands": []
  },
  {
    "band": 3,
    "subbands": []
  },
  {
    "band": 4,
    "subbands": []
  },
  {
    "band": 5,
    "subbands": []
  },
  {
    "band": 6,
    "subbands": []
  },
  {
    "band": 7,
    "subbands": []
  }
];

function navButton()
{
    try{
       getCurrentScreenNavBar(document.getElementById("myInput").value);
    }catch(err)
	{
		console.log(err);
	}
}

/* CONFIRM SETTINGS SCREEN BEGIN */
/* CONFIRM SETTINGS SCREEN NAV BAR BEGIN */
function confirmScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        confirmScreenNavArrowKeyup();
        break;
      case "2":
        confirmScreenNavArrowKeyDown();
        break;
      case "4":
        confirmScreenNavArrowKeyleft();
        break;
      case "6":
        confirmScreenArrowKeyRight();
        break;
			case "5":
        confirmScreenArrowKeyEnter();
        break;
      case "U":
        getConfig(); 
        break;	     
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}
function confirmScreenNavArrowKeyup()
{
  try{
    confirmSettingsNavigation(navUpArrow);
  }catch(err)
	{
		console.log(err);
	}
}
function confirmScreenNavArrowKeyDown()
{
  try{
    confirmSettingsNavigation(navDownArrow);
  }catch(err)
	{
		console.log(err);
	}
}
function confirmScreenNavArrowKeyleft(){
  try{
    confirmSettingsNavigation(navLeftArrow);
  }catch(err)
	{
		console.log(err);
	}
}
function confirmScreenArrowKeyRight(){
  try{
    confirmSettingsNavigation(navRightArrow);
  }catch(err)
	{
		console.log(err);
	}
}
function confirmScreenArrowKeyEnter()
{
  try{
    let pos = $(hdn_confirm_pos).val();
    onConfirmEnterScreen(pos);
  }catch(err)
	{
		console.log(err);
	}
}
function confirmSettingsNavigation(arrowKey){
  try{
    let pos = $(hdn_confirm_pos).val();
    if(arrowKey == navRightArrow){
        pos = parseInt($(hdn_confirm_pos).val()) + 1;
        $(hdn_confirm_pos).val(pos);
      }
      else if(arrowKey == navLeftArrow){
        pos = parseInt($(hdn_confirm_pos).val()) - 1;
        $(hdn_confirm_pos).val(pos);
      }
      if(pos > 2){
        pos = 1;
        $(hdn_confirm_pos).val(1);
      }
      if(pos <= 0 ){
        pos = 2;
        $(hdn_confirm_pos).val(2);
      }
      confirmSettingsNonHighlight();
      confirmSettingsHighlight(pos);
  }catch(err)
	{
		console.log(err);
	}
}
function confirmSettingsNonHighlight(){
  try{
    for (let i = 1; i <= 2; i++) {
      const buttonel = document.querySelector(m_c_confirm + i); 
      if(buttonel.classList.contains(btnfocus)){
        buttonel.classList.remove(btnfocus); 
      }
     }
  }catch(err)
	{
		console.log(err);
	}
}
function confirmSettingsHighlight(pos){
  try{
    const buttonel = document.querySelector(m_c_confirm + pos); 
  if(pos >= 1 || pos <= 2){
    buttonel.classList.add(btnfocus); 
  }
  }catch(err)
	{
		console.log(err);
	}
}
function onConfirmEnterScreen(buttonPos){
  try{
    switch (parseInt(buttonPos)){
      case 1:
        onDestroyConfirm();
        break;
      case 2:
        DisplayConfirm();
       // onLoadHomePage();
        break;
    }
  }catch(err)
	{
		console.log(err);
	}
}
/* Confirm SETTINGS SCREEN NAV END */

/* OpFill Selection Screen BEGIN*/
function OpFillScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        opFillNavigation(navUpArrow);
        break;
      case "2":
        opFillNavigation(navDownArrow);
        break;
      case "4":
        opFillNavigation(navLeftArrow);
        break;
      case "6":
        opFillNavigation(navRightArrow);
        break;
      case "5":
        onEnterOpFillScreen();
        break;
      case "U":
        getConfig();   
        break;	     
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}

function opFillNavigation(arrowKey)
{
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    const MAX_TABLE_ROWS = 7;

    let pos = parseInt($(hdn_opFill_pos).val());  
    let prevPos = pos;
    
    switch(arrowKey)
    {
      case navRightArrow:
        break;
      case navLeftArrow:
        break;
      case navDownArrow:
        (pos < MAX_TABLE_ROWS) ? pos++ : pos = MAX_TABLE_ROWS; //limit bot
        $(hdn_opFill_pos).val(pos);
        break;
      case navUpArrow:
        (pos > 1) ? pos-- : pos = 1; //limit top
        $(hdn_opFill_pos).val(pos);
        break;
    }
    highlightOpFillScreen(pos, prevPos);
  }catch(err)
	{
		console.log(err);
	}
}

function highlightOpFillScreen(pos, prevPos)
{
  try{
    if(pos !== prevPos) //if previous element is highlighted, remove highlight
    {
      let prevElementName = opFillButtonElementName + prevPos; 
      document.querySelector(prevElementName).classList.remove(btnfocus);
    }

    //add highlight to new button
    let elementName = opFillButtonElementName + pos; 
    const element = document.querySelector(elementName);
    element.classList.add(btnfocus); 
  }catch(err)
  {
    console.log(err);
  }
}
// function onEnterOpFillScreen(){
//   try{
//     let pos = parseInt($(hdn_opFill_pos).val()); 
//     putUploadOpFill(pos); 
//     getOpFill(pos);  
//     document.getElementById("opFillSelection").innerHTML = "Op.Fill " + pos;  
//     DisplayOpFill();
//   }catch(err)
// 	{
// 		console.log(err);
// 	}
// }

function onEnterOpFillScreen() {
  try {
    const pos = Number($(hdn_opFill_pos).val());
    putUploadOpFill(pos);
  } catch (err) {
    console.log(err);
  }
}


/* OpFill Selection Screen END */
/* Frequency SCREEN BEGIN */
/* Frequency SCREEN NAV BAR BEGIN */
function frequencyScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        frequencyNavigation(navUpArrow);
        break;
      case "2":
        frequencyNavigation(navDownArrow);
        break;
      case "4":
        frequencyNavigation(navLeftArrow);
        break;
      case "6":
        frequencyNavigation(navRightArrow);
        break;
			case "5":
        frequencyNavArrowKeyEnter();
        break;
      case "U":
        getConfig(); 
        break;	   
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}

// function frequencyNavigation(arrowKey){
//   try{
//     if(document.getElementById("m_s_error").style.display !== 'none')
//     {
//       return; //block navigation when alarm present
//     }
//     let rowPos = parseInt($(hdn_frequency_row_pos).val());
//     let colPos = parseInt($(hdn_frequency_col_pos).val());
    
//     let prevRowPos = rowPos;
//     let prevColPos = colPos;

//     if(enterInputFrequencyScreenFlag == 1)  //changing values of frequencies
//     {
//       navigateValueInputsFrequencyScreen(arrowKey, rowPos, colPos);
//     }
//     else  //moving upper level of frequency screen
//     {
//       navigateTablesFrequencyScreen(arrowKey, rowPos, colPos, prevRowPos, prevColPos);
      
//     }
//   }catch(err)
// 	{
// 		console.log(err);
// 	}
// }

function frequencyNavigation(arrowKey)
{
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }
    let rowPos = parseInt($(hdn_frequency_row_pos).val());
    let colPos = parseInt($(hdn_frequency_col_pos).val());
    
    let prevRowPos = rowPos;
    let prevColPos = colPos;

    if (sweepSettingEditRow !== 0) {
      navigateSweepSettingDigits(arrowKey);
    } else if (enterInputFrequencyScreenFlag === 1) {
      navigateValueInputsFrequencyScreen(arrowKey, rowPos, colPos);
    } else {
      navigateTablesFrequencyScreen(
        arrowKey, rowPos, colPos, prevRowPos, prevColPos
      );
    }

  }
  catch(err)
  {
    console.log(err);
  }
}


function navigateValueInputsFrequencyScreen(arrowKey, rowPos, colPos)
{
  try{
    const MAX_DIGITS = 6;

    let pos = parseInt($(hdn_frequency_pos).val());
    let currBandNav = $(hdn_currentConfigButtonHighlighted).val(); //information for main menu highlight
    let currBandNavDecoded = currBandNav.split(splitter); //split information of position
    let currBandPos = parseInt(currBandNavDecoded[0]); //index of current main screen band, i.e. band 1 = 20-240MHz, index 1
  
    m_t_frequency = `#m_t_frequency_${$(hdn_frequency_row_pos).val()}_`;
    switch(arrowKey)
    {
      case navLeftArrow:
        (pos > 1) ? pos-- : pos = 1; //limit left
        $(hdn_frequency_pos).val(pos);
        textfrequencyHighlight(pos); //change cursor position
        break; 
      case navRightArrow:
        (pos < MAX_DIGITS) ? pos++ : pos = MAX_DIGITS; //limit right
        $(hdn_frequency_pos).val(pos);
        textfrequencyHighlight(pos);  //change cursor position
        break;
      case navDownArrow:
        let dec = -1;
        changeFreq(pos, rowPos, colPos, currBandPos, dec);
        break;
      case navUpArrow:
        let inc = 1;
        changeFreq(pos, rowPos, colPos, currBandPos, inc);
        break;
    }
  }catch(err)
  {
    console.log(err);
  }
}

//navigate through table section
function navigateTablesFrequencyScreen(arrowKey, rowPos, colPos, prevRowPos, prevColPos)
{
  try{
    const NavVals = 
    {
        MAX_TABLE_ROWS: 6,
        MAX_TABLE_COLS: 3,	

        ROW_POS_ADD_ROW: 7,	
        MAX_ADD_ROW_COLS: 1,	

        //ROW_POS_APPLY_CANCEL: 8,	
        ROW_POS_APPLY_CANCEL: 10,
        MAX_APPLY_CANCEL_COLS: 2
    }
    
    if(rowPos > 0 && rowPos <= (NavVals.MAX_TABLE_ROWS-emptySubbandsFrequencyNav)){
      switch(arrowKey)
      {
        case navRightArrow:
          (colPos < NavVals.MAX_TABLE_COLS) ? colPos++ : colPos = NavVals.MAX_TABLE_COLS; //limit right
          $(hdn_frequency_col_pos).val(colPos);
          break;
        case navLeftArrow:
          (colPos > 1) ? colPos-- : colPos = 1; //limit left
          $(hdn_frequency_col_pos).val(colPos);
          break;
        case navDownArrow:
          rowPos++;
          if(rowPos === (NavVals.ROW_POS_ADD_ROW-emptySubbandsFrequencyNav))  //about to transition
          {
            if(emptySubbandsFrequencyNav === 0)
            {
              rowPos++; //full subbands skip add row
            }
            else
            {
              rowPos += emptySubbandsFrequencyNav;
            }
            colPos = 1;
            $(hdn_frequency_col_pos).val(colPos);
          }
          $(hdn_frequency_row_pos).val(rowPos);
          break;
        case navUpArrow:
          (rowPos > 1) ? rowPos-- : rowPos = 1; //limit top
          $(hdn_frequency_row_pos).val(rowPos);
          break;
      }
    }
    else if(rowPos === (NavVals.ROW_POS_ADD_ROW)) //navigate add row button
    {
      switch(arrowKey)
      {
        case navRightArrow: //no left or right, only one column
          break;
        case navLeftArrow:
          break;
        case navDownArrow:
          rowPos++;
          $(hdn_frequency_row_pos).val(rowPos);
          break;
        case navUpArrow:
          rowPos-=emptySubbandsFrequencyNav+1; 
          $(hdn_frequency_row_pos).val(rowPos);
          break;
      }
    }

    // else if (rowPos === 8 || rowPos === 9) {  //frequency step & rampRate row
    //   if (arrowKey === navUpArrow) {
    //     rowPos = rowPos === 9
    //       ? 8
    //       : (emptySubbandsFrequencyNav === 0 ? 6 : 7);
    //   } else if (arrowKey === navDownArrow) {
    //     rowPos++;
    //   }

    //   colPos = 1;
    //   $(hdn_frequency_row_pos).val(rowPos);
    //   $(hdn_frequency_col_pos).val(colPos);
    // }

    else if (rowPos === 8 || rowPos === 9) {
      switch (arrowKey) {
        case navRightArrow:
          if (rowPos === 8) rowPos = 9; // Step → Ramp
          break;

        case navLeftArrow:
          if (rowPos === 9) rowPos = 8; // Ramp → Step
          break;

        case navDownArrow:
          colPos = rowPos === 8 ? 1 : 2; // Step → Apply, Ramp → Cancel
          rowPos = 10;
          break;

        case navUpArrow:
          rowPos = emptySubbandsFrequencyNav === 0 ? 6 : 7;
          colPos = 1;
          break;
      }

      $(hdn_frequency_row_pos).val(rowPos);
      $(hdn_frequency_col_pos).val(colPos);
    }

    else if(rowPos === (NavVals.ROW_POS_APPLY_CANCEL)) //navigate add row button
    {
      switch(arrowKey)
      {
        case navRightArrow:
          (colPos < NavVals.MAX_APPLY_CANCEL_COLS) ? colPos++ : colPos = NavVals.MAX_APPLY_CANCEL_COLS; //limit right
          $(hdn_frequency_col_pos).val(colPos);
          break;
        case navLeftArrow:
          (colPos > 1) ? colPos-- : colPos = 1; //limit left
          $(hdn_frequency_col_pos).val(colPos);
          break;
        case navDownArrow:  //limit down
          break;
        case navUpArrow:
          // rowPos--; 
          // if(emptySubbandsFrequencyNav === 0)
          // {
          //   rowPos--; //full subbands skip add row
          // }
          // $(hdn_frequency_row_pos).val(rowPos);

          // colPos = 1; //about to change to 1 column row, reset column position to 1
          // $(hdn_frequency_col_pos).val(colPos);
         // rowPos = 9; // Move from Apply/Cancel to Ramp rate.
          rowPos = colPos === 1 ? 8 : 9; 
          colPos = 1;
          $(hdn_frequency_row_pos).val(rowPos);
          $(hdn_frequency_col_pos).val(colPos);
          break;
      }
    }
    else //fallback for if case missed and navigation can't move
    {
      switch(arrowKey)
      {
        case navRightArrow:
          break;
        case navLeftArrow:
          break;
        case navDownArrow:
          rowPos++; 
          $(hdn_frequency_row_pos).val(rowPos);
          colPos = 1;
          $(hdn_frequency_col_pos).val(colPos);
          break;
        case navUpArrow:
          rowPos--; 
          $(hdn_frequency_row_pos).val(rowPos);
          colPos = 1;
          $(hdn_frequency_col_pos).val(colPos);
          break;
      }
    }
     //highlight new position and remove highlight from prev Position
    frequencyElementHighlight(rowPos, colPos, prevRowPos, prevColPos); 
  }catch(err)
  {
    console.log(err);
  }
}

function sweepSettingPrefix(row) {
  return row === 8 ? "m_t_frequency_step" : "m_t_frequency_ramp";
}

function setSweepSettingDigits(row, value) {
  const digits = String(value).padStart(5, "0");
  const prefix = sweepSettingPrefix(row);

  for (let i = 1; i <= 5; i++) {
    document.getElementById(`${prefix}_${i}`).value = digits[i - 1];
  }
}

function getSweepSettingDigits(row) {
  const prefix = sweepSettingPrefix(row);
  let digits = "";

  for (let i = 1; i <= 5; i++) {
    digits += document.getElementById(`${prefix}_${i}`).value;
  }

  return Number(digits);
}

function highlightSweepSettingDigit(row, position) {
  for (const settingRow of [8, 9]) {
    const prefix = sweepSettingPrefix(settingRow);

    for (let i = 1; i <= 5; i++) {
      const digit = document.getElementById(`${prefix}_${i}`);
      digit.classList.remove(textfocus);
      digit.classList.add(textnonfocus);
    }
  }

  if (row === 8 || row === 9) {
    const digit = document.getElementById(
      `${sweepSettingPrefix(row)}_${position}`
    );
    digit.classList.remove(textnonfocus);
    digit.classList.add(textfocus);
  }
}

function navigateSweepSettingDigits(arrowKey) {
  const row = sweepSettingEditRow;
  let position = Number($(hdn_frequency_pos).val());

  if (arrowKey === navLeftArrow) {
    position = Math.max(1, position - 1);
  } else if (arrowKey === navRightArrow) {
    position = Math.min(5, position + 1);
  } else if (arrowKey === navUpArrow || arrowKey === navDownArrow) {
    const digits = String(getSweepSettingDigits(row))
      .padStart(5, "0")
      .split("");

    const change = arrowKey === navUpArrow ? 1 : -1;
    const oldDigit = Number(digits[position - 1]);
    digits[position - 1] = String((oldDigit + change + 10) % 10);

    const candidate = Number(digits.join(""));
    const maximum = row === 8 ? 4000 : 65535;

    if (candidate >= 1 && candidate <= maximum) {
      setSweepSettingDigits(row, candidate);
    }
  }

  $(hdn_frequency_pos).val(position);
  highlightSweepSettingDigit(row, position);
}


function frequencyNavArrowKeyEnter()
{
  try{    
    let rowPos = parseInt($(hdn_frequency_row_pos).val());
    let colPos = parseInt($(hdn_frequency_col_pos).val());
    switch (parseInt(rowPos)){
      case 1:
      case 2:
      case 3:
      case 4:
      case 5:
      case 6:
        if(colPos === 3)
        {
          hideRowFrequencyScreen();
          hideLeadingZerosFrequencyScreen();
        }
        else
        {
          enterExitInputFrequencyScreen();
        }
        return;  
      case 7:
        unhideRowFrequencyScreen();
        return;   
      // case 8:
      //   if(colPos === 1)
      //   {
      //     setRadioFrequencySweep(radioFrequencyId);  
      //     hideFrequencyScreen();
      //     setConfigMenuParameterChangeCss(1);
      //   }
      //   else if(colPos === 2)
      //   {
      //     hideFrequencyScreen();
      //   }
      //   return;
      case 8:
      case 9:
        if (sweepSettingEditRow === 0) {
          sweepSettingEditRow = rowPos;
          $(hdn_frequency_pos).val(1);
          highlightSweepSettingDigit(rowPos, 1);
        } else {
          sweepSettingEditRow = 0;
          highlightSweepSettingDigit(0, 0);
        }
        return;

      case 10:
        if (colPos === 1) { // Apply
          const stepKHz = getSweepSettingDigits(8);
          const rampRate = getSweepSettingDigits(9);

          if (stepKHz < 1 || stepKHz > 4000 ||
              rampRate < 1 || rampRate > 65535) {
            return; // Keep the popup open for correction.
          }

          radioFreqObj[radioFrequencyId].FrequencyStep = stepKHz * 1000;
          radioFreqObj[radioFrequencyId].RampRate = rampRate;

          setRadioFrequencySweep(radioFrequencyId);
          hideFrequencyScreen();
          setConfigMenuParameterChangeCss(1);
        } else if(colPos === 2) { // Cancel
          hideFrequencyScreen();
        }
        return;
    }
  }catch(err)
	{
		console.log(err);
	}
}

function enterExitInputFrequencyScreen()
{
  try{
    $(hdn_frequency_pos).val(1); // reset index
    if(enterInputFrequencyScreenFlag === 1)
    {
      enterInputFrequencyScreenFlag = 0;
      textfrequencyHighlight(0);
      hideLeadingZerosFrequencyScreen();
    }
    else
    {
      enterInputFrequencyScreenFlag = 1;
      textfrequencyHighlight(1);
      unhideCellZerosFrequencyScreen();
    }
  }catch(err)
  {
    console.log(err);
  }
}

//unhide start and stop being changed
function unhideCellZerosFrequencyScreen()
{
  try{
    row = $(hdn_frequency_row_pos).val();

    for(let digit = 1; digit < 8; digit++)
    {
      if( (document.getElementById('m_t_frequency_' + `${row}` + '_1_' + `${digit}`).style.visibility == "hidden") ||
          (document.getElementById('m_t_frequency_' + `${row}` + '_2_' + `${digit}`).style.visibility == "hidden"))
      {
        document.getElementById('m_t_frequency_' + `${row}` + '_1_' + `${digit}`).style.visibility = "visible";
        document.getElementById('m_t_frequency_' + `${row}` + '_2_' + `${digit}`).style.visibility = "visible";
      }
      else
      { 
        //only leading zeros affected
        break;
      }
    }
  }catch(err)
  {
    console.log(err);
  }
}

function hideLeadingZerosFrequencyScreen()
{
  try
  {
    const MAX_SUBBANDS = 6;
    const MAX_COLUMNS = 2;
    
    let zeroCnt = 0;  //count zeros to ensure we don't hide new rows
    let firstNonZeroFound = 0;

    //go through each column and row, hiding leading zeros
    for(let row = 1; row <= MAX_SUBBANDS; row++)
    {
      for(let column = 1; column <= MAX_COLUMNS; column++) 
      {
        for(let digit = 1; digit < 8; digit++)
        {
          if(($(`#m_t_frequency_${row}_${column}_${digit}`).val() === "0") && (firstNonZeroFound === 0))  // search for only leading zeros
          {
            document.getElementById('m_t_frequency_' + `${row}` + '_' + `${column}` + '_' + `${digit}`).style.visibility = "hidden";
            // $(`#m_t_frequency_${row}_${column}_${digit}`).hide();
            zeroCnt++;
          }
          else  //ensure all other digits are visible
          { 
            firstNonZeroFound = 1;
            document.getElementById('m_t_frequency_' + `${row}` + '_' + `${column}` + '_' + `${digit}`).style.visibility = "visible";
          }
        }
        
        if(zeroCnt >= 7)  //if new row being added, cannot know fully empty until end of loop. Unhide
        {
          for(let digit = 1; digit < 8; digit++)
          {
            document.getElementById('m_t_frequency_' + `${row}` + '_' + `${column}` + '_' + `${digit}`).style.visibility = "visible";
          }
        }

        zeroCnt = 0;
        firstNonZeroFound = 0;
      }
    }
  }catch(err)
  {
    console.log(err);
  }
}

//get row of frequency for start or stop, and convert string digits into combined integer for easier processing.
function changeFreq(pos, row, col, band, incDec)
{
  try{
    let upper = 0;
    let upperStr = "";

    let lower = 0;
    let lowerStr = "";
    let tmp = 0;
    //build frequency start / stop as integer, one digit at a time
    for(let j = 1; j < 3; j++)
    {
      for(let i = 1; i < 8; i++) //start freq index = 1; stop freq index = 8
      {
        let val = $(`#m_t_frequency_${row}_${j}_${i}`).val(); //get character digit
        
        tmp += val*Math.pow(10,7-i);  //convert to integer and combine. displayed index is opposite of array index
      }
      (j == 1) ? lower = tmp : upper = tmp; //col 1 is start, col 2 is stop
      tmp = 0;
    }

    tmp = 0;
    if(col === 1) //use lower value
    {
      tmp = lower+(Math.pow(10,7-pos)*incDec);//add/subtract 1 to digit. 10^3 = 1000, add 1000 to make 41000 to 42000. Multiple by +1 or -1 for add or subtract
      if(((tmp > ((maxFrequencies[band-1]*1000) * 2)) && (lower != 0))) //if about to be double the maximum, do not apply. Possible misclick
      {
        tmp = lower;
      }
      else if(tmp < 0)  //if about to be negative, do not apply
      {
        tmp = lower;
      }
      else if(tmp < (minFrequencies[band-1]*1000))  //if less than min, make min
      {
        tmp = (minFrequencies[band-1]*1000);
        upper = tmp + 1000;
      } 
      else if(tmp >= upper)  //if lower changed to more than upper, limit to upper - 1;
      {
        upper = tmp + 1000;
        if(tmp >= (maxFrequencies[band-1]*1000))  //if lower greater than max, make max - 1 and upper = max
        {
          tmp = (maxFrequencies[band-1]*1000) - 1000;
          upper = (maxFrequencies[band-1]*1000);
        }
      }
      lower = tmp;
    }
    else //use upper value
    {
      tmp = upper+(Math.pow(10,7-pos)*incDec);//add/subtract 1 to digit. 10^3 = 1000, add 1000 to make 41000 to 42000. Multiple by +1 or -1 for add or subtract
      if(tmp < 0)
      {
        tmp = upper;
      }
      else if(tmp > (maxFrequencies[band-1]*1000))  //if greater than max, make max
      {
        tmp = (maxFrequencies[band-1]*1000);
      }
      else if(tmp <= lower)  //if upper changed to less than lower, limit to lower + 1;
      {
        tmp = lower + 10;
      }
      else if(tmp < (minFrequencies[band-1]*1000))
      {
        tmp = (minFrequencies[band-1]*1000) + 1000;
      }
      upper = tmp;

      if(lower === 0)
      {
        lower = (minFrequencies[band-1]*1000);
      }
    }

    lowerStr = (lower.toString()).padStart(7,"0"); //change new value back to string, pad the front with zeros to fill the display of 7 digits
    upperStr = (upper.toString()).padStart(7,"0"); //change new value back to string, pad the front with zeros to fill the display of 7 digits

    //re-insert new values
    for(let j = 1; j <= 3; j++)
    {
      for(let i = 1; i < 8; i++)
      {
        if(j === 2) 
        {
          $(`#m_t_frequency_${row}_${j}_${i}`).val(upperStr[i-1]); //insert new digits to display
        }
        else 
        {
          $(`#m_t_frequency_${row}_${j}_${i}`).val(lowerStr[i-1]); //insert new digits to display
        }
        
      }
    }
    return;

  }catch(err)
  {
    console.log(err);
  }
}

/*  
  Implements user input frequency values    
*/
function setRadioFrequencySweep(pos){
  try{
    resetRadioFrequencySweepBar(pos + 1); //Clear the specific frequency bar at pos (band 1 = pos 0, band 7 = pos 6)
    
    let obj = createRadioFrequencyObject(pos + 1); //get the user inputs from the frequency table.
    radioFreqObj[pos].subbands = obj; //store user inputs into a variable for access.
    for (let i = 0; i < radioFreqObj[pos].subbands.length; i++) {
      setFrequencyBand(radioFreqObj[pos].subbands, radioFreqObj[pos].band);
    }
  }catch(err)
	{
		console.log(err);
	}
}
function resetRadioFrequencySweepBar(pos)
{
  try{
    for(let i = 1; i <= 6; i++)
    {
      document.getElementById("m_span_progress_" + pos + "_" + i).style.display = "none";
    }
  }catch(err)
  {
    console.log(err);
  }
}

//Go through frequency table one line at a time and pull out start and stop frequencies to put into an object.
function createRadioFrequencyObject(index){
  try{
    let radioFrequencyList = [];
    let id = 1;
    let cnt = 0;

    for(let row=1;row<= 6;row++){
      let lower = getRadioFrequency(row,1);
      let upper = getRadioFrequency(row,2);
      
      if((lower > 0) && (upper > 0))
      {
        let radioFrequencyDetails = new RadioFrequency(id++,lower,upper);  //1 is start frequency first val, 8 is stop frequency first val
        radioFrequencyList.push(radioFrequencyDetails);  //combine objects of subbands into one variable
        cnt++;
      }
    }
    if(cnt === 0) //if no bands input, use max and min values to prevent nothing being used.
    {
      let radioFrequencyDetails = new RadioFrequency(id++,minFrequencies[radioFrequencyId]*1000,maxFrequencies[radioFrequencyId]*1000);  //1 is start frequency first val, 8 is stop frequency first val
      radioFrequencyList.push(radioFrequencyDetails);  //combine objects of subbands into one variable
    }
    let sortedFreqList = FreqArraySort(radioFrequencyList);
    let optimisedFreqList = FreqArrayOptimise(sortedFreqList);
    return optimisedFreqList;
	}catch(err)
	{
		console.log(err);
	}
}

function FreqArraySort(radioFrequencyList)
{
  try{
    //Bubblesort smallest to largest range object based on start frequency
    for(let i = 0; i < radioFrequencyList.length; i++)
    {
      for(let j = 0; j < radioFrequencyList.length - 1 - i; j++)
      {
        //if frequencies out of order, swap
        if(radioFrequencyList[j].Lower > radioFrequencyList[j+1].Lower) 
        {
          const tmp = radioFrequencyList[j];
          radioFrequencyList[j] = radioFrequencyList[j+1];
          radioFrequencyList[j+1] = tmp;

          //swap Id values to keep in order
          radioFrequencyList[j].Id-=1;
          radioFrequencyList[j+1].Id+=1;

        }
      }
    }
    return radioFrequencyList;
  }catch(err)
  {
    console.log(err);
  }
}

function FreqArrayOptimise(sortedFreqList)
{
  try{
    // let reIdFlag = 0;
    for(let i = 0; i < sortedFreqList.length-1; i++)
    {
      if(sortedFreqList[i].Upper >= sortedFreqList[i+1].Lower)  //if overlapping bands
      {
        //merge using the lower value and the highest upper value 
        sortedFreqList[i].Upper = (sortedFreqList[i].Upper > sortedFreqList[i+1].Upper) ? sortedFreqList[i].Upper : sortedFreqList[i+1].Upper;   
        for(let x = i+1; x < sortedFreqList.length-1; x++)
        {
          sortedFreqList[x].Lower = sortedFreqList[x+1].Lower;
          sortedFreqList[x].Upper = sortedFreqList[x+1].Upper;
        }
        sortedFreqList.pop();
        i--;
      }
    }

    return sortedFreqList;
  }catch(err)
  {
    console.log(err);
  }
}

//Get frequency input from frequency table as 7 values (i.e. start frequency) and join together
function getRadioFrequency(row, col){
  try{
    var arrRadioFrequency = [];
    m_t_frequency = `#m_t_frequency_${row}_${col}_`;
    for (let i = 1; i < 8; i++) {
      arrRadioFrequency.push($(m_t_frequency + i).val());
    }
    let radioFrequency = arrRadioFrequency.join("");
    radioFrequency =  parseInt(radioFrequency);
    return radioFrequency;
  }catch(err)
	{
		console.log(err);
	}
}
function clearPasscodeValue(){
  try{
    for (let i = 1; i <= 6; i++) {
      $(m_t_password + i).val(0);
     }
  }catch(err)
	{
		console.log(err);
	}
}

function textfrequencyHighlight(pos){
  try{
    let rowPos = parseInt($(hdn_frequency_row_pos).val());
    let colPos = parseInt($(hdn_frequency_col_pos).val());
    for (let i = 1; i <= 7; i++) //clear focus
    {  
      const buttonel = document.querySelector(`#m_t_frequency_${rowPos}_${colPos}_${i}`);
      if(buttonel == null) {
        return;
      }
      if(buttonel.classList.contains(textfocus)){
        buttonel.classList.remove(textfocus); 
        buttonel.classList.add(textnonfocus); 
      }
    }
    if((pos >= 1) && (pos <= 7)) //apply new focus, 0 removes focus
    { 
      const buttonel = document.querySelector(`#m_t_frequency_${rowPos}_${colPos}_${pos}`); 
      if(buttonel.classList.contains(textnonfocus)){
        buttonel.classList.remove(textnonfocus); 
        buttonel.classList.add(textfocus); 
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}

function frequencyElementHighlight(row, column, prevRow, prevCol){
  try{
    if((row === prevRow) && (column === prevCol))
    {
      return; //no highlight change required
    }
    else  //if previous element is highlighted, remove highlight
    {
      let prevElementName = m_t_frequency_nav + prevRow + "_" + prevCol; 
      const prevElement = document.querySelector(prevElementName);
      if(prevElement.classList.contains(borderyellow)) //border case
      {
        prevElement.classList.remove(borderyellow);
        prevElement.classList.add(borderwhite);
      }
      else if(prevElement.classList.contains(btnfocus))  //button case
      {
        prevElement.classList.remove(btnfocus);
      }
    }

    //get id of element based on rows / columns
    let elementName = m_t_frequency_nav + row + "_" + column; 
    const element = document.querySelector(elementName);
    if((row >= 1) && (row <= 6)) //6x3 grid for frequency input sections
    {
      switch(column)
      {
        case 1 :
        case 2 :
          //highlight outside of box
          element.classList.remove(borderwhite);
          element.classList.add(borderyellow);
          break;
        case 3 :
          //highlight button
          element.classList.add(btnfocus); 
          break;
      }
    }
    else if(row == 7) //1x1 grid for adding new row
    {
      switch(column)
      {
        case 1 :
          //highlight outside of box
          element.classList.add(btnfocus); 
          break;
      }
    }
    // else if(row == 8) //1x2 grid for apply / cancel
    // {
    //   switch(column)
    //   {
    //     case 1 :
    //     case 2 :
    //       //highlight outside of box
    //       element.classList.add(btnfocus); 
    //       break;
    //   }
    // }

    else if (row === 8 || row === 9) {
      element.classList.remove(borderwhite);
      element.classList.add(borderyellow);
    }
    else if (row === 10) {
        switch(column)
        {
          case 1 :
          case 2 :
            //highlight outside of box
            element.classList.add(btnfocus); 
            break;
        }
    }

  }catch(err)
	{
		console.log(err);
	}
}

function unhideRowFrequencyScreen()
{
  try{
    
    let rowPos = 0;
    let colPos = 0;
    let prevRowPos = parseInt($(hdn_frequency_row_pos).val());
    let prevColPos = parseInt($(hdn_frequency_col_pos).val());

    for(let i = 1; i < 7; i++)  //find ID of next hidden row
    {
      if(document.getElementById('m_t_frequency_row_' + i).style.display === "none")
      {
        emptySubbandsFrequencyNav--;
        document.getElementById('m_t_frequency_row_' + `${i}`).style.display = "table-row";
        if(i === 6) //hide the add button when reached max subbands
        {
          document.getElementById('m_t_frequency_row_7').style.display = "none";
          document.getElementById('m_t_frequency_table').classList.remove("mb-0");
          document.getElementById('m_t_frequency_table').classList.add("mb-2");

          //set highlight to subband   
          rowPos=6-emptySubbandsFrequencyNav; 
          colPos=1;
          $(hdn_frequency_row_pos).val(rowPos);
          $(hdn_frequency_col_pos).val(colPos);
          frequencyElementHighlight(rowPos, colPos, prevRowPos, prevColPos);
        }
        break;
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}

function hideRowFrequencyScreen()
{
  try{
    let lowerVal = "";
    let upperVal = "";
    let lower = 0;
    let upper = 0;
    let rowPos = parseInt($(hdn_frequency_row_pos).val());
    
    let row = 6; //if no hidden rows, all rows visible. Hide the last row

    for(let i = 1; i < 7; i++)  //find ID of first hidden row, 
    {
      if(document.getElementById('m_t_frequency_row_' + i).style.display === "none")
      {
        row = i-1;
        
        break;
      }
    }

    if((row === 1) || (row === 2)) //always keep one sub band visible
    {
      lower = getRadioFrequency(row,1);
      upper = getRadioFrequency(row,2);
      if((upper == 0)|| (lower == 0))
      {
        lowerVal = (''+(minFrequencies[radioFrequencyId]*1000)).padStart(7,"0");
        upperVal = (''+(maxFrequencies[radioFrequencyId]*1000)).padStart(7,"0");
        inputRowDigitsFrequencyScreen(row, lowerVal, upperVal);
      }
      if(row === 1) //always keep one sub band visible
      {
        return;
      }
    }

    //Last row being removed. set highlight to row above
    if(rowPos === row)
    {
      let colPos = parseInt($(hdn_frequency_col_pos).val());
      $(hdn_frequency_row_pos).val(rowPos-1);
      frequencyElementHighlight(rowPos-1, colPos, rowPos, colPos);
    }

    //move bands up
    for(let rowShift = rowPos; rowShift < row; rowShift++)
    {
      //get current subband digits
      lower = getRadioFrequency(rowShift+1,1);
      upper = getRadioFrequency(rowShift+1,2);

      //input digits to prev subband
      lowerVal = (''+lower).padStart(7,"0");
      upperVal = (''+upper).padStart(7,"0");
      inputRowDigitsFrequencyScreen(rowShift, lowerVal, upperVal);
    }

    //set the digits to 0's
    inputRowDigitsFrequencyScreen(row, "0000000", "0000000")

    //hide row
    document.getElementById('m_t_frequency_row_' + row).style.display = "none";
    emptySubbandsFrequencyNav++;

    //re-enable add button
    document.getElementById('m_t_frequency_row_7').style.display = '';  //make blank, appearance changes with any other value
    document.getElementById('m_t_frequency_table').classList.remove("mb-2");
    document.getElementById('m_t_frequency_table').classList.add("mb-0");
  }catch(err)
	{
		console.log(err);
	}
}

function hideFrequencyScreen()
{
  try{
    sweepSettingEditRow = 0;
    highlightSweepSettingDigit(0, 0);
    document.getElementById("configScreen").style.filter = "blur(0px)"; // remove blur
    $(m_s_frequency).hide();
    $(hdn_frequency_menu).val(0);
    frequencyValue  = '';
  }catch(err)
  {
    console.log(err);
  }
}

function fillFrequencyScreenValue(pos){
  try{
    let lowerVal = 0;
    let upperVal = 0;
    emptySubbandsFrequencyNav = 0;
    for (let row = 1; row < 7; row++) 
    {
      
      if(radioFreqObj[pos].subbands[row-1] != null) //subband not empty
      {
        //convert number to string and pad with zeros for easier digit extraction 
        lowerVal = (''+radioFreqObj[pos].subbands[row-1].Lower).padStart(7,"0");
        upperVal = (''+radioFreqObj[pos].subbands[row-1].Upper).padStart(7,"0");

        //display the row
        document.getElementById('m_t_frequency_row_' + `${row}`).style.display = "table-row";
      }
      else  //empty subband, set to zeros
      {
        lowerVal = "0000000";
        upperVal = "0000000";

        //hide the row
        document.getElementById('m_t_frequency_row_' + `${row}`).style.display = 'none';

        emptySubbandsFrequencyNav++;  //count missing subbands to adjust navigation and display Add Rows
      }
      inputRowDigitsFrequencyScreen(row, lowerVal, upperVal);
    }

    if(emptySubbandsFrequencyNav > 0) //Another row can be added, display button
    {
      document.getElementById('m_t_frequency_row_7').style.display = '';  //restore default display
      document.getElementById('m_t_frequency_table').classList.remove("mb-2");
      document.getElementById('m_t_frequency_table').classList.add("mb-0");
    }
    else
    {
      document.getElementById('m_t_frequency_row_7').style.display = "none";
      document.getElementById('m_t_frequency_table').classList.remove("mb-0");
      document.getElementById('m_t_frequency_table').classList.add("mb-2");
    }

    setSweepSettingDigits(
      8,
      Math.round((radioFreqObj[pos].FrequencyStep ?? 10000) / 1000)
    );
    setSweepSettingDigits(9, radioFreqObj[pos].RampRate ?? 20);

  }catch(err)
	{
		console.log(err);
	}
}

function inputRowDigitsFrequencyScreen(row, lowerVal, upperVal)
{
  try{
    let digit = 0;
    for(let col = 1; col <= 3; col++)
    {
      for (let pos = 1; pos < 8; pos++) {
        if(col === 2)
        {
          digit = parseInt(upperVal[pos-1]);  //work from last index backwards
        }
        else
        {
          digit = parseInt(lowerVal[pos-1]);
        }
        $(`#m_t_frequency_${row}_${col}_${pos}`).val(digit);
      }
    }
  }catch(err)
  {
    console.log(err);
  }
}
/* Frequency SCREEN NAV END */

/* Password SCREEN BEGIN */
/* Password SCREEN NAV BAR BEGIN */
function paswordScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        passwordNavigation(navUpArrow);
        break;
      case "2":
        passwordNavigation(navDownArrow);
        break;
      case "4":
        passwordNavigation(navLeftArrow);
        break;
      case "6":
        passwordNavigation(navRightArrow);
        break;
      case "5":
        passwordNavArrowKeyEnter();
        break;
      case "U":
        getConfig();  
        break;	   
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}

function passwordBoxReset(screenChange) {
  try{
    switch(screenChange)
    {
      case "passwordAccept":
        document.getElementById("m_btn_2").classList.remove(btnfocus);
        onConfig();
        DisplayPassword(mainScreenPasswordText);  //reset password text
        document.getElementById("spinnerId").style.display = 'block';
        document.getElementById("mainScreen").style.filter = "blur(0px)"; // remove blur
        document.getElementById("configScreen").style.filter = "blur(0px)"; // remove blur
        break;
      case "passwordFail":
        DisplayPassword(mainScreenPasswordText);
        document.getElementById("spinnerId").style.display = 'block';
        document.getElementById("mainScreen").style.filter = "blur(0px)"; // remove blur
        break;
      case "passwordNew":
        document.getElementById("configScreen").style.filter = "blur(0px)"; // remove blur
        break;
    }
    handlePasswordBoxFormat("passwordEnter");
  }catch(err)
  {
    console.log(err);
  }
}

function handlePasswordBoxFormat(state)
{
  try{
    switch(state)
    {
      case "passwordNew":
        $(passwordIncorrect).hide();
        $(passwordAccepted).hide();
        $(enterPassword).show();
        document.getElementById("m_s_password").style.top = "270px";
        document.getElementById("m_s_password").style.left = "150px";
        document.getElementById("m_s_password").style.height = "125px";
        document.getElementById("m_s_password").style.width = "300px";
        clearPasscodeValue();
        break;
      case "passwordEnter":
        $(passwordIncorrect).hide();
        $(passwordAccepted).hide();
        $(enterPassword).show();
        document.getElementById("m_s_password").style.top = "270px";
        document.getElementById("m_s_password").style.left = "200px";
        document.getElementById("m_s_password").style.height = "125px";
        document.getElementById("m_s_password").style.width = "210px";
        clearPasscodeValue();
        break;
      case "passwordFail":
        $(passwordIncorrect).show();
        $(passwordAccepted).hide();
        $(enterPassword).hide();
        document.getElementById("m_s_password").style.top = "280px";
        document.getElementById("m_s_password").style.left = "150px";
        document.getElementById("m_s_password").style.height = "100px";
        document.getElementById("m_s_password").style.width = "300px";
        break;
      case "passwordAccept":
        $(passwordIncorrect).hide();
        $(passwordAccepted).show();
        $(enterPassword).hide();
        document.getElementById("m_s_password").style.top = "280px";
        document.getElementById("m_s_password").style.left = "150px";
        document.getElementById("m_s_password").style.height = "100px";
        document.getElementById("m_s_password").style.width = "300px";
        break;
    }
  }catch(err)
  {
    console.log(err);
  }
}

function passwordNavArrowKeyEnter()
{
  try{
    //input password from setting screen
    if($(hdn_currentScreen).val() == configScreenVal)
    {
      if(passwordNavConfirm === 0)
      {
        passwordNavConfirm = 1;
        document.getElementById('passwordConfirmInput').classList.add(btnfocus); 
        textPasswordNonHighlight();
        document.getElementById('passwordConfirmSection').style.display = '';
        document.getElementById("m_s_password").style.height = "195px";
      }
      else
      {
        DisplayPassword(configScreenPasswordText);
        $(hdn_set_new_password).val(getcurrentpassword());
        passwordBoxReset("passwordNew");
        passwordNavConfirm = 0;
        document.getElementById('passwordConfirmSection').style.display = 'none';
        if(passwordNavConfirmPos === 0) //if highlighting confirm button when pressed, save
        {
          if($(hdn_set_new_password).val().length == 6){
            putNewPassword($(hdn_set_new_password).val());  
          }
        }
        else
        {
          document.getElementById('passwordCancelInput').classList.remove(btnfocus); 
        }
        passwordNavConfirmPos = 0;
      }
    }
    //normal password screen
    else if($(hdn_currentScreen).val() == mainScreenVal)
    {
      let isValidPassword = checkPassword();
      
      if(isValidPassword)
      {
        handlePasswordBoxFormat("passwordAccept");
        setTimeout(passwordBoxReset, 1000, "passwordAccept");
      }
      else
      {
        handlePasswordBoxFormat("passwordFail");
        setTimeout(passwordBoxReset, 1000, "passwordFail");
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function passwordNavigation(arrowKey){
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    if(($(hdn_currentScreen).val() == configScreenVal) && (passwordNavConfirm === 1)){
      switch(arrowKey)
      {
        case navRightArrow:
          if(passwordNavConfirmPos === 0)
          {
            passwordNavConfirmPos = 1;
            document.getElementById('passwordConfirmInput').classList.remove(btnfocus); 
            document.getElementById('passwordCancelInput').classList.add(btnfocus); 
          }
          break;
        case navLeftArrow:
          if(passwordNavConfirmPos === 1)
          {
            passwordNavConfirmPos = 0;
            document.getElementById('passwordCancelInput').classList.remove(btnfocus); 
            document.getElementById('passwordConfirmInput').classList.add(btnfocus); 
          }
          break;
        case navUpArrow:  //return to digit input format
          if(passwordNavConfirmPos === 1) 
          {
            document.getElementById('passwordCancelInput').classList.remove(btnfocus)
          }
          else
          {
            document.getElementById('passwordConfirmInput').classList.remove(btnfocus); 
          }
          passwordNavConfirm = 0;
          passwordNavConfirmPos= 0;
          handlePasswordBoxFormat("passwordNew");
          document.getElementById('passwordConfirmSection').style.display = 'none';
          textPasswordHighlight($(hdn_password_pos).val());
          break;
        default:
          break;
      }
    }
    else
    {
      let pos = $(hdn_password_pos).val();
      if(arrowKey == navRightArrow)
      {
          pos = parseInt($(hdn_password_pos).val()) + 1;
          $(hdn_password_pos).val(pos);
        }
        else if(arrowKey == navLeftArrow){
          pos = parseInt($(hdn_password_pos).val()) - 1;
          $(hdn_password_pos).val(pos);
        }
        if(pos > 6){
          pos = 1;
          $(hdn_password_pos).val(pos);
        }
        else if(pos <= 0){
          pos = 6;
          $(hdn_password_pos).val(pos);
        }
        textPasswordNonHighlight();
        textPasswordHighlight(pos);
        if(pos >= 1 && pos <= 6) {
          let value = parseInt($(m_t_password + pos).val());
          if(arrowKey == navUpArrow){
            value = value + 1;
          }
          else if(arrowKey == navDownArrow){
            value = value - 1;
        }
        setPasscodeValue(m_t_password + pos, value);
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function clearPasscodeValue(){
  try{
    for (let i = 1; i <= 6; i++) {
      $(m_t_password + i).val(0);
     }
  }catch(err)
	{
		console.log(err);
	}
}
function textPasswordNonHighlight(){
  try{
    for (let i = 1; i <= 6; i++) {
      const buttonel = document.querySelector(m_t_password + i); 
      if(buttonel.classList.contains(textfocus)){
        buttonel.classList.remove(textfocus); 
        buttonel.classList.add(textnonfocus); 
      }
     }
  }catch(err)
	{
		console.log(err);
	}
}
function textPasswordHighlight(pos){
  try{
    
    if(pos >= 1 || pos <= 6){
    const buttonel = document.querySelector(m_t_password + pos); 
    if(buttonel.classList.contains(textnonfocus)){
      buttonel.classList.remove(textnonfocus); 
      buttonel.classList.add(textfocus); 
    }
  }
  }catch(err)
	{
		console.log(err);
	}
}
function setPasscodeValue(element, value){
  try{
    if(value < 0){
      value = 9;
    }
    if(value > 9){
      value = 0;
    }
    $(element).val(value);
  }catch(err)
	{
		console.log(err);
	}
}
/* PASSWORD SCREEN NAV END */

/* CONFIG SCREEN BEGIN */
/* CONFIG SCREEN NAV BAR BEGIN */
function configScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        configNavArrowKeyup();
        break;
      case "2":
        configNavArrowKeyDown();
        break;
      case "4":
        configNavArrowKeyleft();
        break;
      case "6":
        configNavArrowKeyRight();
        break;
      case "5":
        configNavArrowKeyEnter();
        break;
      case "U":
        getConfig();   
        break;	   
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}
function configNavArrowKeyup()
{
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }
    let currButtonPos = $(hdn_currentConfigButtonHighlighted).val();
    let currButtonPosHighlighted = currButtonPos.split(splitter);
    let currentConfigMenuNavButton = currButtonPosHighlighted[2];
    let currentConfigMenuNavButtonHighlighted = currButtonPosHighlighted[1]; 

    if(currentConfigMenuNavButton == configScreenMaxButtonPosition){
      currentConfigMenuNavButton = configScreenMaxButton;
      $(hdn_currentConfigButton).val(configScreenMaxButton);
      $(hdn_currentConfigButtonHighlighted).val(0);
      configElementHighlight(currentConfigMenuNavButton,borderwhite);
      //setConfigbtnFocusHighlight(currentConfigMenuNavButton,btnfocus);
      return;
    }
    if(currentConfigMenuNavButton > configScreenMaxButtonPosition && currentConfigMenuNavButton <= configScreenMaxButton){
      if(currentConfigMenuNavButtonHighlighted == highlightedValue){
        if($(hdn_currentConfigMenu).val() == configSignalButton){
          setSignalRange(currentConfigMenuNavButton, navUpArrow);
        }
      }
      else{
        if(currentConfigMenuNavButton > configScreenMaxButtonPosition+1){
          currentConfigMenuNavButton = parseInt(currentConfigMenuNavButton) - 1;
          configElementHighlight(currentConfigMenuNavButton,borderwhite);
          return;
        }
      }
    }
    if(currentConfigMenuNavButton > configScreenMinButton && currentConfigMenuNavButton <= configScreenMaxButtonPosition){
      if(currentConfigMenuNavButton > configScreenMinButton && currentConfigMenuNavButton < configScreenMinButtonPosition){
        currentConfigMenuNavButton = parseInt(currentConfigMenuNavButton) - 1;
      }
      if(parseInt(currentConfigMenuNavButton) > 0 && parseInt(currentConfigMenuNavButton) < configScreenMinButtonPosition){
      if(currButtonPosHighlighted[1] == 1){
          configElementHighlight(currentConfigMenuNavButton,borderyellow);
        } 
      } 
      if(currentConfigMenuNavButton >= configScreenMinButtonPosition && currentConfigMenuNavButton < configScreenMaxButtonPosition){
        configElementHighlight(configScreenMinButtonPosition - 1,borderyellow);
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function configNavArrowKeyDown()
{
  try
  {
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    let currButtonPos = $(hdn_currentConfigButtonHighlighted).val();
    let currButtonPosHighlighted = currButtonPos.split(splitter);
    let currentConfigMenuNavButton = currButtonPosHighlighted[2];
    let currentConfigMenuNavButtonHighlighted = currButtonPosHighlighted[1]; 
    if(currentConfigMenuNavButton == configScreenMaxButton){
      currentConfigMenuNavButton = configScreenMaxButtonPosition;
      $(hdn_currentConfigButton).val(configScreenMaxButtonPosition);
      $(hdn_currentConfigButtonHighlighted).val(0);
      configElementHighlight(configScreenMaxButtonPosition,btnfocus);
      setConfigbtnFocusHighlight(configScreenMaxButtonPosition,btnfocus);
      configNavSetTitleLabel(parseInt(currentConfigMenuNavButton));
      return;
    }

    //disable change from bottom to top, bug caused for power level and not implemented in the same way for all bottom buttons navigation
    // if(currentConfigMenuNavButton == parseInt(configScreenMaxButtonPosition)){
    //   currentConfigMenuNavButton = parseInt(configScreenMaxButtonPosition) + 1;
    //   $(hdn_currentConfigButton).val(parseInt(configScreenMaxButtonPosition) + 1);
    //   $(hdn_currentConfigButtonHighlighted).val(0);
    //   configElementHighlight(currentConfigMenuNavButton,btnfocus);
    //   //setConfigbtnFocusHighlight(configScreenMaxButtonPosition,btnfocus);
    //   return;
    // }
    if(currentConfigMenuNavButton > configScreenMaxButtonPosition && currentConfigMenuNavButton <= configScreenMaxButton){
      if(currentConfigMenuNavButtonHighlighted == highlightedValue){
        if($(hdn_currentConfigMenu).val() == configSignalButton){
          setSignalRange(currentConfigMenuNavButton, navDownArrow);
        }
      }
      else{
        currentConfigMenuNavButton = parseInt(currentConfigMenuNavButton) + 1;
        configElementHighlight(currentConfigMenuNavButton,borderwhite);
        return;
      }
    }
    if(currentConfigMenuNavButton >= configScreenMinButton && currentConfigMenuNavButton <= configScreenMinButtonPosition){
      if(parseInt(currentConfigMenuNavButton) >= configScreenMinButton && parseInt(currentConfigMenuNavButton) < configScreenMinButtonPosition){
        currentConfigMenuNavButton = parseInt(currentConfigMenuNavButton) + 1;
      if(currButtonPosHighlighted[1] == 1){
          configElementHighlight(currentConfigMenuNavButton,borderyellow);
          } 
      }
      if(currentConfigMenuNavButton == configScreenMinButtonPosition){
        $(hdn_currentConfigButtonHighlighted).val(0);
        configElementHighlight(currentConfigMenuNavButton,btnfocus);
        setConfigbtnFocusHighlight(currentConfigMenuNavButton,btnfocus);
      }
    }
    configNavSetTitleLabel(parseInt(currentConfigMenuNavButton));
  }catch(err)
  {
    console.log(err);
  }
}

function configNavArrowKeyleft(){
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    let currButtonPos = $(hdn_currentConfigButtonHighlighted).val();
    let currButtonPosHighlighted = currButtonPos.split(splitter);
    let currentConfigMenuNavButton = currButtonPosHighlighted[2];
    let currentConfigMenuNavButtonHighlighted = currButtonPosHighlighted[1];
    if(currentConfigMenuNavButton > configScreenMaxButtonPosition && currentConfigMenuNavButton <= configScreenMaxButton){
      if(currentConfigMenuNavButtonHighlighted == highlightedValue){
        if($(hdn_currentConfigMenu).val() == configSignalButton){
          setSignalRange(currentConfigMenuNavButton, navLeftArrow);
        }
      }
      else{
        configElementHighlight(getMenuSignalNav(currentConfigMenuNavButton),borderyellow);
        return;
      }      
    }
    else if(currentConfigMenuNavButton > configScreenMinButtonPosition && currentConfigMenuNavButton <= configScreenMaxButtonPosition){
      let currentConfigMSButPosValue = $(hdn_currentConfigButton).val(); 
      let currentConfigMenu = $(hdn_currentConfigMenu).val(); 
      if(currentConfigMenu == 1){
        let currentConfigMSButPos =  parseInt(currentConfigMSButPosValue) - 1; 
        // if(currentConfigMSButPos === 10)  //skip ID 10, config navigation is a mess, requires full rework and clean 
        // {
        //   currentConfigMSButPos--;
        // }
        configNavSetTitleLabel(parseInt(currentConfigMSButPos));
        configElementHighlight(currentConfigMSButPos,btnfocus);
        setConfigbtnFocusHighlight(currentConfigMSButPos,btnfocus);
      }
    }
    else if(currentConfigMenuNavButton >= configScreenMinButton && currentConfigMenuNavButton < configScreenMinButtonPosition){
      if(currentConfigMenuNavButtonHighlighted == 0){
        setRangeValue(currentConfigMenuNavButton, navLeftArrow);
      }
    }
  }catch(err)
  {
    console.log(err);
  }
}

function configNavArrowKeyRight(){
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    let currButtonPos = $(hdn_currentConfigButtonHighlighted).val();
    let currButtonPosHighlighted = currButtonPos.split(splitter);
    let currentConfigMenuNavButton = currButtonPosHighlighted[2];
    let currentConfigMenuNavButtonHighlighted = currButtonPosHighlighted[1];
    if(currentConfigMenuNavButton >= configScreenMinButton && currentConfigMenuNavButton <= configScreenMaxButtonPosition){
      let currentConfigMSButPosValue = $(hdn_currentConfigButton).val(); 
      if(parseInt(currentConfigMSButPosValue) >= configScreenMinButtonPosition && parseInt(currentConfigMSButPosValue) < configScreenMaxButtonPosition)
      {
        let currentConfigMSButPos =  parseInt(currentConfigMSButPosValue) + 1; 
        // if(currentConfigMSButPos === 10)  //skip ID 10, config navigation is a mess, requires full rework and clean 
        // {
        //   currentConfigMSButPos++;
        // }
        configNavSetTitleLabel(parseInt(currentConfigMSButPos));
        configElementHighlight(currentConfigMSButPos,btnfocus);
        setConfigbtnFocusHighlight(currentConfigMSButPos,btnfocus);
      }
      else if(parseInt(currentConfigMSButPosValue) >= configScreenMinButton && parseInt(currentConfigMSButPosValue) < configScreenMinButtonPosition)
      {
        if(currentConfigMenuNavButtonHighlighted == nonHighlightedValue){
          setRangeValue(currentConfigMenuNavButton, navRightArrow);
        }
        else{
          let currentConfigMSButPos = setMenuNav(parseInt(currentConfigMSButPosValue)); 
          configElementHighlight(currentConfigMSButPos,borderwhite);
          showSignalButton(currentConfigMSButPos,borderwhite);
        }

      }
    }
    if(currentConfigMenuNavButton > configScreenMaxButtonPosition && currentConfigMenuNavButton <= configScreenMaxButton){
      if(currentConfigMenuNavButtonHighlighted == highlightedValue){
        if($(hdn_currentConfigMenu).val() == configSignalButton){
          setSignalRange(currentConfigMenuNavButton, navRightArrow);
        }
      }
    }
  }catch(err)
  {
    console.log(err);
  }
}
function configNavArrowKeyEnter()
{
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    let currButtonPos = $(hdn_currentConfigButtonHighlighted).val();
    let currButtonPosHighlighted = currButtonPos.split(splitter);
    let currentConfigMenuNavButton = currButtonPosHighlighted[2];
    let currentConfigMenuNavButtonHighlighted = currButtonPosHighlighted[1]; 
    if(currentConfigMenuNavButton >= configScreenMinButton && currentConfigMenuNavButton < configScreenMinButtonPosition) 
    {
      radioFrequencyId = currentConfigMenuNavButton - 1;
      document.getElementById("configScreen").style.filter = "blur(7px)"; //blur background
      DisplayFrequency(currentConfigMenuNavButton - 1);
    }
    else if (currentConfigMenuNavButton >= (parseInt(configScreenMinButtonPosition)) && currentConfigMenuNavButton <= configScreenMaxButtonPosition)
    {
      configButtonClickEvent(currentConfigMenuNavButton);
    }
    else if (currentConfigMenuNavButton > configScreenMaxButtonPosition && currentConfigMenuNavButton <= configScreenMaxButton)
    {
      if(currentConfigMenuNavButtonHighlighted == highlightedValue){
        configElementHighlight(currentConfigMenuNavButton,borderwhite);
      }
      else
      {
        configScreenNonHighlight();
        configElementHighlight(currentConfigMenuNavButton,borderyellow);
      }
      if($(hdn_currentConfigMenu).val() == configPowerButton)
      {
        let buttonel = document.querySelector(s_i_pwr + getMenuSignalNav(currentConfigMenuNavButton)); 	
        if(buttonel.classList.contains(bggreen))
        {
          buttonel.classList.remove(titlefont18);
          buttonel.classList.remove(bggreen);
          buttonel.classList.add(bggrey);
          buttonel.classList.add(titlefont18);
          document.getElementById('responseData').innerHTML = 'Power: OFF';
        }
        else
        {
          buttonel.classList.remove(titlefont18);
          buttonel.classList.remove(bggrey);
          buttonel.classList.add(bggreen);
          buttonel.classList.add(titlefont18);
          document.getElementById('responseData').innerHTML = 'Power: ON';
        }
        configScreenNonHighlight();
        configElementHighlight(currentConfigMenuNavButton,borderwhite);
        setConfigMenuParameterChangeCss(1);
      } 
    }  
  }catch(err)
  {
    console.log(err);
  }
}

//Text applied for config bottom buttons navigation
function configNavSetTitleLabel(button)
{
  switch(button)
  {
    case 8: 
      document.getElementById('responseData').innerHTML = 'Save Op.Fill Settings';
      break;
    case 9: 
      document.getElementById('responseData').innerHTML = 'Change Password'; 
      break;
    case 10:
      document.getElementById('responseData').innerHTML = 'Toggle Mod on all paths';
      break;
    case 11: 
    case 25: 
      document.getElementById('responseData').innerHTML = 'Return to Main Screen';
      break;
  }
}
/* CONFIG SCREEN NAV END */
function configElementHighlight(highlightBtn, highLightCssButton){
  try{
    if((highLightCssButton === borderyellow) ||(highLightCssButton === 'btn-highlight')){
      IsHighlighted = highlightedValue;
    }
    else{
      IsHighlighted = nonHighlightedValue;
    }   
    $(hdn_currentConfigMenuNavButton).val(highlightBtn);
    setConfigMenuButton();
    
    if(highlightBtn <= configScreenMaxButtonPosition){
      $(hdn_currentConfigButton).val(highlightBtn);
      configScreenNonHighlight();
      if(highlightBtn < configScreenMinButtonPosition){
        setConfigTitleBoxHighlight(highlightBtn,highLightCssButton);
        setConfigTitleHighlight(highlightBtn);
      }
    }
    else if((highlightBtn > configScreenMaxButtonPosition) && (highlightBtn <= configScreenMaxButton))  
    {
      showSignalButton(highlightBtn, highLightCssButton);
      if((highlightBtn % 2) === 1)
      {
        if(document.querySelector(s_i_pwr + getMenuSignalNav($(hdn_currentConfigMenuNavButton).val())).classList.contains(bggreen) == false)
        {
          document.getElementById('responseData').innerHTML = 'Power: OFF';
        }
        else
        {
          document.getElementById('responseData').innerHTML = 'Power: ON';   
        }
      }
      else
      {
        let signalStrength = parseInt(getSignalRangeStrength(highlightBtn));
        if(signalStrength === 7)
        {
          document.getElementById('responseData').innerHTML = `Power Level: Full`;
        }
        else
        {
          document.getElementById('responseData').innerHTML = `Power Level: ${signalStrength-7}dB`;
        }
      }
    }
    let currentButtonPosHighlighted = $(hdn_currentConfigButton).val() + '@@' + IsHighlighted + '@@' +  $(hdn_currentConfigMenuNavButton).val() + '@@' +  $(hdn_currentConfigMenu).val();
    $(hdn_currentConfigButtonHighlighted).val(currentButtonPosHighlighted);
  }catch(err)
  {
    console.log(err);
  }
}
function showSignalButton(highlightBtn, highLightCssButton)
{
  try{
    if(highLightCssButton === borderyellow){
      IsHighlighted = highlightedValue;
    }
    else{
      IsHighlighted = nonHighlightedValue;
    } 
    let menuSignalNavButton = getMenuSignalNav(highlightBtn);
    setconigMenuButtonDisplay(menuSignalNavButton,getConfigMenuNavElementName());
    if(IsHighlighted == 1){
      setConfigMenuButtonHighlight(menuSignalNavButton,getConfigMenuNavElementName(),highLightCssButton);
    }
    let currentButtonPosHighlighted = $(hdn_currentConfigButton).val() + '@@' + IsHighlighted + '@@' +  $(hdn_currentConfigMenuNavButton).val() + '@@' +  $(hdn_currentConfigMenu).val();
    $(hdn_currentConfigButtonHighlighted).val(currentButtonPosHighlighted);
  }catch(err)
  {
    console.log(err);
  }
}
function setConfigMenuButton()
{
  try
  {
    let currentConfigButton = $(hdn_currentConfigMenuNavButton).val();
    if(currentConfigButton <= configScreenMaxButtonPosition){
      $(hdn_currentConfigMenu).val(configMenuButton);
    }
    else if(currentConfigButton > configScreenMaxButtonPosition && currentConfigButton <= configScreenMaxButton){
      if((currentConfigButton % 2) == 0){
        $(hdn_currentConfigMenu).val(configSignalButton);
      }
      else{
        $(hdn_currentConfigMenu).val(configPowerButton);
      }
    }
  }catch(err)
  {
    console.log(err);
  }
}
function setConfigbtnFocusHighlight(currentMSButPos, btnCssClass)
{
  try{
    if((currentMSButPos) >=  configScreenMinButtonPosition  && (currentMSButPos <= configScreenMaxButtonPosition)){
      configScreenNonHighlight();  
      setConfigBtnFocusHighlight(currentMSButPos, btnCssClass); 
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setconigMenuButtonDisplay(highlightBtn,elementName)
{
  configScreenNonHighlight();
  setConfigMenuButtonDisplay(highlightBtn,elementName);
}
function setConfigMenuButtonDisplay(highlightBtn,elementName)
{
  var buttonelName = elementName + highlightBtn;
  const buttonel = document.querySelector(buttonelName); 	
  buttonel.classList.remove(borderblack); 
  buttonel.classList.add(borderwhite);
  // buttonel.style.display = 'block';
}
function setConfigMenuButtonHighlight(highlightBtn,elementName,highLightCssButton)
{
  var buttonelName = elementName + highlightBtn;
  const buttonel = document.querySelector(buttonelName); 	
  try{
    buttonel.classList.remove(borderwhite);
    buttonel.classList.add(highLightCssButton);
  }catch(err)
	{
		console.log(err);
	}
}
function setConfigMenuParameterChangeCss(highlightChange)
{
  if(highlightChange === 1)
  {
    document.getElementById('c_btn_8').style.backgroundColor = "#838C95";
    document.getElementById('c_btn_8').style.fontWeight = 1000;
  }
  else
  {
    document.getElementById('c_btn_8').style.backgroundColor = "#6c757d";
    document.getElementById('c_btn_8').style.fontWeight = 400;
  }
}

function setSignalRange(highlightBtn, navigationKey){
  try{
    var signalStrength = parseInt(getSignalRangeStrength(highlightBtn));
    if(signalStrength >= 1 && signalStrength <= 7){
      if((navigationKey == 6) || (navigationKey == 8)){
        if(signalStrength >= 1 && signalStrength < 7){
          signalStrength = parseInt(signalStrength) + 1;
          setConfigMenuParameterChangeCss(1);
        }
      }
      else if((navigationKey == 2) || (navigationKey == 4)){
        if(signalStrength > 1 && signalStrength <= 7){
          signalStrength = parseInt(signalStrength) - 1;
          setConfigMenuParameterChangeCss(1);
        }
      }
      const buttonel = document.querySelector(m_i_icon_signal + getMenuSignalNav(highlightBtn)); 	
      const classNameArray = buttonel.className.split(" ");
      let signalClassName = classNameArray[1];
      buttonel.classList.remove(signalClassName);
      buttonel.classList.add(iconSignalStrength + signalStrength);
      if(signalStrength === 7)
      {
        document.getElementById('responseData').innerHTML = `Power Level: Full`;
      }
      else
      {
        document.getElementById('responseData').innerHTML = `Power Level: ${signalStrength-7}dB`;
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function getSignalRangeStrength(highlightBtn){
  try{
    const buttonel = document.querySelector(m_i_icon_signal + getMenuSignalNav(highlightBtn)); 	
    const classNameArray = buttonel.className.split(" ");
    let signalClassName = classNameArray[1];
    const getSignalStrength = signalClassName.split('-');
    return getSignalStrength[1];
  }catch(err)
	{
		console.log(err);
	}
}
function setConfigBtnFocusHighlight(highlightBtn, highLightCssButton){
  var buttonelName = configButtonElementName + highlightBtn;
  const buttonel = document.querySelector(buttonelName); 	
  buttonel.classList.add(highLightCssButton);
}
function setConfigTitleBoxHighlight(highlightBtn, highLightCssButton){
  var buttonelName = configButtonElementName + highlightBtn;  
  const buttonel = document.querySelector(buttonelName); 	
  try{
    buttonel.classList.remove(borderwhite);
    buttonel.classList.add(highLightCssButton);
  }catch(err)
	{
		console.log(err);
	}
}
function setConfigTitleHighlight(highlightBtn){
  var buttonelName = configTitleElementName + highlightBtn;
  const buttonel = document.querySelector(buttonelName); 	
  buttonel.classList.remove(titleGreen);
  buttonel.classList.remove(titleWhite);
  buttonel.classList.add(titleYellow);
  $(hdn_currentFrequencyRangeSteps).val(0);
  document.getElementById('responseData').innerHTML = setBandText(highlightBtn);
}
function configScreenNonHighlight(){
  try{
    configButtonElementNonHighlight();
    configTitleBoxNonHighlight();
    configTitleNonHighlight();
    configSignalPowerButtonElementHide();
    configRangeElementHide();
  }catch(err)
	{
		console.log(err);
	}
}
function configButtonElementNonHighlight()
{
  try{
    var myArray = document.querySelector(configScreen).querySelectorAll(btn);
    myArray.forEach(function(item){
        item.classList.remove(btnfocus); 
        item.classList.remove(btnhighlight); 
        item.classList.add(btnsecondary);
       });
    }catch(err)
	{
		console.log(err);
	}
}
function configTitleBoxNonHighlight()
{
  try{
    var myArray = document.querySelector(configScreen).querySelectorAll(cfg);
    myArray.forEach(function(item){
      item.classList.remove(borderyellow); 
      item.classList.remove(borderblack); 
      item.classList.add(borderwhite);
    });
  }catch(err)
	{
		console.log(err);
	}
}
function configTitleNonHighlight()
{
  try{
    var myArray = document.querySelector(configScreen).querySelectorAll(title);
    myArray.forEach(function(item){
      item.classList.remove(titleGreen); 
      item.classList.remove(titleYellow); 
      item.classList.add(titleWhite);
    });
  }catch(err)
	{
		console.log(err);
	}
}
function configSignalPowerButtonElementHide()
{
  try{
    var myArray = document.querySelector(configScreen).querySelectorAll(hzLine);
    myArray.forEach(function(item){
        item.classList.remove(borderwhite); 
        item.classList.add(borderblack);
        // item.style.display = 'none';
       });
    }catch(err)
	{
		console.log(err);
	}
}
function configRangeElementHide()
{
  try{
    var myArray = document.querySelector(configScreen).querySelectorAll(range);
    myArray.forEach(function(item){
        item.style.display = 'none';
       });
    }catch(err)
	{
		console.log(err);
	}
}
function configButtonClickEvent(buttonPos)
{
    try{
      var buttonelName = opFillSelElementName ;
      const buttonel = document.querySelector(buttonelName); 	
      switch (buttonPos) {
      case "8":
        try{
          setConfigMenuParameterChangeCss(0);
          setConfigbtnFocusHighlight(buttonPos,btnhighlight);
          const changeButtonCSS = function() {
            if($(hdn_currentConfigButton).val() === "8")  //save button has not moved, turn back to white
            {
              setConfigbtnFocusHighlight(buttonPos,btnfocus);
            }
          }
          setTimeout(changeButtonCSS, 2000);
          onConfigSave();
          return;
        }catch(err)
        {
          console.log(err);
        }                
      break;
      case "9":
        try{
          DisplayPassword(configScreenPasswordText);
        }catch(err)
        {
          console.log(err);
        }   
        return;
      case "10":
        toggleAllModulation();
        return;
      case "11":
        setConfigMenuParameterChangeCss(0);
        InitialiseMainScreen();
      break;	              
    }
  }catch(err)
  {
    console.log(err);
  }
}
function addTicks(i, pos){
  try{
    let elSpanTicks = `<span class='dot' id='${m_span_tick}${i}'></span>`
    $(m_tick + pos).append(elSpanTicks);
  }catch(err)
	{
		console.log(err);
	}
}
function removeTicks(i, pos){
  try{
    let elSpanTicks = `<span class='dot' id='${m_span_tick}${i}'></span>`
    $(m_tick + pos).remove(elSpanTicks);
  }catch(err)
	{
		console.log(err);
	}
}
function setRange(pos){
  try
  {
    $(m_tick + pos).empty();
    for (let i = 1; i <=64; i++) {
      addTicks(i,pos);
    } 
    $(m_range + pos).val(0);
    $(hdn_currentFrequencyRange).val(0);
    
  }catch(err)
  {
    console.log(err);
  }
}

//applies an arrow on a band index
function setProgressFrequencyBand(arrowKey, subband, band, lower, upper){
  try{
    let barEl = document.getElementById('m_span_progress_' + band + '_' + subband);
    switch(arrowKey)
    {
      case navUpArrow:  //set rectangle to correct size and show
        let frequencyRange = maxFrequencies[band-1] -  minFrequencies[band-1];
        
        //rectangle start point is left position, end point is defined by width
        let lowerPercent = (100/frequencyRange) * lower;
        barEl.style.left='' + lowerPercent + '%';
        let upperPercent = ((100/frequencyRange) * upper)-lowerPercent;
        if(upperPercent < 0.5)
        {
          upperPercent = 0.5;
        }
        barEl.style.width='' + upperPercent + '%';

        barEl.style.display='block';
        break;
      case navDownArrow:  //hide rectangle
        barEl.style.display='none';
        break;
    }
  }catch(err)
  {
    console.log(err);
  }
} 


function setRangeSteps(navigationKey){
  try{
    let rangeSteps =   $(hdn_currentFrequencyRangeSteps).val();
    if(navigationKey == 6){
      rangeSteps = parseInt(rangeSteps) + 1;
    }
    else if(navigationKey == 4){
      if(rangeSteps <= 0){
        return;
      }
      rangeSteps = parseInt(rangeSteps) - 1;
    }
    else if(navigationKey == 5){
      rangeSteps =  1;
    }
    $(hdn_currentFrequencyRangeSteps).val(rangeSteps);
  }catch(err)
  {
    console.log(err);
  }
}
function setRangeValue(pos, navigationKey){
  try
  {
    let rangeValue =  $(hdn_currentFrequencyRangeSteps).val();
    if(!IsStepsWithinRange(navigationKey)){
      if(navigationKey == 6){
        rangeValue = parseInt(rangeValue) + 1;
      }
      else if(navigationKey == 4){
        if(rangeValue <= 0){
          return;
        }
        rangeValue = parseInt(rangeValue) - 1;
      }
      else if(navigationKey == 5){
        rangeValue =  0;
      }
      else{
        if(rangeValue <= 0 ){
          rangeValue = 0;
        }
        else{
          rangeValue = parseInt(rangeValue) - 1;
        }
      }
      setRangeSteps(navigationKey);
      var getRValue = getRangeValue(pos, rangeValue);
      $(m_range + pos).val(getRValue);
      setBandDisplay(pos);
    }
  }catch(err)
  {
    console.log(err);
  }
}
function removeRangeElement(pos){
  try
  {
    for (let i = 1; i <= 64; i++) {
      removeTicks(i,pos);
    } 
    $(m_range + pos).val(0);
  }catch(err)
  {
    console.log(err);
  }
}
function setBandDisplay(pos){
  try{

    document.getElementById('responseData').innerHTML = setBandText(pos);
    //showRangeDisplayHide(pos);
	}catch(err)
	{
		console.log(err);
	}
}
function showRangeDisplayHide(pos){
  try{
    var buttonelName = c_range + pos;
    const buttonel = document.querySelector(buttonelName); 	
    buttonel.style.display = 'block';
	}catch(err)
	{
		console.log(err);
	}
}
function IsStepsWithinRange(navigationKey)
{
  let rangeSteps =  $(hdn_currentFrequencyRangeSteps).val();
  try{
      var freRangeValue  = parseInt(getFrequencyRangeValue(hdn_currentFrequencyRangePos, bandSplitter, 0));
      switch(freRangeValue) {
        case 1:
          if(rangeSteps == rangeStep1 && navigationKey == navLeftArrow){
            return false;
          }
          return (rangeSteps < 0 ||rangeSteps >= rangeStep1);
        case 2:
          if(rangeSteps == rangeStep2 && navigationKey == navLeftArrow){
            return false;
          }
          return (rangeSteps < 0 ||rangeSteps >= rangeStep2);
        case 3:
          if(rangeSteps == rangeStep3 && navigationKey == navLeftArrow){
            return false;
          }          
          return (rangeSteps < 0 ||rangeSteps >= rangeStep3);
        case 4:
          if(rangeSteps == rangeStep4 && navigationKey == navLeftArrow){
            return false;
          }          
          return (rangeSteps < 0 ||rangeSteps >= rangeStep4);
        case 5:  
          if(rangeSteps == rangeStep5 && navigationKey == navLeftArrow){
            return false;
          }          
          return (rangeSteps < 0 ||rangeSteps >= rangeStep5);
        default:  
          return false;
    }
  }catch(err)
  {
    console.log(err);
  }
}
function getRangeValue(pos, rangeValue)
{
  try{
    let rangeSteps =  $(hdn_currentFrequencyRangeSteps).val();
    switch (parseInt(pos)) {
	    	case 1:
          return parseInt(rangeSteps/2);
	    	case 2:
          return parseInt(rangeSteps/1.5);
        case 3:
          return  (rangeSteps/2);
        case 4:
          return (rangeSteps/2.5);
        case 5:
          return parseInt(rangeSteps/1.5);     
		}
	}catch(err)
	{
		console.log(err);
	}
}
function setBandText(pos){
  try{
    var frequency = getFrequencyBands(pos).split(bandSplitter);
    var lowFrequencyRange = parseInt(frequency[0]);
    var highFrequencyRange = parseInt(frequency[1]);
    if($(hdn_currentFrequencyRangeSteps).val() >= 1 ){
        lowFrequencyRange = calculateFrequencyRangeValue(pos, parseInt(getFrequencyRangeSteps(pos)) - 1) ;
        highFrequencyRange = calculateFrequencyRangeValue(pos, getFrequencyRangeSteps(pos));
    }
    var setFrequencyRange = `${pos}-${lowFrequencyRange}-${highFrequencyRange}`;
    $(hdn_currentFrequencyRangePos).val(setFrequencyRange);
    return `Band: ${lowFrequencyRange} to ${highFrequencyRange} MHz`;
	}catch(err)
	{
		console.log(err);
	}
}
function getFrequencyRangeSteps(pos)
{
  let rangeSteps =  $(hdn_currentFrequencyRangeSteps).val();
  switch(parseInt(pos)) {
    case 1:
      return parseInt(rangeSteps); 
    case 2:
      return parseInt(rangeSteps);     
    case 3:
        if(rangeSteps > 42 && rangeSteps <= 84){
          return parseInt(rangeSteps) - 42; 
        }
        else if(rangeSteps > 84 && rangeSteps <= 126){
          return parseInt(rangeSteps) - 84; 
        } 
        else{
          return parseInt(rangeSteps); 
        }
    case 4:
      if(rangeSteps > 64 && rangeSteps <= 120){
        return parseInt(rangeSteps) - 64; 
      }
      else if(rangeSteps > 120 && rangeSteps <= 162){
        return parseInt(rangeSteps) - 120; 
      } 
      else{
        return parseInt(rangeSteps); 
      }
    case 5:  
      if(rangeSteps > 42 && rangeSteps <= 98){
        return parseInt(rangeSteps) - 42; 
      }
      else{
        return parseInt(rangeSteps); 
      }
    }
}
function calculateFrequencyRangeValue(pos, rangeValue){
  try{
    var frequency = getFrequencyBands(pos).split(bandSplitter);
    var frequencyRange = (parseInt(frequency[1]) - parseInt(frequency[0]))/ (pos);
    var frequencyRangeValue =  parseInt(frequency[0]) + (frequencyRange * rangeValue);
    return parseFloat(frequencyRangeValue.toFixed(1));
	}catch(err)
	{
		console.log(err);
	}
}
function getFrequencyRangeValue(elementName, splitter, pos)
{
  var frequency =  $(elementName).val().split(splitter);
  if(frequency.length > 0){
    return parseInt(frequency[pos]);
  }
  return 0;
}

function getProgressBandSteps(pos){
  try{
    switch(parseInt(pos)) {
      case 1:
        return rangeStep1;    
      case 2:
        return rangeStep2;         
      case 3:
        return rangeStep3;         
      case 4:
        return rangeStep4;         
      case 5:  
        return rangeStep5;   
    }
  }catch(err)
	{
		console.log(err);
	}
}
function getFrequencyBands(bandPos){
  switch(parseInt(bandPos)) {
    case 1:
      return `${minFrequencies[0]}-${maxFrequencies[0]}`;    
    case 2:
      return `${minFrequencies[1]}-${maxFrequencies[1]}`; 
    case 3:
      return `${minFrequencies[2]}-${maxFrequencies[2]}`; 
    case 4:
      return `${minFrequencies[3]}-${maxFrequencies[3]}`; 
    case 5:  
      return `${minFrequencies[4]}-${maxFrequencies[4]}`; 
    case 6:  
      return `${minFrequencies[5]}-${maxFrequencies[5]}`;   
    case 7:  
      return `${minFrequencies[6]}-${maxFrequencies[6]}`;   
  }
}
/*  CONFIG SAVE BEGIN */
function onConfigSave(){
  try{
   let obj = new Object();
   obj = BuildOpFillJson();
   putSaveOpFill(obj);
    
  }catch(err)
  {
    console.log(err);
  }
}
function BuildOpFillJson(){
  try{
    let obj = new Object();
    obj.op = BuildOpFillNumber();
    obj.ModulationEnabled = globalModulationEnabled;
    let radioFrequencyPath = [];

    for (let i = 0; i < 7; i++) {
      let rfrObj =  radioFreqObj[i].subbands;
      let rfobj = BuildRadioFrequencyPathObject(i, rfrObj);
      radioFrequencyPath.push(rfobj);
    }
    obj.RadioFrequencyPath = radioFrequencyPath;
 //   console.log(obj);
    return obj;
  }catch(err)
  {
    console.log(err);
  }
}

//Get the Op Fill number being saved to, I.e OpFill 1, OpFill 2 etc
function BuildOpFillNumber(){
  try{
    let buttonelName = opFillSelElementName ;
    const buttonel = document.querySelector(buttonelName); 	
    let str = buttonel.innerHTML;
    let res = parseInt(str[str.length-1]);
    return res;
  }catch(err)
  {
    console.log(err);
  }
}
function BuildRadioFrequencyPathObject(pos, rfobj){
  try{
    var radioFrequencyPathObj = new Object();
    var frequencyRangeID  = parseInt(pos) + 1;
    radioFrequencyPathObj.Id = frequencyRangeID;
    radioFrequencyPathObj.Power = getConfigPowerRangeSave(frequencyRangeID);
    radioFrequencyPathObj.IsPathOn = getConfigPowerSave(frequencyRangeID);
    radioFrequencyPathObj.Mode =  'Sweep';
    radioFrequencyPathObj.ModulationEnabled = modulationEnabledByPath[pos];
    //if(obj != null){
      //console.log(rfobj);
   // }
    radioFrequencyPathObj.FrequencyRange = rfobj;//BuildRadioFrequencyRanges(frequencyRangeID,rfobj);
    radioFrequencyPathObj.FrequencyStep = radioFreqObj[pos].FrequencyStep ?? 10000;
    radioFrequencyPathObj.RampRate = radioFreqObj[pos].RampRate ?? 20;
    return radioFrequencyPathObj;
  }catch(err)
  {
    console.log(err);
  }
}
function BuildRadioFrequencyRanges(pos,rfobj){
  try{
    var radioFrequencyRangeArray = []
    var obj = getConfigFrequencySave(pos);

    for (let i = 0; i < obj.length; i++) {
      if(rfobj != null){
        radioFrequencyRangeArray.push(BuildRadioFrequencyRange(obj[i], i, rfobj[i]));
      }
      radioFrequencyRangeArray.push(BuildRadioFrequencyRange(obj[i], i, rfobj));
    }
    return radioFrequencyRangeArray;
  }catch(err)
  {
    console.log(err);
  }
}
function BuildRadioFrequencyRange(obj, pos, rfobj){
  try{

    var radioFrequencyRangeObj = new Object();
    if(obj.length > 0 ){
      var frequencyRangeID  = parseInt(pos) + 1;
      radioFrequencyRangeObj.Id = frequencyRangeID;
      radioFrequencyRangeObj.Lower = obj[0];
      radioFrequencyRangeObj.Upper = obj[obj.length - 1];
    }
    if(rfobj != null){
      if(rfobj[pos] != null){
        if(rfobj[pos].radioFrequency != null){
          radioFrequencyRangeObj.Id = rfobj[pos].radioFrequency.id;
          radioFrequencyRangeObj.Lower = rfobj[pos].radioFrequency.lower;
          radioFrequencyRangeObj.Upper = rfobj[pos].radioFrequency.upper;
        }
      }
    }
    return radioFrequencyRangeObj;
  }catch(err)
  {
    console.log(err);
  }
}
function getConfigPowerSave(pos){
  try{
    const buttonel = document.querySelector(s_i_pwr + pos); 
    if(buttonel != null){
      if(buttonel.classList.contains(bggreen)){
        return true;
      }
    }
    return false;
  }catch(err)
  {
    console.log(err);
  }
}
function getConfigPowerRangeSave(pos){
  try{
    const buttonel = document.querySelector(m_i_icon_signal + pos); 
    if(buttonel != null){
      let signalClass = buttonel.classList;
      let res = signalClass[1][signalClass[1].length-1];
      return parseInt(res);
    }
  }catch(err)
  {
    console.log(err);
  }
}
function getConfigFrequencySave(pos){
  try{
    var arrProgress = [];
    var getFrequencyRangeSteps = getProgressBandSteps(pos);
    for (let i = 1; i <= getFrequencyRangeSteps; i++) {
      const buttonel = document.querySelector(`#${m_span_progress}${pos}_${i}`); 
      if(buttonel != null){
        if(buttonel.classList.contains(progressBarGreen)){
          arrProgress.push(i);
        }
      }
    } 
    const result  = CheckBandLength(pos,findContinuousNumbers(arrProgress));
    return result;
  }catch(err)
  {
    console.log(err);
  }
}
function ArraySplit(result, array2 ){
  var array1 = result;
  var newArray = [];
  var prev = 0;
  for(let i in array2){
    var index = array1.indexOf(array2[i]);
    if(index != prev && index != -1){
      newArray.push(array1.slice(prev,index));
      prev = index;
    }
  }
  newArray.push(array1.slice(prev));
  return newArray;
}
function CheckBandLength(pos,result){
  try{
    if(pos == 1 || pos == 2){
      return result;
    }
    if(pos == 3){
      var bandFrequencyArray = [43,85];
      return BuildArrayByElement(result, bandFrequencyArray);
    }
    else if(pos == 4){
      var bandFrequencyArray = [65,121];
      return BuildArrayByElement(result, bandFrequencyArray);
    }
   else if(pos == 5){
    var bandFrequencyArray = [43];
    return BuildArrayByElement(result, bandFrequencyArray);
    }
    return result;
  }catch(err){
    console.log(err);
  }
}
function BuildArrayByElement(result,bandFrequencyArray){
  try{
  var arrayResult = [];
  for(let i= 0; i < result.length;i++){
    var resultArray = ArraySplit(result[i], bandFrequencyArray);
      for(let i= 0;i < resultArray.length;i++){
        if(resultArray[i].length > 0){
        arrayResult.push(resultArray[i]);
        }
      }
    }
    return arrayResult;
  }catch(err){
    console.log(err);
  }
}
/*  CONFIG SAVE END */
/* CONFIG SCREEN END */
/* MAIN SCREEN BEGIN */
/* MAIN SCREEN NAV BAR BEGIN */

/* OpFill Selection Screen BEGIN*/
function mainScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        mainNavigation(navUpArrow);
        break;
      case "2":
        mainNavigation(navDownArrow);
        break;
      case "4":
        mainNavigation(navLeftArrow);
        break;
      case "6":
        mainNavigation(navRightArrow);
        break;
      case "5":
        onEnterMainScreen();
        break;
      case "U":
        getConfig();   
        break;	     
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}

function mainNavigation(arrowKey)
{
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }
    const MAX_TABLE_COLUMNS = 3;

    let pos = parseInt($(hdn_currentButton).val());  
    let prevPos = pos;
    
    switch(arrowKey)
    {
      case navRightArrow:
        (pos < MAX_TABLE_COLUMNS) ? pos++ : pos = MAX_TABLE_COLUMNS; //limit right
        $(hdn_currentButton).val(pos);
        break;
      case navLeftArrow:
        (pos > 1) ? pos-- : pos = 1; //limit left
        $(hdn_currentButton).val(pos);
        break;
      case navDownArrow:
        break;
      case navUpArrow:
        break;
    }
    highlightMainScreen(pos, prevPos);  //change button highlights

    if($(hdn_device_info_menu).val() == 1){
      DisplayDeviceInfo();  //clear device info pop up on any button press
    }
    
  }catch(err)
	{
		console.log(err);
	}
}

function highlightMainScreen(pos, prevPos)
{
  try{
    if(pos !== prevPos) //if previous element is highlighted, remove highlight
    {
      document.getElementById("m_btn_" + prevPos).classList.remove(btnfocus);
    }

    //add highlight to new button
    document.getElementById("m_btn_" + pos).classList.add(btnfocus);
  }catch(err)
  {
    console.log(err);
  }
}
function onEnterMainScreen(){
  try{
    if(document.getElementById("m_s_error").style.display !== 'none')
    {
      return; //block navigation when alarm present
    }

    let pos = $(hdn_currentButton).val();   

    switch(parseInt(pos))
    {
      case 1:
        if($(hdn_tx_unit).val() == 1){
          cssClass = btnalerthighlight  //alert colour, cannot change Op.Fill whilst transmitting

          document.getElementById('m_btn_' + pos).classList.add(btnalerthighlight)
          const changeButtonCSS = function() {
            document.getElementById('m_btn_' + pos).classList.remove(btnalerthighlight)
            let currPos = parseInt($(hdn_currentButton).val()); 
            highlightMainScreen(currPos, pos);
          }
          setTimeout(changeButtonCSS, 2000);  //change colour to show action
        }
        else
        {
          DisplayOpFill();
        }
        break
      case 2:
        if($(hdn_tx_unit).val() == 1){
          cssClass = btnalerthighlight  //alert colour, cannot change Op.Fill whilst transmitting

          document.getElementById('m_btn_' + pos).classList.add(btnalerthighlight)
          const changeButtonCSS = function() {
            document.getElementById('m_btn_' + pos).classList.remove(btnalerthighlight)
            let currPos = parseInt($(hdn_currentButton).val()); 
            highlightMainScreen(currPos, pos);
          }
          setTimeout(changeButtonCSS, 2000);  //change colour to show action
        }
        else
        {
          DisplayPassword(mainScreenPasswordText);
        }
        break;
      case 3:
        DisplayDeviceInfo();
        break;
    }
  }catch(err)
	{
		console.log(err);
	}
}

function DisplayOpFill(){
  try{
    if($(hdn_opFill_menu).val() == 0){
      $(m_s_opFill).show();
      $(hdn_opFill_menu).val(1);

      let prevPos = parseInt($(hdn_opFill_pos).val());
      let currOpSel = BuildOpFillNumber();
      highlightOpFillScreen(currOpSel, prevPos);
      $(hdn_opFill_pos).val(currOpSel); 
      document.getElementById("spinnerId").style.display = 'none';
      document.getElementById("mainScreen").style.filter = "blur(7px)";
    }
    else{
      $(m_s_opFill).hide();
      $(hdn_opFill_menu).val(0);
      document.getElementById("spinnerId").style.display = 'block';
      document.getElementById("mainScreen").style.filter = "blur(0px)";
    }
  }catch(err)
	{
		console.log(err);
	}
}

function DisplayDeviceInfo(){
  try{
    if($(hdn_device_info_menu).val() == 0){
      let configData = JSON.parse(configJsonArr);
      document.getElementById("spinnerId").style.display = 'none';
      document.getElementById("mainScreen").style.filter = "blur(7px)";
      document.getElementById("barcodeId").innerHTML = "Barcode: " + configData.Barcode;
      document.getElementById("versionId").innerHTML = "Version: " + configData.Version;
      document.getElementById("snId").innerHTML = "Serial Number: " + configData.SerialNumber;
      document.getElementById("softwareId").innerHTML = "Software: " + configData.UnitSoftware;

      $(m_s_deviceInfo).show();
      $(hdn_device_info_menu).val(1);
    }
    else{
      document.getElementById("spinnerId").style.display = 'block';
      document.getElementById("mainScreen").style.filter = "blur(0px)"; // remove blur
      $(m_s_deviceInfo).hide();
      $(hdn_device_info_menu).val(0);
    }
  }catch(err)
	{
		console.log(err);
	}
}
/* MAIN SCREEN NAV BAR END */
function setDestroy(data)
{
  try
  {
    if(data.body != null) {
     // $(hdn_password).val(data.body);
     //console.log(data.body);
     //onLoadSplashPage();
     //setTimeout(getConfig, 2000);
     //setTimeout(onLoadHomePage, 2000);
    }

  }catch(err)
	{
		console.log(err);
	}
}
function setPassword(data)
{
  try
  {
    if(data.body != null) {
      $(hdn_password).val(data.body);
    }

  }catch(err)
	{
		console.log(err);
	}
}
function setConfig(data)
{
  try
  {
    storeConfigJson(data)
    setConfigRadioFrequencyTitle();
    setBattery(data);
    DisplaycovertScreen(data); 
    DisplayBatteryScreen(data);
    if($(hdn_currentScreen).val() !== batteryScreenVal)  //no need to change these values if battery screen displayed
    {
      setTemperature(data);
      setTxModeOn(data);
      setTxUnitPowerRange(data,m_i_signal);
    }
  }catch(err)
	{
		console.log(err);
	}
}
function storeConfigJson(data){
  try{
    if(data != null) {
      configJsonArr = JSON.stringify(data);
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setTxModeOn(data)
{
  try
  {
    
    $(hdn_tx_unit).val(0); 
    if(data.IsTransmitting == true){
      $(hdn_tx_unit).val(1);
      if( (document.getElementById("m_s_password").style.display !== 'none') || 
          (document.getElementById("m_s_opFill").style.display !== 'none'))
      {
        $(m_s_opFill).hide();
        $(hdn_opFill_menu).val(0);
        $(m_s_password).hide();
        $(hdn_password_menu).val(0);
        document.getElementById("mainScreen").style.filter = "blur(0px)";
        document.getElementById("configScreen").style.filter = "blur(0px)";
        document.getElementById("batteryScreen").style.filter = "blur(0px)";
        document.getElementById("spinnerId").style.display = 'block'; 
      }
      if($(hdn_currentScreen).val() == configScreenVal) //if transmitting started, take user out of config menu
      {
        hidePopups();
        InitialiseMainScreen();
      }
    }
    setBandCss();    
    setBandPowerText();
    //console.log( 'IsUnit On : ' + data.IsUnitOn + ' Tx_Unit : ' +  $(hdn_tx_unit).val());
  }catch(err)
	{
		console.log(err);
	}
}
function setTemperature(data)
{
  try
  {
    for (let i = 0; i < data.RadioFrequencyPath.length; i++) {
      const buttonel = document.querySelector( m_span_temp + data.RadioFrequencyPath[i].Id); 
      if(buttonel != null){
        buttonel.innerText =`Temp: ${data.RadioFrequencyPath[i].Temperature}  \u00B0 C`;
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setBattery(data)
{
  try
  {
    DisplayBatteryPercentage(data, m_span_btr);
    // DisplayBatteryPercentage(data, b_span_btr);
    DisplayBattery(data, m_i_battery); 
    DisplayBatteryCharge(data);  
 
    DisplayAlarm(data);
  }catch(err)
	{
		console.log(err);
	}
}
function DisplayBatteryCharge(data){
  try
  {
    for (let i = 0; i < data.Battery.length; i++) 
    {
      let batteryPercentage = '';
      let calculateBatteryPercentage = Math.round(parseInt(data.Battery[i]));      
      

      if(data.BatteryCharging[i] === BatteryPresentCharging)
      {
        if(calculateBatteryPercentage === 100)
        {
          calculateBatteryPercentage = 99;  //do not show 100% if not finished chargign
        }
        batteryPercentage =  `--charge:${calculateBatteryPercentage};`;

        //change colour system and keep rotated
        document.getElementById("b_i_battery_" + [i + 1]).classList = getBatteryCssClassColour(calculateBatteryPercentage, 0) + " rotate";  
        document.querySelector(b_span_battery + [i + 1]).innerText =`${calculateBatteryPercentage}%`;
      } 
      else if(data.BatteryCharging[i] === BatteryPresentNotCharging)
      {
        batteryPercentage =  `--charge:${calculateBatteryPercentage};`;

        if(calculateBatteryPercentage > 98) //finished charging
        {
          document.getElementById("b_i_battery_" + [i + 1]).classList = batteryScreenFull + " rotate";
        }
        else  //not finished charging and not charging, error
        {
          document.getElementById("b_i_battery_" + [i + 1]).classList = batteryScreenNotCharging + " rotate";
        }
        
        document.querySelector(b_span_battery + [i + 1]).innerText =`${calculateBatteryPercentage}%`;
      }
      else if(data.BatteryCharging[i] === BatteryNotPresent)  //battery missing
      {
        batteryPercentage =  `--charge:0;`;
  
        
        document.getElementById("b_i_battery_" + [i + 1]).classList = batteryScreenNotPresent + " rotate";
        document.querySelector(b_span_battery + [i + 1]).innerText = '0%';
      }

      $('#b_i_battery_' + [i + 1]).attr("style",batteryPercentage);
      $('#b_i_batCharge_' + [i + 1]).attr("style",batteryPercentage);
    }
  }catch(err)
	{
		console.log(err);
	}
}
function DisplayBatteryPercentage(data, batteryElement){
  try{
    var a = data.Battery;
    var sum = a.reduce(function(a, b) { return parseInt(a) + parseInt(b); }, 0);
    const batteryPercentage = Math.round(sum/data.Battery.length);
    const batteryel = document.querySelector(batteryElement); 
    if(batteryel != null){
      batteryel.innerText =`${batteryPercentage}%`;
    }
  }catch(err)
	{
		console.log(err);
	}
}

function DisplayBattery(data, m_i_battery)
{
  try
  {
    //display external connected symbol
    document.getElementById("chargingIndicatorMainScreenId").style.visibility = (data.PowerSource == "EXT24V") ? "visible" : "hidden";

    for (let i = 0; i < data.Battery.length; i++) {
      let batteryPercentage = '';
      if(data.Battery[i] > 95)  //limit to 95 to stop overflow on battery appearance
      {
        batteryPercentage = "height:95%;";
      }
      else if(data.BatteryCharging[i] === BatteryNotPresent)  //make battery alert and empty
      {
        batteryPercentage = "height:0%;";
        document.getElementById("d_i_battery_" + [i + 1]).classList = getBatteryCssClassColour(0, 1);
        document.getElementById("m_i_battery_" + [i + 1]).classList = getBatteryCssClassColour(0, 2);
      }
      else{ //show value and colour
        batteryPercentage = `height:${data.Battery[i]}%;`;
        document.getElementById("d_i_battery_" + [i + 1]).classList = getBatteryCssClassColour(parseInt(data.Battery[i]), 1);
        document.getElementById("m_i_battery_" + [i + 1]).classList = getBatteryCssClassColour(parseInt(data.Battery[i]), 2);
      }
      $(m_i_battery + [i + 1]).attr("style",batteryPercentage); //apply percentage charge

      switch(data.BatteryCharging[i]) //display battery charging symbol
      {
        case BatteryPresentCharging: 
          document.getElementById("d_i_battery_charging_" + [i + 1]).style.display = "block"; 
          break; 
        case BatteryPresentNotCharging: 
        case BatteryNotPresent: 
          document.getElementById("d_i_battery_charging_" + [i + 1]).style.display = "none"; 
          break; 
        default:
          break;
      } 
    }
  }catch(err)
	{
		console.log(err);
	}
}

function DisplayBatteryScreen(data){
  try{
    if(data != null){
      if(data.IsConvertModeOn === false) //do not change from covert screen
      {
        if((data.IsUnitOn === false) && (data.PowerSource === "EXT24V"))  //condition to change to charging screen
        {
          $(hdn_batteryScreen).val(1);
          DisplayScreen(0,0,0,0,1);
        }
        //condition for charging screen false, if battery screen loaded and displayed, return to home screen
        else if(  (parseInt($(hdn_batteryScreen).val()) == 1) && 
                  ($(hdn_currentScreen).val() == batteryScreenVal)  )
        {
          $(hdn_batteryScreen).val(0);
          onLoadHomePage();
        }
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}

function DisplaycovertScreen(data){
  try{
    if(data != null){
      if(data.IsConvertModeOn)
      {
        if($(hdn_covert_menu).val() == 0)
        {
          DisplayMessage('Covert Mode');
          $(hdn_batteryScreen).val(0);
        }
        DisplayScreen(0,0,0,1,0);
      }
      else if($(hdn_currentScreen).val() == covertScreenVal || $(hdn_currentScreen).val() == 0)
      {
        $(hdn_covert_menu).val(0);
        onLoadHomePage();
      }
      return true;
    }
  }catch(err)
	{
		console.log(err);
	}
}

function covertScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        break;
      case "2":
        break;
      case "4":
        break;
      case "6":
        break;
      case "5":
        break;
      case "U":
        getConfig();  
        break;	     
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}

function DisplayMessage(message){
  try{
    if($(hdn_covert_menu).val() == 0){
      $(hdn_covert_menu).val(1);
      $(m_t_covert_span).text(message);
      $(m_s_covert).show();
      $(m_s_covert).delay(1000).hide(1);  
    }
  }catch(err)
	{
		console.log(err);
	}
}

function WarningAlertBlockTimeout()
{
  WarningAlertBlockTimer = 0;
}

function hidePopups() //hide pop ups when alarms are visibile, with priority to destroy
{
  if(document.getElementById("m_s_deviceInfo").style.display !== 'none')
  {
    $(m_s_deviceInfo).hide();
    $(hdn_device_info_menu).val(0);
  }
  else if(document.getElementById("m_s_opFill").style.display !== 'none')
  {
    $(m_s_opFill).hide();
    $(hdn_opFill_menu).val(0);
  }
  else if(document.getElementById("m_s_password").style.display !== 'none')
  {
    $(m_s_password).hide();
    $(hdn_password_menu).val(0);
  }
  else if(document.getElementById("m_s_frequency").style.display !== 'none')
  {
    $(m_s_frequency).hide();
    $(hdn_frequency_menu).val(0);
  }
}

const ALARMS_PER_PAGE = 3;
let activeAlarmRows = [];
let activeAlarmPage = 0;
let activeAlarmSignature = "";

function renderAlarmPage()
{
    const pageCount = Math.max(
        1,
        Math.ceil(activeAlarmRows.length / ALARMS_PER_PAGE)
    );

    activeAlarmPage = Math.max(
        0,
        Math.min(activeAlarmPage, pageCount - 1)
    );

    const list = document.getElementById("active_alarm_list");
    list.textContent = "";

    const start = activeAlarmPage * ALARMS_PER_PAGE;

    for (const alarm of activeAlarmRows.slice(start, start + ALARMS_PER_PAGE))
    {
        const row = document.createElement("div");
        row.className = "active-alarm-row";

        const board = document.createElement("strong");
        board.textContent = alarm.board +
            (alarm.address ? ` (${alarm.address})` : "");

        const description = document.createElement("div");
        description.textContent = alarm.description;

        row.appendChild(board);
        row.appendChild(description);
        list.appendChild(row);
    }

    document.getElementById("s_s_error_type_text").textContent =
        `ALARMS (${activeAlarmRows.length})`;

    document.getElementById("s_s_error").style.display = "none";
    list.style.display = "block";

    const page = document.getElementById("active_alarm_page");
    page.style.display = "block";
    page.textContent = pageCount > 1
        ? `Page ${activeAlarmPage + 1}/${pageCount} — Up/Down`
        : "";
}

function updateAlarmList(data)
{
    const rows = Array.isArray(data.ActiveAlarms) && data.ActiveAlarms.length
        ? data.ActiveAlarms
        : [{
            id: "fallback",
            board: "Controller",
            address: null,
            description: data.UnitOverallAlarmType || "Unit Fault"
        }];

    const signature = JSON.stringify(rows);

    if (signature !== activeAlarmSignature)
    {
        activeAlarmPage = 0;
        activeAlarmSignature = signature;
    }

    activeAlarmRows = rows;
    renderAlarmPage();
}

function hideAlarmList()
{
    activeAlarmRows = [];
    activeAlarmPage = 0;
    activeAlarmSignature = "";

    document.getElementById("active_alarm_list").style.display = "none";
    document.getElementById("active_alarm_page").style.display = "none";
    document.getElementById("s_s_error").style.display = "flex";
}

function handleAlarmNavigation(key)
{
    if (key !== "8" && key !== "2") return false;
    if (activeAlarmRows.length === 0) return false;

    if (document.getElementById("m_s_error").style.display === "none")
        return false;

    if (document.getElementById("m_s_confirm").style.display !== "none")
        return false;

    activeAlarmPage += key === "8" ? -1 : 1;
    renderAlarmPage();
    return true;
}

function DisplayAlarm(data){
  try{
    narrowSweepAlertVisible = false;
    if(data != null)
    {
      const chargingOnly = data.IsUnitOn === false && data.PowerSource === "EXT24V";
      
      if((data?.IsConvertModeOn === true || chargingOnly) && !data.SweepNarrowAlert){
        $(m_s_error).hide();

        document.getElementById("mainScreen").style.filter = "blur(0px)";
        document.getElementById("configScreen").style.filter = "blur(0px)";
        document.getElementById("batteryScreen").style.filter = "blur(0px)";
        document.getElementById("spinnerId").style.display = "block";
        return;
      }

      if(!data.UnitOverallAlarm){
        hideAlarmList();
      }

      if(document.getElementById("m_s_confirm").style.display === 'none') //give priority to destroy pop up
      {
        //if warning cleared within last 30s, don't display warning.
        if((!data.UnitOverallWarning) && 
          (document.getElementById("m_s_error").style.display !== 'none') && 
          (document.getElementById("s_s_error_type_text").innerHTML === "WARNING"))
        {
          //check last state was a warning which is now cleared, start the timer.
          WarningAlertBlockTimer = 1;
          setTimeout(WarningAlertBlockTimeout, 600000);
        }
        
        if(data.UnitOverallAlarm)
        {
          hidePopups();
          $(m_s_error).show();
          // $(s_s_error_type_text).text("ALARM");
          // $(s_s_error).text(data.UnitOverallAlarmType);
          updateAlarmList(data);
          $(m_s_error).removeClass(warningmessage); 
          $(m_s_error_type).removeClass(warningmessagealarm); 
          $(m_s_error_type).addClass(errormessagealarm);  
          document.getElementById("mainScreen").style.filter = "blur(7px)";
          document.getElementById("configScreen").style.filter = "blur(7px)";
          document.getElementById("batteryScreen").style.filter = "blur(7px)";
          document.getElementById("spinnerId").style.display = 'none';  
        }
        else if (data.SweepNarrowAlert?.code === 130)
        {
            narrowSweepAlertVisible = true;
            hidePopups();
            $(m_s_error).show();

            $(s_s_error_type_text).text("WARNING");
            $(s_s_error).text(data.SweepNarrowAlert.text);

            $(m_s_error).removeClass(warningmessage);
            $(m_s_error_type).removeClass(warningmessagealarm);
            $(m_s_error_type).addClass(errormessagealarm);

            document.getElementById("mainScreen").style.filter = "blur(7px)";
            document.getElementById("configScreen").style.filter = "blur(7px)";
            document.getElementById("batteryScreen").style.filter = "blur(7px)";
            document.getElementById("spinnerId").style.display = "none";
        }
        else if((data.UnitOverallWarning) && (WarningAlertBlockTimer === 0))
        {
          hidePopups();
          $(m_s_error).show();
          $(s_s_error_type_text).text("WARNING");
          $(s_s_error).text(data.UnitOverallWarningType);
          $(m_s_error).addClass(warningmessage); 
          $(m_s_error_type).removeClass(errormessagealarm);
          $(m_s_error_type).addClass(warningmessagealarm); 
          document.getElementById("mainScreen").style.filter = "blur(7px)";
          document.getElementById("configScreen").style.filter = "blur(7px)";
          document.getElementById("batteryScreen").style.filter = "blur(7px)";
          document.getElementById("spinnerId").style.display = 'none'; 
        }
        else
        {
          if(document.getElementById("m_s_error").style.display !== 'none')
          {
            document.getElementById("mainScreen").style.filter = "blur(0px)";
            document.getElementById("configScreen").style.filter = "blur(0px)";
            document.getElementById("batteryScreen").style.filter = "blur(0px)";
            document.getElementById("spinnerId").style.display = 'block'; 
            $(m_s_error).hide();
          }
        }
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function DisplayConfirm(){
  try{
    if(document.getElementById("m_s_error").style.display !== 'none') //hide alarm, give priority to destroy
    {
      $(m_s_error).hide();
    }

    if($(hdn_confirm_menu).val() == 0){
      $(m_s_confirm).show();
      $(hdn_confirm_menu).val(1);
      document.getElementById("mainScreen").style.filter = "blur(7px)";
      document.getElementById("configScreen").style.filter = "blur(7px)";
      document.getElementById("batteryScreen").style.filter = "blur(7px)";
      document.getElementById("spinnerId").style.display = 'none';  

      document.getElementById("batteryScreenContainer").style.display = 'none';
    }
    else{
      $(m_s_confirm).hide();
      $(hdn_confirm_menu).val(0);
      document.getElementById("mainScreen").style.filter = "blur(0px)";
      document.getElementById("configScreen").style.filter = "blur(0px)";
      document.getElementById("batteryScreen").style.filter = "blur(0px)";
      document.getElementById("spinnerId").style.display = 'block';

      document.getElementById("batteryScreenContainer").style.display = 'block';
    }
  }catch(err)
	{
		console.log(err);
	}
}
function DisplayPassword(text){
  try{
    if($(hdn_password_menu).val() == 0){
      if($(hdn_currentScreen).val() == configScreenVal)
      {
        handlePasswordBoxFormat("passwordNew");
        document.getElementById("configScreen").style.filter = "blur(7px)";
      }
      else if($(hdn_currentScreen).val() == mainScreenVal)
      {
        handlePasswordBoxFormat("passwordEnter");
        document.getElementById("spinnerId").style.display = 'none';
        document.getElementById("mainScreen").style.filter = "blur(7px)";
      }
      $(hdn_password_pos).val(1);
      textPasswordNonHighlight();
      textPasswordHighlight(1);
      setPasswordText(text);
      $(m_s_password).show();
      $(hdn_password_menu).val(1);
     
    }
    else{
      $(m_s_password).hide();
      $(hdn_password_menu).val(0);
      document.getElementById("configScreen").style.filter = "blur(0px)";
      document.getElementById("mainScreen").style.filter = "blur(0px)";
      document.getElementById("spinnerId").style.display = 'block';
    }
  }catch(err)
	{
		console.log(err);
	}
}
function DisplayFrequency(pos){
  try{
    document.querySelector(m_s_frequency_title).innerText = `Band Sweep Range: ${minFrequencies[pos]}-${maxFrequencies[pos]}MHz`;//setRadioFrequencyTitle(pos);
    
    if($(hdn_frequency_menu).val() == 0){
      
      let prevColPos = parseInt($(hdn_frequency_col_pos).val());
      let prevRowPos = parseInt($(hdn_frequency_row_pos).val());
      $(hdn_frequency_row_pos).val(1);
      $(hdn_frequency_col_pos).val(1);
      frequencyElementHighlight(1, 1, prevRowPos, prevColPos); 
      fillFrequencyScreenValue(pos);
      $(m_s_frequency).show();
      $(hdn_frequency_menu).val(1);
      hideLeadingZerosFrequencyScreen();
    }
    else{
      $(m_s_frequency).hide();
      $(hdn_frequency_menu).val(0);
    }
  }catch(err)
	{
		console.log(err);
	}
}
function checkPassword(){
  try{
    return ($(hdn_password).val() == getcurrentpassword());
  }catch(err)
	{
		console.log(err);
	}
}
function getcurrentpassword(){
  try{
    var arrPassword = [];
    for (let i = 1; i <= 6; i++) {
     arrPassword.push($(m_t_password + i).val());
    }
    return arrPassword.join("");
  }catch(err)
	{
		console.log(err);
	}
}
function getBatteryCssClassColour(percentage, screen)
{
  // var x = parseInt(power);
  try
  {
    
    if(percentage >= 20 && percentage < 100)
    {
      if(screen === 1)
      {
        return batteryEskan;
      }
      else if(screen === 2)
      {
        return batteryLevel;
      }
      else
      {
        return batteryScreenCharging;
      }
      
    }
    else if(percentage >= 10 && percentage < 20)
    {
      if(screen === 1)
      {
        return batteryEskanWarn;
      }
      else if(screen === 2)
      {
        return batteryLevelWarn;
      }
      else
      {
        return batteryScreenWarning;
      }
    }
    else if(percentage === 100)
    {
      if(screen === 1)
      {
        return batteryEskan;
      }
      else if(screen === 2)
      {
        return batteryLevel;
      }
      else
      {
        return batteryScreenFull;
      }
    }
    else
    {
      if(screen === 1)
      {
        return batteryEskanError;
      }
      else if(screen === 2)
      {
        return batteryLevelError;
      }
      else
      {
        return batteryScreenEmpty;
      }
    }
  }catch(err)
  {
    console.log(err);
  }  
}
function getBatteryCssClass(power)
{
  var x = parseInt(power);
  try
  {
    switch (true) {
      case (power >= 80 && power <= 100):
        return  batteryFull;
      case (power >= 20 && power < 80):
          return batteryHalf;

        default:
          return batteryEmpty;
    }
  }catch(err)
  {
    console.log(err);
  }  
}
function batteryScreenMenuNavBar(navKey)
{
	try{
    switch (navKey) {
      case "8":
        break;
      case "2":
        break;
      case "4":
        break;
      case "6":
        break;
      case "5":
        break;
      case "U":
        getConfig();
        break;	     
      case "D":
        onDestroy();
        break;		        		
		}
	}catch(err)
	{
		console.log(err);
	}
}
function SetOpFillData(data)
{
  try{

    /****************** 
    Input data that can be used for testing
       
    var obj = RadioFrequencyObject();
    data = obj[0];
     ********************/

    setBand(data);
    setUnitPower(data); 
    setUnitPowerRange(data,m_i_signal);
    setUnitPowerRange(data,m_i_icon_signal);
    setPowerBand(data);
    for (let i = 0; i < data.RadioFrequencyPath.length; i++) {
      setFrequencyBand(data.RadioFrequencyPath[i].FrequencyRange, data.RadioFrequencyPath[i].Id);
      radioFreqObj[i].subbands = data.RadioFrequencyPath[i].FrequencyRange;
      radioFreqObj[i].FrequencyStep = data.RadioFrequencyPath[i].FrequencyStep ?? 10000;
      radioFreqObj[i].RampRate = data.RadioFrequencyPath[i].RampRate ?? 20;
    }
    globalModulationEnabled = data.ModulationEnabled === true;
    modulationEnabledByPath = data.RadioFrequencyPath.map(path => path.ModulationEnabled === true);
    showModulationButton();
  }catch(err)
	{
		console.log(err);
	}
}
function setFrequencyBand(data, band){
  try{
    if(minFrequencies.length === 0) //not got the data ready yet
    {
      return;
    }
    for(let subband = 1; subband <= 6; subband++){
      if(subband <= data.length)  //data length defines how many subbands
      {
        let lower = Math.round((data[subband-1].Lower/1000) - minFrequencies[band-1]); //sub band start frequency index
        let upper = Math.round((data[subband-1].Upper/1000) - minFrequencies[band-1]);  //sub band stop frequency index
        setProgressFrequencyBand(navUpArrow, subband, band, lower, upper);
      }
      else  //hide unused bands
      {
        setProgressFrequencyBand(navDownArrow, subband, band, 0, 0);
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}

function setPowerBand(data)
{
  try
  {
    for (let i = 0; i < data.RadioFrequencyPath.length; i++) {
      const buttonel = document.querySelector(s_i_pwr + data.RadioFrequencyPath[i].Id); 
      if(buttonel != null){
        buttonel.classList.remove(titlefont18);
        buttonel.classList.remove(bggreen);
        buttonel.classList.remove(bggrey);
        buttonel.classList.add(titlefont18);
        if(data.RadioFrequencyPath[i].IsPathOn){
          buttonel.classList.add(bggreen);
        }
        else{
          buttonel.classList.add(bggrey);
        }
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setBand(data)
{
  try
  {
    for (let i = 0; i < data.RadioFrequencyPath.length; i++) {
      const buttonel = document.querySelector(m_span_pwr + data.RadioFrequencyPath[i].Id); 
      if(buttonel != null){
        $(buttonel).attr("data-value",data.RadioFrequencyPath[i].IsPathOn);
        if(data.RadioFrequencyPath[i].IsPathOn){
          buttonel.classList.remove(bggrey);
            if($(hdn_tx_unit).val() == 1){
              buttonel.classList.add(bggreen);
            }
            else {
              buttonel.classList.add(bgblue);
            }
        }
        else{
          buttonel.classList.remove(bggreen);
          buttonel.classList.remove(bgblue);
          buttonel.classList.add(bggrey);
        }
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setBandCss()
{
  try
  {
    for (let i = 1; i < 8; i++) {
      const buttonel = document.querySelector(m_span_pwr + i); 
      if(buttonel != null){
        buttonel.classList.remove(bggrey);
        buttonel.classList.remove(bggreen);
        buttonel.classList.remove(bgblue);
        if($(buttonel).attr('data-value') == 'true'){
          if($(hdn_tx_unit).val() == 1)  {
          buttonel.classList.add(bggreen);
          }
          else{
          buttonel.classList.add(bgblue);
          }
        }
        else{
          buttonel.classList.add(bggrey);
        }
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setBandPowerText()
{
  try
  {
    for (let i = 1; i < 8; i++) {
      const buttonel = document.querySelector(m_span_power + i); 
      if(buttonel != null){
        if($(hdn_tx_unit).val() == 1){
          if($(buttonel).attr('data-value') == 'true'){
            buttonel.innerText ='Power: ON';
          }
          else{
            buttonel.innerText ='Power: OFF';
          }
        }
        else{
          buttonel.innerText ='Power: OFF';
        }
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}
function setUnitPower(data)
{
    try
    {
      for (let i = 0; i < data.RadioFrequencyPath.length; i++) {
        const buttonel = document.querySelector(m_span_power + data.RadioFrequencyPath[i].Id); 
        if(buttonel != null){
          $(buttonel).attr("data-value",data.RadioFrequencyPath[i].IsPathOn);
          if($(hdn_tx_unit).val() == 1){
            buttonel.innerText =`Power: ${data.RadioFrequencyPath[i].IsPathOn ? "ON" : "OFF"}`;
          }
          else{
            buttonel.innerText ='Power: OFF';
          }
        }
      }
    }catch(err)
    {
      console.log(err);
    }  
}

// function setConfigRadioFrequencyTitle(){
//   try{
//     let obj = JSON.parse(configJsonArr);
//     if(obj !== null)
//     {
//       if (obj.hasOwnProperty(keyRadioFrequencyPath)) {
//         let radioFrequencyObject =  obj[keyRadioFrequencyPath];
//         for(let radioFrequencyKey in radioFrequencyObject)
//         {
//           let frequencyRangeObj = radioFrequencyObject[radioFrequencyKey][keyfrequencyRange]; 
//           minFrequencies[radioFrequencyKey] = frequencyRangeObj[0][lower]/1000;
//           maxFrequencies[radioFrequencyKey] = frequencyRangeObj[0][upper]/1000;
//           document.querySelector(m_span_title + radioFrequencyObject[radioFrequencyKey][keyId]).innerText = `${frequencyRangeObj[0][lower]/1000} - ${frequencyRangeObj[0][upper]/1000} ${mhz}`;
//           bandSpanWidth[radioFrequencyKey] = maxFrequencies[radioFrequencyKey]-minFrequencies[radioFrequencyKey];
//         }
//       }
//     }
//   } 
//   catch(err) {
//     console.log(err);
//   }
// }

function setConfigRadioFrequencyTitle() {
  try {
    const obj = JSON.parse(configJsonArr);
    if (!obj?.RadioFrequencyPath) return;

    for (const radioFrequencyKey in obj.RadioFrequencyPath) {
      const path = obj.RadioFrequencyPath[radioFrequencyKey];
      const frequencyRangeObj = path.FrequencyRange;

      minFrequencies[radioFrequencyKey] = frequencyRangeObj[0].Lower / 1000;
      maxFrequencies[radioFrequencyKey] = frequencyRangeObj[0].Upper / 1000;
      bandSpanWidth[radioFrequencyKey] =
        maxFrequencies[radioFrequencyKey] - minFrequencies[radioFrequencyKey];

      const mode = obj.DdsModulationReadback?.[Number(radioFrequencyKey)];
      // const modLabel =
      //   mode === 2 ? "MODN" :
      //   mode === 0 ? "No MODN" :
      //   "MODN unknown";

      const modLabel = 
        mode === 2 ? "(Mod)" : 
        mode === 0 ? "" : "(Mod ?)";

      document.querySelector(m_span_title + path.Id).innerText =
        `${minFrequencies[radioFrequencyKey]} - ` +
        `${maxFrequencies[radioFrequencyKey]} ${mhz} ${modLabel}`;
    }
  } catch (err) {
    console.log(err);
  }
}

function setRadioFrequencyTitle(pos){
  try{
    let obj = JSON.parse(configJsonArr);
    
    if(obj !== null)
    {
      if (obj.hasOwnProperty(keyRadioFrequencyPath)) {
        let radioFrequencyObject =  obj[keyRadioFrequencyPath];
        let frequencyRangeObj = radioFrequencyObject[pos][keyfrequencyRange]; 
        return `${frequencyRangeObj[0][lower]/1000} - ${frequencyRangeObj[0][upper]/1000} ${mhz}`;
      }
    }
  } 
  catch(err) {
    console.log(err);
  }
}
function setUnitPowerRange(data, signal)
{
    try
    {
      for (let i = 0; i < data.RadioFrequencyPath.length; i++) {
        const buttonel = document.querySelector(signal + [i + 1]); 
        if(buttonel != null){
          var powerRangeCss = `signal-${data.RadioFrequencyPath[i].Power}`;
          try
          {
            buttonel.classList.remove("signal-0");
            buttonel.classList.remove("signal-1");
            buttonel.classList.remove("signal-2");
            buttonel.classList.remove("signal-3");
            buttonel.classList.remove("signal-4");
            buttonel.classList.remove("signal-5");
            buttonel.classList.remove("signal-6");
            buttonel.classList.remove("signal-7");
            buttonel.classList.add(powerRangeCss);
            // if($(hdn_tx_unit).val() == 1){
            //   $(buttonel).children().addClass('signal-yellow');
            // }else
            // {
            //   $(buttonel).children().addClass('signal-blue');
            // }
          }catch(err)
          {
            console.log(err);
          } 
          // console.log($(hdn_tx_unit).val());
          // if($(hdn_tx_unit).val() == 1){
          //   buttonel.classList.add('signal-yellow');
          // }

          // var myArray = document.querySelector(buttonel).querySelectorAll('span');
          // myArray.forEach(function(item){
          //   item.classList.remove('signal-yellow');
          //  });
        }
      }
    }catch(err)
    {
      console.log(err);
    }  
}
function setTxUnitPowerRange(data, signal)
{
    try
    {
      for (let i = 1; i < 8; i++) {
        const buttonel = document.querySelector(signal + [i]); 
        if(buttonel != null){
          try
          {
            if(data.IsTransmitting == true){
              $(buttonel).children().removeClass('signal-blue');
              $(buttonel).children().addClass('signal-yellow');
            }
            else
            {
              $(buttonel).children().removeClass('signal-yellow');
              $(buttonel).children().addClass('signal-blue');
            }
          }catch(err)
          {
            console.log(err);
          } 
        }
      }
    }catch(err)
    {
      console.log(err);
    }  
}
/* MAIN SCREEN END */
/* COMMON TAMARUS FUNCTION BEGIN  */

let pixelCheckScreenState = 0;
function pixelCheckScreen()
{
	if(pixelCheckScreenState === 0) 
  {
    document.getElementById("pixelCheckId").style.backgroundColor = '#ffffff';
		pixelCheckScreenState++;
    setTimeout(pixelCheckScreen, 5000);
	}
	else if(pixelCheckScreenState === 1)
	{
    document.getElementById("pixelCheckId").style.backgroundColor = '#000000';
		pixelCheckScreenState++;
    setTimeout(pixelCheckScreen, 5000);
	}
  else if(pixelCheckScreenState === 2)
	{
    document.getElementById("pixelCheckId").style.backgroundColor = '#ff0000';
		pixelCheckScreenState++;
    setTimeout(pixelCheckScreen, 5000);
	}
  else if(pixelCheckScreenState === 3)
	{
    document.getElementById("pixelCheckId").style.backgroundColor = '#00ff00';
		pixelCheckScreenState++;
    setTimeout(pixelCheckScreen, 5000);
	}
  else if(pixelCheckScreenState === 4)
	{
    document.getElementById("pixelCheckId").style.backgroundColor = '#0000ff';
		pixelCheckScreenState++;
    setTimeout(pixelCheckScreen, 5000);
	}
  else
  {
    document.getElementById("pixelCheckId").style.backgroundColor = '#ffffff';  
    document.getElementById("pixelCheckId").style.display = 'none';
    pixelCheckScreenState = 0;
  }
}

function getCurrentScreenNavBar(navKey){
  try{
    if (navKey === "5" && narrowSweepAlertVisible &&
    document.getElementById("m_s_error").style.display !== "none" &&
    document.getElementById("m_s_confirm").style.display === "none")
    {
      if (!narrowSweepAckPending) {
          narrowSweepAckPending = true;
          sendMessage({
              type: "PUT",
              command: "user/ackNarrowSweepAlert",
              body: {}
          });
      }
    return;
    }
    
    else if(navKey === "P")
    {
      pixelCheckScreenState = 0;
      document.getElementById("pixelCheckId").style.display = 'block';
      setTimeout(pixelCheckScreen, 5000);
    }
    else
    {
      if($(hdn_confirm_menu).val() == 1){
        confirmScreenMenuNavBar(navKey);
        return;
      }
      if($(hdn_frequency_menu).val() == 1){
        frequencyScreenMenuNavBar(navKey);
        return;
      }  
      else if($(hdn_opFill_menu).val() == 1)
      {
        OpFillScreenMenuNavBar(navKey);
        return;
      }  
      if($(hdn_password_menu).val() == 1){
        paswordScreenMenuNavBar(navKey);
        return;
      }
      if($(hdn_currentScreen).val() == configScreenVal)
      {
        configScreenMenuNavBar(navKey);
      }
      else if($(hdn_currentScreen).val() == mainScreenVal)
      {
        mainScreenMenuNavBar(navKey);
      }
      else if($(hdn_currentScreen).val() == covertScreenVal)
      {
        covertScreenMenuNavBar(navKey);
      }
      else if($(hdn_currentScreen).val() == batteryScreenVal)
      {
        batteryScreenMenuNavBar(navKey);
      }
    }
  }catch(err)
	{
		console.log(err);
	}
}

function InitialiseSplashScreen()
{
    DisplayScreen(1,0,0,0,0);
}
function setPasswordText(text)
{
  var buttonelName = m_t_password_span;
  const buttonel = document.querySelector(buttonelName); 	
  if(buttonel != 'undefined'){
    buttonel.innerHTML = text;
  }
}
function InitialiseMainScreen()
{
  DisplayScreen(0,1,0,0,0);
  getCurrentOpfill();
  getPassword();
}
function InitialiseConfigScreen()
{
    DisplayScreen(0,0,1,0,0);
    setConfigRadioFrequencyTitle();  
    getCurrentOpfill();

    //input the title operation fill
    document.querySelector(configOpFillCurrent).innerHTML = document.querySelector(opFillSelElementName).innerHTML; 	

    configElementHighlight(1,borderyellow);    
}

function DisplayScreen(initScreenValue,mainScreenValue,configScreenValue,covertScreenValue,batteryScreenValue){
	
	  $(initScreen).hide();
    $(mainScreen).hide();
    $(configScreen).hide();
    $(covertScreen).hide();
    $(batteryScreen).hide();

    if(initScreenValue === 1){
	  $(initScreen).show();
		$(hdn_currentScreen).val(initScreenVal);
	}

	if(mainScreenValue === 1){
	    $(mainScreen).show();
	    $(hdn_currentScreen).val(mainScreenVal);

      $(hdn_currentButton).val(1);
      document.getElementById("m_btn_1").classList.add(btnfocus)
	}

	if(configScreenValue === 1){
	    $(configScreen).show();
	    $(hdn_currentScreen).val(configScreenVal);
	}

  if(covertScreenValue === 1){
    $(covertScreen).show();
    $(hdn_currentScreen).val(covertScreenVal);
  }

  if(batteryScreenValue === 1){
    $(batteryScreen).show();
    $(hdn_currentScreen).val(batteryScreenVal);
  }
}
function receivedSocketMessage(message){
  try{
    if(isEmpty(message)){
        return;
    }
    if(isEmpty(message.command)){
      return;
    }
    var cmd = GetCommand(message.command);
    switch (cmd) {
      case configCommand:
        setConfig(message.body);
      break;
      case currentOpFillCommand:
        CurrentOpfillMessageCommand(message);    
      break;
      case opFillCommand:
        receivedSocketMessageCommand(message);    
      break;
      case passwordVerifyCommand:
        setPassword(message);
      break;
      case destroyCommand:
        console.log(message); 
      break;
      case "uploadOpFill":
      if ($(hdn_opFill_menu).val() == 1) {
        DisplayOpFill();
      }

      if (message.code !== 202) {
        document.getElementById("responseData").textContent =
          typeof message.body === "string"
            ? message.body
            : "OpFill change failed";
      }

      getCurrentOpfill();
      break;
      // case 5:
      //   console.log(message);    
      // break;                
    case "ackNarrowSweepAlert":
        narrowSweepAckPending = false;
        if (message.code === 200) {
            getConfig(); // Fetch the next latched alert, or clear the popup.
        } else {
            console.log("Could not acknowledge narrow-sweep alert", message);
        }
        break;
      case 7:
        console.log(message);    
      break;
    }
  }catch(err)
	{
		console.log(err);
	}
}
function CurrentOpfillMessageCommand(message)
{
  try{
    if(isEmpty(message.body.OpFill)){
      return;
    }

    if(isEmpty(message.body.OpFill.Id)){
      return;
    }

    if(isEmpty(message.body.CurrentOpFill)){
      return;
    }

    document.getElementById("opFillSelection").innerHTML = "Op.Fill " + message.body.CurrentOpFill;  
    $(hdn_opFill_pos).val(message.body.CurrentOpFill); 
    SetOpFillData(message.body.OpFill); 
  }catch(err)
	{
		console.log(err);
	}
}
function receivedSocketMessageCommand(message)
{
  try{
    if(isEmpty(message.body.OpFill)){
      return;
    }

    if(isEmpty(message.body.OpFill.Id)){
      return;
    }

    if(isEmpty(message.body.CurrentOpFill)){
      return;
    }

    document.getElementById("opFillSelection").innerHTML = "Op.Fill " + message.body.CurrentOpFill;  
    $(hdn_opFill_pos).val(message.body.CurrentOpFill); 
    SetOpFillData(message.body.OpFill); 
  }catch(err)
	{
		console.log(err);
	}
}
function onConfig(){
  InitialiseConfigScreen();
}
function onLoadHomePage() {
  InitialiseMainScreen();
  //InitialiseConfigScreen();
}
function onLoadSplashPage() {
  InitialiseSplashScreen();
}
function onUpload(){
  try{
    var str = document.querySelector(opFillSelElementName).innerHTML;
    let res = str[str.length-1];
    putUploadOpFill(res);
  }catch(err)
	{
		console.log(err);
	}
}
function onDestroy()
{
  try{
    confirmSettingsNonHighlight();
    $(hdn_confirm_pos).val(1);
    DisplayConfirm();
    confirmSettingsHighlight(1);
  }catch(err)
	{
		console.log(err);
	}
}
function onDestroyConfirm()
{
  try{
    putDestroyConfirm();
    DisplayConfirm();
    // $(hdn_batteryScreen).val(0);
    onLoadSplashPage();
    if(parseInt($(hdn_batteryScreen).val()) === 1)
    {
      setTimeout(inialiseBatteryScreen, 2000);
      $(hdn_batteryScreen).val(1);
    }
    else
    {
      setTimeout(onLoadHomePage, 2000);
    }
    
  }catch(err)
	{
		console.log(err);
	}
}

function inialiseBatteryScreen()
{
  DisplayScreen(0,0,0,0,1);
}
window.onload = function() {
  setTimeout(getConfig, 2000);
  //setTimeout(onConfig, 2000);
  setInterval(getConfig, 5000);
};
/* COMMON TAMARUS FUNCTION END  */
/* COMMON FUNCTION BEGIN  */
function GetCommand(command)
{
  try{
    var commandArray=command.toString().split("/");
    if(commandArray.length > 1){
       return commandArray[commandArray.length - 1];
    }
    return command;
  }catch(err)
	{
		console.log(err);
	}
}
function isEmpty(value) {
  return (
    // null or undefined
    (value == null) ||

    // has length and it's zero
    (value.hasOwnProperty('length') && value.length === 0) ||

    // is an Object and has no keys
    (value.constructor === Object && Object.keys(value).length === 0)
  )
}
function setMenuNav(currentPos){
  try{
    let obj = JSON.parse(configJsonArr);
    if(obj !== null)
    {
      if (obj.hasOwnProperty(keyRadioFrequencyPath)) {
        let radioFrequencyObject =  obj[keyRadioFrequencyPath];
        return parseInt(1 + radioFrequencyObject.length + configMenuNumberButton) + (currentPos - 1) * 2;;
      }
    } 
  }catch(err)
	{
		console.log(err);
	}
}

function getConfigMenuNavElementName(){
  
  if($(hdn_currentConfigMenu).val() == configSignalButton){
    return configSignalButtonElementName;
  }
  else if($(hdn_currentConfigMenu).val() == configPowerButton){
    return configPowerButtonElementName;
  }
}
function getMenuSignalNav(currentPos){
  try{
    let obj = JSON.parse(configJsonArr);
    if(obj !== null)
    {
      if (obj.hasOwnProperty(keyRadioFrequencyPath)) {
        let radioFrequencyObject =  obj[keyRadioFrequencyPath];
        return Math.ceil((currentPos - parseInt(radioFrequencyObject.length + configMenuNumberButton))/2);
      }
    } 
  }catch(err)
	{
		console.log(err);
	}
}
function findContinuousNumbers(arr) {
  // Remove duplicates and sort the array
  const sortedArray = Array.from(new Set(arr)).sort((a, b) => a - b);
  const continuousSequences = [];
  let currentSequence = [];
  for (let i = 0; i < sortedArray.length; i++) {
      // If it's the start of a new sequence or a continuation of the current sequence
      if (i === 0 || sortedArray[i] === sortedArray[i - 1] + 1) {
          currentSequence.push(sortedArray[i]);
      } else {
          // If the current sequence has ended, push it to the result
          if (currentSequence.length > 0) {
              continuousSequences.push(currentSequence);
          }
          // Start a new sequence
          currentSequence = [sortedArray[i]];
      }
  }
  // Push the last sequence if it exists
  if (currentSequence.length > 0) {
      continuousSequences.push(currentSequence);
  }

  return continuousSequences;
}
function splitArrayByElement(arr, element) {
  const exists = arr.includes(element);

  if (!exists) {
      return [arr, []]; // If the element doesn't exist, return the original array and an empty array
  }

  const index = arr.indexOf(element);
  const before = arr.slice(0, index); // Elements before the specified element
  const after = arr.slice(index + 1);  // Elements after the specified element

  return [before, after];
}
function onClicknavButton(value)
{
    try{
       getCurrentScreenNavBar(value);
    }catch(err)
	{
		console.log(err);
	}
}
/* COMMON FUNCTION END  */
/* CLASSES BEGIN */
class RadioFrequency {
  constructor(id, lower, upper) {
    this.Id = id;
    this.Lower = lower;
    this.Upper = upper;
  }
}

function RadioFrequencyObject(){
  try{
    var obj = [
      {
        "Id": 1,
        "RadioFrequencyPath": [
          {
            "Id": 1,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 20000,
                "Upper": 250000
              }
            ]
          },
          {
            "Id": 2,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 240000,
                "Upper": 480000
              }
            ]
          },
          {
            "Id": 3,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 880000,
                "Upper": 960000
              }
            ]
          },
          {
            "Id": 4,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 1200000,
                "Upper": 1660000
              }
            ]
          },
          {
            "Id": 5,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 1800000,
                "Upper": 1880000
              }
            ]
          },
          {
            "Id": 6,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 2110000,
                "Upper": 2190000
              }
            ]
          },
          {
            "Id": 7,
            "Power": 0,
            "IsPathOn": false,
            "Mode": "Sweep",
            "FrequencyRange": [
              {
                "Id": 1,
                "Lower": 2400000,
                "Upper": 2690000
              }
            ]
          }
        ]
      }
    ];
    return obj;
  }
  catch(err){

  }
}

/* CLASSES END */