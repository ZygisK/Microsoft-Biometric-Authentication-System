"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.authenticatorDeviceSchema = exports.User = void 0;
const mongoose_1 = __importDefault(require("mongoose"));
//schema for authenticator devices
const authenticatorDeviceSchema = new mongoose_1.default.Schema({
    credentialID: { type: Buffer, required: true },
    credentialPublicKey: { type: Buffer, required: true },
    counter: { type: Number, required: true },
    transports: [{ type: String }],
    //deviceType: { type: String, required: true },
});
exports.authenticatorDeviceSchema = authenticatorDeviceSchema;
//schema for users
const userSchema = new mongoose_1.default.Schema({
    username: { type: String, unique: true, required: true },
    id: { type: String, required: true },
    authenticators: [authenticatorDeviceSchema],
});
//create a model for the user schema
const User = mongoose_1.default.model('users', userSchema);
exports.User = User;
