async function getUserInfo() {
    const resp = await fetch('/userinfo');
    const json = await resp.json();
    if (json.status === 'ok') {
      document.getElementById('loginname').innerText = 'Logged in as: ' + json.username;
    }
  }

  async function register() {
    const { startRegistration } = SimpleWebAuthnBrowser;

    const elemBegin = document.getElementById('register');
    const elemSuccess = document.getElementById('success');
    const elemError = document.getElementById('error');
    const username = document.getElementById('username');;
    console.log(username);
    elemSuccess.innerHTML = '';
    elemError.innerHTML = '';
    const resp = await fetch('http://localhost:3000/attestation/options', {  //const resp = await fetch('/attestation/options', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: username.value
      })
    });


//added this
    if (!resp.ok) {
      console.error('Error from /attestation/options:', resp.statusText);
      return;
    }
//added this


    let attResp;
    // try {
    //   attResp = await startRegistration(await resp.json());
    // } catch (error) {
    //   if (error.name === 'InvalidStateError') {
    //     elemError.innerText = 'Error: Authenticator was probably already registered by user';
    //   } else {
    //     elemError.innerText = error;
    //   }
    //   throw error;
    // }

    try {
      // Replace this with hardcoded, correctly formatted data
      const testData = {
        challenge: "your_base64_encoded_challenge_here",
        rp: {
           name: "Your Relying Party Name",
        },
        user: {
           id: "your_user_id_here",
           name: "your_username_here",
           displayName: "Your Display Name",
        },
        pubKeyCredParams: [
           {
             type: "public-key",
             alg: -7, // Example: ES256 algorithm
           },
        ],
        authenticatorSelection: {
           userVerification: "preferred",
        },
        timeout: 60000, // Timeout in milliseconds
        attestation: "direct",
       };
      attResp = await startRegistration(testData);
     } catch (error) {
      console.error("Error in startRegistration:", error);
      // Handle error
     }


    const verificationResp = await fetch('/attestation/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attResp),
    });
    const verificationJSON = await verificationResp.json();

    if (verificationJSON && verificationJSON.status === 'ok') {
      elemSuccess.innerText = 'Successfully registered!';
    } else {
      elemError.innerText = 'Error: ' + verificationJSON.errorMessage;
    }
  }

  async function authenticate() {
    const { startAuthentication } = SimpleWebAuthnBrowser;
    const elemBegin = document.getElementById('authenticate');
    const elemSuccess = document.getElementById('success');
    const elemError = document.getElementById('error');
    const username = document.getElementById('loginname');;
    console.log(username);
    elemSuccess.innerHTML = '';
    elemError.innerHTML = '';
    const resp = await fetch('/assertion/options', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: loginname.value
      })
    });
    let asseResp;
    try {
      asseResp = await startAuthentication(await resp.json());
    } catch (error) {
      elemError.innerText = error;
    }
    const verificationResp = await fetch('/assertion/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(asseResp),
    });
    const verificationJSON = await verificationResp.json();

    //changed here
    if (verificationJSON.error === 'User is not registered.') {
      elemError.innerText = 'Error: User is not registered.';
     } else if (verificationJSON && verificationJSON.status === 'ok') {
      elemSuccess.innerText = 'Successfully authenticated!';
      await getUserInfo();
     } else {
      elemError.innerText = 'Error: ' + verificationJSON.errorMessage + 'user is not registered';
     }
  }

  async function logout() {
    const resp = await fetch('/logout');
    const json = await resp.json();
    if (json.status === 'ok') {
      document.getElementById('success').innerText = '';
      document.getElementById('loginname').innerText = '';
    }
  }