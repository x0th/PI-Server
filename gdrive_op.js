const fs = require('fs');
const readline = require('readline');
const { google } = require('googleapis');

const SCOPE = 'https://www.googleapis.com/auth/drive';
const CREDS = require('/home/pi/server/credentials.json');
const EXTENSIONS = require('/home/pi/server/extensions.json');

function getFileMimeType(filename) {
	ext = '';
	for(var i = filename.length-1; i >= 0; i--){
		ext+= filename.charAt(i);
		if(filename.charAt(i) == '.')
			break;
	}
	ext = ext.split('').reverse().join('');
	return EXTENSIONS[ext] == null ? 'application/octet-stream' : EXTENSIONS[ext];
}

function getDrive() {
    const auth = new google.auth.JWT(CREDS.client_email, null, CREDS.private_key, SCOPE);
    return google.drive({ version: 'v3', auth });
}

async function uploadFile(drive, name, parent, isFolder) {
    var driveId;
    if (isFolder) {
        var metadata = { 'name': name, parents: [parent], 'mimeType': 'application/vnd.google-apps.folder' };
        driveId = await drive.files.create({ resource: metadata, fields: 'id' });
    } else {
        var metadata = { 'name': name, parents: [parent] };
        var media = { mimetype: getFileMimeType(name), body: fs.createReadStream('/home/pi/server/saved_files/'+parent+name) };
        driveId = await drive.files.create({ resource: metadata, media: media, fields: 'id' });
    }
    return driveId.data.id;
}

async function updateFile(drive, name, id, body) {
    var media = { mimetype: getFileMimeType(name), body: body };
    await drive.files.update({ fileId: id, media: media });
}

async function downloadFile(drive, path, fileId) {
    return drive.files.get({ fileId: fileId, alt: 'media' }, { responseType: 'stream' })
    .then(res => {
    return new Promise((resolve, reject) => {
       		var dest = fs.createWriteStream(path);

		res.data
 		.on('end', function () { console.log('* Done downloading file'); resolve(path); })
    		.on('error', function (err) { throw err; reject(path); })
   		.pipe(dest);
    	});
    });
}

async function deleteFile(drive, id) {
    await drive.files.delete({ fileId: id });
}

exports.getDrive = getDrive;
exports.uploadFile = uploadFile;
exports.deleteFile = deleteFile;
exports.updateFile = updateFile;
exports.downloadFile = downloadFile;
