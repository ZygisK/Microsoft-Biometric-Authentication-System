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
  //
  console.log('Received body at /result', body);
  //
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

  //
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
     //
     console.log('Verification result', verification);
     //
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
 
  console.log('Looking for user with username aka (email)):', username);
  //const user = await User.findOne({ username: username });
  const user = await User.findOne({ username: req.session.username }).exec();

  console.log('Query sent to database: ', User.findOne({ username: req.session.username }).getQuery());
  console.log('User found:', user);
  
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