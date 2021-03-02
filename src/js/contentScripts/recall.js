import Pretender from 'pretender';
import objectHash from 'object-hash';
import {requestsStore} from "./db";


let pretenderServer;
let hashedRequests = {};
const hashToUrl = {};


const createHashedRequestsMap = async () => {
    const newHashedRequests = {};
    const result = await requestsStore.getAll();
    result.forEach(({verb, response, requestHash}) => {
        newHashedRequests[requestHash] = {verb, response}
    });
    return newHashedRequests;
};

const shortenParams = request => request.requestBody && request.requestBody.length > 100 ? request.requestBody.slice(0,100) : request.requestBody

export const createRecall = async () => {
    console.debug('RECALL - createRecall');
    hashedRequests = {};
    const tempHashedRequests = await createHashedRequestsMap();
    console.debug('RECALL - before  pretenderServer shutdown')
    pretenderServer && pretenderServer.shutdown();
    console.debug('RECALL - before  pretenderServer init')
    pretenderServer = new Pretender(function() {
        Object.keys(tempHashedRequests).forEach(hashedRequest => {
            const {verb, response} = tempHashedRequests[hashedRequest];
            this[verb.toLowerCase()](hashedRequest, req => [200, {'content-type': 'application/javascript'}, response]);
        });
    });
    console.debug('RECALL - after  pretenderServer init')


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

    pretenderServer.unhandledRequest = async function(verb, path, request) {
        const requestHash = objectHash({verb, path, body: request.requestBody});
        //console.debug(`RECALL - new request: ${verb}:${path}, with params: ${request.requestBody}`);
;
        console.debug(`RECALL - new request: ${verb}:${path}, with params: ${shortenParams(request)}`);
        const xhr = request.passthrough(); // <-- A native, sent xhr is returned
        xhr.onloadend = async (ev) => {
            await requestsStore.set(requestHash, {verb, response: xhr.response, requestHash, path});
            createRecall();
        };
    };

    pretenderServer.handledRequest = function(verb, path, request) {
        console.debug(`RECALL - return cached response for ${verb}:${request._recallUrl}, with params: ${shortenParams(request)}`)
    };


    let pretenderFetch  = window.fetch;
    let pretenderXhrOpen = XMLHttpRequest.prototype.open;
    let pretenderXhrSend = XMLHttpRequest.prototype.send;

    window.fetch = function(url, options){
        const requestHash = objectHash({verb: options.method, path: url, body: options.body});
        hashToUrl[requestHash] = url;
        if(requestHash in hashedRequests){
            console.debug(`RECALL - fetch: ${url} --- ${requestHash}`);
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
        if(requestHash in hashedRequests){
            console.debug(`RECALL - xhr send: ${this._recallUrl} --- ${requestHash}`)
            this.url = requestHash;
        }
        pretenderXhrSend.apply(this, arguments);
    };

    hashedRequests = tempHashedRequests;
};


createRecall();
