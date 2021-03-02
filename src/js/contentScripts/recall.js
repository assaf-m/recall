import Pretender from 'pretender';
import objectHash from 'object-hash';

let pretenderServer;
let hashedRequests = {};
let hashToUrl = {};

export const createRecall = () => {
    console.debug(`RECALL - recreating mock repsonses with this map:`);
    console.debug(JSON.stringify(hashedRequests));

    pretenderServer && pretenderServer.shutdown();
    pretenderServer = new Pretender(function() {
        Object.keys(hashedRequests).forEach(hashedRequest => {
            const {verb, response} = hashedRequests[hashedRequest];
            this[verb.toLowerCase()](hashedRequest, req => [200, {'content-type': 'application/javascript'}, response]);
        });
    });


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

    pretenderServer.unhandledRequest = function(verb, path, request) {
        const requestHash = objectHash({verb, path, body: request.requestBody});
        console.debug(`RECALL - new request: ${verb}:${path}, with params: ${request.requestBody}`);
        const xhr = request.passthrough(); // <-- A native, sent xhr is returned
        xhr.onloadend = (ev) => {
            hashedRequests[requestHash] = {verb, response: xhr.response};
            console.debug(`RECALL - server response for ${verb}:${path} --- ${xhr.response}`)
            console.debug(xhr.response);
            createRecall();
        };
    };

    pretenderServer.handledRequest = function(verb, path, request) {
        console.debug(`RECALL - return cached response for ${verb}:${request._recallUrl}, with params: ${request.requestBody}`)
    };


    let pretenderFetch  = window.fetch;
    let pretenderXhrOpen = XMLHttpRequest.prototype.open;
    let pretenderXhrSend = XMLHttpRequest.prototype.send;

    window.fetch = function(url, options){
        const requestHash = objectHash({verb: options.method, path: url, body: options.body});
        hashToUrl[requestHash] = url;
        if(requestHash in hashedRequests){
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
            this.url = requestHash;
        }

        pretenderXhrSend.apply(this, arguments);
    }
};


createRecall();
