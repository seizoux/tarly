function previewImage(event) {
    var reader = new FileReader();
    reader.onload = function () {
        var output = document.getElementById("profilePreview");
        output.style.backgroundImage = "url(" + reader.result + ")";
    };
    reader.readAsDataURL(event.target.files[0]);
}

async function validateForm() {
    let emailInput = document.querySelector('input[type="email"]');
    let usernameInput = document.querySelector('input[type="username"]');
    let passwordInput = document.querySelector('input[type="password"]');
    let fileInput = document.querySelector("#fileInput");
    let isValid = true;

    let attemptsData = JSON.parse(localStorage.getItem("registerAttempts"));

    if (attemptsData === null || attemptsData.timestamp === undefined) {
        attemptsData = { attempts: 1, timestamp: new Date().getTime() };
    } else {
        let attempts = attemptsData.attempts;
        let firstAttemptTime = attemptsData.timestamp;
    
        // Check if 60 seconds have passed since the first attempt
        if (new Date().getTime() - firstAttemptTime >= 60000) {
            attemptsData = { attempts: 1, timestamp: new Date().getTime() };
        } else if (attempts >= 3) {
            emailInput.nextElementSibling.textContent = "You have reached the maximum amount of attempts, try again later.";
            return;
        } else {
            attemptsData.attempts++;
        }
    }
    
    localStorage.setItem("registerAttempts", JSON.stringify(attemptsData));

    // Check if email is valid
    let emailPattern = /^[^ ]+@[^ ]+\.[a-z]{2,3}$/;
    if (!emailInput.value.match(emailPattern)) {
        emailInput.nextElementSibling.textContent =
            "Email address is not valid. Please enter a valid email address.";
        isValid = false;
    } else {
        emailInput.nextElementSibling.textContent = "";
    }

    // Check if username is entered
    if (usernameInput.value === "") {
        usernameInput.nextElementSibling.textContent =
            "Please enter a username for your account.";
        isValid = false;
    } else if (usernameInput.length > 16) {
        usernameInput.nextElementSibling.textContent = "Username must be shorter than 16 characters.";
        isValid = false;
    } else {
        usernameInput.nextElementSibling.textContent = "";
    }

    // Check if password is entered
    if (passwordInput.value === "") {
        passwordInput.nextElementSibling.textContent =
            "Please enter a password for your account.";
        isValid = false;
    } else if (passwordInput.value.length > 256) {
        passwordInput.nextElementSibling.textContent = "Password must be shorter than 256 characters.";
        isValid = false;
    } else {
        passwordInput.nextElementSibling.textContent = "";
    }

    if (isValid) {
        // Create a new FormData instance
        let formData = new FormData();
        formData.append("username", usernameInput.value);
        formData.append("password", passwordInput.value);
        if (fileInput.files.length === 0) {
            // Use async/await to wait for the fetch operation to complete
            const response = await fetch(`https://tarly.gg/static/assets/default-${Math.floor(Math.random() * 4) + 1}.png`);
            const blob = await response.blob();
            const file = new File([blob], "default.png", {type: blob.type});
            formData.append("image", file);
        } else {
            formData.append("image", fileInput.files[0]);
        }
        formData.append("email", emailInput.value);

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

        // Make a POST request to the /register route
        new Promise((resolve, reject) => {
            fetch("https://api.tarly.gg/v1/send-mail", {
                method: "POST",
                headers: {
                    email: emailInput.value, // Include the email in the headers
                },
            })
                .then((response) => {
                    var json = response.json();
                    console.log(json);
                    if (response.ok) {
                        resolve(response);
                    } else {
                        json.then((data) => {
                            console.log(data);
                            if (data.detail.error_text === "email_exists") {
                                emailInput.nextElementSibling.textContent = "This email address already exists.";
                            } else {
                                emailInput.nextElementSibling.textContent = "Failed to send mail..";
                            }
                            reject(new Error("Failed to send mail"));
                        });
                    }
                })
                .catch((error) => reject(error))
                .finally(() => {
                    // Remove the loading backdrop
                    formDiv.removeChild(loadingDiv);
                });
        }).then(async (response) => {
            // Get the div that contains the form
            var formDiv = document.getElementById("formDiv");

            // Clear the div
            formDiv.innerHTML = "";

            // Create a new form for the verification code
            var verificationForm = `
            <div class="flex flex-col mb-4">
                <h1 class="text-3xl font-bold text-white mb-2">Verification</h1>
                <p class="text-white text-sm mb-2">Please enter the verification code sent to your email.</p>
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

            // Add the new form to the div
            formDiv.innerHTML = verificationForm;

            // Add an event listener to the Verify button
            document
                .getElementById("verifyButton")
                .addEventListener("click", function (event) {
                    event.preventDefault();
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

                    formData.append("token", value);

                    // Get the div that contains the form
                    var formDiv = document.getElementById("formDiv");

                    // Add 'relative' class to formDiv
                    formDiv.classList.add('relative');

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

                    // Make a POST request to the /auth route with the FormData
                    new Promise((resolve, reject) => {
                        fetch(`https://api.tarly.gg/v1/auth`, {
                            method: "POST",
                            body: formData,
                        })
                            .then((responseAuth) => {
                                if (responseAuth.ok) {
                                    resolve(responseAuth.json());
                                } else {
                                    // Verification failed, show an error message
                                    responseAuth.json().then(data => {
                                        document.getElementById("message").innerText =
                                            "Verification failed: " + JSON.stringify(data);
                                        reject(new Error("Verification failed"));
                                    });
                                }
                            })
                            .catch((error) => reject(error))
                            .finally(() => {
                                // Remove the loading backdrop
                                formDiv.removeChild(loadingDiv);
                            });
                    }).then((data) => {
                        console.log(data);
                        formDiv.innerHTML = `
                        <div class="flex flex-col space-y-4">
                            <div class="flex flex-row gap-2 items-center">
                                <svg xmlns="http://www.w3.org/2000/svg" class="h-12 w-12 text-green-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
                                </svg>
                                <p class="text-white text-2xl font-bold">Account Created!</p>
                            </div>
                            <p class="text-gray-600 text-sm text-wrap">Thank you for registering up on Tarly.gg! We will release a CB (Closed Beta) soon enough and notify anyone who registered by mail.</p>
                            <div class="flex flex-row gap-2 items-center mt-4">
                                <img src=${data.data.image} class="h-12 w-12 rounded-full" alt="Profile Picture">
                                <div class="flex flex-col">
                                    <p class="text-white text-lg font-bold">${data.data.username}</p>
                                    <p class="text-gray-600 text-sm">${data.email} | ${data.data.user_id}</p>
                                </div>
                            </div>
                        </div>
                    `;
                    }).catch((error) => {
                        console.error(error);
                    });
                });
        });
    }

    return isValid;
}

document
    .getElementById("nextStepButton")
    .addEventListener("click", function (event) {
        event.preventDefault();
        validateForm();
    });
