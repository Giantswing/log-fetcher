# Log Fetcher

A Node.js script to fetch and sync Laravel log files from remote servers via SSH/SFTP.

## Features

- Connects to multiple remote servers via SSH
- Downloads `laravel-*.log` files from a specified directory
- Skips log files older than the last sync date
- Stores logs in local folders organized by server
- Automatically updates the `lastSync` date in `servers.json`

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/Giantswing/log-fetcher.git 
cd log-fetcher
```

### 2. Install dependencies
```bash
npm install
```

### 3. Prepare config

- Create a `servers.json` file in the root directory with the following structure:

```json
[
  {
    "folder": "folder-name1",
    "host": "host1",
    "username": "ubuntu",
    "privateKey": "keys/file.pem",
    "remoteLogDir": "/var/www/project/current/storage/logs",
  },
  ...
]
```
- `folder`: Local folder name where logs will be stored.
- `host`: Remote server hostname or IP address.
- `username`: SSH username.
- `privateKey`: Path to the private key file for SSH authentication.
- `remoteLogDir`: Directory on the remote server where Laravel logs are stored.

### 4. Run the Script

```bash
node fetchLogs.js
```
