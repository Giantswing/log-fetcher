const { Client } = require('ssh2');
const fs = require('fs');
const path = require('path');

const servers = JSON.parse(fs.readFileSync('config/servers.json', 'utf8'));

async function main() {
   const client = new Client();

   for (const server of servers) {
      const config = {
         folder: server.folder,
         host: server.host,
         port: 22,
         lastSync: server.lastSync,
         username: server.username,
         privateKey: fs.readFileSync(server.privateKey),
         readyTimeout: 20000
      };

      if (!fs.existsSync('./logs')) {
         fs.mkdirSync('./logs');
      }

      await fetchServerLogs(client, config, server.remoteLogDir, server.folder);

      console.log(`Finished downloading logs from ${server.host}`);
      const date = new Date();
      const lastSyncDate = date.toISOString().split('T')[0];
      server.lastSync = lastSyncDate;
      fs.writeFileSync('config/servers.json', JSON.stringify(servers, null, 2));

   }
}

async function fetchServerLogs(client, config, remoteLogDir, localFolder) {
   try {
      // Establish SSH connection
      await connectSSH(client, config);

      const sftp = await getSFTP(client);

      // List files in the remote directory
      const remoteFiles = await listRemoteFiles(sftp, remoteLogDir);

      // Ensure local folder exists
      const localDir = path.join('./logs', localFolder);
      if (!fs.existsSync(localDir)) {
         fs.mkdirSync(localDir);
      }

      // Download each file
      for (const remoteFile of remoteFiles) {
         if (!remoteFile.startsWith('laravel')) 
            continue;

         //If there is a last sync only donwload files after or equal to the last sync
         //File names contain the date in the format YYYY-MM-DD
         if (config.lastSync) {
            const fileDate = remoteFile.match(/(\d{4}-\d{2}-\d{2})/)?.[0];

            if(!fileDate) {
               console.log(`Skipping ${remoteFile} as it does not match the date format`);
               continue;
            }

            const lastSyncDate = config.lastSync;

            if (fileDate < lastSyncDate) {
               // console.log(`Skipping ${remoteFile} as it is older than the last sync date`);
               continue;
            }
         }

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

main();

