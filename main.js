// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    http://www.globexdesigns.com/
// @version      2.0
// @description  Hides watched videos from your YouTube subscriptions page.
// @author       Evgueni Naverniouk
// @grant        GM_addStyle
// @include      http://*.youtube.com/*
// @include      http://youtube.com/*
// @include      https://*.youtube.com/*
// @include      https://youtube.com/*
// @require      https://code.jquery.com/jquery-3.1.1.slim.min.js
// ==/UserScript==

// To submit bugs or submit revisions please see visit the repository at:
// https://github.com/globexdesigns/youtube-hide-watched
// You can open new issues at:
// https://github.com/globexdesigns/youtube-hide-watched/issues

(function (undefined) {
    // Enable for debugging
    var __DEV__ = false;

    // Set defaults
    localStorage.YTHWV_WATCHED = localStorage.YTHWV_WATCHED || 'false';

    GM_addStyle(`
.YT-HWV-WATCHED {
    display: none !important;
}

.YT-HWV-BUTTON {
    background: transparent;
    border: 0;
    color: #888888;
    cursor: pointer;
    height: 40px;
    outline: 0;
    padding: 0 8px;
    width: 40px;
}

.YT-HWV-BUTTON svg {
    height: 24px;
    width: 24px;
}

.YT-HWV-BUTTON:focus,
.YT-HWV-BUTTON:hover {
    color: #FFF;
}

.YT-HWV-MENU {
    background: #F8F8F8;
    border: 1px solid #D3D3D3;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    display: none;
    font-size: 12px;
    margin-top: -1px;
    padding: 10px;
    position: absolute;
    right: 0;
    text-align: center;
    top: 100%;
    white-space: normal;
    z-index: 9999;
}

.YT-HWV-MENU-ON { display: block; }
.YT-HWV-MENUBUTTON-ON span { transform: rotate(180deg) }

`);

    var visibilityIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>';
    var visibilityOffIcon = '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor"><path d="M24 14c5.52 0 10 4.48 10 10 0 1.29-.26 2.52-.71 3.65l5.85 5.85c3.02-2.52 5.4-5.78 6.87-9.5-3.47-8.78-12-15-22.01-15-2.8 0-5.48.5-7.97 1.4l4.32 4.31c1.13-.44 2.36-.71 3.65-.71zM4 8.55l4.56 4.56.91.91C6.17 16.6 3.56 20.03 2 24c3.46 8.78 12 15 22 15 3.1 0 6.06-.6 8.77-1.69l.85.85L39.45 44 42 41.46 6.55 6 4 8.55zM15.06 19.6l3.09 3.09c-.09.43-.15.86-.15 1.31 0 3.31 2.69 6 6 6 .45 0 .88-.06 1.3-.15l3.09 3.09C27.06 33.6 25.58 34 24 34c-5.52 0-10-4.48-10-10 0-1.58.4-3.06 1.06-4.4zm8.61-1.57l6.3 6.3L30 24c0-3.31-2.69-6-6-6l-.33.03z"/></g></svg>';

    // ===========================================================

    var debounce = function (func, wait, immediate) {
        var timeout;
        return function() {
            var context = this, args = arguments;
            var later = function() {
                timeout = null;
                if (!immediate) func.apply(context, args);
            };
            var callNow = immediate && !timeout;
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
            if (callNow) func.apply(context, args);
        };
    };

    // ===========================================================

    var findWatchedElements = function () {
        var watched = $('.ytd-thumbnail-overlay-resume-playback-renderer');

        if (__DEV__) console.log(`[YT-HWV] Found ${watched.length} watched elements`);

        return watched.filter(function (i, bar) {
            return bar.style.width && parseInt(bar.style.width, 10) > 0;
        });
    };

    // ===========================================================

    var findParentByClass = function(el, cls) {
        while ((el = el.parentElement) && !el.classList.contains(cls));
        return el;
    };

    // ===========================================================

    var findButtonTarget = function () {
        // Button will be injected into the menu of an item browser
        var target = $('#title-container #top-level-buttons');

        // If this is a "History" video -- we don't need a button. We use
        // DOM detection here instead of URL detection, because the URL
        // will change before the DOM has been updated.
        if ($('#watch-history-pause-button').length > 0) return;

        // If the target can't be found, we might be on a channel page
        if (!target.length) target = $('#browse-items-primary .branded-page-v2-subnav-container');

        return target;
    };

    // ===========================================================

    var isButtonAlreadyThere = function () {
        return $('.YT-HWV-BUTTON').length > 0;
    };

    // ===========================================================

    var addClassToWatchedRows = function () {
        if (localStorage.YTHWV_WATCHED !== 'true') return;

        $(findWatchedElements()).each(function (i, item) {
            // "Subscription" section needs us to hide the "#contents",
            // but in the "Trending" section, that class will hide everything.
            // So there, we need to hide the "ytd-video-renderer"
            var row;
            if (window.location.href.indexOf('/feed/subscriptions') > 0) {
                row = item.closest('#contents');
            } else {
                row = item.closest('ytd-video-renderer');
            }

            var gridItem = item.closest('.yt-shelf-grid-item');

            // If we're in grid view, we will hide the "grid" item,
            // otherwise we'll hide the item row
            var itemsToHide = gridItem ? $(gridItem) : $(row);

            // If this is the first row in the list, then we can't hide it entirely,
            // otherwise it will also hide the menu. So, we'll have to hide various
            // inner components instead.
            const hasMenu = itemsToHide.find('.menu-container.shelf-title-cell .yt-uix-menu-container').length > 0;
            if (hasMenu) {
                var itemToHide = itemsToHide;
                itemsToHide = itemToHide.find('.expanded-shelf').add(itemToHide.find('.branded-page-module-title'));
            }

            itemsToHide.addClass('YT-HWV-WATCHED');
        });
    };

    // ===========================================================

    var removeClassFromWatchedRows = function () {
        $('.YT-HWV-WATCHED').each(function (i, item) {
           $(item).removeClass('YT-HWV-WATCHED');
        });
    };

    // ===========================================================

    var addButton = function () {
        if (isButtonAlreadyThere()) return;

        // Find button target
        var target = findButtonTarget();
        if (!target) return;

        // Generate button DOM
        var icon = localStorage.YTHWV_WATCHED === 'true' ? visibilityIcon : visibilityOffIcon;
        var button = $('<button class="YT-HWV-BUTTON">' + icon + '</button>');

        // Attach events
        button.on("click", function () {
            var value = localStorage.YTHWV_WATCHED === 'true' ? 'false' : 'true';
            localStorage.YTHWV_WATCHED = value;
            if (value === 'true') {
                addClassToWatchedRows();
                $(this).html(visibilityIcon);
            } else {
                removeClassFromWatchedRows();
                $(this).html(visibilityOffIcon);
            }
        });

        // Insert button into DOM
        target.prepend(button);
    };

    var run = debounce(function () {
        if (__DEV__) console.log('[YT-HWV] Running check for watched videos');
        addClassToWatchedRows();
        addButton();
    }, 250);

    // ===========================================================

    // Hijack all XHR calls
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (data) {
        this.addEventListener("readystatechange", function () {
            if (
                // Anytime more videos are fetched -- re-run script
                this.responseURL.indexOf('browse_ajax?action_continuation') > 0
            ) {
                console.log('fetched more');
                setTimeout(function () {
                    run();
                }, 0);
            }
        }, false);
        send.call(this, data);
    };

    // ===========================================================

    var observeDOM = (function() {
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
        var eventListenerSupported = window.addEventListener;

        return function(obj, callback) {
            if (MutationObserver) {
                var obs = new MutationObserver(function (mutations, observer) {
                    if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
                        callback(mutations);
                    }
                });

                obs.observe(obj, {childList: true, subtree: true});
            } else if (eventListenerSupported) {
                obj.addEventListener('DOMNodeInserted', callback, false);
                obj.addEventListener('DOMNodeRemoved', callback, false);
            }
        };
    })();

    // ===========================================================

    if (__DEV__) console.log('[YT-HWV] Starting Script');

    // YouTube does navigation via history and also does a bunch
    // of AJAX video loading. In order to ensure we're always up
    // to date, we have to listen for ANY DOM change event, and
    // re-run our script.
    if (__DEV__) console.log('[YT-HWV] Attaching DOM listener');
    observeDOM(document.body, run);

    run();
}());
