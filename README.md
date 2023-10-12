# Recall

This extension is for all the fullstacks/frontend devs who are sick of waiting 
for the server to respond, just so our almost perfect component can render.

The gist of Recall, is that it records http requests and repsonses. The next time an identical
request is made, recall will intercept the request and return the cached response.

That means you have more time to focus on your component - Hooray!

## Running the extension locally

1. Node.js version >= 14.
2. `npm i`
3. `npm run build`

Then it's time to mount the extension in your browser.
Let's take Firefox for example:
1. Go to `about:debugging`
2. Click `This Firefox`
3. Click `Load Temporary Add-on`
4. Navigate to the `recall` repo, and load the `build/manifest.json` file
5. If you look at your extensions, you should see Recall loaded with the yellow lighting bolt icon
