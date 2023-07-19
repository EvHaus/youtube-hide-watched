# youtube-hide-watched

A simple userscript for toggling visibility of watched videos in YouTube, on your Subscriptions page and elsewhere on the site. Also provides a toggle to hide YouTube Shorts.

# Installation

- Install [TamperMonkey](https://www.tampermonkey.net), [GreaseMonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/) or [UserScripts](https://github.com/quoid/userscripts) extension for your browser
- Visit https://greasyfork.org/en/scripts/13040-youtube-hide-watched-videos and hit the Install button
- Visit YouTube (or refresh the YouTube page if it's already open)

# How to Use

The script adds two small buttons at the top of the page, see screenshot below. Pressing the "Watched Videos" button cycles through showing watched videos normally, then dimmed, then entirely hidden. Pressing the "Shorts" button cycles through showing shorts normally, then dimmed, then entirely hidden.

You will see the buttons at the top of the page, to right of the Search box.

![screenshot](screenshot.png 'Screenshot')

The "Watched Videos" button keeps track of different areas of YouTube separately. This allows you to hide watched videos on the Subscriptions page, show watched as dimmed in the sidebar recommendations, and show watched normally on channel pages. Here are the areas that the button keeps track of separately:

- Subscriptions page
- Channel pages
- Trending page
- Recommendations sidebar when watching a video
- Playlist pages
- Everywhere else

YouTube does not keep track of which Shorts you've watched, s the "Shorts" button dims/hides all Shorts.
