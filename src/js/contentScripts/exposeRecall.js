function exposeRecall() {
    const recallScript = document.createElement('script');
    //recallScript.type = 'text/javascript';
    recallScript.setAttribute("type", "module");
    recallScript.setAttribute("src", chrome.extension.getURL('recall.bundle.js'));
    const head = document.head || document.getElementsByTagName("head")[0] || document.documentElement;
    head.insertBefore(recallScript, head.lastChild);
}


function checkForDOM() {
    if (document.body && document.head) {
        exposeRecall();
    } else {
        requestIdleCallback(checkForDOM);
    }
}

console.debug('RECALL - extension initiated');
requestIdleCallback(checkForDOM);
