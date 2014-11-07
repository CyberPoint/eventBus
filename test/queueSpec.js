define(['lodash', 'async', 'EventBus'], function( _, async, EventBus) {

 	describe('Queue Declaration', function() {

		it('should not allow publishing to until declared', function() {
			var eb = new EventBus();
			expect(function() {
				eb.publish('test', 'test_key', 'hey')
			}).toThrow();
		});

		it('should be able to publish to once declared', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {});
			expect(function() {
				eb.publish('test', 'test_key', 'hey')
			}).not.toThrow();
		});

		it('should not allow subscribing to until declared', function() {
			var eb = new EventBus();
			expect(function() {
				eb.subscribe('test', 'test_key', function() {});
			}).toThrow();
		});

		it('should allow subscribing to once declared', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {});
			expect(function() {
				eb.subscribe('test', 'test_key', function() {});
			}).not.toThrow();
		});

		it('should not be able to publish after queue is destroyed', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {});
			eb.destroyQueue('test');
			expect(function() {
				eb.publish('test', 'test_key', 'hey')
			}).toThrow();
		});

		it('show should not allow multiple queues of the same name', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {});
			expect(function() {
				eb.declareQueue('test', {});
			}).toThrow();
		});

	});

	describe('Queue subscription options', function() {

		it('should drop a message when the queue is not durable', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {});

			eb.publish('test', 'test_key', 'hey');

			var fetch = eb.fetchMessage('test', 'test_key');
			expect(_.size(fetch)).toEqual(0);
		});

		it('should retain a message when the queue is durable', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {durable: true});

			for(var x=0;x<10;x++) {
				eb.publish('test', 'test_key', 'hey');
			}

			var fetch = eb.fetchMessage('test', 'test_key', 10);
			expect(_.size(fetch)).toEqual(10);
		});

		it('should retry a message when the queue is durable and set to retry', function() {
			var eb = new EventBus();
			eb.declareQueue('test', {durable: true, durableRetries: 5});

			eb.publish('test', 'test_key', 'hey');

			eb.subscribe('test', 'test1');
			eb.subscribe('test', 'test2');
			eb.subscribe('test', 'test3');
			eb.subscribe('test', 'test4');
			var fetch = eb.fetchMessage('test', 'test_key');
			expect(_.size(fetch)).toEqual(1);
		});

		it('should abort retrying after maximum number of retries', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {durable: true, durableRetries: 3});

			async.series([
				function(cb) {
					eb.publish('test', 'test_key', 'hey');
					cb(null, 1);
				},
				function(cb) {
					setTimeout(function() {
						eb.subscribe('test', 'test1');
						cb(null, 1);
					}, 100);
				},
				function(cb) {
					setTimeout(function() {
						eb.subscribe('test', 'test1');
						cb(null, 1);
					}, 100);
				},
				function(cb) {
					setTimeout(function() {
						eb.subscribe('test', 'test1');
						cb(null, 1);
					}, 100);
				},
				function(cb) {
					setTimeout(function() {
						eb.subscribe('test', 'test1');
						cb(null, 1);
					}, 100);
				}
			],
			function() {
				var fetch = eb.fetchMessage('test', 'test_key');
				expect(_.size(fetch)).toEqual(0);
				done();
			});
		});
	});

	describe('Subscribing', function() {
		it('should return the published messages to all subscribers according to the implicit order', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {});

			var receivedResponse = [],
				data = Math.random();

			async.series([
				function(cb) {
					// Subscriber 1
					eb.subscribe('test', 'test_key', function(r) {
						if(r.payload == data) {
							receivedResponse.push(1);
						}
					});
					cb(null, 1);
				},
				function(cb) {
					// Subscriber 2
					eb.subscribe('test', 'test_key', function(r) {
						if(r.payload == data) {
							receivedResponse.push(2);
						}
					});
					cb(null, 1);
				},
				function(cb) {
					// Subscriber 2
					eb.subscribe('test', 'test_key', function(r) {
						if(r.payload == data) {
							receivedResponse.push(3);
						}
					});
					cb(null, 1);
				},
				function(cb) {
					eb.publish('test', 'test_key', data);
					cb(null, 1);
				}
			],
			function() {
				expect(receivedResponse).toEqual([1, 2, 3]);
				done();
			});
		});

		it('should return the published messages to all subscribers according to the explicit order', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {});

			var receivedResponse = [],
				data = Math.random();

			async.series([
					function(cb) {
						// Subscriber 1
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(1);
							}
						}, 3);
						cb(null, 1);
					},
					function(cb) {
						// Subscriber 2
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(2);
							}
						}, 2);
						cb(null, 1);
					},
					function(cb) {
						// Subscriber 2
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(3);
							}
						}, 1);
						cb(null, 1);
					},
					function(cb) {
						eb.publish('test', 'test_key', data);
						cb(null, 1);
					}
				],
				function() {
					expect(receivedResponse).toEqual([3, 2, 1]);
					done();
				});
		});

		it('should return the published messages to all subscribers according to the explicit order and handle conflicts', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {});

			var receivedResponse = [],
				data = Math.random();

			async.series([
					function(cb) {
						// Subscriber 1
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(1);
							}
						}, 3);
						cb(null, 1);
					},
					function(cb) {
						// Subscriber 2
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(2);
							}
						}, 3);
						// Conflict should go to 4
						cb(null, 1);
					},
					function(cb) {
						// Subscriber 3
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(3);
							}
						}, 1);
						cb(null, 1);
					},
					function(cb) {
						// Subscriber 4
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(4);
							}
						}, 4);
						// Conflict should go to 5
						cb(null, 1);
					},
					function(cb) {
						// Subscriber 5
						eb.subscribe('test', 'test_key', function(r) {
							if(r.payload == data) {
								receivedResponse.push(5);
							}
						});
						// No order, should go to 6
						cb(null, 1);
					},
					function(cb) {
						eb.publish('test', 'test_key', data);
						cb(null, 1);
					}
				],
				function() {
					expect(receivedResponse).toEqual([3, 1, 2, 4, 5]);
					done();
				});
		});

		it('should allow me to subscribe once', function() {
			var eb = new EventBus();
			var count = [];
			eb.declareQueue('test', {});
			eb.subscribeOnce('test', 'test_key', function(d) {
				count.push(d.payload);
			});
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');

			expect(count).toEqual(['test data']);
		});

		it('should allow me to subscribe x times', function() {
			var eb = new EventBus();
			var count = [];
			eb.declareQueue('test', {});
			eb.subscribeTimes('test', 'test_key', function(d) {
				count.push(d.payload);
			}, undefined, 2);
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');
			eb.publish('test', 'test_key', 'test data');

			expect(count).toEqual(['test data', 'test data']);
		});
	});

	describe('Publishing', function() {
		var eb = new EventBus();
		eb.declareQueue('test', {});

		it('should wait for subscribers to reply back and process the response properly', function(done) {
			async.series([
				function(cb) {
					eb.subscribe('test', 'test_key', function(r) {
						r.payload.push('subscriber 1')
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function(cb) {
					eb.subscribe('test', 'test_key', function(r) {
						r.payload.push('subscriber 2')
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function(cb) {
					eb.subscribe('test', 'test_key', function(r) {
						r.payload.push('subscriber 3')
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function(cb) {
					eb.publish('test', 'test_key', ['initial message'], {
						callback: function(result) {
							expect(['initial message', 'subscriber 1', 'subscriber 2', 'subscriber 3']).toEqual(result);
							cb(null, 1);
						}
					});
				}
			],
			function() {
				done();
			});
		});
	});

	describe('Wildcard functionality', function() {

		it('should subscribe to all immediate descendants', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {type: 'topic'});

			async.series([
				function (cb) {
					eb.subscribe('test', 'test.*', function (r) {
						expect(r.payload).toEqual('Hello world!');
						eb.destroyQueue('test');
						done();
					});
					cb();
				},
				function (cb) {
					eb.publish('test', 'test.foo', 'Hello world!');
					cb();
				}
			]);
		});

		it('should not send to children without wildcard', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {type: 'topic'});
			var results = 0;

			async.series([
				function (cb) {
					eb.subscribe('test', 'test', function (r) {
						results++;
					});
					cb();
				},
				function (cb) {
					eb.subscribe('test', 'test.*', function (r) {
						results++;
					});
					cb();
				},
				function (cb) {
					eb.publish('test', 'test.foo', 'Hello world!');
					cb();
				}
			],
			function() {
				expect(results).toEqual(1);
				done();
			});
		});

		it('should subscribe to all immediate descendants with multiple subscribers', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {type: 'topic'});

			var subscribersResponded = 0,
				publishesFulfilled = 0;

			async.series([
				function (cb) {
					eb.subscribe('test', 'test.*', function (r) {
						r.payload.push(1);
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function (cb) {
					eb.subscribe('test', 'test.foo', function (r) {
						r.payload.push(2);
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function (cb) {
					eb.subscribe('test', '*.bar', function (r) {
						r.payload.push(3);
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function (cb) {
					eb.subscribe('test', 'test.foo.*', function (r) {
						r.payload.push(4);
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function (cb) {
					eb.subscribe('test', 'test.foo.*.*', function (r) {
						r.payload.push(5);
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function (cb) {
					eb.subscribe('test', 'test.foo.*.hello', function (r) {
						r.payload.push(6);
						r.reply(r.payload);
					});
					cb(null, 1);
				},
				function (cb) {
					eb.publish('test', [
						'test.foo',
						'test.bar',
						'test.foo.bar',
						'test.foo.bar.hello',
						'test.foo.world.hello',
					], [], {
						callback: function (result) {
							publishesFulfilled++;
							if(publishesFulfilled == 9) {
								expect(_.filter(result, function(x) { return x==1 }).length).toEqual(2);
								expect(_.filter(result, function(x) { return x==2 }).length).toEqual(1);
								expect(_.filter(result, function(x) { return x==3 }).length).toEqual(1);
								expect(_.filter(result, function(x) { return x==4 }).length).toEqual(1);
								expect(_.filter(result, function(x) { return x==5 }).length).toEqual(2);
								expect(_.filter(result, function(x) { return x==6 }).length).toEqual(2);
								done();
							}

						}
					});
					cb();
				}
			]);
		});
	});

	describe('super wildcard functionality', function() {
		it('should be subscribed to multiple levels', function(done) {
			var eb = new EventBus();
			eb.declareQueue('test', {type: 'topic'});
			var publishesFulfilled = 0;

			async.series([
				function(cb) {
					eb.subscribe('test', '#', function(r) {
						r.payload.push('#');
						r.reply(r.payload);
					});
					cb(null, true);
				},
				function(cb) {
					eb.subscribe('test', 'test.#', function(r) {
						r.payload.push('test.#');
						r.reply(r.payload);
					});
					cb(null, true);
				},
				function(cb) {
					eb.subscribe('test', '#.test', function(r) {
						r.payload.push('#.test');
						r.reply(r.payload);
					});
					cb(null, true);
				},
				function(cb) {
					eb.subscribe('test', '#.test.#', function(r) {
						r.payload.push('#.test.#');
						r.reply(r.payload);
					});
					cb(null, true);
				},
				function(cb) {
					eb.publish('test', [
						'apple',
						'test.a',
						'test.a.b',
						'a.test',
						'b.a.test',
						'a.test.b'
					], [], {
						callback: function(result) {
							publishesFulfilled++;
							if(publishesFulfilled == 15) {
								expect(_.filter(result, function(x) { return x=='#' }).length).toEqual(6);
								expect(_.filter(result, function(x) { return x=='test.#' }).length).toEqual(2);
								expect(_.filter(result, function(x) { return x=='#.test' }).length).toEqual(2);
								expect(_.filter(result, function(x) { return x=='#.test.#' }).length).toEqual(5);
								done();
							}
					}});
					cb(null, true);
				}
			]);
		});
	});

});
