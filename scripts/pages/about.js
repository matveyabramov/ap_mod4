(function () {
    'use strict';

    const gallery = document.querySelector('.about-gallery');
    const viewport = gallery?.querySelector('.about-gallery__viewport');
    const track = gallery?.querySelector('.about-gallery__track');
    const previousButton = gallery?.querySelector('.about-gallery__arrow--prev');
    const nextButton = gallery?.querySelector('.about-gallery__arrow--next');

    if (!gallery || !viewport || !track || !previousButton || !nextButton) {
        return;
    }

    const slides = Array.from(track.children);
    const slideCount = slides.length;

    if (!slideCount) {
        return;
    }

    const DEFAULT_SLIDE_STEP = 940;
    const WHEEL_THRESHOLD = 60;
    const DRAG_THRESHOLD = 60;
    const SLIDE_LOCK_DELAY = 450;

    let activeSlide = Math.min(1, slideCount - 1);
    let wheelDistance = 0;
    let wheelResetTimer = 0;
    let isSlideLocked = false;

    let isDragging = false;
    let dragStartX = 0;
    let dragCurrentX = 0;
    let activePointerId = null;

    function getSlideStep() {
        if (slides.length < 2) {
            return slides[0]?.getBoundingClientRect().width || DEFAULT_SLIDE_STEP;
        }

        const firstSlideLeft = slides[0].offsetLeft;
        const secondSlideLeft = slides[1].offsetLeft;
        const realStep = Math.abs(secondSlideLeft - firstSlideLeft);

        return realStep || DEFAULT_SLIDE_STEP;
    }

    function lockSlider() {
        isSlideLocked = true;

        window.setTimeout(() => {
            isSlideLocked = false;
        }, SLIDE_LOCK_DELAY);
    }

    function setDragOffset(offset) {
        track.style.setProperty('--gallery-drag', `${offset}px`);
    }

    function resetDragOffset() {
        setDragOffset(0);
    }

    function renderGallery() {
        const slideStep = getSlideStep();
        const offset = (1 - activeSlide) * slideStep;

        track.style.setProperty('--gallery-offset', `${offset}px`);
    }

    function setActiveSlide(index) {
        activeSlide = (index + slideCount) % slideCount;
        renderGallery();
    }

    function goToSlide(index, options = {}) {
        const shouldIgnoreLock = options.ignoreLock === true;

        if ((!shouldIgnoreLock && isSlideLocked) || slideCount <= 1) {
            return;
        }

        setActiveSlide(index);

        if (!shouldIgnoreLock) {
            lockSlider();
        }
    }

    function goPrevSlide() {
        goToSlide(activeSlide - 1);
    }

    function goNextSlide() {
        goToSlide(activeSlide + 1);
    }

    function goPrevSlideByDrag() {
        setActiveSlide(activeSlide - 1);
    }

    function goNextSlideByDrag() {
        setActiveSlide(activeSlide + 1);
    }

    previousButton.addEventListener('click', goPrevSlide);
    nextButton.addEventListener('click', goNextSlide);

    viewport.addEventListener('wheel', (event) => {
        const deltaX = event.deltaX;
        const deltaY = event.deltaY;

        const isHorizontalWheel = Math.abs(deltaX) > Math.abs(deltaY) * 1.5;
        const isShiftWheel = event.shiftKey && Math.abs(deltaY) > 0;

        if (!isHorizontalWheel && !isShiftWheel) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();

        if (isSlideLocked) {
            return;
        }

        const delta = isHorizontalWheel ? deltaX : deltaY;

        if (!delta) {
            return;
        }

        if (wheelDistance && Math.sign(wheelDistance) !== Math.sign(delta)) {
            wheelDistance = 0;
        }

        wheelDistance += delta;

        clearTimeout(wheelResetTimer);
        wheelResetTimer = window.setTimeout(() => {
            wheelDistance = 0;
        }, 120);

        if (Math.abs(wheelDistance) < WHEEL_THRESHOLD) {
            return;
        }

        if (wheelDistance > 0) {
            goNextSlide();
        } else {
            goPrevSlide();
        }

        wheelDistance = 0;
    }, { passive: false });

    viewport.addEventListener('pointerdown', (event) => {
        if (
            slideCount <= 1 ||
            event.button !== 0 ||
            event.target.closest('.about-gallery__arrow')
        ) {
            return;
        }

        event.preventDefault();

        isDragging = true;
        dragStartX = event.clientX;
        dragCurrentX = event.clientX;
        activePointerId = event.pointerId;

        resetDragOffset();

        if (viewport.setPointerCapture) {
            viewport.setPointerCapture(activePointerId);
        }

        viewport.classList.add('is-dragging');
    });

    viewport.addEventListener('pointermove', (event) => {
        if (!isDragging || event.pointerId !== activePointerId) {
            return;
        }

        event.preventDefault();

        dragCurrentX = event.clientX;

        const dragDistance = dragCurrentX - dragStartX;
        setDragOffset(dragDistance);
    });

    function finishDrag(event) {
        if (!isDragging || event.pointerId !== activePointerId) {
            return;
        }

        const dragDistance = dragCurrentX - dragStartX;
        const pointerId = activePointerId;

        isDragging = false;
        activePointerId = null;
        viewport.classList.remove('is-dragging');

        if (viewport.hasPointerCapture?.(pointerId)) {
            viewport.releasePointerCapture(pointerId);
        }

        resetDragOffset();

        if (Math.abs(dragDistance) < DRAG_THRESHOLD) {
            renderGallery();
            return;
        }

        if (dragDistance < 0) {
            goNextSlideByDrag();
        } else {
            goPrevSlideByDrag();
        }
    }

    viewport.addEventListener('pointerup', finishDrag);
    viewport.addEventListener('pointercancel', finishDrag);

    viewport.addEventListener('lostpointercapture', () => {
        if (!isDragging) {
            return;
        }

        isDragging = false;
        activePointerId = null;
        viewport.classList.remove('is-dragging');
        resetDragOffset();
        renderGallery();
    });

    window.addEventListener('resize', renderGallery);

    resetDragOffset();
    renderGallery();
})();