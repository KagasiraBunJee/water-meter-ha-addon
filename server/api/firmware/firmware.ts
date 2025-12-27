import { Application, Response, Request } from "express";
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import multer from 'multer';

import { Device, Firmware } from '../../db/schemes';

const firmwareDir = './firmware';

// Create firmware directory if it doesn't exist
if (!fs.existsSync(firmwareDir)) {
    fs.mkdirSync(firmwareDir, { recursive: true });
}

// Configure multer for file upload
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, firmwareDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = crypto.randomBytes(16).toString('hex');
        cb(null, `${uniqueName}.bin`);
    }
});

const upload = multer({
    storage,
    fileFilter: (req, file, cb) => {
        if (path.extname(file.originalname).toLowerCase() === '.bin') {
            cb(null, true);
        } else {
            cb(new Error('Only .bin files are allowed'));
        }
    },
    limits: {
        fileSize: 10 * 1024 * 1024 // 10MB limit
    }
});

export const firmware = (app: Application, authHandler: (req: Request, res: Response, next: any) => void) => {
    // Upload firmware for a device
    app.post('/api/devices/:deviceID/firmware/upload', authHandler, upload.single('firmware'), async (req: Request, res: Response) => {
        try {
            const deviceID = req.params.deviceID;
            const { version, description } = req.body;

            if (!req.file) {
                return res.status(400).json({ error: 'No file uploaded' });
            }

            if (!version) {
                // Clean up uploaded file
                fs.unlinkSync(req.file.path);
                return res.status(400).json({ error: 'Version is required' });
            }

            // Check if device exists
            const device = await Device.findOne({ deviceID });
            if (!device) {
                fs.unlinkSync(req.file.path);
                return res.status(404).json({ error: 'Device not found' });
            }

            // Find current firmware (if exists)
            const currentFirmware = await Firmware.findOne({ deviceID, status: 'current' });

            // If there's a current firmware, demote it to previous
            if (currentFirmware) {
                // Find and delete old previous firmware
                const previousFirmware = await Firmware.findOne({ deviceID, status: 'previous' });
                if (previousFirmware) {
                    // Delete old previous firmware file
                    const oldFilePath = path.join(firmwareDir, previousFirmware.filename!);
                    if (fs.existsSync(oldFilePath)) {
                        fs.unlinkSync(oldFilePath);
                    }
                    // Delete old previous firmware record
                    await Firmware.deleteOne({ _id: previousFirmware._id });
                }

                // Demote current to previous
                await Firmware.updateOne(
                    { _id: currentFirmware._id },
                    { status: 'previous' }
                );
            }

            // Create new firmware record as current
            const firmwareRecord = await Firmware.create({
                deviceID,
                version,
                description: description || '',
                filename: req.file.filename,
                size: req.file.size,
                uploaded: new Date(),
                status: 'current'
            });

            res.json({
                success: true,
                firmware: {
                    id: firmwareRecord._id,
                    version: firmwareRecord.version,
                    description: firmwareRecord.description,
                    size: firmwareRecord.size,
                    uploaded: firmwareRecord.uploaded
                }
            });
        } catch (error: any) {
            console.error('Firmware upload error:', error);
            res.status(500).json({ error: error.message || 'Failed to upload firmware' });
        }
    });

    // Get latest firmware for a device (ESP32 checks for updates)
    app.get('/api/devices/:deviceID/firmware/latest', authHandler, async (req: Request, res: Response) => {
        try {
            const deviceID = req.params.deviceID;
            const currentFirmware = await Firmware.findOne({ deviceID, status: 'current' });

            if (!currentFirmware) {
                return res.json({
                    version: null,
                    url: null,
                    available: false
                });
            }

            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = `${protocol}://${host}`;
            const firmwareUrl = `${baseUrl}/firmware/${currentFirmware.filename}`;

            res.json({
                version: currentFirmware.version,
                url: firmwareUrl,
                available: true
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch latest firmware' });
        }
    });

    // Get current firmware info (previous version for rollback)
    app.get('/api/devices/:deviceID/firmware/current', authHandler, async (req: Request, res: Response) => {
        try {
            const deviceID = req.params.deviceID;
            const previousFirmware = await Firmware.findOne({ deviceID, status: 'previous' });

            if (!previousFirmware) {
                return res.json({
                    version: null,
                    url: null,
                    available: false
                });
            }

            const protocol = req.protocol;
            const host = req.get('host');
            const baseUrl = `${protocol}://${host}`;
            const firmwareUrl = `${baseUrl}/firmware/${previousFirmware.filename}`;

            res.json({
                version: previousFirmware.version,
                url: firmwareUrl,
                available: true
            });
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch current firmware' });
        }
    });

    // Get firmware list for a device
    app.get('/api/devices/:deviceID/firmware', authHandler, async (req: Request, res: Response) => {
        try {
            const deviceID = req.params.deviceID;
            const firmwares = await Firmware.find({ deviceID }).sort({ uploaded: -1 });

            res.json(firmwares);
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch firmware list' });
        }
    });

    // Delete firmware
    app.delete('/api/devices/:deviceID/firmware/:firmwareId', authHandler, async (req: Request, res: Response) => {
        try {
            const { deviceID, firmwareId } = req.params;

            const firmwareRecord = await Firmware.findOne({ _id: firmwareId, deviceID });
            if (!firmwareRecord) {
                return res.status(404).json({ error: 'Firmware not found' });
            }

            // Delete file from disk
            const filePath = path.join(firmwareDir, firmwareRecord.filename!);
            if (fs.existsSync(filePath)) {
                fs.unlinkSync(filePath);
            }

            // Delete from database
            await Firmware.deleteOne({ _id: firmwareId });

            res.json({ success: true });
        } catch (error) {
            res.status(500).json({ error: 'Failed to delete firmware' });
        }
    });
};
