import { Application, Response, Request } from "express";
import { Device, FileAttachment } from '../../db/schemes';

export const dashboard = (app: Application) => {
    app.get('/api/dashboard/devices', async (req: Request, res: Response) => {
        try {
            const devices = await Device.find({});
            const devicesWithCounts = await Promise.all(
                devices.map(async (device) => {
                    const imageCount = await FileAttachment.countDocuments({
                        deviceID: device.deviceID,
                        state: 'ready'
                    });
                    const latestImage = await FileAttachment.findOne({
                        deviceID: device.deviceID,
                        state: 'ready'
                    }).sort({ created: -1 });

                    return {
                        deviceID: device.deviceID,
                        name: device.name,
                        ip: device.ip,
                        mac: device.mac,
                        imageCount,
                        latestImage: latestImage?.created
                    };
                })
            );

            // Check if request wants HTML or JSON
            if (req.headers.accept?.includes('text/html')) {
                res.render('devices-grid', { devices: devicesWithCounts });
            } else {
                res.json(devicesWithCounts);
            }
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch devices' });
        }
    });

    app.get('/api/dashboard/devices/:deviceID/images', async (req: Request, res: Response) => {
        try {
            const deviceID = req.params.deviceID;
            const images = await FileAttachment.find({
                deviceID,
                state: 'ready'
            }).sort({ created: -1 });

            const imagesWithUrls = images.map(img => ({
                fileID: img.fileID,
                name: img.name,
                created: img.created,
                type: img.type,
                deviceID: img.deviceID,
                url: `/api/devices/${deviceID}/attachment/latest?fileID=${img.fileID}`
            }));

            // Check if request wants HTML or JSON
            if (req.headers.accept?.includes('text/html')) {
                const protocol = req.protocol;
                const host = req.get('host');
                const baseUrl = `${protocol}://${host}`;
                res.render('device-images-grid', { images: imagesWithUrls, baseUrl });
            } else {
                res.json(imagesWithUrls);
            }
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch device images' });
        }
    });

    app.get('/api/dashboard/images/all', async (req: Request, res: Response) => {
        try {
            const images = await FileAttachment.find({ state: 'ready' })
                .sort({ created: -1 });

            const imagesWithUrls = images.map(img => ({
                fileID: img.fileID,
                name: img.name,
                created: img.created,
                type: img.type,
                deviceID: img.deviceID,
                url: `/api/devices/${img.deviceID}/attachment/latest?fileID=${img.fileID}`
            }));

            // Check if request wants HTML or JSON
            if (req.headers.accept?.includes('text/html')) {
                const protocol = req.protocol;
                const host = req.get('host');
                const baseUrl = `${protocol}://${host}`;
                res.render('all-images-grid', { images: imagesWithUrls, baseUrl });
            } else {
                res.json(imagesWithUrls);
            }
        } catch (error) {
            res.status(500).json({ error: 'Failed to fetch all images' });
        }
    });
};