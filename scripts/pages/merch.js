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

    const activateTab = (tabName, { moveFocus = false, updateHash = false } = {}) => {
        const tab = tabs.find((item) => item.dataset.merchTab === tabName);

        if (!tab) {
            return false;
        }

        tabs.forEach((item) => {
            const isActive = item === tab;
            item.classList.toggle('is-active', isActive);
            item.setAttribute('aria-selected', String(isActive));
            item.tabIndex = isActive ? 0 : -1;
        });

        panels.forEach((panel) => {
            const isActive = panel.dataset.merchPanel === tabName;
            panel.classList.toggle('is-active', isActive);
            panel.hidden = !isActive;
        });

        if (moveFocus) {
            tab.focus();
        }

        if (updateHash) {
            window.history.replaceState(
                window.history.state,
                '',
                `${window.location.pathname}${window.location.search}#${tabName}`,
            );
        }

        return true;
    };

    tabs.forEach((tab, index) => {
        tab.addEventListener('click', () => {
            activateTab(tab.dataset.merchTab, { updateHash: true });
        });

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
            activateTab(tabs[nextIndex].dataset.merchTab, {
                moveFocus: true,
                updateHash: true,
            });
        });
    });

    const initialTab = tabs.find((tab) => tab.classList.contains('is-active')) || tabs[0];
    const defaultTabName = initialTab.dataset.merchTab;

    function getHashTabName() {
        if (!window.location.hash) {
            return '';
        }

        try {
            return decodeURIComponent(window.location.hash.slice(1));
        } catch {
            return '';
        }
    }

    function activateTabFromHash({ fallbackToDefault = false } = {}) {
        const tabName = getHashTabName();

        if (tabName === 'open-popup') {
            return;
        }

        if (!activateTab(tabName) && fallbackToDefault) {
            activateTab(defaultTabName);
        }
    }

    activateTabFromHash({ fallbackToDefault: true });
    window.addEventListener('hashchange', () => {
        activateTabFromHash({ fallbackToDefault: true });
    });
})();
