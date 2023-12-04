import * as common from './js/commons.js';

function reLoadStoredData() {
	common.clearItems();
    common.loadLists();
    chrome.storage.local.get(
        {
            lastList: common.DEFAULT_LIST_NAME
        },
        function (item) {
            if (item.lastList == common.DEFAULT_LIST_NAME) {
                return;
            }

            common.loadListData(true, null, item.lastList);
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

function listSelected(event) {
    let listName = event.target.options[event.target.selectedIndex].text;
    setLastList(listName);
    common.loadListData(true, null, listName);
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

document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('openMain').addEventListener('click', openMainPage);
document.getElementById('export').addEventListener('click', common.exportData);
document.getElementById('streamLists').onchange = listSelected;

reLoadStoredData();