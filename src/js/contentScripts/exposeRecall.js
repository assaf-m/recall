import {ACTIONS} from "../actions";
import {loadRecallState} from "../recallState";

function exposeRecall() {
    const recallScript = document.createElement('script');
    recallScript.setAttribute("type", "text/javascript");
    recallScript.setAttribute("src", chrome.extension.getURL('recall.bundle.js'));
    document.lastChild.appendChild(recallScript);
}

const recallSharedStateElId = `__recall`;

function registerRecallStateChange (){
    chrome.runtime.onMessage.addListener(
        function(request, sender, sendResponse) {
            console.log(`got a message!! ${JSON.stringify(request)} ${JSON.stringify(sender)}`)
            const {action} = request;
            if(action === ACTIONS.RECALL_STATE_CHANGE){
                const {recallState} = request;
                console.debug(`RECALL - recall state change from background: ${JSON.stringify(recallState)}`);
                updateSharedState(recallState);
                sendResponse({updated: true});
            }
            return true;
        }
    );
}

function createSharedStateElement(){
    const sharedStateEl = document.createElement('div');
    sharedStateEl.setAttribute("id", recallSharedStateElId);
    sharedStateEl.setAttribute("style", "visibility: hidden; height:0px; width: 0px;")
    document.lastChild.appendChild(sharedStateEl);
}

function initSharedState(recallState) {
    const el = document.getElementById(recallSharedStateElId);
    updateSharedState(recallState);

    const observer = new MutationObserver(function(mutationsList, observer) {
        const el = document.getElementById(recallSharedStateElId);
        console.log('config changed, message in content script!!');
        console.log(el.textContent);
    });
    observer.observe(el, {characterData: false, childList: true, attributes: false});
}

function updateSharedState(recallState){
    const el = document.getElementById(recallSharedStateElId);
    el.innerText = JSON.stringify(recallState);

}

async function getRecallState(){
    return new Promise((resolve) => {
        chrome.runtime.sendMessage({action: ACTIONS.GET_RECALL_STATE}, function(response) {
            console.debug(`RECALL - got recall state from background ${JSON.stringify(response)}`);
            return resolve(response);
        });
    })
}

async function init(){
    const recallState = await getRecallState();
    createSharedStateElement();
    initSharedState(recallState);
    exposeRecall();
    registerRecallStateChange();
}

(async() => {
    await init()
})();



/*
chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        // console.log(sender.tab ?
        //     "from a content script:" + sender.tab.url :
        //     "from the extension");
        // if (request.greeting == "hello")
        //     sendResponse({farewell: "goodbye"});

        debugger
        console.log(`RECALL - debugggg`);
        console.log(request);
        console.log(sender)

    }
);
*/
