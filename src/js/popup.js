import "../css/popup.css";
import {loadRecallState, setRecallState,  messageRecallStateToDOM} from "./recallState";

const ON_OFF_SWITCH = 'record-requests';


const setRecallStateInPopUp = async () => {
  const recallState = await loadRecallState();
  const el = document.getElementById(ON_OFF_SWITCH);
  console.debug(`Setting recall state in popup: ${JSON.stringify(recallState)}`);
  el.checked = recallState.enabled;
};




const registerOnOffHandler = () => {
    const el = document.getElementById(ON_OFF_SWITCH);
    el.addEventListener('change', async function(){
        const recallState = await loadRecallState();
        const enabled = el.checked;
        await loadRecallState();
        recallState.enabled = enabled;
        console.log('new recallstate')
        console.log(recallState);
        await setRecallState(recallState);
        await messageRecallStateToDOM();
    });
};





(async () => {
    registerOnOffHandler();
    await setRecallStateInPopUp();
})();


