## Unreleased

 * Use latest dependencies

## 2.1.1

 * **new**: you can now pass special `extra` object param to logger methods. It will be available as the fourth argument in `format()` function.

## 2.0.x

 * 100% compatibility with current domino logs: all methods logs fall into their own namespaces (not synonyms), log falls into stderr in `NODE_ENV=production` environment
 * fix: only error/errorNS methods emit errors
 * fix: same for development environment

## 1.1.x

 * **new**: `log/logNS` methods - synonyms to `info/infoNS`
 * **new**: `warn/warnNS` methods - synonyms to `error/errorNS`
 * `req` property is exposed in error events

## 1.0.x

 * first release :smiley:
 * build code suitable for nodejs-4 running apps with Babel
