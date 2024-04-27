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
  } catch (error) {
     res.json({
       status: 'failed',
       errorMessage: (error as Error).message,
     });
     return;
  }
 
  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
     res.json({
       status: 'failed',
       errorMessage: 'Cannot validate response signature.',
     });
     return;
  }
 
  const { credentialPublicKey, credentialID, counter } = registrationInfo;
  const user = await User.findOne({ username: username });
 
  // Check if user is null before proceeding
  if (!user) {
     res.json({
       status: 'failed',
       errorMessage: 'User not found.',
     });
     return;
  }
 
  const existingAuthenticator = user.authenticators.find(authenticator =>
     isoUint8Array.areEqual(authenticator.credentialID, credentialID)
  );
 
  if (!existingAuthenticator) {
     const newDevice: AuthenticatorDevice = {
       credentialID,
       credentialPublicKey,
       counter,
       transports: body.response.transports,
     };
     user.authenticators.push(newDevice);
     await user.save();
  }
 
  req.session.currentChallenge = undefined;
  const result = {
     status: 'ok',
     errorMessage: '',
  };
  res.json(result);
 });

 ///////////////////////////////////////////////////////////////////////////
 router.post('/options', async (req: Request, res: Response) => {
  const username = req.body.username;
 
  const options = await generateRegistrationOptions({
     rpName: rpName, // Include rpName here
     rpID: rpID, // Make sure to use rpID as required by the function
     userID: username,
     userName: username,
     timeout: 60000,
     attestationType: 'direct',
     excludeCredentials: [], // You might want to fill this with previously registered credentials
     authenticatorSelection: {
       userVerification: 'preferred',
       requireResidentKey: false,
     },
  });
 
  req.session.currentChallenge = options.challenge;
 
  res.json(options);
 });
 //////////////////////////////////////////////////////////////////////////

 

 

 
 
 

export default router;