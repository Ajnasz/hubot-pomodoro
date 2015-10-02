// Description:
//   Hubot's pomodoro timer
//
// Dependencies:
//   None
//
// Configuration:
//   None
//
// Commands:
//   hubot start pomodoro - start a new pomodoro
//   hubot start pomodoro <time> - start a new pomodoro with a duration of <time> minutes
//   hubot stop pomodoro - stop a pomodoro
//   hubot pomodoro? - shows the details of the current pomodoro
//   hubot pomodoro <username>? - shows the details of <username>'s current pomodoro
//   hubot all pomodoros? - shows the details of the current pomodoro
//
// Author:
//   ajnasz

/*jshint node: true*/
/*eslint-env node*/
var defaultLength = 25;
var itemLen = 1000;

function isDef(val) {
	'use strict';
	return typeof val !== 'undefined';
}

function isValidObject(val) {
	'use strict';
	return typeof val === 'object' && val !== null;
}

function calcJSLen(len) {
	'use strict';
	return len * 60 * itemLen;
}

function reverseJSLen(len) {
	'use strict';
	return Math.round(len / itemLen / 60);
}

function getRemaining(pomodoro) {
	'use strict';
	return reverseJSLen(pomodoro.started + calcJSLen(pomodoro.len) - Date.now());
}

var brain = (function () {
	'use strict';
	var instanceBrain = null;

	function getAllData() {
		return instanceBrain.data.apomodoros;
	}

	return {
		init: function (newBrain) {
			if (!newBrain.data.apomodoros) {
				newBrain.data.apomodoros = {};
			}

			instanceBrain = newBrain;
		},

		set: function (name, value) {
			var nameArray = name.split('.');
			var item = nameArray.reduce(function (prevVal, item, index, array) {
				if (index >= array.length - 1) {
					return prevVal;
				}

				if (!isValidObject(prevVal) || !isValidObject(prevVal[item])) {
					prevVal[item] = {};
				}

				return prevVal[item];
			}, getAllData());

			item[nameArray[nameArray.length - 1]] = value;
		},

		get: function (name) {
			return name.split('.').reduce(function (prevVal, item) {
				if (isValidObject(prevVal) && isDef(prevVal[item])) {
					return prevVal[item];
				}

				return null;
			}, getAllData());
		}
	};
}());

module.exports = function (robot) {
	'use strict';
	brain.init(robot.brain);

	function isWaitingPomodoro(userName) {
		var value = brain.get('user.' + userName);

		if (isDef(value) && value !== null && value.len && value.started) {
			return (value.started + calcJSLen(value.len) > Date.now() + 1);
		}

		return false;
	}

	function isValidPomodoro(pomodoro) {
		return (isDef(pomodoro) && pomodoro !== null && pomodoro.len && pomodoro.started);
	}

	function hasPomodoro(userName) {
		return isWaitingPomodoro(userName);
	}

	function stopPomodoro(userName) {
		brain.set('user.' + userName, null);
	}

	function completePomodoro(userName) {
		robot.logger.info('pomodoro completed: %s', userName);
		stopPomodoro(userName);
		robot.send(userName, 'Pomodoro completed!');
	}

	function startPomodoro(userName, len) {
		len = len || defaultLength;

		robot.logger.info('start pomodoro for user %s, length %d', userName, len);

		brain.set('user.' + userName, {
			started: Date.now(),
			len: len,
			user: userName
		});
	}

	function cron() {
		setTimeout(function () {
			var users = brain.get('user');
			Object.keys(users).filter(function (user) {
				return users[user] !== null;
			}).forEach(function (user) {
				var pomodoro = users[user];

				if (isValidPomodoro(pomodoro)) {
					// robot.logger.info(JSON.stringify(require('util').inspect(pomodoro)),
					//	pomodoro.started + calcJSLen(pomodoro.len), Date.now());

					if (pomodoro.started + calcJSLen(pomodoro.len) <= Date.now()) {
						completePomodoro(user);
					}
				} else {
					stopPomodoro(pomodoro);
				}
			});

			cron();
		}, 1000);
	}

	cron();

	robot.respond(/start pomodoro ?(\d+)?/i, function (msg) {
		var userName = msg.message.user.name;

		if (hasPomodoro(userName)) {
			msg.send('Pomodoro already started');
		} else {
			startPomodoro(userName, msg.match[1]);
			msg.send('Pomodoro started!');
		}
	});

	robot.respond(/stop pomodoro/i, function (msg) {
		var userName = msg.message.user.name;

		if (hasPomodoro(userName)) {
			stopPomodoro(userName);
			msg.send('Pomodoro stopped!');
		} else {
			msg.send('You have not started a pomodoro');
		}
	});

	robot.respond(/pomodoro\?/i, function (msg) {
		var userName = msg.message.user.name;
		var pomodoro;
		var minutes;

		if (hasPomodoro(userName)) {
			pomodoro = brain.get('user.' + userName);
			minutes = getRemaining(pomodoro);

			msg.send('There are still ' + minutes + ' minutes in this pomodoro');
		} else {
			msg.send('You have not started a pomodoro');
		}
	});

	robot.respond(/pomodoro ([\w_-]+)\?/i, function (msg) {
		var userName = msg.match[1];
		var pomodoro;
		var minutes;

		if (hasPomodoro(userName)) {
			pomodoro = brain.get('user.' + userName);
			minutes = getRemaining(pomodoro);

			msg.send('There are still ' + minutes + ' minutes in ' + userName + '\'s pomodoro');
		} else {
			msg.send(userName + ' has not started a pomodoro');
		}
	});

	robot.respond(/all pomodoros\?/i, function (msg) {
		var users = brain.get('user');

		var response = Object.keys(users).filter(function (user) {
			return users[user] !== null;
		}).map(function (user) {
			return 'There are still ' + getRemaining(users[user]) + ' minutes remaining in ' + user + '\'s pomodoro\n';
		});

		if (response.length) {
			msg.send(response);
		} else {
			msg.send('There is no started a pomodoro');
		}
	});
};
