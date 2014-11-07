/**
 * EventBus - 0.0.4
 *
 * Copyright (c) 2014
 * CyberPoint International LLC
 *
 * Released under the MIT license
 *
 */
;(function() {
	/*!
	 * async
	 * https://github.com/caolan/async
	 *
	 * Copyright 2010-2014 Caolan McMahon
	 * Released under the MIT license
	 */
	var async = {
		each: function (arr, iterator, callback) {
			callback = callback || function () {};
			if (!arr.length) {
				return callback();
			}
			var completed = 0;
			_.each(arr, function (x) {
				iterator(x, _.once(done) );
			});
			function done(err) {
				if (err) {
					callback(err);
					callback = function () {};
				}
				else {
					completed += 1;
					if (completed >= arr.length) {
						callback();
					}
				}
			}
		},
		eachSeries: function (arr, iterator, callback) {
			callback = callback || function () {};
			if (!arr.length) {
				return callback();
			}
			var completed = 0;
			var iterate = function () {
				iterator(arr[completed], function (err) {
					if (err) {
						callback(err);
						callback = function () {};
					}
					else {
						completed += 1;
						if (completed >= arr.length) {
							callback();
						}
						else {
							iterate();
						}
					}
				});
			};
			iterate();
		},
		reduce: function (arr, memo, iterator, callback) {
			async.eachSeries(arr, function (x, callback) {
				iterator(memo, x, function (err, v) {
					memo = v;
					callback(err);
				});
			}, function (err) {
				callback(err, memo);
			});
		}
	};

	if(!window.async) {
		window.async = async;
	}

	/**
	 * EventBus
	 *
	 * @returns {{declareQueue: declareQueue, destroyQueue: destroyQueue, publish: publish, subscribe: subscribe, unsubscribe: unsubscribe, fetchMessage: fetchMessage}}
	 * @constructor
	 */
	function EventBus () {
		if(!window._) {
			throw new Error("Lodash not present!");
		}
		var queues = {},
			events = {};

		/**
		 * declareQueue - Used to declare a queue with passed options
		 *
		 * @returns undefined
		 *
		 * @param name - Queue's name
		 * @param options - Queue's options
		 */
		function declareQueue(name, options) {
			if(queues[name]) {
				throw new Error('A queue already exists with this name!');
			}

			options.type = options.type || 'direct';
			options.caseInsensitive = options.caseInsensitive || false;
			options.subscriptions = {};
			options.queue = [];
			queues[name] = options;
		};

		/**
		 * destroyQueue - Used to destroy a queue and all of its queued messages
		 *
		 * @returns undefined
		 *
		 * @param name - Queue's name
		 */
		function destroyQueue(name) {
			if(queues[name]) {
				delete queues[name];
			}
		};


		function getQueues() {
			return queues;
		};

		/**
		 * queuedMessageCheck - Function that iterates through queued message
		 * checking for subscribers that would receive the message
		 *
		 * @returns undefined
		 *
		 * @param queueName - Option queuename to check
		 */
		function queuedMessageCheck(queueName) {
			/** Queued Message **/
			function iterate(queue, queueName) {
				if (queue && queue.queue.length > 0) {
					_.each(queue.queue, function(queuedMessage) {
						queues[queueName].queue = _.without(queue.queue, queuedMessage);
						_.defer(function() {
							publish(
								queueName,
								queuedMessage.route,
								queuedMessage.payload,
								queuedMessage.options,
								true
							);
						});
					});
				}
			};

			if(queueName) {
				_.defer(function() {
					iterate(queues[queueName], queueName);
				});
			} else {
				_.each(queues, function(queue, queueName) {
					_.defer(function() {
						iterate(queue, queueName);
					});
				});
			}
		};

		/**
		 * subscribe
		 *
		 * @returns subscriptionId
		 *
		 * @param queue - The queue to subscribe to
		 * @param route - The routing key
		 * @param callback - The callback to invoke upon message
		 * @param order - An optional order number, will default to FIFO
		 *
		 *
		 */
		function subscribe(queue, route, callback, order) {
			if(queues[queue]) {
				var subscriptions = queues[queue];
			} else {
				throw new Error('No queue present!');
			}

			if(_.isArray(route)) {
				var subscriptionIds = [];
				_.each(route, function(r) {
					subscriptionIds.push(subscribe(queue, r, callback, order));
				});
				return subscriptionIds;
			}

			//console.groupCollapsed('EventBus: Subscription request received: %s', route);

			if (!queues[queue].subscriptions[route]) {
				queues[queue].subscriptions[route] = {
					route: route,
					subscribers: []
				};
			}

			var ev = {
				id: _.uniqueId(route),
				callback: callback
			};

			var eId = ev.id;

			if(_.isUndefined(order) || !_.isNumber(order) ) {
				var orders = _.pluck(queues[queue].subscriptions[route].subscribers, 'order');
				ev.order = order = (orders.length) ? _.max(orders) + 1 : 1;
			}

			// Conflict
			if(_.where(queues[queue].subscriptions[route].subscribers, {order: order}).length) {
				var orders = _.pluck(queues[queue].subscriptions[route].subscribers, 'order');
				ev.order = _.max(orders) + 1;
			} else {
				ev.order = order;
			}

			queues[queue].subscriptions[route].subscribers.push(ev);
			events[ev.id] = {
				queue: queue,
				route: route
			};


			// Check for fullillment of queued messages
			queuedMessageCheck(queue);

			//console.groupEnd();
			return eId;
		};

		/**
		 * unsubscribe
		 *
		 * @returns undefined
		 *
		 * @param subscriptionId - ID of subscription to unsubscribe from
		 *
		 */
		function unsubscribe(subscriptionId) {
			if(events[subscriptionId]) {
				var event = events[subscriptionId],
					subscriber = _.first(_.where(queues[event.queue].subscriptions[event.route].subscribers, {id: subscriptionId}));
				queues[event.queue].subscriptions[event.route].subscribers = _.without(queues[event.queue].subscriptions[event.route].subscribers, subscriber);
				delete events[subscriptionId];
			}
		};

		/**
		 * isSubscriber
		 *
		 * @returns boolean
		 *
		 * @param publishedRoute - routing key used in publish
		 * @param subscribedRotue - routing key used in subscription
		 */
		function isSubscriber(publishedRoute, subscribedRoute, queueType, caseInsensitive) {
			var opts = (caseInsensitive) ? 'i' : '';
			if(queueType == 'topic') {
				var sR = subscribedRoute
					.replace(new RegExp('\\.', 'g'), '[\\.]')
					.replace(new RegExp('\\*', 'g'), '([^\\.]+)')
					.replace(new RegExp('^#$|\\[\\\\.\\]#|#\\[\\\\.\\]', 'g'), '(.*)');
				return new RegExp('^'+sR+'$', opts).test(publishedRoute);
			} else if(queueType == 'direct') {
				return new RegExp('^'+subscribedRoute+'$', opts).test(publishedRoute);
			}
		};

		/**
		 * publish
		 *
		 * @returns undefined
		 *
		 * @param queue
		 * @param route
		 * @param payload
		 * @param options
		 * @param check
		 */
		function publish(queue, route, payload, options) {
			if(queues[queue]) {
				var thisQueue = queues[queue];
			} else {
			    throw new Error('Queue is not declared!');
            }

			// Allows for publishing on payload to multiple functions
			if(_.isArray(route)) {
				_.each(route, function(r) {
					publish(queue, r, payload, options);
				});
				return;
			}

			var options = options || {},
				callback = options.callback || undefined;

			if(!options.hasOwnProperty('wait')) {
				options.wait = (options.callback) ? true : false;
			}

			/** Find all matching subscriptions **/
			var subscriptions = _.filter(thisQueue.subscriptions, function (subscription) {
				return isSubscriber(route, subscription.route, thisQueue.type, thisQueue.caseInsensitive);
			});

			if(_.size(subscriptions) > 0) {
				_.each(subscriptions, function(subscription) {
					dispatchMessage(subscription);
				});
			} else {
				if (thisQueue.durable) {
					var q = {
						route: route,
						payload: payload,
						options: options
					};

					if(thisQueue.durableRetries) {
						if(options.retries == thisQueue.durableRetries) {
							//console.debug('Message has reached maximum retries!');
							return;
						} else if(!options.retries) {
							q.options.retries = 1;
							//console.debug('First retry: %s %s', queue, route);
						}  else {
							q.options.retries = options.retries + 1;
							//console.debug('Retrying attempt %s/%s', q.options.retries, thisQueue.durableRetries);
						}
					}

					queues[queue].queue.push(q);

					if(callback && !options.wait) {
						callback(payload);
					}

				} else if (callback && !options.wait) {
					callback(payload);
				}
			}

			/**
			 * dispatchMessage - Dispatches message to subscribers
			 *
			 * @returns undefined
			 *
			 * @param subscription
			 */
			function dispatchMessage(subscription) {
				if (subscription) {
					var subscribers = _.sortBy(subscription.subscribers, 'order');

					if (callback) {
						if (!options.type || options.type == 'reduce') {
							async.reduce(subscribers, payload, function (payload, subscriber, reply) {
								subscriber.callback({
									payload: payload,
									route: route,
									reply: function (result) {
										reply(null, result);
									}
								});
							}, function (err, result) {
								callback(result);
							});
						} else if (type == 'gather') {

						}

					} else {
						async.each(subscribers, function (subscriber, reply) {
							subscriber.callback({
								payload: payload,
								route: route,
								reply: function (result) {
									reply(null, result);
								}
							});
						});
					}
				} else {

				}
			};
		}

		/**
		 * subscribeTimes - Subscribes to queue on routing key but will
		 * automatically unsubscribe from queue after a the specified number of
		 * times the callback is invoked.
		 *
		 * @returns subscriptionId
		 *
		 * @param queue
		 * @param route
		 * @param callback
		 * @param order
		 * @param times
		 */
		function subscribeTimes(queue, route, callback, order, times) {
			var _times = 0;
			var sId = subscribe(queue, route, function() {
				callback.apply(this, arguments);
				++_times;
				if(_times == times) {
					unsubscribe(sId);
				}
			}, order);

			return sId;
		}

		/**
		 * subscribeOnce - Subscribes to queue on routing key but will
		 * automatically unsubscribe from queue after a single invokation of
		 * the callback
		 *
		 * @returns subscriptionId
		 *
		 * @param queue
		 * @param routed
		 * @param callback
		 * @param order
		 */
		function subscribeOnce(queue, route, callback, order) {
			var sId = subscribe(queue, route, function() {
				callback.apply(this, arguments);
				unsubscribe(sId);
			}, order);

			return sId;
		};

		/**
		 * fetchMessage - Manually fetches n messages of the queue for the given
		 * routing key. Optionally, if a routing key is absent function will
		 * return all queued messages in the queue
		 *
		 * @returns Array
		 *
		 * @param queue
		 * @param route
		 * @param n
		 */
		function fetchMessage(queue, route, n) {
			if(queues[queue]) {
				var thisQueue = queues[queue],
					queued = thisQueue.queue,
					queuedMessages = (route) ? _.where(queued, {route: route}) : queued;

				if(queuedMessages.length > 0) {
					var m = queuedMessages.splice(0, n || 1);
					queues[queue].queue = queuedMessages;
					return m;
				} else {
					return [];
				}

			} else {
				throw new Error('Queue is not declared!');
			}
		}

		return {
			declareQueue: declareQueue,
			destroyQueue: destroyQueue,
			getQueues: getQueues,
			publish: publish,
			subscribe: subscribe,
			unsubscribe: unsubscribe,
			subscribeOnce: subscribeOnce,
			subscribeTimes: subscribeTimes,
			fetchMessage: fetchMessage
		};
	};

	window.EventBus = EventBus;

	if(window.angular) {
		angular.module('eventBus', [])
			.service('EventBus', EventBus);
	}

	if(window.define && typeof window.define === "function") {
		window.define("EventBus", [], function() {
			return window.EventBus;
		});
	}

    return EventBus;
}());
