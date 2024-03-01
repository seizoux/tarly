export function showAlert(message) {
  // Create the alert and backdrop elements
  const alertElement = document.createElement("div");
  const backdropElement = document.createElement("div");

  // Set the text content of the alert and add classes
  alertElement.textContent = message;
  alertElement.classList.add("alert");
  backdropElement.classList.add("backdrop");

  // Append the elements to the body of the document
  document.body.appendChild(backdropElement);
  document.body.appendChild(alertElement);

  // Remove the elements after 3 seconds
  setTimeout(() => {
    document.body.removeChild(alertElement);
    document.body.removeChild(backdropElement);
  }, 3000);
}

export function addMessageToChat(messageData) {
  const messageList = document.getElementById("message-list");
  const messageElement = document.createElement("div");

  let messageContent = messageData.message ? messageData.message : "";
  let lastMessage = messageList.lastElementChild;

  if (messageContent === "Unknown") {
    console.log(
      `%c❗MESSAGE NOT FOUND`,
      "color: red; font-size: 10px; background-color: #161724; padding: 5px 10px;"
    );
  } else {
    console.log(
      `%c✅ Message found, sending to the chat..`,
      "color: green; font-size: 10px; background-color: #161724; padding: 5px 10px;"
    );
  }

  if (
    lastMessage &&
    lastMessage.dataset.username === messageData.user.username &&
    lastMessage.dataset.userImage === messageData.user.image_url
  ) {
    // Append the new message to the last message's div
    let newMessageDiv = document.createElement("div");
    // If there's an attachment, append it to the messageContentDiv
    if (messageData.attachment) {
      newMessageDiv.appendChild(messageData.attachment.html);
      console.log(
        `%cAttachment found, appending to the message.`,
        "color: green; font-size: 10px; background-color: #161724; padding: 5px 10px;"
      );
    } else {
      // Split the message into words;
      formatText(messageContent, newMessageDiv);
    }
    lastMessage.querySelector(".message-content").appendChild(newMessageDiv);
    console.log(
      `%cMessage author is the same.`,
      "color: blue; font-size: 10px; background-color: #161724; padding: 5px 10px;"
    );
  } else {
    // Create a new message div with the image and name
    messageElement.className = "message";
    messageElement.dataset.username = messageData.user.username;
    messageElement.dataset.userImage = messageData.user.image_url;

    let userImage = document.createElement("img");
    userImage.className = "w-10 h-10 rounded-full";
    userImage.src = messageData.user.image_url;
    userImage.alt = "User Image";

    let userNameHolder = document.createElement("div");
    userNameHolder.className = "flex flex-row gap-2 items-center";
    let userName = document.createElement("span");
    userName.className = "font-semibold text-black dark:text-white";
    userName.textContent = messageData.user.username;
    
    userNameHolder.appendChild(userName);

    console.log(messageData)

    if (messageData.user.user) {
      if (messageData.user.user.hasOwnProperty('bot') && messageData.user.user.bot === true) {
        // Create an SVG element
        let botIcon = document.createElementNS("http://www.w3.org/2000/svg", "svg");
        botIcon.setAttribute("width", "18");
        botIcon.setAttribute("height", "18");
        botIcon.setAttribute("fill", "currentColor");
        botIcon.setAttribute("class", "bi bi-robot");
        botIcon.setAttribute("viewBox", "0 0 16 16");
        botIcon.innerHTML = '<path d="M6 12.5a.5.5 0 0 1 .5-.5h3a.5.5 0 0 1 0 1h-3a.5.5 0 0 1-.5-.5M3 8.062C3 6.76 4.235 5.765 5.53 5.886a26.6 26.6 0 0 0 4.94 0C11.765 5.765 13 6.76 13 8.062v1.157a.93.93 0 0 1-.765.935c-.845.147-2.34.346-4.235.346s-3.39-.2-4.235-.346A.93.93 0 0 1 3 9.219zm4.542-.827a.25.25 0 0 0-.217.068l-.92.9a25 25 0 0 1-1.871-.183.25.25 0 0 0-.068.495c.55.076 1.232.149 2.02.193a.25.25 0 0 0 .189-.071l.754-.736.847 1.71a.25.25 0 0 0 .404.062l.932-.97a25 25 0 0 0 1.922-.188.25.25 0 0 0-.068-.495c-.538.074-1.207.145-1.98.189a.25.25 0 0 0-.166.076l-.754.785-.842-1.7a.25.25 0 0 0-.182-.135"/><path d="M8.5 1.866a1 1 0 1 0-1 0V3h-2A4.5 4.5 0 0 0 1 7.5V8a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1a1 1 0 0 0 1-1V9a1 1 0 0 0-1-1v-.5A4.5 4.5 0 0 0 10.5 3h-2zM14 7.5V13a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7.5A3.5 3.5 0 0 1 5.5 4h5A3.5 3.5 0 0 1 14 7.5"/>';
    
        // Append the SVG to the username holder
        userNameHolder.appendChild(botIcon);
      }
    }

    function formatTime(messageTime, locale) {
      let options = { hour: "2-digit", minute: "2-digit", hour12: true };
      let today = new Date();
      let yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (messageTime.toDateString() === today.toDateString()) {
        return `${
          locale === locale ? "Today at" : ""
        } ${new Intl.DateTimeFormat(locale, options).format(messageTime)}`;
      } else if (messageTime.toDateString() === yesterday.toDateString()) {
        return `${
          locale === locale ? "Yesterday at" : ""
        } ${new Intl.DateTimeFormat(locale, options).format(messageTime)}`;
      } else {
        return `${new Intl.DateTimeFormat(locale, {
          day: "numeric",
          month: "long",
          year: "numeric",
        }).format(messageTime)} at ${new Intl.DateTimeFormat(
          locale,
          options
        ).format(messageTime)}`;
      }
    }

    // Add the timestamp to the first message of each user
    let messageTime = new Date();
    let locale = messageData.user.locale;
    let formattedTime = formatTime(messageTime, locale);

    let timeElement = document.createElement("span");
    timeElement.className = "message-time";
    timeElement.textContent = formattedTime;
    timeElement.classList.add(
      "text-gray-500",
      "ml-2",
      "text-xs",
      "font-normal"
    );

    userNameHolder.appendChild(timeElement);

    let messageContentDiv = document.createElement("div");
    messageContentDiv.className = "message-content";

    // Split the message into words
    let result = messageContent ? messageContent : ""; // If the message is empty, use the file name

    formatText(result, messageContentDiv);

    // If there's an attachment, append it to the messageContentDiv
    if (messageData.attachment) {
      messageContentDiv.appendChild(messageData.attachment.html);
      console.log(
        `%cAttachment found, appending to the message.`,
        "color: green; font-size: 10px; background-color: #161724; padding: 5px 10px; margin-bottom: 10px;"
      );
    }

    let textWrapper = document.createElement("div");
    textWrapper.appendChild(userNameHolder);
    textWrapper.appendChild(messageContentDiv);

    let messageWrapper = document.createElement("div");
    messageWrapper.className = "flex items-start space-x-2 p-1";
    messageWrapper.style.marginBottom = "10px"; // Add space between messages
    messageWrapper.appendChild(userImage);
    messageWrapper.appendChild(textWrapper);

    messageElement.appendChild(messageWrapper);
    messageList.appendChild(messageElement);
    console.log(
      `%cMessage has been sent to the chat.`,
      "color: blue; font-size: 10px; background-color: #161724; padding: 5px 10px;"
    );
  }
  // Scroll to the bottom of the message list
  setTimeout(() => {
    messageList.lastElementChild.scrollIntoView({ block: "end" });
  }, 0);
  // Call MathJax.typeset() to render any math in the new message
  MathJax.typeset();
}

export function parseMarkdown(text) {
  let span = document.createElement("span");
  span.className = "text-black dark:text-white";

  let regex =
    /(\*\*(.*?)\*\*(?!\*))|(\*(?!\*)(.*?)\*)|(__(.*?)__)|(`(.*?)`)|((https?:\/\/[^\s]+))/g;
  let match;
  let lastIndex = 0;

  while ((match = regex.exec(text)) !== null) {
    // Add the text before the match as a text node
    if (match.index > lastIndex) {
      span.appendChild(
        document.createTextNode(text.slice(lastIndex, match.index))
      );
    }

    // Create a new span for the match
    let matchSpan = document.createElement("span");
    if (match[1]) {
      matchSpan.className = "font-bold";
      let innerSpan = parseMarkdown(match[2]);
      if (innerSpan.textContent.trim() !== "") {
        matchSpan.appendChild(innerSpan);
      }
    } else if (match[3]) {
      matchSpan.className = "italic";
      let innerSpan = parseMarkdown(match[4]);
      if (innerSpan.textContent.trim() !== "") {
        matchSpan.appendChild(innerSpan);
      }
    } else if (match[5]) {
      matchSpan.classList.add("underline", "underline-offset-2");
      let innerSpan = parseMarkdown(match[6]);
      if (innerSpan.textContent.trim() !== "") {
        matchSpan.appendChild(innerSpan);
      }
    } else if (match[7]) {
      matchSpan.classList.add(
        "bg-gray-600/75",
        "text-white",
        "p-1",
        "rounded-md"
      );
      let innerSpan = parseMarkdown(match[8]);
      if (innerSpan.textContent.trim() !== "") {
        matchSpan.appendChild(innerSpan);
      }
    } else if (match[9]) {
      let a = document.createElement("a");
      a.href = match[9];
      a.textContent = match[9];
      a.target = "_blank";
      a.classList.add("text-blue-500", "underline");
      span.appendChild(a);
    }

    // Append matchSpan only if it has child nodes
    if (matchSpan.hasChildNodes()) {
      span.appendChild(matchSpan);
    }

    lastIndex = regex.lastIndex;
  }

  // Add the text after the last match as a text node
  if (lastIndex < text.length) {
    span.appendChild(document.createTextNode(text.slice(lastIndex)));
  }

  return span;
}

export function formatText(message, messageContentDiv) {
  // Split the message into lines
  if (!message || message.trim() === "") {
    return;
  }

  let lines = message.split("\n");

  let inCodeBlock = false;
  let codeLines = [];
  let language = "";

  for (let line of lines) {
    if (line.startsWith("```")) {
      if (inCodeBlock) {
        // End of code block
        inCodeBlock = false;

        // Create a code element and set its class to the language
        let codeElement = document.createElement("code");
        codeElement.className = `language-${language}`;

        // Set the text of the code element to the actual code
        codeElement.textContent = codeLines.join("\n");

        // Create a pre element and append the code element to it
        let pre = document.createElement("pre");
        pre.className =
          "overflow-auto max-w-full border-gray-600 border-2 rounded-md inline-block w-auto"; // Add 'inline-block' and 'w-auto' classes
        pre.appendChild(codeElement);

        // Highlight the code using Prism
        Prism.highlightElement(codeElement);

        // Append the pre element to the messageContentDiv
        messageContentDiv.appendChild(pre);

        // Reset codeLines and language
        codeLines = [];
        language = "";
      } else {
        // Start of code block
        inCodeBlock = true;
        language = line.slice(3);
      }
    } else if (inCodeBlock) {
      // Inside a code block
      codeLines.push(line);
    } else {
      // Normal text
      let parsedLine = parseMarkdown(line);
      messageContentDiv.appendChild(parsedLine);
      let br = document.createElement("br");
      messageContentDiv.appendChild(br);
    }
  }
}

const themeToggleButton = document.getElementById("theme-toggle");

// Add the click event listener
themeToggleButton.addEventListener("click", () => {
  // Toggle the dark class on the body element
  document.body.classList.toggle("dark");
});

export function scrollToBottom() {
  const messageList = document.getElementById("message-list");
  messageList.scrollTop = messageList.scrollHeight;
}
