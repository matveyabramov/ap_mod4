(function () {
    'use strict';

    const adaptiveQuery = window.matchMedia('(max-width: 1279px)');
    const mobileQuery = window.matchMedia('(max-width: 767px)');
    const scrollAreas = document.querySelectorAll(
        '.collection__cards, .collection-cards, .space__gallery-scroll, .space__gallery, .events__cards, .souvenirs__cards, .merch-cards',
    );

    if (!scrollAreas.length) {
        return;
    }

    function initializeHorizontalScroll(scrollArea) {
        const inputQuery = scrollArea.matches(
            '.space__gallery, .events__cards, .souvenirs__cards',
        ) ? mobileQuery : adaptiveQuery;
        let touchStartX = 0;
        let touchStartY = 0;
        let isHorizontalGesture = false;

        scrollArea.addEventListener('wheel', (event) => {
            if (!inputQuery.matches) {
                return;
            }

            const hasHorizontalDelta = Math.abs(event.deltaX) > Math.abs(event.deltaY);

            if (!hasHorizontalDelta && !event.shiftKey) {
                return;
            }

            event.stopPropagation();

            if (event.shiftKey && !event.deltaX) {
                event.preventDefault();
                scrollArea.scrollLeft += event.deltaY;
            }
        }, { passive: false });

        scrollArea.addEventListener('touchstart', (event) => {
            if (!inputQuery.matches) {
                return;
            }

            touchStartX = event.changedTouches[0].clientX;
            touchStartY = event.changedTouches[0].clientY;
            isHorizontalGesture = false;
        }, { passive: true });

        scrollArea.addEventListener('touchmove', (event) => {
            if (!inputQuery.matches) {
                return;
            }

            const touch = event.changedTouches[0];
            const distanceX = Math.abs(touch.clientX - touchStartX);
            const distanceY = Math.abs(touch.clientY - touchStartY);

            if (distanceX > distanceY) {
                isHorizontalGesture = true;
                event.stopPropagation();
            }
        }, { passive: true });

        scrollArea.addEventListener('touchend', (event) => {
            if (isHorizontalGesture) {
                event.stopPropagation();
            }

            isHorizontalGesture = false;
        }, { passive: true });

        scrollArea.addEventListener('touchcancel', () => {
            isHorizontalGesture = false;
        }, { passive: true });
    }

    scrollAreas.forEach(initializeHorizontalScroll);
})();
