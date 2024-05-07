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
const crypto_1 = __importDefault(require("crypto"));
const config_1 = __importDefault(require("./config"));
const userSchema_1 = require("../models/userSchema");
const router = express_1.default.Router();
const rpName = config_1.default.rpName;
const rpID = config_1.default.rpID;
const origin = config_1.default.origin;
//POST request to /result, which verifies the registration response
router.post('/result', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const body = req.body;
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
    const opts = {
        response: body,
        expectedChallenge: `${expectedChallenge}`,
        expectedOrigin: origin,
        expectedRPID: rpID,
        requireUserVerification: false,
    };
    let verification;
    try {
        verification = yield (0, server_1.verifyRegistrationResponse)(opts); //verify the registration response with the opts we just made
        console.log('Verification result', verification); //debugging line to check the verification result
    }
    catch (error) {
        return res.json({
            status: 'failed',
            errorMessage: 'Error verifying registration response.'
            //errorMessage: (error as Error).message,
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
    let user = yield userSchema_1.User.findOne({ username: username }).exec();
    if (!user) {
        //create a new user if not found with our schema
        user = new userSchema_1.User({
            username: username,
            id: crypto_1.default.randomBytes(16).toString('hex'),
            authenticators: [] //we start with an empty array of authenticators
        });
    }
    //check if the authenticator already exists in the user's authenticators
    const existingAuthenticator = user.authenticators.find(authenticator => authenticator.credentialID.equals(credentialIDBuffer) //use Buffer.equals() to compare
    );
    if (!existingAuthenticator) {
        //if authenticator does not exist, add it to the user's authenticators
        const newAuthenticator = {
            credentialID: credentialIDBuffer,
            credentialPublicKey: credentialPublicKeyBuffer,
            counter: registrationInfo.counter,
            transports: body.response.transports,
        };
        user.authenticators.push(newAuthenticator);
    }
    //save the user to the database
    yield user.save();
    req.session.currentChallenge = undefined;
    res.json({
        status: 'ok',
        errorMessage: '',
    });
}));
//POST request to /options, which generates registration options
router.post('/options', (req, res) => __awaiter(void 0, void 0, void 0, function* () {
    const username = req.body.username;
    //store to session
    req.session.username = username;
    //encode the username to include @ and . in the username
    const userIdBuffer = new TextEncoder().encode(username);
    const userIdString = Buffer.from(userIdBuffer).toString('base64');
    const options = yield (0, server_1.generateRegistrationOptions)({
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
}));
exports.default = router;
