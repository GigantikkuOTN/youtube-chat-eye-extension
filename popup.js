const MESSAGE_TYPES = {NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4};
const defaultList = "---Выбрать---";
const streamIdLength = 11;
const PREFIX = { STORE: "STORE_", TMP: "TMP_" };
let lastListName = defaultList;

function clearItems() {
	let content = document.getElementById('content');
	while (content.firstChild) {
		content.removeChild(content.lastChild);
	}
}

function clearListItems() {
    let lists = document.getElementById('streamLists');
    for (let i = lists.options.length - 1; i > 0; i--) {
        lists.options.remove(i);
    }
}

function clearAll() {
    chrome.runtime.sendMessage(
        {
            type: MESSAGE_TYPES.CLEAR
        }
    );
	clearItems();
    clearListItems();
}

function addItem(author, message) {
	let content = document.getElementById('content');

	let blockElement = document.createElement("div");
    blockElement.setAttribute("class", "messages__item");

	let authorElement = document.createElement("span");
	authorElement.setAttribute("class", "messages__author");
	authorElement.innerText = author;
	blockElement.appendChild(authorElement);

	let semiElement = document.createElement("span");
	semiElement.setAttribute("class", "messages__semi");
	semiElement.innerText = ": ";
	blockElement.appendChild(semiElement);

	let messageElement = document.createElement("span");
	messageElement.setAttribute("class", "messages__message-text");
	messageElement.innerText = message;
	blockElement.appendChild(messageElement);

	document.getElementById('content').appendChild(blockElement);
}

function addListItem(name) {
    let lists = document.getElementById('streamLists');

    let option = document.createElement("option");
    option.text = name;
    lists.appendChild(option);
}

function reLoadStoredData() {
	clearItems();
    loadLists();
    chrome.storage.local.get(
        {
            lastList: defaultList
        },
        function (item) {
            if (item.lastList == defaultList) {
                return;
            }

            loadListData(item.lastList);
        }
    );
}

function loadListData(listName) {
    clearItems();
    if (listName == defaultList) {
        return;
    }

    chrome.storage.local.get(
        {
            [listName]: {}
        },
        function (items) {
            let msgIds = Object.keys(items[listName]);
            let messages = [];
            for (let i = 0; i < msgIds.length; i++) {
                messages.push(items[listName][msgIds[i]]);
            }

            messages.sort(sortByDate);

            for (let i = 0; i < messages.length; i++) {
                let msgItem = messages[i];
                let username = msgItem.username;
                if (msgItem.isModerator) {
                    username += " [M]";
                }
                if (msgItem.isOwner) {
                    username += " [O]";
                }
                addItem(username, msgItem.message);
            }

            let listElement = document.getElementById('streamLists');
            for (let i = 0; i < listElement.options.length; i++) {
                if (PREFIX.STORE + listElement.options[i].text == listName) {
                    listElement.options[i].selected = true;
                    break;
                }
            }
            //проскроллить вниз
            let content = document.getElementById('content');
            content.scrollTop = content.scrollHeight;

        }
    );
}

function loadLists() {
    clearListItems();
    chrome.storage.local.get(
        null,
        function (items) {
            let keys = Object.keys(items);
            for(let i = 0; i < keys.length; i++) {
                if (!keys[i].startsWith(PREFIX.STORE)) {
                    continue;
                }

                //добавляем только те списки, где сохранены сообщения
                if (Object.keys(items[keys[i]]).length != 0) {
                    addListItem(keys[i].slice(PREFIX.STORE.length));//.slice(PREFIX.STORE.length)
                }
            }
        }
    );
}

function sortByDate(x, y) {
    if (x.date > y.date) {
        return 1;
    } else if (x.date < y.date) {
        return -1;
    }
    return 0;
}

function download(data, filename, type) {
    let file = new Blob([data], {type: type});
    if (window.navigator.msSaveOrOpenBlob) {// IE10+
        window.navigator.msSaveOrOpenBlob(file, filename);
    } else { // Others
        let a = document.createElement("a"),
            url = URL.createObjectURL(file);
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        setTimeout(function() {
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
        }, 0);
    }
}

function exportData() {
	chrome.storage.local.get(
        null,
        function (items) {
            let content = "";
            let itemKeys = Object.keys(items);
            for(let i = 0; i < itemKeys.length; i++) {
                if (!itemKeys[i].startsWith(PREFIX.STORE)) {
                    continue;
                }
                content += getUrlToStream(itemKeys[i].slice(PREFIX.STORE.length)) + "\n";
                let msgIds = Object.keys(items[itemKeys[i]]);
                let messages = [];
                for(let j = 0; j < msgIds.length; j++) {
                    messages.push(items[itemKeys[i]][msgIds[j]]);
                }

                messages.sort(sortByDate);

                for(let j = 0; j < messages.length; j++) {
                    let msg = messages[j];
                    content += "    " 
                    + msg.username
                    + (msg.isModerator ? " [M]":"") 
                    + (msg.isOwner ? " [O]":"") 
                    + ": " + msg.message + "\n";
                }
                content += "\n";
            }

            download(content, "deleted_messages.txt", "text/plain");
        }
    );
}

function setLastList(name) {
    chrome.storage.local.set(
        {
            lastList: name
        }
    );
}

function getUrlToStream(streamId) {
    if (streamId.length > streamIdLength) {
        return streamId;
    } else {
        return 'https://www.youtube.com/watch?v=' + streamId;
    }
}

function listSelected(event) {
    let listName = event.target.options[event.target.selectedIndex].text;
    if (listName != defaultList) {
        listName = PREFIX.STORE + listName;
    }
    setLastList(listName);
    loadListData(listName);
}

function testFillData() {
    let key_1 = "STORE_streamId_1";
    let data_1 = [
        	{
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            }
    	];
    let key_2 = "TMP_streamId_2";
    let data_2 = [
        	{
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	}
    	];
    let key_3 = "STORE_streamId_2";
    let data_3 = [
        	{
            	messageId: "msgid1",
            	username: "user",
            	message: "lol kek",
            	isModerator: false,
            	isOwner: false,
            	channelId: "alsdbflkasbdlkfgb"
        	},
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            },
            {
                messageId: "msgid1",
                username: "user",
                message: "lol kek",
                isModerator: false,
                isOwner: false,
                channelId: "alsdbflkasbdlkfgb"
            }
    	];
    chrome.storage.local.set(
        {
            [key_1]: data_1,
            [key_2]: data_2,
            [key_3]: data_3
        }
    );
}

document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('clear').addEventListener('click', clearAll);
document.getElementById('export').addEventListener('click', exportData);//exportData testFillData
document.getElementById('streamLists').onchange = listSelected;

reLoadStoredData();