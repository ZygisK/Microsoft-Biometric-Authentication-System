"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const server_1 = require("@simplewebauthn/server");
const config_1 = __importDefault(require("./config"));
const helpers_1 = require("@simplewebauthn/server/helpers");
const userSchema_1 = require("../models/userSchema");
//express module to create a new router
const router = express_1.default.Router();
const rpID = config_1.default.rpID;
const origin = config_1.default.origin;
//POST request to /options, which generates authentication options
router.post('/options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    //looks for a user with the username provided in the request body
    const user = yield userSchema_1.User.findOne({ username: req.body.username });
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
    const opts = {
        timeout: 60000,
        allowCredentials: user.authenticators.map(authenticator => ({
            id: new Uint8Array(authenticator.credentialID),
            type: 'public-key',
        })),
        userVerification: 'discouraged',
        rpID,
    };
    console.log('Generating authentication options with:-------------------------------->', opts);
    const credentialGetOptions = yield (0, server_1.generateAuthenticationOptions)(opts);
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
    res.json(options); //returning the options to the client
}));
//POST request to /result, which verifies the authentication response
router.post('/result', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    if (req.session.isLoggedIn) {
        return res.json({
            status: 'failed',
            errorMessage: 'User is already logged in.',
        });
    }
    //const body: AuthenticationResponseJSON = req.body;
    const username = req.session.username;
    const user = yield userSchema_1.User.findOne({ username: username });
    //if (!body || !body.rawId) {
    if (!user) {
        return res.status(400).json({
            status: 'failed',
            errorMessage: '',
        });
    }
    const expectedChallenge = req.session.currentChallenge;
    const body = req.body;
    //const username = `${req.session.username}`;
    //const user = database[username];
    if (!body.rawId) {
        return res.json({
            status: 'failed',
            errorMessage: 'Invalid credentials provided.',
        });
    }
    //dbAuthenticator will be the authenticator that the user has registered
    let dbAuthenticator;
    const bodyCredIDBuffer = helpers_1.isoBase64URL.toBuffer(req.body.rawId); //convert string to Uint8Array, we do this because the credentialID is stored as a Uint8Array in the database
    for (const authenticator of user.authenticators) { //iterate through the authenticators that the user has registered
        if (helpers_1.isoUint8Array.areEqual(authenticator.credentialID, bodyCredIDBuffer)) { //if the credentialID of the authenticator matches the credentialID of the response
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
    let AuthenticatorTransportFuture;
    (function (AuthenticatorTransportFuture) {
        AuthenticatorTransportFuture["USB"] = "usb";
        AuthenticatorTransportFuture["BLE"] = "ble";
        AuthenticatorTransportFuture["NFC"] = "nfc";
        AuthenticatorTransportFuture["HYBRID"] = "hybrid";
        AuthenticatorTransportFuture["INTERNAL"] = "internal";
    })(AuthenticatorTransportFuture || (AuthenticatorTransportFuture = {}));
    if (dbAuthenticator) {
        dbAuthenticator = Object.assign(Object.assign({}, dbAuthenticator), { 
            //credentialPublicKey: isoBase64URL.toBuffer(dbAuthenticator.credentialPublicKey), // Convert string to Uint8Array
            credentialPublicKey: dbAuthenticator.credentialPublicKey, transports: dbAuthenticator.transports.map(transport => {
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
            }) });
    }
    //verifiedAuthenticationResponse is the response from the verification of the authentication response
    let verification;
    //try to verify the authentication response
    try {
        const opts = {
            response: body,
            expectedChallenge: `${expectedChallenge}`,
            expectedOrigin: origin,
            expectedRPID: rpID,
            authenticator: dbAuthenticator,
            requireUserVerification: false
        };
        verification = yield (0, server_1.verifyAuthenticationResponse)(opts); //opts is the options for the verification
        console.log('Verification result', verification); //log the verification result
    }
    catch (error) {
        console.error('Verification error', error);
        return res.json({
            status: 'failed',
            errorMessage: error.message,
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
}));
exports.default = router;
