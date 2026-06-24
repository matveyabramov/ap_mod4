(function () {
    'use strict';

    const mobileQuery = window.matchMedia('(max-width: 1279px)');
    const menu = document.querySelector('.mobile-menu');
    const panel = menu?.querySelector('.mobile-menu__panel');
    const overlay = menu?.querySelector('.mobile-menu__overlay');
    const closeButton = menu?.querySelector('.mobile-menu__close');
    const menuLinks = menu?.querySelectorAll('.mobile-menu__link, .mobile-menu__cta');
    const triggers = document.querySelectorAll('.header__burger');

    if (!menu || !panel || !overlay || !closeButton || !triggers.length) {
        return;
    }

    let activeTrigger = null;

    function openMenu(trigger) {
        if (!mobileQuery.matches) {
            return;
        }

        activeTrigger = trigger;
        menu.hidden = false;
        menu.inert = false;
        menu.setAttribute('aria-hidden', 'false');
        menu.classList.add('is-open');
        document.body.classList.add('is-mobile-menu-open');

        triggers.forEach((button) => {
            button.setAttribute('aria-expanded', String(button === trigger));
        });

        closeButton.focus();
    }

    function closeMenu({ restoreFocus = true } = {}) {
        menu.classList.remove('is-open');
        menu.setAttribute('aria-hidden', 'true');
        menu.inert = true;
        document.body.classList.remove('is-mobile-menu-open');
        triggers.forEach((button) => button.setAttribute('aria-expanded', 'false'));

        if (restoreFocus && activeTrigger && !activeTrigger.hidden) {
            activeTrigger.focus();
        }

        activeTrigger = null;
    }

    function syncViewport() {
        const isMobile = mobileQuery.matches;

        triggers.forEach((button) => {
            button.hidden = !isMobile;
        });

        if (isMobile) {
            menu.hidden = false;
            menu.inert = !menu.classList.contains('is-open');
        } else {
            closeMenu({ restoreFocus: false });
            menu.hidden = true;
        }
    }

    triggers.forEach((button) => {
        button.addEventListener('click', () => openMenu(button));
    });

    overlay.addEventListener('click', closeMenu);
    closeButton.addEventListener('click', closeMenu);
    menuLinks?.forEach((link) => link.addEventListener('click', closeMenu));
    menu.addEventListener('wheel', (event) => {
        if (menu.classList.contains('is-open')) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, { passive: false });
    menu.addEventListener('touchmove', (event) => {
        if (menu.classList.contains('is-open')) {
            event.preventDefault();
            event.stopPropagation();
        }
    }, { passive: false });

    document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && menu.classList.contains('is-open')) {
            closeMenu();
        }
    });

    mobileQuery.addEventListener('change', syncViewport);
    syncViewport();
})();
