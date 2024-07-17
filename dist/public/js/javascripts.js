//function automatically called when the page is loaded, to see if the user is already logged in
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
  
    //clear previous success/error messages
    elemSuccess.innerHTML = '';
    elemError.innerHTML = '';
  
    //fetch options from the server for the startRegistration process
    const resp = await fetch('http://localhost:5003/attestation/options', { //https://mern-video.azurewebsites.net/attestation/options
      //const resp = await fetch('http://localhost:3000/attestation/options', {
      method: 'POST',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        username: usernameInput.value
      })
    });
  
    //check the response from the server
    if (!resp.ok) {
      console.error('Error from /attestation/options:', resp.statusText);
      elemError.innerText = 'Error fetching registration options: ' + resp.statusText;
      return;
    }
  
    //parse the response to get the registration options
    const options = await resp.json();
    console.log('Registration options:', options);
  
    //start the registration process using the options from the server
    let attResp;
    try {
      attResp = await startRegistration(options);
      console.log('attResp (before sending to server):', attResp);
    } catch (error) {
      console.error('Error in startRegistration:', error);
      elemError.innerText = 'Failed to register. Please try again';
      return;
    }
  
    //checking the attResp before sending to the server
    console.log('attResp to be sent:', attResp);
  
    //checking if attResp is not undefined before sending
    if (!attResp) {
      console.error('attResp is undefined, registration may not have completed properly');
      elemError.innerText = 'Registration did not complete properly.';
      return;
    }
  
    //send the attestation response to the server for verification
    const verificationResp = await fetch('/attestation/result', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(attResp),
    });
  
    //process the verification response from the server
    const verificationJSON = await verificationResp.json();
  
    if (verificationJSON && verificationJSON.status === 'ok') {
      elemSuccess.innerText = 'Successfully registered!';
    } else {
      elemError.innerText = 'Error: ' + verificationJSON.errorMessage;
    }
  }

  //function to authenticate the user
  async function authenticate() {
    const { startAuthentication } = SimpleWebAuthnBrowser;
    const elemBegin = document.getElementById('authenticate');
    const elemSuccess = document.getElementById('success');
    const elemError = document.getElementById('error');
    const username = document.getElementById('loginname');;
    console.log(username); //see if the username is being fetched
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

    //check the response from the server
    let asseResp;
    try {
      asseResp = await startAuthentication(await resp.json());
      console.log('asseResp:', asseResp);
    } catch (error) {
      console.error('Attestation error:', error);
      elemError.innerText = error;
    }

    //send the assertion response to the server for verification
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

      //redirect once user is authenticated
      window.location.href = './dashboard.html'; //sql injection vulnerability

      await getUserInfo();
     } else {
      elemError.innerText = 'Error: ' + verificationJSON.errorMessage + ' user is not registered';
     }
  }

  //function to logout the user
async function logout() {
  // const resp = await fetch('/logout');
  // const contentType = resp.headers.get("content-type");

  // if (contentType && contentType.includes("application/json")) {
  //   const json = await resp.json();
  //   console.log("1  ----------------------->");
  //   if (json.status === 'ok') {
  //     console.log("2  ----------------------->");
  //     const loginnameElement = document.getElementById('loginname');
  //     const successElement = document.getElementById('success');

  //     if (loginnameElement) {
  //       console.log("3 ----------------------->");
  //       loginnameElement.innerText = '';
  //     }

  //     if (successElement) {
  //       console.log("4  ----------------------->");
  //       successElement.innerText = '';
  //     }

  //     //redirect to the sign-in page after successful logout
  //     if (json.redirect) {
  //       window.location.href = json.redirect;
  //     } else {
  //       console.error('Server did not provide a redirect URL');
  //     }
  //   }
  // } else {
  //   console.error('Server did not return JSON');
  // }
  window.location.href = '/logout';
}

  // fetch('/result', {
  //   method: 'POST',
  //   headers: {
  //     'Content-Type': 'application/json'
  //   },
  //   body: JSON.stringify({
  //     // Your data here
  //   })
  // })
  // .then(response => {
  //   const contentType = response.headers.get("content-type");
  //   if (contentType && contentType.includes("application/json")) {
  //     return response.json();
  //   } else {
  //     throw new TypeError("Server response is not JSON");
  //   }
  // })
  // .then(data => {
  //   //handle the JSON response
  //   if (data.status === 'ok' && data.redirect) {
  //     //redirect the user to the where needed
  //     window.location.href = data.redirect;
  //   }
  // })
  // .catch(error => {
  //   console.error('Error:', error);
  // });
  