/* ===============================================
            888      d888   .d8888b.   .d8888b.
            888     d8888  d88P  Y88b d88P  Y88b
            888       888  Y88b. d88P 888    888
    8888b.  88888b.   888   "Y88888"  888    888
       "88b 888 "88b  888  .d8P""Y8b. 888    888
   .d888888 888  888  888  888    888 888    888
   888  888 888 d88P  888  Y88b  d88P Y88b  d88P
   "Y888888 88888P" 8888888 "Y8888P"   "Y8888P"

    Date        : 2015-12-11
    Author      : Hunjae Jung
    Description : Unified Deeplinking Core Source


    1. 딥링킹 리다이렉트 소스 통합
    2. 통계 소스 통합
    3. 쿠키 소스(사용자 관리) 통합
=================================================*/

$airbridge = (function(window) {
    // 1. deeplinking redirect function
    // 2. send stats function
    // 3. user cookie function

    var ab = {};

    /* ===============================================
     *  Initial values
    =================================================*/
    var deeplink = null;
    var installLink = null;
    var redirect = false;
    var buttonId = null;
    var descId = null;
    var language = 'ko';
    var appId = 1;

    /* ===============================================
     *  Global values
    =================================================*/
    var completeDeeplink = "";
    var uninstalled = false;
    var stats = true;
    //var coreServer = "https://core.airbridge.io";
    var coreServer = "http://core.localhost:5000";
    var resultFunctionality = 0;
    var transactionId = UUID();
    var sdkVersion = "AIRBRIDGE_SDK_v1.0";
    var social = "{{social}}";
    var clientIP = "{{clientIP}}";

    /* ===============================================
     *  Check Bogus Features
    =================================================*/
    function checkFunctionality() {
        var result = new Function("{{checkFunctionality}}")();
        return result;
    };
    //resultFunctionality = checkFunctionality();
    resultFunctionality = 0;

    // ====================================
    // Set Cookies (udlClientId)
    // : 사용자 고유 ID로 사용합니다. (최초 발급받은 transactionId가 clientId가 됩니다.)
    // ====================================
    var ClientCookie = function(transactionId) {
        var cookieName = "ab180ClientId";

        this.clientId = getCookie(cookieName);
        if(this.clientId === undefined){
            setCookie(cookieName, transactionId, 30);
            this.clientId = transactionId;
        }

        function getCookie(c_name)
        {
            var i,x,y,ARRcookies=document.cookie.split(";");
            for (i=0;ARRcookies.length>i;i++)
            {
                x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
                y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
                x=x.replace(/^\s+|\s+$/g,"");
                if (x==c_name) {
                    return unescape(y);
                }
            }
        }

        function setCookie(c_name, value, expireDays){
            var expireDate = new Date();
            expireDate.setDate(expireDate.getDate()+expireDays);
            var c_value = escape(value) + ((expireDays==null)? "":"; expires="+expireDate.toUTCString());
            document.cookie = c_name + "=" + c_value;
        }
    }
    var clientCookie = new ClientCookie(transactionId);

    loadEvent();


    /* ===============================================
     *  Initial function
    =================================================*/
    ab["init"] = function(obj){
        // TODO (return if empty)
        deeplink = obj.deeplink;
        installLink = obj.installLink;
        redirect = obj.redirect;
        transactionId = obj.transactionId;
        buttonId = obj.buttonId;
        descId = obj.descId;
        appId = obj.appId;
        stats = obj.stats? obj.stats:true;
        language = obj.language? obj.language:"ko";

        /* ===============================================
         *  Create completeDeeplink
        =================================================*/
        if (deeplink.trim() == "") {
            completeDeeplink = "";
        } else {
            /* ===============================================
             *  Remove last '/' (to fix Android bug)
            =================================================*/
            var path = deeplink.replace("://","");
            if(path.length != 0 && path[path.length - 1] == "/"){
                deeplink = deeplink.substring(0, deeplink.length-1);
            }

            /* ===============================================
             *  Check protocol and
             *  Set transcationId and airbridge flag
            =================================================*/
            var parser = document.createElement('a');
            parser.href = deeplink;
            if (ua.platform == ANDROID && parser.protocol.toLowerCase() == "intent:") {
                if (deeplink.split("#Intent")[0].indexOf("?") == -1) {
                    completeDeeplink = deeplink.replace("#Intent", "?transactionId="+transactionId+"&udl=true#Intent")
                } else {
                    completeDeeplink = deeplink.replace("#Intent", "&transactionId="+transactionId+"&udl=true#Intent")
                }
            } else {
                if(deeplink.indexOf("?")==-1){
                    completeDeeplink = deeplink+"?transactionId="+transactionId+"&udl=true";
                }else{
                    completeDeeplink = deeplink+"&transactionId="+transactionId+"&udl=true";
                }
            }
        }

        // WILL BE REMOVED (TODO)
        document.getElementById("uaua").innerText = ua.ua;

        if (window.location.href.indexOf("uninstalled=1") == -1) {
            /* ===============================================
             *  Set to Deeplink Button First
            =================================================*/
            ab.setDeeplinkButton(buttonId);

            if (redirect == true) {
                /* ===============================================
                 *  Try App Launch
                =================================================*/
                ab.launchDeeplink(completeDeeplink, installLink);
            } else {
                setButtonStatus();
            }
        } else {
            /* ===============================================
             * Set to Install Button
            =================================================*/
            uninstalled = true;
            setButtonStatus();
            ab.setDeeplinkButton(buttonId);
        }
    };

    /* ===============================================
     *  Create XMLHttpRequest
    =================================================*/
    function sendCreatedRequest(method, url, data, success){
        if (!stats) return;

        var req = new XMLHttpRequest;

        req.onreadystatechange = function(aEvt) {
            if(req.readyState == 4){
                //GET TransactionId
                switch(req.status){
                    case 200:
                        success(req);
                    break;
                    case 405:
                        break;
                    default:
                        break;
                }
            }
        };
        req.ontimeout = function() {
            //time out error
        };

        req.open(method, url, true); //true is for Async
        req.onprogress = function (e){
            var percentComplete = (e.loaded/e.total)*100;
        };
        req.onerror = function (e){
            console.log("Error " + e.target.status + " occured while receiving the document.");
        };

        req.setRequestHeader("Content-type","text/plain");

        req.send(data);
    }

    /* ===============================================
     *  Send LoadEvent
    =================================================*/
    function loadEvent (target){
        sendCreatedRequest("POST", coreServer+"/stats/", JSON.stringify({
            transactionId: transactionId,
            eventCategory: 801,
            eventType: 1,
            sdkVersion: sdkVersion,
            originUrl: window.location.href,
            checkFunctionality: resultFunctionality,
            appId: appId,
            clientId: clientCookie.clientId,
            clientData: {
                social: social,
                userAgent: ua,
                referer: document.referrer,
                clientIP: clientIP,
                resolution: {
                    width: window.screen.width,
                    height: window.screen.height
                }
            },
            additionalData: {
            }
        }), function(req){
            // success
            console.log("LINK/LOAD event is launched!")
            var result = JSON.parse(req.responseText);
        });
    }

    /* ===============================================
     *  Send RedirectEvent
    =================================================*/
    function redirectEvent(target, rawDeeplink, callback){
        sendCreatedRequest("POST", coreServer+"/stats/", JSON.stringify({
            transactionId: transactionId,
            eventCategory: 802,
            eventType: 1,
            sdkVersion: sdkVersion,
            originUrl: window.location.href,
            checkFunctionality: resultFunctionality,
            clientId: clientCookie.clientId,
            clientData: {
                target: target,
                rawDeeplink: rawDeeplink,
                social: social,
                userAgent: ua,
                referer: document.referrer,
                clientIP: clientIP,
                resolution: {
                    width: window.screen.width,
                    height: window.screen.height
                },
                deferredKey: {
                    appId: appId,
                    screenSize: String(window.screen.width)+"x"+String(window.screen.height),
                    osVersion: ua.os.name+ua.os.version,
                    deviceType: !!ua.device.model? ua.device.model: ua.browser.name
                }
            },
            additionalData: {
            }
        }), function(req){ // success
            console.log("REDIRECT event is launched!")
            callback();
        });

    }


    /* ===============================================
     *  Set Deeplink Button Event
    =================================================*/
    ab["setDeeplinkButton"] = function(id) {
        if (uninstalled) {
            /* ===============================================
             *  App Uninstalled
            =================================================*/
            document.getElementById(id).onclick = function() {
                /* ===============================================
                 * Set to Launch Button
                =================================================*/
                ab.launchStore(completeDeeplink, installLink);
            }
        } else {
            /* ===============================================
             *  Don't know yet
            =================================================*/
            document.getElementById(id).onclick = function() {
                ab.launchDeeplink(completeDeeplink, installLink);
            }
        }
    };

    /* ===============================================
     *  UA and Cookies
    =================================================*/
    // ua-parser-js (https://github.com/faisalman/ua-parser-js)
    (function(window,undefined){"use strict";var LIBVERSION="0.7.3",EMPTY="",UNKNOWN="?",FUNC_TYPE="function",UNDEF_TYPE="undefined",OBJ_TYPE="object",MAJOR="major",MODEL="model",NAME="name",TYPE="type",VENDOR="vendor",VERSION="version",ARCHITECTURE="architecture",CONSOLE="console",MOBILE="mobile",TABLET="tablet",SMARTTV="smarttv",WEARABLE="wearable",EMBEDDED="embedded";var util={extend:function(regexes,extensions){for(var i in extensions){if("browser cpu device engine os".indexOf(i)!==-1&&extensions[i].length%2===0){regexes[i]=extensions[i].concat(regexes[i])}}return regexes},has:function(str1,str2){if(typeof str1==="string"){return str2.toLowerCase().indexOf(str1.toLowerCase())!==-1}},lowerize:function(str){return str.toLowerCase()}};var mapper={rgx:function(){var result,i=0,j,k,p,q,matches,match,args=arguments;while(i<args.length&&!matches){var regex=args[i],props=args[i+1];if(typeof result===UNDEF_TYPE){result={};for(p in props){q=props[p];if(typeof q===OBJ_TYPE){result[q[0]]=undefined}else{result[q]=undefined}}}j=k=0;while(j<regex.length&&!matches){matches=regex[j++].exec(this.getUA());if(!!matches){for(p=0;p<props.length;p++){match=matches[++k];q=props[p];if(typeof q===OBJ_TYPE&&q.length>0){if(q.length==2){if(typeof q[1]==FUNC_TYPE){result[q[0]]=q[1].call(this,match)}else{result[q[0]]=q[1]}}else if(q.length==3){if(typeof q[1]===FUNC_TYPE&&!(q[1].exec&&q[1].test)){result[q[0]]=match?q[1].call(this,match,q[2]):undefined}else{result[q[0]]=match?match.replace(q[1],q[2]):undefined}}else if(q.length==4){result[q[0]]=match?q[3].call(this,match.replace(q[1],q[2])):undefined}}else{result[q]=match?match:undefined}}}}i+=2}return result},str:function(str,map){for(var i in map){if(typeof map[i]===OBJ_TYPE&&map[i].length>0){for(var j=0;j<map[i].length;j++){if(util.has(map[i][j],str)){return i===UNKNOWN?undefined:i}}}else if(util.has(map[i],str)){return i===UNKNOWN?undefined:i}}return str}};var maps={browser:{oldsafari:{major:{1:["/8","/1","/3"],2:"/4","?":"/"},version:{"1.0":"/8",1.2:"/1",1.3:"/3","2.0":"/412","2.0.2":"/416","2.0.3":"/417","2.0.4":"/419","?":"/"}}},device:{amazon:{model:{"Fire Phone":["SD","KF"]}},sprint:{model:{"Evo Shift 4G":"7373KT"},vendor:{HTC:"APA",Sprint:"Sprint"}}},os:{windows:{version:{ME:"4.90","NT 3.11":"NT3.51","NT 4.0":"NT4.0",2000:"NT 5.0",XP:["NT 5.1","NT 5.2"],Vista:"NT 6.0",7:"NT 6.1",8:"NT 6.2",8.1:"NT 6.3",10:"NT 6.4",RT:"ARM"}}}};var regexes={browser:[[/(opera\smini)\/((\d+)?[\w\.-]+)/i,/(opera\s[mobiletab]+).+version\/((\d+)?[\w\.-]+)/i,/(opera).+version\/((\d+)?[\w\.]+)/i,/(opera)[\/\s]+((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/\s(opr)\/((\d+)?[\w\.]+)/i],[[NAME,"Opera"],VERSION,MAJOR],[/(kindle)\/((\d+)?[\w\.]+)/i,/(lunascape|maxthon|netfront|jasmine|blazer)[\/\s]?((\d+)?[\w\.]+)*/i,/(avant\s|iemobile|slim|baidu)(?:browser)?[\/\s]?((\d+)?[\w\.]*)/i,/(?:ms|\()(ie)\s((\d+)?[\w\.]+)/i,/(rekonq)((?:\/)[\w\.]+)*/i,/(chromium|flock|rockmelt|midori|epiphany|silk|skyfire|ovibrowser|bolt|iron)\/((\d+)?[\w\.-]+)/i],[NAME,VERSION,MAJOR],[/(trident).+rv[:\s]((\d+)?[\w\.]+).+like\sgecko/i],[[NAME,"IE"],VERSION,MAJOR],[/(yabrowser)\/((\d+)?[\w\.]+)/i],[[NAME,"Yandex"],VERSION,MAJOR],[/(comodo_dragon)\/((\d+)?[\w\.]+)/i],[[NAME,/_/g," "],VERSION,MAJOR],[/(chrome|omniweb|arora|[tizenoka]{5}\s?browser)\/v?((\d+)?[\w\.]+)/i,/(uc\s?browser|qqbrowser)[\/\s]?((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(dolfin)\/((\d+)?[\w\.]+)/i],[[NAME,"Dolphin"],VERSION,MAJOR],[/((?:android.+)crmo|crios)\/((\d+)?[\w\.]+)/i],[[NAME,"Chrome"],VERSION,MAJOR],[/version\/((\d+)?[\w\.]+).+?mobile\/\w+\s(safari)/i],[VERSION,MAJOR,[NAME,"Mobile Safari"]],[/version\/((\d+)?[\w\.]+).+?(mobile\s?safari|safari)/i],[VERSION,MAJOR,NAME],[/webkit.+?(mobile\s?safari|safari)((\/[\w\.]+))/i],[NAME,[MAJOR,mapper.str,maps.browser.oldsafari.major],[VERSION,mapper.str,maps.browser.oldsafari.version]],[/(konqueror)\/((\d+)?[\w\.]+)/i,/(webkit|khtml)\/((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR],[/(navigator|netscape)\/((\d+)?[\w\.-]+)/i],[[NAME,"Netscape"],VERSION,MAJOR],[/(swiftfox)/i,/(icedragon|iceweasel|camino|chimera|fennec|maemo\sbrowser|minimo|conkeror)[\/\s]?((\d+)?[\w\.\+]+)/i,/(firefox|seamonkey|k-meleon|icecat|iceape|firebird|phoenix)\/((\d+)?[\w\.-]+)/i,/(mozilla)\/((\d+)?[\w\.]+).+rv\:.+gecko\/\d+/i,/(polaris|lynx|dillo|icab|doris|amaya|w3m|netsurf)[\/\s]?((\d+)?[\w\.]+)/i,/(links)\s\(((\d+)?[\w\.]+)/i,/(gobrowser)\/?((\d+)?[\w\.]+)*/i,/(ice\s?browser)\/v?((\d+)?[\w\._]+)/i,/(mosaic)[\/\s]((\d+)?[\w\.]+)/i],[NAME,VERSION,MAJOR]],cpu:[[/(?:(amd|x(?:(?:86|64)[_-])?|wow|win)64)[;\)]/i],[[ARCHITECTURE,"amd64"]],[/(ia32(?=;))/i],[[ARCHITECTURE,util.lowerize]],[/((?:i[346]|x)86)[;\)]/i],[[ARCHITECTURE,"ia32"]],[/windows\s(ce|mobile);\sppc;/i],[[ARCHITECTURE,"arm"]],[/((?:ppc|powerpc)(?:64)?)(?:\smac|;|\))/i],[[ARCHITECTURE,/ower/,"",util.lowerize]],[/(sun4\w)[;\)]/i],[[ARCHITECTURE,"sparc"]],[/((?:avr32|ia64(?=;))|68k(?=\))|arm(?:64|(?=v\d+;))|(?=atmel\s)avr|(?:irix|mips|sparc)(?:64)?(?=;)|pa-risc)/i],[[ARCHITECTURE,util.lowerize]]],device:[[/\((ipad|playbook);[\w\s\);-]+(rim|apple)/i],[MODEL,VENDOR,[TYPE,TABLET]],[/applecoremedia\/[\w\.]+ \((ipad)/],[MODEL,[VENDOR,"Apple"],[TYPE,TABLET]],[/(apple\s{0,1}tv)/i],[[MODEL,"Apple TV"],[VENDOR,"Apple"]],[/(archos)\s(gamepad2?)/i,/(hp).+(touchpad)/i,/(kindle)\/([\w\.]+)/i,/\s(nook)[\w\s]+build\/(\w+)/i,/(dell)\s(strea[kpr\s\d]*[\dko])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(kf[A-z]+)\sbuild\/[\w\.]+.*silk\//i],[MODEL,[VENDOR,"Amazon"],[TYPE,TABLET]],[/(sd|kf)[0349hijorstuw]+\sbuild\/[\w\.]+.*silk\//i],[[MODEL,mapper.str,maps.device.amazon.model],[VENDOR,"Amazon"],[TYPE,MOBILE]],[/\((ip[honed|\s\w*]+);.+(apple)/i],[MODEL,VENDOR,[TYPE,MOBILE]],[/\((ip[honed|\s\w*]+);/i],[MODEL,[VENDOR,"Apple"],[TYPE,MOBILE]],[/(blackberry)[\s-]?(\w+)/i,/(blackberry|benq|palm(?=\-)|sonyericsson|acer|asus|dell|huawei|meizu|motorola|polytron)[\s_-]?([\w-]+)*/i,/(hp)\s([\w\s]+\w)/i,/(asus)-?(\w+)/i],[VENDOR,MODEL,[TYPE,MOBILE]],[/\(bb10;\s(\w+)/i],[MODEL,[VENDOR,"BlackBerry"],[TYPE,MOBILE]],[/android.+(transfo[prime\s]{4,10}\s\w+|eeepc|slider\s\w+|nexus 7)/i],[MODEL,[VENDOR,"Asus"],[TYPE,TABLET]],[/(sony)\s(tablet\s[ps])/i],[VENDOR,MODEL,[TYPE,TABLET]],[/\s(ouya)\s/i,/(nintendo)\s([wids3u]+)/i],[VENDOR,MODEL,[TYPE,CONSOLE]],[/android.+;\s(shield)\sbuild/i],[MODEL,[VENDOR,"Nvidia"],[TYPE,CONSOLE]],[/(playstation\s[3portablevi]+)/i],[MODEL,[VENDOR,"Sony"],[TYPE,CONSOLE]],[/(sprint\s(\w+))/i],[[VENDOR,mapper.str,maps.device.sprint.vendor],[MODEL,mapper.str,maps.device.sprint.model],[TYPE,MOBILE]],[/(lenovo)\s?(S(?:5000|6000)+(?:[-][\w+]))/i],[VENDOR,MODEL,[TYPE,TABLET]],[/(htc)[;_\s-]+([\w\s]+(?=\))|\w+)*/i,/(zte)-(\w+)*/i,/(alcatel|geeksphone|huawei|lenovo|nexian|panasonic|(?=;\s)sony)[_\s-]?([\w-]+)*/i],[VENDOR,[MODEL,/_/g," "],[TYPE,MOBILE]],[/[\s\(;](xbox(?:\sone)?)[\s\);]/i],[MODEL,[VENDOR,"Microsoft"],[TYPE,CONSOLE]],[/(kin\.[onetw]{3})/i],[[MODEL,/\./g," "],[VENDOR,"Microsoft"],[TYPE,MOBILE]],[/\s((milestone|droid(?:[2-4x]|\s(?:bionic|x2|pro|razr))?(:?\s4g)?))[\w\s]+build\//i,/(mot)[\s-]?(\w+)*/i],[[VENDOR,"Motorola"],MODEL,[TYPE,MOBILE]],[/android.+\s(mz60\d|xoom[\s2]{0,2})\sbuild\//i],[MODEL,[VENDOR,"Motorola"],[TYPE,TABLET]],[/android.+((sch-i[89]0\d|shw-m380s|gt-p\d{4}|gt-n8000|sgh-t8[56]9|nexus 10))/i,/((SM-T\w+))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,TABLET]],[/((s[cgp]h-\w+|gt-\w+|galaxy\snexus|sm-n900))/i,/(sam[sung]*)[\s-]*(\w+-?[\w-]*)*/i,/sec-((sgh\w+))/i],[[VENDOR,"Samsung"],MODEL,[TYPE,MOBILE]],[/(samsung);smarttv/i],[VENDOR,MODEL,[TYPE,SMARTTV]],[/\(dtv[\);].+(aquos)/i],[MODEL,[VENDOR,"Sharp"],[TYPE,SMARTTV]],[/sie-(\w+)*/i],[MODEL,[VENDOR,"Siemens"],[TYPE,MOBILE]],[/(maemo|nokia).*(n900|lumia\s\d+)/i,/(nokia)[\s_-]?([\w-]+)*/i],[[VENDOR,"Nokia"],MODEL,[TYPE,MOBILE]],[/android\s3\.[\s\w-;]{10}(a\d{3})/i],[MODEL,[VENDOR,"Acer"],[TYPE,TABLET]],[/android\s3\.[\s\w-;]{10}(lg?)-([06cv9]{3,4})/i],[[VENDOR,"LG"],MODEL,[TYPE,TABLET]],[/(lg) netcast\.tv/i],[VENDOR,MODEL,[TYPE,SMARTTV]],[/(nexus\s[45])/i,/lg[e;\s\/-]+(\w+)*/i],[MODEL,[VENDOR,"LG"],[TYPE,MOBILE]],[/android.+(ideatab[a-z0-9\-\s]+)/i],[MODEL,[VENDOR,"Lenovo"],[TYPE,TABLET]],[/linux;.+((jolla));/i],[VENDOR,MODEL,[TYPE,MOBILE]],[/((pebble))app\/[\d\.]+\s/i],[VENDOR,MODEL,[TYPE,WEARABLE]],[/android.+;\s(glass)\s\d/i],[MODEL,[VENDOR,"Google"],[TYPE,WEARABLE]],[/(mobile|tablet);.+rv\:.+gecko\//i],[[TYPE,util.lowerize],VENDOR,MODEL]],engine:[[/(presto)\/([\w\.]+)/i,/(webkit|trident|netfront|netsurf|amaya|lynx|w3m)\/([\w\.]+)/i,/(khtml|tasman|links)[\/\s]\(?([\w\.]+)/i,/(icab)[\/\s]([23]\.[\d\.]+)/i],[NAME,VERSION],[/rv\:([\w\.]+).*(gecko)/i],[VERSION,NAME]],os:[[/microsoft\s(windows)\s(vista|xp)/i],[NAME,VERSION],[/(windows)\snt\s6\.2;\s(arm)/i,/(windows\sphone(?:\sos)*|windows\smobile|windows)[\s\/]?([ntce\d\.\s]+\w)/i],[NAME,[VERSION,mapper.str,maps.os.windows.version]],[/(win(?=3|9|n)|win\s9x\s)([nt\d\.]+)/i],[[NAME,"Windows"],[VERSION,mapper.str,maps.os.windows.version]],[/\((bb)(10);/i],[[NAME,"BlackBerry"],VERSION],[/(blackberry)\w*\/?([\w\.]+)*/i,/(tizen)[\/\s]([\w\.]+)/i,/(android|webos|palm\os|qnx|bada|rim\stablet\sos|meego|contiki)[\/\s-]?([\w\.]+)*/i,/linux;.+(sailfish);/i],[NAME,VERSION],[/(symbian\s?os|symbos|s60(?=;))[\/\s-]?([\w\.]+)*/i],[[NAME,"Symbian"],VERSION],[/\((series40);/i],[NAME],[/mozilla.+\(mobile;.+gecko.+firefox/i],[[NAME,"Firefox OS"],VERSION],[/(nintendo|playstation)\s([wids3portablevu]+)/i,/(mint)[\/\s\(]?(\w+)*/i,/(mageia|vectorlinux)[;\s]/i,/(joli|[kxln]?ubuntu|debian|[open]*suse|gentoo|arch|slackware|fedora|mandriva|centos|pclinuxos|redhat|zenwalk|linpus)[\/\s-]?([\w\.-]+)*/i,/(hurd|linux)\s?([\w\.]+)*/i,/(gnu)\s?([\w\.]+)*/i],[NAME,VERSION],[/(cros)\s[\w]+\s([\w\.]+\w)/i],[[NAME,"Chromium OS"],VERSION],[/(sunos)\s?([\w\.]+\d)*/i],[[NAME,"Solaris"],VERSION],[/\s([frentopc-]{0,4}bsd|dragonfly)\s?([\w\.]+)*/i],[NAME,VERSION],[/(ip[honead]+)(?:.*os\s*([\w]+)*\slike\smac|;\sopera)/i],[[NAME,"iOS"],[VERSION,/_/g,"."]],[/(mac\sos\sx)\s?([\w\s\.]+\w)*/i,/(macintosh|mac(?=_powerpc)\s)/i],[[NAME,"Mac OS"],[VERSION,/_/g,"."]],[/((?:open)?solaris)[\/\s-]?([\w\.]+)*/i,/(haiku)\s(\w+)/i,/(aix)\s((\d)(?=\.|\)|\s)[\w\.]*)*/i,/(plan\s9|minix|beos|os\/2|amigaos|morphos|risc\sos|openvms)/i,/(unix)\s?([\w\.]+)*/i],[NAME,VERSION]]};var UAParser=function(uastring,extensions){if(!(this instanceof UAParser)){return new UAParser(uastring,extensions).getResult()}var ua=uastring||(window&&window.navigator&&window.navigator.userAgent?window.navigator.userAgent:EMPTY);var rgxmap=extensions?util.extend(regexes,extensions):regexes;this.getBrowser=function(){return mapper.rgx.apply(this,rgxmap.browser)};this.getCPU=function(){return mapper.rgx.apply(this,rgxmap.cpu)};this.getDevice=function(){return mapper.rgx.apply(this,rgxmap.device)};this.getEngine=function(){return mapper.rgx.apply(this,rgxmap.engine)};this.getOS=function(){return mapper.rgx.apply(this,rgxmap.os)};this.getResult=function(){return{ua:this.getUA(),browser:this.getBrowser(),engine:this.getEngine(),os:this.getOS(),device:this.getDevice(),cpu:this.getCPU()}};this.getUA=function(){return ua};this.setUA=function(uastring){ua=uastring;return this};this.setUA(ua)};UAParser.VERSION=LIBVERSION;UAParser.BROWSER={NAME:NAME,MAJOR:MAJOR,VERSION:VERSION};UAParser.CPU={ARCHITECTURE:ARCHITECTURE};UAParser.DEVICE={MODEL:MODEL,VENDOR:VENDOR,TYPE:TYPE,CONSOLE:CONSOLE,MOBILE:MOBILE,SMARTTV:SMARTTV,TABLET:TABLET,WEARABLE:WEARABLE,EMBEDDED:EMBEDDED};UAParser.ENGINE={NAME:NAME,VERSION:VERSION};UAParser.OS={NAME:NAME,VERSION:VERSION};if(typeof exports!==UNDEF_TYPE){if(typeof module!==UNDEF_TYPE&&module.exports){exports=module.exports=UAParser}exports.UAParser=UAParser}else{window.UAParser=UAParser;if(typeof define===FUNC_TYPE&&define.amd){define(function(){return UAParser})}var $=window.jQuery||window.Zepto;if(typeof $!==UNDEF_TYPE){var parser=new UAParser;$.ua=parser.getResult();$.ua.get=function(){return parser.getUA()};$.ua.set=function(uastring){parser.setUA(uastring);var result=parser.getResult();for(var prop in result){$.ua[prop]=result[prop]}}}}})(window);

    var currentUserAgent = function() {
        return platformFromUserAgent(navigator.userAgent);
    };

    var APPLE_IPHONE = "iPhone";
    var APPLE_IPAD = "iPad";
    var IOS = "iOS";
    var ANDROID = "Android";
    var DESKTOP = "Desktop";
    var IPHONE_NAVER = "iPhone NAVER";
    var IPHONE_FB = "iPhone FB";

    var platformFromUserAgent = function(string) {
        var client = (function(){
            var uaParser = new UAParser();
            uaParser.setUA(string);
            return uaParser.getResult();
        })();

        switch(client.os.name) {
            case "Android":
                client.platform = ANDROID;
                break;
            case "iOS":
                if(client.device.type === "tablet") {
                    client.platform = APPLE_IPAD;
                } else {
                    client.platform = APPLE_IPHONE;
                }
                break;
            default:
                if (client.ua.indexOf("NAVER") != -1)
                    client.platform = IPHONE_NAVER;
                else
                    client.platform = DESKTOP;
                break;
        }
        return client;
    };

    var isAndroidNewChrome = function(client) { return client.os.name === "Android" && client.browser.name === "Chrome" && client.browser.major >= 25; };
    var isChrome = function(client) { return client.browser.name === "Chrome" || client.browser.name === "Chromium"; };
    var isFirefox = function(client) { return client.browser.name === "Firefox"; };
    var versionGreaterThan = function(client, versionNumber) { return client.browser.major > versionNumber; };
    var versionGreaterThanOrEq = function(client, versionNumber) { return client.browser.major >= versionNumber; };
    var versionLessThan = function(client, versionNumber) { return client.browser.major < versionNumber; };
    var versionLessThanOrEq = function(client, versionNumber) { return client.browser.major <= versionNumber; };

    var ua = currentUserAgent();

    /* ===============================================
     *  Set Cookie
    =================================================*/
    function setCookie(c_name, value, expireDays){
        var expireDate = new Date();
        expireDate.setDate(expireDate.getDate()+expireDays);
        var c_value = escape(value) + ((expireDays==null)? "":"; expires="+expireDate.toUTCString());
        document.cookie = c_name + "=" + c_value;
    }

    /* ===============================================
     *  Get Cookie
    =================================================*/
    function getCookie(c_name)
    {
        var i,x,y,ARRcookies=document.cookie.split(";");
        for (i=0;ARRcookies.length>i;i++)
        {
            x=ARRcookies[i].substr(0,ARRcookies[i].indexOf("="));
            y=ARRcookies[i].substr(ARRcookies[i].indexOf("=")+1);
            x=x.replace(/^\s+|\s+$/g,"");
            if (x==c_name) {
                return unescape(y);
            }
        }
    }

    /* ===============================================
     *  Disallow Deeplinking
    =================================================*/
    var clearTimeoutOnPageUnload = function(redirectTimer) {
        window.addEventListener("pagehide", function() {
            clearTimeout(redirectTimer);
        });
        //window.addEventListener("pageshow", function() {
            //clearTimeout(redirectTimer);
        //});
        window.addEventListener("blur", function() {
            clearTimeout(redirectTimer);
        });
        window.addEventListener("unload", function() {
            clearTimeout(redirectTimer);
        });
        document.addEventListener("webkitvisibilitychange", function() {
            if (document.webkitHidden) {
                clearTimeout(redirectTimer);
            }
        });
    };

    /* ===============================================
     *  iFrame Deeplink Launch (Old Version)
    =================================================*/
    var iFrameLaunch = function(deeplink) {
        var hiddenIFrame = document.createElement("iframe");
        hiddenIFrame.style.width = "1px";
        hiddenIFrame.style.height = "1px";
        hiddenIFrame.border = "none";
        hiddenIFrame.style.display = "none";
        hiddenIFrame.src = deeplink;
        document.body.appendChild(hiddenIFrame);
    };

    /* ===============================================
     *  iOS Deeplink Launch
    =================================================*/
    var iOSDeeplinkLaunch = function(deeplink) {
        /* ===============================================
         *  FB && iOS9
        =================================================*/
        if (ua.ua.indexOf("FB") != -1 && parseFloat(ua.os.version) >= 9.0) {
            // Facebook In-app browser
            var currentLocation = "ftp://redirect.airbridge.io/index.html?target="+ window.location.href;
            if (window.location.href.indexOf("?") != -1) {
                currentLocation = currentLocation + "&abredirect=1"
            } else {
                currentLocation = currentLocation + "?abredirect=1"
            }

            if (window.location.href.indexOf("abredirect") == -1) {
                window.location = currentLocation;
                return;
            }
        }

        var timeoutTime = 2000;

        redirectEvent("iOS", deeplink, function(){
            if (ua.browser.name.indexOf("Safari") != -1) {
                if (parseFloat(ua.os.version) >= 9.2) {
                    // Try mobile deeplink (TODO)
                    window.location = deeplink;
                } else if (parseFloat(ua.os.version) >= 9.0) {
                    /* ===============================================
                     *  iPhone + Safari + 9.0/9.1
                     =================================================*/
                    // Check current location
                    var currentLocation = window.location.href;
                    if (currentLocation.indexOf("uninstalled=1") != -1) return;

                    // Try mobile deeplink
                    window.location = deeplink;

                    // Wait 0.5 sec, if there is no action, Assume that the app isn't installed.
                    setTimeout(function() {
                        if(currentLocation.indexOf("?")==-1){
                            var redirectLink = currentLocation+"?uninstalled=1"
                        }else{
                            var redirectLink = currentLocation+"&uninstalled=1"
                        }
                        window.location = redirectLink;
                    }, 500);
                } else {
                    iFrameLaunch(deeplink);
                }
            } else {
                if (ua.os.version >= 9.0) {
                    window.location = deeplink;
                } else {
                    iFrameLaunch(deeplink);
                }
            }

            clearTimeoutOnPageUnload(setTimeout(function() {
                if (redirect == false || uninstalled == true) {
                    /* ===============================================
                     *  Button Clicked
                     =================================================*/
                    ab.launchStore(deeplink, installLink);
                }
                uninstalled = true;
                setButtonStatus();
            }, timeoutTime));
        });
    };

    /* ===============================================
     *  Android Deeplink Launch
    =================================================*/
    var androidDeeplinkLaunch = function (deeplink, installLink) {
        var timeoutTime = 2000;

        // 먼저 deeplink가 intent인지 아닌지 검증
        var parser = document.createElement('a');
        parser.href = deeplink;

        if(parser.protocol=="https:" && installLink.indexOf("&url=")==-1){
            installLink = installLink+"&url="+deeplink;
        }else if(parser.protocol=='http:'){
            window.top.location.href = deeplink;
        }

        if (navigator.userAgent.match(/FBAV/)) {
            redirectEvent("Android", deeplink, function(){
                window.location.replace(deeplink);

                var visitedAt = (new Date()).getTime(); // 방문 시간
                setTimeout(
                    function () {
                        if (timeoutTime > (new Date()).getTime() - visitedAt) {
                            setButtonStatus();
                        }
                    }, 500);
            });
        }

        if (parser.protocol == "intent:") {
            // intent면 걍 던지면 됨 (미설치시 알아서 마켓으로 보내줌 + 크롬이든 기본 브라우져든 상관 없음)
            redirectEvent("Android_Intent", deeplink, function(){
                document.location = deeplink;
            });
        } else {
            var marketParser = document.createElement('a');
            marketParser.href = installLink;

            // 일반 deeplink인 경우
            if (isAndroidNewChrome(ua)) {
                // 크롬이면 보안이슈 때문에, 안드로이드 크롬 25 버전 이상에서 구형 deeplink 작동 안함.

                // intent를 만든다
                var intentUrl = "intent://" + parser.pathname.replace(/\/\//g, '') + parser.search + "/#Intent;scheme=" + parser.protocol.replace(':', '') + ";package=" + marketParser.search.replace("?id=", "") + ";end";

                // 기본 브라우져에서 됨 (크롬안됨)
                redirectEvent("Android_Intent", deeplink, function(){
                    window.top.location.href = intentUrl;
                });
            } else {
                // 크롬이 아닌 경우 (기본 브라우져)
                var visitedAt = (new Date()).getTime(); // 방문 시간

                var iframe = document.createElement('iframe');
                iframe.style.visibility = 'hidden';
                iframe.src = deeplink;
                redirectEvent("Android", deeplink, function(){
                    document.body.appendChild(iframe);
                    document.body.removeChild(iframe); // back 호출시 캐싱될 수 있으므로 제거

                    setTimeout(
                        function () {
                            if (timeoutTime > (new Date()).getTime() - visitedAt) {
                                setButtonStatus();
                            }
                        }, 500);
                });
            }
        }
    }

    /* ===============================================
     *  Desktop Deeplink Launch
    =================================================*/
    var webDeeplinkLaunch = function (deeplink) {
        window.open(deeplink);
    }

    /* ===============================================
     *  Set App Uninstalled
    =================================================*/
    function setButtonStatus() {
        var buttonTitle = ""

        if (ua.platform == DESKTOP) {
            if (completeDeeplink.trim() == "") {
                /* ===============================================
                 *  갈 곳이 없어요.
                 =================================================*/
                if (language == 'en') {
                    buttonTitle = "This app doesn't support desktop users."
                } else {
                    buttonTitle = "데스크탑 사용자를 지원하지 않습니다.";
                }
            } else {
                /* ===============================================
                 *  deeplink로 가면 되요!
                 =================================================*/
                if (language == 'en') {
                    buttonTitle = 'Directly launch on Mobile Phone.';
                } else {
                    buttonTitle = '모바일에서 실행하면 바로 이동합니다.';
                }
            }
        } else {
            // check english version or not
            if (completeDeeplink.trim() == "") {
                /* ===============================================
                 *  갈 곳이 없어요.
                 =================================================*/
                if (language == 'en') {
                    buttonTitle = "This app doesn't support " + ua.platform + " users.";
                } else {
                    buttonTitle = ua.platform + " 앱을 지원하지 않습니다.";
                }
            } else {
                /* ===============================================
                 *  completeDeeplink로 가면 되요!
                 =================================================*/
                if (uninstalled) {
                    if (language == 'en') {
                        if (installLink.trim() != "") {
                            buttonTitle = 'Launch after install';
                        } else {
                            buttonTitle = 'Mobile web site.';
                        }
                    } else {
                        if (installLink.trim() != "") {
                            buttonTitle = '앱 설치 후 바로보기';
                        } else {
                            buttonTitle = '모바일 웹사이트 이동'
                        }
                    }
                } else {
                    if (language == 'en') {
                        buttonTitle = 'Launch this app page';
                    } else {
                        buttonTitle = '앱에서 바로보기';
                    }
                }
            }
        }

        document.getElementById(descId).innerHTML = buttonTitle;
    }


    /* ===============================================
     *  Launch Deeplink
    =================================================*/
    ab["launchDeeplink"] = function(deeplink, installLink) {
        if (deeplink.trim() == "") return;

        switch(ua.platform){
            case ANDROID:
                androidDeeplinkLaunch(deeplink, installLink);
                break;
            case APPLE_IPAD:
            case APPLE_IPHONE:
            case IPHONE_NAVER:
            case IPHONE_FB:
                iOSDeeplinkLaunch(deeplink);
                break;
            default:
                webDeeplinkLaunch(deeplink);
                break;
        }
    }

    /* ===============================================
     *  Launch Store
    =================================================*/
    ab["launchStore"] = function(deeplink, installLink) {
        if (installLink == "") {
            window.location.replace(deeplink);
        } else {
            switch(ua.platform){
                case ANDROID:
                    redirectEvent("Android_Install", deeplink, function(){
                        window.location.replace(installLink);
                    });
                case APPLE_IPAD:
                case APPLE_IPHONE:
                case IPHONE_NAVER:
                case IPHONE_FB:
                    redirectEvent("iOS_Install", deeplink, function(){
                        window.location.replace(installLink);
                    });
                    break;
                default:
                    break;
            }
        }
    }

    // ==============================================================
    // Set Default Transaction ID
    // uuid-v4.js :: Random UUID (v4) Generator - Usage: UUID()
    // Copyright (c) 2011 Matt Williams <matt@makeable.co.uk>. All rights reserved.
    // ==============================================================
    function UUID() {
        var dec2hex = [];
        for (var i=0; i<=15; i++) {
            dec2hex[i] = i.toString(16);
        }

        var uuid = '';
        for (var i=1; i<=36; i++) {
        if (i===9 || i===14 || i===19 || i===24) {
            uuid += '-';
        } else if (i===15) {
            uuid += 4;
        } else if (i===20) {
            uuid += dec2hex[(Math.random()*4|0 + 8)];
        } else {
            uuid += dec2hex[(Math.random()*15|0)];
        }
        }
        return uuid;
    };

    return ab;
})(window)


