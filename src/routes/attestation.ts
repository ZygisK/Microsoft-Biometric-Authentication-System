import express, { Request, Response } from 'express';
import {
  VerifyRegistrationResponseOpts,
  generateRegistrationOptions,
  verifyRegistrationResponse
} from '@simplewebauthn/server';
import { AuthenticatorDevice, RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import crypto from 'crypto';
import config from './config';
//import database from './db';
import {User} from '../models/userSchema';

const router = express.Router();

const rpName = config.rpName;
const rpID = config.rpID;
const origin = config.origin;

router.post('/result', async (req: Request, res: Response) => {
  
  const body: RegistrationResponseJSON = req.body;
  console.log('Received body at /result', body);

  if (!req.session.currentChallenge) {
    res.json({
      status: 'failed',
      errorMessage: 'No challenge found in session.',
    });
    return;
  }

  if (!req.session.username) {
    return res.json({
      status: 'failed',
      errorMessage: 'Session username is undefined.'
    });
  }

  const expectedChallenge = req.session.currentChallenge;
  const username = req.session.username;
 
  const opts: VerifyRegistrationResponseOpts = {
    response: body,
    expectedChallenge: `${expectedChallenge}`,
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  };
 
  let verification;
  try {
    verification = await verifyRegistrationResponse(opts);
    console.log('Verification result', verification);
  } catch (error) {
    return res.json({
      status: 'failed',
      errorMessage: (error as Error).message,
    });
  }
 
  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    return res.json({
      status: 'failed',
      errorMessage: 'Cannot validate response signature.',
    });
  }

  // Convert Uint8Array to Buffer
  const credentialIDBuffer = Buffer.from(registrationInfo.credentialID);
  const credentialPublicKeyBuffer = Buffer.from(registrationInfo.credentialPublicKey);

  let user = await User.findOne({ username: username }).exec();

  if (!user) {
    // Create a new user if not found
    user = new User({
      username: username,
      id: crypto.randomBytes(16).toString('hex'), // Generate a unique user ID however you prefer
      authenticators: [] // start with an empty array of authenticators
    });
  }

  const existingAuthenticator = user.authenticators.find(authenticator =>
    authenticator.credentialID.equals(credentialIDBuffer) // Use Buffer.equals() to compare
  );

  if (!existingAuthenticator) {
    // If authenticator does not exist, add it to the user's authenticators
    const newAuthenticator: AuthenticatorDevice = {
      credentialID: credentialIDBuffer,
      credentialPublicKey: credentialPublicKeyBuffer,
      counter: registrationInfo.counter,
      transports: body.response.transports,
    };
    user.authenticators.push(newAuthenticator);
  }

  // Save the user (new or updated)
  await user.save();

  req.session.currentChallenge = undefined;
  res.json({
    status: 'ok',
    errorMessage: '',
  });
});

 ///////////////////////////////////////////////////////////////////////////
 router.post('/options', async (req: Request, res: Response) => {
  const username = req.body.username;

  //store to session
  req.session.username = username;

  //encode the username to include @ and . in the username
  const userIdBuffer = new TextEncoder().encode(username);

  const userIdString = Buffer.from(userIdBuffer).toString('base64');
 
  const options = await generateRegistrationOptions({
     rpName: rpName, // Include rpName here
     rpID: rpID, // Make sure to use rpID as required by the function
     userID: userIdString,
     userName: username,
     timeout: 60000,
     attestationType: 'direct',
     excludeCredentials: [], // You might want to fill this with previously registered credentials
     authenticatorSelection: {
       userVerification: 'preferred',
       requireResidentKey: false,
     },
  });

  console.log('Generated registration options', options);
 
  req.session.currentChallenge = options.challenge;
 
  res.json(options);
 });
 //////////////////////////////////////////////////////////////////////////

 

 

 
 
 

export default router;