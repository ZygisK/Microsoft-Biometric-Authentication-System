"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const config = {
    rpName: 'Biometric FingerPrint Login',
    rpID: 'localhost',
    origin: 'http://localhost:3000',
    baseURL: process.env.NODE_ENV === 'production' ? 'https://mern-video.azurewebsites.net' : 'http://localhost:3000'
};
exports.default = config;
