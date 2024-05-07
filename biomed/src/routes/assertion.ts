import express, { Request, Response } from 'express';
import { generateAuthenticationOptions, verifyAuthenticationResponse,} from '@simplewebauthn/server';
import type { GenerateAuthenticationOptionsOpts, VerifiedAuthenticationResponse, VerifyAuthenticationResponseOpts,} from '@simplewebauthn/server';
import config from './config';
import { AuthenticationResponseJSON } from '@simplewebauthn/server/script/deps';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import {User} from '../models/userSchema';
import { set } from 'mongoose';

//express module to create a new router
const router = express.Router();

const rpID = config.rpID;
const origin = config.origin;

//POST request to /options, which generates authentication options
router.post('/options', async (req: Request, res: Response) => {

  //looks for a user with the username provided in the request body
  const user = await User.findOne({ username: req.body.username });

  //const usertest = await User.findOne({ username: "ZygiTestExample@yahoo.com" });
  //console.log('User found:', usertest);


  //if the user does not exist or the user does not have any authenticators, return an error message.
  //authenticators is an array of authenticators that the user has registered, such as fingerprint, macbook fingerprint, etc.
  if (!user || !Array.isArray(user.authenticators)) {
    res.json({
      status: 'failed',
      errorMessage: `User ${req.body.username} does not exist`,
    });
    return;
  }

  //generate authentication options
  const opts: GenerateAuthenticationOptionsOpts = {
    timeout: 60000,
    allowCredentials: user.authenticators.map(authenticator => ({
      id: new Uint8Array(authenticator.credentialID),
      type: 'public-key',
    })),
    userVerification: 'discouraged',
    rpID,
  };

  console.log('Generating authentication options with:-------------------------------->', opts);
  const credentialGetOptions = await generateAuthenticationOptions(opts);
  const successRes = {
    status: 'ok',
    errorMessage: '',
  };

  //options is a combination of successRes and credentialGetOptions
  const options = Object.assign(successRes, credentialGetOptions);

  //checking newly generated options
  console.log('Generated authentication options', options);

  req.session.username = user.username;
  req.session.currentChallenge = options.challenge;
  res.json(options) //returning the options to the client
});

//POST request to /result, which verifies the authentication response
router.post('/result', async (req: Request, res: Response) => {

  if(req.session.isLoggedIn){
    return res.json({
      status: 'failed',
      errorMessage: 'User is already logged in.',
    });
  }

  //const body: AuthenticationResponseJSON = req.body;
  const username = req.session.username;
  const user = await User.findOne({ username: username });

  //if (!body || !body.rawId) {
    if(!user){
    return res.status(400).json({
      status: 'failed',
      errorMessage: '',
    });
  }

  const expectedChallenge = req.session.currentChallenge;
  const body: AuthenticationResponseJSON = req.body;
  //const username = `${req.session.username}`;
  //const user = database[username];

  if(!body.rawId){
    return res.json({
      status: 'failed',
      errorMessage: 'Invalid credentials provided.',
    });
  }


  //dbAuthenticator will be the authenticator that the user has registered
  let dbAuthenticator;
  const bodyCredIDBuffer = isoBase64URL.toBuffer(req.body.rawId); //convert string to Uint8Array, we do this because the credentialID is stored as a Uint8Array in the database
  for (const authenticator of user.authenticators) { //iterate through the authenticators that the user has registered
    if (isoUint8Array.areEqual(authenticator.credentialID, bodyCredIDBuffer)) { //if the credentialID of the authenticator matches the credentialID of the response
      dbAuthenticator = authenticator; //set dbAuthenticator to the authenticator
      break;
    }
 }

  //chekcing if the authenticator is registered with the site
  if (!dbAuthenticator) {
    return res.json({
      status: 'failed',
      errorMessage: 'Fingerprint not recognized. Please try again or register your fingerprint.',
    });
  }

  //enum for the transport types, this is used to convert the transport types from the database to the transport types used by the library
  enum AuthenticatorTransportFuture {
    USB = 'usb', 
    BLE = 'ble',
    NFC = 'nfc',
    HYBRID = 'hybrid',
    INTERNAL = 'internal',
  }
  
  if (dbAuthenticator) {
    dbAuthenticator = {
      ...dbAuthenticator,
      //credentialPublicKey: isoBase64URL.toBuffer(dbAuthenticator.credentialPublicKey), // Convert string to Uint8Array
      credentialPublicKey: dbAuthenticator.credentialPublicKey,
      transports: dbAuthenticator.transports.map(transport => {
        switch (transport) {
          case 'usb':
            return AuthenticatorTransportFuture.USB;
          case 'ble':
            return AuthenticatorTransportFuture.BLE;
          case 'nfc':
            return AuthenticatorTransportFuture.NFC;
          case 'hybrid':
            return AuthenticatorTransportFuture.HYBRID;
          case 'internal':
            return AuthenticatorTransportFuture.INTERNAL;
          default:
            throw new Error(`Unsupported transport type: ${transport}`);
        }
      }),
    };
  }

//verifiedAuthenticationResponse is the response from the verification of the authentication response
let verification: VerifiedAuthenticationResponse;

//try to verify the authentication response
try {
  const opts: VerifyAuthenticationResponseOpts = {
     response: body,
     expectedChallenge: `${expectedChallenge}`,
     expectedOrigin: origin,
     expectedRPID: rpID,
     authenticator: dbAuthenticator, // The authenticator that the user has registered
     requireUserVerification: false
  };
  verification = await verifyAuthenticationResponse(opts); //opts is the options for the verification
  console.log('Verification result', verification); //log the verification result
 } catch (error) {
  console.error('Verification error', error);
  return res.json({
     status: 'failed',
     errorMessage: (error as Error).message,
  });
 }

//destructure the verification object
const { verified, authenticationInfo } = verification;
if (!verified || !authenticationInfo) {
  console.log('Cannot authenticate signature.');
   return res.json({
     status: 'failed',
     errorMessage: 'Fingerprint not recognized. Please try again.',
   });
}

//update the counter of the authenticator, this is used to prevent replay attacks, replay attacks are attacks where an attacker intercepts a message and replays it to the server
dbAuthenticator.counter = authenticationInfo.newCounter;
req.session.currentChallenge = undefined;
req.session.isLoggedIn = true;
const result = {
   status: 'ok',
   errorMessage: '',
   //redirect: 'https://clockify.me/',
};
res.json(result); //return the result to the client
});

export default router;