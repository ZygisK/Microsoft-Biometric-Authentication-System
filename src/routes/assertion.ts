import express, { Request, Response } from 'express';
import {
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  GenerateAuthenticationOptionsOpts,
  VerifiedAuthenticationResponse,
  VerifyAuthenticationResponseOpts,
} from '@simplewebauthn/server';
//import database from './db';
import config from './config';
import { AuthenticationResponseJSON } from '@simplewebauthn/server/script/deps';
import { isoBase64URL, isoUint8Array } from '@simplewebauthn/server/helpers';
import {User} from '../models/userSchema';

const router = express.Router();

const rpID = config.rpID;
const origin = config.origin;

router.post('/options', async (req: Request, res: Response) => {
  //const user = database[req.body.username];
  const user = await User.findOne({ username: req.body.username });
  if (!user || !Array.isArray(user.authenticators)) {
    res.json({
      status: 'failed',
      errorMessage: `User ${req.body.username} does not exist`,
    });
    return;
  }
  const opts: GenerateAuthenticationOptionsOpts = {
  timeout: 60000,
  allowCredentials: user.authenticators.map(authenticator => ({
    id: new Uint8Array(authenticator.credentialID),
    type: 'public-key',
    transports: authenticator.transports.map(transport => {
       // Assuming 'transport' is a string that needs to be mapped to a valid AuthenticatorTransportFuture value
       // This is just an example; you'll need to adjust the mapping based on the actual values
       switch (transport) {
         case 'usb':
           return 'usb';
         case 'ble':
           return 'ble';
         case 'nfc':
           return 'nfc';
         default:
           throw new Error(`Unsupported transport type: ${transport}`);
       }
    }),
   })),
  userVerification: 'discouraged',
  rpID,
};
  const credentialGetOptions = await generateAuthenticationOptions(opts);
  const successRes = {
    status: 'ok',
    errorMessage: '',
  };
  const options = Object.assign(successRes, credentialGetOptions);
  req.session.username = user.username;
  req.session.currentChallenge = options.challenge;
  res.json(options)
});

router.post('/result', async (req: Request, res: Response) => {

  //const body: AuthenticationResponseJSON = req.body;
  const username = req.session.username;
  const user = await User.findOne({ username: username });

  //if (!body || !body.rawId) {
    if(!user){
    return res.status(400).json({
      status: 'failed',
      errorMessage: 'User is not authenticated / registered.',
    });
  }

  const expectedChallenge = req.session.currentChallenge;
  const body: AuthenticationResponseJSON = req.body;
  //const username = `${req.session.username}`;
  //const user = database[username];

  let dbAuthenticator;
  //const bodyCredIDBuffer = isoBase64URL.toBuffer(body.rawId)
  const bodyCredIDBuffer = isoBase64URL.toBuffer(req.body.rawId);
  for (const authenticator of user.authenticators) {
    if (isoUint8Array.areEqual(authenticator.credentialID, bodyCredIDBuffer)) {
      dbAuthenticator = authenticator;
      break;
    }
 }

  if (!dbAuthenticator) {
    return res.json({
      status: 'failed',
      errorMessage: 'Authenticator is not registered with this site.',
    });
  }

  enum AuthenticatorTransportFuture {
    USB = 'usb',
    BLE = 'ble',
    NFC = 'nfc',
   }


   if (dbAuthenticator) {
    dbAuthenticator = {
       ...dbAuthenticator,
       transports: dbAuthenticator.transports.map(transport => {
         switch (transport) {
           case 'usb':
             return AuthenticatorTransportFuture.USB;
           case 'ble':
             return AuthenticatorTransportFuture.BLE;
           case 'nfc':
             return AuthenticatorTransportFuture.NFC;
           default:
             throw new Error(`Unsupported transport type: ${transport}`);
         }
       }),
    };
   }

let verification: VerifiedAuthenticationResponse;
try {
   const opts: VerifyAuthenticationResponseOpts = {
     response: body,
     expectedChallenge: `${expectedChallenge}`,
     expectedOrigin: origin,
     expectedRPID: rpID,
     authenticator: dbAuthenticator,
     requireUserVerification: false
   };
   verification = await verifyAuthenticationResponse(opts);
} catch (error) {
   return res.json({
     status: 'failed',
     errorMessage: (error as Error).message,
   });
}

const { verified, authenticationInfo } = verification;
if (!verified || !authenticationInfo) {
   return res.json({
     status: 'failed',
     errorMessage: 'Cannot authenticate signature.',
   });
}

dbAuthenticator.counter = authenticationInfo.newCounter;
req.session.currentChallenge = undefined;
req.session.isLoggedIn = true;
const result = {
   status: 'ok',
   errorMessage: '',
};
res.json(result);
});

export default router;