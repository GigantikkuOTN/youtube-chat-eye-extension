import * as common from './common.js';

let data = {};
let authorsWithLink = false;

function addAuthorItems(authors) {
    let authorsLists = document.getElementById('authorsList');
    if (authorsLists == null) {
        return
    }

    for(let i = 0; i < authors.length; i++) {
        let author = authors[i];
        let label = document.createElement('label');
        label.classList.add('messages__author');
        label.classList.add('big');
        let input = document.createElement('input');
        input.setAttribute('type', 'checkbox');
        label.appendChild(input);

        let text = '';

        if (author.isModerator) {
            text = '[M]';
            if (!author.isOwner) {
                label.setAttribute(common.MODERATOR, "");
            }
        }
        if (author.isOwner) {
            text = text + '[O]';
            label.setAttribute(common.OWNER, "");
        }

        if (text === '') {
            text = author.username.trim();
        } else {
            text = text + ' ' + author.username.trim();
        }

        if (authorsWithLink) {
            let href = document.createElement('a');
            href.setAttribute('href', common.getChannelUrl(author.channelId));
            href.innerText = text;

            label.appendChild(href);
        } else {
            label.appendChild(document.createTextNode(text));
        }

        input.setAttribute('data', author.username);
        authorsLists.appendChild(label);
    }
}

function clearAuthorsItems() {
    let authorsLists = document.getElementById('authorsList');
    if (authorsLists == null) {
        return
    }

	while (authorsLists.firstChild) {
		authorsLists.removeChild(authorsLists.lastChild);
	}
}

function loadData(streamId, clearLoad) {
    let selectedAuthors = [];
    if (!clearLoad) {
        selectedAuthors = getSelectedAuthors();
    }
    
    clearAuthorsItems();
    common.clearMessageItems();
    if (streamId == common.DEFAULT_LIST_NAME || !data.hasOwnProperty(streamId)) {
        return;
    }
    let onlyImportant = clearLoad ? false:isOnlyImportant();

    let filteredData = common.filterData(
        data[streamId], 
        selectedAuthors, 
        onlyImportant);

    for (let i = 0; i < filteredData.messages.length; i++) {
        common.addMessageItem(filteredData.messages[i], false, onlyImportant);
    }

    addAuthorItems(filteredData.authors);

    for (let i = 0; i < selectedAuthors.length; i++) {
        let input = document.querySelector('#authorsList input[data="' + selectedAuthors[i] + '"]')
        input.checked = true;
    }

    let inputs = document.querySelectorAll('#authorsList input');
    for(let i = 0; i < inputs.length; i++) {
        inputs[i].addEventListener('change', updateView);
    }
    
    common.selectStreamList(streamId);
    common.scrollMessagesToBottom();
}



function isOnlyImportant() {
    return document.getElementById('onlyImportant').checked;
}

function getSelectedAuthors() {
    let selectedAuthors = [];
    let sel = document.querySelectorAll('#authorsList .messages__author input');
    for (let i = 0; i < sel.length; i++) {
        let input = sel[i];
        if (input.checked) {
            selectedAuthors.push(input.attributes['data'].value);
        }
    }
    return selectedAuthors;
}

function removeAuthorsSelection() {
    clearAuthorsItems();
    updateView(null);
}


function reLoadStoredData() {
    chrome.storage.local.get(
        null,
        function (item) {
            data = item;
            common.loadStreamList(data);

            if (data.hasOwnProperty(common.LAST_LIST_PROPERTY) 
            && data[common.LAST_LIST_PROPERTY] != common.DEFAULT_LIST_NAME) {
                loadData(data[common.LAST_LIST_PROPERTY], false);
            }
        }
    );
}

function clearAll() {
    if (common.clearAll()) {
        clearAuthorsItems();
    }
}

function updateView(event) {
    let listName = common.getSelectedStream();

    let isStreamListEvent = 
        event != null 
        && event.target.hasAttribute('id') 
        && event.target.getAttribute('id') == "streamsList";
    if (isStreamListEvent) {
        document.getElementById('onlyImportant').checked = false;
    }
    loadData(listName, isStreamListEvent);
    
    common.setLastList(listName);
}

function openSettingsPage(event) {
    common.openPage('pages/settings.html', true);
}

document.addEventListener('DOMContentLoaded', ()=> {
    document.querySelectorAll('[data-i18n]').forEach(common.translateElement);
});

document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('clearAll').addEventListener('click', clearAll);
document.getElementById('export').addEventListener('click', common.exportList);
document.getElementById('exportAll').addEventListener('click', common.exportAll);
document.getElementById('onlyImportant').addEventListener('click', updateView);
document.getElementById('remSelect').addEventListener('click', removeAuthorsSelection);
document.getElementById('openSettings').addEventListener('click', openSettingsPage);
document.getElementById('streamsList').onchange = updateView;

chrome.storage.local.get(
    {
        authorAsLink: false
    },
    function (items) {
        authorsWithLink = items.authorAsLink;
        reLoadStoredData();
    }
);