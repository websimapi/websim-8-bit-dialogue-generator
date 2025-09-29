export class PreviewManager {
    constructor() {
        // Canvas elements and contexts
        this.baseCanvas = document.getElementById('baseFrameCanvas');
        this.talkingCanvas = document.getElementById('talkingFrameCanvas');
        this.previewCanvas = document.getElementById('previewCanvas');
        
        this.baseCtx = this.baseCanvas.getContext('2d');
        this.talkingCtx = this.talkingCanvas.getContext('2d');
        this.previewCtx = this.previewCanvas.getContext('2d');
        
        this.loopIntervalId = null;
    }

    initializeCanvases(contexts = [this.baseCtx, this.talkingCtx, this.previewCtx]) {
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
                canvasContext.drawImage(img, 0, 0, canvasContext.canvas.width, canvasContext.canvas.height);
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    startPreviewLoop(baseFrameData, talkingFrameData) {
        if (!baseFrameData || !talkingFrameData || this.loopIntervalId !== null) return;

        const baseImg = new Image();
        baseImg.src = baseFrameData;

        const talkingImg = new Image();
        talkingImg.src = talkingFrameData;

        let frameToggle = true; // true for base, false for talking

        const drawFrame = () => {
            this.previewCtx.clearRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            if (baseImg.complete && talkingImg.complete) {
                const img = frameToggle ? baseImg : talkingImg;
                this.previewCtx.drawImage(img, 0, 0, this.previewCanvas.width, this.previewCanvas.height);
                frameToggle = !frameToggle;
            } else {
                this.previewCtx.fillStyle = 'red';
                this.previewCtx.fillRect(0, 0, this.previewCanvas.width, this.previewCanvas.height);
            }
        };

        // 125ms interval = 8 frames per second (classic 8-bit speed)
        this.loopIntervalId = setInterval(drawFrame, 125);
    }

    stopPreviewLoop() {
        if (this.loopIntervalId) {
            clearInterval(this.loopIntervalId);
            this.loopIntervalId = null;
        }
    }
}