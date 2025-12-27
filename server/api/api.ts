import { Application, Request, Response } from 'express';
import { devices } from './devices';
import { files } from './files';
import { dashboard } from './dashboard';
import { firmware } from './firmware';

const handleApiAuth = (req: Request, res: Response, next: any) => {
    const token = req.headers['x-auth-token'];
    if (token !== process.env.API_TOKEN) {
        return res.sendStatus(403);
    }
    next();
};

export const Api = () => { return {
    register: (app: Application) => {
        devices(app, handleApiAuth);
        files(app, handleApiAuth);
        firmware(app, handleApiAuth);
        dashboard(app);
    }
}};