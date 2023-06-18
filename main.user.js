// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    https://www.haus.gg/
// @version      5.12
// @license      MIT
// @description  Hides watched videos (and shorts) from your YouTube subscriptions page.
// @author       Ev Haus
// @author       netjeff
// @author       actionless
// @match        http://*.youtube.com/*
// @match        http://youtube.com/*
// @match        https://*.youtube.com/*
// @match        https://youtube.com/*
// @require      https://openuserjs.org/src/libs/sizzle/GM_config.js
// @grant        GM_getValue
// @grant        GM_setValue
// ==/UserScript==

// To submit bugs or submit revisions please see visit the repository at:
// https://github.com/EvHaus/youtube-hide-watched
// You can open new issues at:
// https://github.com/EvHaus/youtube-hide-watched/issues

(function (_undefined) {
	// Enable for debugging
	const DEBUG = false;

	// GM_config setup
	const gmc = new GM_config({
		events: {
			save () {
				this.close();
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
		title: 'YouTube: Hide Watched Videos Settings',
	});

	// Set defaults
	localStorage.YTHWV_WATCHED = localStorage.YTHWV_WATCHED || 'false';

	const logDebug = (...msgs) => {
		// eslint-disable-next-line no-console
		if (DEBUG) console.log('[YT-HWV]', msgs);
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
.YT-HWV-WATCHED-HIDDEN { display: none !important }

.YT-HWV-WATCHED-DIMMED { opacity: 0.3 }

.YT-HWV-SHORTS-HIDDEN { display: none !important }

.YT-HWV-SHORTS-DIMMED { opacity: 0.3 }

.YT-HWV-HIDDEN-ROW-PARENT { padding-bottom: 10px }

.YT-HWV-BUTTON-AREA {
	background: transparent;
	border: 0;
	margin: 0 16px;
}

.YT-HWV-BUTTON-STYLE {
	background: transparent;
	border: 0;
	color: rgb(96,96,96);
	cursor: pointer;
	height: 40px;
	outline: 0;
	width: 40px;
}

.YT-HWV-BUTTON { }
.YT-HWV-BUTTON-SHORTS { }

html[dark]         .YT-HWV-BUTTON-STYLE,  /* "Dark" theme support */
ytd-masthead[dark] .YT-HWV-BUTTON-STYLE   /* In "Theater mode" the top bar containing the button is always dark regardless of "Dark theme" */
{
	color: #EFEFEF;
}

.YT-HWV-BUTTON-STYLE svg {
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
		dimmed: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>',
		hidden: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path d="M24 14c5.52 0 10 4.48 10 10 0 1.29-.26 2.52-.71 3.65l5.85 5.85c3.02-2.52 5.4-5.78 6.87-9.5-3.47-8.78-12-15-22.01-15-2.8 0-5.48.5-7.97 1.4l4.32 4.31c1.13-.44 2.36-.71 3.65-.71zM4 8.55l4.56 4.56.91.91C6.17 16.6 3.56 20.03 2 24c3.46 8.78 12 15 22 15 3.1 0 6.06-.6 8.77-1.69l.85.85L39.45 44 42 41.46 6.55 6 4 8.55zM15.06 19.6l3.09 3.09c-.09.43-.15.86-.15 1.31 0 3.31 2.69 6 6 6 .45 0 .88-.06 1.3-.15l3.09 3.09C27.06 33.6 25.58 34 24 34c-5.52 0-10-4.48-10-10 0-1.58.4-3.06 1.06-4.4zm8.61-1.57l6.3 6.3L30 24c0-3.31-2.69-6-6-6l-.33.03z"/></g></svg>',
		normal: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor"><path d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></g></svg>',
	};
	const icons_shorts = {
		dimmed: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor" fill-opacity="0.3"><path transform="scale(3.0)" d="M10.65,1C10.65,1,10.65,1,10.65,1c-0.37,0-0.75,0.1-1.09,0.31L4.25,4.46C3.44,4.93,2.96,5.89,3,6.9  C3.05,7.9,3.58,8.77,4.39,9.18c0.02,0.01,0.75,0.35,0.75,0.35l-0.9,0.53c-1.14,0.68-1.58,2.27-0.98,3.55C3.69,14.49,4.5,15,5.35,15  c0.37,0,0.74-0.1,1.09-0.31l5.31-3.15c0.8-0.48,1.29-1.43,1.24-2.45c-0.04-0.99-0.58-1.87-1.39-2.27c-0.02-0.01-0.75-0.35-0.75-0.35  l0.9-0.53c1.14-0.68,1.58-2.27,0.97-3.55C12.31,1.51,11.49,1,10.65,1L10.65,1z" /></g></svg>',
		hidden: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><clipPath id="slashGap"><rect fill="#007fff" stroke-width=" 0px" x="26.89096" y="1.80215" width="16.74642" height="30.69609" transform="rotate(-30.75, 35.2642, 17.1502)"/><rect fill="#007fff" stroke-width=" 0px" x="4.61312" y="15.41155" width="16.5074" height="30.84016" transform="rotate(-30.75, 12.8668, 30.8316)"/></clipPath><g fill-opacity="0.3" fill="currentColor"><g id="shortIcon" clip-path="url(#slashGap)"><path transform="translate(3.125, 3.125) scale(3)" d="m9.61501,-0.04167c0,0 0,0 0,0c-0.37,0 -0.75,0.1 -1.09,0.31l-5.31,3.15c-0.81,0.47 -1.29,1.43 -1.25,2.44c0.05,1 0.58,1.87 1.39,2.28c0.02,0.01 0.75,0.35 0.75,0.35l-0.9,0.53c-1.14,0.68 -1.58,2.27 -0.98,3.55c0.43,0.88 1.24,1.39 2.09,1.39c0.37,0 0.74,-0.1 1.09,-0.31l5.31,-3.15c0.8,-0.48 1.29,-1.43 1.24,-2.45c-0.04,-0.99 -0.58,-1.87 -1.39,-2.27c-0.02,-0.01 -0.75,-0.35 -0.75,-0.35l0.9,-0.53c1.14,-0.68 1.58,-2.27 0.97,-3.55c-0.41,-0.88 -1.23,-1.39 -2.07,-1.39l0,0z"/></g><rect id="slash" stroke-width="0px" x="19.29907" y="1.00388" width="4.73147" height="47.45023" transform="rotate(-30.75, 21.6648, 24.729)"/></g></svg>',
		normal: '<svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 48 48"><g fill="currentColor"><path transform="scale(3.0)" d="M10.65,1C10.65,1,10.65,1,10.65,1c-0.37,0-0.75,0.1-1.09,0.31L4.25,4.46C3.44,4.93,2.96,5.89,3,6.9  C3.05,7.9,3.58,8.77,4.39,9.18c0.02,0.01,0.75,0.35,0.75,0.35l-0.9,0.53c-1.14,0.68-1.58,2.27-0.98,3.55C3.69,14.49,4.5,15,5.35,15  c0.37,0,0.74-0.1,1.09-0.31l5.31-3.15c0.8-0.48,1.29-1.43,1.24-2.45c-0.04-0.99-0.58-1.87-1.39-2.27c-0.02-0.01-0.75-0.35-0.75-0.35  l0.9-0.53c1.14-0.68,1.58-2.27,0.97-3.55C12.31,1.51,11.49,1,10.65,1L10.65,1z" /></g></svg>',
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
			return bar.style.width && parseInt(bar.style.width, 10) >= gmc.get('HIDDEN_THRESHOLD_PERCENT');
		});

		logDebug(
			`Found ${watched.length} watched elements ` +
			`(${withThreshold.length} within threshold)`
		);

		return withThreshold;
	};

	// ===========================================================

	const findShortsContainers = function () {
		const shortsContainers = [
			// Subscriptions Page (List View)
			document.querySelectorAll('ytd-reel-shelf-renderer ytd-reel-item-renderer'),
			document.querySelectorAll('ytd-rich-shelf-renderer ytd-rich-grid-slim-media'),
			// Home Page & Subscriptions Page (Grid View)
			document.querySelectorAll('ytd-reel-shelf-renderer ytd-thumbnail'),
			// Search results page
			document.querySelectorAll('ytd-reel-shelf-renderer .ytd-reel-shelf-renderer'),
		].reduce((acc, matches) => {
			matches?.forEach((child) => {
				const container = child.closest('ytd-reel-shelf-renderer') || child.closest('ytd-rich-shelf-renderer');
				if (container && !acc.includes(container)) acc.push(container);
			});
			return acc;
		}, []);

		// Search results sometimes also show Shorts as if they're regular videos with a little "Shorts" badge
		document.querySelectorAll('.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]').forEach((child) => {
			const container = child.closest('ytd-video-renderer');
			shortsContainers.push(container);
		});

		logDebug(`Found ${shortsContainers.length} shorts container elements`);

		return shortsContainers;
	};

	// ===========================================================

	const findButtonAreaTarget = function () {
		// Button will be injected into the main header menu
		return document.querySelector('#container #end #buttons');
	};

	// ===========================================================

	const isButtonAlreadyThere = function () {
		return document.querySelectorAll('.YT-HWV-BUTTON').length > 0;
	};

	// ===========================================================

	const determineYoutubeSection = function () {
		const {href} = window.location;

		let youtubeSection = 'misc';
		if (href.includes('/watch?')) {
			youtubeSection = 'watch';
		} else if (href.match(/.*\/(user|channel|c)\/.+\/videos/u) || href.match(/.*\/@.*/u)) {
			youtubeSection = 'channel';
		} else if (href.includes('/feed/subscriptions')) {
			youtubeSection = 'subscriptions';
		} else if (href.includes('/feed/trending')) {
			youtubeSection = 'trending';
		} else if (href.includes('/playlist?')) {
			youtubeSection = 'playlist';
		}
		return youtubeSection;
	};

	// ===========================================================

	const updateClassOnWatchedItems = function () {
		// Remove existing classes
		document.querySelectorAll('.YT-HWV-WATCHED-DIMMED').forEach((el) => el.classList.remove('YT-HWV-WATCHED-DIMMED'));
		document.querySelectorAll('.YT-HWV-WATCHED-HIDDEN').forEach((el) => el.classList.remove('YT-HWV-WATCHED-HIDDEN'));

		// If we're on the History page -- do nothing. We don't want to hide
		// watched videos here.
		if (window.location.href.indexOf('/feed/history') >= 0) return;

		const section = determineYoutubeSection();
		const state = localStorage[`YTHWV_STATE_${section}`];

		findWatchedElements().forEach((item, _i) => {
			let watchedItem;
			let dimmedItem;

			// "Subscription" section needs us to hide the "#contents",
			// but in the "Trending" section, that class will hide everything.
			// So there, we need to hide the "ytd-video-renderer"
			if (section === 'subscriptions') {
				// For rows, hide the row and the header too. We can't hide
				// their entire parent because then we'll get the infinite
				// page loader to load forever.
				watchedItem = (
					// Grid item
					item.closest('.ytd-grid-renderer') ||
					item.closest('.ytd-item-section-renderer') ||
					item.closest('.ytd-rich-grid-row') ||
					// List item
					item.closest('#grid-container')
				);

				// If we're hiding the .ytd-item-section-renderer element, we need to give it
				// some extra spacing otherwise we'll get stuck in infinite page loading
				if (watchedItem && watchedItem.classList.contains('ytd-item-section-renderer')) {
					watchedItem.closest('ytd-item-section-renderer').classList.add('YT-HWV-HIDDEN-ROW-PARENT');
				}
			} else if (section === 'playlist') {
				watchedItem = item.closest('ytd-playlist-video-renderer');
			} else if (section === 'watch') {
				watchedItem = item.closest('ytd-compact-video-renderer');

				// Don't hide video if it's going to play next.
				//
				// If there is no watchedItem - we probably got
				// `ytd-playlist-panel-video-renderer`:
				// let's also ignore it as in case of shuffle enabled
				// we could accidentially hide the item which gonna play next.
				if (
					watchedItem &&
					watchedItem.closest('ytd-compact-autoplay-renderer')
				) {
					watchedItem = null;
				}

				// For playlist items, we never hide them, but we will dim
				// them even if current mode is to hide rather than dim.
				const watchedItemInPlaylist = item.closest('ytd-playlist-panel-video-renderer');
				if (!watchedItem && watchedItemInPlaylist) {
					dimmedItem = watchedItemInPlaylist;
				}
			} else {
				// For home page and other areas
				watchedItem = (
					item.closest('ytd-rich-item-renderer') ||
					item.closest('ytd-video-renderer') ||
					item.closest('ytd-grid-video-renderer')
				);
			}

			if (watchedItem) {
				// Add current class
				if (state === 'dimmed') {
					watchedItem.classList.add('YT-HWV-WATCHED-DIMMED');
				} else if (state === 'hidden') {
					watchedItem.classList.add('YT-HWV-WATCHED-HIDDEN');
				}
			}

			if (dimmedItem && (state === 'dimmed' || state === 'hidden')) {
				dimmedItem.classList.add('YT-HWV-WATCHED-DIMMED');
			}
		});
	};

	// ===========================================================

	const updateClassOnShortsItems = function () {
		const section = determineYoutubeSection();

		document.querySelectorAll('.YT-HWV-SHORTS-DIMMED').forEach((el) => el.classList.remove('YT-HWV-SHORTS-DIMMED'));
		document.querySelectorAll('.YT-HWV-SHORTS-HIDDEN').forEach((el) => el.classList.remove('YT-HWV-SHORTS-HIDDEN'));

		const state = localStorage[`YTHWV_STATE_SHORTS_${section}`];

		const shortsContainers = findShortsContainers();

		shortsContainers.forEach((item) => {
			// Add current class
			if (state === 'dimmed') {
				item.classList.add('YT-HWV-SHORTS-DIMMED');
			} else if (state === 'hidden') {
				item.classList.add('YT-HWV-SHORTS-HIDDEN');
			}
		});
	};

	// ===========================================================

	const addButtons = function () {
		if (isButtonAlreadyThere()) {
			setButtonState();
			setButtonStateShorts();
			return;
		}

		// Find button area target
		const target = findButtonAreaTarget();
		if (!target) return;

		// Generate button area DOM
		const buttonArea = document.createElement('div');
		buttonArea.classList.add('YT-HWV-BUTTON-AREA');

		// Generate "hide watched" button DOM
		const button = document.createElement('button');
		button.classList.add('YT-HWV-BUTTON', 'YT-HWV-BUTTON-STYLE');
		buttonArea.appendChild(button);

		// Attach events to "hide watched" button
		button.addEventListener('click', () => {
			const section = determineYoutubeSection();
			const state = localStorage[`YTHWV_STATE_${section}`];

			logDebug(`Hide watched button clicked while state: ${state}`);

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

		// Generate "hide shorts" button DOM
		const buttonShorts = document.createElement('button');
		buttonShorts.setAttribute('size', '48');
		buttonShorts.classList.add('YT-HWV-BUTTON-SHORTS', 'YT-HWV-BUTTON-STYLE');
		buttonArea.appendChild(buttonShorts);

		// Attach events to "hide shorts" button
		buttonShorts.addEventListener('click', () => {
			const section = determineYoutubeSection();
			const state = localStorage[`YTHWV_STATE_SHORTS_${section}`];

			logDebug(`Shorts button clicked while state: ${state}`);

			let newState = 'dimmed';
			if (state === 'dimmed') {
				newState = 'hidden';
			} else if (state === 'hidden') {
				newState = 'normal';
			}

			localStorage[`YTHWV_STATE_SHORTS_${section}`] = newState;

			setButtonStateShorts();
			updateClassOnShortsItems();
		});

		// Generate "settings" button DOM
		const buttonSettings = document.createElement('button');
		buttonSettings.setAttribute('size', '48');
		buttonSettings.classList.add('YT-HWV-BUTTON', 'YT-HWV-BUTTON-STYLE');
		buttonSettings.innerHTML = '<svg focusable="false" width="48" height="48"><path d="M12 9.5c1.38 0 2.5 1.12 2.5 2.5s-1.12 2.5-2.5 2.5-2.5-1.12-2.5-2.5 1.12-2.5 2.5-2.5m0-1c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zM13.22 3l.55 2.2.13.51.5.18c.61.23 1.19.56 1.72.98l.4.32.5-.14 2.17-.62 1.22 2.11-1.63 1.59-.37.36.08.51c.05.32.08.64.08.98s-.03.66-.08.98l-.08.51.37.36 1.63 1.59-1.22 2.11-2.17-.62-.5-.14-.4.32c-.53.43-1.11.76-1.72.98l-.5.18-.13.51-.55 2.24h-2.44l-.55-2.2-.13-.51-.5-.18c-.6-.23-1.18-.56-1.72-.99l-.4-.32-.5.14-2.17.62-1.21-2.12 1.63-1.59.37-.36-.08-.51c-.05-.32-.08-.65-.08-.98s.03-.66.08-.98l.08-.51-.37-.36L3.6 8.56l1.22-2.11 2.17.62.5.14.4-.32c.53-.44 1.11-.77 1.72-.99l.5-.18.13-.51.54-2.21h2.44M14 2h-4l-.74 2.96c-.73.27-1.4.66-2 1.14l-2.92-.83-2 3.46 2.19 2.13c-.06.37-.09.75-.09 1.14s.03.77.09 1.14l-2.19 2.13 2 3.46 2.92-.83c.6.48 1.27.87 2 1.14L10 22h4l.74-2.96c.73-.27 1.4-.66 2-1.14l2.92.83 2-3.46-2.19-2.13c.06-.37.09-.75.09-1.14s-.03-.77-.09-1.14l2.19-2.13-2-3.46-2.92.83c-.6-.48-1.27-.87-2-1.14L14 2z"></path></svg>';
		buttonArea.appendChild(buttonSettings);

		// Attach events to "settings" button
		buttonSettings.addEventListener('click', () => {
			gmc.open();
		});

		// Insert buttons into DOM
		target.parentNode.insertBefore(buttonArea, target);

		setButtonState();
		setButtonStateShorts();
	};

	const setButtonState = () => {
		const section = determineYoutubeSection();
		const state = localStorage[`YTHWV_STATE_${section}`] || 'normal';
		const button = document.querySelector('.YT-HWV-BUTTON');
		if (!button) return;

		button.innerHTML = icons[state];
		button.setAttribute('title', `Toggle Watched Videos (currently "${state}" for "${section}" section)`);
	};

	const setButtonStateShorts = () => {
		const section = determineYoutubeSection();
		const state = localStorage[`YTHWV_STATE_SHORTS_${section}`] || 'normal';
		const button = document.querySelector('.YT-HWV-BUTTON-SHORTS');
		if (!button) return;

		button.innerHTML = icons_shorts[state];
		button.setAttribute('title', `Toggle Shorts (currently "${state}" for "${section}" section)`);
	};

	const run = debounce((mutations) => {

		// don't react if only *OUR* own buttons changed state
		// to avoid running an endless loop

		if (mutations && mutations.length === 1) { return; }

		if (mutations[0].target.classList.contains('YT-HWV-BUTTON') ||
			mutations[0].target.classList.contains('YT-HWV-BUTTON-SHORTS')) {
			return;
		}

		// something *ELSE* changed state (not our buttons), so keep going

		logDebug('Running check for watched videos, and shorts');
		updateClassOnWatchedItems();
		updateClassOnShortsItems();
		addButtons();
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
			logDebug('Attaching DOM listener');

			// Invalid `obj` given
			if (!obj) return;

			if (MutationObserver) {
				const obs = new MutationObserver(((mutations, _observer) => {
					if (mutations[0].addedNodes.length || mutations[0].removedNodes.length) {

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

	logDebug('Starting Script');

	// YouTube does navigation via history and also does a bunch
	// of AJAX video loading. In order to ensure we're always up
	// to date, we have to listen for ANY DOM change event, and
	// re-run our script.
	observeDOM(document.body, run);

	run();
}());
