# EventBus
## A powerful JavaScript library for handling pub/sub AMQP style functionality 

**Developed by Dovid Kopel, CyberPoint International LLC**

Copyright (c) 2014 CyberPoint International LLC

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in
all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN
THE SOFTWARE.

### Features
* Named queues
* Durable queues
* Wildcard support (\* and #)
* Automatic retries
* Small footprint
* Works with AngularJS

### Why use this with AngularJS?
AngularJS already comes with ```$emit```, ```$broadcast```, and ```$scope.$on``` so why would you want to use something else? While Angular handles some things that EventBus does, there is plenty it does not. Angular's model focuses on the scope hierarchy, and that alone. EvenBus currently doesn't deal with scope at all but supports topic based queues. This puts a great deal of power in the routing key and enables communication in a hierarchal fashion as well as across controllers, which is not possible to do without using the ```$rootScope```. With EventBus you can mimic and greatly enhance Angular's limited queuing features.

### API
#### EventBus()
You must instantiate EventBus and store it in an variable.

    var eb = new EventBus();

---

#### declareQueue()
Now a queue must be declared to accept messages.

    eb.declareQueue(name, options);

* Name (String): The unique name for the queue

* Options (Object): Optional options to configure the queue:
    * type (String): topic or direct, if undefined direct is implied
    * caseInsensitive (Boolean): Whether the routing key should be evaluated
with case sensitivity or not, default to false

**Returns**: None (undefined)

---

#### destroyQueue()
Should you wish to destroy your queue, its queued messages, and subscriptions
 you may.

    eb.destroyQueue(name);

* Name (String): The unique name for the queue

**Returns**: None (undefined)

---

#### getQueues()
To obtain the raw queue you may.

    eb.getQueues();

**Returns**: Object

---

#### publish()
To publish messages.

    eb.publish(queue, route, payload, options);
* Queue (String): The queue's name to publish to.
* Route (String, Array): The routing key(s) to publish to. For a single
routing key, a string may be used. If you wish to publish the message to
multiple routing keys you may pass an array of strings.
* Payload: The data which is intended to send to the subscribers.
* Options (Object)
    * Callback (Function): The function to be invoked after all subscribers
    reply (ack) the message. If there are no subscribers the callback is
    called immediately with the original payload.
    * Wait (Boolean): Should the publish wait until at least there is one
    subscriber to receive the message, defaults to false.

**Returns**: None (undefined)

---

#### subscribe()
To subscribe:

    eb.subscribe(queue, route, callback, order);
* Queue (String): The queue's name to subscribe to.
* Route (String, Array): The routing key(s) to subscribe to. For a single
routing key, a string may be used. If you wish to subscribe to
multiple routing keys you may pass an array of strings.
* Callback (Function): The function to be invoke upon receiving a message.
The contents of the object passed to the callback include:
    * Payload: The payload that was published.
    * Route: The routing key the message was published on.
    * Reply: An ack function to respond back to the publisher.
* Order (Integer): An option argument that allows you to specifiy a explicit
order for place in the queue. The queue will process lower numbers to higher
numbers. If omitted, the default will always be first in first out.

**Returns**: A unique subscription ID (String)

---

#### unsubscribe()

    eb.unsubscribe(subscriptionId);

**Returns**: None (undefined)

---

#### subscribeOnce()

    eb.subscribeOnce(queue, route, callback, order);

The same as the subscribe function except after it is invoked once it is
automatically unsubscribed.

**Returns**: A unique subscription ID (String)

---

#### subscribeTimes()

    eb.subscribeOnce(queue, route, callback, order, times);

The same as the subscribeOnce() function except after it is invoked *times*
number of times it is automatically unsubscribed.

**Returns**: A unique subscription ID (String)

---

#### fetchMessage()

    eb.fetchMessage(queue, route, n);

Retrieves the next message off of a durable queue. It takes an optional
argument *n* which is how many messages to retrieve, defaults to one.

**Returns**: An array of messages or an empty array (Array)

---
