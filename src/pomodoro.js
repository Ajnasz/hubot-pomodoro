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

function isWaitingPomodoro(pomodoro) {
	'use strict';
	if (isDef(pomodoro) && pomodoro !== null && pomodoro.len && pomodoro.started) {
		return (pomodoro.started + calcJSLen(pomodoro.len) > Date.now() + 1);
	}

	return false;
}

function isValidPomodoro(pomodoro) {
	'use strict';
	return (isDef(pomodoro) && pomodoro !== null && pomodoro.len && pomodoro.started);
}


var createBrain = function () {
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

			if (!newBrain.data.apomodoros.user) {
				newBrain.data.apomodoros.user = {};
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
		},

		getPomodoro: function (userName) {
			return this.get('user.' + userName);
		},

		setPomodoro: function (userName, value) {
			return this.set('user.' + userName, value);
		}
	};
};

module.exports = function (robot) {
	'use strict';
	var brain = createBrain();

	brain.init(robot.brain);

	function hasPomodoro(userName) {
		var pomodoro = brain.getPomodoro(userName);

		return isWaitingPomodoro(pomodoro);
	}

	function stopPomodoro(userName) {
		brain.setPomodoro(userName, null);
	}

	function completePomodoro(userName) {
		var pomodoro = brain.getPomodoro(userName);

		robot.logger.info('pomodoro completed: %s', userName);
		stopPomodoro(userName);

		if (pomodoro) {
			robot.reply(pomodoro.envelope, 'Pomodoro completed!');
		}
	}

	var timer;

	function cron() {
		if (timer) {
			clearTimeout(timer);
		}
		timer = setTimeout(function () {
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

			var next = Object.keys(brain.get('user')).filter(function (user) {
				return users[user] !== null;
			});

			if (next.length > 0) {
				cron();
			}
		}, 1000);
	}


	function startPomodoro(userName, envelope, len) {
		len = len || defaultLength;

		robot.logger.info('start pomodoro for user %s, length %d', userName, calcJSLen(len));

		brain.setPomodoro(userName, {
			started: Date.now(),
			envelope: envelope,
			len: len,
			user: userName
		});

		cron();
	}

	robot.respond(/start pomodoro ?([\d.]+)?/i, function (msg) {
		var userName = msg.message.user.name;

		if (hasPomodoro(userName)) {
			msg.send('Pomodoro already started');
		} else {
			startPomodoro(userName, msg.envelope, msg.match[1]);
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
			pomodoro = brain.getPomodoro(userName);
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
			pomodoro = brain.getPomodoro(userName);
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

	return {
		stop: function () {
			if (timer) {
				clearTimeout(timer);
			}
		}
	};
};
