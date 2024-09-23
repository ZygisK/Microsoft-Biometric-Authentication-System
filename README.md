# Biometric Authentication System

## Overview
This project implements a secure biometric authentication system that uses passkeys to replace traditional passwords through WebAuthn.

### What is WebAuthn?
WebAuthn is a new open standard that allows web servers to register and authenticate users using cryptography. Think of it as a lock that uses two keys: 
- **Public Key**: This key is encrypted and stored in the cloud.
- **Private Key**: This key is stored locally on the user's device and is never shared.

This combination enables users to log in to their devices using biometric sensors, such as fingerprints or facial recognition.

### How It Works
- **Attestation**: During the registration process, a new public and private key pair is created. The public key is sent to the server along with an attestation statement, which verifies that the key was generated by a legitimate device. This ensures the authenticity of the user's credential.
  
- **Assertion**: When a user attempts to log in, the server generates a challenge and sends it to the client. The client uses the private key to sign the challenge and sends the response back to the server. The server then verifies this signed response using the previously stored public key. If the verification is successful, the user is authenticated.
