import mongoose from 'mongoose';

//schema for authenticator devices
const authenticatorDeviceSchema = new mongoose.Schema({
  credentialID: { type: Buffer, required: true },
  credentialPublicKey: { type: Buffer, required: true }, 
  counter: { type: Number, required: true },
  transports: [{ type: String }],
  //deviceType: { type: String, required: true },
});

//schema for users
const userSchema = new mongoose.Schema({
  username: { type: String, unique: true, required: true },
  id: { type: String, required: true },
  authenticators: [authenticatorDeviceSchema],
});

//create a model for the user schema
const User = mongoose.model('users', userSchema);


//export the user model and the authenticator device schema
export {User, authenticatorDeviceSchema};
