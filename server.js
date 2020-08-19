'use strict'; const express = require('express'); const session = require('express-session'); const flash = require('express-flash'); const app = express(); const path = require('path'); const 
cookieParser = require('cookie-parser'); const bodyParser = require('body-parser'); const http = require('http').createServer(app); const formidable = require('formidable'); const 
fs = require('fs').promises; const mysql = require('mysql'); const util = require('util'); const passport = require('passport'); const io = require('socket.io').listen(http);

const gdrive = require('/home/pi/server/gdrive_op.js');
const initializePassport = require('/home/pi/server/passport-config.js');

const MYSQL_CREDS = require('/home/pi/server/mysql.json');
const BASE_FOLDER = require('/home/pi/server/basefolder.json');
const USERS = require('/home/pi/server/users.json');

var folders;
var files;
var currentFolderID;
var currentPath;
var currentFile;
var drive;
var chatUsers = ['chat_bot'];
var currentSockets = {};

const con = mysql.createConnection(MYSQL_CREDS);
const query = util.promisify(con.query).bind(con);

initializePassport(passport,
    function (name) { return USERS.arr.find(user => user.name === name); },
    function (id) { return USERS.arr.find(user => user.id === id); }
);

app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');
app.set('port', 80);

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));
app.use(flash());
app.use(session({ secret: 'secret', resave: false, saveUninitialized: false }));
app.use(passport.initialize());
app.use(passport.session());

// Connect to mysql database
con.connect(function (err) {
	if(err) {
		console.log('* Error connecting to DB');
		return;
	}
	console.log('* DB connection established');
    currentFolderID = BASE_FOLDER.ID;
    currentPath = '/';
    drive = gdrive.getDrive();
});

function appendPath(folder) {
	if (currentPath != '/')
		currentPath+= '/';
	currentPath+= folder;
}

function truncatePath(folder) {
	if (folder=='/') return;
	currentPath = currentPath.split('/' + folder)[0];
	if(!currentPath)
		currentPath = '/';
}

function localPath() {
    return '/home/pi/server/saved_files/' + currentFolderID + currentFile;
}

function checkAuthenticatedAdmin(req, res, next) {
    if (req.isAuthenticated())
        return next();

    res.redirect('/hidden/login');
}

function checkNotAuthenticatedAdmin(req, res, next) {
    if (req.isAuthenticated())
        return res.redirect('/hidden/admin');
    next();
}

app.get('/', function (req, res) {
    res.render('index', { title: 'Main Page' });
});

app.get('/chat', function (req, res) {
    res.render('chat_landing', { title: 'Chat Main Page' });
});

function sendUser(socket, user) {
    currentSockets[socket.id].added_people.push(user);
    io.to(socket.id).emit('new-chat-added', { name: user });
}

function sendMessage(socket, name, message) {
    io.to(socket).emit('new-message', { name: name, message: message });
}

io.sockets.on('connection', function (socket) {
    currentSockets[socket.id] = {added_people: [], keys: {}};
    console.log(`${socket.id} connected`);

    socket.on('username-ping', function (data) {
        if (!chatUsers.includes(data.username)) {
            currentSockets[socket.id].username = data.username;
            chatUsers.push(data.username);
            io.to(socket.id).emit('username-pong');
            sendUser(socket, 'chat_bot');
            sendMessage(socket.id, 'chat_bot', 'hello');
            sendMessage(socket.id, 'chat_bot', 'world');
            console.log(`${socket.id} chose name ${data.username}`);
        } else {
            console.log("Fail");
        }
    });

    socket.on('find-user', function (data) {
        if (chatUsers.includes(data.name) && currentSockets[socket.id].username != data.name) {
            if (!currentSockets[socket.id].added_people.includes(data.name)) {
                sendUser(socket, data.name);
            }
        }
    });

    socket.on('message', function (data) {
        if (data.message.includes(encodeURI('-----BEGIN PGP MESSAGE-----')) && data.message.includes(encodeURI('-----END PGP MESSAGE-----'))) {
            for (var key in currentSockets) {
                if (currentSockets[key] && currentSockets[key].username == data.to) {
                    sendMessage(key, currentSockets[socket.id].username, data.message);
                    console.log(`${currentSockets[socket.id].username} to ${data.to}: ${data.message}`)
                    break;
                }
            }
        } else {
            console.log(`(incorrect) ${currentSockets[socket.id].username} to ${data.to}: ${data.message}`)
        }
    });

    socket.on('init-handshake', function (data) {
        console.log(`${socket.id} attempts to shake hands with ${data.with}.`);
        for (var key in currentSockets) {
            if (currentSockets[key] && currentSockets[key].username == data.with) {
                io.to(key).emit('new-message', { name: currentSockets[socket.id].username, attemptHandshake: true });
            }
        }
    });

    socket.on('confirm-handshake', function (data) {
        if (data.key.includes(encodeURI("-----BEGIN PGP PUBLIC KEY BLOCK-----")) && data.key.includes(encodeURI("-----END PGP PUBLIC KEY BLOCK-----"))) {
            console.log(`${socket.id} confirms handshake with ${data.with}.`);

            for (var key in currentSockets) {
                if (currentSockets[key] && currentSockets[key].username == data.with) {
                    if (currentSockets[key].keys[currentSockets[socket.id].username]) {
                        io.to(key).emit('new-message', { name: currentSockets[socket.id].username, confirmHandshake: true, message: data.key })
                        io.to(socket.id).emit('new-message', { name: data.with, confirmHandshake: true, message: currentSockets[key].keys[currentSockets[socket.id].username] });
                        delete currentSockets[key].keys[currentSockets[socket.id].username];
                     } else {
                        currentSockets[socket.id].keys[data.with] = data.key;
                     }
                }
            }
        } else {
            console.log(`${socket.id} sent invalid key to ${data.with}`);
        }
    });
});

app.get('/hidden/login', checkNotAuthenticatedAdmin, function (req, res) {
    res.render('login', { title: 'Login' });
});


app.post('/hidden/login', checkNotAuthenticatedAdmin, passport.authenticate('local', {
    successRedirect: '/hidden/admin',
    failureRedirect: '/hidden/login',
    failureFlash: true
}));

app.post('/hidden/logout', checkAuthenticatedAdmin, function (req, res) {
    req.logOut();
    res.redirect('/');
});

app.get('/hidden/admin', checkAuthenticatedAdmin, function (req, res) {
    res.render('admin', { title: 'Admin Landing Page' });
});

app.get('/hidden/admin/system', checkAuthenticatedAdmin, async function (req, res) {
	try {
		folders = await query('SELECT name, drive_id FROM folders WHERE p_drive_id = ? AND name <>?', [ currentFolderID, '/' ]);
		files = await query('SELECT name FROM files WHERE folder_id = ?', currentFolderID);
	} finally {
		res.render('filesystem', { title: 'File System', folders: folders, files: files, path: currentPath });
	}
});

app.post('/hidden/admin/system', checkAuthenticatedAdmin, function (req, res) {
    if (req.body.open_file) {
        openFile(req, res);
    }
    if (req.body.change_dir) {
        changeDir(req, res);
	}
    if (req.body.create_name) {
        createFile(req, res);
   	}
    if (req.body.delete_name) {
        deleteFile(req, res);
	}
});

app.get('/hidden/admin/editor', checkAuthenticatedAdmin, async function (req, res) {
    var q = await query('SELECT drive_id FROM files WHERE name = ? AND folder_id = ?', [currentFile, currentFolderID]);
    if (q[0].drive_id == 'badf00d') {
        res.render('editor', { title: 'Editor', name: currentFile, file_in: '' });
    } else {
        try {
	       await fs.access(localPath());
        } catch (err) {
            await gdrive.downloadFile(drive, localPath(), q[0].drive_id);
	    }
        var data = await fs.readFile(localPath(), 'utf8');
        res.render('editor', { title: 'Editor', name: currentFile, file_in: encodeURIComponent(data) });
    }
});

app.post('/hidden/admin/editor', checkAuthenticatedAdmin, function (req, res) {
    if (req.body.value) {
    	(async () => {
        	var q = await query('SELECT drive_id FROM files WHERE name = ? AND folder_id = ?', [ currentFile, currentFolderID ]);
        	if (q[0].drive_id == 'badf00d') {
            		await fs.writeFile(localPath(), req.body.value);
            		var drive_id = await gdrive.uploadFile(drive, currentFile, currentFolderID, false);
            		await query('UPDATE files SET drive_id = ? WHERE name = ? AND folder_id = ?', [drive_id, currentFile, currentFolderID]);
        	} else {
            		await fs.writeFile(localPath(), req.body.value)
            		await gdrive.updateFile(drive, currentFile, q[0].drive_id, req.body.value);
        	}
    	})()
    }
    res.redirect('/hidden/admin/editor');
});

app.get('/hidden/admin/newfile', checkAuthenticatedAdmin, function (req, res) {
    res.render('newfile', { title: 'New File' });
});

app.post('/hidden/admin/newfile', checkAuthenticatedAdmin, function (req, res) {
    var form = new formidable.IncomingForm();
    form.parse(req, function (err, fields, file) {
        var oldpath = file.uploadFile.path;
        var newpath = localPath();
        fs.rename(oldpath, newpath, function(err) { if(err) { throw err; } });
	    (async () => {
		  var drive_id = await gdrive.uploadFile(drive, currentFile, currentFolderID, false);
		  await query('UPDATE files SET drive_id = ? WHERE name = ? AND folder_id = ?', [drive_id, currentFile, currentFolderID]);
	    })()
    });
    res.redirect('/hidden/admin/system');
});

async function changeDir(req, res) {
    try {
        if (req.body.change_dir != '..') {
            var q = await query('SELECT name, drive_id FROM folders WHERE name = ? AND p_drive_id = ?', [req.body.change_dir, currentFolderID]);
            currentFolderID = q[0].drive_id;
            appendPath(q[0].name);
        } else {
            var q = await query('SELECT name, p_drive_id FROM folders WHERE drive_id = ?', [currentFolderID]);
            currentFolderID = q[0].p_drive_id;
            truncatePath(q[0].name);
        }
    } catch (err) {
        console.log(err);
    } finally {
        res.redirect('/hidden/admin/system');
    }
}

async function openFile(req, res) {
    var q = await query('SELECT drive_id FROM files WHERE name = ? AND folder_id = ?', [ req.body.open_file, currentFolderID ]);
    currentFile = req.body.open_file;
    if (q[0].drive_id == 'badf00d')
        res.redirect('/hidden/admin/newfile');
    else
	res.redirect('/hidden/admin/editor');
}

async function createFile(req, res) {
    try {
        if (req.body.is_folder) {
            if (req.body.create_name != '/' && req.body.create_name != '..') {
                var drive_id = await gdrive.uploadFile(drive, req.body.create_name, currentFolderID, true);
                con.query('INSERT INTO folders SET ?', { name: req.body.create_name, drive_id: drive_id, p_drive_id: currentFolderID }, function (err, res) { if (err) throw err; });
            }
        } else {
            con.query('INSERT INTO files SET ?', { name: req.body.create_name, drive_id: 'badf00d', folder_id: currentFolderID }, function (err, res) { if (err) throw err; });
        }
    } catch (err) {
        console.log(err);
    } finally {
        res.redirect('/hidden/admin/system');
    }
}

async function deleteFile(req, res) {
    try {
        if (req.body.is_folder) {
            if (req.body.delete_name != '/' && req.body.delete_name != '..') {
                var q = await query('SELECT drive_id FROM folders WHERE name = ? AND p_drive_id = ?', [req.body.delete_name, currentFolderID]);
	            await gdrive.deleteFile(drive, q[0].drive_id);
                con.query('DELETE FROM folders WHERE drive_id = ?', q[0].drive_id, function (err, res) { if (err) throw err; });
            }
        } else {
            var q = await query('SELECT drive_id FROM files WHERE name = ? AND folder_id = ?', [req.body.delete_name, currentFolderID]);
            if (q[0].drive_id != 'badf00d') {
                await gdrive.deleteFile(drive, q[0].drive_id);
                try {
			await fs.access('home/pi/server/saved_files/'+currentFolderID+currentFile);
		} catch(err) {
			await fs.unlink(localPath());
	    	}
	    }
            con.query('DELETE FROM files WHERE name = ? AND folder_id = ?', [req.body.delete_name, currentFolderID], function (err, res) { if (err) throw err; });
        }
    } catch (err) {
        console.log(err);
    } finally {
        res.redirect('/hidden/admin/system');
    }
}

var server = http.listen(app.get('port'), 'localhost', function () {
    console.log(`* Express server listening on port ${server.address().port}`);
});
