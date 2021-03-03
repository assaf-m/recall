import '../img/lightning.png';
import {loadRecallState, setRecallState} from "./recallState";
import {ACTIONS} from "./actions";

chrome.runtime.onMessage.addListener(
    function(request, sender, sendResponse) {
        const {action} = request;
        if(action === ACTIONS.GET_RECALL_STATE){
            console.debug(`RECALL - Content script want to get the recall state`);
            loadRecallState().then(recallState => {
                console.debug(`RECALL - Got this recallState, sending back to content script ${JSON.stringify(recallState)}`);
                sendResponse(recallState);
            });
        }
        return true;
    }
);

const init = async () => {
    const recallState = await loadRecallState();
    console.debug('RECALL - first state load');
    console.log(`recall state: ${JSON.stringify(recallState)}`);
    if(Object.keys(recallState).length === 0){
        console.debug('RECALL - init with default state');
        await setRecallState({enabled: true});
        await loadRecallState();
        console.log(recallState);
    }
};


(async () => {
    await init()
})();

