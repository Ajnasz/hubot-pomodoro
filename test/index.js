/*jshint node:true*/
/*global describe, it, beforeEach, afterEach*/
/*eslint-env node*/

// var expect = require('chai').expect;
var sinon = require('sinon');

var pushbot = require('../src/pomodoro');

function rand() {
	'use strict';
	return Math.round(Math.random() * 10000000);
}


var robotProto = {
	hear: function (regexp, cb) {
		'use strict';
		this.__commands.push({
			regexp: regexp,
			cb: cb
		});
	},
	reply: function (env, text) {
		'use strict';
		env = env;
		text = text;
	},
	respond: function (regexp, cb) {
		'use strict';
		this.__commands.push({
			direct: true,
			regexp: regexp,
			cb: cb
		});
	},
	logger: {
		debug: function () {
			'use strict';
			// console.log.apply(console, arguments);
		},
		info: function () {
			'use strict';
			// console.info.apply(console, arguments);
		},
		error: function () {
			'use strict';
			// console.info.apply(console, arguments);
		}
	},
	brain: {
		data: null,
		on: function (ev, cb) {
			'use strict';
			cb();
		}
	}
};

var msgProto = {
	message: {
		room: '',
		user: {
			name: '',
			id: 0
		}
	},
	match: null,
	topic: function () {
		'use strict';
	},
	reply: function () {
		'use strict';
	},
	send: function () {
		'use strict';
	}
};

function createMsg(item, message, room, userName, userId) {
	'use strict';
	var msg = Object.create(msgProto);

	msg.match = message.match(item.regexp);
	msg.message.room = room;
	msg.message.user.name = userName;
	msg.message.user.id = userId;
	msg.envelope = rand();

	return msg;
}

function createRobot() {
	'use strict';
	var robot = Object.create(robotProto);

	robot.__commands = [];
	robot.brain.data = {};

	return robot;
}

function findCommand(robot, message) {
	'use strict';
	var item = robot.__commands.reduce(function (result, item) {
		if (result) {
			return result;
		}

		if (item.regexp.test(message)) {
			return item;
		}
	}, null);

	return item;
}

function createMessage(robot, message, room, userName, userId) {
	'use strict';
	var item = findCommand(robot, message);

	var msg = null;

	if (item) {
		msg = createMsg(item, message, room, userName, userId);
	}

	return msg;
}

function callCommand(command, msg) {
	'use strict';
	if (typeof command === 'undefined') {
		throw new Error('Command not found');
	}

	command.cb(msg);
}

function ensureReply(msg) {
	'use strict';
	var args = Array.prototype.slice.call(arguments).slice(1);

	args.unshift(msg.reply);

	sinon.assert.calledWithExactly.apply(sinon.assert, args);
}

function ensureSend(msg, reply) {
	'use strict';
	sinon.assert.calledWithExactly(msg.send, reply);
}

describe('hubot-pomodoro', function () {
	'use strict';
	var robot, room, bot, userName, userId;

	beforeEach(function beforeHubotPomodoro() {
		room = 'Room-' + rand();
		robot = createRobot();
		sinon.spy(robot, 'reply');
		bot = pushbot(robot);

		userName = 'user-' + rand();
		userId = rand();
	});
	afterEach(function afterHubotPomodoro() {
		robot.reply.restore();
		bot.stop();
		robot = null;
		bot = null;
		
	});

	describe('start pomodoro', function () {
		it('should send back "Pomodoro started!" message', function () {
			var cmd = 'start pomodoro';
			var msg = createMessage(robot, cmd, room, userName, userId);

			sinon.spy(msg, 'send');

			callCommand(findCommand(robot, cmd), msg);

			sinon.assert.calledOnce(msg.send);
			ensureSend(msg, 'Pomodoro started!');

			msg.send.restore();
		});
	});
	describe('start pomodoro <time>', function () {
		it('should send back "Pomodoro started!" message', function () {
			var cmd = 'start pomodoro 1';
			var msg = createMessage(robot, cmd, room, userName, userId);

			sinon.spy(msg, 'send');

			callCommand(findCommand(robot, cmd), msg);

			sinon.assert.calledOnce(msg.send);
			ensureSend(msg, 'Pomodoro started!');

			msg.send.restore();
		});

		it('should call reply after pomodoro ended', function (done) {
			var cmd = 'start pomodoro 0.0001';
			var msg = createMessage(robot, cmd, room, userName, userId);

			callCommand(findCommand(robot, cmd), msg);

			setTimeout(function () {
				sinon.assert.calledOnce(robot.reply);
				ensureReply(robot, msg.envelope, 'Pomodoro completed!');
				done();
			}, 1050);
		});
	});

	describe('stop pomodoro', function () {
		it('should send back "You have not started a pomodoro" message', function () {
			var cmd = 'stop pomodoro';
			var msg = createMessage(robot, cmd, room, userName, userId);

			sinon.spy(msg, 'send');

			callCommand(findCommand(robot, cmd), msg);

			sinon.assert.calledOnce(msg.send);
			ensureSend(msg, 'You have not started a pomodoro');

			msg.send.restore();
		});
	});
	describe('pomodoro?', function () {
		it('should send back "You have not started a pomodoro" message', function () {
			var cmd = 'pomodoro?';
			var msg = createMessage(robot, cmd, room, userName, userId);

			sinon.spy(msg, 'send');

			callCommand(findCommand(robot, cmd), msg);

			sinon.assert.calledOnce(msg.send);
			ensureSend(msg, 'You have not started a pomodoro');

			msg.send.restore();
		});
	});
	describe('pomodoro <username>?', function () {
		it('should send back "<username> has not started a pomodoro" message', function () {
			var name = 'anonym' + rand();
			var cmd = 'pomodoro ' + name + '?';
			var msg = createMessage(robot, cmd, room, userName, userId);

			sinon.spy(msg, 'send');

			callCommand(findCommand(robot, cmd), msg);

			sinon.assert.calledOnce(msg.send);
			ensureSend(msg, name + ' has not started a pomodoro');

			msg.send.restore();
		});
	});
	describe('all pomodoros?', function () {
		it('should send back "There is no started a pomodoro" message', function () {
			var cmd = 'all pomodoros?';
			var msg = createMessage(robot, cmd, room, userName, userId);

			sinon.spy(msg, 'send');

			callCommand(findCommand(robot, cmd), msg);

			sinon.assert.calledOnce(msg.send);
			ensureSend(msg, 'There is no started a pomodoro');

			msg.send.restore();
		});
	});
});
