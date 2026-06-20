(function () {
    'use strict';

    class MeteorSequence {
        constructor({
            canvas,
            frameCount = 150,
            preloadConcurrency = 8,
            framePath = (frameNumber) =>
                `./images/animation-frames/${String(frameNumber).padStart(4, '0')}.webp`,
        }) {
            if (!(canvas instanceof HTMLCanvasElement)) {
                throw new TypeError('MeteorSequence requires a canvas element.');
            }

            this.canvas = canvas;
            this.context = canvas.getContext('2d', { alpha: true });
            this.frameCount = frameCount;
            this.preloadConcurrency = preloadConcurrency;
            this.framePath = framePath;
            this.frames = new Array(frameCount);
            this.currentFrame = 0;
            this.targetProgress = 0;
            this.currentProgress = 0;
            this.loadPromise = null;
            this.animationFrameId = 0;
        }

        load() {
            if (!this.loadPromise) {
                this.loadPromise = this.preloadFrames();
            }

            return this.loadPromise;
        }

        async preloadFrames() {
            let nextFrameIndex = 0;
            const workerCount = Math.min(this.preloadConcurrency, this.frameCount);

            const loadNextFrame = async () => {
                while (nextFrameIndex < this.frameCount) {
                    const frameIndex = nextFrameIndex;
                    nextFrameIndex += 1;
                    this.frames[frameIndex] = await this.loadImage(
                        this.framePath(frameIndex + 1),
                    );
                }
            };

            await Promise.all(Array.from({ length: workerCount }, loadNextFrame));
            this.resize();
            this.drawFrame(0);
            return this;
        }

        loadImage(source) {
            return new Promise((resolve, reject) => {
                const image = new Image();
                image.decoding = 'async';
                image.onload = () => resolve(image);
                image.onerror = () => reject(new Error(`Unable to load meteor frame: ${source}`));
                image.src = source;
            });
        }

        resize() {
            const bounds = this.canvas.getBoundingClientRect();
            const pixelRatio = Math.min(window.devicePixelRatio || 1, 2);
            const width = Math.max(1, Math.round(bounds.width * pixelRatio));
            const height = Math.max(1, Math.round(bounds.height * pixelRatio));

            if (this.canvas.width !== width || this.canvas.height !== height) {
                this.canvas.width = width;
                this.canvas.height = height;
            }

            if (this.frames[this.currentFrame]) {
                this.drawFrame(this.currentFrame);
            }
        }

        drawFrame(frameIndex) {
            const safeFrameIndex = Math.max(0, Math.min(frameIndex, this.frameCount - 1));
            const image = this.frames[safeFrameIndex];

            if (!image) {
                return false;
            }

            const canvasWidth = this.canvas.width;
            const canvasHeight = this.canvas.height;
            const scale = Math.min(canvasWidth / image.naturalWidth, canvasHeight / image.naturalHeight);
            const width = image.naturalWidth * scale;
            const height = image.naturalHeight * scale;
            const x = (canvasWidth - width) / 2;
            const y = (canvasHeight - height) / 2;

            this.context.clearRect(0, 0, canvasWidth, canvasHeight);
            this.context.drawImage(image, x, y, width, height);
            this.currentFrame = safeFrameIndex;
            return true;
        }

        renderProgress(progress) {
            const frameIndex = this.getFrameIndex(progress);

            if (frameIndex !== this.currentFrame) {
                this.drawFrame(frameIndex);
            }

            return frameIndex;
        }

        setTargetProgress(progress) {
            this.stopSmoothing();
            this.targetProgress = Math.max(0, Math.min(progress, 1));
            this.currentProgress = this.targetProgress;
            return this.renderProgress(this.currentProgress);
        }

        jumpToProgress(progress) {
            return this.setTargetProgress(progress);
        }

        getFrameIndex(progress) {
            return Math.round(progress * (this.frameCount - 1));
        }

        isAtStart() {
            return (
                this.targetProgress === 0 &&
                this.currentProgress === 0 &&
                this.currentFrame === 0
            );
        }

        stopSmoothing() {
            if (this.animationFrameId) {
                cancelAnimationFrame(this.animationFrameId);
                this.animationFrameId = 0;
            }
        }
    }

    window.MeteorSequence = MeteorSequence;
})();
