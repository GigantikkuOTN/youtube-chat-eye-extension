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
}

function loadLists() {
    common.clearListItems();
    chrome.storage.local.get(
        null,
        function (items) {
            let keys = Object.keys(items);
            for(let i = 0; i < keys.length; i++) {
                if (!keys[i].startsWith(common.PREFIX.STORE) & !keys[i].startsWith(common.PREFIX.TMP)) {
                    continue;
                }

                //добавляем только те списки, где сохранены сообщения
                if (Object.keys(items[keys[i]]).length != 0) {
                    common.addListItem(keys[i]);
                }
            }
        }
    );
}

function reLoadStoredData() {
	common.clearItems();
    loadLists();
}

function listSelected(event) {
    let listName = event.target.options[event.target.selectedIndex].text;
    common.loadListData(listName);
}

document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('clearAll').addEventListener('click', clearAll);
document.getElementById('export').addEventListener('click', common.exportData);
document.getElementById('streamLists').onchange = listSelected;

reLoadStoredData();