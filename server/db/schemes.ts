import mongoose from 'mongoose';

const deviceSchema = new mongoose.Schema({
    name: String,
    mac: String,
    ip: String,
    deviceID: String,
    serviceId: Number,
});
export const Device = mongoose.model('Device', deviceSchema);

const fileSchema = new mongoose.Schema({
    name: String,
    type: String,
    fileID: Number,
    deviceID: String,
    state: {
        type: String,
        enum: ['empty', 'uploading', 'ready']
    },
    created: Date,
    size: Number,
});
export const FileAttachment = mongoose.model('FileAttachment', fileSchema);

const firmwareSchema = new mongoose.Schema({
    deviceID: String,
    version: String,
    description: String,
    filename: String,
    size: Number,
    uploaded: Date,
    status: {
        type: String,
        enum: ['current', 'previous'],
        default: 'current'
    }
});
export const Firmware = mongoose.model('Firmware', firmwareSchema);
