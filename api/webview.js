const { handleProxy } = require("../lib/site-proxy");

module.exports = (req, res) => handleProxy(req, res, "webview");
