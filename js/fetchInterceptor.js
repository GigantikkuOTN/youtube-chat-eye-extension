const constantMock = window.fetch;
const mutedBannedId_YCE = "mutedBannedId_";
const EVENT_TYPES_YCE = {
    NOTIFICATION: "YCE_NOTIFICATION",
    GET_DATA_TO_CONTENT: "YCE_GET_DATA_TO_CONTENT",
    GET_DATA_TO_INTERCEPTOR: "YCE_GET_DATA_TO_INTERCEPTOR",
    SAVE_DATA_TO_CONTENT: "YCE_SAVE_DATA_TO_CONTENT",
    SAVE_DATA_INTERCEPTOR: "YCE_SAVE_DATA_INTERCEPTOR"
};
let dataRequested_YCE = false;
let saveStarted_YCE = false;
let currentStreamId_YCE = "";
let data_YCE = {};
/*
data format:
{
    messageId_1: {
        date: 6516516165165161,
        important: true,
        username: "",
        message: "",
        isModerator: false,
        isOwner: false,
        channelId: "alsdbflkasbdlkfgb"
    },
    ...
}
*/
let authors_YCE = {};
/*
{
    channel_id_1: {
        username: "User",
        isModerator: false,
        isOwner: false
    },
    ...
}
*/


/*
let timerId = setTimeout(
    function tick() {
        alert('tick');
        timerId = setTimeout(tick, 2000);
    },
    2000);
*/

window.fetch = function() {
    return new Promise((resolve, reject) => {
        constantMock.apply(this, arguments)
            .then((response) => {
                if (response) {
                    response.clone().json()
                    .then( (json) => {
                        YCE_processJson(json);
                        resolve(response);
                    })
                    .catch((error) => {
                        console.log(error);
                        reject(response);
                    })
                } else {
                    console.log(arguments);
                    console.log('Undefined Response!');
                    reject(response);
                }
            })
            .catch((error) => {
                console.log(error);
                reject(response);
            })
    })
}

window.addEventListener(
    EVENT_TYPES_YCE.GET_DATA_TO_INTERCEPTOR,
    function(event) {
        YCE_addRequestedData(event.detail.savedata);
    },
    false
);

function YCE_addRequestedData(newData) {
    let msgIds = Object.keys(newData);
    for (let i = 0; i < msgIds.length; i++) {
        let msgId = msgIds[i];
        if (!data_YCE.hasOwnProperty(msgId)) {
            data_YCE[msgId] = newData[msgId];
        }
        YCE_addAuthor(
            newData[msgId].channelId,
            {
                username: newData[msgId].username,
                isModerator: newData[msgId].isModerator,
                isOwner: newData[msgId].isOwner
            }
        );
    }
}

function YCE_requestData(streamId) {
    YCE_sendMessage(
        EVENT_TYPES_YCE.GET_DATA_TO_CONTENT, 
        streamId
    );
}

function YCE_saveData(streamId) {
    YCE_sendMessage(
        EVENT_TYPES_YCE.SAVE_DATA_TO_CONTENT, 
        {
            stream_Id: streamId,
            savedata: data_YCE
        }
    );
    setTimeout(YCE_saveData, 30000, streamId);
}

function YCE_processJson(json) {
    if (YCE_hasContinuation(json) && !YCE_hasStreamId()) {
        currentStreamId_YCE = YCE_findStreamId(json.continuationContents.liveChatContinuation.continuations);
    }

    if (YCE_hasContinuation(json) && !dataRequested_YCE && YCE_hasStreamId()) {
        YCE_requestData(currentStreamId_YCE);
        dataRequested_YCE = true;
    }

    if (!saveStarted_YCE && YCE_hasStreamId()) {
        setTimeout(
            YCE_saveData,
            30000,
            currentStreamId_YCE
        );
        saveStarted_YCE = true;
    }

    if (!YCE_hasActions(json)) {
        return;
    }

    let jsonActions = json.continuationContents.liveChatContinuation.actions;

    for(let i = 0; i < jsonActions.length; i++) {
        let actionNode = jsonActions[i];
        if (actionNode.hasOwnProperty('removeChatItemAction')) {
            YCE_actionRemove(actionNode.removeChatItemAction.targetItemId);
        } else if (actionNode.hasOwnProperty('addChatItemAction')) {
            if (!YCE_hasLiveChatTextMessageRenderer(actionNode.addChatItemAction)) {
                continue;
            }

            let msgNode = actionNode.addChatItemAction.item.liveChatTextMessageRenderer;
            let messageItem = {
                date: Date.now(),
                important: false,
                channelId: msgNode.authorExternalChannelId,
                isModerator: false,
                isOwner: false,
                username: msgNode.authorName.simpleText,
                message: YCE_getMessage(msgNode.message.runs)
            };

            if (msgNode.hasOwnProperty('authorBadges')) {
                if (YCE_isOwner(msgNode.authorBadges)) {
                    messageItem.isModerator = true;
                    messageItem.isOwner = true;
                } else if (YCE_isModerator(msgNode.authorBadges)) {
                    messageItem.isModerator = true;
                }
            }

            YCE_actionAdd(msgNode.id, messageItem);
        } else if (actionNode.hasOwnProperty('removeChatItemByAuthorAction')) {
            YCE_actionMuteBan(actionNode.removeChatItemByAuthorAction.externalChannelId);
        }
    }
}

function YCE_hasStreamId() {
    return currentStreamId_YCE.length != 0;
}

function YCE_isModerator(authorBadges) {
    for (let j = 0; j < authorBadges.length; j++) {
        if (authorBadges[j].hasOwnProperty('liveChatAuthorBadgeRenderer')
            && authorBadges[j].liveChatAuthorBadgeRenderer
            && authorBadges[j].liveChatAuthorBadgeRenderer.hasOwnProperty('tooltip')) {
                if (authorBadges[j].liveChatAuthorBadgeRenderer.tooltip == 'Модератор') {
                    return true;
                }
        }
    }
    return false;
}

function YCE_isOwner(authorBadges) {
    for (let j = 0; j < authorBadges.length; j++) {
        if (authorBadges[j].hasOwnProperty('liveChatAuthorBadgeRenderer')
            && authorBadges[j].liveChatAuthorBadgeRenderer
            && authorBadges[j].liveChatAuthorBadgeRenderer.hasOwnProperty('tooltip')) {
                if (authorBadges[j].liveChatAuthorBadgeRenderer.tooltip == 'Владелец') {
                    return true;
                }
        }
    }
    return false;
}

function YCE_hasActions(node) {
    return node.hasOwnProperty('continuationContents') 
        && node.continuationContents.hasOwnProperty('liveChatContinuation')
        && node.continuationContents.liveChatContinuation.hasOwnProperty('actions');
}

function YCE_hasContinuation(node) {
    return node.hasOwnProperty('continuationContents') 
        && node.continuationContents.hasOwnProperty('liveChatContinuation')
        && node.continuationContents.liveChatContinuation.hasOwnProperty('continuations');
}

function YCE_getMessage(runsNode) {
    let msg = "";
    for (let k = 0; k < runsNode.length; k++) {
        if (runsNode[k].hasOwnProperty('text')) {
            msg += runsNode[k].text;
        } else if (runsNode[k].hasOwnProperty('emoji')) {
            msg += runsNode[k].emoji.emojiId;
        }
    }
    return msg;
}

function YCE_hasLiveChatTextMessageRenderer(itemAction) {
    return itemAction.hasOwnProperty('item') && itemAction.item.hasOwnProperty('liveChatTextMessageRenderer');
}

function YCE_sendMessage(type, msg) {
    let event = new CustomEvent(
        type, 
        {
            detail: msg
        }
    );
    window.dispatchEvent(event);
}

function YCE_findStreamId(continuations) {
    for (let i = 0; i < continuations.length; i++) {
        if (continuations[i].hasOwnProperty('invalidationContinuationData') 
            && continuations[i].invalidationContinuationData.hasOwnProperty('invalidationId')
            && continuations[i].invalidationContinuationData.invalidationId.hasOwnProperty('topic')) {
            return YCE_getStreamIdFromTopic(continuations[i].invalidationContinuationData.invalidationId.topic);
        }
    }

    return "STREAM_ID_NOT_FOUNDED";
}

function YCE_getStreamIdFromTopic(topic) {
    let m = topic.match(/chat~([^~]+)/);
    return m == null ? topic : m[1];
}

function YCE_addAuthor(channelId, user) {
    if (!authors_YCE.hasOwnProperty(channelId)) {
        authors_YCE[channelId] = user;
        console.log('[YCE_addAuthor] Adding author: ' + JSON.stringify(user));
    }
}

function YCE_getAuthor(channelId) {
    if (authors_YCE.hasOwnProperty(channelId)) {
        return authors_YCE[channelId];
    } else {
        return null;
    }
}

function YCE_actionAdd(messageId, messageItem) {
    if (data_YCE.hasOwnProperty(messageId)) {
        return;
    }

    console.log('[YCE_actionAdd] Adding message: ' + JSON.stringify(messageItem));
    data_YCE[messageId] = messageItem;
    YCE_addAuthor(
        messageItem.channelId,
        {
            username: messageItem.username,
            isModerator: messageItem.isModerator,
            isOwner: messageItem.isOwner
        }
    );
}

function YCE_actionRemove(messageId) {
    if (!data_YCE.hasOwnProperty(messageId)) {
        return;
    }

    let msg = data_YCE[messageId];
    console.log('[YCE_actionRemove] Adding message to storedata: ' + JSON.stringify(msg));

    if (!msg.important) {
        msg.important = true;
        YCE_sendMessage(
            EVENT_TYPES_YCE.NOTIFICATION, 
            {
                titleText: "The message has been deleted",
                messageText: msg.username + (msg.isModerator ? " [M]":"")+ (msg.isOwner ? " [O]":"")+ ': ' + msg.message
            }
        );
    }   
}

function YCE_actionMuteBan(channelId) {
    var foundedUser = YCE_getAuthor(channelId);
    if (foundedUser == null) {
        return;
    }

    let messageId = mutedBannedId_YCE + Date.now();
    var messageItem = {};
    messageItem["date"] = Date.now();
    messageItem["important"] = true;
    messageItem["channelId"] = channelId;
    messageItem["isModerator"] = foundedUser.isModerator;
    messageItem["isOwner"] = foundedUser.isOwner;
    messageItem["message"] = "[Banned or Muted]";
    messageItem["username"] = foundedUser.username;

    console.log('[YCE_actionMuteBan] Muted or Banned user: ' + JSON.stringify(messageItem));
    YCE_actionAdd(messageId, messageItem);
    YCE_sendMessage(
        EVENT_TYPES_YCE.NOTIFICATION, 
        {
            titleText: "The user has been banned or muted",
            messageText: foundedUser.username + (foundedUser.isModerator ? " [M]":"")+ (foundedUser.isOwner ? " [O]":"")
        }
    );
}