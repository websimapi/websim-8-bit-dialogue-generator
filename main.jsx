import React from "react";
import { createRoot } from "react-dom/client";
import { DialogueGenerator } from "./DialogueGenerator.js";
document.addEventListener("DOMContentLoaded", () => {
  window.dialogueGenerator = new DialogueGenerator();
});
