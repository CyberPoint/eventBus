all:
	npm install --save-dev
	mkdir -p dist
	mkdir -p lib
	cp node_modules/async/lib/async.js lib/
	cp node_modules/lodash/lodash.js lib/
	node_modules/karma/bin/karma start karma.conf.js
	node_modules/uglify-js/bin/uglifyjs src/EventBus.js > dist/EventBus.min.js

tests:
	npm install --save-dev
	mkdir -p lib
	cp node_modules/async/lib/async.js lib/
	cp node_modules/lodash/lodash.js lib/
	node_modules/karma/bin/karma start karma.conf.js
