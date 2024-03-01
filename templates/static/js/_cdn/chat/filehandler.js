import { websocket } from './websocket.js';

const imageButton = document.getElementById("image-button");
const fileInput = document.getElementById("file-input");
const previewContainer = document.getElementById("preview-container");

imageButton.addEventListener("click", () => {
  fileInput.click();
});

let selectedFile; // Store the selected file

export function setSelectedFile(file) {
    selectedFile = file;
}

export function getSelectedFile() {
    return selectedFile;
}

export function sendFileToWs() {
  return new Promise((resolve, reject) => {
    if (!selectedFile) {
      console.log("No file selected");
      reject("No file selected");
      return;
    }

    if (websocket.readyState !== WebSocket.OPEN) {
      console.log("WebSocket is not open");
      reject("WebSocket is not open");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const arrayBuffer = new Uint8Array(event.target.result);
      let binary = "";
      const len = arrayBuffer.byteLength;
      for (let i = 0; i < len; i++) {
        binary += String.fromCharCode(arrayBuffer[i]);
      }
      const base64Data = window.btoa(binary);

      // Send the file information and the base64 string over the WebSocket connection
      websocket.send(
        JSON.stringify({
          type: "file",
          fileName: selectedFile.name,
          fileType: selectedFile.type,
          fileData: base64Data,
        })
      );

      resolve(); // Resolve the promise
    };
    reader.onerror = (error) => {
      console.log("Error reading file:", error);
      reject(error);
    };
    reader.readAsArrayBuffer(selectedFile);
  });
}

export function renderFilePreview(file) {
  const reader = new FileReader();
  reader.onload = (e) => {
    const fileType = file.type;
    previewContainer.innerHTML = ""; // Clear the preview container

    const previewDiv = document.createElement("div");
    previewDiv.classList.add("relative", "mb-4");
    previewDiv.style.maxWidth = "25%";

    const innerDiv = document.createElement("div");
    innerDiv.className = "relative flex flex-col bg-gray-900 rounded-md pb-12 pt-6 px-6 shadow-lg items-center justify-center w-1/2";

    let previewElement;

    if (fileType.startsWith("image/")) {
      previewElement = document.createElement("img");
      previewElement.src = e.target.result;
      previewElement.alt = file.name;
      previewElement.className = "rounded-sm";
    } else if (fileType.startsWith("audio/")) {
      previewElement = document.createElement("audio");
      previewElement.src = e.target.result;
      previewElement.controls = true;
    } else if (fileType.startsWith("video/")) {
      previewElement = document.createElement("video");
      previewElement.src = e.target.result;
      previewElement.controls = true;
      previewElement.className = "rounded-sm";
    } else {
      previewElement = document.createElement("p");
      previewElement.textContent = "Preview not available for this file type";
    }

    innerDiv.appendChild(previewElement);
    previewDiv.appendChild(innerDiv);
    previewContainer.appendChild(previewDiv);
    previewContainer.classList.remove("hidden");
    addDeleteButton(innerDiv);
    addFileName(innerDiv, file.name);
  };
  reader.readAsDataURL(file);
}

export function handleFileEvent(file) {
  if (file.size > 10 * 1024 * 1024) {
    // 10MB
    showAlert("File size must not exceed 10MB.");
    console.log(
      `%cFile size must not exceed 10MB.`,
      "color: red; font-size: 15px; background-color: #161724; padding: 5px 10px;"
    );
    return;
  }

  selectedFile = file; // Store the selected file
  renderFilePreview(selectedFile);
}

fileInput.addEventListener("change", (event) => {
  const file = event.target.files[0];
  handleFileEvent(file);
});

export function addFileName(innerDiv, fileName) {
  const fileNameAb = document.createElement("p");
  fileNameAb.textContent = fileName
  fileNameAb.className = "absolute bottom-2 left-2 z-10 line-clamp-1 text-sm text-gray-600 w-full";
  innerDiv.appendChild(fileNameAb);
}

export function addDeleteButton(innerDiv) {
  const deleteButton = document.createElement("div");
  deleteButton.classList.add(
    "absolute",
    "top-2",
    "right-2",
    "cursor-pointer",
    "p-2",
    "hover:text-red-500",
    "bg-gray-400",
    "hover:bg-gray-600",
    "rounded-md",
    "shadow-lg",
    "z-10"
  );
  deleteButton.innerHTML = `
    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" class="bi bi-trash" viewBox="0 0 16 16">
      <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
      <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
    </svg>
    `;
  deleteButton.addEventListener("click", () => {
    // Hide the preview container
    previewContainer.classList.add("hidden");
    // Clear the file input
    fileInput.value = "";
    // Remove the child elements of the preview container
    while (previewContainer.firstChild) {
      previewContainer.firstChild.remove();
    }
  });
  innerDiv.appendChild(deleteButton);
}