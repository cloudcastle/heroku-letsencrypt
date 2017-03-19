'use strict';

// const cli = require('heroku-cli-util');
const got = require('got');
const redis = require('redis');
const bluebird = require('bluebird');
const _ = require('lodash');
bluebird.promisifyAll(redis.RedisClient.prototype);


function declareArguments(count) {
	return new Array(count).join('arg,') + 'arg';
}
function giveArity(closure, arity) {
	return new Function(
		declareArguments(arity),	// arguments list
		'return this.apply(null, arguments);'	// actual call
	).bind(closure);
}

// TODO: is there such a function in Bluebird already?
const depromisify = function(fn) {
  const res = function() {
    const callback = _.last(arguments);
    fn.apply(null, arguments).then((data) => callback(null, data)).catch(callback);
  }
  return giveArity(res, fn.length + 1);
}

const redisKey = challengeId => `/.well-known/acme-challenge/${challengeId}`;

module.exports = function(redisUrl) {
  const client = redis.createClient(redisUrl);

  return {
    set: depromisify((args, domain, challengeId, keyAuthorization) => {
      return client.setAsync(redisKey(challengeId), keyAuthorization);
    }),

    get: depromisify((defaults, domain, challengeId) => {
      return client.getAsync(redisKey(challengeId));
    }),

    remove: depromisify((defaults, domain, challengeId) => {
      return client.delAsync(redisKey(challengeId))
    }),

    loopback: depromisify((defaults, domain, challengeId) => {
      return got(`http://${domain}/.well-known/acme-challenge/${challengeId}`).then(response => response.body)
    }),

    getOptions: function() {
      return { redisUrl };
    }
  }
};