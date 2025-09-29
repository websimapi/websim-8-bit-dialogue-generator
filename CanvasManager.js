export class CanvasManager {
    constructor() {
        this.baseCanvas = document.getElementById('baseFrameCanvas');
        this.talkingCanvas = document.getElementById('talkingFrameCanvas');
        this.previewCanvas = document.getElementById('previewCanvas');

        if (!this.baseCanvas || !this.talkingCanvas || !this.previewCanvas) {
            throw new Error('Required canvas elements not found in DOM');
        }

        this.baseCtx = this.baseCanvas.getContext('2d');
        this.talkingCtx = this.talkingCanvas.getContext('2d');
        this.previewCtx = this.previewCanvas.getContext('2d');

        this.loopIntervalId = null;

        this.initializeCanvases();
    }

    initializeCanvases() {
        [this.baseCtx, this.talkingCtx, this.previewCtx].forEach(ctx => {
            ctx.imageSmoothingEnabled = false;
            ctx.webkitImageSmoothingEnabled = false;
            ctx.mozImageSmoothingEnabled = false;
            ctx.msImageSmoothingEnabled = false;

            ctx.fillStyle = '#1a1a2e';
            ctx.fillRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        });
    }

    async loadImageToCanvas(imageUrl, canvasType) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
                const ctx = this.getContext(canvasType);
                ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
                ctx.drawImage(img, 0, 0, ctx.canvas.width, ctx.canvas.height);
                resolve();
            };
            img.onerror = reject;
            img.src = imageUrl;
        });
    }

    getContext(canvasType) {
        switch (canvasType) {
            case 'base': return this.baseCtx;
            case 'talking': return this.talkingCtx;
            case 'preview': return this.previewCtx;
            default: throw new Error(`Unknown canvas type: ${canvasType}`);
        }
    }

    getCanvasDataURL(canvasType) {
        const canvas = canvasType === 'base' ? this.baseCanvas : this.talkingCanvas;
        return canvas.toDataURL('image/png');
    }

    updatePreview(imageDataUrl) {
        this.loadImageToCanvas(imageDataUrl, 'preview');
    }

    clearTalkingCanvas() {
        this.talkingCtx.fillStyle = '#1a1a2e';
        this.talkingCtx.fillRect(0, 0, this.talkingCanvas.width, this.talkingCanvas.height);
    }

    clearAllCanvases() {
        this.initializeCanvases();
    }

    startPreviewLoop(baseFrameData, talkingFrameData) {
        if (!baseFrameData || !talkingFrameData || this.loopIntervalId !== null) return;

        const baseImg = new Image();
        baseImg.src = baseFrameData;

        const talkingImg = new Image();
        talkingImg.src = talkingFrameData;

        let frameToggle = true;

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

        this.loopIntervalId = setInterval(drawFrame, 125);
    }

    stopPreviewLoop() {
        if (this.loopIntervalId) {
            clearInterval(this.loopIntervalId);
            this.loopIntervalId = null;
        }
    }

    isLooping() {
        return this.loopIntervalId !== null;
    }
}