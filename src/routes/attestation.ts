import express, { Request, Response } from 'express';
import { VerifyRegistrationResponseOpts, generateRegistrationOptions, verifyRegistrationResponse } from '@simplewebauthn/server';
import { AuthenticatorDevice, RegistrationResponseJSON } from '@simplewebauthn/typescript-types';
import { isoUint8Array } from '@simplewebauthn/server/helpers';
import crypto from 'crypto';
import config from './config';
import {User} from '../models/userSchema';

const router = express.Router();

const rpName = config.rpName;
const rpID = config.rpID;
const origin = config.origin;

//POST request to /result, which verifies the registration response
router.post('/result', async (req: Request, res: Response) => {
  
  const body: RegistrationResponseJSON = req.body;
  console.log('Received body at /result', body); //checking if we get the body

  //check if there is a current challenge in the session, a challenge is a unique string that is generated for each registration almost like a password
  if (!req.session.currentChallenge) {
    res.json({
      status: 'failed',
      errorMessage: 'No challenge found in session.',
    });
    return;
  }

  //check if there is a username in the session, which is our email
  if (!req.session.username) {
    return res.json({
      status: 'failed',
      errorMessage: 'Session username is undefined.'
    });
  }

  const expectedChallenge = req.session.currentChallenge; //get the current challenge from the session
  const username = req.session.username; //get the username from the session
  
  //verify the registration response
  const opts: VerifyRegistrationResponseOpts = {
    response: body,
    expectedChallenge: `${expectedChallenge}`, //set the expected challenge to the current challenge
    expectedOrigin: origin,
    expectedRPID: rpID,
    requireUserVerification: false,
  };
  

  let verification;
  try {
    verification = await verifyRegistrationResponse(opts); //verify the registration response with the opts we just made
    console.log('Verification result', verification); //debugging line to check the verification result
  } catch (error) {
    return res.json({
      status: 'failed',
      errorMessage: (error as Error).message,
    });
  }
  
  //if the verification is not successful, return an error message
  const { verified, registrationInfo } = verification;
  if (!verified || !registrationInfo) {
    return res.json({
      status: 'failed',
      errorMessage: 'Cannot validate response signature.',
    });
  }

  //convert Uint8Array to Buffer. This is because the credentialID and credentialPublicKey are stored as Buffers in the database
  const credentialIDBuffer = Buffer.from(registrationInfo.credentialID); //Buffer.from() is a Node.js function that converts a Uint8Array to a Buffer
  const credentialPublicKeyBuffer = Buffer.from(registrationInfo.credentialPublicKey);

  //find the user in the database.
  let user = await User.findOne({ username: username }).exec();
  
  if (!user) {
    //create a new user if not found with our schema
    user = new User({
      username: username,
      id: crypto.randomBytes(16).toString('hex'), //generate a unique user ID, we did it cryptographically
      authenticators: [] //we start with an empty array of authenticators
    });
  }

  //check if the authenticator already exists in the user's authenticators
  const existingAuthenticator = user.authenticators.find(authenticator =>
    authenticator.credentialID.equals(credentialIDBuffer) //use Buffer.equals() to compare
  );

  if (!existingAuthenticator) {
    //if authenticator does not exist, add it to the user's authenticators
    const newAuthenticator: AuthenticatorDevice = {
      credentialID: credentialIDBuffer,
      credentialPublicKey: credentialPublicKeyBuffer,
      counter: registrationInfo.counter,
      transports: body.response.transports,
    };
    user.authenticators.push(newAuthenticator);
  }

  //save the user to the database
  await user.save();

  req.session.currentChallenge = undefined;
  res.json({
    status: 'ok',
    errorMessage: '',
  });
});

//POST request to /options, which generates registration options
 router.post('/options', async (req: Request, res: Response) => {
  const username = req.body.username;

  //store to session
  req.session.username = username;

  //encode the username to include @ and . in the username
  const userIdBuffer = new TextEncoder().encode(username);

  const userIdString = Buffer.from(userIdBuffer).toString('base64');
 
  const options = await generateRegistrationOptions({
     rpName: rpName,
     rpID: rpID,
     userID: userIdString,
     userName: username,
     timeout: 60000,
     attestationType: 'direct',
     excludeCredentials: [],
     authenticatorSelection: {
       userVerification: 'preferred',
       requireResidentKey: false,
     },
  });

  //checking the newly generated options
  console.log('Generated registration options', options);
 
  req.session.currentChallenge = options.challenge;
 
  res.json(options);
 });

export default router;