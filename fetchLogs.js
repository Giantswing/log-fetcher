const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const servers = JSON.parse(fs.readFileSync('config/servers.json', 'utf8'));

async function fetchLogs() {
   const client = new Client();

   for (const server of servers) {

      const config = {
         folder: server.folder,
         host: server.host,
         port: 22,
         username: server.username,
         privateKey: fs.readFileSync(server.privateKey),
         readyTimeout: 20000
      };

      // console.log(config);
      await fetchLog(client, config, server.remoteLogDir, server.folder);
   }
}

async function fetchLog(client, config, remoteLogDir, localFolder) {
   try {
      // Establish SSH connection
      await connectSSH(client, config);

      const sftp = await getSFTP(client);

      // List files in the remote directory
      const remoteFiles = await listRemoteFiles(sftp, remoteLogDir);

      // Ensure local folder exists
      const localDir = path.join('./', localFolder);
      if (!fs.existsSync(localDir)) {
         fs.mkdirSync(localDir);
      }

      // Download each file
      for (const remoteFile of remoteFiles) {
         if (!remoteFile.startsWith('laravel')) 
            continue;

         const remotePath = path.join(remoteLogDir, remoteFile);
         const localPath = path.join(localDir, remoteFile);

         console.log(`Downloading: ${remotePath}`);
         await downloadFile(sftp, remotePath, localPath);

         console.log(`Successfully downloaded ${remotePath}`);
      }
   } catch (err) {
      console.error('Error:', err);
   } finally {
      client.end();
   }
}

// Connect to SSH server
function connectSSH(client, config) {
   return new Promise((resolve, reject) => {
      client.on('ready', () => {
         console.log('SSH Connection established');
         resolve();
      }).on('error', (err) => {
            console.error('SSH Connection Error:', err);
            reject(err);
         }).connect(config);
   });
}

// Get SFTP session
function getSFTP(client) {
   return new Promise((resolve, reject) => {
      client.sftp((err, sftp) => {
         if (err) {
            console.error('SFTP Error:', err);
            reject(err);
         } else {
            resolve(sftp);
         }
      });
   });
}

// List files in the remote directory
function listRemoteFiles(sftp, remotePath) {
   return new Promise((resolve, reject) => {
      sftp.readdir(remotePath, (err, list) => {
         if (err) {
            console.error('Error reading remote directory:', err);
            reject(err);
         } else {
            const files = list.map(item => item.filename);
            resolve(files);
         }
      });
   });
}

// Download file using sftp.fastGet
function downloadFile(sftp, remotePath, localPath) {
   return new Promise((resolve, reject) => {
      sftp.fastGet(remotePath, localPath, (err) => {
         if (err) {
            console.error('Error downloading file:', err);
            reject(err);
         } else {
            resolve();
         }
      });
   });
}

fetchLogs();

