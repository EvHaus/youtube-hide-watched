# youtube-hide-watched

A simple userscript for toggling visibility of watched videos in YouTube.

# Installation

- Install TamperMonkey or GreaseMonkey extension for your browser
- Visit https://greasyfork.org/en/scripts/13040-youtube-hide-watched-videos and hit the Install button
- Visit YouTube (or refresh the YouTube page if it's already open)

# How to Use

The script adds a small button at the top of the page. Pressing the button cycles through showing watched videos normally, then dimmed, then entirely hidden.  See screenshot below.

The button keeps track of different areas of YouTube separately.  This allows you to hide watched videos on the Subscriptions page, show watched as dimmed in the sidebar recommendations, and show watched normally on channel pages.  Here are the areas that the button keeps track of separately:
- Subscriptions page 
- Channel pages
- Trending page
- Recommendations sidebar when watching a video
- Playlist pages
- Everywhere else

You will see the the button at the top of the page, to right of the Search box.

![screenshot](screenshot.png 'Screenshot')
