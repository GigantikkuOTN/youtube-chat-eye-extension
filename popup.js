import * as common from './js/commons.js';

function loadLists() {
    common.clearListItems();
    chrome.storage.local.get(
        null,
        function (items) {
            let keys = Object.keys(items);
            for(let i = 0; i < keys.length; i++) {
                if (!keys[i].startsWith(common.PREFIX.STORE)) {
                    continue;
                }

                //добавляем только те списки, где сохранены сообщения
                if (Object.keys(items[keys[i]]).length != 0) {
                    common.addListItem(keys[i].slice(common.PREFIX.STORE.length));//.slice(PREFIX.STORE.length)
                }
            }
        }
    );
}

function reLoadStoredData() {
	common.clearItems();
    loadLists();
    chrome.storage.local.get(
        {
            lastList: common.DEFAULT_LIST_NAME
        },
        function (item) {
            if (item.lastList == common.DEFAULT_LIST_NAME) {
                return;
            }

            common.loadListData(item.lastList);
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
    if (listName != common.DEFAULT_LIST_NAME) {
        listName = common.PREFIX.STORE + listName;
    }
    setLastList(listName);
    common.loadListData(listName);
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