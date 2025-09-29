// canvas-manager.js

const CANVAS_WIDTH = 320;
const CANVAS_HEIGHT = 240;

export class CanvasManager {
    constructor(baseCanvasId, talkingCanvasId, previewCanvasId) {
        this.baseCanvas = document.getElementById(baseCanvasId);
        this.talkingCanvas = document.getElementById(talkingCanvasId);
        this.previewCanvas = document.getElementById(previewCanvasId);

        this.baseCtx = this.baseCanvas.getContext('2d');
        this.talkingCtx = this.talkingCanvas.getContext('2d');
        this.previewCtx = this.previewCanvas.getContext('2d');

        this.initializeCanvases([this.baseCtx, this.talkingCtx, this.previewCtx]);
    }

    initializeCanvases(contexts) {
        contexts.forEach(ctx => {
            // Set up canvas with pixelated rendering
            ctx.imageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.mozImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;

            // Fill with default background
            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        });
    }

    async loadImageToCanvas(imageUrl, canvasContext) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                canvasContext.clearRect(0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
                // Ensure image is drawn to fill the canvas dimensions (320x240)
                canvasContext.drawImage(img, 0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    drawBaseFrameToPreview(baseFrameData) {
        if (baseFrameData) {
            this.loadImageToCanvas(baseFrameData, this.previewCtx);
        }
    }

    clearTalkingCanvas() {
        this.initializeCanvases([this.talkingCtx]);
    }
}