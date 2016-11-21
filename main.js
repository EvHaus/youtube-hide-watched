// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    http://www.globexdesigns.com/
// @version      0.7
// @description  Hides watched videos from your YouTube subscriptions page.
// @author       Evgueni Naverniouk
// @grant        GM_addStyle
// @include      http://*.youtube.com/*
// @include      http://youtube.com/*
// @include      https://*.youtube.com/*
// @include      https://youtube.com/*
// ==/UserScript==

// To submit bugs or submit revisions please see visit the repository at:
// https://github.com/globexdesigns/youtube-hide-watched
// You can open new issues at:
// https://github.com/globexdesigns/youtube-hide-watched/issues

(function (undefined) {

    GM_addStyle("\
.GR-WATCHED {\
display: none;\
}\
.GR-BUTTON {\
cursor: pointer;\
position: absolute;\
right: 80px;\
top: 10px;\
}\
.GR-BUTTON-CHECKBOX {\
pointer-events: none;\
}\
");

    // ===========================================================

    var findWatchedElements = function () {
        var bars = document.getElementsByClassName('resume-playback-progress-bar');
        var watched = [];
        for (var i = 0, l = bars.length; i < l; i++) {
            var bar = bars[i];
            if (bar.style.width && parseInt(bar.style.width, 10) > 0) watched.push(bar);
        }
        return watched;
    };

    // ===========================================================

    var findParentByClass = function(el, cls) {
        while ((el = el.parentElement) && !el.classList.contains(cls));
        return el;
    };

    // ===========================================================

    var findButtonTarget = function () {
        return document.getElementById('browse-items-primary');
    };

    // ===========================================================

    var isButtonAlreadyThere = function () {
        var button = document.getElementsByClassName('GR-BUTTON');
        return button && button.length;
    };

    // ===========================================================

    var addClassToWatchedRows = function () {
        var items = findWatchedElements() || [];
        for (var i = 0, l = items.length; i < l; i++) {
            var item = items[i];

            // "Subscription" section needs us to hide the "feed-item-container",
            // but in the "Trending" section, that class will hide everything.
            // So there, we need to hide the "expanded-shelf-content-item-wrapper"
            var row;
            if (window.location.href.indexOf('/feed/subscriptions') > 0) {
                row = findParentByClass(item, 'feed-item-container');
            } else {
                row = findParentByClass(item, 'expanded-shelf-content-item-wrapper');
            }

            var gridItem = findParentByClass(item, 'yt-shelf-grid-item');

            // If we're in grid view, we will hide the "grid" item,
            // otherwise we'll hide the item row
            var itemToHide = gridItem ? gridItem : row;

            if (localStorage.GRWATCHED === 'true') {
                itemToHide.classList.add('GR-WATCHED');
            } else {
                itemToHide.classList.remove('GR-WATCHED');
            }
        }
    };

    // ===========================================================

    var addCheckboxButton = function () {
        if (isButtonAlreadyThere()) return;

        // Find button target
        var target = findButtonTarget();
        if (!target) return;

        // Add checkbox
        var checkboxContainer = document.createElement('span');
        checkboxContainer.className = 'yt-uix-button-icon-wrapper';
        var checkbox = document.createElement('input');
        checkbox.checked = localStorage.GRWATCHED === 'true' ? 'checked' : null;
        checkbox.className = 'GR-BUTTON-CHECKBOX';
        checkbox.type = 'checkbox';
        checkboxContainer.appendChild(checkbox);

        // Add label text
        var textnode = document.createTextNode("Hide Watched");

        // Create <button>
        var button = document.createElement('button');
        button.className = 'yt-uix-button yt-uix-button-size-default yt-uix-button-default GR-BUTTON';
        button.appendChild(checkboxContainer);
        button.appendChild(textnode);
        button.addEventListener('click', function (event) {
            var value = localStorage.GRWATCHED === 'true' ? 'false' : 'true';
            localStorage.GRWATCHED = value;
            checkbox.checked = value === 'true';
            addClassToWatchedRows();
        });

        target.appendChild(button);
    };

    var run = function () {
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

    var observeDOM = (function(){
        var MutationObserver = window.MutationObserver || window.WebKitMutationObserver,
            eventListenerSupported = window.addEventListener;

        return function(obj, callback){
            if( MutationObserver ){
                // define a new observer
                var obs = new MutationObserver(function(mutations, observer){
                    if( mutations[0].addedNodes.length || mutations[0].removedNodes.length )
                        callback();
                });
                // have the observer observe foo for changes in children
                obs.observe( obj, { childList:true, subtree:true });
            }
            else if( eventListenerSupported ){
                obj.addEventListener('DOMNodeInserted', callback, false);
                obj.addEventListener('DOMNodeRemoved', callback, false);
            }
        };
    })();

    // YouTube does weird things during navigation. This seems to be the only reliable way to
    // check when user moves from one page to another.
    observeDOM(document.body, function () {
        run();
    });

    // ===========================================================

    run();
}());
