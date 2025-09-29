import { jsxDEV } from "react/jsx-dev-runtime";
import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@websim/remotion/player";
import { DialogueComposition } from "./composition.jsx";
import { Input, ALL_FORMATS, BlobSource } from "mediabunny";
const FPS = 30;
const DURATION_SAFETY_FRAMES = 30;
class DialogueGenerator {
  constructor() {
    this.baseCanvas = document.getElementById("baseFrameCanvas");
    this.talkingCanvas = document.getElementById("talkingFrameCanvas");
    this.previewCanvas = document.getElementById("previewCanvas");
    this.basePromptInput = document.getElementById("basePrompt");
    this.talkingPromptInput = document.getElementById("talkingPrompt");
    this.dialogueTextInput = document.getElementById("dialogueText");
    this.audioPlayer = document.getElementById("audioPlayer");
    this.ttsDurationDisplay = document.getElementById("ttsDuration");
    this.baseCtx = this.baseCanvas.getContext("2d");
    this.talkingCtx = this.talkingCanvas.getContext("2d");
    this.previewCtx = this.previewCanvas.getContext("2d");
    this.baseFrameData = null;
    this.talkingFrameData = null;
    this.audioUrl = null;
    this.audioDurationSeconds = 0;
    this.loopIntervalId = null;
    this.isGenerating = false;
    this.reactRoot = null;
    this.CHARACTER_STORAGE_KEY = "8bit_dialogue_character";
    this.initializeCanvases([this.baseCtx, this.talkingCtx, this.previewCtx]);
    this.bindEvents();
    this.updateUIState();
    this.loadCharacterFromStorage();
  }
  initializeCanvases(contexts) {
    contexts.forEach((ctx) => {
      ctx.imageSmoothingEnabled = false;
      ctx.webkitImageSmoothingEnabled = false;
      ctx.mozImageSmoothingEnabled = false;
      ctx.msImageSmoothingEnabled = false;
      ctx.fillStyle = "#1a1a2e";
      ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
    });
  }
  bindEvents() {
    document.getElementById("generateBaseFrame").addEventListener("click", () => this.generateBaseFrame());
    document.getElementById("generateTalkingFrame").addEventListener("click", () => this.generateTalkingFrame());
    document.getElementById("cleanupBaseFrame").addEventListener("click", () => this.cleanupBaseFrame());
    document.getElementById("previewLoop").addEventListener("click", () => this.startPreviewLoop());
    document.getElementById("stopLoop").addEventListener("click", () => this.stopPreviewLoop());
    document.getElementById("generateClip").addEventListener("click", () => this.generateClip());
    document.getElementById("saveCharacter").addEventListener("click", () => this.saveCharacter());
    document.getElementById("loadCharacter").addEventListener("click", () => this.loadCharacterFromStorage(true));
    document.getElementById("newCharacter").addEventListener("click", () => this.newCharacter());
    this.dialogueTextInput.addEventListener("input", () => this.handleDialogueChange());
  }
  updateUIState() {
    const hasBase = !!this.baseFrameData;
    const hasTalking = !!this.talkingFrameData;
    const hasDialogue = this.dialogueTextInput.value.trim().length > 0;
    this.basePromptInput.disabled = this.isGenerating || hasBase;
    document.getElementById("generateBaseFrame").disabled = this.isGenerating;
    document.getElementById("cleanupBaseFrame").disabled = this.isGenerating || !hasBase;
    this.talkingCanvas.classList.toggle("hidden", !hasBase);
    this.talkingPromptInput.disabled = this.isGenerating || !hasBase;
    document.getElementById("generateTalkingFrame").disabled = this.isGenerating || !hasBase;
    document.getElementById("previewLoop").disabled = this.isGenerating || !hasTalking || this.loopIntervalId !== null;
    document.getElementById("stopLoop").disabled = this.loopIntervalId === null;
    document.getElementById("generateClip").disabled = this.isGenerating || !hasTalking || !hasDialogue;
    document.getElementById("saveCharacter").disabled = !hasTalking;
  }
  showLoading(target, show) {
    let loadingIconId;
    let btnTextClass;
    let btn;
    if (target === "clip") {
      loadingIconId = "clipLoadingIcon";
      btnTextClass = "clip-text";
      btn = document.getElementById("generateClip");
    } else if (target === "cleanup") {
      loadingIconId = "cleanupLoadingIcon";
      btnTextClass = "cleanup-text";
      btn = document.getElementById("cleanupBaseFrame");
    } else {
      loadingIconId = target + "LoadingIcon";
      btnTextClass = target + "-text";
      btn = document.getElementById("generate" + target.charAt(0).toUpperCase() + target.slice(1) + "Frame");
    }
    const loadingIcon = document.getElementById(loadingIconId);
    const btnText = btn.querySelector("." + btnTextClass);
    this.isGenerating = show;
    if (show) {
      loadingIcon.style.display = "block";
      btnText.style.opacity = "0";
    } else {
      loadingIcon.style.display = "none";
      btnText.style.opacity = "1";
    }
    this.updateUIState();
  }
  async loadImageToCanvas(imageUrl, canvasContext) {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => {
        canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        canvasContext.drawImage(img, 0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
        resolve();
      };
      img.onerror = reject;
      img.src = imageUrl;
    });
  }
  async _refineBasePrompt(userPrompt) {
    const systemMessage = `You are a creative prompt refinement expert for 8-bit pixel art image generation. 
        The user is providing a prompt for a character who will be used in a dialogue sequence.
        Your task is to rewrite the user's prompt to ensure the resulting image is:
        1. An extreme close-up view of the character's face/upper body, suitable for a dialogue portrait, filling most of the 320x240 frame, usually the top 2/3rds.
        2. Strictly adheres to a retro 8-bit pixel art aesthetic (low resolution, limited color palette, visible pixels).
        3. The composition must clearly define a reserved area at the bottom 1/3rd of the frame for a user interface or text overlay. This area should maintain the background environment style but must NOT contain any text, writing, or explicit UI elements like a named 'dialogue box'.
        4. Must be a single, detailed, image generation prompt.

        Example refinement: If the user says "a dragon in a cave", you might output "Extreme close-up 8-bit pixel art portrait of a fierce red dragon's head inside a dimly lit cave, smoke gently rising. The bottom third of the frame is reserved for a clear RPG user interface text space. High contrast, limited color palette, low resolution 320x240."

        Respond only with the refined prompt string, following the constraints, and no other conversational text.`;
    try {
      const completion = await websim.chat.completions.create({
        messages: [
          {
            role: "system",
            content: systemMessage
          },
          {
            role: "user",
            content: userPrompt
          }
        ]
      });
      return completion.content.trim();
    } catch (error) {
      console.error("Error refining prompt:", error);
      return `Extreme close-up 8-bit pixel art portrait of a character. ${userPrompt}. Include a clear area for game UI/text at the bottom, but no dialogue box text. High quality 8-bit pixel art, low resolution 320x240, limited color palette, retro video game aesthetic.`;
    }
  }
  async generateBaseFrame() {
    const prompt = this.basePromptInput.value.trim();
    if (!prompt) {
      alert("Please provide a prompt for the base frame.");
      return;
    }
    this.showLoading("base", true);
    document.getElementById("baseStatus").textContent = "Refining prompt (AI thinking)...";
    this.stopPreviewLoop();
    this.clearClipPlayer();
    this.talkingFrameData = null;
    this.initializeCanvases([this.talkingCtx]);
    document.getElementById("talkingStatus").textContent = "";
    try {
      const refinedPrompt = await this._refineBasePrompt(prompt);
      console.log("Refined Base Prompt:", refinedPrompt);
      document.getElementById("baseStatus").textContent = "Generating image...";
      const result = await websim.imageGen({
        prompt: refinedPrompt,
        width: 320,
        height: 240,
        aspect_ratio: "4:3"
      });
      await this.loadImageToCanvas(result.url, this.baseCtx);
      this.baseFrameData = this.baseCanvas.toDataURL("image/png");
      this.previewCtx.drawImage(this.baseCanvas, 0, 0);
      document.getElementById("baseStatus").textContent = "Base Frame Ready!";
      this.talkingPromptInput.value = "The character opens their mouth slightly to speak, maintaining the exact position and background. ONLY change the mouth.";
    } catch (error) {
      console.error("Error generating base frame:", error);
      document.getElementById("baseStatus").textContent = "Generation Failed.";
      this.baseFrameData = null;
    } finally {
      this.showLoading("base", false);
      this.updateUIState();
    }
  }
  async generateTalkingFrame() {
    if (!this.baseFrameData) return;
    const prompt = this.talkingPromptInput.value.trim();
    if (!prompt) {
      alert("Please provide a prompt for the talking frame difference.");
      return;
    }
    this.showLoading("talking", true);
    document.getElementById("talkingStatus").textContent = "Generating...";
    try {
      const fullPrompt = `Based EXCLUSIVELY on the input image, generate a new image that is pixel-for-pixel identical to the input image except for a slight modification to the character's face/mouth: ${prompt}. Maintain the 8-bit pixel art style, 320x240 resolution, and limited color palette exactly. DO NOT alter the background, lighting, position, scale, or any part of the image outside the immediate area of the mouth opening. Strict 1:1 registration required.`;
      const result = await websim.imageGen({
        prompt: fullPrompt,
        width: 320,
        height: 240,
        aspect_ratio: "4:3",
        image_inputs: [{
          url: this.baseFrameData
        }]
      });
      await this.loadImageToCanvas(result.url, this.talkingCtx);
      this.talkingFrameData = this.talkingCanvas.toDataURL("image/png");
      document.getElementById("talkingStatus").textContent = "Talking Frame Ready!";
      this.startPreviewLoop();
    } catch (error) {
      console.error("Error generating talking frame:", error);
      document.getElementById("talkingStatus").textContent = "Generation Failed.";
      this.talkingFrameData = null;
    } finally {
      this.showLoading("talking", false);
      this.updateUIState();
    }
  }
  async cleanupBaseFrame() {
    if (!this.baseFrameData) return;
    this.showLoading("cleanup", true);
    document.getElementById("baseStatus").textContent = "Cleaning up base frame (AI Refine)...";
    try {
      this.stopPreviewLoop();
      this.clearClipPlayer();
      const userPrompt = this.basePromptInput.value.trim();
      const refinedPrompt = await this._refineBasePrompt(userPrompt);
      const cleanupPrompt = `Refine and clean up this 8-bit pixel art image based on the prompt: "${refinedPrompt}". Ensure the character remains in the extreme close-up view and the background and composition are preserved exactly. Focus on removing minor artifacts and improving overall pixel consistency and quality, while strictly maintaining the 8-bit pixel art aesthetic.`;
      const result = await websim.imageGen({
        prompt: cleanupPrompt,
        width: 320,
        height: 240,
        aspect_ratio: "4:3",
        image_inputs: [{
          url: this.baseFrameData
        }]
      });
      await this.loadImageToCanvas(result.url, this.baseCtx);
      this.baseFrameData = this.baseCanvas.toDataURL("image/png");
      this.previewCtx.drawImage(this.baseCanvas, 0, 0);
      document.getElementById("baseStatus").textContent = "Base Frame Cleaned Up Successfully!";
      this.talkingFrameData = null;
      this.initializeCanvases([this.talkingCtx]);
      document.getElementById("talkingStatus").textContent = "Talking Frame invalidated. Please regenerate.";
    } catch (error) {
      console.error("Error cleaning up base frame:", error);
      document.getElementById("baseStatus").textContent = "Cleanup Failed.";
    } finally {
      this.showLoading("cleanup", false);
      this.updateUIState();
    }
  }
  startPreviewLoop() {
    if (!this.baseFrameData || !this.talkingFrameData || this.loopIntervalId !== null) return;
    this.clearClipPlayer();
    const baseImg = new Image();
    baseImg.src = this.baseFrameData;
    const talkingImg = new Image();
    talkingImg.src = this.talkingFrameData;
    let frameToggle = true;
    const drawFrame = () => {
      this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      if (baseImg.complete && talkingImg.complete) {
        const img = frameToggle ? baseImg : talkingImg;
        this.previewCtx.drawImage(img, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
        frameToggle = !frameToggle;
      } else {
        this.previewCtx.fillStyle = "red";
        this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
      }
    };
    this.loopIntervalId = setInterval(drawFrame, 125);
    this.updateUIState();
  }
  stopPreviewLoop() {
    if (this.loopIntervalId) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
      if (this.baseFrameData) {
        this.loadImageToCanvas(this.baseFrameData, this.previewCtx);
      }
      this.updateUIState();
    }
  }
  handleDialogueChange() {
    this.audioUrl = null;
    this.audioPlayer.style.display = "none";
    this.ttsDurationDisplay.textContent = "";
    this.clearClipPlayer();
    this.updateUIState();
  }
  async generateClip() {
    if (!this.baseFrameData || !this.talkingFrameData) return alert("Please generate both character frames first.");
    const dialogueText = this.dialogueTextInput.value.trim();
    if (!dialogueText) return alert("Please enter dialogue text.");
    this.stopPreviewLoop();
    this.clearClipPlayer();
    this.showLoading("clip", true);
    try {
      document.getElementById("clipStatus").textContent = "Generating TTS audio...";
      const ttsResult = await websim.textToSpeech({
        text: dialogueText,
        voice: "en-male"
        // Default voice
      });
      this.audioUrl = ttsResult.url;
      this.audioPlayer.src = this.audioUrl;
      this.audioPlayer.style.display = "block";
      document.getElementById("clipStatus").textContent = "Calculating audio duration...";
      const audioBlob = await (await fetch(this.audioUrl)).blob();
      const input = new Input({ source: new BlobSource(audioBlob), formats: ALL_FORMATS });
      this.audioDurationSeconds = await input.computeDuration();
      if (isNaN(this.audioDurationSeconds) || this.audioDurationSeconds === 0) {
        this.audioDurationSeconds = Math.max(dialogueText.length * 0.08, 1.5);
      }
      this.ttsDurationDisplay.textContent = `Audio Duration: ${this.audioDurationSeconds.toFixed(2)} seconds`;
      const durationInFrames = Math.ceil(this.audioDurationSeconds * FPS) + DURATION_SAFETY_FRAMES;
      document.getElementById("clipStatus").textContent = "Rendering video clip...";
      const clipContainer = document.getElementById("clipContainer");
      clipContainer.style.display = "block";
      this.previewCanvas.classList.add("hidden");
      if (this.reactRoot) {
        this.reactRoot.unmount();
      }
      this.reactRoot = createRoot(clipContainer);
      this.reactRoot.render(
        /* @__PURE__ */ jsxDEV("div", { style: { width: "100%", height: "100%" }, children: /* @__PURE__ */ jsxDEV(
          Player,
          {
            component: DialogueComposition,
            durationInFrames,
            fps: FPS,
            compositionWidth: 320,
            compositionHeight: 240,
            loop: false,
            controls: true,
            inputProps: {
              baseFrameUrl: this.baseFrameData,
              talkingFrameUrl: this.talkingFrameData,
              audioUrl: this.audioUrl,
              audioDurationSeconds: this.audioDurationSeconds
            },
            autoplay: false,
            style: { maxWidth: "100%", maxHeight: "100%" }
          },
          void 0,
          false,
          {
            fileName: "<stdin>",
            lineNumber: 430,
            columnNumber: 21
          },
          this
        ) }, void 0, false, {
          fileName: "<stdin>",
          lineNumber: 429,
          columnNumber: 17
        }, this)
      );
      document.getElementById("clipStatus").textContent = "Clip Ready! Press Play on the video player.";
    } catch (error) {
      console.error("Error generating clip:", error);
      document.getElementById("clipStatus").textContent = "Clip Generation Failed.";
      this.audioUrl = null;
    } finally {
      this.showLoading("clip", false);
      this.updateUIState();
    }
  }
  clearClipPlayer() {
    const clipContainer = document.getElementById("clipContainer");
    clipContainer.style.display = "none";
    this.previewCanvas.classList.remove("hidden");
    if (this.reactRoot) {
      this.reactRoot.unmount();
      this.reactRoot = null;
    }
  }
  // --- Storage & Reset Methods ---
  saveCharacter() {
    if (!this.baseFrameData || !this.talkingFrameData) {
      alert("Please generate both frames before saving.");
      return;
    }
    try {
      const characterData = {
        basePrompt: this.basePromptInput.value,
        talkingPrompt: this.talkingPromptInput.value,
        baseFrameData: this.baseFrameData,
        talkingFrameData: this.talkingFrameData
      };
      localStorage.setItem(this.CHARACTER_STORAGE_KEY, JSON.stringify(characterData));
      alert("Character saved successfully!");
    } catch (e) {
      console.error("Failed to save character:", e);
      alert("Failed to save character. Local storage might be full.");
    }
  }
  loadCharacterFromStorage(userInitiated = false) {
    try {
      const storedData = localStorage.getItem(this.CHARACTER_STORAGE_KEY);
      if (storedData) {
        const data = JSON.parse(storedData);
        this.baseFrameData = data.baseFrameData;
        this.talkingFrameData = data.talkingFrameData;
        this.basePromptInput.value = data.basePrompt || "";
        this.talkingPromptInput.value = data.talkingPrompt || "";
        if (this.baseFrameData) {
          this.loadImageToCanvas(this.baseFrameData, this.baseCtx).then(() => {
            this.previewCtx.drawImage(this.baseCanvas, 0, 0);
            document.getElementById("baseStatus").textContent = "Base Frame Loaded!";
          });
        }
        if (this.talkingFrameData) {
          this.loadImageToCanvas(this.talkingFrameData, this.talkingCtx).then(() => {
            document.getElementById("talkingStatus").textContent = "Talking Frame Loaded!";
          });
        }
        if (userInitiated) {
          alert("Character loaded successfully!");
        }
      } else if (userInitiated) {
        alert("No saved character found.");
      }
    } catch (e) {
      console.error("Failed to load character:", e);
      if (userInitiated) {
        alert("Failed to load character data.");
      }
    } finally {
      this.updateUIState();
    }
  }
  newCharacter() {
    if (this.baseFrameData && !confirm("Are you sure you want to start a new character? Unsaved changes will be lost.")) {
      return;
    }
    this.stopPreviewLoop();
    this.clearClipPlayer();
    this.baseFrameData = null;
    this.talkingFrameData = null;
    this.audioUrl = null;
    this.audioDurationSeconds = 0;
    this.basePromptInput.value = "";
    this.talkingPromptInput.value = "";
    this.dialogueTextInput.value = "";
    this.audioPlayer.style.display = "none";
    this.audioPlayer.src = "";
    this.ttsDurationDisplay.textContent = "";
    this.initializeCanvases([this.baseCtx, this.talkingCtx, this.previewCtx]);
    document.getElementById("baseStatus").textContent = "";
    document.getElementById("talkingStatus").textContent = "";
    document.getElementById("clipStatus").textContent = "";
    this.updateUIState();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  window.dialogueGenerator = new DialogueGenerator();
});
