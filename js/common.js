const MESSAGE_TYPES = { NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4 };
const EVENT_TYPES_YCE = {
    NOTIFICATION: "YCE_NOTIFICATION",
    GET_DATA_TO_CONTENT: "YCE_GET_DATA_TO_CONTENT",
    GET_DATA_TO_INTERCEPTOR: "YCE_GET_DATA_TO_INTERCEPTOR",
    SAVE_DATA_TO_CONTENT: "YCE_SAVE_DATA_TO_CONTENT",
    SAVE_DATA_INTERCEPTOR: "YCE_SAVE_DATA_INTERCEPTOR"
};
const CHANNEL_LINK = "https://www.youtube.com/channel/";
const WATCH_PAGE = 'https://www.youtube.com/watch?v=';
const LAST_LIST_PROPERTY = "lastList";
const DEFAULT_LIST_NAME = "-------";
const IGNORE = ["notifications", LAST_LIST_PROPERTY, "authorAsLink"];
const MODERATOR = "mod";
const OWNER = "owner";

function openPage(page, inForeground) {
    chrome.tabs.create(
        {
            active: inForeground,
            url:  page
        },
        null
    );
}

function addStreamItems(items) {
    let lists = document.getElementById('streamsList');
    if (lists == null) {
        return
    }
    for (let i = 0; i < items.length; i++) {
        let option = document.createElement("option");
        option.text = items[i];
        lists.appendChild(option);
    }
}

function clearStreamsItems() {
    let lists = document.getElementById('streamsList');
    for (let i = lists.options.length - 1; i > 0; i--) {
        lists.options.remove(i);
    }
}

function addMessageItem(msgItem, authorsAsLink, isPopup, onlyImportantEnabled) {
	let content = document.getElementById('content');

	let blockElement = document.createElement("div");
    if (isPopup) {
        blockElement.setAttribute("class", "messages__item");
    } else {
        if (msgItem.important && !onlyImportantEnabled) {
            blockElement.setAttribute("class", "messages__item important");
        } else {
            blockElement.setAttribute("class", "messages__item");
        }
    }
    
	let authorElement = document.createElement("span");
	authorElement.setAttribute("class", "messages__author");
    let authorText = msgItem.username;
    if (msgItem.isOwner) {
        authorText += " [O]";
        authorElement.setAttribute(OWNER, "");
    }
    if (msgItem.isModerator) {
        authorText += " [M]";

        if (!msgItem.isOwner) {
            authorElement.setAttribute(MODERATOR, "");
        }
    }

    if (authorsAsLink) {
        let linkElement = document.createElement("a");
        linkElement.setAttribute("href", getChannelUrl(msgItem.channelId));
        linkElement.innerText = authorText;
        authorElement.appendChild(linkElement);
    } else {
        authorElement.innerText = authorText;
    }
    
	blockElement.appendChild(authorElement);

	let semiElement = document.createElement("span");
	semiElement.setAttribute("class", "messages__semi");
	semiElement.innerText = ": ";
	blockElement.appendChild(semiElement);

	let messageElement = document.createElement("span");
	messageElement.setAttribute("class", "messages__message-text");
	messageElement.innerText = msgItem.message;
	blockElement.appendChild(messageElement);

	content.appendChild(blockElement);
}

function clearMessageItems() {
	let content = document.getElementById('content');
	while (content.firstChild) {
		content.removeChild(content.lastChild);
	}
}

function exportList() {
    let needExport = confirm(chrome.i18n.getMessage('export_list_msg'));
    if (needExport) {
        let listName = getSelectedStream();
        if (listName == DEFAULT_LIST_NAME) {
            return;
        }
        chrome.storage.local.get(
            null,
            function (item) {
                exportData(item, listName);
            }
        );
    }
}

function exportAll() {
    let needExport = confirm(chrome.i18n.getMessage('export_all_msg'));
    if (needExport) {
        chrome.storage.local.get(
            null,
            function (item) {
                exportData(item, null);
            }
        );
    }
}

function exportData(data, listName) {
    let content = "";
    let itemKeys = Object.keys(data);
    for(let i = 0; i < itemKeys.length; i++) {
        let streamList = itemKeys[i];
        if (isIgnored(streamList)) {
            continue;
        }
        if (listName != null && !streamList.endsWith(listName)) {
            continue;
        }
                
        content += messagesToString(streamList, data[streamList]);
    }

    if (listName == null) {
        download(content, "deleted_messages_all.txt", "text/plain");
    } else {
        download(content, "deleted_messages__" + listName + ".txt", "text/plain");
    }
}

function isIgnored(text) {
    return IGNORE.includes(text);
}

function clearAll() {
    let needClear = confirm(chrome.i18n.getMessage('clear_all_data_msg'));
    if (needClear) {
        chrome.runtime.sendMessage(
            {
                type: MESSAGE_TYPES.CLEAR
            }
        );
        clearMessageItems();
        clearStreamsItems();
    }
    return needClear;
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

function messagesToString(streamList, msgs) {
    let content = getUrlToStream(streamList) + "\n";
    let msgIds = Object.keys(msgs);
    let messages = [];
    for(let j = 0; j < msgIds.length; j++) {
        messages.push(msgs[msgIds[j]]);
    }

    messages.sort(sortMessagesByDate);

    for(let j = 0; j < messages.length; j++) {
        let msg = messages[j];
        content += "    " 
            + (msg.important ? chrome.i18n.getMessage('important'):"")
            + msg.username
            + (msg.isModerator ? " [M]":"") 
            + (msg.isOwner ? " [O]":"") 
            + ": " + msg.message + "\n";
    }
    content += "\n";
    return content;
}

function getUrlToStream(streamId) {
    return WATCH_PAGE + streamId;
}

function getChannelUrl(userId) {
    return CHANNEL_LINK + userId;
}

function getSelectedStream() {
    let streamLists = document.getElementById('streamsList');
    return streamLists.options[streamLists.options.selectedIndex].value;
}

function setLastList(name) {
    chrome.storage.local.set(
        {
            lastList: name
        }
    );
}

function loadStreamList(data) {
    clearStreamsItems();

    let keys = Object.keys(data);
    let lists = [];
    for(let i = 0; i < keys.length; i++) {
        if (isIgnored(keys[i])) {
            continue;
        }

        lists.push(keys[i]);
    }
    addStreamItems(lists);
}

function sortMessagesByDate(x, y) {
    if (x.date > y.date) {
        return 1;
    } else if (x.date < y.date) {
        return -1;
    }
    return 0;
}

function containsAuthor(authors, author) {
    let i = authors.length;
    while(i--) {
        if (authors[i].username === author) {
            return true;
        }
    }
    return false;
}

function sortByAuthor(x, y) {
    if ((x.isModerator && y.isModerator) | (x.isOwner && y.isOwner)) {
        return x.username.localeCompare(y.username);
    }

    if (x.isModerator | x.isOwner) {
        return -1;
    }

    if (y.isModerator | y.isOwner) {
        return 1;
    }

    return x.username.localeCompare(y.username);
}

function filterData(data, authors, onlyImportant) {
    let result = {
        messages: [],
        authors: []
    }

    let msgIds = Object.keys(data);
    for (let i = 0; i < msgIds.length; i++) {
        let msgItem = data[msgIds[i]];
        if (!containsAuthor(result.authors, msgItem.username)) {
            result.authors.push({
                username: msgItem.username,
                isModerator: msgItem.isModerator,
                isOwner: msgItem.isOwner,
                channelId: msgItem.channelId
            });
        }

        if (onlyImportant && !msgItem.important) {
            continue;
        }

        if (authors.length != 0 && !authors.includes(msgItem.username)) {
            continue;
        }

        result.messages.push(msgItem);
    }

    result.authors.sort(sortByAuthor);
    result.messages.sort(sortMessagesByDate);

    return result;
}

function selectStreamList(streamId) {
    let listElement = document.getElementById('streamsList');
    for (let i = 0; i < listElement.options.length; i++) {
        if (listElement.options[i].text == streamId) {
            listElement.options[i].selected = true;
            break;
        }
    }
}

function scrollMessagesToBottom() {
    let content = document.getElementById('content');
    content.scrollTop = content.scrollHeight;
}

function translateElement(element) {
    element.innerText = chrome.i18n.getMessage(element.attributes['data-i18n'].value);
}

export {
    addMessageItem,
    clearAll,
    clearMessageItems,
    DEFAULT_LIST_NAME,
    EVENT_TYPES_YCE,
    exportAll,
    exportList,
    filterData,
    getChannelUrl,
    getSelectedStream,
    LAST_LIST_PROPERTY,
    loadStreamList,
    MESSAGE_TYPES,
    MODERATOR,
    openPage,
    OWNER,
    scrollMessagesToBottom,
    setLastList,
    selectStreamList,
    translateElement
}