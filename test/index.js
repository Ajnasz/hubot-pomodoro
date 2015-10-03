/*jshint node:true*/
/*global describe, it, beforeEach, afterEach*/

'use strict';
var expect = require('chai').expect;
var sinon = require('sinon');

var pushbot = require('../src/pomodoro');

function rand() {
	return Math.round(Math.random() * 10000000);
}


var robotProto = {
	hear: function (regexp, cb) {
		this.__commands.push({
			regexp: regexp,
			cb: cb
		});
	},
	respond: function (regexp, cb) {
		this.__commands.push({
			direct: true,
			regexp: regexp,
			cb: cb
		});
	},
	logger: {
		debug: function () {},
		info: function () {},
		error: function () {}
	},
	brain: {
		data: null,
		on: function (ev, cb) {
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
	},
	reply: function () {
	},
	send: function () {
	}
};

function createMsg(item, message, room, userName, userId) {
	var msg = Object.create(msgProto);

	msg.match = message.match(item.regexp);
	msg.message.room = room;
	msg.message.user.name = userName;
	msg.message.user.id = userId;

	return msg;
}

function createRobot() {
	var robot = Object.create(robotProto);

	robot.__commands = [];
	robot.brain.data = {};

	return robot;
}

function findCommand(robot, message) {
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
	var item = findCommand(robot, message);

	var msg = null;

	if (item) {
		msg = createMsg(item, message, room, userName, userId);
	}

	return msg;
}

function callCommand(command, msg) {
	if (typeof command === 'undefined') {
		throw new Error('Command not found');
	}

	command.cb(msg);
}

function getRoom(robot, room) {
	return robot.brain.data.pushbot[room];
}

function ensureReply(msg, reply) {
	sinon.assert.calledWithExactly(msg.reply, reply);
}

function ensureSend(msg, reply) {
	sinon.assert.calledWithExactly(msg.send, reply);
}

describe('hubot-pomodoro', function () {
	var robot, room, bot, userName, userId;
	beforeEach(function () {
		room = 'Room-' + rand();
		robot = createRobot();
		bot = pushbot(robot);
		userName = 'user-' + rand();
		userId = rand();
	});
	afterEach(function () {
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
	describe('pomodoro <username>?', function () {});
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
