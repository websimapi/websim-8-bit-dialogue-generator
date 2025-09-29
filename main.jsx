import React from "react";
import { createRoot } from "react-dom/client";
import { Player } from "@websim/remotion/player";
import { DialogueComposition } from "./composition.jsx";
import { Input, ALL_FORMATS, BlobSource } from "mediabunny";
import { CanvasManager } from "./canvas-manager.js";
import { UIManager } from "./ui-manager.js";
import { GeneratorService } from "./generator-service.js";
import { ClipManager } from "./clip-manager.js";
import { StorageManager } from "./storage-manager.js";
const FPS = 30;
const FRAME_SWITCH_INTERVAL_MS = 125;
class DialogueGenerator {
  constructor() {
    this.CHARACTER_STORAGE_KEY = "8bit_dialogue_character";
    this.baseFrameData = null;
    this.talkingFrameData = null;
    this.audioUrl = null;
    this.audioDurationSeconds = 0;
    this.loopIntervalId = null;
    this.canvasManager = new CanvasManager(
      "baseFrameCanvas",
      "talkingFrameCanvas",
      "previewCanvas"
    );
    this.uiManager = new UIManager({
      generateBaseFrame: this.generateBaseFrame.bind(this),
      generateTalkingFrame: this.generateTalkingFrame.bind(this),
      cleanupBaseFrame: this.cleanupBaseFrame.bind(this),
      startPreviewLoop: this.startPreviewLoop.bind(this),
      stopPreviewLoop: this.stopPreviewLoop.bind(this),
      generateClip: this.generateClip.bind(this),
      saveCharacter: this.saveCharacter.bind(this),
      loadCharacter: this.loadCharacterFromStorage.bind(this),
      newCharacter: this.newCharacter.bind(this),
      handleDialogueChange: this.handleDialogueChange.bind(this)
    });
    this.generatorService = new GeneratorService();
    this.clipManager = new ClipManager(
      "clipContainer",
      "previewCanvas"
    );
    this.storageManager = new StorageManager(this.CHARACTER_STORAGE_KEY);
    this._updateUI();
    this.loadCharacterFromStorage(false);
  }
  // Internal UI update helper
  _updateUI() {
    const hasBase = !!this.baseFrameData;
    const hasTalking = !!this.talkingFrameData;
    const hasDialogue = this.uiManager.getDialogueText().length > 0;
    this.uiManager.updateUIState(hasBase, hasTalking, hasDialogue);
  }
  async generateBaseFrame() {
    const prompt = this.uiManager.getPrompt("base");
    if (!prompt) {
      alert("Please provide a prompt for the base frame.");
      return;
    }
    this.uiManager.showLoading("base", true);
    this.uiManager.setStatus("baseStatus", "Refining prompt (AI thinking)...");
    this.stopPreviewLoop();
    this.clipManager.clearClipPlayer();
    this.talkingFrameData = null;
    this.canvasManager.clearTalkingCanvas();
    this.uiManager.setStatus("talkingStatus", "");
    try {
      const { url, refinedPrompt } = await this.generatorService.generateBaseFrame(prompt);
      this.uiManager.setStatus("baseStatus", "Generating image...");
      await this.canvasManager.loadImageToCanvas(url, this.canvasManager.baseCtx);
      this.baseFrameData = this.canvasManager.baseCanvas.toDataURL("image/png");
      this.canvasManager.drawBaseFrameToPreview(this.baseFrameData);
      this.uiManager.setStatus("baseStatus", "Base Frame Ready!");
      this.uiManager.setPrompt("talking", "The character opens their mouth slightly to speak, maintaining the exact position and background. ONLY change the mouth.");
    } catch (error) {
      console.error("Error generating base frame:", error);
      this.uiManager.setStatus("baseStatus", "Generation Failed.");
      this.baseFrameData = null;
    } finally {
      this.uiManager.showLoading("base", false);
      this._updateUI();
    }
  }
  async generateTalkingFrame() {
    if (!this.baseFrameData) return;
    const prompt = this.uiManager.getPrompt("talking");
    if (!prompt) {
      alert("Please provide a prompt for the talking frame difference.");
      return;
    }
    this.uiManager.showLoading("talking", true);
    this.uiManager.setStatus("talkingStatus", "Generating...");
    try {
      const url = await this.generatorService.generateTalkingFrame(this.baseFrameData, prompt);
      await this.canvasManager.loadImageToCanvas(url, this.canvasManager.talkingCtx);
      this.talkingFrameData = this.canvasManager.talkingCanvas.toDataURL("image/png");
      this.uiManager.setStatus("talkingStatus", "Talking Frame Ready!");
      this.startPreviewLoop();
    } catch (error) {
      console.error("Error generating talking frame:", error);
      this.uiManager.setStatus("talkingStatus", "Generation Failed.");
      this.talkingFrameData = null;
    } finally {
      this.uiManager.showLoading("talking", false);
      this._updateUI();
    }
  }
  async cleanupBaseFrame() {
    if (!this.baseFrameData) return;
    this.uiManager.showLoading("cleanup", true);
    this.uiManager.setStatus("baseStatus", "Cleaning up base frame (AI Refine)...");
    try {
      this.stopPreviewLoop();
      this.clipManager.clearClipPlayer();
      const userPrompt = this.uiManager.getPrompt("base");
      const url = await this.generatorService.cleanupBaseFrame(this.baseFrameData, userPrompt);
      await this.canvasManager.loadImageToCanvas(url, this.canvasManager.baseCtx);
      this.baseFrameData = this.canvasManager.baseCanvas.toDataURL("image/png");
      this.canvasManager.drawBaseFrameToPreview(this.baseFrameData);
      this.uiManager.setStatus("baseStatus", "Base Frame Cleaned Up Successfully!");
      this.talkingFrameData = null;
      this.canvasManager.clearTalkingCanvas();
      this.uiManager.setStatus("talkingStatus", "Talking Frame invalidated. Please regenerate.");
    } catch (error) {
      console.error("Error cleaning up base frame:", error);
      this.uiManager.setStatus("baseStatus", "Cleanup Failed.");
    } finally {
      this.uiManager.showLoading("cleanup", false);
      this._updateUI();
    }
  }
  startPreviewLoop() {
    if (!this.baseFrameData || !this.talkingFrameData || this.loopIntervalId !== null) return;
    this.clipManager.clearClipPlayer();
    const baseImg = new Image();
    baseImg.src = this.baseFrameData;
    const talkingImg = new Image();
    talkingImg.src = this.talkingFrameData;
    let frameToggle = true;
    const drawFrame = () => {
      const ctx = this.canvasManager.previewCtx;
      const canvas = this.canvasManager.previewCanvas;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (baseImg.complete && talkingImg.complete) {
        const img = frameToggle ? baseImg : talkingImg;
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        frameToggle = !frameToggle;
      } else {
        ctx.fillStyle = "red";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
    };
    this.loopIntervalId = setInterval(drawFrame, FRAME_SWITCH_INTERVAL_MS);
    this.uiManager.setLoopState(this.loopIntervalId);
    this._updateUI();
  }
  stopPreviewLoop() {
    if (this.loopIntervalId) {
      clearInterval(this.loopIntervalId);
      this.loopIntervalId = null;
      this.uiManager.setLoopState(null);
      if (this.baseFrameData) {
        this.canvasManager.drawBaseFrameToPreview(this.baseFrameData);
      }
      this._updateUI();
    }
  }
  handleDialogueChange() {
    this.audioUrl = null;
    this.audioDurationSeconds = 0;
    this.uiManager.hideAudioPlayer();
    this.clipManager.clearClipPlayer();
    this._updateUI();
  }
  async generateClip() {
    if (!this.baseFrameData || !this.talkingFrameData) return alert("Please generate both character frames first.");
    const dialogueText = this.uiManager.getDialogueText();
    if (!dialogueText) return alert("Please enter dialogue text.");
    this.stopPreviewLoop();
    this.clipManager.clearClipPlayer();
    this.uiManager.showLoading("clip", true);
    try {
      this.uiManager.setStatus("clipStatus", "Generating TTS audio...");
      const { audioUrl, audioDurationSeconds } = await this.clipManager.generateAudio(dialogueText);
      this.audioUrl = audioUrl;
      this.audioDurationSeconds = audioDurationSeconds;
      this.uiManager.setAudioSource(this.audioUrl);
      this.uiManager.displayDuration(this.audioDurationSeconds);
      this.uiManager.setStatus("clipStatus", "Rendering video clip...");
      this.clipManager.mountClipPlayer(
        this.baseFrameData,
        this.talkingFrameData,
        this.audioUrl,
        this.audioDurationSeconds
      );
      this.uiManager.setStatus("clipStatus", "Clip Ready! Press Play on the video player.");
    } catch (error) {
      console.error("Error generating clip:", error);
      this.uiManager.setStatus("clipStatus", "Clip Generation Failed.");
      this.audioUrl = null;
    } finally {
      this.uiManager.showLoading("clip", false);
      this._updateUI();
    }
  }
  // --- Storage & Reset Methods ---
  saveCharacter() {
    try {
      this.storageManager.saveCharacter(
        this.uiManager.getPrompt("base"),
        this.uiManager.getPrompt("talking"),
        this.baseFrameData,
        this.talkingFrameData
      );
      alert("Character saved successfully!");
    } catch (e) {
      console.error("Failed to save character:", e);
      alert("Failed to save character. Ensure both frames are generated.");
    }
  }
  async loadCharacterFromStorage(userInitiated = false) {
    try {
      const data = this.storageManager.loadCharacter();
      if (data) {
        this.baseFrameData = data.baseFrameData;
        this.talkingFrameData = data.talkingFrameData;
        this.uiManager.setPrompt("base", data.basePrompt || "");
        this.uiManager.setPrompt("talking", data.talkingPrompt || "");
        if (this.baseFrameData) {
          await this.canvasManager.loadImageToCanvas(this.baseFrameData, this.canvasManager.baseCtx);
          this.canvasManager.drawBaseFrameToPreview(this.baseFrameData);
          this.uiManager.setStatus("baseStatus", "Base Frame Loaded!");
        }
        if (this.talkingFrameData) {
          await this.canvasManager.loadImageToCanvas(this.talkingFrameData, this.canvasManager.talkingCtx);
          this.uiManager.setStatus("talkingStatus", "Talking Frame Loaded!");
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
      this._updateUI();
    }
  }
  newCharacter() {
    if (this.baseFrameData && !confirm("Are you sure you want to start a new character? Unsaved changes will be lost.")) {
      return;
    }
    this.stopPreviewLoop();
    this.clipManager.clearClipPlayer();
    this.baseFrameData = null;
    this.talkingFrameData = null;
    this.audioUrl = null;
    this.audioDurationSeconds = 0;
    this.uiManager.setPrompt("base", "");
    this.uiManager.setPrompt("talking", "");
    this.uiManager.setPrompt("dialogue", "");
    this.uiManager.hideAudioPlayer();
    this.canvasManager.initializeCanvases([
      this.canvasManager.baseCtx,
      this.canvasManager.talkingCtx,
      this.canvasManager.previewCtx
    ]);
    this.uiManager.setStatus("baseStatus", "");
    this.uiManager.setStatus("talkingStatus", "");
    this.uiManager.setStatus("clipStatus", "");
    this._updateUI();
  }
}
document.addEventListener("DOMContentLoaded", () => {
  window.dialogueGenerator = new DialogueGenerator();
});
