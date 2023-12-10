const DEFAULT_LIST_NAME = "---Выбрать---";
const DEFAULT_AUTHORS_NAME = "---Авторы---";
const LAST_LIST_PROPERTY = "lastList";
const IGNORE = ["notifications", LAST_LIST_PROPERTY];
const MESSAGE_TYPES = { NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4 };
let data = {};

let isPopup = false;

//список сообщений
function addMessageItem(msgItem) {
	let content = document.getElementById('content');

	let blockElement = document.createElement("div");
    if (isPopup) {
        blockElement.setAttribute("class", "messages__item");
    } else {
        if (msgItem.important && !isOnlyImportant()) {
            blockElement.setAttribute("class", "messages__item important");
        } else {
            blockElement.setAttribute("class", "messages__item");
        }
    }
    
	let authorElement = document.createElement("span");
	authorElement.setAttribute("class", "messages__author");
    authorElement.innerText = msgItem.username;
    if (msgItem.isOwner) {
        authorElement.innerText += " [O]";
        authorElement.setAttribute("owner", "");
    }
    if (msgItem.isModerator) {
        authorElement.innerText += " [M]";
        if (!msgItem.isOwner) {
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
//==

//список стримов
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
//==

//список авторов
function addAuthorsItems(authors) {
    let authorsLists = document.getElementById('authorsList');
    if (authorsLists == null) {
        return
    }
    for (let i = 0; i < authors.length; i++) {
        let option = document.createElement("option");
        let text = '';
        let author = authors[i];
        if (author.isModerator) {
            text = '[M]';
        }
        if (author.isOwner) {
            text = text + '[O]';
        }

        if (text === '') {
            option.text = author.username.trim();
        } else {
            option.text = text + ' ' + author.username.trim();
        }
        
        option.setAttribute('value', author.username);
        authorsLists.appendChild(option);
    }
}

function clearAuthorsItems() {
    let lists = document.getElementById('authorsList');
    for (let i = lists.options.length - 1; i > 0; i--) {
        lists.options.remove(i);
    }
}
//==

//export
function exportQ() {
    let onlyCurrent = confirm('Экспортировать только текущий список или все? (ОК - текущий)');
    if (onlyCurrent) {
        let listName = getSelectedStream();
        if (listName == DEFAULT_LIST_NAME) {
            return;
        }
        exportList(listName);
    } else {
        exportAll();
    }
}

function exportList(listname) {
	let content = "";
    let itemKeys = Object.keys(data);
    for(let i = 0; i < itemKeys.length; i++) {
        let streamList = itemKeys[i];
        if (listname != null && !streamList.endsWith(listname)) {
            continue;
        }
                
        content += messagesToString(streamList, data[streamList]);
    }

    download(content, "deleted_messages__" + listname + ".txt", "text/plain");
}

function exportAll() {
	let content = "";
    let itemKeys = Object.keys(data);
    for(let i = 0; i < itemKeys.length; i++) {
        if (isIgnored(itemKeys[i])) {
            continue;
        }
        let streamList = itemKeys[i];

        content += messagesToString(streamList, data[streamList]);
    }

    download(content, "deleted_messages_all.txt", "text/plain");
}
//==

//other
function sortByDate(x, y) {
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

function getUrlParameterValue(parameter) {
    let paramsUrl = document.location.search.substring(1);
    let params = paramsUrl.split('&');
    for (let i = 0; i < params.length; i++) {
        let param = params[i].split('=');
        if (param[0] == parameter) {
            return param[1];
        }
    }
}

function openMainPage(event) {
    chrome.tabs.create(
        {
            active: true,
            url:  'main.html'
        },
        null
    );
}

function setLastList(name) {
    chrome.storage.local.set(
        {
            lastList: name
        }
    );
}

function isIgnored(text) {
    return IGNORE.includes(text);
}

function isOnlyImportant() {
    return document.getElementById('onlyImportant').checked;
}

function getSelectedAuthor() {
    let authors = document.getElementById('authorsList');
    return authors.options[authors.options.selectedIndex].value;
}

function getSelectedStream() {
    let streamLists = document.getElementById('streamsList');
    return streamLists.options[streamLists.options.selectedIndex].value;
}

function clearAll() {
    let needClear = confirm('Очистить все данные?');
    if (needClear) {
        chrome.runtime.sendMessage(
            {
                type: MESSAGE_TYPES.CLEAR
            }
        );
        clearMessageItems();
        clearStreamsItems();
        clearAuthorsItems();
    }
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
    return 'https://www.youtube.com/watch?v=' + streamId;
}
//==

function loadStreamList() {
    clearStreamsItems();

    let keys = Object.keys(data);
    let lists = [];
    for(let i = 0; i < keys.length; i++) {
        if (isIgnored(keys[i])) {
            continue;
        }
        //добавляем только те списки, где сохранены сообщения
        /*if (Object.keys(data[keys[i]]).length != 0) {
            lists.push(keys[i]);
        }*/
        lists.push(keys[i]);
    }
    addStreamItems(lists);
}

function loadData(streamId, onlyImportant, author) {
    clearAuthorsItems();
    clearMessageItems();
    if (streamId == DEFAULT_LIST_NAME || !data.hasOwnProperty(streamId)) {
        return;
    }

    let msgIds = Object.keys(data[streamId]);
    let messages = [];
    let authors = [];
    for (let i = 0; i < msgIds.length; i++) {
        let msgItem = data[streamId][msgIds[i]];
        if (!containsAuthor(authors, msgItem.username)) {
            //authors.push(msgItem.username);
            authors.push({
                username: msgItem.username,
                isModerator: msgItem.isModerator,
                isOwner: msgItem.isOwner
            });
        }

        if (onlyImportant && !msgItem.important) {
            continue;
        }

        if (author != null && author != DEFAULT_AUTHORS_NAME && msgItem.username != author) {
            continue;
        }

        messages.push(msgItem);
    }

    authors.sort(sortByAuthor);
    addAuthorsItems(authors);

    messages.sort(sortByDate);
    for (let i = 0; i < messages.length; i++) {
        addMessageItem(messages[i]);
    }

    //отметим выбранного автора
    if (author != null) {
        let authorsListElement = document.getElementById('authorsList');
        for (let i = 0; i < authorsListElement.options.length; i++) {
        if (authorsListElement.options[i].value == author) {
            authorsListElement.options[i].selected = true;
            break;
        }
    }
    }
    
    //отметим выбранный стрим
    let listElement = document.getElementById('streamsList');
    for (let i = 0; i < listElement.options.length; i++) {
        if (listElement.options[i].text == streamId) {
            listElement.options[i].selected = true;
            break;
        }
    }
    //проскроллить вниз
    let content = document.getElementById('content');
    content.scrollTop = content.scrollHeight;
}

function reLoadStoredData() {
    chrome.storage.local.get(
        null,
        function (item) {
            data = item;
            //todo
            loadStreamList();

            if (isPopup) {
                showFilters(false);
            } else {
                showFilters(true);
            }

            if (data.hasOwnProperty(LAST_LIST_PROPERTY) && data[LAST_LIST_PROPERTY] != DEFAULT_LIST_NAME) {
                loadData(data[LAST_LIST_PROPERTY], isPopup, null);
            }
        }
    );
}

function showFilters(show) {
    let authorsList = document.getElementById('authorsList');
    let impFilter = document.getElementById('importantContainer');
    if (show) {
        authorsList.classList.remove('hidden');
        impFilter.classList.remove('hidden');
    } else {
        authorsList.classList.add('hidden');
        impFilter.classList.add('hidden');
    }
}

function switchToPopupView() {
    document.body.setAttribute('popup', '');
    document.querySelector('.title__icon').src = './icons/icon_16.png';
    document.querySelector('.title').removeAttribute('main');
    document.querySelector('.buttons').removeAttribute('main');
    document.getElementById('content').removeAttribute('main');
    document.getElementById('openMain').classList.remove('hidden');
}

function updateView(event) {
    let author = getSelectedAuthor();
    let listName = getSelectedStream();

    if (isPopup) {
        loadData(
            listName,
            true,
            null);
    } else {
        loadData(
            listName,
            isOnlyImportant(),
            author);
    }
    setLastList(listName);
}

if (getUrlParameterValue('popup') === 'true') {
    isPopup = true;
    switchToPopupView();
}

document.getElementById('openMain').addEventListener('click', openMainPage);
document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('clearAll').addEventListener('click', clearAll);
document.getElementById('export').addEventListener('click', exportQ);
document.getElementById('onlyImportant').addEventListener('click', updateView);
document.getElementById('streamsList').onchange = updateView;
document.getElementById('authorsList').onchange = updateView;

reLoadStoredData();