(function () {
    'use strict';

    if (window.__pageTransitionsInitialized) {
        return;
    }

    window.__pageTransitionsInitialized = true;

    const PAGE_TRANSITION_CONFIG = {
        home: {
            sections: [
                '.about',
                '.collection',
                '.space',
                '.events',
                '.form',
                '.souvenirs',
                '.footer',
            ],
            initialSection: '.about',
            autoActivate: false,
            activeStateSelector: '.site-stage.is-about-visible',
            anchorNavigation: false,
        },
        about: {
            sections: [
                '.about-intro',
                '.about-randomness',
                '.about-structure',
                '.about-gallery',
                '.footer',
            ],
            mobileSections: [
                '.about-intro-mobile--first',
                '.about-intro-mobile--second',
                '.about-randomness-mobile--first',
                '.about-randomness-mobile--second',
                '.about-structure',
                '.about-gallery',
                '.footer',
            ],
            initialSection: '.about-intro',
            mobileInitialSection: '.about-intro-mobile--first',
            mobileQuery: '(max-width: 767px)',
            autoActivate: true,
            anchorNavigation: true,
        },
        collection: {
            sections: [
                '.collection-hero',
                '.footer',
            ],
            initialSection: '.collection-hero',
            autoActivate: true,
            anchorNavigation: false,
        },
        merch: {
            sections: [
                '.merch-hero',
                '.footer',
            ],
            initialSection: '.merch-hero',
            autoActivate: true,
            anchorNavigation: false,
        },
    };

    const PAGE_TRANSITION_DURATION = 800;
    const PAGE_TRANSITION_EASING = 'cubic-bezier(0.65, 0, 0.35, 1)';
    const PAGE_TRANSITION_DISTANCE = '8svh';
    const WHEEL_THRESHOLD = 48;
    const TOUCH_THRESHOLD = 50;
    const INPUT_UNLOCK_DELAY = 180;
    const HORIZONTAL_SCROLL_SELECTOR = [
        '[data-horizontal-scroll]',
        '.collection__cards',
        '.collection__cards-scroll',
        '.collection-cards',
        '.space__gallery',
        '.space__gallery-scroll',
        '.events__cards',
        '.events__cards-scroll',
        '.souvenirs__cards',
        '.souvenirs__cards-scroll',
        '.about-gallery__viewport',
    ].join(', ');

    let pageConfig = null;
    let mobileSectionMedia = null;
    let sectionSelectors = [];
    let sections = [];
    let currentPageIndex = 0;
    let isPageTransitioning = false;
    let pageTransitionVersion = 0;
    let isPageSystemActive = false;
    let wheelDistance = 0;
    let wheelResetTimer = 0;
    let touchStartX = null;
    let touchStartY = null;
    let touchStartedInHorizontalArea = false;
    let inputUnlockAt = 0;

    function getSections() {
        if (!pageConfig) {
            return [];
        }

        return sectionSelectors
            .map((selector) => document.querySelector(selector))
            .filter(Boolean);
    }

    function usesMobileSections() {
        return Boolean(
            pageConfig?.mobileSections &&
            pageConfig.mobileQuery &&
            (mobileSectionMedia || window.matchMedia(pageConfig.mobileQuery)).matches
        );
    }

    function getInitialSectionSelector() {
        return usesMobileSections()
            ? pageConfig.mobileInitialSection || pageConfig.mobileSections[0]
            : pageConfig.initialSection || pageConfig.sections[0];
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
        const transitionVersion = ++pageTransitionVersion;
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

        if (transitionVersion !== pageTransitionVersion) {
            animations.forEach((animation) => animation.cancel());
            return;
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

    function isHorizontalWheelGesture(event) {
        return (
            event.target instanceof Element &&
            event.target.closest(HORIZONTAL_SCROLL_SELECTOR) &&
            (Math.abs(event.deltaX) > Math.abs(event.deltaY) || event.shiftKey)
        );
    }

    function isHorizontalScrollTarget(target) {
        return (
            target instanceof Element &&
            Boolean(target.closest(HORIZONTAL_SCROLL_SELECTOR))
        );
    }

    function handleWheel(event) {
        if (!isPageSystemActive || isHorizontalWheelGesture(event)) {
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
            (
                event.target instanceof Element &&
                event.target.closest('.model-viewer__stage')
            )
        ) {
            touchStartX = null;
            touchStartY = null;
            touchStartedInHorizontalArea = false;
            return;
        }

        const touch = event.changedTouches[0];
        touchStartX = touch.clientX;
        touchStartY = touch.clientY;
        touchStartedInHorizontalArea = isHorizontalScrollTarget(event.target);
    }

    function handleTouchMove(event) {
        if (!isPageSystemActive || touchStartY === null) {
            return;
        }

        if (touchStartedInHorizontalArea && touchStartX !== null) {
            const touch = event.changedTouches[0];
            const distanceX = Math.abs(touch.clientX - touchStartX);
            const distanceY = Math.abs(touch.clientY - touchStartY);

            if (distanceX > distanceY) {
                touchStartX = null;
                touchStartY = null;
                touchStartedInHorizontalArea = false;
                return;
            }
        }

        event.preventDefault();
    }

    function handleTouchEnd(event) {
        if (
            !isPageSystemActive ||
            touchStartY === null ||
            isPageTransitioning ||
            performance.now() < inputUnlockAt
        ) {
            touchStartX = null;
            touchStartY = null;
            touchStartedInHorizontalArea = false;
            return;
        }

        const touch = event.changedTouches[0];

        if (touchStartedInHorizontalArea && touchStartX !== null) {
            const distanceX = Math.abs(touch.clientX - touchStartX);
            const distanceY = Math.abs(touch.clientY - touchStartY);

            if (distanceX > distanceY) {
                touchStartX = null;
                touchStartY = null;
                touchStartedInHorizontalArea = false;
                return;
            }
        }

        const distance = touchStartY - touch.clientY;
        touchStartX = null;
        touchStartY = null;
        touchStartedInHorizontalArea = false;

        if (Math.abs(distance) < TOUCH_THRESHOLD) {
            return;
        }

        if (distance > 0) {
            goNextSection();
        } else {
            goPrevSection();
        }
    }

    function handleTouchCancel() {
        touchStartX = null;
        touchStartY = null;
        touchStartedInHorizontalArea = false;
    }

    function activate(selector = getInitialSectionSelector()) {
        if (!sections.length) {
            return;
        }

        const index = sections.findIndex((section) => section.matches(selector));

        currentPageIndex = index >= 0 ? index : 0;
        isPageSystemActive = true;
        wheelDistance = 0;
        inputUnlockAt = performance.now() + INPUT_UNLOCK_DELAY;
        setActiveSection(currentPageIndex);
    }

    function deactivate() {
        pageTransitionVersion += 1;
        isPageSystemActive = false;
        isPageTransitioning = false;
        wheelDistance = 0;
        touchStartX = null;
        touchStartY = null;
        touchStartedInHorizontalArea = false;
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

    function initializeAnchorNavigation() {
        if (!pageConfig.anchorNavigation) {
            return;
        }

        document.querySelectorAll('a[href^="#"]').forEach((anchor) => {
            anchor.addEventListener('click', (event) => {
                if (!anchor.hash) {
                    return;
                }

                const targetId = decodeURIComponent(anchor.hash.slice(1));
                const target = document.getElementById(targetId);
                const targetIndex = sections.indexOf(target);

                if (targetIndex < 0) {
                    return;
                }

                event.preventDefault();
                goToSection(targetIndex);
            });
        });
    }

    function refreshResponsiveSections() {
        const nextSelectors = usesMobileSections()
            ? pageConfig.mobileSections
            : pageConfig.sections;

        if (
            nextSelectors.length === sectionSelectors.length &&
            nextSelectors.every((selector, index) => selector === sectionSelectors[index])
        ) {
            return;
        }

        pageTransitionVersion += 1;
        isPageTransitioning = false;
        sections.forEach((section) => {
            section.classList.remove(
                'page-section',
                'is-active',
                'is-before',
                'is-after',
                'is-transitioning',
            );
        });

        sectionSelectors = nextSelectors;
        sections = getSections();
        sections.forEach((section) => section.classList.add('page-section'));

        if (sections.length && (isPageSystemActive || pageConfig.autoActivate)) {
            activate(getInitialSectionSelector());
        }
    }

    function initializeSectionTransitions() {
        const pageName = document.body?.dataset.page;
        pageConfig = PAGE_TRANSITION_CONFIG[pageName];

        if (!pageConfig) {
            return;
        }

        mobileSectionMedia = pageConfig.mobileQuery
            ? window.matchMedia(pageConfig.mobileQuery)
            : null;
        sectionSelectors = usesMobileSections()
            ? pageConfig.mobileSections
            : pageConfig.sections;
        sections = getSections();

        if (!sections.length) {
            return;
        }

        sections.forEach((section) => section.classList.add('page-section'));

        window.addEventListener('page-sections:activate', (event) => {
            activate(event.detail?.selector);
        });
        window.addEventListener('page-sections:deactivate', deactivate);
        window.addEventListener('wheel', handleWheel, { passive: false });
        window.addEventListener('touchstart', handleTouchStart, { passive: true });
        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd, { passive: true });
        window.addEventListener('touchcancel', handleTouchCancel, { passive: true });
        mobileSectionMedia?.addEventListener?.('change', refreshResponsiveSections);

        initializeAnchorNavigation();

        if (
            pageConfig.autoActivate ||
            (
                pageConfig.activeStateSelector &&
                document.querySelector(pageConfig.activeStateSelector)
            )
        ) {
            activate(getInitialSectionSelector());
        }

        window.sectionTransitions = {
            getSections,
            goToSection,
            goNextSection,
            goPrevSection,
            setActiveSection,
            activate,
            deactivate,
            isInputLocked,
        };
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSectionTransitions, { once: true });
    } else {
        initializeSectionTransitions();
    }
})();
