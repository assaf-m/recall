import Pretender from 'pretender';
import objectHash from 'object-hash';
import {requestsStore} from "./db";

const start = Date.now();
console.debug(`Recall pretenderServer init start ${start}`);
const recallSharedStateElId = '__recall';
let recallState;
let pretenderServer;
const hashToUrl = {};


const actionOnConfigChange = async () => {
  if(!recallState.enabled && pretenderServer){
      console.debug(`RECALL - stopping requests caching`);
      pretenderServer.shutdown();
      pretenderServer = null;
  }
  else if(recallState.enabled && !pretenderServer){
      console.debug(`RECALL - starting requests caching`);
      await createRecall();
  }
};

const clearRequestsIfNeeded = async () => {
    const el = document.getElementById(recallSharedStateElId);
    const shouldClear = el.hasAttribute('recall-clear-requests');
    if(shouldClear){
        await requestsStore.clear();
        if(recallState.enabled){
            createPretenderServer();
            await registerPathsFromDb();
        }
        el.removeAttribute('recall-clear-requests')
    }




};

const reloadRecallConfig = async () => {
  const el = document.getElementById(recallSharedStateElId);
    try {
        recallState = JSON.parse(el.textContent);
        await actionOnConfigChange();
    }
    catch (e) {}
};


const readInitialRecallState = async () => {
    const el = document.getElementById(recallSharedStateElId);
    if(!el){
        console.error('RECALL - missing initial state!');
    }
    const observer = new MutationObserver(async function(mutationsList, observer) {
        await reloadRecallConfig();
        await clearRequestsIfNeeded();
    });
    observer.observe(el, {characterData: false, childList: true, attributes: true});
    await reloadRecallConfig();

};


const createPretenderServer = () => {
  pretenderServer && pretenderServer.shutdown();
  pretenderServer =  new Pretender(function() {
      this.unhandledRequest = async function(verb, path, request) {
          const requestHash = objectHash({verb, path, body: request.requestBody});
          console.debug(`RECALL - new request: ${verb}:${path}, with params: ${shortenParams(request)}`);
          const xhr = request.passthrough(); // <-- A native, sent xhr is returned
          xhr.onloadend = (ev) => {
              pretenderServer[verb.toLowerCase()](requestHash, req => [200, {'content-type': 'application/javascript'}, xhr.response]);
              requestsStore.set(requestHash, {verb, response: xhr.response, requestHash, path});
          };
      };
  });
};

const registerPathsFromDb = async () => {
    const results = await requestsStore.getAll();
    results.forEach(({requestHash, response, verb, path}) => {
        pretenderServer[verb.toLowerCase()](requestHash, req => [200, {'content-type': 'application/javascript'}, response]);
        console.log(`RECALL - register new api cache for ${verb}:${path} , requestHash ${requestHash}`);
    });
}


const end = Date.now();
console.log(`Recall pretenderServer init end ${end}`);
console.log(`Recall pretenderServer init ${end - start}`);


const isApiRequestRegistered = ({verb, url}) => {
    const match =  pretenderServer._handlerFor(verb, url, {});
    return match
};

const shortenParams = request => request.requestBody && request.requestBody.length > 100 ? request.requestBody.slice(0,100) : request.requestBody

export const createRecall = async () => {
    createPretenderServer();
    await registerPathsFromDb();

    //console.debug('RECALL - after  pretenderServer init')
    // overriding fetch is required in order to make apollo-client work w/ pretender:
    // https://github.com/pretenderjs/pretender/issues/60
    // https://github.com/apollostack/apollo-client/issues/269
    pretenderServer._ogFetch = window.fetch;
    window.fetch = fetch;

    pretenderServer.originalShutdown = pretenderServer.shutdown;
    pretenderServer.shutdown = function () {
        window.fetch = pretenderServer._ogFetch;
        pretenderServer.originalShutdown(...arguments);
    };

    pretenderServer.handledRequest = function(verb, path, request) {
        console.debug(`RECALL - return cached response for ${verb}:${request._recallUrl}, with params: ${shortenParams(request)}`)
    };


    let pretenderFetch  = window.fetch;
    let pretenderXhrOpen = XMLHttpRequest.prototype.open;
    let pretenderXhrSend = XMLHttpRequest.prototype.send;

    window.fetch = async function(url, options){
        const verb = options && options.method || "GET";
        const requestHash = objectHash({verb, path: url, body: options.body});
        const apiRequestRegistered = isApiRequestRegistered({verb, url: requestHash});
        if(apiRequestRegistered){
            hashToUrl[requestHash] = url;
            //console.debug(`RECALL - fetch: ${url} --- ${requestHash}`);
            url = requestHash;
        }
        return pretenderFetch(url, options);
    };

    XMLHttpRequest.prototype.open = function(verb, url){
        this._recallVerb = verb;
        this._recallUrl = hashToUrl[url] || url;
        pretenderXhrOpen.apply(this, arguments);

    };

    XMLHttpRequest.prototype.send = function(params){
        params = params || null;
        const requestHash = objectHash({verb: this._recallVerb, path: this._recallUrl, body: params});

        const apiRequestRegistered = isApiRequestRegistered({verb: this._recallVerb, url: requestHash});
        if(apiRequestRegistered){
            //console.debug(`RECALL - xhr send: ${this._recallUrl} --- ${requestHash}`)
            this.url = requestHash;
        }
        pretenderXhrSend.apply(this, arguments);
    };


};



(async () => {
    const start = Date.now();
    console.debug(`Recall script load start ${start}`);
    await readInitialRecallState();
    //await createRecall();
    const end = Date.now();
    console.debug(`Recall script load end ${end}`);
    console.debug(`Recall script load latency ${end - start}`)
})();
