async function getUserInfo() {
  const resp = await fetch('/userinfo');
  const json = await resp.json();
  if (json.status === 'ok') {
    document.getElementById('loginname').innerText = 'Logged in as: ' + json.username;
  }
}

async function register() {
  const { startRegistration } = SimpleWebAuthnBrowser;

  const elemSuccess = document.getElementById('success');
  const elemError = document.getElementById('error');
  const usernameInput = document.getElementById('username');

  // Clear previous success/error messages
  elemSuccess.innerHTML = '';
  elemError.innerHTML = '';

  // Fetch options from the server for the startRegistration process
  const resp = await fetch('http://localhost:3000/attestation/options', {
    method: 'POST',
    credentials: 'same-origin',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      username: usernameInput.value
    })
  });

  // Check the response from the server
  if (!resp.ok) {
    console.error('Error from /attestation/options:', resp.statusText);
    elemError.innerText = 'Error fetching registration options: ' + resp.statusText;
    return;
  }

  // Parse the response to get the registration options
  const options = await resp.json();
  console.log('Registration options:', options);

  // Start the registration process using the options from the server
  let attResp;
  try {
    attResp = await startRegistration(options);
    console.log('attResp (before sending to server):', attResp);
  } catch (error) {
    console.error('Error in startRegistration:', error);
    elemError.innerText = 'Error during registration: ' + error;
    return;
  }

  // Debug line to check the attestation response
  console.log('attResp to be sent:', attResp);

  // Ensure attResp is not undefined before sending
  if (!attResp) {
    console.error('attResp is undefined, registration may not have completed properly');
    elemError.innerText = 'Registration did not complete properly.';
    return;
  }

  // Send the attestation response to the server for verification
  const verificationResp = await fetch('/attestation/result', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(attResp),
  });

  // Process the verification response from the server
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