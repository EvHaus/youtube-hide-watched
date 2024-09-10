// ==UserScript==
// @name         YouTube: Hide Watched Videos
// @namespace    https://www.haus.gg/
// @version      6.5
// @license      MIT
// @description  Hides watched videos (and shorts) from your YouTube subscriptions page.
// @author       Ev Haus
// @author       netjeff
// @author       actionless
// @match        http://*.youtube.com/*
// @match        http://youtube.com/*
// @match        https://*.youtube.com/*
// @match        https://youtube.com/*
// @noframes
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
	const DEBUG = true;

	// Needed to bypass YouTube's Trusted Types restrictions, ie.
	// Uncaught TypeError: Failed to set the 'innerHTML' property on 'Element': This document requires 'TrustedHTML' assignment.
	if (window.trustedTypes?.createPolicy) {
		window.trustedTypes.createPolicy('default', {
			createHTML: (string, _sink) => string,
		});
	}

	// GM_config setup
	const title = document.createElement('a');
	title.textContent = 'YouTube: Hide Watched Videos Settings';
	title.href = 'https://github.com/EvHaus/youtube-hide-watched';
	title.target = '_blank';
	const gmc = new GM_config({
		events: {
			save() {
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
		title,
	});

	// Set defaults
	localStorage.YTHWV_WATCHED = localStorage.YTHWV_WATCHED || 'false';

	const logDebug = (...msgs) => {
		// biome-ignore lint/suspicious/noConsoleLog: This is a debug log
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

.YT-HWV-BUTTONS {
	background: transparent;
	border: 1px solid var(--ytd-searchbox-legacy-border-color);
    border-radius: 40px;
    display: flex;
    gap: 5px;
	margin: 0 20px;
}

.YT-HWV-BUTTON {
	align-items: center;
	background: transparent;
	border: 0;
    border-radius: 40px;
	color: var(--yt-spec-icon-inactive);
	cursor: pointer;
    display: flex;
	height: 40px;
    justify-content: center;
	outline: 0;
	width: 40px;
}

.YT-HWV-BUTTON:focus,
.YT-HWV-BUTTON:hover {
	background: var(--yt-spec-badge-chip-background);
}

.YT-HWV-BUTTON-DISABLED { color: var(--yt-spec-icon-disabled) }

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

	const BUTTONS = [
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="currentColor" d="M24 9C14 9 5.46 15.22 2 24c3.46 8.78 12 15 22 15 10.01 0 18.54-6.22 22-15-3.46-8.78-11.99-15-22-15zm0 25c-5.52 0-10-4.48-10-10s4.48-10 10-10 10 4.48 10 10-4.48 10-10 10zm0-16c-3.31 0-6 2.69-6 6s2.69 6 6 6 6-2.69 6-6-2.69-6-6-6z"/></svg>',
			iconHidden:
				'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="currentColor" d="M24 14c5.52 0 10 4.48 10 10 0 1.29-.26 2.52-.71 3.65l5.85 5.85c3.02-2.52 5.4-5.78 6.87-9.5-3.47-8.78-12-15-22.01-15-2.8 0-5.48.5-7.97 1.4l4.32 4.31c1.13-.44 2.36-.71 3.65-.71zM4 8.55l4.56 4.56.91.91C6.17 16.6 3.56 20.03 2 24c3.46 8.78 12 15 22 15 3.1 0 6.06-.6 8.77-1.69l.85.85L39.45 44 42 41.46 6.55 6 4 8.55zM15.06 19.6l3.09 3.09c-.09.43-.15.86-.15 1.31 0 3.31 2.69 6 6 6 .45 0 .88-.06 1.3-.15l3.09 3.09C27.06 33.6 25.58 34 24 34c-5.52 0-10-4.48-10-10 0-1.58.4-3.06 1.06-4.4zm8.61-1.57 6.3 6.3L30 24c0-3.31-2.69-6-6-6l-.33.03z"/></svg>',
			name: 'Toggle Watched Videos',
			stateKey: 'YTHWV_STATE',
			type: 'toggle',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><path fill="currentColor" d="M31.95 3c-1.11 0-2.25.3-3.27.93l-15.93 9.45C10.32 14.79 8.88 17.67 9 20.7c.15 3 1.74 5.61 4.17 6.84.06.03 2.25 1.05 2.25 1.05l-2.7 1.59c-3.42 2.04-4.74 6.81-2.94 10.65C11.07 43.47 13.5 45 16.05 45c1.11 0 2.22-.3 3.27-.93l15.93-9.45c2.4-1.44 3.87-4.29 3.72-7.35-.12-2.97-1.74-5.61-4.17-6.81-.06-.03-2.25-1.05-2.25-1.05l2.7-1.59c3.42-2.04 4.74-6.81 2.91-10.65C36.93 4.53 34.47 3 31.95 3z"/></svg>',
			iconHidden:
				'<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 48 48"><g fill="currentColor"><g clip-path="url(#slashGap)"><path d="M31.97 3c-1.11 0-2.25.3-3.27.93l-15.93 9.45c-2.43 1.41-3.87 4.29-3.75 7.32.15 3 1.74 5.61 4.17 6.84.06.03 2.25 1.05 2.25 1.05l-2.7 1.59C9.32 32.22 8 36.99 9.8 40.83c1.29 2.64 3.72 4.17 6.27 4.17 1.11 0 2.22-.3 3.27-.93l15.93-9.45c2.4-1.44 3.87-4.29 3.72-7.35-.12-2.97-1.74-5.61-4.17-6.81-.06-.03-2.25-1.05-2.25-1.05l2.7-1.59c3.42-2.04 4.74-6.81 2.91-10.65C36.95 4.53 34.49 3 31.97 3z"/></g><path d="m7.501 5.55 4.066-2.42 24.26 40.78-4.065 2.418z"/></g></svg>',
			name: 'Toggle Shorts',
			stateKey: 'YTHWV_STATE_SHORTS',
			type: 'toggle',
		},
		{
			icon: '<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24"><path fill="currentColor" d="M12 9.5a2.5 2.5 0 0 1 0 5 2.5 2.5 0 0 1 0-5m0-1c-1.93 0-3.5 1.57-3.5 3.5s1.57 3.5 3.5 3.5 3.5-1.57 3.5-3.5-1.57-3.5-3.5-3.5zM13.22 3l.55 2.2.13.51.5.18c.61.23 1.19.56 1.72.98l.4.32.5-.14 2.17-.62 1.22 2.11-1.63 1.59-.37.36.08.51c.05.32.08.64.08.98s-.03.66-.08.98l-.08.51.37.36 1.63 1.59-1.22 2.11-2.17-.62-.5-.14-.4.32c-.53.43-1.11.76-1.72.98l-.5.18-.13.51-.55 2.24h-2.44l-.55-2.2-.13-.51-.5-.18c-.6-.23-1.18-.56-1.72-.99l-.4-.32-.5.14-2.17.62-1.21-2.12 1.63-1.59.37-.36-.08-.51c-.05-.32-.08-.65-.08-.98s.03-.66.08-.98l.08-.51-.37-.36L3.6 8.56l1.22-2.11 2.17.62.5.14.4-.32c.53-.44 1.11-.77 1.72-.99l.5-.18.13-.51.54-2.21h2.44M14 2h-4l-.74 2.96c-.73.27-1.4.66-2 1.14l-2.92-.83-2 3.46 2.19 2.13c-.06.37-.09.75-.09 1.14s.03.77.09 1.14l-2.19 2.13 2 3.46 2.92-.83c.6.48 1.27.87 2 1.14L10 22h4l.74-2.96c.73-.27 1.4-.66 2-1.14l2.92.83 2-3.46-2.19-2.13c.06-.37.09-.75.09-1.14s-.03-.77-.09-1.14l2.19-2.13-2-3.46-2.92.83c-.6-.48-1.27-.87-2-1.14L14 2z"/></svg>',
			name: 'Settings',
			type: 'settings',
		},
	];

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
		const watched = document.querySelectorAll(
			'.ytd-thumbnail-overlay-resume-playback-renderer',
		);

		const withThreshold = Array.from(watched).filter((bar) => {
			return (
				bar.style.width &&
				Number.parseInt(bar.style.width, 10) >=
					gmc.get('HIDDEN_THRESHOLD_PERCENT')
			);
		});

		logDebug(
			`Found ${watched.length} watched elements ` +
				`(${withThreshold.length} within threshold)`,
		);

		return withThreshold;
	};

	// ===========================================================

	const findShortsContainers = function () {
		const shortsContainers = [
			// All pages
			document.querySelectorAll(
				'[is-shorts]',
			),
			// Subscriptions Page (List View)
			document.querySelectorAll(
				'ytd-reel-shelf-renderer ytd-reel-item-renderer',
			),
			document.querySelectorAll(
				'ytd-rich-shelf-renderer ytd-rich-grid-slim-media',
			),
			// Home Page & Subscriptions Page (Grid View)
			document.querySelectorAll('ytd-reel-shelf-renderer ytd-thumbnail'),
			// Search results page
			document.querySelectorAll(
				'ytd-reel-shelf-renderer .ytd-reel-shelf-renderer',
			),
		].reduce((acc, matches) => {
			matches?.forEach((child) => {
				const container =
					child.closest('ytd-reel-shelf-renderer') ||
					child.closest('ytd-rich-shelf-renderer');
				if (container && !acc.includes(container)) acc.push(container);
			});
			return acc;
		}, []);

		// Search results sometimes also show Shorts as if they're regular videos with a little "Shorts" badge
		document
			.querySelectorAll(
				'.ytd-thumbnail-overlay-time-status-renderer[aria-label="Shorts"]',
			)
			.forEach((child) => {
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

	const determineYoutubeSection = function () {
		const { href } = window.location;

		let youtubeSection = 'misc';
		if (href.includes('/watch?')) {
			youtubeSection = 'watch';
		} else if (
			href.match(/.*\/(user|channel|c)\/.+\/videos/u) ||
			href.match(/.*\/@.*/u)
		) {
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
		document
			.querySelectorAll('.YT-HWV-WATCHED-DIMMED')
			.forEach((el) => el.classList.remove('YT-HWV-WATCHED-DIMMED'));
		document
			.querySelectorAll('.YT-HWV-WATCHED-HIDDEN')
			.forEach((el) => el.classList.remove('YT-HWV-WATCHED-HIDDEN'));

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
				watchedItem =
					// Grid item
					item.closest('.ytd-grid-renderer') ||
					item.closest('.ytd-item-section-renderer') ||
					item.closest('.ytd-rich-grid-row') ||
					item.closest('.ytd-rich-grid-renderer') ||
					// List item
					item.closest('#grid-container');

				// If we're hiding the .ytd-item-section-renderer element, we need to give it
				// some extra spacing otherwise we'll get stuck in infinite page loading
				if (watchedItem?.classList.contains('ytd-item-section-renderer')) {
					watchedItem
						.closest('ytd-item-section-renderer')
						.classList.add('YT-HWV-HIDDEN-ROW-PARENT');
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
				if (watchedItem?.closest('ytd-compact-autoplay-renderer')) {
					watchedItem = null;
				}

				// For playlist items, we never hide them, but we will dim
				// them even if current mode is to hide rather than dim.
				const watchedItemInPlaylist = item.closest(
					'ytd-playlist-panel-video-renderer',
				);
				if (!watchedItem && watchedItemInPlaylist) {
					dimmedItem = watchedItemInPlaylist;
				}
			} else {
				// For home page and other areas
				watchedItem =
					item.closest('ytd-rich-item-renderer') ||
					item.closest('ytd-video-renderer') ||
					item.closest('ytd-grid-video-renderer');
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

		document
			.querySelectorAll('.YT-HWV-SHORTS-DIMMED')
			.forEach((el) => el.classList.remove('YT-HWV-SHORTS-DIMMED'));
		document
			.querySelectorAll('.YT-HWV-SHORTS-HIDDEN')
			.forEach((el) => el.classList.remove('YT-HWV-SHORTS-HIDDEN'));

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

	const renderButtons = function () {
		// Find button area target
		const target = findButtonAreaTarget();
		if (!target) return;

		// Did we already render the buttons?
		const existingButtons = document.querySelector('.YT-HWV-BUTTONS');

		// Generate buttons area DOM
		const buttonArea = document.createElement('div');
		buttonArea.classList.add('YT-HWV-BUTTONS');

		// Render buttons
		BUTTONS.forEach(({ icon, iconHidden, name, stateKey, type }) => {
			// For toggle buttons, determine where in localStorage they track state
			const section = determineYoutubeSection();
			const storageKey = [stateKey, section].join('_');
			const toggleButtonState = localStorage.getItem(storageKey) || 'normal';

			// Generate button DOM
			const button = document.createElement('button');
			button.title =
				type === 'toggle'
					? `${name} : currently "${toggleButtonState}" for section "${section}"`
					: `${name}`;
			button.classList.add('YT-HWV-BUTTON');
			if (toggleButtonState !== 'normal')
				button.classList.add('YT-HWV-BUTTON-DISABLED');
			button.innerHTML = toggleButtonState === 'hidden' ? iconHidden : icon;
			buttonArea.appendChild(button);

			// Attach events for toggle buttons
			switch (type) {
				case 'toggle':
					button.addEventListener('click', () => {
						logDebug(`Button ${name} clicked. State: ${toggleButtonState}`);

						let newState = 'dimmed';
						if (toggleButtonState === 'dimmed') {
							newState = 'hidden';
						} else if (toggleButtonState === 'hidden') {
							newState = 'normal';
						}

						localStorage.setItem(storageKey, newState);

						updateClassOnWatchedItems();
						updateClassOnShortsItems();
						renderButtons();
					});
					break;
				case 'settings':
					button.addEventListener('click', () => {
						gmc.open();
						renderButtons();
					});
					break;
			}
		});

		// Insert buttons into DOM
		if (existingButtons) {
			target.parentNode.replaceChild(buttonArea, existingButtons);
			logDebug('Re-rendered menu buttons');
		} else {
			target.parentNode.insertBefore(buttonArea, target);
			logDebug('Rendered menu buttons');
		}
	};

	const run = debounce((mutations) => {
		// don't react if only *OUR* own buttons changed state
		// to avoid running an endless loop

		if (mutations && mutations.length === 1) {
			return;
		}

		if (
			mutations[0].target.classList.contains('YT-HWV-BUTTON') ||
			mutations[0].target.classList.contains('YT-HWV-BUTTON-SHORTS')
		) {
			return;
		}

		// something *ELSE* changed state (not our buttons), so keep going

		logDebug('Running check for watched videos, and shorts');
		updateClassOnWatchedItems();
		updateClassOnShortsItems();
		renderButtons();
	}, 250);

	// ===========================================================

	// Hijack all XHR calls
	const send = XMLHttpRequest.prototype.send;
	XMLHttpRequest.prototype.send = function (data) {
		this.addEventListener(
			'readystatechange',
			function () {
				if (
					// Anytime more videos are fetched -- re-run script
					this.responseURL.indexOf('browse_ajax?action_continuation') > 0
				) {
					setTimeout(() => {
						run();
					}, 0);
				}
			},
			false,
		);
		send.call(this, data);
	};

	// ===========================================================

	const observeDOM = (function () {
		const MutationObserver =
			window.MutationObserver || window.WebKitMutationObserver;
		const eventListenerSupported = window.addEventListener;

		return function (obj, callback) {
			logDebug('Attaching DOM listener');

			// Invalid `obj` given
			if (!obj) return;

			if (MutationObserver) {
				const obs = new MutationObserver((mutations, _observer) => {
					if (
						mutations[0].addedNodes.length ||
						mutations[0].removedNodes.length
					) {
						callback(mutations);
					}
				});

				obs.observe(obj, { childList: true, subtree: true });
			} else if (eventListenerSupported) {
				obj.addEventListener('DOMNodeInserted', callback, false);
				obj.addEventListener('DOMNodeRemoved', callback, false);
			}
		};
	})();

	// ===========================================================

	logDebug('Starting Script');

	// YouTube does navigation via history and also does a bunch
	// of AJAX video loading. In order to ensure we're always up
	// to date, we have to listen for ANY DOM change event, and
	// re-run our script.
	observeDOM(document.body, run);

	run();
})();
