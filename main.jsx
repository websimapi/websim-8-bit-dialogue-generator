import React from "react";
import { createRoot } from "react-dom/client";
import { DialogueGenerator } from "./DialogueGenerator.js";
function initializeApp() {
  try {
    window.dialogueGenerator = new DialogueGenerator();
    console.log("Dialogue Generator initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Dialogue Generator:", error);
  }
}
if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeApp);
} else {
  initializeApp();
}
