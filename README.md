# domino-logger

[![Greenkeeper badge](https://badges.greenkeeper.io/1999/domino-logger.svg)](https://greenkeeper.io/)

[![Build Status](https://img.shields.io/travis/1999/domino-logger.svg?style=flat)](https://travis-ci.org/1999/domino-logger)
[![DevDependency Status](http://img.shields.io/david/dev/1999/domino-logger.svg?style=flat)](https://david-dm.org/1999/domino-logger#info=devDependencies)

Logger for node.js apps used in Yandex.Mediaservices domino frontend. Uses `debug` in development and process.stdout/stderr in production environment. Supports namespaces.

Post on Medium.com: https://medium.com/@1999/domino-logger-why-we-wrote-another-logger-for-our-node-js-app-ed11a2a8958b

# Install

```
npm install domino-logger --save
```

# Basic Usage

```javascript
'use strict';

const dominoLogger = require('domino-logger');
const moment = require('moment');

// first, create factory for new loggers
// pass your app name to domino-logger function
const loggerFactory = dominoLogger('kinopoisk');

// second, create logger instance
// available options are:
// - emitErrors: emit errors if logger.error is called (true by default)
// - format: custom formatting function for production environment
//     invoked with req (http.incomingMessage), namespace, message and extra
// - namespace: next level namespace (log namespace is appname:nextlevel then)
// - extra: some additional object you can use in `format` function
const loggerInstance = loggerFactory({
    // for example like this
    format(req, namespace, message, extra) {
        return moment().format('YYYY-MM-DD HH:mm:ss.SSS') + '\t' +
            'pid:' + process.pid + '\t' +
            'request_id:' + req.uuid + '\t' +
            'yandex_uid:' + req.auth.yandex_uid + '\t' +
            namespace + '\t' +
            message;
    }
}).on('error', ({namespace, message, req}) => {
    // handle errors
});

```
