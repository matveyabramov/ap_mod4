(function () {
    'use strict';

    const ABOUT_TRANSITION_DURATION = 800;
    const ABOUT_TRANSITION_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
    const ABOUT_CROSSFADE_START = 0.62;
    const ABOUT_TARGET_SELECTOR = '.model-viewer__stage';

    function initializeMeteorTransition() {
        const siteStage = document.querySelector('.site-stage');
        const heroMeteor = document.querySelector('.meteor__thumbnail');
        const meteorLayer = document.querySelector('.meteor-layer');
        const meteorHolder = document.querySelector('.meteor-holder');
        const meteorCanvas = document.querySelector('.meteor-canvas');
        const about = document.querySelector('.about');
        const aboutTarget = document.querySelector(ABOUT_TARGET_SELECTOR);
        const heroButton = document.querySelector('.hero__btn');

        if (
            !siteStage ||
            !heroMeteor ||
            !meteorLayer ||
            !meteorHolder ||
            !meteorCanvas ||
            !about ||
            !aboutTarget ||
            typeof window.MeteorSequence !== 'function'
        ) {
            return;
        }

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
        const sequence = new window.MeteorSequence({
            canvas: meteorCanvas,
            frameCount: 150,
        });
        let transitionStarted = false;
        let transitionReady = false;
        let scrollProgress = 0;
        let upwardExitDistance = 0;
        let touchStartY = null;
        let meteorTransitionAnimation = null;
        let transitionVersion = 0;
        let returningToHero = false;
        let cachedHeroBounds = null;
        let cachedHeroTransform = null;
        let reverseIntentDistance = 0;
        let sequenceInputLocked = false;
        let sequenceInputUnlockAt = 0;
        let aboutVisible = false;
        let isTransitioningToAbout = false;
        let aboutTransitionAnimations = [];

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

        function getAboutTransform(holderBounds, targetBounds) {
            const holderCenterX = holderBounds.left + holderBounds.width / 2;
            const holderCenterY = holderBounds.top + holderBounds.height / 2;
            const targetCenterX = targetBounds.left + targetBounds.width / 2;
            const targetCenterY = targetBounds.top + targetBounds.height / 2;
            const offsetX = targetCenterX - holderCenterX;
            const offsetY = targetCenterY - holderCenterY;
            const scaleX = targetBounds.width / holderBounds.width;
            const scaleY = targetBounds.height / holderBounds.height;

            return `translate(${offsetX}px, ${offsetY}px) scale(${scaleX}, ${scaleY})`;
        }

        function cancelAboutTransitionAnimations() {
            aboutTransitionAnimations.forEach((animation) => animation.cancel());
            aboutTransitionAnimations = [];
        }

        function aboutOwnsPageInput() {
            const pageInputLocked = window.sectionTransitions?.isInputLocked?.() ?? false;

            return (
                !about.classList.contains('page-section') ||
                (
                    about.classList.contains('is-active') &&
                    !about.classList.contains('is-transitioning') &&
                    !pageInputLocked
                )
            );
        }

        async function transitionToAbout() {
            if (aboutVisible || isTransitioningToAbout) {
                return;
            }

            isTransitioningToAbout = true;
            const holderBounds = meteorHolder.getBoundingClientRect();
            const targetBounds = aboutTarget.getBoundingClientRect();
            const targetTransform = getAboutTransform(holderBounds, targetBounds);
            siteStage.classList.add('is-about-transitioning');

            if (reducedMotion.matches || !holderBounds.width || !targetBounds.width) {
                aboutVisible = true;
                siteStage.classList.add('is-about-visible');
                siteStage.classList.remove('is-about-transitioning');
                isTransitioningToAbout = false;
                window.dispatchEvent(new CustomEvent('page-sections:activate', {
                    detail: { selector: '.about' },
                }));
                return;
            }

            const options = {
                duration: ABOUT_TRANSITION_DURATION,
                easing: ABOUT_TRANSITION_EASING,
                fill: 'both',
            };

            aboutTransitionAnimations = [
                meteorHolder.animate(
                    [
                        { transform: 'translate(0, 0) scale(1, 1)' },
                        { transform: targetTransform },
                    ],
                    options,
                ),
                about.animate([{ opacity: 0 }, { opacity: 1 }], options),
                aboutTarget.animate(
                    [
                        { opacity: 0, offset: 0 },
                        { opacity: 0, offset: ABOUT_CROSSFADE_START },
                        { opacity: 1, offset: 1 },
                    ],
                    options,
                ),
                meteorLayer.animate(
                    [
                        { opacity: 1, offset: 0 },
                        { opacity: 1, offset: ABOUT_CROSSFADE_START },
                        { opacity: 0, offset: 1 },
                    ],
                    options,
                ),
            ];

            await Promise.all(
                aboutTransitionAnimations.map((animation) => animation.finished.catch(() => {})),
            );

            aboutVisible = true;
            siteStage.classList.add('is-about-visible');
            siteStage.classList.remove('is-about-transitioning');
            await new Promise((resolve) => requestAnimationFrame(resolve));
            cancelAboutTransitionAnimations();
            isTransitioningToAbout = false;
            window.dispatchEvent(new CustomEvent('page-sections:activate', {
                detail: { selector: '.about' },
            }));
        }

        async function transitionFromAbout(delta) {
            if (!aboutVisible || isTransitioningToAbout) {
                return;
            }

            isTransitioningToAbout = true;
            const holderBounds = meteorHolder.getBoundingClientRect();
            const targetBounds = aboutTarget.getBoundingClientRect();
            const targetTransform = getAboutTransform(holderBounds, targetBounds);
            siteStage.classList.add('is-about-transitioning');

            if (reducedMotion.matches || !holderBounds.width || !targetBounds.width) {
                aboutVisible = false;
                siteStage.classList.remove('is-about-visible', 'is-about-transitioning');
                isTransitioningToAbout = false;
                window.dispatchEvent(new CustomEvent('page-sections:deactivate'));
                updateScrollProgress(delta);
                return;
            }

            const options = {
                duration: ABOUT_TRANSITION_DURATION,
                easing: ABOUT_TRANSITION_EASING,
                fill: 'both',
            };
            const reverseCrossfadeEnd = 1 - ABOUT_CROSSFADE_START;

            aboutTransitionAnimations = [
                meteorHolder.animate(
                    [
                        { transform: targetTransform },
                        { transform: 'translate(0, 0) scale(1, 1)' },
                    ],
                    options,
                ),
                about.animate([{ opacity: 1 }, { opacity: 0 }], options),
                aboutTarget.animate(
                    [
                        { opacity: 1, offset: 0 },
                        { opacity: 0, offset: reverseCrossfadeEnd },
                        { opacity: 0, offset: 1 },
                    ],
                    options,
                ),
                meteorLayer.animate(
                    [
                        { opacity: 0, offset: 0 },
                        { opacity: 1, offset: reverseCrossfadeEnd },
                        { opacity: 1, offset: 1 },
                    ],
                    options,
                ),
            ];

            await Promise.all(
                aboutTransitionAnimations.map((animation) => animation.finished.catch(() => {})),
            );

            aboutVisible = false;
            siteStage.classList.remove('is-about-visible', 'is-about-transitioning');
            await new Promise((resolve) => requestAnimationFrame(resolve));
            cancelAboutTransitionAnimations();
            isTransitioningToAbout = false;
            window.dispatchEvent(new CustomEvent('page-sections:deactivate'));
            updateScrollProgress(delta);
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
            cachedHeroBounds = heroMeteor.getBoundingClientRect();
            const targetBounds = meteorHolder.getBoundingClientRect();
            cachedHeroTransform = getHeroTransform(cachedHeroBounds, targetBounds);
            siteStage.classList.add('is-meteor-transition');

            if (!reducedMotion.matches && cachedHeroBounds.width && targetBounds.width) {
                const expansion = meteorHolder.animate(
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
                meteorTransitionAnimation = expansion;

                await expansion.finished.catch(() => {});
                expansion.cancel();

                if (meteorTransitionAnimation === expansion) {
                    meteorTransitionAnimation = null;
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
            meteorLayer.classList.add('is-sequence-ready');
            transitionReady = true;
            scrollProgress = 0;
            sequence.jumpToProgress(0);
            sequenceInputUnlockAt = performance.now() + 70;
        }

        function updateScrollProgress(delta) {
            if (scrollProgress === 1 && delta > 0) {
                transitionToAbout();
                return;
            }

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
                const collapse = meteorHolder.animate(
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
                meteorTransitionAnimation = collapse;

                await collapse.finished.catch(() => {});
            }

            siteStage.classList.remove('is-meteor-transition');
            await new Promise((resolve) => requestAnimationFrame(resolve));
            meteorTransitionAnimation?.cancel();
            meteorTransitionAnimation = null;
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

            if (isTransitioningToAbout) {
                event.preventDefault();
                return;
            }

            if (aboutVisible) {
                event.preventDefault();

                if (!aboutOwnsPageInput()) {
                    return;
                }

                if (delta < -2) {
                    transitionFromAbout(delta);
                }

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
            if (event.target instanceof Element && event.target.closest('.model-viewer__stage')) {
                touchStartY = null;
                return;
            }

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

            if (isTransitioningToAbout) {
                event.preventDefault();
                return;
            }

            if (aboutVisible) {
                event.preventDefault();

                if (!aboutOwnsPageInput()) {
                    return;
                }

                if (delta < 0) {
                    transitionFromAbout(delta * 2);
                }

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

        window.meteorSequence = sequence;
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeMeteorTransition, { once: true });
    } else {
        initializeMeteorTransition();
    }
})();
