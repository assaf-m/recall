import {ACTIONS} from "./actions";

export const loadRecallState = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.get('recallState', function(result) {
            const recallState = result.recallState || {};
            console.debug(`loadRecallState: ${JSON.stringify(recallState)}`)
            return resolve(recallState);
        });
    })
};

export  const setRecallState = (state) => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.set({recallState: state}, function(result) {
            resolve(result);
        });
    })
};

export const removeRecallState = () => {
    return new Promise((resolve, reject) => {
        chrome.storage.local.clear(function(result) {
            return resolve();
        });
    })
};

export const messageRecallStateToDOM = async () => {
    console.debug(`messageRecallStateToDOM start`);
    const recallState = await loadRecallState();
    console.debug(`messageRecallStateToDOM - starting communication with content script`);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: ACTIONS.RECALL_STATE_CHANGE, recallState}, function(response) {
            console.debug(`messageRecallStateToDOM - response from DOM: ${response}`)
        });
    });
};


export const clearRequests = () => {
    console.debug(`clearRequests start`);
    console.debug(`clearRequests - starting communication with content script`);
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
        chrome.tabs.sendMessage(tabs[0].id, {action: ACTIONS.CLEAR_REQUESTS}, function(response) {
            console.debug(`clearRequests - response from DOM: ${response}`)
        });
    });
};
