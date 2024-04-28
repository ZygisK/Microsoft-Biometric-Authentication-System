// models/User.js
import mongoose from 'mongoose';

const authenticatorDeviceSchema = new mongoose.Schema({
  credentialID: { type: Buffer, required: true },
  credentialPublicKey: { type: Buffer, required: true },
  counter: { type: Number, required: true },
  transports: [{ type: String }],
});

const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  id: { type: String, required: true },
  authenticators: [authenticatorDeviceSchema],
});

const User = mongoose.model('users', userSchema);

export {User, authenticatorDeviceSchema};
