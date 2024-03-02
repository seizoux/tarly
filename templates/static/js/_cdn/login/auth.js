document.getElementById('nextStepButton').addEventListener('click', function(event) {
    event.preventDefault(); // prevent the form from submitting normally

    var email = document.querySelector('input[type="email"]').value;
    var password = document.querySelector('input[type="password"]').value;

    if (!email || !password) {
        var errorMessage = 'This field is required.';
    
        if (!email) {
            document.querySelector('input[type="email"]').nextElementSibling.textContent = errorMessage;
        }
    
        if (!password) {
            document.querySelector('input[type="password"]').nextElementSibling.textContent = errorMessage;
        }
    
        return;
    }

    // Check if email is valid
    let emailPattern = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
    if (!emailInput.value.match(emailPattern)) {
        emailInput.nextElementSibling.textContent =
            "Email address is not valid. Please enter a valid email address.";
        isValid = false;
    } else {
        emailInput.nextElementSibling.textContent = "";
    }

    // Get the div that contains the form
    var formDiv = document.getElementById("formDiv");

    // Create a new div for the loading backdrop
    var loadingDiv = document.createElement('div');
    loadingDiv.className = 'absolute top-0 right-0 bottom-0 left-0 bg-black bg-opacity-50 flex justify-center items-center z-10';

    // Add a loading backdrop over the formDiv
    loadingDiv.innerHTML = `
        <div role="status">
            <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
            </svg>
            <span class="sr-only">Loading...</span>
        </div>
        `;
    formDiv.appendChild(loadingDiv);

    new Promise((resolve, reject) => {
        fetch('https://api.tarly.gg/v1/auth/validate', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                email: email,
                password: password
            })
        })
        .then(response => {
            var json = response.json()
            if (response.ok) {
                return json; // return the Promise returned by response.json()
                    } else {
                        formDiv.removeChild(loadingDiv);
                        json.then(data => {
                            var button = document.getElementById('errorStep');
                            button.textContent = `Something went wrong: ${JSON.stringify(data)}`;
                            reject(new Error(data.error)); // reject the outer Promise with the error
                        });
                    }
                })
                .then(data => {
                    resolve(data); // resolve the outer Promise with the data
                })
                .catch((error) => {
                    reject(error); // reject the outer Promise with the error
                });
            })
    .then(data => {
        console.log(data);
        // If 2FA is enabled
        if (data['2fa'] === true) {
            const formData = new FormData();
            formData.append('email', email);
            formData.append('password', password);
            // Create a new form for the verification code
            var verificationForm = `
            <div class="flex flex-col mb-4">
                <h1 class="text-3xl font-bold text-white mb-2">2FA Enabled</h1>
                <p class="text-gray-600 text-sm mb-2">Please enter the verification code sent to your email (${email}).</p>
            </div>
            <div class="mb-4">
                <label class="font-bold text-white block mb-2">Verification Code</label>
                <input type="text" id="verificationCode" class="block appearance-none w-full bg-site-primary dark:bg-gray-700 border border-grey-200 hover:border-grey-300 px-2 py-2 rounded shadow text-white" placeholder="Enter verification code">
                <span id="message" class="text-red-500 text-xs"></span>
            </div>
            <div class="flex flex-row items-center">
                <button id="verifyButton" class="bg-transparent transition ease-in-out duration-200 border-purple-600 border-2 border-double hover:border-white hover:bg-purple-600/50 text-white font-bold py-2 px-4 rounded">
                    Verify
                </button>
            </div>
            `;
    
            // Replace the formDiv with the verification form
            formDiv.innerHTML = verificationForm;

            // Add an event listener to the verify button
            document.getElementById('verifyButton').addEventListener('click', function(event) {
                event.preventDefault(); // prevent the form from submitting normally

                // Get the verification code input
                var verificationCode = document.getElementById("verificationCode");

                var value = verificationCode.value.replace(/\s/g, "");
                if (value.length !== 6) {
                    document.getElementById("message").innerText =
                        "Please enter a 6-digit verification code.";
                    return;
                }

                if (isNaN(value)) {
                    document.getElementById("message").innerText =
                        "Please enter a valid verification code.";
                    return;
                }

                formData.append("token", value); // Add the verification code to the form data

                // Get the div that contains the form
                var formDiv = document.getElementById("formDiv");

                // Create a new div for the loading backdrop
                var loadingDiv = document.createElement('div');
                loadingDiv.className = 'absolute top-0 right-0 bottom-0 left-0 bg-black bg-opacity-50 flex justify-center items-center z-10';

                // Add a loading backdrop over the formDiv
                loadingDiv.innerHTML = `
                <div role="status">
                    <svg aria-hidden="true" class="inline w-8 h-8 text-gray-200 animate-spin dark:text-gray-600 fill-purple-600" viewBox="0 0 100 101" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M100 50.5908C100 78.2051 77.6142 100.591 50 100.591C22.3858 100.591 0 78.2051 0 50.5908C0 22.9766 22.3858 0.59082 50 0.59082C77.6142 0.59082 100 22.9766 100 50.5908ZM9.08144 50.5908C9.08144 73.1895 27.4013 91.5094 50 91.5094C72.5987 91.5094 90.9186 73.1895 90.9186 50.5908C90.9186 27.9921 72.5987 9.67226 50 9.67226C27.4013 9.67226 9.08144 27.9921 9.08144 50.5908Z" fill="currentColor"/>
                        <path d="M93.9676 39.0409C96.393 38.4038 97.8624 35.9116 97.0079 33.5539C95.2932 28.8227 92.871 24.3692 89.8167 20.348C85.8452 15.1192 80.8826 10.7238 75.2124 7.41289C69.5422 4.10194 63.2754 1.94025 56.7698 1.05124C51.7666 0.367541 46.6976 0.446843 41.7345 1.27873C39.2613 1.69328 37.813 4.19778 38.4501 6.62326C39.0873 9.04874 41.5694 10.4717 44.0505 10.1071C47.8511 9.54855 51.7191 9.52689 55.5402 10.0491C60.8642 10.7766 65.9928 12.5457 70.6331 15.2552C75.2735 17.9648 79.3347 21.5619 82.5849 25.841C84.9175 28.9121 86.7997 32.2913 88.1811 35.8758C89.083 38.2158 91.5421 39.6781 93.9676 39.0409Z" fill="currentFill"/>
                    </svg>
                    <span class="sr-only">Loading...</span>
                </div>
                `;
                formDiv.appendChild(loadingDiv);

                new Promise((resolve, reject) => {
                    fetch('https://api.tarly.gg/v1/auth/verify', {
                        method: 'POST',
                        body: formData
                    })
                    .then(response => {
                        if (response.ok) {
                            return response.json(); // return the Promise returned by response.json()
                        } else {
                            document.getElementById('message').textContent = response.json().detail;
                            throw new Error('Error: ' + response.statusText);
                        }
                    })
                    .then(data => {
                        resolve(data); // resolve the outer Promise with the data
                    })
                    .catch((error) => {
                        reject(error); // reject the outer Promise with the error
                    });
                })
                .then(data => {
                    window.location.href = data.redirect;
                })
                .catch((error) => {
                    console.error('Error:', error);
                })
                .finally(() => {
                    // Remove the loading backdrop
                    formDiv.removeChild(loadingDiv);
                });
            });
        } else {
            // Redirect to the next step
            window.location.href = data.redirect;
        }
    })
});

var emailInput = document.querySelector('input[type="email"]');
var passwordInput = document.querySelector('input[type="password"]');

emailInput.addEventListener('input', function() {
    this.nextElementSibling.textContent = '';
});

passwordInput.addEventListener('input', function() {
    this.nextElementSibling.textContent = '';
});