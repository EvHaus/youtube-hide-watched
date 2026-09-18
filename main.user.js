// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    https://www.haus.gg/
// @version      6.20
// @license      MIT
// @description  Hides watched videos (and shorts) from your YouTube subscriptions page.
// @author       Ev Haus
// @author       netjeff
// @author       actionless
// @author       CHJ85
// @match        http://*.youtube.com/*
// @match        http://youtube.com/*
// @match        https://*.youtube.com/*
// @match        https://youtube.com/*
// @noframes
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// @grant        GM.getValue
// @grant        GM.setValue
// ==/UserScript==

((_undefined) => {
    const DEBUG = false;

    const STATES = {
        NORMAL: 'normal',
        DIMMED: 'dimmed',
        HIDDEN: 'hidden',
    };

    let watchedState = GM_getValue('WATCHED_STATE', STATES.HIDDEN);
    let shortsState = GM_getValue('SHORTS_STATE', STATES.HIDDEN);

    const addStyle = (aCss) => {
        const head = document.getElementsByTagName('head')[0];
        if (head) {
            const style = document.createElement('style');
            style.setAttribute('type', 'text/css');
            style.textContent = aCss;
            head.appendChild(style);
            return style;
        }
        return null;
    };

    addStyle(`
        .YT-HWV-WATCHED-HIDDEN { display: none !important; }
        .YT-HWV-WATCHED-DIMMED { opacity: 0.3; }
        .YT-HWV-SHORTS-HIDDEN { display: none !important; }
        .YT-HWV-SHORTS-DIMMED { opacity: 0.3; }

        /* Container styled to match YouTube's topbar pill/group containers */
        .YT-HWV-BUTTONS {
            display: flex;
            gap: 2px;
            margin: 0 12px;
            align-items: center;
            background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.05));
            border-radius: 20px;
            padding: 2px;
        }
        html[dark] .YT-HWV-BUTTONS, [dark] .YT-HWV-BUTTONS {
            background: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.1));
        }

        /* Individual button matching YouTube's native topbar icon buttons */
        .YT-HWV-BUTTON {
            align-items: center;
            background: transparent;
            border: 0;
            border-radius: 50%;
            color: var(--yt-spec-text-primary, #0F0F0F);
            cursor: pointer;
            display: flex;
            height: 36px;
            justify-content: center;
            outline: 0;
            width: 36px;
            position: relative;
            transition: background 0.15s ease;
        }
        html[dark] .YT-HWV-BUTTON, [dark] .YT-HWV-BUTTON {
            color: var(--yt-spec-text-primary, #F1F1F1);
        }
        .YT-HWV-BUTTON:hover {
            background: var(--yt-spec-badge-chip-background, rgba(0, 0, 0, 0.08));
        }
        html[dark] .YT-HWV-BUTTON:hover, [dark] .YT-HWV-BUTTON:hover {
            background: var(--yt-spec-badge-chip-background, rgba(255, 255, 255, 0.15));
        }

        /* State Modifiers */
        .YT-HWV-STATE-NORMAL { opacity: 0.4; }
        .YT-HWV-STATE-DIMMED { opacity: 0.85; }
        .YT-HWV-STATE-HIDDEN { opacity: 1; }

        /* Subtle Corner Indicator Badges matching YouTube theme accents */
        .YT-HWV-BUTTON::after {
            content: attr(data-badge);
            position: absolute;
            bottom: 2px;
            right: 2px;
            font-size: 8px;
            font-weight: 700;
            padding: 0 2px;
            border-radius: 3px;
            line-height: 9px;
            letter-spacing: -0.2px;
        }
        .YT-HWV-STATE-NORMAL::after { content: 'OFF'; background: var(--yt-spec-icon-disabled, #909090); color: var(--yt-spec-static-brand-white, #fff); }
        .YT-HWV-STATE-DIMMED::after { content: 'DIM'; background: var(--yt-spec-raised-background, #f5f5f5); color: var(--yt-spec-text-primary, #0f0f0f); border: 1px solid var(--yt-spec-icon-disabled, #ccc); }
        .YT-HWV-STATE-HIDDEN::after { content: 'HIDE'; background: var(--yt-spec-call-to-action, #3ea6ff); color: var(--yt-spec-static-brand-white, #fff); }

        html[dark] .YT-HWV-STATE-DIMMED::after {
            background: var(--yt-spec-raised-background, #272727);
            color: var(--yt-spec-text-primary, #f1f1f1);
            border-color: var(--yt-spec-icon-disabled, #3f3f3f);
        }
    `);

    if (typeof trustedTypes !== 'undefined' && trustedTypes.defaultPolicy === null) {
        const s = (s) => s;
        trustedTypes.createPolicy('default', {
            createHTML: s,
            createScript: s,
            createScriptURL: s,
        });
    }

    function cycleState(currentState) {
        if (currentState === STATES.NORMAL) return STATES.DIMMED;
        if (currentState === STATES.DIMMED) return STATES.HIDDEN;
        return STATES.NORMAL;
    }

    function updateButtonVisuals(button, type, state) {
        button.title = `Toggle ${type}: currently "${state}" (Click to change)`;
        button.className = `YT-HWV-BUTTON YT-HWV-STATE-${state.toUpperCase()}`;
    }

    function processItems() {
        const items = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, yt-lockup-view-model');

        items.forEach((item) => {
            const renderTarget = item.closest('ytd-rich-item-renderer, ytd-grid-video-renderer') || item;

            renderTarget.classList.remove('YT-HWV-WATCHED-HIDDEN', 'YT-HWV-WATCHED-DIMMED', 'YT-HWV-SHORTS-HIDDEN', 'YT-HWV-SHORTS-DIMMED');

            const watchedBar = item.querySelector('.ytThumbnailOverlayProgressBarHostWatchedProgressBar, ytd-thumbnail-overlay-resume-playback-renderer');
            if (watchedBar) {
                const progressSegment = watchedBar.querySelector('.ytThumbnailOverlayProgressBarHostWatchedProgressBarSegment');
                let percent = 100;
                if (progressSegment && progressSegment.style.width) {
                    percent = parseFloat(progressSegment.style.width) || 100;
                }

                if (percent >= 10) {
                    if (watchedState === STATES.HIDDEN) {
                        renderTarget.classList.add('YT-HWV-WATCHED-HIDDEN');
                    } else if (watchedState === STATES.DIMMED) {
                        renderTarget.classList.add('YT-HWV-WATCHED-DIMMED');
                    }
                }
            }

            const isShort = item.querySelector('a[href*="/shorts/"]') || item.tagName.toLowerCase() === 'yt-shorts-lockup-view-model';
            if (isShort) {
                if (shortsState === STATES.HIDDEN) {
                    renderTarget.classList.add('YT-HWV-SHORTS-HIDDEN');
                } else if (shortsState === STATES.DIMMED) {
                    renderTarget.classList.add('YT-HWV-SHORTS-DIMMED');
                }
            }
        });
    }

    function insertButtons() {
        if (document.querySelector('.YT-HWV-BUTTONS')) return;

        const targetContainer = document.querySelector('ytd-masthead #end #buttons') || document.querySelector('ytd-masthead #end');
        if (!targetContainer) return;

        const container = document.createElement('div');
        container.className = 'YT-HWV-BUTTONS';

        // Watched Videos Button
        const watchedBtn = document.createElement('button');
        watchedBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="currentColor" d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>`;
        updateButtonVisuals(watchedBtn, 'Watched Videos', watchedState);

        watchedBtn.addEventListener('click', () => {
            watchedState = cycleState(watchedState);
            GM_setValue('WATCHED_STATE', watchedState);
            updateButtonVisuals(watchedBtn, 'Watched Videos', watchedState);
            processItems();
        });

        // Shorts Button
        const shortsBtn = document.createElement('button');
        shortsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 48 48"><path fill="currentColor" d="M31.95 3c-1.11 0-2.25.3-3.27.93l-15.93 9.45C10.32 14.79 8.88 17.67 9 20.7c.15 3 1.74 5.61 4.17 6.84.06.03 2.25 1.05 2.25 1.05l-2.7 1.59c-3.42 2.04-4.74 6.81-2.94 10.65C11.07 43.47 13.5 45 16.05 45c1.11 0 2.22-.3 3.27-.93l15.93-9.45c2.4-1.44 3.87-4.29 3.72-7.35-.12-2.97-1.74-5.61-4.17-6.81-.06-.03-2.25-1.05-2.25-1.05l2.7-1.59c3.42-2.04 4.74-6.81 2.91-10.65C36.93 4.53 34.47 3 31.95 3z"/></svg>`;
        updateButtonVisuals(shortsBtn, 'Shorts', shortsState);

        shortsBtn.addEventListener('click', () => {
            shortsState = cycleState(shortsState);
            GM_setValue('SHORTS_STATE', shortsState);
            updateButtonVisuals(shortsBtn, 'Shorts', shortsState);
            processItems();
        });

        container.appendChild(watchedBtn);
        container.appendChild(shortsBtn);
        targetContainer.prepend(container);
    }

    const observer = new MutationObserver(() => {
        insertButtons();
        processItems();
    });

    observer.observe(document.body, {
        childList: true,
        subtree: true,
    });

    insertButtons();
    processItems();
})();
