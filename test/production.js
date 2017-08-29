'use strict';

const assert = require('assert');
const dominoLogger = require('../index');
const intercept = require('./interceptor');

const APP_NAME = require('../package.json').name;

describe('domino-logger NODE_ENV=production', () => {
    it('should output debug logs in production environment', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false
        });

        return intercept(() => {
            logger.error('Error occured: %s', 'error description');
            logger.error('Error occured once more');
            logger.info('What a nice weather today!');
        }).then(messages => {
            const stdoutMessages = messages.get(process.stdout);
            const stderrMessages = messages.get(process.stderr);

            assert(Array.isArray(stdoutMessages), 'stdout should have messages');
            assert.strictEqual(stdoutMessages.length, 1, 'stdout should have 1 message');

            assert(Array.isArray(stderrMessages), 'stderr should have messages');
            assert.strictEqual(stderrMessages.length, 2, 'stderr should have exactly 2 messages');
            assert(stderrMessages[0].includes('Error occured: error description'), 'stderr should have exected message but got: ' + stderrMessages[0]);
            assert(stderrMessages[1].includes('Error occured once more'), 'stderr should have exected message');
        });
    });

    it('should use default formatter function by default', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false
        });

        return intercept(() => {
            logger.error('Error: %s (%j)', 'error description', {foo: 'bar'});
        }).then(messages => {
            const stderrMessage = messages.get(process.stderr)[0].trim();

            // date differs so it's not necessary to check it
            let expectedMessage = dominoLogger.defaultFormat(null, `${APP_NAME}:error`, 'Error: error description ({"foo":"bar"})');
            const stderrDate = stderrMessage.split('\t')[0];
            expectedMessage = `${stderrDate}${expectedMessage.substr(stderrDate.length)}`;

            assert.strictEqual(stderrMessage, expectedMessage, 'Output message format is invalid');
        });
    });

    it('should use provided format', () => {
        function customFormat(req, namespace, message) {
            return `guid:${req.uuid}\tuid:${req.user.uid}\tlogin:${req.user.login}\t${message}`;
        }

        const reqMock = {
            user: {
                login: 'vasya',
                uid: 100
            },
            uuid: 'a5811c65-4f4f-421f-91a1-ade039b64ccc'
        };

        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false,
            req: reqMock,
            format: customFormat
        });

        return intercept(() => {
            logger.error('Error: %s (%j)', 'error description', {foo: 'bar'});
        }).then(messages => {
            const stderrMessage = messages.get(process.stderr)[0].trim();
            const expectedMessage = customFormat(reqMock, APP_NAME, 'Error: error description ({"foo":"bar"})');

            assert.strictEqual(stderrMessage, expectedMessage, 'Output message format is invalid');
        });
    });

    it('should send all methods logs to stderr instead of info', () => {
        const METHODS = ['log', 'info', 'warn', 'error'];
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({emitErrors: false});

        return intercept(() => {
            for (let method of METHODS) {
                logger[method]('message without NS');
                logger[`${method}NS`]('custom', 'message with NS');
            }
        }).then(messages => {
            const stderrMessages = messages.get(process.stderr);
            const stdoutMessages = messages.get(process.stdout);
            assert.strictEqual(stderrMessages.length, 6, 'stderr should have exactly 8 messages');
            assert.strictEqual(stdoutMessages.length, 2, 'stdout should have exactly 2 messages');

            assert(stdoutMessages[0].includes('message without NS'), 'stdout[0] should have exected message');
            assert(stdoutMessages[0].includes(`${APP_NAME}:info`), 'stdout[0] should have exected message');
            assert(stdoutMessages[1].includes('message with NS'), 'stdout[1] should have exected message');
            assert(stdoutMessages[1].includes(`${APP_NAME}:custom`), 'stdout[1] should have exected message');
        });
    });

    it('should emit errors only for error/errorNS', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();
        const errors = [];

        logger.on('error', err => errors.push(err));

        return intercept(() => {
            logger.error('message without NS');
            logger.errorNS('custom', 'message with NS');
            logger.log('another message');
        }).then(() => {
            return new Promise(resolve => {
                setTimeout(() => {
                    assert.strictEqual(errors.length, 2, 'Only 2 errors should have been emitted');
                    resolve();
                }, 300);
            });
        });
    });

    it('should have extra object at last argument', () => {
        function customFormat(req, namespace, message, extra) {
            return `namespace:${namespace}\tmessage:${message}\textra:${JSON.stringify(extra)}`;
        }

        const extra = {foo: 'bar'};
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false,
            req: null,
            format: customFormat
        });

        return intercept(() => {
            logger.logNS('namespace', 'log description', extra);
        }).then(messages => {
            const stderrMessage = messages.get(process.stderr)[0].trim();
            const expectedMessage = customFormat(null, `${APP_NAME}:namespace`, 'log description', extra);

            assert.strictEqual(stderrMessage, expectedMessage, 'Output message format is invalid');
        });
    });

    it('should have equal log string for records with number and same string value', () => {
        const extra = {foo: 'bar'};
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({
            emitErrors: false,
            req: null
        });

        return intercept(() => {
            logger.logNS('namespace', 42, extra);
            logger.logNS('namespace', '42', extra);
        }).then(messages => {
            const stderrMessages = messages.get(process.stderr);

            // messages can have a bit different timestamp, cut it
            stderrMessages[0] = stderrMessages[0].replace(/^[^\t]+/, '');
            stderrMessages[1] = stderrMessages[1].replace(/^[^\t]+/, '');

            assert.strictEqual(stderrMessages[0], stderrMessages[1], 'Messages should be equal');
        });
    });
});
