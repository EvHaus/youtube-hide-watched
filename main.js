// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    http://www.globexdesigns.com/
// @version      0.3
// @description  Hides watched videos from your YouTube subscriptions page
// @author       Evgueni Naverniouk
// @grant        GM_addStyle
// @include      http://*.youtube.com/*
// @include      http://youtube.com/*
// @include      https://*.youtube.com/*
// @include      https://youtube.com/*
// ==/UserScript==

(function (undefined) {
    
    GM_addStyle("\
.GR-WATCHED {\
display: none;\
}\
.GR-LABEL {\
color:#666;\
cursor:pointer;\
}\
.GR-LABEL input {\
vertical-align: -2px;\
}\
");
    
    // ===========================================================
    
    var findWatchedElements = function () {
        return document.getElementsByClassName('watched');
    };
    
    // ===========================================================
    
    var findParentByClass = function(el, cls) {
        while ((el = el.parentElement) && !el.classList.contains(cls));
        return el;
    };
    
    // ===========================================================
    
    var findToolbar = function () {
        var toolbar = document.getElementsByClassName('appbar-nav-menu');
        if (!toolbar || !toolbar.length) return;
        return toolbar[0];
    };
    
    // ===========================================================
    
    var isCheckboxAlreadyThere = function () {
        var checkbox = document.getElementsByClassName('GR-LABEL');
        return checkbox && checkbox.length;
    };
    
    // ===========================================================
    
    var addClassToWatchedRows = function () {
        var items = findWatchedElements() || [];
        for (var i = 0, l = items.length; i < l; i++) {
            var item = items[i];
            var row = findParentByClass(item, 'feed-item-container');
            if (localStorage.GRWATCHED === 'true') {
                row.classList.add('GR-WATCHED');
            } else {
                row.classList.remove('GR-WATCHED');
            }
        };
    };
    
    // ===========================================================
    
    var addCheckboxButton = function () {
        if (isCheckboxAlreadyThere()) return;
        
        // Find toolbar
        var toolbar = findToolbar();
        if (!toolbar) return;
        
        // Add label
        var label = document.createElement('label');
        label.classList.add('GR-LABEL');
        
        // Add checkbox
        var checkbox = document.createElement('input');
        checkbox.type = 'checkbox';
        checkbox.checked = localStorage.GRWATCHED === 'true' ? 'checked' : null;
        checkbox.addEventListener('change', function (event) {
            localStorage.GRWATCHED = event.target.checked;
            addClassToWatchedRows();
        });
        label.appendChild(checkbox);
        
        // Add label text
        var textnode = document.createTextNode("Hide Watched");
        label.appendChild(textnode);
        
        // Create <li> wrapper
        var linode = document.createElement('li');
        linode.appendChild(label);
        
        toolbar.appendChild(linode);
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
    }
    
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
        }
    })();
    
    // YouTube does weird things during navigation. This seems to be the only reliable way to
    // check when user moves from one page to another.
    observeDOM(document.body, function () {
        run();
    });
    
    // ===========================================================
    
    run();
}());
