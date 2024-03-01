import { websocket } from "./websocket.js";

const titleElement = document.getElementById("chat-title");
const descriptionElement = document.getElementById("chat-description");

titleElement.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevents the default action (creation of a new line)
    const title = titleElement.textContent;
    // Send the new title to the server
    websocket.send(JSON.stringify({ type: "title", title: title }));
    // Deselect the title element
    titleElement.blur();
  }
});

descriptionElement.addEventListener("keydown", function (event) {
  if (event.key === "Enter") {
    event.preventDefault(); // Prevents the default action (creation of a new line)
    const description = descriptionElement.textContent;
    // Send the new description to the server
    websocket.send(
      JSON.stringify({ type: "description", description: description })
    );
    // Deselect the description element
    descriptionElement.blur();
  }
});