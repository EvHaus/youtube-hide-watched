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

    if (
        typeof trustedTypes !== 'undefined' &&
        trustedTypes.defaultPolicy === null
    ) {
        const s = (s) => s;
        trustedTypes.createPolicy('default', {
            createHTML: s,
            createScript: s,
            createScriptURL: s,
        });
    }

    // GM_config setup for threshold control
    const title = document.createElement('a');
    title.textContent = 'YouTube: Hide Watched Videos Settings';
    title.href = 'https://github.com/EvHaus/youtube-hide-watched';
    title.target = '_blank';

    const gmc = new GM_config({
        events: {
            save() {
                this.close();
                location.reload();
            },
        },
        fields: {
            HIDDEN_THRESHOLD_PERCENT: {
                default: 10,
                label: 'Hide/Dim Videos Above Percent',
                max: 100,
                min: 0,
                type: 'int',
            },
        },
        id: 'YouTubeHideWatchedVideos',
        title,
    });

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

        .YT-HWV-BUTTONS {
            background: transparent;
            border: 1px solid var(--ytd-searchbox-legacy-border-color, #ccc);
            border-radius: 40px;
            display: flex;
            gap: 2px;
            margin: 0 12px;
            align-items: center;
            padding: 0 2px;
        }
        html[dark] .YT-HWV-BUTTONS, [dark] .YT-HWV-BUTTONS {
            border-color: var(--ytd-searchbox-legacy-border-color, #3f3f3f);
        }
        .YT-HWV-BUTTON {
            align-items: center;
            background: transparent;
            border: 0;
            border-radius: 40px;
            color: var(--yt-spec-text-primary, #0F0F0F);
            cursor: pointer;
            display: flex;
            height: 34px;
            justify-content: center;
            outline: 0;
            width: 34px;
            position: relative;
        }
        html[dark] .YT-HWV-BUTTON, [dark] .YT-HWV-BUTTON {
            color: var(--yt-spec-text-primary, #F1F1F1);
        }
        .YT-HWV-BUTTON:hover {
            background: rgba(0,0,0,0.06);
        }
        html[dark] .YT-HWV-BUTTON:hover, [dark] .YT-HWV-BUTTON:hover {
            background: rgba(255,255,255,0.1);
        }

        /* Centered, uncolored text indicators avoiding frame overlap */
        .YT-HWV-BUTTON::after {
            content: attr(data-badge);
            position: absolute;
            bottom: 2px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 7px;
            font-weight: 600;
            line-height: 1;
            opacity: 0.7;
            color: var(--yt-spec-text-secondary, #606060);
            pointer-events: none;
            white-space: nowrap;
        }
        .YT-HWV-STATE-NORMAL::after { content: 'OFF'; }
        .YT-HWV-STATE-DIMMED::after { content: 'DIM'; }
        .YT-HWV-STATE-HIDDEN::after { content: 'HIDE'; }

        .YT-HWV-STATE-NORMAL { opacity: 0.4; }
        .YT-HWV-STATE-DIMMED { opacity: 0.75; }
        .YT-HWV-STATE-HIDDEN { opacity: 1; }
    `);

    const STATES = { NORMAL: 'normal', DIMMED: 'dimmed', HIDDEN: 'hidden' };
    let watchedState = GM_getValue('WATCHED_STATE', STATES.HIDDEN);
    let shortsState = GM_getValue('SHORTS_STATE', STATES.HIDDEN);

    function cycleState(state) {
        return state === STATES.NORMAL ? STATES.DIMMED : state === STATES.DIMMED ? STATES.HIDDEN : STATES.NORMAL;
    }

    function updateButtonVisuals(btn, type, state) {
        btn.title = `Toggle ${type}: currently "${state}" (Shift+click for settings)`;
        btn.className = `YT-HWV-BUTTON YT-HWV-STATE-${state.toUpperCase()}`;
    }

    function processItems() {
        const items = document.querySelectorAll('ytd-rich-item-renderer, ytd-grid-video-renderer, yt-lockup-view-model');
        const threshold = gmc.get('HIDDEN_THRESHOLD_PERCENT') || 10;

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

                if (percent >= threshold) {
                    if (watchedState === STATES.HIDDEN) renderTarget.classList.add('YT-HWV-WATCHED-HIDDEN');
                    else if (watchedState === STATES.DIMMED) renderTarget.classList.add('YT-HWV-WATCHED-DIMMED');
                }
            }

            const isShort = item.querySelector('a[href*="/shorts/"]') || item.tagName.toLowerCase() === 'yt-shorts-lockup-view-model';
            if (isShort) {
                if (shortsState === STATES.HIDDEN) renderTarget.classList.add('YT-HWV-SHORTS-HIDDEN');
                else if (shortsState === STATES.DIMMED) renderTarget.classList.add('YT-HWV-SHORTS-DIMMED');
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
        watchedBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="currentColor" d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>`;
        updateButtonVisuals(watchedBtn, 'Watched Videos', watchedState);

        watchedBtn.addEventListener('click', (e) => {
            if (e.shiftKey) {
                gmc.open();
            } else {
                watchedState = cycleState(watchedState);
                GM_setValue('WATCHED_STATE', watchedState);
                updateButtonVisuals(watchedBtn, 'Watched Videos', watchedState);
                processItems();
            }
        });

        // Shorts Button
        const shortsBtn = document.createElement('button');
        shortsBtn.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 48 48"><path fill="currentColor" d="M31.95 3c-1.11 0-2.25.3-3.27.93l-15.93 9.45C10.32 14.79 8.88 17.67 9 20.7c.15 3 1.74 5.61 4.17 6.84.06.03 2.25 1.05 2.25 1.05l-2.7 1.59c-3.42 2.04-4.74 6.81-2.94 10.65C11.07 43.47 13.5 45 16.05 45c1.11 0 2.22-.3 3.27-.93l15.93-9.45c2.4-1.44 3.87-4.29 3.72-7.35-.12-2.97-1.74-5.61-4.17-6.81-.06-.03-2.25-1.05-2.25-1.05l2.7-1.59c3.42-2.04 4.74-6.81 2.91-10.65C36.93 4.53 34.47 3 31.95 3z"/></svg>`;
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

    observer.observe(document.body, { childList: true, subtree: true });

    insertButtons();
    processItems();
})();
