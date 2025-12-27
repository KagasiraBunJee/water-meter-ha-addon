# ESP32 Camera Server - Home Assistant Add-on

[![License: ISC](https://img.shields.io/badge/License-ISC-blue.svg)](https://opensource.org/licenses/ISC)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.3+-blue.svg)](https://www.typescriptlang.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-6.3+-green.svg)](https://www.mongodb.com/)

A robust Node.js server for receiving, processing, and managing images from ESP32 cameras with OTA firmware updates, specifically designed as a Home Assistant add-on for water meter screening and monitoring.

## 🏠 Overview

This server application provides a comprehensive solution for ESP32 camera integration with Home Assistant, offering:

- **Image Reception**: Accepts and stores images from ESP32 camera modules via chunked uploads
- **Dashboard Interface**: Pug-powered server-side rendered dashboard for viewing and managing captured images
- **MongoDB Storage**: Persistent data storage using Mongoose ODM
- **Device Management**: Track and manage multiple ESP32 camera devices
- **File Management**: Organized file storage and retrieval system
- **Firmware Updates**: Over-the-Air (OTA) firmware management with automatic version rotation
- **CORS Security**: Configured for Home Assistant integration (ports 8123, 7123)

## 🚀 Features

- ✅ Real-time image capture from ESP32 cameras
- ✅ Chunked binary image uploads (100MB limit)
- ✅ MongoDB database integration with Mongoose
- ✅ RESTful API endpoints for device and file management
- ✅ Server-side rendered dashboard using Pug templates
- ✅ **OTA Firmware Updates** with automatic version management
- ✅ **Firmware Version Rotation** (keeps current + previous versions)
- ✅ Web-based firmware upload interface
- ✅ TypeScript support for enhanced development
- ✅ Secure CORS configuration for Home Assistant
- ✅ Automatic directory creation for uploads and firmware
- ✅ Environment-based configuration
- ✅ API token authentication for protected endpoints

## 📋 Prerequisites

Before installing this add-on, ensure you have:

- Home Assistant OS or Supervised installation
- MongoDB instance (local or remote)
- ESP32 camera module configured to send images
- Node.js 18+ (handled by the add-on)

## 🛠️ Installation

### As a Home Assistant Add-on

1. Add this repository to your Home Assistant add-on store
2. Install the "ESP32 Camera Server" add-on
3. Configure the add-on with your MongoDB credentials
4. Start the add-on

### Manual Installation

```bash
# Clone the repository
git clone <repository-url>
cd esp-cam-server

# Install dependencies
npm install

# Build the TypeScript code
npm run build

# Start the server
npm start
```

## ⚙️ Configuration

Create a `.env` file in the root directory with the following variables:

```env
# MongoDB Configuration
DBLOGIN=your_mongodb_username
DBPASS=your_mongodb_password
DBNAME=esp_cam_db
DBDOMAIN=localhost
DBPORT=27017

# Server Configuration
PORT=8000

# API Authentication
API_TOKEN=your_secret_token_here
```

### Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `DBLOGIN` | MongoDB username | Required |
| `DBPASS` | MongoDB password | Required |
| `DBNAME` | MongoDB database name | Required |
| `DBDOMAIN` | MongoDB host/domain | localhost |
| `DBPORT` | MongoDB port | 27017 |
| `PORT` | Server port | 8000 |
| `API_TOKEN` | Authentication token for protected endpoints | Required |

## 🔧 API Endpoints

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

#### Upload Firmware (Authenticated)
```http
POST /api/devices/:deviceID/firmware/upload
Headers: X-Auth-Token: <token>
Content-Type: multipart/form-data

Body:
- version: string (required, e.g., "1.0.1")
- description: string (optional)
- firmware: file (required, .bin only, 10MB max)
```

#### Check for Updates (ESP32)
```http
GET /api/devices/:deviceID/firmware/latest

Response:
{
  "version": "1.0.1",
  "url": "http://server.com/firmware/abc123.bin",
  "available": true
}
```

#### Get Previous Version (Rollback)
```http
GET /api/devices/:deviceID/firmware/current

Response:
{
  "version": "1.0.0",
  "url": "http://server.com/firmware/def456.bin",
  "available": true
}
```

#### Other Firmware Endpoints
- `GET /api/devices/:deviceID/firmware` - List all firmware versions
- `DELETE /api/devices/:deviceID/firmware/:firmwareId` - Delete firmware (authenticated)
- `GET /firmware/:filename.bin` - Direct firmware file download (static)

## 📱 Usage

### ESP32 Configuration

#### Image Upload
Configure your ESP32 camera to use chunked upload:

```cpp
// 1. Start upload
POST http://your-server:8000/api/devices/{deviceID}/attachment/start
Headers: X-Auth-Token: <token>, Content-Type: image/jpeg

// 2. Append chunks (multiple times)
PUT http://your-server:8000/api/devices/{deviceID}/attachment/append/{fileID}
Headers: X-Auth-Token: <token>
Body: <binary chunk>

// 3. Finish upload
POST http://your-server:8000/api/devices/{deviceID}/attachment/finish/{fileID}
Headers: X-Auth-Token: <token>
```

#### OTA Firmware Updates
Configure your ESP32 to check for updates:

```cpp
// Check for latest firmware
GET http://your-server:8000/api/devices/{deviceID}/firmware/latest

// If available, download from the URL in response
// Perform OTA update

// On failure, rollback to previous version:
GET http://your-server:8000/api/devices/{deviceID}/firmware/current
```

### Dashboard Access

Access the web dashboard at:
```
http://your-home-assistant-ip:8000
```

**Features:**
- View all registered devices with image counts
- Browse images by device or view all images
- **Upload firmware** directly from the web interface
- Click device cards to view device-specific images
- Refresh button for real-time updates

### Home Assistant Integration

The server is configured to accept requests from Home Assistant on ports 8123 and 7123. Add camera entities or automations that utilize the stored images.

## 🔄 Firmware Version Management

The server automatically manages firmware versions:

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

## 🏗️ Development

### Available Scripts

```bash
# Development with auto-reload
npm run dev

# Build TypeScript
npm run build

# Start production server
npm start
```

### Project Structure

```
esp-cam-server/
├── api/                      # API route handlers
│   ├── dashboard/            # Dashboard endpoints (HTML/JSON)
│   ├── devices/              # Device registration
│   ├── files/                # Chunked image upload
│   ├── firmware/             # Firmware management
│   ├── api.ts                # API registration with auth
│   └── index.ts              # API exports
├── db/
│   └── schemes.ts            # MongoDB schemas (Device, FileAttachment, Firmware)
├── helper/                   # Utility functions
├── public/
│   └── style.css             # Complete CSS with firmware form styling
├── views/                    # Pug templates
│   ├── partials/
│   │   ├── device-card.pug   # Device card with firmware upload form
│   │   └── image-card.pug    # Image card component
│   ├── devices-grid.pug      # Server-rendered device list
│   ├── all-images-grid.pug   # Server-rendered all images
│   ├── device-images-grid.pug # Server-rendered device images
│   └── index.pug             # Main dashboard
├── uploads/                  # Image storage directory
├── firmware/                 # Firmware binary storage
├── dist/                     # Compiled JavaScript
├── index.ts                  # Main server file
├── package.json
├── context.md                # Development context documentation
└── README.md
```

### Technology Stack

- **Backend**: Express.js with TypeScript
- **Database**: MongoDB with Mongoose ODM
- **Templates**: Pug (server-side rendering)
- **File Uploads**: Multer (multipart/form-data)
- **Binary Uploads**: Express raw body parser
- **Authentication**: Token-based (X-Auth-Token header)

### Database Schema

The application uses MongoDB with Mongoose for data persistence:

**Device Collection:**
```javascript
{
  name: String,
  mac: String,
  ip: String,
  deviceID: String,
  serviceId: Number
}
```

**FileAttachment Collection (Images):**
```javascript
{
  name: String,
  type: String,
  fileID: Number,
  deviceID: String,
  state: 'empty' | 'uploading' | 'ready',
  created: Date,
  size: Number
}
```

**Firmware Collection:**
```javascript
{
  deviceID: String,
  version: String,
  description: String,
  filename: String,
  size: Number,
  uploaded: Date,
  status: 'current' | 'previous'
}
```

## 🔒 Security

- CORS configured to only allow requests from Home Assistant ports (8123, 7123)
- File uploads limited to 100MB
- Firmware uploads limited to 10MB (.bin files only)
- API token authentication for protected endpoints
- Environment variables for sensitive configuration
- Input validation on all API endpoints
- Automatic cleanup of old firmware versions

## 🧪 Testing with cURL

### Register a Device
```bash
curl -X POST \
  -H "X-Auth-Token: your_token" \
  -H "Content-Type: application/json" \
  -d '{"deviceID":"ESP32_001","name":"Living Room Camera","mac":"AA:BB:CC:DD:EE:FF","ip":"192.168.1.100"}' \
  http://localhost:8000/api/devices/register
```

### Upload Firmware
```bash
curl -X POST \
  -H "X-Auth-Token: your_token" \
  -F "version=1.0.1" \
  -F "description=Bug fixes" \
  -F "firmware=@/path/to/firmware.bin" \
  http://localhost:8000/api/devices/ESP32_001/firmware/upload
```

### Check Latest Firmware
```bash
curl http://localhost:8000/api/devices/ESP32_001/firmware/latest
```

## 🐛 Troubleshooting

### Common Issues

1. **Connection refused to MongoDB**
   - Verify MongoDB is running
   - Check database credentials in `.env`
   - Ensure network connectivity

2. **Images not uploading**
   - Verify ESP32 is sending to correct endpoints (chunked upload flow)
   - Check server logs for errors
   - Ensure upload directory has write permissions
   - Verify API token is correct

3. **Firmware upload fails**
   - Ensure file is .bin format
   - Check file size is under 10MB
   - Verify API token in X-Auth-Token header
   - Check firmware directory write permissions

4. **CORS errors**
   - Confirm Home Assistant is running on ports 8123 or 7123
   - Check browser console for specific CORS messages

### Logs

Server logs are available in the Home Assistant add-on logs or via console when running manually.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/new-feature`)
3. Commit your changes (`git commit -am 'Add new feature'`)
4. Push to the branch (`git push origin feature/new-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the ISC License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Home Assistant community for integration patterns
- ESP32 camera module developers
- MongoDB team for excellent documentation
- TypeScript community for type definitions
- Pug template engine maintainers

## 📞 Support

- Create an issue for bug reports
- Check existing issues for solutions
- Contribute to documentation improvements
- See [context.md](context.md) for detailed development context

---

**Note**: This add-on is specifically designed for water meter screening but can be adapted for other ESP32 camera monitoring applications with OTA firmware update capabilities.
