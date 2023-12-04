import * as common from './js/commons.js';

const MESSAGE_TYPES = { NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4 };

function clearAll() {
    chrome.runtime.sendMessage(
        {
            type: MESSAGE_TYPES.CLEAR
        }
    );
	common.clearItems();
    common.clearListItems();
    common.clearAuthorsItems();
}

function showFilters(show) {
    let authorsList = document.getElementById('authorsList');
    let impFilter = document.getElementById('importantContainer');
    if (show) {
        if (authorsList.classList.contains('hidden')) {
            authorsList.classList.remove('hidden');
        }
        if (impFilter.classList.contains('hidden')) {
            impFilter.classList.remove('hidden');
        }
    } else {
        if (!authorsList.classList.contains('hidden')) {
            authorsList.classList.add('hidden');
        }
        if (!impFilter.classList.contains('hidden')) {
            impFilter.classList.add('hidden');
        }
    }
}

function reLoadStoredData() {
	common.clearItems();
    common.loadLists();
    showFilters(false);
}

function updateView(event) {
    let authors = document.getElementById('authorsList');
    let streamLists = document.getElementById('streamLists');
    let author = authors.options[authors.options.selectedIndex].value;
    let listName = streamLists.options[streamLists.options.selectedIndex].value;
    common.loadListData(
        document.getElementById('onlyImportant').checked,
        author,
        listName);
    showFilters(listName != common.DEFAULT_LIST_NAME);
}

document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('clearAll').addEventListener('click', clearAll);
document.getElementById('export').addEventListener('click', common.exportData);
document.getElementById('onlyImportant').addEventListener('click', updateView);
document.getElementById('streamLists').onchange = updateView;
document.getElementById('authorsList').onchange = updateView;

reLoadStoredData();