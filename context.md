# ESP Cam Server - Project Context

## Project Overview
Home Assistant Add-on that provides a server to store images from ESP32 cameras for water meter monitoring. Packages MongoDB and a Node.js server together in a Docker container.

**Version**: 0.4.1
**Slug**: espcam-server
**Architecture**: aarch64 (Raspberry Pi 4)
**Repository**: https://github.com/KagasiraBunJee/water-meter-ha-addon

## Technology Stack

### Core Components
- **MongoDB 7.0**: Database for storing images and metadata
- **Node.js 21**: TypeScript-based server application
- **Nginx**: Reverse proxy for Home Assistant ingress support
- **Base Image**: `ghcr.io/hassio-addons/ubuntu-base/aarch64:10.0.2`

### Runtime Environment
- **Platform**: Ubuntu-based container optimized for ARM64
- **Package Manager**: npm
- **Language**: TypeScript (compiled to JavaScript)

## Architecture

### Port Configuration
| Port | Service | Exposed | Purpose |
|------|---------|---------|---------|
| 8085 | Node.js Server | Yes | Main application server |
| 8084 | MongoDB | Yes | Database access |
| 8099 | Nginx | Internal | Home Assistant ingress |

### Data Flow
1. ESP32 cameras → POST images to server API (via Home Assistant ingress)
2. Node.js server → Stores images in `/data/server/uploads`
3. MongoDB → Stores metadata at `/data/mongodb`
4. Nginx → Routes all external traffic through ingress proxy

### Directory Structure
```
/data/
├── mongodb/           # Persistent MongoDB database
└── server/            # Node.js application
    ├── uploads/       # Image storage
    ├── .env           # Runtime configuration
    └── ...            # Server application files

/var/log/
├── mongodb/           # MongoDB logs
└── nginx/             # Nginx access/error logs
```

## Key Files

### Configuration
- **config.yaml**: Add-on configuration schema and default values
- **repository.yaml**: Home Assistant repository metadata
- **translations/en.yaml**: Configuration UI translations

### Build & Deployment
- **Dockerfile**: Multi-stage build supporting ARM64
  - Installs Node.js, MongoDB, Nginx, and dependencies
  - Clones server code from external repository
  - Sets up runtime environment

### Runtime Scripts
- **run.sh**: Main entrypoint (83 lines)
  - Creates persistent directories
  - Initializes MongoDB with authentication
  - Configures environment variables
  - Starts Nginx and Node.js server

- **prepare-server.sh**: Server initialization (10 lines)
  - Installs npm dependencies
  - Compiles TypeScript
  - Starts the server

### Configuration Files
- **ingress.conf**: Nginx reverse proxy configuration
  - IP restriction (172.30.32.2 - Home Assistant supervisor)
  - API routing, static asset handling
  - SPA fallback support

- **mongo-scripts/mongo.conf**: MongoDB configuration
  - Logging to `/var/log/mongodb/mongod.log`
  - Timezone information
  - Security settings

## Configuration Schema

### Required Settings
```yaml
server_api_key: str?        # API authentication token
server_port: int?           # Server port (default: 8085)
mongo_userdb_login: str?    # MongoDB username
mongo_userdb_pass: str?     # MongoDB password
mongo_db_name: str?         # Database name
mongo_db_domain: str?       # MongoDB domain
mongo_db_port: int?         # MongoDB port (default: 8084)
```

## Security Model

### Authentication Layers
1. **API Token**: Server requires API key for all firmware and protected endpoints
   - Token configured via Home Assistant add-on settings (`server_api_key`)
   - Automatically passed to web UI frontend from `process.env.API_TOKEN`
   - All firmware endpoints require `X-Auth-Token` header
2. **MongoDB Auth**: Database user authentication enabled
3. **Network Restriction**: Nginx allows only Home Assistant supervisor IP
4. **Ingress Only**: No direct external access

### Access Control
- All external traffic routes through Home Assistant ingress
- IP whitelist: 172.30.32.2 (supervisor only)
- MongoDB runs in authenticated mode after initialization
- Web dashboard automatically uses configured API token (no user prompt required)

## Server Application

### Integrated Node.js Server
**Location**: `/server` directory (part of this repository)
**Runtime Location**: `/data/server` (copied at container startup)
**Type**: TypeScript Node.js application
**Version**: 0.0.1

### Server Structure
```
server/
├── api/               # API route handlers
│   ├── dashboard/     # Dashboard routes
│   ├── devices/       # Device management
│   ├── files/         # File upload/download
│   └── firmware/      # Firmware management
├── db/                # Database schemas (Mongoose)
├── helper/            # Utility functions
├── public/            # Static assets
├── views/             # Pug templates
├── index.ts           # Main entry point
├── package.json       # Dependencies
└── tsconfig.json      # TypeScript config
```

### Server Dependencies
- **Express 4.18+**: Web framework
- **Mongoose 8.0+**: MongoDB ODM
- **Multer 2.0+**: File upload handling (multipart/form-data)
- **Pug 3.0+**: Template engine for server-side rendering
- **CORS 2.8+**: Cross-origin resource sharing (configured for HA ports 8123, 7123)
- **dotenv 16.3+**: Environment configuration

### Server Features
- ✅ Real-time image capture from ESP32 cameras
- ✅ Chunked binary image uploads (100MB limit)
- ✅ Server-side rendered dashboard using Pug templates
- ✅ **OTA Firmware Updates** with automatic version management
- ✅ **Firmware Version Rotation** (keeps current + previous versions only)
- ✅ Web-based firmware upload interface with automatic token handling
- ✅ RESTful API with token authentication
- ✅ Automatic directory creation for uploads and firmware
- ✅ API token passed securely to frontend from configuration

## External Dependencies

### MongoDB Binary
**Source**: https://github.com/themattman/mongodb-raspberrypi-binaries
**Version**: 7.0.2 (Raspberry Pi ARM64 unofficial build)
**Dependencies**: libssl1.1 (Debian package)

## Development

### Dev Container Setup
**Image**: `ghcr.io/home-assistant/devcontainer:2-addons`
**Extensions**: ShellCheck, Prettier
**Features**:
- Auto-formatting on save
- Zsh terminal
- Privileged mode for Docker operations

### Git Status
**Current Branch**: fix/version
**Working Directory**: Clean
**Recent Commits**:
- fix: version, branch
- fix: conflicts
- feat: ingress, dev container

## Changelog Highlights

### v0.4.1 (Current)
- Ingress support added
- Dev container configuration
- Version and branch fixes

### v0.3.0 (2024-01-07)
- Raspberry Pi 4 support
- Default port settings
- Build script fixes

### v0.2.x (2024-01-07)
- MongoDB logging improvements
- Custom port configuration
- Installation crash fixes

## Startup Sequence

1. **Directory Creation**: Persistent folders for MongoDB, server, uploads
2. **MongoDB Initialization**:
   - Start MongoDB without auth
   - Create admin user if not exists
   - Restart with authentication enabled
3. **Server Setup**:
   - Copy server files to `/data/server`
   - Generate `.env` file with configuration
4. **Nginx Launch**: Start reverse proxy
5. **Server Start**: Install dependencies, compile TypeScript, run server

## Known Considerations

### Platform-Specific
- Optimized exclusively for ARM64 (Raspberry Pi 4)
- Uses unofficial MongoDB builds for ARM architecture
- Requires specific SSL library version (libssl1.1)

### Repository Structure
- Server application code is now part of this repository (in `/server` directory)
- Server source is compiled during container startup
- Git ignores: node_modules, dist, .env, uploads in server directory

### Use Case
- Designed specifically for water meter image storage
- ESP32 camera integration
- Part of Home Assistant ecosystem

## API Endpoints

### Dashboard
- `GET /` - Main dashboard interface (Pug-rendered)
- `GET /api/dashboard/devices` - List all devices with image counts (HTML/JSON)
- `GET /api/dashboard/devices/:deviceID/images` - Get device images (HTML/JSON)
- `GET /api/dashboard/images/all` - Get all images (HTML/JSON)

### Devices
- `POST /api/devices/register` - Register a new ESP32 device (authenticated)

### Image Upload (Chunked)
- `POST /api/devices/:deviceID/attachment/start` - Initiate image upload (authenticated)
- `PUT /api/devices/:deviceID/attachment/append/:fileID` - Append image chunks (authenticated)
- `POST /api/devices/:deviceID/attachment/finish/:fileID` - Finalize upload (authenticated)
- `GET /api/devices/:deviceID/attachment/latest` - Retrieve latest image

### Firmware Management

**All firmware endpoints require authentication via X-Auth-Token header**

#### Upload Firmware (Authenticated)
```http
POST /api/devices/:deviceID/firmware/upload
Headers: X-Auth-Token: <token>
Content-Type: multipart/form-data

Body:
- version: string (required, e.g., "1.0.1")
- description: string (optional)
- firmware: file (required, .bin only, 10MB max)

Note: Web UI automatically uses token from configuration
```

#### Check for Updates (ESP32 OTA - Authenticated)
```http
GET /api/devices/:deviceID/firmware/latest
Headers: X-Auth-Token: <token>

Response:
{
  "version": "1.0.1",
  "url": "http://server.com/firmware/abc123.bin",
  "available": true
}
```

#### Get Previous Version (Rollback - Authenticated)
```http
GET /api/devices/:deviceID/firmware/current
Headers: X-Auth-Token: <token>

Response:
{
  "version": "1.0.0",
  "url": "http://server.com/firmware/def456.bin",
  "available": true
}
```

#### Other Firmware Endpoints
- `GET /api/devices/:deviceID/firmware` - List all firmware versions (authenticated)
- `DELETE /api/devices/:deviceID/firmware/:firmwareId` - Delete firmware (authenticated)
- `GET /firmware/:filename.bin` - Direct firmware file download (static, no auth)

## Database Collections

### Device Collection
```javascript
{
  name: String,           // Device name
  mac: String,            // MAC address
  ip: String,             // IP address
  deviceID: String,       // Unique device identifier
  serviceId: Number       // Service ID
}
```

### FileAttachment Collection (Images)
```javascript
{
  name: String,           // File name
  type: String,           // MIME type (e.g., image/jpeg)
  fileID: Number,         // Unique file ID
  deviceID: String,       // Associated device ID
  state: String,          // 'empty' | 'uploading' | 'ready'
  created: Date,          // Upload timestamp
  size: Number            // File size in bytes
}
```

### Firmware Collection
```javascript
{
  deviceID: String,       // Associated device ID
  version: String,        // Version string (e.g., "1.0.1")
  description: String,    // Optional description
  filename: String,       // Hashed filename (e.g., "abc123.bin")
  size: Number,           // File size in bytes
  uploaded: Date,         // Upload timestamp
  status: String          // 'current' | 'previous'
}
```

## Firmware Version Management

The server automatically manages firmware versions with rotation:

**Automatic Rotation Logic:**
1. **First Upload** → Saved as "current"
2. **Second Upload** → First becomes "previous", new becomes "current"
3. **Third Upload** → First is deleted, second becomes "previous", new becomes "current"

**Only 2 versions are kept at any time**: current (latest) + previous (for rollback)

Example workflow:
```
Upload v1.0.0 → current: v1.0.0, previous: none
Upload v1.0.1 → current: v1.0.1, previous: v1.0.0
Upload v1.0.2 → current: v1.0.2, previous: v1.0.1 (v1.0.0 deleted)
```

**ESP32 Integration Flow:**
1. ESP32 boots up with firmware v1.0.0
2. Periodically checks: `GET /api/devices/{id}/firmware/latest` (with `X-Auth-Token` header)
3. Compares returned version with current version
4. If newer version available, downloads from URL
5. Performs OTA update
6. If update fails, can rollback to: `GET /api/devices/{id}/firmware/current` (with `X-Auth-Token` header)

**Note:** ESP32 devices must include the API token in requests to firmware endpoints

## Testing with cURL

### Register Device
```bash
curl -X POST \
  -H "X-Auth-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{"deviceID":"ESP32_001","name":"Living Room Camera","mac":"AA:BB:CC:DD:EE:FF","ip":"192.168.1.100"}' \
  http://localhost:8085/api/devices/register
```

### Upload Firmware
```bash
curl -X POST \
  -H "X-Auth-Token: your_token" \
  -F "version=1.0.1" \
  -F "description=Bug fixes and improvements" \
  -F "firmware=@/path/to/firmware.bin" \
  http://localhost:8085/api/devices/ESP32_001/firmware/upload
```

### Check Latest Firmware
```bash
curl -H "X-Auth-Token: your_token" \
  http://localhost:8085/api/devices/ESP32_001/firmware/latest
```

### Get Previous Firmware (Rollback)
```bash
curl -H "X-Auth-Token: your_token" \
  http://localhost:8085/api/devices/ESP32_001/firmware/current
```

## Support & Documentation
- **Maintainer**: Kagasirabunjee <kagasirabunjee@yahoo.com>
- **Issue Tracking**: GitHub repository
- **License**: See LICENSE file (ISC)
- **Server Documentation**: See [server/README.md](server/README.md) and [server/context.md](server/context.md)
