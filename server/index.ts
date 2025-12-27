import express, { Application, Request, Response } from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import mongoose from 'mongoose';
import fs from 'fs';
import path from 'path';

import { Api } from './api';

dotenv.config();

const dbLogin = process.env.DBLOGIN;
const dbPass = process.env.DBPASS;
const dbName = process.env.DBNAME;

const dbDomain = process.env.DBDOMAIN;
const dbPort = process.env.DBPORT;
const serverPort = Number(process.env.PORT) || 8000;

const setup = async () => {
    await mongoose.connect('mongodb://'+dbDomain+':'+dbPort, { user: dbLogin, pass: dbPass, dbName });
    const app: Application = express();

    // Set up Pug as the view engine
    app.set('view engine', 'pug');
    app.set('views', path.join(__dirname, '../views'));

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

    app.use(express.json());
    app.use(express.raw({ limit: '100MB' }));

    app.get('/', (req: Request, res: Response) => {
        const protocol = req.protocol;
        const host = req.get('host');
        const baseUrl = `${protocol}://${host}:${serverPort}`;

        res.render('index', { baseUrl });
    });

    app.use(express.static('public'));
    app.use('/firmware', express.static('firmware'));

    let apiEnd = Api();
    apiEnd.register(app);
    
    app.listen(serverPort, () => {
        console.log(`Server is Fire at http://localhost:${serverPort}`);

        // create upload dir if not exists
        const uploadDir = "./uploads";
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir);
        }

        // create firmware dir if not exists
        const firmwareDir = "./firmware";
        if (!fs.existsSync(firmwareDir)){
            fs.mkdirSync(firmwareDir);
        }
    });
};

setup();
