const MESSAGE_TYPES = { NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4 };
const PREFIX = { STORE: "STORE_", TMP: "TMP_" };
let enableNotifications = false;

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        if (request.type == MESSAGE_TYPES.NOTIFICATION) {
            console.log('OnMessage [notification] ' + (enableNotifications ? "[enabled]":"[disabled]"));
            if (enableNotifications) {
                showNotification(request.data.titleText, request.data.messageText);
            }
        } else if (request.type == MESSAGE_TYPES.SETTINGS_CHANGED) {
            console.log('OnMessage read settings');
            readSettings();
        } else if (request.type == MESSAGE_TYPES.SAVE_DATA) {
            console.log('OnMessage save data');
            chrome.storage.local.set(
                {
                    [PREFIX.STORE + request.data.stream_Id]: request.data.store,
                    [PREFIX.TMP + request.data.stream_Id]: request.data.tmp
                }
            );
        } else if (request.type == MESSAGE_TYPES.GET_DATA) {
            console.log('OnMessage get data for ' + request.data);
            let stream_Id = request.data;
            chrome.storage.local.get(
                {
                    [PREFIX.STORE + stream_Id]: {},
                    [PREFIX.TMP + stream_Id]: {}
                },
                function (items) {
                    if (Object.keys(items).length == 0) {
                        return;
                    }

                    chrome.tabs.sendMessage(
                        sender.tab.id,
                        {
                            type: MESSAGE_TYPES.GET_DATA,
                            store: items[PREFIX.STORE + stream_Id],
                            tmp: items[PREFIX.TMP + stream_Id]
                        }
                    );
                }
            );
        } else if (request.type == MESSAGE_TYPES.CLEAR) {
            console.log('OnMessage clear');
            clearAll();
        }
    }
);

function showNotification(titleText, messageText) {
    chrome.notifications.create(
        {
            type: "basic",
            iconUrl: "./icons/icon_48.png",
            title: titleText,
            message: messageText
        }
    );
}

function readSettings() {
    chrome.storage.local.get(
        {
            notifications: false
        },
        function (items) {
            enableNotifications = items.notifications;
        }
    );
}

function clearAll() {
    chrome.storage.local.get(
        {
            notifications: false
        },
        function (items) {
            chrome.storage.local.clear().then(
                chrome.storage.local.set(
                    {
                        notifications: items.notifications
                    }
                )
            );
        }
    );
}

readSettings();