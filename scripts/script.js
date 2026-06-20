(function () {
    'use strict';

    function initializeCrystalTransition() {
        const siteStage = document.querySelector('.site-stage');
        const heroCrystal = document.querySelector('.crystal__thumbnail');
        const crystalLayer = document.querySelector('.crystal-layer');
        const crystalHolder = document.querySelector('.crystal-holder');
        const crystalCanvas = document.querySelector('.crystal-canvas');
        const heroButton = document.querySelector('.hero__btn');

        if (
            !siteStage ||
            !heroCrystal ||
            !crystalLayer ||
            !crystalHolder ||
            !crystalCanvas ||
            typeof window.CrystalSequence !== 'function'
        ) {
            return;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sequence = new window.CrystalSequence({
            canvas: crystalCanvas,
            frameCount: 150,
        });
        let transitionStarted = false;
        let transitionReady = false;
        let scrollProgress = 0;
        let upwardExitDistance = 0;
        let touchStartY = null;
        let crystalTransitionAnimation = null;
        let transitionVersion = 0;
        let returningToHero = false;
        let cachedHeroBounds = null;
        let cachedHeroTransform = null;
        let reverseIntentDistance = 0;
        let sequenceInputLocked = false;
        let sequenceInputUnlockAt = 0;

        const sequenceReady = sequence.load().then(
            () => true,
            (error) => {
                console.error(error);
                return false;
            },
        );

        function canUseSequenceInput() {
            if (!sequenceInputLocked) {
                return true;
            }

            if (!transitionReady || performance.now() < sequenceInputUnlockAt) {
                return false;
            }

            sequenceInputLocked = false;
            sequenceInputUnlockAt = 0;
            return true;
        }

        function lockSequenceInput() {
            sequenceInputLocked = true;
            sequenceInputUnlockAt = Infinity;
            scrollProgress = 0;
            upwardExitDistance = 0;
            reverseIntentDistance = 0;
        }

        function getHeroTransform(heroBounds, holderBounds) {
            const heroCenterX = heroBounds.left + heroBounds.width / 2;
            const heroCenterY = heroBounds.top + heroBounds.height / 2;
            const holderCenterX = holderBounds.left + holderBounds.width / 2;
            const holderCenterY = holderBounds.top + holderBounds.height / 2;
            const offsetX = heroCenterX - holderCenterX;
            const offsetY = heroCenterY - holderCenterY;
            const scaleX = heroBounds.width / holderBounds.width;
            const scaleY = heroBounds.height / holderBounds.height;

            return `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`;
        }

        async function startTransition() {
            if (transitionStarted || returningToHero) {
                return;
            }

            transitionStarted = true;
            transitionReady = false;
            lockSequenceInput();
            const currentTransitionVersion = ++transitionVersion;
            sequence.jumpToProgress(0);
            cachedHeroBounds = heroCrystal.getBoundingClientRect();
            const targetBounds = crystalHolder.getBoundingClientRect();
            cachedHeroTransform = getHeroTransform(cachedHeroBounds, targetBounds);
            siteStage.classList.add('is-crystal-transition');

            if (!reducedMotion.matches && cachedHeroBounds.width && targetBounds.width) {
                const expansion = crystalHolder.animate(
                    [
                        { transform: cachedHeroTransform },
                        { transform: 'translate(0, 0) scale(1, 1)' },
                    ],
                    {
                        duration: 700,
                        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
                        fill: 'both',
                    },
                );
                crystalTransitionAnimation = expansion;

                await expansion.finished.catch(() => {});
                expansion.cancel();

                if (crystalTransitionAnimation === expansion) {
                    crystalTransitionAnimation = null;
                }
            }

            if (!transitionStarted || currentTransitionVersion !== transitionVersion) {
                return;
            }

            const sequenceIsReady = await sequenceReady;

            if (
                !sequenceIsReady ||
                !transitionStarted ||
                currentTransitionVersion !== transitionVersion
            ) {
                return;
            }

            sequence.resize();
            crystalLayer.classList.add('is-sequence-ready');
            transitionReady = true;
            scrollProgress = 0;
            sequence.jumpToProgress(0);
            sequenceInputUnlockAt = performance.now() + 70;
        }

        function updateScrollProgress(delta) {
            if (scrollProgress === 1 && delta < 0) {
                reverseIntentDistance += Math.abs(delta);

                if (reverseIntentDistance < 12) {
                    return;
                }

                delta = -reverseIntentDistance;
                reverseIntentDistance = 0;
            } else if (delta >= 0) {
                reverseIntentDistance = 0;
            }

            const scrollDistance = Math.max(window.innerHeight * 2, 1200);
            scrollProgress = Math.max(0, Math.min(scrollProgress + delta / scrollDistance, 1));

            if (transitionReady) {
                sequence.setTargetProgress(scrollProgress);
            }

            if (
                !transitionReady ||
                delta >= 0 ||
                scrollProgress > 0 ||
                !sequence.isAtStart()
            ) {
                upwardExitDistance = 0;
                return;
            }

            upwardExitDistance += Math.abs(delta);

            if (upwardExitDistance >= Math.max(60, window.innerHeight * 0.06)) {
                returnToHero();
            }
        }

        async function returnToHero() {
            if (returningToHero) {
                return;
            }

            returningToHero = true;
            transitionReady = false;
            sequenceInputUnlockAt = Infinity;
            scrollProgress = 0;
            upwardExitDistance = 0;
            reverseIntentDistance = 0;
            sequence.stopSmoothing();

            if (!reducedMotion.matches && cachedHeroTransform) {
                const collapse = crystalHolder.animate(
                    [
                        { transform: 'translate(0, 0) scale(1, 1)' },
                        { transform: cachedHeroTransform },
                    ],
                    {
                        duration: 700,
                        easing: 'cubic-bezier(0.65, 0, 0.35, 1)',
                        fill: 'both',
                    },
                );
                crystalTransitionAnimation = collapse;

                await collapse.finished.catch(() => {});
            }

            siteStage.classList.remove('is-crystal-transition');
            await new Promise((resolve) => requestAnimationFrame(resolve));
            crystalTransitionAnimation?.cancel();
            crystalTransitionAnimation = null;
            sequence.jumpToProgress(0);
            cachedHeroBounds = null;
            cachedHeroTransform = null;
            transitionVersion += 1;
            transitionStarted = false;
            returningToHero = false;
            sequenceInputLocked = false;
            sequenceInputUnlockAt = 0;
        }

        function normalizeWheelDelta(event) {
            if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) {
                return event.deltaY * 16;
            }

            if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) {
                return event.deltaY * window.innerHeight;
            }

            return event.deltaY;
        }

        function handleWheel(event) {
            const delta = normalizeWheelDelta(event);

            if (transitionStarted) {
                event.preventDefault();
            }

            if (returningToHero) {
                event.preventDefault();
                return;
            }

            if (transitionStarted && !canUseSequenceInput()) {
                event.preventDefault();
                return;
            }

            if (Math.abs(delta) < 2) {
                return;
            }

            if (!transitionStarted && delta <= 10) {
                return;
            }

            event.preventDefault();

            if (!transitionStarted) {
                startTransition();
                return;
            }

            updateScrollProgress(delta);
        }

        function handleTouchStart(event) {
            touchStartY = event.changedTouches[0].clientY;
        }

        function handleTouchMove(event) {
            if (transitionStarted) {
                event.preventDefault();
            }

            if (touchStartY === null) {
                return;
            }

            const currentY = event.changedTouches[0].clientY;
            const delta = touchStartY - currentY;
            touchStartY = currentY;

            if (returningToHero) {
                event.preventDefault();
                return;
            }

            if (transitionStarted && !canUseSequenceInput()) {
                event.preventDefault();
                return;
            }

            if (!transitionStarted && delta <= 0) {
                return;
            }

            event.preventDefault();

            if (!transitionStarted) {
                startTransition();
                return;
            }

            updateScrollProgress(delta * 2);
        }

        function handleTouchEnd() {
            touchStartY = null;
        }

        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('resize', () => sequence.resize(), { passive: true });
        heroButton?.addEventListener('click', startTransition);

        window.crystalSequence = sequence;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeCrystalTransition, { once: true });
    } else {
        initializeCrystalTransition();
    }
})();
