(function () {
    'use strict';

    if (window.__submissionModalInitialized) {
        return;
    }

    window.__submissionModalInitialized = true;

    document.addEventListener('submit', (event) => {
        const form = event.target;

        if (!(form instanceof HTMLFormElement)) {
            return;
        }

        event.preventDefault();
        window.location.href = '/ap_mod4/404.html';
    });

    function initializeSubmissionModal() {
        const modal = document.getElementById('submission-modal');
        const overlay = modal?.querySelector('.submission-modal__overlay');
        const closeButton = modal?.querySelector('.submission-modal__close');
        const triggers = document.querySelectorAll(
            '[data-submission-modal-open], a[href="#open-popup"]',
        );

        if (!modal || !overlay || !closeButton) {
            return;
        }

        let activeTrigger = null;

        function openModal(trigger = null) {
            activeTrigger = trigger instanceof HTMLElement
                ? trigger
                : document.activeElement instanceof HTMLElement
                    ? document.activeElement
                    : null;

            modal.hidden = false;
            modal.inert = false;
            modal.setAttribute('aria-hidden', 'false');
            document.body.classList.add('is-submission-modal-open');
            closeButton.focus();
        }

        function closeModal() {
            modal.setAttribute('aria-hidden', 'true');
            modal.inert = true;
            modal.hidden = true;
            document.body.classList.remove('is-submission-modal-open');

            if (window.location.hash === '#open-popup') {
                window.history.replaceState(
                    window.history.state,
                    '',
                    `${window.location.pathname}${window.location.search}`,
                );
            }

            if (activeTrigger?.isConnected && !activeTrigger.hidden) {
                activeTrigger.focus();
            }

            activeTrigger = null;
        }

        triggers.forEach((trigger) => {
            trigger.addEventListener('click', (event) => {
                event.preventDefault();

                if (trigger.matches('a[href="#open-popup"]')) {
                    window.history.replaceState(
                        window.history.state,
                        '',
                        `${window.location.pathname}${window.location.search}#open-popup`,
                    );
                }

                openModal(trigger);
            });
        });

        overlay.addEventListener('click', closeModal);
        closeButton.addEventListener('click', closeModal);
        modal.addEventListener('wheel', (event) => event.stopPropagation());
        modal.addEventListener('touchmove', (event) => event.stopPropagation());

        document.addEventListener('keydown', (event) => {
            if (event.key === 'Escape' && !modal.hidden) {
                closeModal();
            }
        });

        if (window.location.hash === '#open-popup') {
            openModal();
        }
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initializeSubmissionModal, { once: true });
    } else {
        initializeSubmissionModal();
    }
})();
