import { addMessageToChat, showAlert } from "./functions.js";

export const websocket = new WebSocket("wss://tarly.gg/ws");

let typingUsersList = [];

websocket.onmessage = (event) => {
  const messageData = JSON.parse(event.data);

  // Ignore keep alive messages
  if (
    messageData.hasOwnProperty("keep_alive") &&
    messageData.keep_alive === "true"
  ) {
    console.log(
      `%cKEEP_ALIVE%c #type: ignore.`,
      "color: yellow; font-size: 15px; background-color: #161724; padding: 5px 10px;",
      "color: gray; font-size: 15px; background-color: #161724; padding: 5px 10px;"
    );
    return;
  }

  // Handle different types of messages
  if (messageData.hasOwnProperty("type") && messageData.type !== null) {
      handleTypeMessage(messageData);
      return;
    }

  if (messageData.message) {
    try {
      messageData.message = JSON.parse(messageData.message);
      console.log(
        `%cParsing JSON Message & Updating...`,
        "color: yellow; font-size: 10px; background-color: #161724; padding: 5px 10px;"
      );
    } catch (error) {
      // If it's not a valid JSON string, just use the original string
      messageData.message = messageData.message;
    }
  }

  addMessageToChat(messageData);
};

websocket.onopen = () => {
  console.log("%cTARLY.GG WEBSOCKET CONNECTED", "color: red; font-size: 30px;");
  console.log(
    "%cUser Logged:%c Waiting for events...",
    "color: green; font-size: 15px; background-color: #161724; padding: 5px 10px;",
    "color: white; font-size: 15px; background-color: #161724; padding: 5px 10px;"
  );

  // Ping-pong to keep the connection alive
  // Send a ping message every 30 seconds
  setInterval(() => {
    websocket.send(JSON.stringify({ type: "keep_alive" }));
  }, 30000);
};

websocket.onclose = function (event) {
  console.log(`WebSocket connection closed due to: ${event.reason}\n${event}`);  // Log the reason for the WebSocket connection closing
};

function handleTypeMessage(messageData) {
  // Update the title or description element with the new content
  if (messageData.type === "title") {
    if (messageData.type_data.title.length > 30) {
      showAlert("Title exceeded the 30 characters limit");
    } else {
      titleElement.textContent = messageData.type_data.title;
    }
  } else if (messageData.type === "description") {
    if (messageData.type_data.description.length > 100) {
      showAlert("Description exceeded the 100 characters limit");
    } else {
      descriptionElement.textContent = messageData.type_data.description;
    }
  } else if (messageData.type === "typing") {
    if (messageData.type_data.action === "start") {
      // Add the user to the list of typing users
      if (!typingUsersList.includes(messageData.type_data.username)) {
        typingUsersList.push(messageData.type_data.username);
      }
    } else if (messageData.type_data.action === "stop") {
      // Remove the user from the list of typing users
      typingUsersList = typingUsersList.filter(
        (user) => user !== messageData.type_data.username
      );
    }

    const typingUsers = document.getElementById("typing-users");

    // Remove all existing child nodes
    while (typingUsers.firstChild) {
      typingUsers.firstChild.remove();
    }

    if (typingUsersList.length > 0) {
      // Create a new span element for each user
      typingUsersList.forEach((user, index) => {
        const span = document.createElement("span");
        span.textContent = user;
        span.className = "text-black dark:text-white";

        // Add a comma after the user name if it's not the last user
        if (index < typingUsersList.length - 1) {
          span.textContent += ", ";
        }

        typingUsers.appendChild(span);
      });

      // Add ' is typing...' after the user names
      const isTyping = document.createElement("span");
      isTyping.textContent = " is typing...";
      typingUsers.appendChild(isTyping);

      typingUsers.style.display = "block";
    } else {
      // Hide the typingUsers element
      typingUsers.style.display = "none";
    }
  } else if (messageData.type === "notification") {

    var options = {
      body: messageData.message, // The body text of the notification
      icon: messageData.type_data.from.userImage, // The URL of an icon to be displayed as part of the notification
      badge: "https://tarly.gg/static/assets/favicon.png", // The URL of an image to represent the notification when there is not enough space to display the notification itself
      vibrate: [200, 100, 200], // A vibration pattern for devices with vibration hardware
      requireInteraction: false, // Indicates that on devices with sufficiently large screens, a notification should remain active until the user clicks or dismisses it
    };

    // Check if the browser supports notifications
    if (!("Notification" in window)) {
      console.log("This browser does not support desktop notification");
    }
    // Check whether notification permissions have already been granted
    else if (Notification.permission === "granted") {

      var audio = new Audio('https://cdn.tarly.gg/mixkit-soap-bubble-sound-2925%20(mp3cut.net).wav');
      audio.play();

      // If it's okay, let's create a notification
      var notification = new Notification(messageData.type_data.from.username, options);
      // Add an event listener for the click event
      notification.onclick = function (event) {
        event.preventDefault(); // prevent the browser from focusing the Notification's tab
        // Do something here; for example, you could focus the window/tab of your web app
        window.focus();
      };
    }
    // Otherwise, we need to ask the user for permission
    else if (Notification.permission !== "denied") {
      Notification.requestPermission().then(function (permission) {
        // If the user accepts, let's create a notification
        if (permission === "granted") {

          var audio = new Audio('https://cdn.tarly.gg/mixkit-soap-bubble-sound-2925%20(mp3cut.net).wav');
          audio.play();

          var notification = new Notification(
            messageData.type_data.from.username,
            options
          );
          // Add an event listener for the click event
          notification.onclick = function (event) {
            event.preventDefault(); // prevent the browser from focusing the Notification's tab
            // Do something here; for example, you could focus the window/tab of your web app
            window.focus();
          };
        }
      });
    }
  } else if (messageData.type === "user_count") {
    document.getElementById("online-count").textContent =
      messageData.count + " online";
    const onlineUsers = messageData.users_data;
    console.log(
      `%cUpdating Online Users...`,
      "color: yellow; font-size: 10px; background-color: #161724; padding: 5px 10px;"
    );
    const onlineUsersElement = document.getElementById("online-users");
    onlineUsersElement.innerHTML = ""; // Clear the online users list
    onlineUsers.forEach((user) => {
      console.log(user)
      const userElement = document.createElement("div");
      userElement.classList.add("flex", "items-center", "mb-2");

      const img = document.createElement("img");
      img.src = user.image_url || user.image_url;
      img.alt = user.username;
      img.classList.add("w-12", "h-12", "rounded-full", "mr-2");
      userElement.appendChild(img);

      const textElement = document.createElement("div");

      const nameElement = document.createElement("div");
      nameElement.textContent = user.username;
      nameElement.className = 'flex flex-row items-center gap-2'
      textElement.appendChild(nameElement);

      if (user.user) {
        if (user.user.hasOwnProperty('bot') && user.user.bot === true) {
          // Create an SVG element
          let botIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
          botIcon.setAttribute("width", "18");
          botIcon.setAttribute("height", "18");
          botIcon.setAttribute("fill", "currentColor");
          botIcon.setAttribute("class", "bi bi-robot");
          botIcon.setAttribute("viewBox", "0 0 16 16");
          botIcon.innerHTML = '<path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"/>';
      
          // Append the SVG to the username holder
          nameElement.appendChild(botIcon);
        }
      }

      const idElement = document.createElement("div");
      idElement.textContent = user.id;
      idElement.classList.add("text-sm", "text-gray-500");
      textElement.appendChild(idElement);

      userElement.appendChild(textElement);

      onlineUsersElement.appendChild(userElement);
    });
  } else if (messageData.type === "file") {
    // The data is a file
    const fileName = messageData.files.fileName;
    const fileType = messageData.files.fileType;
    const fileData = messageData.files.fileData;

    // Create a Blob from the base64 data
    //const byteCharacters = atob(fileData);
    //const byteNumbers = new Array(byteCharacters.length);
    //for (let i = 0; i < byteCharacters.length; i++) {
    //byteNumbers[i] = byteCharacters.charCodeAt(i);
    //}
    //const byteArray = new Uint8Array(byteNumbers);
    //const blob = new Blob([byteArray], {type: fileType});

    // Create a URL for the Blob
    const url = messageData.files.fileUrl;
    const size = messageData.files.fileSize;

    // Now you can use the URL to display the file
    // For example, if it's an image, you can display it in an img element
    let mediaElement;

    if (fileType.startsWith("image/")) {
      mediaElement = document.createElement("img");
      mediaElement.classList.add(
        "rounded-lg",
        "shadow-lg",
        "mb-4",
        "no-repeat"
      );
      mediaElement.classList.add(
        "transform",
        "transition",
        "duration-500",
        "ease-in-out",
        "hover:scale-101",
        "hover:border-blue-500",
        "hover:border-4"
      );
      mediaElement.style.width = "300px"; // Set a fixed width
      mediaElement.style.height = "auto"; // Preserve the aspect ratio
    } else if (fileType.startsWith("video/")) {
      mediaElement = document.createElement("video");
      mediaElement.classList.add("rounded-lg", "shadow-lg", "mb-4");
      mediaElement.controls = true;
      mediaElement.style.width = "300px"; // Set a fixed width
      mediaElement.style.height = "auto"; // Preserve the aspect ratio
    } else if (fileType.startsWith("audio/")) {
      mediaElement = document.createElement("audio");
      mediaElement.classList.add("rounded-lg", "shadow-lg", "mb-4");
      mediaElement.controls = true;
      mediaElement.style.width = "300px"; // Set a fixed width
      mediaElement.style.height = "auto"; // Preserve the aspect ratio
    } else {
      mediaElement = document.createElement("div");
      mediaElement.className =
        "rounded-md shadow-lg p-4 bg-file-white/50 dark:bg-file-dark/50 flex items-start w-full border-2 border-black dark:border-gray-600 mb-4";
      mediaElement.style.alignItems = "flex-start"; // Align items to the start
      mediaElement.style.width = "300px"; // Set a fixed width
      mediaElement.style.height = "auto"; // Preserve the aspect ratio

      // Create an SVG element to represent the file type
      var svgElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "svg"
      );
      svgElement.setAttribute("class", "h-12 w-12 mr-2");
      svgElement.setAttribute("fill", "none");
      svgElement.setAttribute("stroke", "currentColor");
      svgElement.setAttribute("viewBox", "0 0 24 24");
      svgElement.setAttribute("xmlns", "http://www.w3.org/2000/svg");

      // Create a path element for the SVG
      var pathElement = document.createElementNS(
        "http://www.w3.org/2000/svg",
        "path"
      );
      pathElement.setAttribute("stroke-linecap", "round");
      pathElement.setAttribute("stroke-linejoin", "round");
      pathElement.setAttribute("stroke-width", "2");
      pathElement.setAttribute(
        "d",
        "M14 4.5V14a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V2a2 2 0 0 1 2-2h5.5zm-3 0A1.5 1.5 0 0 1 9.5 3V1H4a1 1 0 0 0-1 1v12a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V4.5z"
      );

      // Append the path element to the SVG
      svgElement.appendChild(pathElement);

      // Create a span element to display the file name
      var textElementsDiv = document.createElement("div");
      textElementsDiv.className = "flex flex-col";

      var spanElement = document.createElement("span");
      spanElement.textContent = fileName;
      spanElement.className =
        "text-gray-800 dark:text-gray-200 font-semibold hover:underline cursor-pointer transition duration-300 ease-in-out hover:text-blue-500"; // Add hover effect

      var spanElement2 = document.createElement("span");
      spanElement2.textContent = `(${(size / 1024 / 1024).toFixed(2)} MB)`;
      spanElement2.className = "text-gray-500 dark:text-gray-400 text-sm";

      // Append the SVG and span elements to the div
      mediaElement.appendChild(svgElement);
      textElementsDiv.appendChild(spanElement);
      textElementsDiv.appendChild(spanElement2);
      mediaElement.appendChild(textElementsDiv);
    }

    mediaElement.src = url;
    mediaElement.style.cursor = "pointer";

    messageData.attachment = { html: mediaElement, blob: size };

    // Add an event listener to the image that opens a new tab with the image's source URL when clicked
    mediaElement.addEventListener("click", function () {
      window.open(this.src, "_blank");
    });

    // Append the image to the body
    addMessageToChat(messageData);
  }
}
