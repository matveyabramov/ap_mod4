(function () {
    'use strict';

    // TEMP DEV MODE: set to a section selector to work on it in isolation.
    // Set DEV_ACTIVE_SECTION_SELECTOR to null to restore normal transitions.
    const SECTION_TRANSITIONS_ENABLED = true;
    // const DEV_ACTIVE_SECTION_SELECTOR = '.footer';
    const DEV_ACTIVE_SECTION_SELECTOR = null;

    const PAGE_SECTIONS = [
        '.about',
        '.collection',
        '.space',
        '.events',
        '.form',
        '.souvenirs',
        '.footer'
    ];

    const PAGE_TRANSITION_DURATION = 800;
    const PAGE_TRANSITION_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
    const PAGE_TRANSITION_DISTANCE = '8svh';
    const WHEEL_THRESHOLD = 48;
    const TOUCH_THRESHOLD = 50;
    const INPUT_UNLOCK_DELAY = 180;

    let sections = [];
    let currentPageIndex = 0;
    let isPageTransitioning = false;
    let isPageSystemActive = false;
    let wheelDistance = 0;
    let wheelResetTimer = 0;
    let touchStartY = null;
    let inputUnlockAt = 0;

    function getSections() {
        return PAGE_SECTIONS
            .map((selector) => document.querySelector(selector))
            .filter(Boolean);
    }

    function setActiveSection(index) {
        sections.forEach((section, sectionIndex) => {
            section.classList.remove(
                'is-active',
                'is-before',
                'is-after',
                'is-transitioning',
            );

            if (sectionIndex < index) {
                section.classList.add('is-before');
            } else if (sectionIndex > index) {
                section.classList.add('is-after');
            } else {
                section.classList.add('is-active');
            }
        });
    }

    async function goToSection(index) {
        if (
            !isPageSystemActive ||
            isPageTransitioning ||
            index < 0 ||
            index >= sections.length ||
            index === currentPageIndex
        ) {
            return;
        }

        isPageTransitioning = true;
        const currentSection = sections[currentPageIndex];
        const targetSection = sections[index];
        const direction = index > currentPageIndex ? 1 : -1;
        const currentEnd = direction > 0
            ? `translate3d(0, -${PAGE_TRANSITION_DISTANCE}, 0)`
            : `translate3d(0, ${PAGE_TRANSITION_DISTANCE}, 0)`;
        const targetStart = direction > 0
            ? `translate3d(0, ${PAGE_TRANSITION_DISTANCE}, 0)`
            : `translate3d(0, -${PAGE_TRANSITION_DISTANCE}, 0)`;

        currentSection.classList.add('is-transitioning');
        targetSection.classList.add('is-transitioning');

        const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
        let animations = [];

        if (!reducedMotion) {
            const options = {
                duration: PAGE_TRANSITION_DURATION,
                easing: PAGE_TRANSITION_EASING,
                fill: 'both',
            };

            animations = [
                currentSection.animate(
                    [
                        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                        { opacity: 0, transform: currentEnd },
                    ],
                    options,
                ),
                targetSection.animate(
                    [
                        { opacity: 0, transform: targetStart },
                        { opacity: 1, transform: 'translate3d(0, 0, 0)' },
                    ],
                    options,
                ),
            ];

            await Promise.all(
                animations.map((animation) => animation.finished.catch(() => {})),
            );
        }

        currentPageIndex = index;
        setActiveSection(currentPageIndex);
        await new Promise((resolve) => requestAnimationFrame(resolve));
        animations.forEach((animation) => animation.cancel());
        isPageTransitioning = false;
        wheelDistance = 0;
        inputUnlockAt = performance.now() + INPUT_UNLOCK_DELAY;
    }

    function goNextSection() {
        return goToSection(currentPageIndex + 1);
    }

    function goPrevSection() {
        return goToSection(currentPageIndex - 1);
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
        if (!isPageSystemActive) {
            return;
        }

        event.preventDefault();

        if (isPageTransitioning || performance.now() < inputUnlockAt) {
            return;
        }

        const delta = normalizeWheelDelta(event);

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

        const direction = Math.sign(wheelDistance);
        wheelDistance = 0;

        if (direction > 0) {
            goNextSection();
        } else {
            goPrevSection();
        }
    }

    function handleTouchStart(event) {
        if (
            !isPageSystemActive ||
            (event.target instanceof Element && event.target.closest('.model-viewer__stage'))
        ) {
            touchStartY = null;
            return;
        }

        touchStartY = event.changedTouches[0].clientY;
    }

    function handleTouchMove(event) {
        if (isPageSystemActive && touchStartY !== null) {
            event.preventDefault();
        }
    }

    function handleTouchEnd(event) {
        if (
            !isPageSystemActive ||
            touchStartY === null ||
            isPageTransitioning ||
            performance.now() < inputUnlockAt
        ) {
            touchStartY = null;
            return;
        }

        const distance = touchStartY - event.changedTouches[0].clientY;
        touchStartY = null;

        if (Math.abs(distance) < TOUCH_THRESHOLD) {
            return;
        }

        if (distance > 0) {
            goNextSection();
        } else {
            goPrevSection();
        }
    }

    function activatePageSystem(selector = PAGE_SECTIONS[0]) {
        const index = sections.findIndex((section) => section.matches(selector));

        currentPageIndex = index >= 0 ? index : 0;
        isPageSystemActive = true;
        wheelDistance = 0;
        inputUnlockAt = performance.now() + INPUT_UNLOCK_DELAY;
        setActiveSection(currentPageIndex);
    }

    function deactivatePageSystem() {
        isPageSystemActive = false;
        wheelDistance = 0;
        touchStartY = null;
        sections.forEach((section) => {
            section.classList.remove(
                'is-active',
                'is-before',
                'is-after',
                'is-transitioning',
            );
        });
    }

    function isInputLocked() {
        return isPageTransitioning || performance.now() < inputUnlockAt;
    }

    function initializeSectionTransitions() {
        if (!SECTION_TRANSITIONS_ENABLED) {
            return;
        }

        if (DEV_ACTIVE_SECTION_SELECTOR) {
            const devSection = document.querySelector(DEV_ACTIVE_SECTION_SELECTOR);

            if (!devSection) {
                console.warn(`Dev section not found: ${DEV_ACTIVE_SECTION_SELECTOR}`);
                return;
            }

            devSection.classList.add('page-section', 'is-active');
            return;
        }

        sections = getSections();

        if (!sections.length) {
            return;
        }

        sections.forEach((section) => section.classList.add('page-section'));

        window.addEventListener('page-sections:activate', (event) => {
            activatePageSystem(event.detail?.selector);
        });
        window.addEventListener('page-sections:deactivate', deactivatePageSystem);
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });

        if (document.querySelector('.site-stage')?.classList.contains('is-about-visible')) {
            activatePageSystem(PAGE_SECTIONS[0]);
        }

        window.sectionTransitions = {
            getSections,
            goToSection,
            goNextSection,
            goPrevSection,
            setActiveSection,
            isInputLocked,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSectionTransitions, { once: true });
    } else {
        initializeSectionTransitions();
    }
})();
