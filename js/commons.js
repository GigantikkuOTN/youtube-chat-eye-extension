const DEFAULT_LIST_NAME = "---Выбрать---";
const DEFAULT_AUTHORS_NAME = "---Авторы---";
const IGNORE = ["notifications", "lastList"];
const STREAM_ID_LENGTH = 11;

function addItem(author, message, isImportant, isMod, isOwner) {
	let content = document.getElementById('content');

	let blockElement = document.createElement("div");
    if (isPopup()) {
        blockElement.setAttribute("class", "messages__item");
    } else {
        if (isImportant) {
            blockElement.setAttribute("class", "messages__item important");
        } else {
            blockElement.setAttribute("class", "messages__item");
        }
    }
    
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

function addListItems(items) {
    let lists = document.getElementById('streamLists');
    if (lists == null) {
        return
    }
    for (let i = 0; i < items.length; i++) {
        let option = document.createElement("option");
        option.text = items[i];
        lists.appendChild(option);
    }
}

function addAuthorsItems(authors) {
    let authorsLists = document.getElementById('authorsList');
    if (authorsLists == null) {
        return
    }
    for (let i = 0; i < authors.length; i++) {
        let option = document.createElement("option");
        option.text = authors[i];
        authorsLists.appendChild(option);
    }
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

function clearAuthorsItems() {
    let lists = document.getElementById('authorsList');
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
                if (isIgnored(itemKeys[i])) {
                    continue;
                }
                let streamList = itemKeys[i];

                content += listToString(streamList, items[streamList]);
            }

            download(content, "deleted_messages.txt", "text/plain");
        }
    );
}

function listToString(streamList, msgs) {
    let content = getUrlToStream(streamList) + "\n";
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

function loadLists() {
    clearListItems();
    chrome.storage.local.get(
        null,
        function (items) {
            let keys = Object.keys(items);
            let lists = [];
            for(let i = 0; i < keys.length; i++) {
                if (isIgnored(keys[i])) {
                    continue;
                }
                //добавляем только те списки, где сохранены сообщения
                if (Object.keys(items[keys[i]]).length != 0) {
                    lists.push(keys[i]);
                    //addListItem(keys[i]);
                }
            }
            addListItems(lists);
        }
    );
}

function loadListData(onlyImportant, author, listName) {
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

            let authors = [];

            for (let i = 0; i < messages.length; i++) {
                let msgItem = messages[i];
                if (onlyImportant && !msgItem.important) {
                    continue;
                }
                let username = msgItem.username;
                if (author != null && author != DEFAULT_AUTHORS_NAME && username != author) {
                    continue;
                }

                if (!authors.includes(username)) {
                    authors.push(username);
                }
                
                addItem(username, msgItem.message,msgItem.important, msgItem.isModerator, msgItem.isOwner);
            }

            if (author != null) {
                clearAuthorsItems();
                authors.sort();
                addAuthorsItems(authors);
                let authorsListElement = document.getElementById('authorsList');
                for (let i = 0; i < authorsListElement.options.length; i++) {
                    if (authorsListElement.options[i].text == author) {
                        authorsListElement.options[i].selected = true;
                        break;
                    }
                }
            }

            let listElement = document.getElementById('streamLists');
            for (let i = 0; i < listElement.options.length; i++) {
                if (listElement.options[i].text == listName) {
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

function isIgnored(text) {
    return IGNORE.includes(text);
}

function isPopup() {
    return document.location.href.endsWith("popup.html");
}

function isMain() {
    return document.location.href.endsWith("main.html");
}

export {
    sortByDate,
    download,
    clearItems,
    clearListItems,
    clearAuthorsItems,
    exportListData,
    loadLists,
    DEFAULT_LIST_NAME,
    DEFAULT_AUTHORS_NAME,
    STREAM_ID_LENGTH,
    isIgnored,
    getUrlToStream,
    addItem,
    addListItems,
    addAuthorsItems,
    loadListData,
    exportData
}