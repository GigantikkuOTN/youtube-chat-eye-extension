const MESSAGE_TYPES = {NOTIFICATION:0, SETTINGS_CHANGED: 1, SAVE_DATA: 2, GET_DATA: 3, CLEAR: 4};
function save() {
    chrome.storage.local.set(
        {
            notifications: document.getElementById("notifications").checked,
            authorAsLink: document.getElementById("authorsLink").checked
        },
        function () {
            console.log('Settings saved');
            chrome.runtime.sendMessage(
                {
                    type: MESSAGE_TYPES.SETTINGS_CHANGED
                }
            );
        }
    );
}

function load() {
    chrome.storage.local.get(
        {
            notifications: false,
            authorAsLink: false
        },
        function (items) {
            document.getElementById("notifications").checked = items.notifications;
            document.getElementById("authorsLink").checked = items.authorAsLink;
            console.log('Settings loaded');
        }
    );
}

document.addEventListener("DOMContentLoaded", load);
document.getElementById('save').addEventListener("click", save);