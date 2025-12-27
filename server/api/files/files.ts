import { Application, Response, Request } from "express";
import fs from 'fs';
import crypro from 'crypto';
import { resolve } from 'path';

import { Device, FileAttachment } from '../../db/schemes';
import { makeid, uploadsDir, removeFile } from "../../helper";

export const files = (app: Application, authHandler: (req: Request, res: Response, next: any) => void) => {
    app.post('/api/devices/:deviceID/attachment/start', authHandler, async (req: Request, res: Response) => {
        const deviceID = req.params.deviceID;
        const foundDevice = await Device.findOne({ deviceID });
        if (!foundDevice) {
            console.log(`device ${deviceID} not found`);
            return res.sendStatus(404);
        }

        let extension = 'jpg';
        const type = req.headers['content-type'];
        switch (type) {
            case 'image/jpeg':
                extension = 'jpg';
                break;
            default:
                break;
        }
        const name = makeid(16) + (new Date().getTime()).toString();
        const imageName = crypro.createHash('sha256').update(name).digest('hex');
        const path = uploadsDir + '/'+ imageName + '.' + extension;
        const fd = fs.openSync(path, 'w');
        fs.closeSync(fd);
        console.log(`filename ${name} prepared`);
        
        const id = Math.floor(100000 + Math.random() * 900000);

        const image = await FileAttachment.create({
            created: new Date(), 
            deviceID, 
            name: imageName +'.'+ extension, 
            state: 'empty', 
            type, 
            fileID: id
        });
        if (!image) {
            console.log(`device ${deviceID} not found`);
            return res.sendStatus(401);
        }
        console.log(`file ${id} created`);

        return res.send({ fileID: id });
    });

    app.put('/api/devices/:deviceID/attachment/append/:fileID', authHandler, async (req: Request, res: Response) => {
        const deviceID = req.params.deviceID;
        const fileID = req.params.fileID;
        console.log('find device:', deviceID, 'file', fileID);
        const foundDevice = await Device.findOne({ deviceID });
        const attachment = await FileAttachment.findOneAndUpdate({ fileID }, { state: 'uploading' });
        if (!foundDevice || !attachment) {
            return res.sendStatus(404);
        }
        const contentLength = Number(req.headers['content-length']!);
        console.log('found device and attachment', attachment.name, contentLength);
        console.log('body', req.body);
        
        const filePath = uploadsDir + '/' + attachment.name!;
        try {
            fs.appendFileSync(filePath, req.body, { mode: '' });
            return res.sendStatus(200);
        } catch {
            console.error('Failed to append file data');
            await FileAttachment.deleteOne({ fileID });
            removeFile(attachment.name!);
            return res.sendStatus(401);
        }
    });

    app.post('/api/devices/:deviceID/attachment/finish/:fileID', authHandler, async (req: Request, res: Response) => {
        const deviceID = req.params.deviceID;
        const fileID = req.params.fileID;
        console.log('find device:', deviceID, 'file', fileID);
        const foundDevice = await Device.findOne({ deviceID });
        const attachment = await FileAttachment.findOneAndUpdate({ fileID }, { state: 'ready' });
        if (!foundDevice || !attachment) {
            return res.sendStatus(404);
        }
        
        return res.sendStatus(200);
    });

    app.get('/api/devices/:deviceID/attachment/latest', async (req: Request, res: Response) => {
        console.log('latest');
        const deviceID = req.params.deviceID;
        const fileID = req.query.fileID;
        const foundDevice = await Device.findOne({ deviceID });
        if (!foundDevice) {
            return res.sendStatus(404); 
        }

        let attachment;
        if (fileID) {
            attachment = await FileAttachment.findOne({ deviceID, fileID, state: 'ready' });
        } else {
            const attachments = await FileAttachment.find({ deviceID, state: 'ready' }).sort({ created: -1 }).limit(1);
            attachment = attachments[0];
        }

        if (attachment) {
            const filePath = uploadsDir + '/' + attachment.name!;
            if (fs.existsSync(filePath)) {
                const absolutePath = resolve(filePath);
                console.log(absolutePath);
                return res.sendFile(absolutePath);
            }
        }
        res.sendStatus(404);
    });

    app.get('/api/devices/attachment/cleanup', authHandler, async (req: Request, res: Response) => {
        removeEmptyAttachments();
        res.sendStatus(200);
    });

    const removeEmptyAttachments = async () => {
        const attachments = await FileAttachment.find({ state: 'empty' });
        for (const attachment of attachments) {
            removeFile(attachment.name!);
        }
        await FileAttachment.deleteMany({ state: 'empty' });
    };

    return {
        removeEmptyAttachments,
    };
};

