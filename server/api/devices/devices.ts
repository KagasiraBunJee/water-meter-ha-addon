import { Application, Response, Request } from "express";

import { Device } from '../../db/schemes';

interface DeviceBody {
    name: string;
    mac: string;
    ip: string;
    deviceID: string;
}

interface DeviceResponse {
    body: {
        id: number;
    };
}

export const devices = (app: Application, authHandler: (req: Request, res: Response, next: any) => void) => {
    app.post('/api/devices/register', authHandler, async(req: Request<any, any, DeviceBody>, res: Response<DeviceResponse>) => {
        const { deviceID, ip, mac, name } = req.body;
        const foundDevice = await Device.findOne({ deviceID });
        if (foundDevice && foundDevice.serviceId) {
            return res.send({ body: { id: foundDevice.serviceId } });
        }

        const id = Math.floor(100000 + Math.random() * 900000);
        const device = await Device.create({ ...req.body, serviceId: id });
        if (!device) {
            res.sendStatus(401)
        }
        return res.send({ body: { id } });
    });
};

