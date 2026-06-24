(function () {
    'use strict';

    if (document.body.dataset.page !== 'events') {
        return;
    }

    const EVENT_HASHES = new Set(['event-1', 'event-2', 'event-3']);

    function getEventSelectorFromHash() {
        if (!window.location.hash) {
            return null;
        }

        let eventId = '';

        try {
            eventId = decodeURIComponent(window.location.hash.slice(1));
        } catch {
            return null;
        }

        return EVENT_HASHES.has(eventId) ? `#${eventId}` : null;
    }

    function activateEventFromHash({ initial = false } = {}) {
        const selector = getEventSelectorFromHash();
        const transitions = window.sectionTransitions;

        if (!selector || !transitions) {
            return;
        }

        const target = document.querySelector(selector);
        const targetIndex = transitions.getSections().indexOf(target);

        if (targetIndex < 0) {
            return;
        }

        if (initial) {
            transitions.activate(selector);
        } else {
            transitions.goToSection(targetIndex);
        }
    }

    function initializeEventHashes() {
        activateEventFromHash({ initial: true });
        window.addEventListener('hashchange', activateEventFromHash);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeEventHashes, { once: true });
    } else {
        initializeEventHashes();
    }
})();
