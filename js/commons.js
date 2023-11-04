const PREFIX = { STORE: "STORE_", TMP: "TMP_" };
const DEFAULT_LIST_NAME = "---Выбрать---";
const STREAM_ID_LENGTH = 11;

function addItem(author, message, isMod, isOwner) {
	let content = document.getElementById('content');

	let blockElement = document.createElement("div");
    blockElement.setAttribute("class", "messages__item");

	let authorElement = document.createElement("span");
	authorElement.setAttribute("class", "messages__author");
    authorElement.innerText = author;
    if (isOwner) {
        authorElement.innerText += " [O]";
        authorElement.setAttribute("owner", "");
    }
    if (isMod) {
        authorElement.innerText += " [M]";
        if (!isOwner) {
            authorElement.setAttribute("mod", "");
        }
    }
    
	blockElement.appendChild(authorElement);

	let semiElement = document.createElement("span");
	semiElement.setAttribute("class", "messages__semi");
	semiElement.innerText = ": ";
	blockElement.appendChild(semiElement);

	let messageElement = document.createElement("span");
	messageElement.setAttribute("class", "messages__message-text");
	messageElement.innerText = message;
	blockElement.appendChild(messageElement);

	content.appendChild(blockElement);
}

function addListItem(name) {
    let lists = document.getElementById('streamLists');

    let option = document.createElement("option");
    option.text = name;
    lists.appendChild(option);
}

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
    let onlyCurrent = confirm('Экспортировать только текущий список или все? (ОК - текущий)');
    if (onlyCurrent) {
        let lists = document.getElementById('streamLists');
        let listName = lists.selectedOptions[0].text;
        if (listName == DEFAULT_LIST_NAME) {
            return;
        } else if (!listName.startsWith(PREFIX.STORE) & !listName.startsWith(PREFIX.TMP)) {
            listName = PREFIX.STORE + listName;
        }
        exportListData(listName);
    } else {
        exportAllData();
    }
}

function exportListData(listname) {
	chrome.storage.local.get(
        null,
        function (items) {
            let content = "";
            let itemKeys = Object.keys(items);
            for(let i = 0; i < itemKeys.length; i++) {
                let streamList = itemKeys[i];
                if (!streamList.startsWith(PREFIX.STORE) & !streamList.startsWith(PREFIX.TMP)) {
                    continue;
                }
                if (listname != null && !streamList.endsWith(listname)) {
                    continue;
                }
                
                content += listToString(streamList, items[streamList]);
            }

            download(content, "deleted_messages.txt", "text/plain");
        }
    );
}

function exportAllData() {
	chrome.storage.local.get(
        null,
        function (items) {
            let content = "";
            let itemKeys = Object.keys(items);
            for(let i = 0; i < itemKeys.length; i++) {
                let streamList = itemKeys[i];
                if (!streamList.startsWith(PREFIX.STORE) & !streamList.startsWith(PREFIX.TMP)) {
                    continue;
                }

                content += listToString(streamList, items[streamList]);
            }

            download(content, "deleted_messages.txt", "text/plain");
        }
    );
}

function listToString(streamList, msgs) {
    let content = "";
    if (streamList.startsWith(PREFIX.STORE)) {
        content = getUrlToStream(streamList.slice(PREFIX.STORE.length)) + "\n";
    } else {
        content = getUrlToStream(streamList.slice(PREFIX.TMP.length)) + "\n";
    }
    let msgIds = Object.keys(msgs);
    let messages = [];
    for(let j = 0; j < msgIds.length; j++) {
        messages.push(msgs[msgIds[j]]);
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
    return content;
}

function getUrlToStream(streamId) {
    if (streamId.length > STREAM_ID_LENGTH) {
        return streamId;
    } else {
        return 'https://www.youtube.com/watch?v=' + streamId;
    }
}

function loadListData(listName) {
    clearItems();
    if (listName == DEFAULT_LIST_NAME) {
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
                
                addItem(username, msgItem.message, msgItem.isModerator, msgItem.isOwner);
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

export {
    sortByDate,
    download,
    clearItems,
    clearListItems,
    exportListData,
    PREFIX,
    DEFAULT_LIST_NAME,
    STREAM_ID_LENGTH,
    getUrlToStream,
    addItem,
    addListItem,
    loadListData,
    exportData
}