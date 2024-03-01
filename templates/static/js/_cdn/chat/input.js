import { handleFileEvent } from "./filehandler.js";
import { websocket } from "./websocket.js";
import { getSelectedFile, setSelectedFile } from "./filehandler.js";
import * as filehandler from "./filehandler.js";

// Get the input field and error message elements
const inputField = document.getElementById("message-input");
const errorMessage = document.getElementById("error-message"); // Assuming you have an element with this id for the error message
const fileInput = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");

// Function to resize the textarea
function resizeTextarea() {
  inputField.style.height = "44px";
  if (inputField.scrollHeight > inputField.clientHeight) {
    inputField.style.height = inputField.scrollHeight + "px";
  }
}

// Set the max height of the inputField
inputField.style.maxHeight = "500px";

// Add an event listener to the input event
inputField.addEventListener("input", resizeTextarea);

inputField.addEventListener("paste", function (e) {
  if (e.clipboardData) {
    var items = e.clipboardData.items;
    if (!items) return;

    for (var i = 0; i < items.length; i++) {
      if (items[i].type.indexOf("image") !== -1) {
        var file = items[i].getAsFile();
        var originalName = file.name;
        var uniqueName = originalName
          .split(".")
          .map((part, index, array) => {
            if (index === array.length - 2) {
              return part + "-" + Date.now();
            }
            return part;
          })
          .join(".");
        var file = new File([file], uniqueName, { type: file.type });
        handleFileEvent(file);
      }
    }
  }
});

let typingTimeout;

// Add a keydown event listener to the input field
inputField.addEventListener("keydown", () => {
  // Clear the typing timeout
  clearTimeout(typingTimeout);

  // Send a 'start typing' event to the server
  websocket.send(JSON.stringify({ type: "typing", action: "start" }));
});

// Add a keyup event listener to the input field
inputField.addEventListener("keyup", () => {
  // Clear the typing timeout
  clearTimeout(typingTimeout);

  // Set a typing timeout
  typingTimeout = setTimeout(() => {
    // Send a 'stop typing' event to the server
    websocket.send(JSON.stringify({ type: "typing", action: "stop" }));
  }, 5000); // 5 seconds
});

// Add the keydown event listener
inputField.addEventListener("keydown", (event) => {
  const message = event.target.value;
  const inCodeBlock =
    message.startsWith("```") && (message.match(/```/g) || []).length === 1;

  // Check if the user has started typing
  if (
    event.key.length === 1 &&
    !event.ctrlKey &&
    !event.altKey &&
    !event.metaKey
  ) {
    // Send a typing event to the server
    websocket.send(JSON.stringify({ type: "typing", action: "start" }));
  }

  if (event.key === "Tab" && inCodeBlock) {
    event.preventDefault();
    let cursorPosition = inputField.selectionStart;
    inputField.value =
      inputField.value.substring(0, cursorPosition) +
      "    " +
      inputField.value.substring(cursorPosition);
    inputField.selectionStart = cursorPosition + 4;
    inputField.selectionEnd = cursorPosition + 4;
  } else if (event.key === "Enter") {
    if (!event.shiftKey && !inCodeBlock) {
      event.preventDefault();

      if (message.trim().length === 0 && fileInput.files.length === 0 && !getSelectedFile()) {
        inputField.classList.add("border-red-500", "shake");
        errorMessage.style.display = "block";
      } else {
        // Make a POST request to the API route
        fetch("https://api.tarly.gg/v1/authme/", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${SUPER_SECRET_TOKEN}`,
          },
          body: JSON.stringify({ Authorization: `${SUPER_SECRET_TOKEN}` }),
        })
          .then((response) => {
            if (response.status === 429) {
              const retryAfter = response.headers.get("retry-after");
              inputField.disabled = true;
              inputField.style.cursor = "not-allowed"; // Change cursor to 'not-allowed'
              inputField.classList.add("border-red-500"); // Make border red

              // Create a new div for the backdrop
              const backdrop = document.createElement("div");
              backdrop.classList.add(
                "fixed",
                "inset-0",
                "bg-black",
                "bg-opacity-50",
                "flex",
                "items-center",
                "justify-center"
              );

              // Create a new div for the popup
              const popup = document.createElement("div");
              popup.classList.add(
                "bg-white",
                "p-4",
                "rounded",
                "shadow-lg",
                "text-center"
              );

              popup.innerHTML = `
                            <p class="text-red-500 font-semibold">You're going too fast, please slow down!</p>
                            <p class="text-gray-500 text-sm">Wait for ${Math.round(
                retryAfter
              )} seconds before trying again.</p>
                            <button class="mt-4 px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700">OK</button>
                        `;

              // Add an event listener to the OK button to close the popup
              popup.querySelector("button").addEventListener("click", () => {
                document.body.removeChild(backdrop);
              });

              // Add the popup to the backdrop div
              backdrop.appendChild(popup);

              // Add the backdrop to the body
              document.body.appendChild(backdrop);

              setTimeout(() => {
                inputField.disabled = false;
                inputField.style.cursor = "auto"; // Reset cursor to default
                inputField.classList.remove("border-red-500"); // Remove red border
              }, retryAfter * 1000);
              return;
            } else if (!response.ok) {
              throw new Error("Network response was not ok");
            } else {
              // Check if there's a file selected
              if (
                (fileInput.files.length > 0 || getSelectedFile()) &&
                inputField.value.trim().length === 0
              ) {
                // Send the file to the server
                filehandler.sendFileToWs().then(() => {
                  // Hide the preview container
                  previewContainer.classList.add("hidden");

                  // Clear the file input
                  fileInput.value = "";
                  setSelectedFile(null);
                  // Remove the child elements of the preview container
                  while (previewContainer.firstChild) {
                    previewContainer.firstChild.remove();
                  }
                });
              } else if (
                (fileInput.files.length > 0 || getSelectedFile()) &&
                inputField.value.trim().length > 0
              ) {
                // Send the file to the server and the message
                event.target.value = "";
                resizeTextarea();
                filehandler.sendFileToWs().then(() => {
                  websocket.send(JSON.stringify({ message }));

                  // Hide the preview container
                  previewContainer.classList.add("hidden");

                  // Clear the file input
                  fileInput.value = "";
                  setSelectedFile(null);
                  // Remove the child elements of the preview container
                  while (previewContainer.firstChild) {
                    previewContainer.firstChild.remove();
                  }
                });
              } else {
                // Send the message to the server
                websocket.send(JSON.stringify({ message }));
                event.target.value = "";
                resizeTextarea();
              }
            }
              // Split the message into words
              const words = message.split(' ');

              // Filter the words that start with @ and remove the @ to get the usernames
              const usernames = words.filter(word => word.startsWith('@')).map(word => word.substring(1));

              if (usernames.length > 0) {
                // Send a message to the server with the usernames
                websocket.send(JSON.stringify({ type: "notification", users: usernames, message: message}));
              }
          })
          .catch((error) => {
            console.error("Error:", error);
          });
      }
    } else {
      event.preventDefault();
      let cursorPosition = inputField.selectionStart;
      inputField.value =
        inputField.value.substring(0, cursorPosition) +
        "\n" +
        inputField.value.substring(cursorPosition);
      inputField.selectionStart = cursorPosition + 1;
      inputField.selectionEnd = cursorPosition + 1;
      resizeTextarea();
    }
    websocket.send(JSON.stringify({ type: "typing", action: "stop" }));
  }

});

// Add the input and blur event listeners to remove the effects when the user starts typing or clicks outside of the input field
["input", "blur"].forEach((eventType) => {
  inputField.addEventListener(eventType, () => {
    if (inputField.classList.contains("border-red-500")) {
      inputField.classList.remove("border-red-500", "shake");
      errorMessage.style.display = "none";
    }
  });
});

// Get the emoji button and the emoji picker
const emojiButton = document.getElementById("emoji-button");
const emojiPicker = document.querySelector("emoji-picker");

// Hide the emoji picker by default
emojiPicker.style.display = "none";

// When the emoji button is clicked, show or hide the emoji picker
emojiButton.addEventListener("click", () => {
  if (emojiPicker.style.display === "none") {
    emojiPicker.style.display = "block";
  } else {
    emojiPicker.style.display = "none";
  }
});

// When an emoji is selected, add it to the input field and hide the emoji picker
emojiPicker.addEventListener("emoji-click", (event) => {
  document.getElementById("message-input").value += event.detail.emoji.unicode;
  emojiPicker.style.display = "none";
});