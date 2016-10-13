'use strict';

const assert = require('assert');
const dominoLogger = require('../index');
const intercept = require('./interceptor');

const APP_NAME = require('../package.json').name;

describe('domino-logger', () => {
    it('should have defined API', () => {
        assert.strictEqual(typeof dominoLogger, 'function', 'logger should be a function');
        assert.strictEqual(dominoLogger.length, 1, 'logger should have 1 argument');

        const loggerFactory = dominoLogger(APP_NAME);
        assert.strictEqual(typeof loggerFactory, 'function', 'logger factory should be a function');
    });

    it('should have defined API for instances', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();

        assert.strictEqual(typeof logger, 'object', 'logger instance should be an object');
        assert.strictEqual(typeof logger.info, 'function', 'logger.info should be a function');
        assert.strictEqual(typeof logger.infoNS, 'function', 'logger.info should be a function');
        assert.strictEqual(typeof logger.error, 'function', 'logger.info should be a function');
        assert.strictEqual(typeof logger.errorNS, 'function', 'logger.info should be a function');
    });

    it('should emit errors by default', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory();
        let error;

        logger.on('error', err => {
            error = err;
        });

        // do not spoil output
        return intercept(() => {
            logger.error('Some kind of error');
        }).then(() => {
            assert.notStrictEqual(error, undefined, 'Error should exist');
            assert(error instanceof Error, 'Emitted argument is not an Error instance');

            const serializedErr = String(error);
            assert.strictEqual(serializedErr.includes('[object Object]'), false, `Serialized error value is wrong: ${serializedErr}`);

            // breaking change with 2.x versions
            assert.strictEqual(error.namespace, undefined, `Error namespace is unexpected: ${error.namespace}`);
            assert.strictEqual(error.req, undefined, `Error req is unexpected: ${error.req}`);

            assert.strictEqual(error.message, 'Some kind of error', `Message text is unexpected: ${error.message}`);
            assert.strictEqual(typeof error.data, 'object', 'Error data property is wrong');
            assert.strictEqual(error.data.namespace, `${APP_NAME}:error`, `Namespace should be ${APP_NAME}:error`);
            assert.notStrictEqual(error.data.req, undefined, 'Request should be at least null');
        });
    });

    it('should not emit errors if emitErrors is false', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({emitErrors: false});

        return new Promise((resolve, reject) => {
            const timeout = setTimeout(resolve, 300);

            logger.on('error', ({message}) => {
                clearTimeout(timeout);
                reject(new Error(`Unexpected error caught: ${message}`));
            });

            // do not spoil output
            intercept(() => {
                logger.error('Some kind of error');
            });
        });
    });

    it('should use provided namespace', () => {
        const loggerFactory = dominoLogger(APP_NAME);
        const logger = loggerFactory({namespace: 'API', emitErrors: false});

        return intercept(() => {
            logger.error('message');
        }).then(messages => {
            const stderrMessages = messages.get(process.stderr);

            assert(Array.isArray(stderrMessages), 'stderr should have messages');
            assert.strictEqual(stderrMessages.length, 1, 'stderr should have exactly 1 message');
            assert(stderrMessages[0].includes('message'), 'stderr should have exected message');
        });
    });

    it('should use all methods as namespaces except NS ones', () => {
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
            assert.strictEqual(stderrMessages.length, 8, 'stderr should have exactly 8 messages');

            METHODS.forEach((method, i) => {
                assert(stderrMessages[i * 2].includes('message without NS'), `stderr[${i * 2}] should have exected message`);
                assert(stderrMessages[i * 2].includes(`${APP_NAME}:${method}`), `stderr[${i * 2}] should use expected namespace`);

                assert(stderrMessages[i * 2 + 1].includes('message with NS'), `stderr[${i * 2 + 1}] should have exected message`);
                assert(stderrMessages[i * 2 + 1].includes(`${APP_NAME}:custom`), `stderr[${i * 2 + 1}] should use expected namespace`);
            });
        });
    });
});
