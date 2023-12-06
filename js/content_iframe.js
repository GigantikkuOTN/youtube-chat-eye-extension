const TAG_IFRAME = '[YCE] [IFRAME]: ';
const EVENT_TYPES_YCE = {
    NOTIFICATION: "YCE_NOTIFICATION",
    GET_DATA_TO_CONTENT: "YCE_GET_DATA_TO_CONTENT",
    GET_DATA_TO_INTERCEPTOR: "YCE_GET_DATA_TO_INTERCEPTOR",
    SAVE_DATA_TO_CONTENT: "YCE_SAVE_DATA_TO_CONTENT",
    SAVE_DATA_INTERCEPTOR: "YCE_SAVE_DATA_INTERCEPTOR"
};
const MESSAGE_TYPES = { NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4 };

let s = document.createElement('script');
s.src = chrome.runtime.getURL('/js/fetchInterceptor.js');
s.onload = function() {
    this.remove();
};
(document.head || document.documentElement).appendChild(s);

console.log(TAG_IFRAME + 'script loaded');

/*
event
{
	detail: {
        titleText: "",
        messageText: ""
    }
}
*/
window.addEventListener(
    EVENT_TYPES_YCE.NOTIFICATION,
    function(event) {
    	console.log(TAG_IFRAME + ' EVENT notification ' + JSON.stringify(event.detail));
        chrome.runtime.sendMessage(
        	{
        		type: MESSAGE_TYPES.NOTIFICATION,
        		data: event.detail
        	}
        );
    },
    false
);

/*
event
{
	data: "streamId"
}
*/
window.addEventListener(
    EVENT_TYPES_YCE.GET_DATA_TO_CONTENT,
    function(event) {
    	console.log(TAG_IFRAME + ' EVENT getdata TO content ' + JSON.stringify(event.detail));
        chrome.runtime.sendMessage(
        	{
        		type: MESSAGE_TYPES.GET_DATA,
        		data: event.detail
        	}
        );
    },
    false
);

window.addEventListener(
    EVENT_TYPES_YCE.SAVE_DATA_TO_CONTENT,
    function(event) {
    	console.log(TAG_IFRAME + ' EVENT save data');
        chrome.runtime.sendMessage(
        	{
        		type: MESSAGE_TYPES.SAVE_DATA,
        		data: event.detail
        	}
        );
    },
    false
);

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.type == MESSAGE_TYPES.GET_DATA) {
        	console.log(TAG_IFRAME + ' ONMESSAGE getdata from background ');
            let event = new CustomEvent(
        		EVENT_TYPES_YCE.GET_DATA_TO_INTERCEPTOR, 
        		{
            		detail: request
        		}
    		);
    		window.dispatchEvent(event);
        }
    }
);