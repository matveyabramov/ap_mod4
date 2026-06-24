(function () {
    'use strict';

    if (document.body.dataset.page !== 'merch') {
        return;
    }

    const tabs = Array.from(document.querySelectorAll('[data-merch-tab]'));
    const panels = Array.from(document.querySelectorAll('[data-merch-panel]'));

    if (!tabs.length || !panels.length) {
        return;
    }

    const activateTab = (tab, moveFocus = false) => {
        const category = tab.dataset.merchTab;

        tabs.forEach((item) => {
            const isActive = item === tab;
            item.classList.toggle('is-active', isActive);
            item.setAttribute('aria-selected', String(isActive));
            item.tabIndex = isActive ? 0 : -1;
        });

        panels.forEach((panel) => {
            const isActive = panel.dataset.merchPanel === category;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });

        if (moveFocus) {
            tab.focus();
        }
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => activateTab(tab));

        tab.addEventListener('keydown', (event) => {
            let nextIndex = index;

            if (event.key === 'ArrowRight') {
                nextIndex = (index + 1) % tabs.length;
            } else if (event.key === 'ArrowLeft') {
                nextIndex = (index - 1 + tabs.length) % tabs.length;
            } else if (event.key === 'Home') {
                nextIndex = 0;
            } else if (event.key === 'End') {
                nextIndex = tabs.length - 1;
            } else {
                return;
            }

            event.preventDefault();
            activateTab(tabs[nextIndex], true);
        });
    });

    const initialTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
    activateTab(initialTab);
})();
