// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    https://www.haus.gg/
// @version      4.1.0
// @description  Hides watched videos from your YouTube subscriptions page
// @author       Ev Haus
// @author       netjeff
// @author       actionless
// @include      http://*.youtube.com/*
// @include      http://youtube.com/*
// @include      https://*.youtube.com/*
// @include      https://youtube.com/*
// ==/UserScript==

// To submit bugs or submit revisions please see visit the repository at:
// https://github.com/EvHaus/youtube-hide-watched
// You can open new issues at:
// https://github.com/EvHaus/youtube-hide-watched/issues

(function (_undefined) {

	// ===================================================================
	// How much of the video needs to be watched before it will be hidden?
	//
	// For example, when set to 10 the video will *not* be hidden until
	// you've watched at least 10 percent of the video.
	//
	// If you set to 0 (zero) percent, then if you watch even one second
	// of the video, it will be hidden.
	//
	// Note that YouTube is kind of fuzzy on the watched percent,
	// so trying to be very specific with this value may not work
	const HiddenThresholdPercent = 10;

	// ====================================================================

	// Enable for debugging
	const __DEV__ = false;

	// Set defaults
	localStorage.YTHWV_WATCHED = localStorage.YTHWV_WATCHED || 'false';

	const logDebug = (msg) => {
		// eslint-disable-next-line no-console
		if (__DEV__) console.log(msg);
	};

	// GreaseMonkey no longer supports GM_addStyle. So we have to define
	// our own polyfill here
	const addStyle = function (aCss) {
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
.YT-HWV-WATCHED-HIDDEN {
	display: none !important;
}

.YT-HWV-WATCHED-DIMMED {
	opacity: 0.2  /* 0.9 minor dimming, 0.1 extreme dimming */
}

.YT-HWV-HIDDEN-ROW-PARENT {padding-bottom: 10px}

.YT-HWV-BUTTON {
	background: transparent;
	border: 0;
	color: rgb(96,96,96);
	cursor: pointer;
	height: 40px;
	outline: 0;
	margin-right: 8px;
	padding: 0 8px;
	width: 40px;
}

html[dark] .YT-HWV-BUTTON {
	color: #EFEFEF;
}

.YT-HWV-BUTTON svg {
	height: 24px;
	width: 24px;
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

	/* eslint-disable max-len */
	const icons = {
		normal: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>',
		dimmed: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>',
		hidden: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path d="M24 14c5.52 0 10 4.48 10 10 0 1.29-.26 2.52-.71 3.65l5.85 5.85c3.02-2.52 5.4-5.78 6.87-9.5-3.47-8.78-12-15-22.01-15-2.8 0-5.48.5-7.97 1.4l4.32 4.31c1.13-.44 2.36-.71 3.65-.71zM4 8.55l4.56 4.56.91.91C6.17 16.6 3.56 20.03 2 24c3.46 8.78 12 15 22 15 3.1 0 6.06-.6 8.77-1.69l.85.85L39.45 44 42 41.46 6.55 6 4 8.55zM15.06 19.6l3.09 3.09c-.09.43-.15.86-.15 1.31 0 3.31 2.69 6 6 6 .45 0 .88-.06 1.3-.15l3.09 3.09C27.06 33.6 25.58 34 24 34c-5.52 0-10-4.48-10-10 0-1.58.4-3.06 1.06-4.4zm8.61-1.57l6.3 6.3L30 24c0-3.31-2.69-6-6-6l-.33.03z"/></g></svg>',
	};
	/* eslint-enable max-len */

	// ===========================================================

	const debounce = function (func, wait, immediate) {
		let timeout;
		return (...args) => {
			const later = () => {
				timeout = null;
				if (!immediate) func.apply(this, args);
			};
			const callNow = immediate && !timeout;
			clearTimeout(timeout);
			timeout = setTimeout(later, wait);
			if (callNow) func.apply(this, args);
		};
	};

	// ===========================================================

	const findWatchedElements = function () {
		const watched = document.querySelectorAll('.ytd-thumbnail-overlay-resume-playback-renderer');

		const withThreshold = Array.from(watched).filter((bar) => {
			return bar.style.width && parseInt(bar.style.width, 10) > HiddenThresholdPercent;
		});

		logDebug(
			`[YT-HWV] Found ${watched.length} watched elements ` +
			`(${withThreshold.length} within threshold)`
		);

		return withThreshold;
	};

	// ===========================================================

	const findButtonTarget = function () {
		// Button will be injected into the main header menu
		return document.querySelector('#container #end #buttons');
	};

	// ===========================================================

	const isButtonAlreadyThere = function () {
		return document.querySelectorAll('.YT-HWV-BUTTON').length > 0;
	};

	// ===========================================================

	const determineYoutubeSection = function () {
		let youtubeSection = 'misc';
		if (window.location.href.indexOf('/watch?') > 0) {
			youtubeSection = 'watch';
		} else if (window.location.href.match(/.*\/(user|channel)\/.+\/videos/u)) {
			youtubeSection = 'channel';
		} else if (window.location.href.indexOf('/feed/subscriptions') > 0) {
			youtubeSection = 'subscriptions';
		} else if (window.location.href.indexOf('/feed/trending') >= 0) {
			youtubeSection = 'trending';
		}
		return youtubeSection;
	};

	// ===========================================================

	const updateClassOnWatchedItems = function () {

		// If we're on the History page -- do nothing. We don't want to hide
		// watched videos here.
		if (window.location.href.indexOf('/feed/history') >= 0) return;

		const section = determineYoutubeSection();
		const state = localStorage[`YTHWV_STATE_${section}`];

		findWatchedElements().forEach((item, _i) => {
			// "Subscription" section needs us to hide the "#contents",
			// but in the "Trending" section, that class will hide everything.
			// So there, we need to hide the "ytd-video-renderer"
			let watchedItem;
			if (section === 'subscriptions') {
				// For rows, hide the row and the header too. We can't hide
				// their entire parent because then we'll get the infinite
				// page loader to load forever.
				watchedItem = (
					// Grid item
					item.closest('.ytd-grid-renderer') ||
					item.closest('.ytd-item-section-renderer') ||
					// List item
					item.closest('#grid-container')
				);

				// If we're hiding the .ytd-item-section-renderer element, we need to give it
				// some extra spacing otherwise we'll get stuck in infinite page loading
				if (watchedItem && watchedItem.classList.contains('ytd-item-section-renderer')) {
					watchedItem.closest('ytd-item-section-renderer').classList.add('YT-HWV-HIDDEN-ROW-PARENT');
				}

			} else if (section === 'channel') {
				// Channel "Videos" section needs special handling
				watchedItem = item.closest('.ytd-grid-renderer');
			} else {
				// For home page and other areas
				watchedItem = (
					item.closest('ytd-rich-item-renderer') ||
					item.closest('ytd-video-renderer') ||
					item.closest('ytd-grid-video-renderer') ||
					item.closest('ytd-compact-video-renderer')
				);
			}

			if (watchedItem) {
				// Remove existing classes
				watchedItem.classList.remove('YT-HWV-WATCHED-DIMMED');
				watchedItem.classList.remove('YT-HWV-WATCHED-HIDDEN');

				// Add current class
				if (state === 'dimmed') {
					watchedItem.classList.add('YT-HWV-WATCHED-DIMMED');
				} else if (state === 'hidden') {
					watchedItem.classList.add('YT-HWV-WATCHED-HIDDEN');
				}
			}
		});
	};

	// ===========================================================

	const addButton = function () {
		if (isButtonAlreadyThere()) {
			setButtonState();
			return;
		}

		// Find button target
		const target = findButtonTarget();
		if (!target) return;

		// Generate button DOM
		const button = document.createElement('button');
		button.classList.add('YT-HWV-BUTTON');

		// Attach events
		button.addEventListener('click', () => {
			const section = determineYoutubeSection();
			const state = localStorage[`YTHWV_STATE_${section}`];

			logDebug(`[YT-HWV] button clicked while state: ${state}`);

			let newState = 'dimmed';
			if (state === 'dimmed') {
				newState = 'hidden';
			} else if (state === 'hidden') {
				newState = 'normal';
			}

			localStorage[`YTHWV_STATE_${section}`] = newState;

			setButtonState();
			updateClassOnWatchedItems();
		});

		// Insert button into DOM
		target.parentNode.insertBefore(button, target);

		setButtonState();
	};

	const setButtonState = () => {
		const section = determineYoutubeSection();
		const state = localStorage[`YTHWV_STATE_${section}`] || 'normal';
		const button = document.querySelector('.YT-HWV-BUTTON');
		if (!button) return;

		button.innerHTML = icons[state];
		button.setAttribute('title', `Toggle Watched Videos (currently "${state}" for "${section}" section)`);
	};

	const run = debounce(() => {
		logDebug('[YT-HWV] Running check for watched videos');
		updateClassOnWatchedItems();
		addButton();
	}, 250);

	// ===========================================================

	// Hijack all XHR calls
	const send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function (data) {
		this.addEventListener('readystatechange', function () {
			if (
			// Anytime more videos are fetched -- re-run script
				this.responseURL.indexOf('browse_ajax?action_continuation') > 0
			) {
				setTimeout(() => {
					run();
				}, 0);
			}
		}, false);
		send.call(this, data);
	};

	// ===========================================================

	const observeDOM = (function () {
		const MutationObserver = window.MutationObserver || window.WebKitMutationObserver;
		const eventListenerSupported = window.addEventListener;

		return function (obj, callback) {
			logDebug('[YT-HWV] Attaching DOM listener');

			// Invalid `obj` given
			if (!obj) return;

			if (MutationObserver) {
				const obs = new MutationObserver(((mutations, _observer) => {
					if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {
						// eslint-disable-next-line callback-return
						callback(mutations);
					}
				}));

				obs.observe(obj, {childList: true, subtree: true});
			} else if (eventListenerSupported) {
				obj.addEventListener('DOMNodeInserted', callback, false);
				obj.addEventListener('DOMNodeRemoved', callback, false);
			}
		};
	}());

	// ===========================================================

	logDebug('[YT-HWV] Starting Script');

	// YouTube does navigation via history and also does a bunch
	// of AJAX video loading. In order to ensure we're always up
	// to date, we have to listen for ANY DOM change event, and
	// re-run our script.
	observeDOM(document.body, run);

	run();
}());
