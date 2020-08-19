const socket = io();
const usernameForm = document.getElementById('usernameForm');
const usersForm = document.getElementById('usersForm');
const findUser = document.getElementById('findUser');
const messageContainer = document.getElementById('messageContainer');
const usernameContainer = document.getElementById('usernameContainer');
const messageBox = document.getElementById('messageBox');
const messageElement = document.getElementById('message');
const userToFind = document.getElementById('userToFind');
var username;
var currentChat;
var handshakes = {};
var messages = {};

Date.prototype.timeNow = function () {
     return ((this.getHours() < 10)?"0":"") + this.getHours() +":"+ ((this.getMinutes() < 10)?"0":"") + this.getMinutes() +":"+ ((this.getSeconds() < 10)?"0":"") + this.getSeconds();
}

usernameForm.addEventListener('submit', function (e) {
	e.preventDefault();
});

findUser.addEventListener('submit', function (e) {
	e.preventDefault();
});

usersForm.addEventListener('submit', function (e) {
	e.preventDefault();
});

messageBox.addEventListener('submit', function (e) {
	e.preventDefault();
});

messageElement.addEventListener("keypress", submitOnEnter);

socket.on('new-chat-added', function (data) {
	addChat(data.name);
});

socket.on('new-message', function (data) {
	var time = new Date();

	if (!messages[data.name])
		addChat(data.name);
	if (data.attemptHandshake) {
		handshakes[data.name] = 1;

		var b = getButtonWithValue(data.name);
		if (b)
			b.innerHTML = data.name + '&#x1F7E1';

		if (data.name == currentChat)
			spawnChat(currentChat);
	} else {
		if (data.confirmHandshake)
			handshakes[data.name] = 2;

		if (handshakes[data.name] == 2) {
			messages[data.name].push({ time: time, from: data.name, message: data.message });
			if (data.name == currentChat)
				spawnChat(currentChat);
			else {
				var b = getButtonWithValue(data.name);
				if (b)
					b.innerHTML = data.name + '&#x1F535';
			}
		}
	}
});

socket.on('username-pong', function () {
	while (usernameContainer.lastElementChild) {
		usernameContainer.removeChild(usernameContainer.lastElementChild);
	}

	var succ = document.createElement('p');
	succ.innerHTML = 'Logged in as ' + username + '.';
	usernameContainer.append(succ);
});

function sendUsername() {
	username = document.getElementById('submitUsername').value;
	socket.emit('username-ping', { username: username });
}

function findUsername() {
	socket.emit('find-user', { name: userToFind.value });
	userToFind.value = '';
}

// add user to left panel
function addChat(chat) {
	messages[chat] = [];
	handshakes[chat] = 0;
	var newChat = document.createElement('div');
	newChat.innerHTML = '<button type=\'submit\' class=\'userButton\' onclick=\'this.form.submitted=this.value\' value=\'' + chat + '\'>' + chat + '&#x1F534</button>';
	usersForm.append(newChat);
}

function getButtonWithValue(val) {
	var buttons = document.getElementsByClassName('userButton');
	for (var i = 0; i < buttons.length; i++) {
		if (buttons[i].value == val) {
			return buttons[i];
		}
	}
	return null;
}

function despawnChat() {
	while (messageContainer.lastElementChild) {
		messageContainer.removeChild(messageContainer.lastElementChild);
	}
}

function spawnChat(chat) {
	currentChat = chat;
	despawnChat();
	if (handshakes[chat] == 2) {
		var b = getButtonWithValue(chat);
		if (b)
			b.innerHTML = chat + '&#x1F7E2';

		for (i = 0; i < messages[chat].length; i++) {
			var spawn = document.createElement('div');
			spawn.innerHTML = '<b>' + messages[chat][i].time.timeNow() + '    ' + messages[chat][i].from + '</b><br>' + decodeURI(messages[chat][i].message);
			messageContainer.append(spawn);
		}
	} else if (handshakes[chat] == 1) {
		var spawn = document.createElement('div');
		spawn.innerHTML = '<p>Handshake initiated! Send your key in correct <b>OpenPGP</b> format via chat box below to agree.</p>';
		messageContainer.append(spawn);
	} else if (handshakes[chat] == 0) {
		var spawn = document.createElement('div');
		spawn.innerHTML = '<p>You have not traded public keys with this user yet. Click the button below to initiate handshake.</p><br>';
		spawn.innerHTML += '<button onclick=\'initHandshake();\'>Initiate Handshake</button><br>';
		spawn.innerHTML += '<p>In the future you can type <b>/handshake</b> to re-do the handshake with this user.</p>';
		messageContainer.append(spawn);
	}
}

function initHandshake() {
	socket.emit('init-handshake', { with: currentChat });
	handshakes[currentChat] = 1;
	var b = getButtonWithValue(data.name);
		if (b)
			b.innerHTML = data.name + '&#x1F7E1';
	spawnChat(currentChat);
}

function sendMessage() {
	var time = new Date();

	if (handshakes[currentChat] == 2) {
		var message = encodeURI(messageElement.value);
		if (currentChat) {
			socket.emit('message', { to: currentChat, message: message });
			if (message.includes(encodeURI('-----BEGIN PGP MESSAGE-----')) && message.includes(encodeURI('-----END PGP MESSAGE-----'))) {
				if (!messages[currentChat]) 
					messages[currentChat] = [];

				messages[currentChat].push({ time: time, from: username, message: message });
				spawnChat(currentChat);
			} else {
				//handle this
				console.log("another fail")
			}
		} else {
			console.log("fail");
		}
	} else if (handshakes[currentChat] == 1) {
		var message = encodeURI(messageElement.value);
		if (currentChat) {
			socket.emit('confirm-handshake', { with: currentChat, key: message });
		} else {
			console.log("fail");
		}
	}

	messageElement.value = '';
}

function submitOnEnter(e){
    if (e.which === 13 && !e.shiftKey){
    	e.preventDefault();
		sendMessage();
    }
}