import * as common from './common.js';

let data = {};
let authorsWithLink = false;

function openMainPage(event) {
    common.openPage('pages/main.html', true);
}

function loadData(streamId) {
    common.clearMessageItems();
    if (streamId == common.DEFAULT_LIST_NAME || !data.hasOwnProperty(streamId)) {
        return;
    }

    let filteredData = common.filterData(
        data[streamId], 
        [], 
        true);

    for (let i = 0; i < filteredData.messages.length; i++) {
        common.addMessageItem(filteredData.messages[i], true, true);
    }
    
    common.selectStreamList(streamId);
    common.scrollMessagesToBottom();
}

function reLoadStoredData() {
    chrome.storage.local.get(
        null,
        function (item) {
            data = item;
            common.loadStreamList(data);

            if (data.hasOwnProperty(common.LAST_LIST_PROPERTY) 
            && data[common.LAST_LIST_PROPERTY] != common.DEFAULT_LIST_NAME) {
                loadData(data[common.LAST_LIST_PROPERTY]);
            }
        }
    );
}

function updateView(event) {
    let listName = common.getSelectedStream();

    loadData(listName);
    common.setLastList(listName);
}

document.addEventListener('DOMContentLoaded', ()=> {
    document.querySelectorAll('[data-i18n]').forEach(common.translateElement);
});

document.getElementById('openMain').addEventListener('click', openMainPage);
document.getElementById('reload').addEventListener('click', reLoadStoredData);
document.getElementById('clearAll').addEventListener('click', common.clearAll);
document.getElementById('export').addEventListener('click', common.exportList);
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