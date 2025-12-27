# ESP32 Camera Server - Development Context

## Project Overview
Node.js/Express server for managing ESP32 camera devices, designed as a Home Assistant add-on for water meter screening and monitoring.

**Tech Stack:**
- Node.js 18+
- TypeScript 5.3+
- Express.js
- MongoDB 6.3+ with Mongoose
- Pug templating engine
- Multer (file uploads)

## Recent Changes & Implementation Details

### 1. Template Engine Migration (Pug)
**Date:** Current Session
**Status:** ✅ Completed

Migrated from static HTML to Pug templating engine for server-side rendering.

**Key Files:**
- `index.ts` (lines 24-26): Configured Pug as view engine
- `views/index.pug`: Main dashboard template
- `views/partials/device-card.pug`: Device card component with firmware upload form
- `views/partials/image-card.pug`: Image card component
- `views/devices-grid.pug`: Server-rendered device list
- `views/all-images-grid.pug`: Server-rendered all images view
- `views/device-images-grid.pug`: Server-rendered device-specific images

**Benefits:**
- Server-side rendering instead of client-side HTML building
- Cleaner separation of concerns
- Reusable mixins for components
- Dynamic data injection through template variables

**Client-Side Updates:**
```javascript
// Old approach: Fetch JSON, build HTML with JavaScript
const response = await fetch('/api/dashboard/devices');
const devices = await response.json();
grid.innerHTML = devices.map(device => `<div>...</div>`).join('');

// New approach: Fetch pre-rendered HTML
const response = await fetch('/api/dashboard/devices', {
  headers: { 'Accept': 'text/html' }
});
const html = await response.text();
grid.innerHTML = html;
```

**API Changes:**
Dashboard routes now support content negotiation:
- `Accept: text/html` → Returns rendered Pug template
- `Accept: application/json` → Returns JSON (backward compatible)

---

### 2. Firmware Upload System
**Date:** Current Session
**Status:** ✅ Completed

Implemented comprehensive firmware management system for ESP32 devices with automatic version rotation.

#### Database Schema
**File:** `db/schemes.ts` (lines 26-39)

```javascript
const firmwareSchema = new mongoose.Schema({
    deviceID: String,
    version: String,          // e.g., "1.0.1"
    description: String,      // Optional description
    filename: String,         // Hashed filename (e.g., "abc123.bin")
    size: Number,             // File size in bytes
    uploaded: Date,           // Upload timestamp
    status: {
        type: String,
        enum: ['current', 'previous'],  // Version tracking
        default: 'current'
    }
});
```

#### API Endpoints

**Upload Firmware** (Authenticated)
```
POST /api/devices/:deviceID/firmware/upload
Headers: X-Auth-Token: <token>
Content-Type: multipart/form-data

Body:
- version: string (required, e.g., "1.0.1")
- description: string (optional)
- firmware: file (required, .bin only, 10MB max)

Response:
{
  "success": true,
  "firmware": {
    "id": "...",
    "version": "1.0.1",
    "description": "Bug fixes",
    "size": 1048576,
    "uploaded": "2025-12-27T..."
  }
}
```

**Check Latest Firmware** (ESP32 OTA updates)
```
GET /api/devices/:deviceID/firmware/latest

Response:
{
  "version": "1.0.1",
  "url": "http://server.com/firmware/abc123.bin",
  "available": true
}

// Or if no firmware:
{
  "version": null,
  "url": null,
  "available": false
}
```

**Get Current Firmware** (Previous version for rollback)
```
GET /api/devices/:deviceID/firmware/current

Response:
{
  "version": "1.0.0",
  "url": "http://server.com/firmware/def456.bin",
  "available": true
}
```

**List All Firmware**
```
GET /api/devices/:deviceID/firmware

Response: Array of firmware objects sorted by upload date
```

**Delete Firmware** (Authenticated)
```
DELETE /api/devices/:deviceID/firmware/:firmwareId
Headers: X-Auth-Token: <token>
```

#### Firmware Version Management

**Automatic Rotation Logic:**
The system maintains only 2 versions per device (current + previous).

```
Upload Timeline:
1. Upload v1.0.0 → current: v1.0.0, previous: none
2. Upload v1.0.1 → current: v1.0.1, previous: v1.0.0
3. Upload v1.0.2 → current: v1.0.2, previous: v1.0.1 (v1.0.0 deleted)
```

**Implementation:** `api/firmware/firmware.ts` (lines 65-87)
1. Find current firmware
2. Delete old previous firmware (file + DB record)
3. Demote current → previous
4. Save new upload → current

#### File Storage

**Directory:** `/firmware`
- Auto-created on server start (`index.ts` lines 70-74)
- Files stored with cryptographic hash names (security)
- Static serving enabled (`index.ts` line 56)

**File Access:**
- Direct URL: `http://server.com/firmware/{filename}.bin`
- ESP32 downloads from URLs returned by API

#### UI Components

**Device Card with Firmware Form**
**File:** `views/partials/device-card.pug` (lines 23-37)

Features:
- Version input (required, e.g., "1.0.0")
- Description input (optional)
- File upload (.bin files only)
- Upload button with status feedback
- Form submission without page reload

**Styling:** `public/style.css` (lines 395-519)
- Modern, clean form design
- Success/error status indicators (green/red)
- Disabled state during upload
- Responsive design for mobile

**Client-Side Upload Logic**
**File:** `views/index.pug` (lines 154-209)

```javascript
async function uploadFirmware(event, deviceID) {
  event.preventDefault();

  const formData = new FormData(form);
  const token = prompt('Please enter your API token:');

  const response = await fetch(`${baseUrl}/api/devices/${deviceID}/firmware/upload`, {
    method: 'POST',
    headers: { 'X-Auth-Token': token },
    body: formData
  });

  // Show success/error status
  // Auto-clear form after 3 seconds
}
```

#### Security

- **Authentication Required:** Upload and delete operations require API token
- **File Validation:**
  - Only `.bin` files accepted (multer filter)
  - 10MB size limit
  - File extension check
- **Device Validation:** Ensures device exists before accepting firmware
- **Automatic Cleanup:** Old firmware files are deleted when rotated out

#### ESP32 Integration Flow

```
1. ESP32 boots up with firmware v1.0.0
2. Periodically checks: GET /api/devices/{id}/firmware/latest
3. Compares returned version with current version
4. If newer version available, downloads from URL
5. Performs OTA update
6. If update fails, can rollback to: GET /api/devices/{id}/firmware/current
```

---

### 3. Image Upload System (Chunked)

**Endpoints:**
- `POST /api/devices/:deviceID/attachment/start` - Initiate upload
- `PUT /api/devices/:deviceID/attachment/append/:fileID` - Append chunks
- `POST /api/devices/:deviceID/attachment/finish/:fileID` - Finalize upload
- `GET /api/devices/:deviceID/attachment/latest` - Retrieve image

**Binary Data Handling:**
- Express configured with `express.raw({ limit: '100MB' })` for binary uploads
- `fs.appendFileSync()` handles Buffer objects correctly
- Supports chunked image uploads from ESP32 cameras

**File Storage:** `/uploads` directory

---

## Project Structure

```
esp-cam-server/
├── api/
│   ├── dashboard/
│   │   └── dashboard.ts      # Dashboard endpoints with HTML/JSON negotiation
│   ├── devices/
│   │   └── devices.ts        # Device registration
│   ├── files/
│   │   └── files.ts          # Chunked image upload endpoints
│   ├── firmware/
│   │   ├── firmware.ts       # Firmware management endpoints
│   │   └── index.ts
│   ├── api.ts                # API registration with auth middleware
│   └── index.ts
├── db/
│   └── schemes.ts            # Mongoose schemas (Device, FileAttachment, Firmware)
├── helper/
│   └── helper.ts             # Utility functions
├── public/
│   ├── style.css             # Complete styling including firmware forms
│   └── ...
├── views/
│   ├── partials/
│   │   ├── device-card.pug   # Device card with firmware upload form
│   │   └── image-card.pug    # Image card component
│   ├── devices-grid.pug      # Device list view
│   ├── all-images-grid.pug   # All images view
│   ├── device-images-grid.pug # Device-specific images
│   └── index.pug             # Main dashboard template
├── uploads/                  # Image storage
├── firmware/                 # Firmware binary storage
├── dist/                     # Compiled JavaScript
├── index.ts                  # Main server file
├── package.json
├── tsconfig.json
└── .env                      # Environment configuration
```

---

## Environment Variables

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

---

## Key Dependencies

```json
{
  "dependencies": {
    "cors": "^2.8.5",
    "dotenv": "^16.3.1",
    "express": "^4.18.2",
    "mongodb": "^6.3.0",
    "mongoose": "^8.0.3",
    "pug": "^3.0.3",
    "multer": "^1.4.5-lts.1"
  },
  "devDependencies": {
    "@types/cors": "^2.8.17",
    "@types/express": "^4.17.21",
    "@types/multer": "^1.4.11",
    "typescript": "^5.3.3"
  }
}
```

---

## Build & Run Commands

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start production server
npm start

# Development with auto-reload
npm run dev
```

---

## API Authentication

**Middleware:** `api/api.ts` (lines 7-12)

```javascript
const handleApiAuth = (req: Request, res: Response, next: any) => {
    const token = req.headers['x-auth-token'];
    if (token !== process.env.API_TOKEN) {
        return res.sendStatus(403);
    }
    next();
};
```

**Protected Endpoints:**
- Device registration
- File upload operations
- Firmware upload/delete

**Public Endpoints:**
- Dashboard views
- Firmware check (latest/current)
- Image retrieval

---

## CORS Configuration

**Allowed Origins:** Home Assistant ports 8123, 7123
**File:** `index.ts` (lines 28-42)

```javascript
app.use(cors({
    origin: function (origin, callback) {
        if (!origin) return callback(null, true);
        const url = new URL(origin);
        const allowedPorts = ['8123', '7123'];
        if (allowedPorts.includes(url.port)) {
            return callback(null, true);
        }
        return callback(null, false);
    },
    credentials: true
}));
```

---

## Database Collections

### Devices
```javascript
{
  name: String,
  mac: String,
  ip: String,
  deviceID: String,
  serviceId: Number
}
```

### FileAttachment (Images)
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

### Firmware
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

---

## Known Issues & Technical Debt

None currently identified. All features implemented and tested successfully.

---

## Future Enhancements (Potential)

1. **Firmware Rollback Endpoint:** Automatic rollback to previous version if ESP32 detects issues
2. **Firmware Changelog:** Display version history in UI
3. **Multi-file Firmware:** Support for firmware packages (e.g., bootloader + app)
4. **Scheduled OTA Updates:** Configure update times for devices
5. **Firmware Signing:** Cryptographic verification for firmware files
6. **Upload Progress Bar:** Real-time upload progress in UI
7. **Batch Firmware Updates:** Update multiple devices at once
8. **Firmware Download Statistics:** Track which devices downloaded which versions

---

## Testing Endpoints with cURL

### Upload Firmware
```bash
curl -X POST \
  -H "X-Auth-Token: your_token_here" \
  -F "version=1.0.1" \
  -F "description=Bug fixes and improvements" \
  -F "firmware=@/path/to/firmware.bin" \
  http://localhost:8000/api/devices/ESP32_001/firmware/upload
```

### Check Latest Firmware
```bash
curl http://localhost:8000/api/devices/ESP32_001/firmware/latest
```

### Get Previous Firmware
```bash
curl http://localhost:8000/api/devices/ESP32_001/firmware/current
```

### Register Device
```bash
curl -X POST \
  -H "X-Auth-Token: your_token_here" \
  -H "Content-Type: application/json" \
  -d '{"deviceID":"ESP32_001","name":"Living Room Camera","mac":"AA:BB:CC:DD:EE:FF","ip":"192.168.1.100"}' \
  http://localhost:8000/api/devices/register
```

---

## Documentation Last Updated
Date: 2025-12-27
Session: Template migration + Firmware upload system implementation

---

## Important Notes for Next Session

1. **Firmware URLs:** The `/firmware/latest` endpoint returns absolute URLs that ESP32 can download directly
2. **Version Format:** No specific version format enforced - use semantic versioning (e.g., "1.0.1")
3. **API Token:** Must be set in `.env` as `API_TOKEN` for authenticated endpoints
4. **Binary Uploads:** Images work correctly - `express.raw()` handles Buffer data for `fs.appendFileSync()`
5. **Pug Templates:** All dashboard views now use server-side rendering with Pug mixins
6. **Automatic Cleanup:** Old firmware versions are automatically deleted when new versions are uploaded

## Quick Reference - File Locations

- **Main Server:** `index.ts`
- **Firmware API:** `api/firmware/firmware.ts`
- **Firmware Schema:** `db/schemes.ts` (lines 26-39)
- **Device Card Template:** `views/partials/device-card.pug`
- **Firmware Upload JS:** `views/index.pug` (lines 154-209)
- **Firmware CSS:** `public/style.css` (lines 395-519)
- **API Registration:** `api/api.ts`
