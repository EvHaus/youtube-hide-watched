// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    http://www.globexdesigns.com/
// @version      1.4
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
    localStorage.YTHWV_WATCH_PERC = localStorage.YTHWV_WATCH_PERC || '0';

    GM_addStyle(`
.YT-HWV-WATCHED { display: none !important; }

.YT-HWV-CONTAINER {
    display: inline-flex;
    position: relative;
    vertical-align: -2px;
}

.YT-HWV-BUTTON {
    align-items: center;
    background: #F8F8F8;
    border: 1px solid #D3D3D3;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.05);
    color: #333;
    cursor: pointer;
    display: flex;
    font-size: 11px;
    font-weight: 500;
    height: 28px;
}

.YT-HWV-BUTTON:focus,
.YT-HWV-BUTTON:hover {
    background: #F0F0F0;
    border-color: #C6C6C6;
    box-shadow: 0 1px 0 rgba(0, 0, 0, 0.10);
}

.YT-HWV-HIDEBUTTON {
    border-radius: 2px 0 0 2px;
    display: block;
    padding: 0 10px;
}

.YT-HWV-MENUBUTTON {
    border-radius: 0 2px 2px 0;
    border-left: 0;
    padding: 0 10px 0 5px;
}

.YT-HWV-BUTTON-CHECKBOX {
    margin: 0 8px 0 0;
    pointer-events: none;
    vertical-align: -2px;
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

.YT-HWV-MENU-WATCH-PERC {
    align-items: center;
    display: flex;
    justify-content: center;
    font-size: 11px;
    margin: 5px auto;
}

.YT-HWV-MENU-WATCH-PERC-INPUT {
    cursor: pointer;
    margin: auto 10px;
    vertical-align: -4px;
}
`);

    // ===========================================================

    var findWatchedElements = function () {
        var watched = $('.resume-playback-progress-bar');

        // New YouTube (2017-04-14)
        if (!watched.length) watched = $('.ytd-thumbnail-overlay-resume-playback-renderer');

        if (__DEV__) console.log(`[YT-HWV] Found ${watched.length} watched elements`);

        return watched.filter(function (i, bar) {
            return bar.style.width && parseInt(bar.style.width, 10) > parseInt(localStorage.YTHWV_WATCH_PERC, 10);
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
        var target = $('#browse-items-primary .yt-uix-menu-top-level-button-container');

        // New YouTube (2017-04-14)
        if (!target.length) target = $('#top-level-buttons');

        // If this is a "History" video -- we don't need a button. We use
        // DOM detection here instead of URL detection, because the URL
        // will change before the DOM has been updated.
        if ($('#watch-history-pause-button').length > 0) return;

        // If th target can't be found, we might be on a channel page
        if (!target.length) target = $('#browse-items-primary .branded-page-v2-subnav-container');

        return target;
    };

    // ===========================================================

    var isButtonAlreadyThere = function () {
        return $('.YT-HWV-CONTAINER').length > 0;
    };

    // ===========================================================

    var addClassToWatchedRows = function () {
        // Clean up first
        $('.YT-HWV-WATCHED').removeClass('YT-HWV-WATCHED');

        if (localStorage.YTHWV_WATCHED !== 'true') return;

        $(findWatchedElements()).each(function (i, item) {
            // "Subscription" section needs us to hide the "feed-item-container",
            // but in the "Trending" section, that class will hide everything.
            // So there, we need to hide the "expanded-shelf-content-item-wrapper"
            var row;
            if (window.location.href.indexOf('/feed/subscriptions') > 0) {
                row = item.closest('.feed-item-container');

                // New YouTube (2017-04-14)
                if (!row || !row.length) row = item.closest('ytd-item-section-renderer');
            } else {
                row = item.closest('.expanded-shelf-content-item-wrapper');
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

    var addCheckboxButton = function () {
        if (isButtonAlreadyThere()) return;

        // Find button target
        var target = findButtonTarget();
        if (!target) return;

        // Generate button DOM
        var li = $('<li class="yt-uix-menu-top-level-button yt-uix-menu-top-level-flow-button" />');
        var container = $('<div class="YT-HWV-CONTAINER" />').appendTo(li);
        var button = $('<button class="YT-HWV-BUTTON YT-HWV-HIDEBUTTON">Hide Watched</button>').appendTo(container);
        var checkbox = $('<input class="YT-HWV-BUTTON-CHECKBOX" type="checkbox" />').prependTo(button);
        var menubutton = $('<button class="YT-HWV-BUTTON YT-HWV-MENUBUTTON"><span class="yt-uix-button-arrow yt-sprite" /></button>').appendTo(container);
        var menu = $('<div class="YT-HWV-MENU">Videos are considered "watched" when you have watched at least: </div>').appendTo(container);
        var watchedContainer = $('<div class="YT-HWV-MENU-WATCH-PERC">0%<span />100%</div>').appendTo(menu);
        var watchedInput = $('<input class="YT-HWV-MENU-WATCH-PERC-INPUT" type="range" max="100" min="0" />').appendTo(menu.find('span'));

        // Attach events
        button.on("click", function () {
            var value = localStorage.YTHWV_WATCHED === 'true' ? 'false' : 'true';
            localStorage.YTHWV_WATCHED = value;
            checkbox.attr('checked', value === 'true' ? true : false);
            addClassToWatchedRows();
        });

        menubutton.on("click", function () {
            menubutton.toggleClass("YT-HWV-MENUBUTTON-ON");
            menu.toggleClass("YT-HWV-MENU-ON");
        });

        watchedInput.on("change", function (event) {
            localStorage.YTHWV_WATCH_PERC = event.target.value;
            run();
        });

        // Set DOM values accordingly
        if (localStorage.YTHWV_WATCHED === 'true') checkbox.attr('checked', true);
        watchedInput.attr('value', localStorage.YTHWV_WATCH_PERC);

        // Insert button into DOM
        target.prepend(li);
    };

    var run = function () {
        if (__DEV__) console.log('[YT-HWV] Running check for watched videos');
        addClassToWatchedRows();
        addCheckboxButton();
    };

    // ===========================================================

    // Hijack all XHR calls
    var send = XMLHttpRequest.prototype.send;
    XMLHttpRequest.prototype.send = function (data) {
        this.addEventListener("readystatechange", function () {
            if (
                // Anytime more videos are fetched -- re-run script
                this.responseURL.indexOf('browse_ajax?action_continuation') > 0
            ) {
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
