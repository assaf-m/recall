function exposeRecall() {
    const recallScript = document.createElement('script');
    //recallScript.type = 'text/javascript';
    recallScript.setAttribute("type", "text/javascript");
    recallScript.setAttribute("src", chrome.extension.getURL('recall.bundle.js'));
    document.lastChild.appendChild(recallScript);
}

exposeRecall();
