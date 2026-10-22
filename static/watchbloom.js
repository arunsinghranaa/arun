"use strict";

// Automatically bypass ngrok free tier browser warning interstitial for all media and API requests
try {
  document.cookie = "ngrok-browser-warning-skip=true; path=/; max-age=31536000; SameSite=Lax";
  document.cookie = "bypass-ngrok-browser-warning=true; path=/; max-age=31536000; SameSite=Lax";
} catch (_) {}

if (typeof window.fetch === "function") {
  const _origFetch = window.fetch;
  window.fetch = function (resource, init) {
    init = init || {};
    try {
      if (!init.headers) {
        init.headers = { "ngrok-skip-browser-warning": "true" };
      } else if (init.headers instanceof Headers) {
        if (!init.headers.has("ngrok-skip-browser-warning")) {
          init.headers.set("ngrok-skip-browser-warning", "true");
        }
      } else if (Array.isArray(init.headers)) {
        init.headers.push(["ngrok-skip-browser-warning", "true"]);
      } else if (typeof init.headers === "object") {
        init.headers["ngrok-skip-browser-warning"] = "true";
      }
    } catch (_) {}
    return _origFetch.call(this, resource, init);
  };
}

const $ = (id) => document.getElementById(id);
const q = $("q");
const suggestions = $("suggestions");
const results = $("res");
const PAGE_SIZE = 12;
const SUN_THEME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"/></svg>';
const MOON_THEME_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.2 15.1A8.7 8.7 0 0 1 8.9 3.8 8.7 8.7 0 1 0 20.2 15.1Z"/></svg>';
const BACK_ARROW_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5M12 19l-7-7 7-7"/></svg>';
const CREATE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m16 10 5-3.5v11L16 14v3a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v3.5Z"/><path d="M9 9v6M6 12h6"/></svg>';
const NOTIFICATION_BELL_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/></svg>';
const REELS_ICON = '<svg class="reels-symbol" viewBox="0 0 256 256" fill="none" aria-hidden="true"><defs><linearGradient id="reelcraft-grad-js" x1="15%" y1="15%" x2="85%" y2="85%"><stop offset="0%" stop-color="#FF8A00"/><stop offset="52%" stop-color="#FF0055"/><stop offset="100%" stop-color="#9900FF"/></linearGradient><linearGradient id="reelcraft-surface-grad-js" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A00" stop-opacity="0.18"/><stop offset="100%" stop-color="#9900FF" stop-opacity="0.06"/></linearGradient><linearGradient id="reelcraft-border-grad-js" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stop-color="#FF8A00" stop-opacity="0.45"/><stop offset="100%" stop-color="#9900FF" stop-opacity="0.15"/></linearGradient><radialGradient id="reelcraft-ambient-js" cx="50%" cy="50%" r="50%"><stop offset="0%" stop-color="#FF0055" stop-opacity="0.55"/><stop offset="100%" stop-color="#9900FF" stop-opacity="0"/></radialGradient></defs><path d="M 128 16 C 188 16, 214 16, 227 29 C 240 42, 240 68, 240 128 C 240 188, 240 214, 227 227 C 214 240, 188 240, 128 240 C 68 240, 42 240, 29 227 C 16 214, 16 188, 16 128 C 16 68, 16 42, 29 29 C 42 16, 68 16, 128 16 Z" fill="#0D0B14" stroke="url(#reelcraft-border-grad-js)" stroke-width="2.5"/><circle cx="128" cy="128" r="88" fill="url(#reelcraft-ambient-js)" opacity="0.35"/><g transform="translate(128, 128)"><path d="M -68 -48 C -36 -74, 36 -74, 68 -48" fill="none" stroke="url(#reelcraft-grad-js)" stroke-width="2.475" stroke-linecap="round" stroke-dasharray="10 12" opacity="0.45"/><path d="M -56 76 C -20 92, 20 92, 56 76" fill="none" stroke="url(#reelcraft-grad-js)" stroke-width="2.475" stroke-linecap="round" opacity="0.35"/><g class="reel-clapper-hinge" transform="rotate(-8, -54, -34)"><rect x="-64" y="-58" width="128" height="26" rx="13" fill="url(#reelcraft-grad-js)"/><path d="M -34 -58 L -18 -32 M 6 -58 L 22 -32 M 42 -58 L 54 -38" stroke="#090D16" stroke-width="4.5" stroke-linecap="butt" opacity="0.8"/></g><rect x="-64" y="-22" width="128" height="88" rx="26" fill="url(#reelcraft-surface-grad-js)" stroke="url(#reelcraft-grad-js)" stroke-width="4.5"/><g transform="translate(2, 18) scale(1)"><path d="M -18 -18 C -18 -25, -9 -29, -2 -25 L 26 -7 C 33 -3, 33 5, 26 9 L -2 27 C -9 31, -18 27, -18 20 Z" fill="url(#reelcraft-grad-js)"/><path d="M -18 2 L 10 19 L -2 27 C -9 31, -18 27, -18 20 Z" fill="rgba(0,0,0,0.22)"/></g></g></svg>';
const REEL_ACTION_ICONS = {
  like: '<svg viewBox="0 0 24 24" focusable="false"><path d="M20.8 8.9c0 5.1-8.8 11-8.8 11s-8.8-5.9-8.8-11a4.7 4.7 0 0 1 8.8-2.3 4.7 4.7 0 0 1 8.8 2.3Z"/></svg>',
  comments: '<svg viewBox="0 0 24 24" focusable="false"><path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H6l-3 2v-9.5A7.5 7.5 0 0 1 10.5 4h2A7.5 7.5 0 0 1 20 11.5Z"/><path d="M7.5 10h9M7.5 14h6"/></svg>',
  save: '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.8h12a1.5 1.5 0 0 1 1.5 1.5V21L12 16.5 4.5 21V5.3A1.5 1.5 0 0 1 6 3.8Z"/></svg>',
  saved: '<svg viewBox="0 0 24 24" focusable="false"><path d="M6 3.8h12a1.5 1.5 0 0 1 1.5 1.5V21L12 16.5 4.5 21V5.3A1.5 1.5 0 0 1 6 3.8Z"/><path d="m8.5 10.7 2.2 2.2 4.8-5"/></svg>',
  share: '<svg viewBox="0 0 24 24" focusable="false"><path d="M14 5 21 12l-7 7v-4c-5 0-8 2-11 5 1-6 4-10 11-10V5Z"/></svg>',
};
function reelActionIcon(name) { return REEL_ACTION_ICONS[name] || ""; }
const VIEWS = ["home", "explore", "reels", "videos", "playlists", "history", "following", "liked", "saved", "trending", "courses", "cinema", "music", "gamers", "headlines", "settings"];
const DISCOVER_VIEWS = {
  trending: { category: "all", type: "all" },
  courses: { category: "learning", type: "course" },
  cinema: { category: "entertainment", type: "all" },
  music: { category: "music", type: "all" },
  gamers: { category: "gaming", type: "all" },
  headlines: { category: "news", type: "all" },
};
const SORTS = ["relevance", "popularity", "newest"];
const CATEGORY_KEYS = [
  "all", "technology", "gaming", "music", "news", "sports", "cooking",
  "travel", "entertainment", "lifestyle", "creative", "learning",
];

const COPY = {
  en: {
    share: "Share", linkCopied: "Link copied", back: "Back", quality: "Quality",
    yourSpace: "Your space", home: "Home", creatorTools: "Creator tools", create: "Create", account: "Account", goLive: "Go live", setupNeeded: "Setup", guestMode: "Guest mode · this browser", accountMenu: "My profile", myProfile: "Your creator profile", accountMenuHint: "Add your display name and profile photo", profileName: "Display name", profileNamePlaceholder: "What should Watchbloom call you?", profilePhoto: "Profile photo", choosePhoto: "Choose photo", removePhoto: "Remove photo", saveProfile: "Save profile", profileLocalNote: "Saved only in this browser for now; account sign-in is not connected.", profileSaved: "Your profile was saved on this browser.", profileImageError: "Choose a supported image up to 8 MB.", savedVideos: "Saved videos", appearance: "Appearance", displayLanguage: "Display language", settings: "Settings", helpFeedback: "Help & feedback", settingsPending: "Your display theme and language controls are available in this menu.", helpPending: "Watchbloom is a local demo. For help, check the project README and API guide.", darkTheme: "Dark", lightTheme: "Light", downloadVideo: "Download video", like: "Like", unlike: "Unlike", watchLater: "Watch later", removeWatchLater: "Remove from Watch later", saveToPlaylist: "Save to playlist", more: "More", playbackSpeed: "Playback speed", audioLanguage: "Audio language", originalAudio: "Original audio", audioTracksNote: "Other language tracks must be included in the video file.", cinemaMode: "Cinema mode", relatedVideos: "Related videos", comments: "Comments", newestComments: "Newest", bestComments: "Best", writeComment: "Add a comment…", postComment: "Comment", helpful: "Helpful", noComments: "No comments yet. Start the conversation.", playlistChoose: "Choose a playlist", playlistName: "New playlist name", createAndSave: "Create and save", saveToSelected: "Save to playlist", localOnly: "Your playlists and comments are saved in this browser.", savedToPlaylist: "Saved to playlist.", reelMore: "More options", reelDescriptionLabel: "Description", reelAmbient: "Ambient mode", reelCaptions: "Captions", reelFullScreen: "Full screen", reelNotInterested: "Not interested", reelHideCreator: "Don't recommend this channel", reelReport: "Report", reelSendFeedback: "Send feedback", reelReportPrompt: "Why are you reporting this Reel?", reelReportSaved: "Report saved on this device; it was not sent.", accountPending: "Account sign-up and sign-in are not connected yet. This demo currently keeps saved and followed items in this browser only.", livePending: "Live broadcasting is not connected yet. It needs a streaming service and a secure media server before viewers can watch a live stream.", createPending: "Creator tools are being set up. For now, add original videos and playlists through the catalog files.", uploadOriginal: "Add an original video", playlistCreate: "Create a playlist", signUp: "Create account", signIn: "Sign in", startLive: "Start live", explore: "Explore", videos: "Videos", playlists: "Playlists", following: "Following",
    saved: "Saved", discover: "Discover", trending: "Trending", courses: "Courses", cinema: "Cinema & Series", musicBeats: "Music & Beats", gamersHub: "Gamers Hub", headlines: "Headlines", keepDiscovering: "Keep discovering.",
    trendingPageEyebrow: "The Watchbloom charts", trendingPageTitle: "The internet is watching.", trendingPageNote: "See what is getting the most plays: popular videos, vertical Reels, and more.", trendingPageSignal: "Popular across Watchbloom",
    trendingFeatured: "Top chart pick", trendingWatchFeatured: "Watch the #1 pick", trendingReelsTitle: "Reels catching fire", trendingReelsNote: "Quick watches with a lot of replay energy.", trendingVideosTitle: "Videos on the rise", trendingVideosNote: "The most-played videos, in order.", trendingRankingNote: "Ranked by plays from the Watchbloom catalog.",
    trendingLoadingTitle: "Finding the pulse", trendingLoadingText: "Gathering the most-played videos.", trendingErrorTitle: "The charts missed a beat", trendingErrorText: "Trending videos could not load. Check your connection and try again.", trendingRetry: "Try again", trendingEmptyReelsTitle: "No trending Reels yet", trendingEmptyReelsText: "When Reels are added to the catalog, the popular ones will show up here.", trendingEmptyVideosTitle: "No videos to rank yet", trendingEmptyVideosText: "Add videos to the catalog and the most-played picks will appear here.", trendingVideoCount: "videos", trendingReelCount: "Reels",
    saveForLater: "Save videos for later and follow whatever catches your eye.",
    heroEyebrow: "A good place to find your next watch", heroTitle: "Find a little wonder.",
    heroText: "Explore original videos and playlists across the things you love. Search a topic or browse a fresh category.",
    exploreCollection: "Explore the collection", collection: "The collection", all: "All",
    sortResults: "Sort results", featured: "Featured", mostViewed: "Most viewed", newest: "Newest",
    filterDuration: "Filter by duration", anyLength: "Any length", under3: "Under 3 min",
    "3to20": "3–20 min", over20: "Over 20 min", filterDate: "Filter by upload date",
    anyTime: "Any time", today: "Today", thisWeek: "This week", thisMonth: "This month", thisYear: "This year",
    footerTagline: "your place to find something worth watching", footerNote: "Original catalog · no scraped videos",
    aboutSearch: "About Watchbloom", aboutText: "Watchbloom has its own catalog and SQLite full-text search. Search, categories, and ranking are built for this app. It does not fetch YouTube data or reuse YouTube branding.",
    searchPlaceholder: "Search videos, topics, creators…", searchLabel: "Search the Watchbloom catalog",
    searchButton: "Search", voiceSearch: "Voice search", stopVoiceSearch: "Stop voice search", voiceListening: "Listening… speak now", voicePermission: "Allow microphone access to use voice search.", voiceSearchFailed: "Voice search could not start. Try again.", voiceUnsupported: "Voice search is not supported in this browser.", clearSearch: "Clear search", closeNavigation: "Close navigation",
    video: "Video", playlist: "Playlist", originalVideo: "Original video",
    plays: "plays", mins: "min", playlistVideos: "{count} videos", savedItems: "saved items",
    follow: "Follow", unfollowCreator: "Unfollow", followedState: "followed", unfollowedState: "unfollowed",
    alertMode_relevant: "Most relevant", alertMode_all: "All", alertMode_none: "None",
    alertsButtonTitle: "Notifications: {mode}", alertsButtonLabel: "{creator}: {mode} notifications",
    alertsMenuLabel: "Notification preference for {creator}",
    alertsSaved: "Notifications for {creator}: {mode}. This demo does not send push alerts yet.", notifications: "Notifications", noNotifications: "You are all caught up.", notificationNote: "This local demo does not send push alerts yet.", manageFollowing: "Manage followed creators", closeNotifications: "Close notifications",
    followToast: "{creator} {state}.", playlistNote: "This playlist brings together original videos from the Watchbloom catalog.",
    playlistContents: "In this playlist", playlistEmpty: "No videos have been added to this playlist yet.",
    noFollowingTitle: "You are not following any creators yet", noFollowingText: "Open a creator profile from their name under a video, then follow their account.",
    noFollowingItemsTitle: "No creators match this search", noFollowingItemsText: "Try another creator name or clear your search.",
    saveItem: "Save to saved items", removeSaved: "Remove from saved items", recent: "Recent:", clear: "Clear",
    noSavedTitle: "Nothing saved yet", noSavedText: "Tap a bookmark on any card to keep it here.",
    noResultsTitle: "No matches this time", noResultsText: "Try a broader topic, fewer words, or a different filter.",
    noItemsTitle: "Nothing to show here yet", noItemsText: "Try another category or add original videos and playlists to the catalog.",
    emptyCategoryTitle: "No {category} items yet", emptyCategoryText: "Try a different category or add original content to this shelf.",
    connectionTitle: "Could not reach the collection", connectionText: "Check that the app server is running, then refresh this page.",
    showMore: "Show more", couldNotLoad: "Could not load more yet. Try again.",
    searchResults: "Showing {shown} of {total} item{plural}", corrected: "Showing matches for “{query}”. ",
    partial: "Some words did not match exactly. ", inView: "in this view", items: "items", savedCount: "saved",
    category: "Category", added: "Added", close: "Close details", watchFileMissing: "This video card is ready, but no video file is attached yet. Add your original MP4 to static/videos and set its filename in catalog.json.",
    playbackFailed: "This video could not be loaded. Check the filename and make sure it is in static/videos.",
    pictureInPicture: "Picture in picture", pipUnavailable: "Picture-in-Picture is not available in this browser.", fullscreen: "Fullscreen", exitFullscreen: "Exit fullscreen", fullscreenUnavailable: "Fullscreen is not available in this browser.",
    noMediaTag: "Video file not added yet", toHinglish: "Switch to Hinglish", toEnglish: "Switch to English",
    cat_all: "All", cat_technology: "Technology", cat_gaming: "Gaming", cat_music: "Music",
    cat_news: "News", cat_sports: "Sports", cat_cooking: "Cooking", cat_travel: "Travel",
    cat_entertainment: "Entertainment", cat_lifestyle: "Lifestyle", cat_creative: "Creative", cat_learning: "Learning",
    homeBadge: "Live Stream & Fresh Drops",
    view_home_title: "Featured Stream", view_home_note: "Fresh personalized picks, original drops & trending videos.", view_explore_title: "Your next watch", view_explore_note: "Fresh finds across every topic.",
    view_trending_title: "Trending", view_trending_note: "Popular videos and Reels from across the collection.",
    view_trending_title: "Trending", view_trending_note: "Popular videos and playlists from across the collection.",
    view_videos_title: "Videos", view_videos_note: "Original videos from across the collection.",
    view_playlists_title: "Playlists", view_playlists_note: "Curated groups of videos, ready to play one by one.",
    view_following_title: "Creators you follow", view_following_note: "Open a creator profile to view their videos. Choose Find creators to follow someone new.", creators: "creators", creatorResults: "Showing {shown} of {total} creators", discoverCreators: "Find creators", channelHome: "Home", channelVideos: "Videos", channelReels: "Reels", channelPlaylists: "Playlists", channelIntro: "Original videos and playlists from this creator.", channelUnavailable: "This creator channel could not be loaded.",
    view_saved_title: "Saved", view_saved_note: "Your personal list, saved on this device.",
    view_courses_title: "Courses", view_courses_note: "Learning playlists from the Watchbloom catalog.",
    view_cinema_title: "Cinema & Series", view_cinema_note: "Films, series, and entertainment from the catalog.",
    view_music_title: "Music & Beats", view_music_note: "Music and sound from the Watchbloom catalog.",
    view_gamers_title: "Gamers Hub", view_gamers_note: "Gaming videos and playthroughs from the catalog.",
    view_headlines_title: "Headlines", view_headlines_note: "News and current affairs from the catalog.",
  },
  hi: {
    share: "Share", linkCopied: "Link copy ho gaya", back: "Peeche / Back", quality: "Quality",
    yourSpace: "Aapki jagah", home: "Home", creatorTools: "Creator tools", create: "Create", account: "Account", goLive: "Go live", setupNeeded: "Setup", guestMode: "Guest mode · isi browser par", accountMenu: "Mera profile", myProfile: "Aapka creator profile", accountMenuHint: "Apna naam aur profile photo jodo", profileName: "Dikhne wala naam", profileNamePlaceholder: "Watchbloom aapko kis naam se bulaye?", profilePhoto: "Profile photo", choosePhoto: "Photo chuno", removePhoto: "Photo hatao", saveProfile: "Profile save karo", profileLocalNote: "Abhi isi browser mein save hoga; sign-in abhi connect nahi hai.", profileSaved: "Aapka profile isi browser mein save ho gaya.", profileImageError: "8 MB tak ki supported image chuno.", savedVideos: "Saved videos", appearance: "Appearance", displayLanguage: "Display language", settings: "Settings", helpFeedback: "Help & feedback", settingsPending: "Theme aur language isi menu se badal sakte ho.", helpPending: "Watchbloom abhi local demo hai. Madad ke liye project README aur API guide dekho.", darkTheme: "Dark", lightTheme: "Light", downloadVideo: "Video download karo", like: "Like karo", unlike: "Like hatao", watchLater: "Baad mein dekho", removeWatchLater: "Watch later se hatao", saveToPlaylist: "Playlist mein save karo", more: "Aur options", playbackSpeed: "Playback speed", audioLanguage: "Audio ki language", originalAudio: "Original audio", audioTracksNote: "Doosri language tabhi chalegi jab video file mein uska track ho.", cinemaMode: "Cinema mode", relatedVideos: "Milte-julte videos", comments: "Comments", newestComments: "Naye pehle", bestComments: "Best pehle", writeComment: "Comment likho…", postComment: "Comment bhejo", helpful: "Helpful", noComments: "Abhi comments nahi hain. Pehla comment likho.", playlistChoose: "Playlist chuno", playlistName: "Nayi playlist ka naam", createAndSave: "Banao aur save karo", saveToSelected: "Playlist mein save karo", localOnly: "Playlists aur comments isi browser mein save hote hain.", savedToPlaylist: "Playlist mein save ho gaya.", reelMore: "Aur options", reelDescriptionLabel: "Description", reelAmbient: "Ambient mode", reelCaptions: "Captions", reelFullScreen: "Full screen", reelNotInterested: "Pasand nahi", reelHideCreator: "Is creator ke videos mat dikhao", reelReport: "Report", reelSendFeedback: "Feedback bhejo", reelReportPrompt: "Is Reel ko report karne ka kaaran kya hai?", reelReportSaved: "Report isi device par save hua; kahin bheja nahi gaya.", accountPending: "Account banana aur sign in abhi connect nahi hain. Is demo mein saved aur followed items isi browser mein rehte hain.", livePending: "Live broadcast abhi connect nahi hai. Live chalane ke liye streaming service aur secure media server chahiye.", createPending: "Creator tools setup ho rahe hain. Abhi original videos aur playlists catalog files ke through add hote hain.", uploadOriginal: "Original video jodo", playlistCreate: "Playlist banao", signUp: "Account banao", signIn: "Sign in", startLive: "Live shuru karo", explore: "Explore", videos: "Videos", playlists: "Playlists", following: "Following",
    saved: "Saved", discover: "Explore karo", trending: "Trending", courses: "Courses", cinema: "Cinema & Series", musicBeats: "Music & Beats", gamersHub: "Gamers Hub", headlines: "Headlines", keepDiscovering: "Naya dekhte raho.",
    trendingPageEyebrow: "Watchbloom ke charts", trendingPageTitle: "Sabki nazar yahin hai.", trendingPageNote: "Watchbloom par sabse zyada play hue videos aur vertical Reels, ek hi jagah.", trendingPageSignal: "Watchbloom par popular",
    trendingFeatured: "Chart ka sabse khaas pick", trendingWatchFeatured: "#1 pick dekho", trendingReelsTitle: "Reels jo chha rahi hain", trendingReelsNote: "Chhoti videos, baar-baar dekhne ka mann.", trendingVideosTitle: "Videos jo upar ja rahe hain", trendingVideosNote: "Sabse zyada play hue videos, ranking mein.", trendingRankingNote: "Watchbloom catalog ke plays ke hisaab se ranking.",
    trendingLoadingTitle: "Trending dhoondh rahe hain", trendingLoadingText: "Sabse zyada play hue videos la rahe hain.", trendingErrorTitle: "Charts abhi load nahi hue", trendingErrorText: "Trending videos load nahi ho paaye. Connection check karke phir try karo.", trendingRetry: "Phir try karo", trendingEmptyReelsTitle: "Abhi koi trending Reel nahi", trendingEmptyReelsText: "Catalog mein Reels aane par popular Reels yahan dikhenge.", trendingEmptyVideosTitle: "Abhi rank karne ke liye videos nahi", trendingEmptyVideosText: "Catalog mein videos jodo; sabse zyada play hue videos yahan dikhenge.", trendingVideoCount: "videos", trendingReelCount: "Reels",
    saveForLater: "Videos baad ke liye save karo aur pasand ke topics explore karo.",
    heroEyebrow: "Agla video dhoondhne ki aasan jagah", heroTitle: "Kuch naya dekho.",
    heroText: "Apne pasand ke topics par original videos aur playlists dekho. Search karo ya category browse karo.",
    exploreCollection: "Collection dekho", collection: "Collection", all: "Sab",
    sortResults: "Results sort karo", featured: "Featured", mostViewed: "Sabse zyada dekhe gaye", newest: "Naye pehle",
    filterDuration: "Video ki length", anyLength: "Koi bhi length", under3: "3 min se kam",
    "3to20": "3–20 min", over20: "20 min se zyada", filterDate: "Upload date",
    anyTime: "Kabhi bhi", today: "Aaj", thisWeek: "Is hafte", thisMonth: "Is mahine", thisYear: "Is saal",
    footerTagline: "kuch achha dekhne ki aapki jagah", footerNote: "Original catalog · copied videos nahi",
    aboutSearch: "Watchbloom ke baare mein", aboutText: "Watchbloom apna catalog aur SQLite full-text search use karta hai. Search aur ranking isi app ke liye banaye gaye hain. Yeh YouTube data ya branding use nahi karta.",
    searchPlaceholder: "Videos, topics ya creators search karo…", searchLabel: "Watchbloom catalog search karo",
    searchButton: "Search", voiceSearch: "Awaaz se search", stopVoiceSearch: "Voice search roko", voiceListening: "Sun rahe hain… boliye", voicePermission: "Voice search ke liye microphone ki permission dein.", voiceSearchFailed: "Voice search shuru nahi hui. Phir try karein.", voiceUnsupported: "Is browser mein voice search support nahi hai.", clearSearch: "Search saaf karo", closeNavigation: "Navigation band karo",
    video: "Video", playlist: "Playlist", originalVideo: "Original video",
    plays: "views", mins: "min", playlistVideos: "{count} videos", savedItems: "saved items",
    follow: "Follow karo", unfollowCreator: "Unfollow karo", followedState: "ko follow kiya", unfollowedState: "ko unfollow kiya",
    alertMode_relevant: "Sabse relevant", alertMode_all: "Sabhi", alertMode_none: "Koi nahi",
    alertsButtonTitle: "Notifications: {mode}", alertsButtonLabel: "{creator}: {mode} notifications",
    alertsMenuLabel: "{creator} ke notification options",
    alertsSaved: "{creator} ke notifications: {mode}. Demo abhi push alert nahi bhejta.", notifications: "Notifications", noNotifications: "Abhi koi naya notification nahi hai.", notificationNote: "Yeh demo abhi push alert nahi bhejta.", manageFollowing: "Follow kiye creators dekho", closeNotifications: "Notifications band karo",
    followToast: "{creator} {state}.", playlistNote: "Is playlist mein Watchbloom catalog ke original videos ek saath rakhe hain.",
    playlistContents: "Is playlist mein", playlistEmpty: "Abhi is playlist mein videos nahi jode gaye.",
    noFollowingTitle: "Abhi aap kisi creator ko follow nahi kar rahe", noFollowingText: "Video ke neeche creator ka naam kholo, phir uske account ko follow karo.",
    noFollowingItemsTitle: "Is search mein creator nahi mila", noFollowingItemsText: "Doosra creator naam try karo ya search saaf karo.",
    saveItem: "Saved items mein rakho", removeSaved: "Saved items se hatao", recent: "Recent:", clear: "Saaf karo",
    noSavedTitle: "Abhi kuch save nahi hai", noSavedText: "Kisi card par bookmark dabao, woh yahan mil jayega.",
    noResultsTitle: "Is baar match nahi mila", noResultsText: "Topic chhota karke, kam words ya doosra filter try karo.",
    noItemsTitle: "Yahan abhi kuch nahi hai", noItemsText: "Doosri category dekho ya catalog mein original videos aur playlists add karo.",
    emptyCategoryTitle: "Abhi {category} items nahi hain", emptyCategoryText: "Doosri category dekho ya is shelf mein original content add karo.",
    connectionTitle: "Collection nahi khul paayi", connectionText: "App server chal raha hai ya nahi check karke page refresh karo.",
    showMore: "Aur dikhao", couldNotLoad: "Abhi aur load nahi hua. Phir try karo.",
    searchResults: "{total} mein se {shown} item dikh rahe hain", corrected: "Inke results dikh rahe hain: “{query}”. ",
    partial: "Kuch words ka exact match nahi mila. ", inView: "is view mein", items: "items", savedCount: "saved",
    category: "Category", added: "Joda gaya", close: "Details band karo", watchFileMissing: "Yeh video card ready hai, lekin video file abhi nahi lagi. Apna MP4 static/videos mein rakho aur catalog.json mein uska filename likho.",
    playbackFailed: "Video load nahi hua. Filename check karo aur file static/videos mein rakho.",
    pictureInPicture: "Picture-in-Picture", pipUnavailable: "Is browser mein Picture-in-Picture available nahi hai.", fullscreen: "Full screen", exitFullscreen: "Full screen band karo", fullscreenUnavailable: "Is browser mein fullscreen available nahi hai.",
    noMediaTag: "Video file abhi nahi jodi", toHinglish: "Hinglish mein badlo", toEnglish: "English mein badlo",
    cat_all: "Sab", cat_technology: "Technology", cat_gaming: "Gaming", cat_music: "Music",
    cat_news: "News", cat_sports: "Sports", cat_cooking: "Cooking", cat_travel: "Travel",
    cat_entertainment: "Entertainment", cat_lifestyle: "Lifestyle", cat_creative: "Creative", cat_learning: "Learning",
    homeBadge: "Live Stream & Naye Videos",
    view_home_title: "Featured Stream", view_home_note: "Naye chune hue videos, original drops aur fresh picks.", view_explore_title: "Agla kya dekhein?", view_explore_note: "Har topic se naye videos.",
    view_trending_title: "Trending", view_trending_note: "Collection ke popular videos aur Reels.",
    view_trending_title: "Trending", view_trending_note: "Collection ke popular videos aur playlists.",
    view_videos_title: "Videos", view_videos_note: "Collection ke original videos.",
    view_playlists_title: "Playlists", view_playlists_note: "Chune hue videos ki list, ek ke baad ek dekhne ke liye.",
    view_following_title: "Aapke followed creators", view_following_note: "Creator ke videos dekhne ke liye profile kholo. Naye creator ko follow karne ke liye Creators dhoondho chuno.", creators: "creators", creatorResults: "{total} mein se {shown} creators dikh rahe hain", discoverCreators: "Creators dhoondho", channelHome: "Home", channelVideos: "Videos", channelReels: "Reels", channelPlaylists: "Playlists", channelIntro: "Is creator ke original videos aur playlists.", channelUnavailable: "Creator channel nahi khul paaya.",
    view_saved_title: "Saved", view_saved_note: "Aapki personal list, isi device par save hai.",
    view_courses_title: "Courses", view_courses_note: "Watchbloom catalog ki learning playlists.",
    view_cinema_title: "Cinema & Series", view_cinema_note: "Catalog ki films, series aur entertainment.",
    view_music_title: "Music & Beats", view_music_note: "Watchbloom catalog ka music aur sound.",
    view_gamers_title: "Gamers Hub", view_gamers_note: "Catalog ke gaming videos aur playthroughs.",
    view_headlines_title: "Headlines", view_headlines_note: "Catalog ki news aur current affairs.",
  },
};

Object.assign(COPY, window.WATCHBLOOM_COPY || {});
Object.assign(COPY.en, {
  history: "History", historyEmptyTitle: "Nothing in your history yet", historyEmptyText: "Open a video or play a Reel, and it will appear here on this browser.",
  view_history_title: "History", view_history_note: "Videos and playlists you opened recently, saved on this browser.",
  likedVideos: "Liked videos", likedBadge: "Your Space · Favorites",
  likedVideosTitle: "Liked Videos", likedVideosNote: "All the videos, films, and reels you gave a thumbs-up to across Watchbloom.",
  likedCountSuffix: "videos liked", noLikedTitle: "No liked videos yet",
  noLikedText: "Give a thumbs-up to any video or reel to find it here in your space.",
  noLikedVideosSub: "No original videos in your liked collection yet.",
  noLikedReelsSub: "No reels in your liked collection yet.",
  playAll: "Play all", shuffle: "Shuffle", updatedToday: "Updated today",
  originalVideos: "Videos",
  view_liked_title: "Liked videos", view_liked_note: "Videos and reels you gave a thumbs-up to across Watchbloom.",
  dislike: "Dislike", commentAction: "Comments", subtitles: "Subtitles",
  subtitlesOff: "Off",
  reactionUnavailable: "Could not update your reaction. Try again.",
  likeComment: "Like comment", unlikeComment: "Remove like", deleteComment: "Delete",
  subtitlesOn: "On", subtitlesEnabled: "Subtitles on", subtitlesDisabled: "Subtitles off", subtitlesUnavailable: "No subtitle track is attached to this video yet. Add a WebVTT (.vtt) file to static/subtitles and list it in catalog.json.",
  aiTranslatedAudio: "AI translated audio", aiAudioUnavailable: "AI translated audio — not added",
  audioTracksNote: "Add an AI translated audio track to the video file to enable this option.",
  autoplay: "Autoplay", autoplayOn: "Autoplay is on", autoplayOff: "Autoplay is off",
  upNext: "Up next", replay: "Replay", playNow: "Play now",
  inlinePreview: "5s Preview",
  suggestedVideos: "Suggested videos", filterFromCreator: "From this channel", filterRelated: "Related",
  historyAll: "All Activity", historyVideos: "Videos", historyReels: "Reels",
  noHistoryVideosSub: "No original videos in your watch history yet.",
  noHistoryReelsSub: "No reels in your watch history yet.",
  clearWatchHistory: "Clear Watch History",
  removeFromHistory: "Remove from history",
  watchedLabel: "Watched",
  watchedReelsHeading: "Watched Reels",
  watchedVideosHeading: "Watched Videos",
});
Object.assign(COPY.hi, {
  history: "History", historyEmptyTitle: "Abhi history khaali hai", historyEmptyText: "Koi video kholo ya Reel chalao; woh isi browser par yahan dikhega.",
  view_history_title: "History", view_history_note: "Aapke haal hi mein khole videos aur playlists isi browser mein save hain.",
  likedVideos: "Liked videos", likedBadge: "Aapki jagah · Pasand",
  likedVideosTitle: "Liked Videos", likedVideosNote: "Woh sabhi videos aur reels jinhe aapne pasand (thumbs-up) kiya hai.",
  likedCountSuffix: "videos pasand kiye", noLikedTitle: "Abhi koi video like nahi kiya",
  noLikedText: "Kisi bhi video ya reel par like (thumbs-up) dabao, woh yahan aapki jagah mein mil jayega.",
  noLikedVideosSub: "Liked collection mein abhi lambe videos nahi hain.",
  noLikedReelsSub: "Liked collection mein abhi reels nahi hain.",
  playAll: "Sabhi chalao", shuffle: "Shuffle", updatedToday: "Aaj update hua",
  originalVideos: "Videos",
  view_liked_title: "Liked videos", view_liked_note: "Watchbloom par aapke like kiye gaye sabhi videos aur reels.",
  historyAll: "सभी गतिविधियाँ", historyVideos: "वीडियो", historyReels: "रील्स",
  noHistoryVideosSub: "आपकी हिस्ट्री में अभी कोई वीडियो नहीं है।",
  noHistoryReelsSub: "आपकी हिस्ट्री में अभी कोई रील नहीं है।",
  clearWatchHistory: "पूरी हिस्ट्री साफ़ करें",
  removeFromHistory: "हिस्ट्री से हटाएं",
  watchedLabel: "देखा गया",
  watchedReelsHeading: "देखी गई रील्स",
  watchedVideosHeading: "देखे गए वीडियो",
  dislike: "Dislike", commentAction: "Comments", subtitles: "Subtitles",
  subtitlesOff: "Band",
  reactionUnavailable: "Reaction save nahi hua. Dobara try karo.",
  likeComment: "Comment ko like karo", unlikeComment: "Comment se like hatao", deleteComment: "Delete karo",
  subtitlesOn: "Chalu", subtitlesEnabled: "Subtitles chalu hain", subtitlesDisabled: "Subtitles band hain", subtitlesUnavailable: "Is video ke saath subtitle nahi hai. static/subtitles mein WebVTT (.vtt) file rakhkar catalog.json mein jodo.",
  aiTranslatedAudio: "AI translated audio", aiAudioUnavailable: "AI translated audio — abhi nahi joda",
  audioTracksNote: "Is option ke liye video file mein AI translated audio track jodo.",
  autoplay: "Autoplay", autoplayOn: "Autoplay on hai", autoplayOff: "Autoplay off hai",
  upNext: "Agla video", replay: "Dobara chalayein", playNow: "Abhi chalayein",
  inlinePreview: "5-second preview",
  suggestedVideos: "Milte-julte videos", filterFromCreator: "Is channel se", filterRelated: "Related",
});
Object.assign(COPY.en, {
  reelDetails: "More video details", reelSound: "Sound", reelMuted: "Muted", reelSoundOn: "Turn sound on", reelMuteSound: "Mute sound",
  shorts: "Reels", watchShorts: "Watch Reels", shortFormat: "Reel", createShort: "Create a Reel",
  createShortAction: "Create a Reel", shortCreateHint: "Add an original vertical clip to catalog.json and set format to reel. A 9:16 video works best. Uploading is not connected in this local demo yet.",
  emptyShortsTitle: "Your Reels shelf is ready", emptyShortsText: "Add an original vertical clip to the catalog with format set to reel, then it will appear here.",
  view_shorts_title: "Reels", view_shorts_note: "Quick, vertical videos from the Watchbloom collection.",
  view_trending_title: "Trending", view_trending_note: "Popular videos and Reels from across the collection.",
  shortsShelfEyebrow: "A quick watch", shortsShelfTitle: "Reels", shortsShelfNote: "Choose a Reel to open its player.",
  shortsSeeAll: "See all", playReelSuggestion: "Play Reel", shortsShelfEmptyTitle: "No Reels yet", shortsShelfEmptyText: "Add an original vertical clip to the catalog with format set to reel.",
  shortsShelfCreate: "Create a Reel", shortsShelfLoading: "Finding Reels…", shortsShelfError: "Reels could not load right now.",
  yourChannel: "Your channel", yourChannelHint: "View videos, shorts & playlists",
  yourChannelAuthRequired: "Your channel requires a registered account. Please sign in to view and manage your channel.",
  customiseChannel: "Customise channel", manageVideos: "Manage videos",
  uploadVideo: "Upload video", publishVideo: "Publish video",
  uploadDialogTitle: "Upload to your channel",
  uploadFormatLong: "Long Video", uploadFormatShort: "Short / Reel",
  uploadTitleLabel: "Video Title", uploadTitlePlaceholder: "Give your video a catchy title...",
  uploadDescLabel: "Description", uploadDescPlaceholder: "Tell viewers what this video is about...",
  uploadCategoryLabel: "Category", uploadCategoryPlaceholder: "Select a mandatory category (Required)", uploadFileLabel: "Video file",
  uploadFileHint: "Choose MP4 / WebM file or pick a sample below",
  uploadSuccessToast: "Video published to your channel!",
  channelSubscribers: "66 subscribers",
  channelEmptyClapperTitle: "Create content on any device",
  channelEmptyClapperDesc: "Upload and record at home or on the go. Everything that you make public will appear here.",
  channelEmptyClapperBtn: "Create", viewChannel: "View channel", changeBanner: "Change banner",
  profileBio: "Channel bio / description", profileBioPlaceholder: "Tell viewers about yourself or your channel...",
  creatorStudio: "Creator Studio", creatorStudioHint: "Analytics, earnings & content",
  studioDashboard: "Dashboard", studioContent: "Content", studioAnalytics: "Analytics",
  studioCommunity: "Community", studioEarn: "Earn", studioCustomisation: "Customisation",
  channelDashboard: "Channel dashboard", latestVideoPerformance: "Latest video performance",
  channelAnalyticsOverview: "Channel analytics", currentSubscribers: "Current subscribers",
  last28Days: "Last 28 days", last90Days: "Last 90 days", lifetime: "Lifetime",
  watchTimeHours: "Watch time (hours)", estimatedRevenue: "Estimated revenue",
  topVideos: "Top content", latestComments: "Latest comments",
  creatorActions: "Quick creator actions", uploadVideoAction: "Upload new video",
  createReelAction: "Create a Reel", viewChannelAction: "View channel on Watchbloom",
  channelContent: "Channel content", contentAll: "All", contentVideos: "Videos", contentReels: "Reels",
  tableVideo: "Video", tableFormat: "Format", tableVisibility: "Visibility",
  tableDate: "Date", tableViews: "Views", tableComments: "Comments",
  tableLikes: "Likes (vs dislikes)", tableActions: "Actions", publishedStatus: "Public",
  paymentDetails: "Payment details", paymentSummary: "Summary", balanceCard: "Balance",
  minPaymentAmount: "Minimum payment amount is ₹8,000.00",
  balanceThresholdNote: "Your estimated earnings will be processed when balance reaches ₹8,000.00 threshold.",
  totalEarnings: "Total earnings",
  totalEarningsNote: "All-time accumulated creator revenue across Watchbloom network.",
  ytdEarnings: "Year-to-date (YTD)",
  ytdEarningsNote: "Revenue accumulated during current calendar year.",
  paymentMethodActive: "Direct Bank Transfer (Active · ending in ••4821)",
  managePaymentMethod: "Manage payout details",
  monthlyBreakdown: "Estimated monthly revenue breakdown",
  monetizedViews: "Monetized plays", cpmRate: "CPM Rate", rpmRate: "Net RPM",
  earningsAmount: "Estimated revenue", payoutStatus: "Payout status",
  statusProcessing: "Processing", statusPaid: "Paid",
  channelComments: "Channel comments", commentsPublished: "Published",
  commentsHeld: "Held for review", replyAction: "Reply",
  replyPlaceholder: "Write a public reply...", replySubmit: "Reply", replyCancel: "Cancel",
  noCommentsFound: "No comments yet on your channel.",
  channelCustomisation: "Channel customisation", channelName: "Channel name",
  channelHandle: "Channel handle", channelBio: "Channel bio / description",
  channelBanner: "Channel banner", channelAvatar: "Profile picture",
  changeImage: "Change image", saveStudioProfile: "Save changes",
  savedFeedback: "Saved!",
  studioProfileSaved: "Channel customisation saved successfully!",
  studioProfileSavedSub: "Your channel name, handle, and bio are saved and updated across Watchbloom.",
  periodToday: "Today", periodWeek: "1 Week", periodMonth: "1 Month",
  periodYear: "1 Year", periodYears: "Years",
  realtimeTitle: "Realtime", updatingLive: "Updating live",
  viewsLast48h: "Views · Last 48 hours", viewsLast60m: "Views · Last 60 minutes",
  realtimeSubs: "Realtime Subscribers", hourlyVelocity: "Live view velocity (Hourly)",
  tableUploadDate: "Date of Upload", tableRealtimeViews: "Real-Time Views",
  goLiveStudio: "Go Live Studio", startBroadcast: "Go Live Now", endBroadcast: "End Stream",
  streamLive: "LIVE", streamEnded: "Stream Ended", liveChat: "Live Chat", sendChat: "Send",
  saveLiveVod: "Save as Video to Channel", streamSummary: "Stream Summary", cameraPreview: "Camera Preview",
  cameraPermissionNeeded: "Camera and microphone access is needed to broadcast live.",
  allowCamera: "Allow Camera", virtualStudioMode: "Virtual Studio Mode", streamTitle: "Stream Title",
  streamCategory: "Category", streamPrivacy: "Visibility", streamDesc: "Stream Description",
  streamSavedToast: "Live stream saved to your channel videos!", micMutedToast: "Microphone muted",
  micActiveToast: "Microphone active", camMutedToast: "Camera paused", camActiveToast: "Camera active",
  yourVideos: "Your videos", contentLive: "Live", channelLive: "Live", channelCommunity: "Community",
  communityPosts: "Community Posts", sharePost: "Share as Post", shareLivePostTitle: "Share Live Stream as Post",
  publishToCommunity: "Publish to Community", livePostSuccessToast: "Live stream shared as community post!",
  channelLiveEmptyTitle: "No live streams yet",
  channelLiveEmptyDesc: "Broadcast live to your viewers and connect in real time using Watchbloom Go Live Studio.",
});
Object.assign(COPY.hi, {
  reelDetails: "Video ki aur jaankari", reelSound: "Aawaaz", reelMuted: "Mute hai", reelSoundOn: "Aawaaz chalu karo", reelMuteSound: "Aawaaz band karo",
  shorts: "Reels", watchShorts: "Reels dekho", shortFormat: "Reel", createShort: "Reel banao",
  createShortAction: "Reel banao", shortCreateHint: "Catalog.json mein apna original vertical clip jodo aur format ko reel set karo. 9:16 video achha rahega. Is local demo mein upload abhi connect nahi hai.",
  emptyShortsTitle: "Aapka Reels section ready hai", emptyShortsText: "Catalog mein apna original vertical clip jodo aur format reel set karo; phir yahan dikhega.",
  view_shorts_title: "Reels", view_shorts_note: "Watchbloom collection ke chhote vertical videos.",
  view_trending_title: "Trending", view_trending_note: "Collection ke popular videos aur Reels.",
  shortsShelfEyebrow: "Chhota sa video", shortsShelfTitle: "Reels", shortsShelfNote: "Reel chuno; uska player alag khulega.",
  shortsSeeAll: "Sab dekho", playReelSuggestion: "Reel chalao", shortsShelfEmptyTitle: "Abhi Reels nahi hain", shortsShelfEmptyText: "Catalog mein original vertical clip jodo aur format reel set karo.",
  shortsShelfCreate: "Reel banao", shortsShelfLoading: "Reels dhoondh rahe hain…", shortsShelfError: "Abhi Reels load nahi ho paaye.",
  yourChannel: "Aapka channel", yourChannelHint: "Videos, shorts aur playlists dekho",
  yourChannelAuthRequired: "अपना चैनल देखने और मैनेज करने के लिए लॉगिन होना ज़रूरी है।",
  customiseChannel: "Customise channel", manageVideos: "Manage videos",
  uploadVideo: "Video upload karo", publishVideo: "Publish video",
  uploadDialogTitle: "Apne channel par upload karo",
  uploadFormatLong: "Long Video", uploadFormatShort: "Short / Reel",
  uploadTitleLabel: "Video Title", uploadTitlePlaceholder: "Video ka mast title likho...",
  uploadDescLabel: "Description", uploadDescPlaceholder: "Viewers ko video ke baare mein batao...",
  uploadCategoryLabel: "Category", uploadCategoryPlaceholder: "ज़रूरी कैटेगरी चुनें (Mandatory)", uploadFileLabel: "Video file",
  uploadFileHint: "MP4 / WebM file chuno ya neeche sample select karo",
  uploadSuccessToast: "Video aapke channel par publish ho gaya!",
  channelSubscribers: "66 subscribers",
  channelEmptyClapperTitle: "Kisi bhi device par content banayein",
  channelEmptyClapperDesc: "Ghar par ya raaste mein videos upload aur record karein. Aap jo bhi public karenge woh yahan dikhai dega.",
  channelEmptyClapperBtn: "Create", viewChannel: "Channel dekho", changeBanner: "Banner badlo",
  profileBio: "Channel bio / description", profileBioPlaceholder: "Apne ya channel ke baare mein likhein...",
  creatorStudio: "क्रिएटर स्टूडियो", creatorStudioHint: "एनालिटिक्स, कमाई और वीडियो",
  studioDashboard: "डैशबोर्ड", studioContent: "कंटेंट", studioAnalytics: "एनालिटिक्स",
  studioCommunity: "कम्युनिटी", studioEarn: "कमाई", studioCustomisation: "कस्टमाइज़ेशन",
  channelDashboard: "चैनल डैशबोर्ड", latestVideoPerformance: "नवीनतम वीडियो परफॉर्मेंस",
  channelAnalyticsOverview: "चैनल एनालिटिक्स", currentSubscribers: "मौजूदा सब्सक्राइबर्स",
  last28Days: "पिछले 28 दिन", last90Days: "पिछले 90 दिन", lifetime: "लाइफटाइम",
  watchTimeHours: "वॉच टाइम (घंटे)", estimatedRevenue: "अनुमानित कमाई",
  topVideos: "टॉप कंटेंट", latestComments: "हालिया कमेंट्स",
  creatorActions: "त्वरित क्रिएटर टूल्स", uploadVideoAction: "नया वीडियो अपलोड करें",
  createReelAction: "एक रील बनाएँ", viewChannelAction: "वॉचब्लूम पर चैनल देखें",
  channelContent: "चैनल का कंटेंट", contentAll: "सभी", contentVideos: "वीडियो", contentReels: "रील्स",
  tableVideo: "वीडियो", tableFormat: "फॉर्मेट", tableVisibility: "दृश्यता",
  tableDate: "तारीख", tableViews: "व्यूज", tableComments: "कमेंट्स",
  tableLikes: "लाइक्स", tableActions: "एक्शन", publishedStatus: "पब्लिक",
  paymentDetails: "पेमेंट डिटेल्स", paymentSummary: "समरी", balanceCard: "बैलेंस",
  minPaymentAmount: "न्यूनतम भुगतान राशि ₹8,000.00 है",
  balanceThresholdNote: "बैलेंस ₹8,000.00 होने पर आपकी अनुमानित कमाई भेजी जाएगी।",
  totalEarnings: "कुल कमाई",
  totalEarningsNote: "वॉचब्लूम पर अब तक की कुल अर्जित कमाई।",
  ytdEarnings: "इस वर्ष की कमाई (YTD)",
  ytdEarningsNote: "वर्तमान कैलेंडर वर्ष में अर्जित राजस्व।",
  paymentMethodActive: "डायरेक्ट बैंक ट्रांसफर (सक्रिय · खाता ••4821)",
  managePaymentMethod: "पेआउट विवरण प्रबंधित करें",
  monthlyBreakdown: "अनुमानित मासिक राजस्व विवरण",
  monetizedViews: "मोनेटाइज़्ड प्लेज़", cpmRate: "सीपीएम दर", rpmRate: "नेट आरपीएम",
  earningsAmount: "अनुमानित आय", payoutStatus: "भुगतान स्थिति",
  statusProcessing: "प्रोसेसिंग", statusPaid: "भुगतान हो गया",
  channelComments: "चैनल के कमेंट्स", commentsPublished: "प्रकाशित",
  commentsHeld: "समीक्षा के लिए रोके गए", replyAction: "जवाब दें",
  replyPlaceholder: "पब्लिक जवाब लिखें...", replySubmit: "जवाब दें", replyCancel: "रद्द करें",
  noCommentsFound: "आपके चैनल पर अभी कोई कमेंट नहीं है।",
  channelCustomisation: "चैनल कस्टमाइज़ेशन", channelName: "चैनल का नाम",
  channelHandle: "चैनल हैंडल", channelBio: "चैनल विवरण / बायो",
  channelBanner: "चैनल बैनर", channelAvatar: "प्रोफ़ाइल फ़ोटो",
  changeImage: "तस्वीर बदलें", saveStudioProfile: "बदलाव सेव करें",
  savedFeedback: "सहेज लिया गया!",
  studioProfileSaved: "चैनल कस्टमाइज़ेशन सफलतापूर्वक सेव हो गया!",
  studioProfileSavedSub: "आपका चैनल नाम, हैंडल और बायो सेव हो गए हैं और वॉचब्लूम पर दिख रहे हैं।",
  periodToday: "आज", periodWeek: "1 हफ़्ता", periodMonth: "1 महीना",
  periodYear: "1 साल", periodYears: "सभी वर्ष",
  realtimeTitle: "रियल-टाइम गतिविधि", updatingLive: "लाइव अपडेट हो रहा है",
  viewsLast48h: "व्यूज · पिछले 48 घंटे", viewsLast60m: "व्यूज · पिछले 60 मिनट",
  realtimeSubs: "रियल-टाइम सब्सक्राइबर्स", hourlyVelocity: "लाइव व्यूज गतिविधि (प्रति घंटा)",
  tableUploadDate: "अपलोड की तारीख", tableRealtimeViews: "रियल-टाइम व्यूज",
  goLiveStudio: "गो लाइव स्टूडियो", startBroadcast: "अभी लाइव जाएं", endBroadcast: "लाइव समाप्त करें",
  streamLive: "लाइव", streamEnded: "लाइव समाप्त हुआ", liveChat: "लाइव चैट", sendChat: "भेजें",
  saveLiveVod: "चैनल पर वीडियो के रूप में सेव करें", streamSummary: "स्ट्रीम सारांश", cameraPreview: "कैमरा पूर्वावलोकन",
  cameraPermissionNeeded: "लाइव प्रसारण के लिए कैमरा और माइक एक्सेस आवश्यक है।",
  allowCamera: "कैमरा चालू करें", virtualStudioMode: "वर्चुअल स्टूडियो मोड", streamTitle: "स्ट्रीम का शीर्षक",
  streamCategory: "श्रेणी", streamPrivacy: "दृश्यता", streamDesc: "स्ट्रीम का विवरण",
  streamSavedToast: "लाइव स्ट्रीम आपके चैनल के वीडियो में सेव हो गई!", micMutedToast: "माइक्रोफ़ोन म्यूट किया गया",
  micActiveToast: "माइक्रोफ़ोन चालू है", camMutedToast: "कैमरा बंद किया गया", camActiveToast: "कैमरा चालू है",
  yourVideos: "आपके वीडियो", contentLive: "लाइव", channelLive: "लाइव", channelCommunity: "कम्युनिटी",
  communityPosts: "कम्युनिटी पोस्ट", sharePost: "पोस्ट के रूप में शेयर करें", shareLivePostTitle: "लाइव स्ट्रीम को पोस्ट के रूप में शेयर करें",
  publishToCommunity: "कम्युनिटी में पोस्ट करें", livePostSuccessToast: "लाइव स्ट्रीम कम्युनिटी पोस्ट के रूप में शेयर हो गई!",
  channelLiveEmptyTitle: "अभी कोई लाइव स्ट्रीम नहीं है",
  channelLiveEmptyDesc: "Watchbloom Go Live Studio से अपने दर्शकों के साथ सीधे जुड़ें और रियल-टाइम प्रसारण करें।",
});
Object.assign(COPY, window.WATCHBLOOM_COPY || {});
const LANGUAGE_OPTIONS = window.WATCHBLOOM_LANGUAGES || [{ code: "en", name: "English", native: "English", locale: "en-IN" }];
let language = "en";
const languageSelect = $("language-select");
LANGUAGE_OPTIONS.forEach((entry) => {
  const option = document.createElement("option");
  option.value = entry.code;
  option.textContent = entry.native;
  option.lang = entry.locale;
  languageSelect.append(option);
});

function buildLanguageSelectMarkup(extraClass = "") {
  const options = LANGUAGE_OPTIONS.map((entry) =>
    '<option value="' + esc(entry.code) + '"' + (entry.code === language ? ' selected' : '') + ' lang="' + esc(entry.locale) + '">' + esc(entry.native) + '</option>'
  ).join("");
  return '<label class="language-picker ' + esc(extraClass) + '"><span class="sr-only">' + esc(tr("displayLanguage")) + '</span><select class="language-select ' + (extraClass ? extraClass + '-select' : '') + '" aria-label="' + esc(tr("displayLanguage")) + '">' + options + '</select></label>';
}
let activeView = "home";
let activeNavView = "home";
let homeShuffleSeed = 0;
let activeCategory = "all";
let activeLikedSubFilter = "all";
let currentVideoQuality = (() => {
  try {
    return localStorage.getItem("watchbloom_video_quality") || "auto";
  } catch (e) {
    return "auto";
  }
})();
let suggestionItems = [];
let activeSuggestion = -1;
let searchTimer = 0;
let nextOffset = 0;
let requestSeq = 0;
let suggestionSeq = 0;
let pendingReelId = null;
let pendingVideoId = null;
let pendingChannelAuthor = null;
let pendingChannelTab = "home";
let pendingPanelAction = null;
let isNavigatingHistory = false;
let isSwitchingDialog = false;
let windowNavStack = [];
let homeShortsRequest = 0;
let homeShortsCache = null;
let homeReelObserver = null;
let trendingRequest = 0;
let reelSoundEnabled = readJson("watchbloom-reel-sound", true) !== false;
const savedIds = new Set(readJson("watchbloom-saved", []));
const likedIds = new Set(readJson("watchbloom-liked", []));
const notInterestedIds = readStringSet("watchbloom-not-interested");
const hiddenCreatorKeys = readStringSet("watchbloom-hidden-creators");
const ambientReelIds = readStringSet("watchbloom-ambient-reels");
const savedReelPlaybackRates = readJson("watchbloom-reel-speeds", {});
const reelPlaybackRates = savedReelPlaybackRates && typeof savedReelPlaybackRates === "object" && !Array.isArray(savedReelPlaybackRates) ? savedReelPlaybackRates : {};
function readStringSet(key) {
  const value = readJson(key, []);
  return new Set(Array.isArray(value) ? value.filter((entry) => typeof entry === "string") : []);
}
function makeVisitorId() {
  const existing = readJson("watchbloom-visitor-id", "");
  if (typeof existing === "string" && /^[A-Za-z0-9_-]{16,64}$/.test(existing)) return existing;
  const created = globalThis.crypto?.randomUUID?.()
    || "wb_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2) + Math.random().toString(36).slice(2);
  writeJson("watchbloom-visitor-id", created);
  return created;
}
const visitorId = makeVisitorId();
const reactionSummaries = new Map();
const reactionLoads = new Set();
let reelObserver = null;
let activeReelVideo = null;
let playerCommentSort = "newest";
function loadLocalPlaylists() {
  const rows = readJson("watchbloom-user-playlists", []);
  return Array.isArray(rows) ? rows.filter((row) => row && typeof row.id === "string" && typeof row.title === "string" && Array.isArray(row.items)) : [];
}
let localPlaylists = loadLocalPlaylists();
function loadLocalProfile() {
  const value = readJson("watchbloom-local-profile", null);
  const isExplicitGuest = !value || value.isGuest === true;
  const hasCustomName = typeof value?.name === "string" && value.name.trim().length > 0 && value.name.trim() !== "Guest";
  const isGuest = isExplicitGuest || !hasCustomName;
  const defaultName = isGuest ? "Guest" : value.name.trim().slice(0, 40);
  const defaultBio = isGuest ? "" : (typeof value?.bio === "string" ? value.bio.slice(0, 200) : "");
  const defaultHandle = isGuest ? "@guest" : (typeof value?.handle === "string" && value.handle.trim() ? value.handle.slice(0, 40) : "@" + channelSlug(defaultName));
  return {
    isGuest: isGuest,
    id: isGuest ? "guest" : (value?.id || "user"),
    name: defaultName,
    email: isGuest ? "" : (value?.email || ""),
    mobile: isGuest ? "" : (value?.mobile || ""),
    handle: defaultHandle,
    bio: defaultBio,
    photo: isGuest ? "" : (typeof value?.photo === "string" ? value.photo : ""),
    banner: isGuest ? "" : (typeof value?.banner === "string" ? value.banner : ""),
    role: isGuest ? "viewer" : (value?.role || "viewer"),
  };
}
let localProfile = loadLocalProfile();
let pendingProfilePhoto = "";

function loadUploadedVideos() {
  const rows = readJson("watchbloom-uploaded-videos", []);
  const valid = Array.isArray(rows) ? rows.filter((r) => r && typeof r.id === "string" && typeof r.title === "string") : [];
  let storageNeedsUpdate = false;
  valid.forEach((item) => {
    if (item.type === "video" || item.isLiveVod || item.format === "live" || (typeof item.id === "string" && (item.id.startsWith("v_live_") || item.id.startsWith("v_up_")))) {
      if (!item.media_url || item.media_url.startsWith("blob:")) {
        item.media_url = "/api/media/" + encodeURIComponent(item.id);
        storageNeedsUpdate = true;
      }
      if (item.isLiveVod || item.format === "live" || item.id.startsWith("v_live_")) {
        if (item.media && item.media.includes("Generated Video")) {
          delete item.media;
          storageNeedsUpdate = true;
        }
      } else if (!item.media) {
        item.media = (item.format === "reel" || item.format === "short")
          ? "MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4"
          : "v1_1080p.mp4";
        storageNeedsUpdate = true;
      }
    }
  });

  if (storageNeedsUpdate) {
    try {
      writeJson("watchbloom-uploaded-videos", valid);
    } catch (_) {}
  }
  return valid;
}

function isItemOwnedByProfile(item, profile = localProfile) {
  if (!profile || profile.isGuest) return false;
  if (!item) return false;

  const profileId = String(profile.id || "").trim();
  const profileName = String(profile.name || "").trim().toLowerCase();
  const profileUsername = String(profile.username || profile.name || "").trim().toLowerCase();
  const profileSlug = channelSlug(profile.name || "");

  // 1. Direct user_id, author_id, or owner_id match
  const itemUid = String(item.userId || item.authorId || item.ownerId || "").trim();
  if (itemUid && profileId && itemUid === profileId) return true;

  // 2. Author match
  const itemAuthor = String(item.author || "").trim().toLowerCase();
  if (itemAuthor) {
    if (itemAuthor === profileName || itemAuthor === profileUsername) return true;
    if (channelSlug(itemAuthor) === profileSlug) return true;
  }

  // 3. Backward compatibility for Arun's initial seed uploads / live broadcasts
  if (profileName.includes("arun") || profileUsername.includes("arun")) {
    if (itemAuthor.includes("arun") || (item.title || "").toLowerCase().includes("arun")) {
      return true;
    }
  }

  return false;
}

function saveUploadedVideo(item) {
  if (!item || !item.id) return;
  const cleanItem = { ...item };
  if (!cleanItem.media_url || cleanItem.media_url.startsWith("blob:")) {
    cleanItem.media_url = "/api/media/" + encodeURIComponent(cleanItem.id);
  }
  if (!localProfile.isGuest) {
    cleanItem.userId = cleanItem.userId || localProfile.id;
    cleanItem.authorId = cleanItem.authorId || localProfile.id;
    cleanItem.author = cleanItem.author || localProfile.name || "Watchbloom Creator";
    cleanItem.ownerHandle = cleanItem.ownerHandle || localProfile.handle;
  }
  const videos = loadUploadedVideos().filter((v) => v.id !== cleanItem.id);
  videos.unshift(cleanItem);
  writeJson("watchbloom-uploaded-videos", videos);

  // Per-user isolated uploads store
  if (!localProfile.isGuest && localProfile.id) {
    const userVideosKey = "watchbloom-uploaded-videos-" + localProfile.id;
    const userVideos = readJson(userVideosKey, []).filter((v) => v && v.id !== cleanItem.id);
    userVideos.unshift(cleanItem);
    writeJson(userVideosKey, userVideos);
  }
}

async function deleteUploadedVideo(id) {
  if (!id) return;
  const videos = loadUploadedVideos().filter((v) => v.id !== id);
  writeJson("watchbloom-uploaded-videos", videos);

  if (!localProfile.isGuest && localProfile.id) {
    const userVideosKey = "watchbloom-uploaded-videos-" + localProfile.id;
    const userVideos = readJson(userVideosKey, []).filter((v) => v && v.id !== id);
    writeJson(userVideosKey, userVideos);
  }

  const deletedIds = new Set(readJson("watchbloom-deleted-video-ids", []));
  deletedIds.add(id);
  writeJson("watchbloom-deleted-video-ids", Array.from(deletedIds));

  visibleItems.delete(id);
  if (Array.isArray(studioCachedVideos)) {
    studioCachedVideos = studioCachedVideos.filter((v) => v.id !== id);
  }
  creatorChannelCache.clear();

  try {
    await fetch("/api/v1/studio/videos/" + encodeURIComponent(id), { method: "DELETE" });
  } catch (_) {}
  creatorChannelCache.clear();

  try {
    await fetch("/api/v1/videos/" + encodeURIComponent(id), {
      method: "DELETE"
    });
  } catch (err) {
    console.warn("Could not delete video on backend:", err);
  }
}

function loadPersistentViews() {
  return readJson("watchbloom-item-views", {});
}

function loadViewEvents() {
  return readJson("watchbloom-view-events", []);
}

function getItemViews(item) {
  if (!item || !item.id) return 0;
  const store = loadPersistentViews();
  if (typeof store[item.id] === "number") {
    return Math.max(Number(item.views) || 0, store[item.id]);
  }
  return Number(item.views) || 0;
}

const recentViewRecordTime = new Map();

function recordVideoView(id) {
  if (!id) return;
  const now = Date.now();
  const lastTime = recentViewRecordTime.get(id) || 0;
  if (now - lastTime < 2500) return;
  recentViewRecordTime.set(id, now);

  const store = loadPersistentViews();
  const baseViews = Number(visibleItems.get(id)?.views) || 1;
  const current = typeof store[id] === "number" ? store[id] : baseViews;
  const updated = current + 1;
  store[id] = updated;
  writeJson("watchbloom-item-views", store);

  const events = loadViewEvents();
  events.push({ id, timestamp: now });
  if (events.length > 2000) events.splice(0, events.length - 2000);
  writeJson("watchbloom-view-events", events);

  const item = visibleItems.get(id);
  if (item) item.views = updated;

  const uploaded = loadUploadedVideos();
  const upIndex = uploaded.findIndex((v) => v.id === id);
  if (upIndex !== -1) {
    uploaded[upIndex].views = updated;
    writeJson("watchbloom-uploaded-videos", uploaded);
  }

  updateViewsOnScreen(id, updated);
}

function updateViewsOnScreen(id, updated) {
  const formattedCompact = views(updated) + " " + tr("plays");
  const formattedFull = Number(updated).toLocaleString();

  document.querySelectorAll('[data-item-views="' + id + '"]').forEach((el) => {
    el.textContent = formattedCompact;
  });

  document.querySelectorAll('[data-item-views-num="' + id + '"]').forEach((el) => {
    el.textContent = formattedFull;
    el.classList.add("view-bump");
    setTimeout(() => el.classList.remove("view-bump"), 600);
  });

  const rt48 = $("rt-views-48h");
  if (rt48) {
    const cur48 = parseInt(rt48.textContent.replace(/\D/g, "")) || 0;
    rt48.textContent = (cur48 + 1).toLocaleString();
    rt48.classList.add("view-bump");
    setTimeout(() => rt48.classList.remove("view-bump"), 600);
  }
  const rt60 = $("rt-views-60m");
  if (rt60) {
    const cur60 = parseInt(rt60.textContent.replace(/\D/g, "")) || 0;
    rt60.textContent = (cur60 + 1).toLocaleString();
    rt60.classList.add("view-bump");
    setTimeout(() => rt60.classList.remove("view-bump"), 600);
  }
}

function formatUploadDate(value, full = false) {
  if (!value) return full ? "Today" : tr("today") || "Today";
  try {
    let d;
    if (typeof value === "string") {
      if (value.includes("T")) d = new Date(value);
      else if (/^\d{4}-\d{2}-\d{2}$/.test(value)) d = new Date(value + "T00:00:00");
      else d = new Date(value);
    } else if (value instanceof Date) {
      d = value;
    } else {
      d = new Date();
    }
    if (isNaN(d.getTime())) return full ? "Today" : tr("today") || "Today";

    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
    if (diffDays <= 0 && !full) return tr("today") || "Today";
    if (diffDays === 1 && !full) return "1 day ago";
    if (diffDays > 1 && diffDays < 7 && !full) return diffDays + " days ago";

    const locale = LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || "en-IN";
    return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(d);
  } catch (e) {
    return "Today";
  }
}


function isMyChannel(author) {
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    return false;
  }
  if (!author) return false;
  const target = String(author).replace(/^@/, "").trim().toLowerCase();
  if (target === "guest") return false;
  if (target === "my-channel" || target === "me") return true;
  const myName = (localProfile.name || "").trim().toLowerCase();
  const myUsername = (localProfile.username || "").trim().toLowerCase();
  const myHandle = (localProfile.handle || "").replace(/^@/, "").trim().toLowerCase();
  if (!myName && !myUsername) return false;
  return (myName && (myName === target || channelSlug(myName) === channelSlug(target))) ||
         (myUsername && (myUsername === target || channelSlug(myUsername) === channelSlug(target))) ||
         (myHandle && channelSlug(myHandle) === channelSlug(target));
}

function openMyChannel(tab = "home") {
  const isGuest = !localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest";
  if (isGuest) {
    restorePopoversFromDialog();
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    showFollowToast(tr("yourChannelAuthRequired") || "Your channel requires a registered account. Please sign in to view and manage your channel.");
    openAuthModal("signin");
    return;
  }
  const author = localProfile.name || localProfile.username || "Watchbloom Creator";
  openCreatorChannel(author, tab);
}

function processBannerImage(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/") || file.size > 10 * 1024 * 1024) { reject(new Error("image")); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 1440 / Math.max(image.naturalWidth, 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      try { resolve(canvas.toDataURL("image/jpeg", 0.88)); } catch (error) { reject(error); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    image.src = url;
  });
}
const followedCreators = readStringSet("watchbloom-following");
const alertCreators = readStringSet("watchbloom-alerts");
const ALERT_MODES = ["relevant", "all", "none"];
const storedAlertModes = readJson("watchbloom-alert-modes", {});
const alertModes = storedAlertModes && typeof storedAlertModes === "object" && !Array.isArray(storedAlertModes)
  ? { ...storedAlertModes }
  : {};
const visibleItems = new Map();
const creatorCatalog = new Map();
const creatorChannelCache = new Map();
const creatorChannelRequests = new Map();
const artNames = {
  saffron: "art-saffron", aqua: "art-aqua", violet: "art-violet", coral: "art-coral",
  mint: "art-mint", plum: "art-plum", blue: "art-blue", night: "art-night",
};

function tr(key) {
  const extra = window.WATCHBLOOM_COPY?.[language]?.[key];
  if (extra !== undefined && extra !== null && extra !== "") return extra;
  return COPY[language]?.[key] ?? (language === "hi-IN" ? COPY.hi?.[key] : null) ?? COPY.en?.[key] ?? key;
}

function readJson(key, fallback) {
  try {
    let raw = localStorage.getItem(key);
    if (raw == null && key.startsWith("watchbloom-")) {
      raw = localStorage.getItem(key.replace("watchbloom-", "cove-"));
    }
    return raw == null ? fallback : JSON.parse(raw);
  } catch (error) {
    return fallback;
  }
}

function writeJson(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); } catch (error) { /* storage may be disabled */ }
}

function loadWatchHistory() {
  const rows = readJson("watchbloom-history", []);
  return Array.isArray(rows)
    ? rows.filter((row) => row && row.item && typeof row.item.id === "string" && row.item.title).slice(0, 100)
    : [];
}

function rememberViewed(item) {
  if (!item || typeof item.id !== "string") return;
  recordVideoView(item.id);
  let snapshot;
  try { snapshot = JSON.parse(JSON.stringify(item)); } catch (error) { return; }
  const rows = loadWatchHistory().filter((row) => row.item.id !== item.id);
  rows.unshift({ item: snapshot, viewedAt: new Date().toISOString() });
  writeJson("watchbloom-history", rows.slice(0, 100));

  // Sync to authenticated user's private watch history in database
  if (typeof localProfile !== "undefined" && localProfile && !localProfile.isGuest) {
    fetch("/api/v1/user/history", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ item_id: item.id })
    }).catch(() => {});
  }
}

function removeWatchHistoryItem(itemId) {
  if (!itemId) return;
  const rows = loadWatchHistory().filter((row) => row.item.id !== itemId);
  writeJson("watchbloom-history", rows);

  // Sync deletion to authenticated user's database history
  if (typeof localProfile !== "undefined" && localProfile && !localProfile.isGuest) {
    fetch("/api/v1/user/history/" + encodeURIComponent(itemId), {
      method: "DELETE"
    }).catch(() => {});
  }
}

function clearAllWatchHistory() {
  writeJson("watchbloom-history", []);

  // Sync full clear to authenticated user's database history
  if (typeof localProfile !== "undefined" && localProfile && !localProfile.isGuest) {
    fetch("/api/v1/user/history", {
      method: "DELETE"
    }).catch(() => {});
  }
}

function esc(value) {
  return String(value == null ? "" : value).replace(/[&<>"']/g, (character) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[character]);
}

function norm(value) {
  return String(value || "").toLowerCase().normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9\s]/g, " ");
}

function toks(value) { return norm(value).split(/\s+/).filter(Boolean); }

function hl(text, query) {
  let html = esc(text);
  toks(query).forEach((token) => {
    const safe = token.replace(/[^a-z0-9]/g, "");
    if (safe) html = html.replace(new RegExp("\\b(" + safe + "[a-z0-9]*)", "ig"), "<mark>$1</mark>");
  });
  return html;
}

function views(number) {
  const locale = LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || "en-IN";
  return new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(number || 0);
}

function duration(item) {
  if (item.format === "short" || item.format === "reel") {
    const seconds = Number(item.duration_seconds);
    if (Number.isFinite(seconds) && seconds >= 0) return Math.floor(seconds / 60) + ":" + String(Math.floor(seconds % 60)).padStart(2, "0");
  }
  if (item.type === "video") return item.mins + " " + tr("mins");
  const count = item.localPlaylist && Array.isArray(item.items) ? item.items.length : (Array.isArray(item.playlist_items) ? item.playlist_items.length : (item.items || []).length);
  return tr("playlistVideos").replace("{count}", count);
}

function playerTime(seconds) {
  const value = Number.isFinite(seconds) && seconds > 0 ? Math.floor(seconds) : 0;
  const hours = Math.floor(value / 3600);
  const minutes = Math.floor((value % 3600) / 60);
  const remainder = value % 60;
  return hours
    ? hours + ":" + String(minutes).padStart(2, "0") + ":" + String(remainder).padStart(2, "0")
    : minutes + ":" + String(remainder).padStart(2, "0");
}

function syncPlayerControls(video) {
  const shell = video?.closest(".video-shell");
  if (!shell) return;
  const playButton = shell.querySelector("[data-player-action=toggle-play]");
  const playIcon = shell.querySelector("[data-player-play-icon]");
  const time = shell.querySelector("[data-video-time]");
  const seek = shell.querySelector("[data-video-seek]");
  const volume = shell.querySelector("[data-video-volume]");
  const volumeIcon = shell.querySelector("[data-video-volume-icon]");
  const fsBtn = shell.querySelector("[data-player-action=toggle-fullscreen]");
  const knownDur = Number(video.dataset.knownDuration) || 0;
  const total = Number.isFinite(video.duration) && video.duration > 0 ? video.duration : knownDur;
  if (playButton) playButton.setAttribute("aria-label", video.paused ? "Play video" : "Pause video");
  if (playIcon) playIcon.textContent = video.paused ? "▶" : "Ⅱ";
  if (time) time.textContent = playerTime(video.currentTime) + " / " + playerTime(total);
  if (seek) {
    const progress = total > 0 ? Math.round((video.currentTime / total) * 1000) : 0;
    seek.value = String(progress);
    seek.style.setProperty("--progress", (progress / 10) + "%");
  }
  if (volume) volume.value = String(video.muted ? 0 : video.volume);
  if (volumeIcon) volumeIcon.innerHTML = reelSoundIcon(video.muted || video.volume === 0);
  if (fsBtn) {
    const isFs = document.fullscreenElement === shell || shell.classList.contains("is-fullscreen");
    fsBtn.setAttribute("aria-label", isFs ? (tr("exitFullscreen") || "Exit fullscreen") : (tr("fullscreen") || "Fullscreen"));
    fsBtn.setAttribute("title", isFs ? (tr("exitFullscreen") || "Exit fullscreen") : (tr("fullscreen") || "Fullscreen"));
    fsBtn.innerHTML = isFs
      ? '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/></svg>'
      : '⛶';
  }
  shell.classList.toggle("is-playing", !video.paused);
}

function isEditableTarget(el) {
  if (!el) return false;
  const tag = el.tagName;
  if (tag === "TEXTAREA" || tag === "SELECT") return true;
  if (el.isContentEditable) return true;
  if (tag === "INPUT") {
    const type = (el.type || "").toLowerCase();
    if (type === "range" || type === "button" || type === "submit" || type === "reset" || type === "checkbox" || type === "radio") {
      return false;
    }
    return true;
  }
  if (el.closest("textarea, select, [contenteditable='true'], input:not([type='range']):not([type='button']):not([type='submit']):not([type='reset']):not([type='checkbox']):not([type='radio'])")) {
    return true;
  }
  return false;
}

const VIDEO_HUD_ICONS = {
  play: '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24"><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>',
  mute: '<svg viewBox="0 0 24 24"><path d="M16.5 12c0-1.77-1.02-3.29-2.5-4.03v2.21l2.45 2.45c.03-.2.05-.41.05-.63zm2.5 0c0 .94-.2 1.82-.54 2.64l1.51 1.51C20.63 14.91 21 13.5 21 12c0-4.28-2.99-7.86-7-8.77v2.06c2.89.86 5 3.54 5 6.71zM4.27 3L3 4.27 7.73 9H3v6h4l5 5v-6.73l4.25 4.25c-.67.52-1.42.93-2.25 1.18v2.06c1.38-.31 2.63-.95 3.69-1.81L19.73 21 21 19.73l-9-9L4.27 3zM12 4L9.91 6.09 12 8.18V4z"/></svg>',
  unmute: '<svg viewBox="0 0 24 24"><path d="M3 9v6h4l5 5V4L7 9H3zm13.5 3c0-1.77-1.02-3.29-2.5-4.03v8.05c1.48-.73 2.5-2.25 2.5-4.02zM14 3.23v2.06c2.89.86 5 3.54 5 6.71s-2.11 5.85-5 6.71v2.06c4.01-.91 7-4.49 7-8.77s-2.99-7.86-7-8.77z"/></svg>'
};

function flashVideoHUD(container, iconHtml) {
  if (!container) return;
  let hud = container.querySelector(".video-action-hud");
  if (!hud) {
    hud = document.createElement("div");
    hud.className = "video-action-hud";
    hud.setAttribute("aria-hidden", "true");
    container.appendChild(hud);
  }
  hud.innerHTML = iconHtml;
  hud.classList.remove("is-visible");
  void hud.offsetWidth;
  hud.classList.add("is-visible");
  clearTimeout(container._hudTimer);
  container._hudTimer = setTimeout(() => {
    hud.classList.remove("is-visible");
  }, 650);
}

function toggleActiveVideoPlayback() {
  const detail = $("detail-dialog");
  if (detail?.open) {
    const video = $("dialog-content")?.querySelector("video");
    if (video) {
      const shell = video.closest(".video-shell");
      if (shell) shell.classList.remove("video-idle");
      if (video.paused) {
        video.play().catch(() => {});
        if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.play);
      } else {
        video.pause();
        if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.pause);
      }
      return true;
    }
  }

  const reelsDlg = $("reels-dialog");
  if (reelsDlg?.open) {
    let video = activeReelVideo && reelsDlg.contains(activeReelVideo) ? activeReelVideo : null;
    let slide = video?.closest("[data-reel-slide]");
    if (!video) {
      const slides = Array.from(reelsDlg.querySelectorAll("[data-reel-slide]"));
      if (slides.length) {
        const rect = reelsDlg.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        slide = slides.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return Math.abs(ra.top + ra.height / 2 - center) - Math.abs(rb.top + rb.height / 2 - center);
        })[0];
        video = slide?.querySelector("[data-reel-video]");
      }
    }
    if (video) {
      const frame = slide?.querySelector(".reel-frame");
      if (video.paused) {
        activeReelVideo = video;
        playReelVideo(video);
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.play);
      } else {
        video.pause();
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.pause);
      }
      return true;
    }
  }

  if (activeView === "reels") {
    let video = activeReelVideo && document.body.contains(activeReelVideo) ? activeReelVideo : null;
    let slide = video?.closest("[data-reel-slide]");
    if (!video) {
      const slides = Array.from(document.querySelectorAll(".reel-feed [data-reel-slide]"));
      if (slides.length) {
        const center = window.innerHeight / 2;
        slide = slides.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return Math.abs(ra.top + ra.height / 2 - center) - Math.abs(rb.top + rb.height / 2 - center);
        })[0];
        video = slide?.querySelector("[data-reel-video]");
      }
    }
    if (video) {
      const frame = slide?.querySelector(".reel-frame");
      if (video.paused) {
        activeReelVideo = video;
        playReelVideo(video);
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.play);
      } else {
        video.pause();
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.pause);
      }
      return true;
    }
  }

  if (activeReelVideo && document.body.contains(activeReelVideo)) {
    const slide = activeReelVideo.closest("[data-reel-slide]");
    const frame = slide?.querySelector(".reel-frame");
    if (activeReelVideo.paused) {
      playReelVideo(activeReelVideo);
      if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.play);
    } else {
      activeReelVideo.pause();
      if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.pause);
    }
    return true;
  }

  const playing = Array.from(document.querySelectorAll("video")).find((v) => !v.paused && !v.ended);
  if (playing) {
    playing.pause();
    const shell = playing.closest(".video-shell") || playing.closest(".reel-frame");
    if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.pause);
    return true;
  }

  return false;
}

function toggleActiveVideoMute() {
  const detail = $("detail-dialog");
  if (detail?.open) {
    const video = $("dialog-content")?.querySelector("video");
    if (video) {
      const shell = video.closest(".video-shell");
      if (shell) shell.classList.remove("video-idle");
      if (video.muted) {
        video.muted = false;
        if (video.volume === 0) video.volume = 1;
        if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.unmute);
      } else {
        video.muted = true;
        if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.mute);
      }
      syncPlayerControls(video);
      return true;
    }
  }

  const reelsDlg = $("reels-dialog");
  if (reelsDlg?.open) {
    let video = activeReelVideo && reelsDlg.contains(activeReelVideo) ? activeReelVideo : null;
    let slide = video?.closest("[data-reel-slide]");
    if (!video) {
      const slides = Array.from(reelsDlg.querySelectorAll("[data-reel-slide]"));
      if (slides.length) {
        const rect = reelsDlg.getBoundingClientRect();
        const center = rect.top + rect.height / 2;
        slide = slides.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return Math.abs(ra.top + ra.height / 2 - center) - Math.abs(rb.top + rb.height / 2 - center);
        })[0];
        video = slide?.querySelector("[data-reel-video]");
      }
    }
    if (video) {
      const frame = slide?.querySelector(".reel-frame");
      if (video.muted) {
        video.muted = false;
        if (video.volume === 0) video.volume = 1;
        reelSoundEnabled = true;
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.unmute);
      } else {
        video.muted = true;
        reelSoundEnabled = false;
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.mute);
      }
      writeJson("watchbloom-reel-sound", reelSoundEnabled);
      if (slide) syncReelSoundUI(slide);
      return true;
    }
  }

  if (activeView === "reels") {
    let video = activeReelVideo && document.body.contains(activeReelVideo) ? activeReelVideo : null;
    let slide = video?.closest("[data-reel-slide]");
    if (!video) {
      const slides = Array.from(document.querySelectorAll(".reel-feed [data-reel-slide]"));
      if (slides.length) {
        const center = window.innerHeight / 2;
        slide = slides.sort((a, b) => {
          const ra = a.getBoundingClientRect();
          const rb = b.getBoundingClientRect();
          return Math.abs(ra.top + ra.height / 2 - center) - Math.abs(rb.top + rb.height / 2 - center);
        })[0];
        video = slide?.querySelector("[data-reel-video]");
      }
    }
    if (video) {
      const frame = slide?.querySelector(".reel-frame");
      if (video.muted) {
        video.muted = false;
        if (video.volume === 0) video.volume = 1;
        reelSoundEnabled = true;
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.unmute);
      } else {
        video.muted = true;
        reelSoundEnabled = false;
        if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.mute);
      }
      writeJson("watchbloom-reel-sound", reelSoundEnabled);
      if (slide) syncReelSoundUI(slide);
      return true;
    }
  }

  if (activeReelVideo && document.body.contains(activeReelVideo)) {
    const slide = activeReelVideo.closest("[data-reel-slide]");
    const frame = slide?.querySelector(".reel-frame");
    if (activeReelVideo.muted) {
      activeReelVideo.muted = false;
      if (activeReelVideo.volume === 0) activeReelVideo.volume = 1;
      reelSoundEnabled = true;
      if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.unmute);
    } else {
      activeReelVideo.muted = true;
      reelSoundEnabled = false;
      if (frame) flashVideoHUD(frame, VIDEO_HUD_ICONS.mute);
    }
    writeJson("watchbloom-reel-sound", reelSoundEnabled);
    if (slide) syncReelSoundUI(slide);
    return true;
  }

  const anyVideo = Array.from(document.querySelectorAll("video")).find((v) => !v.paused && !v.ended) || document.querySelector("video");
  if (anyVideo) {
    const shell = anyVideo.closest(".video-shell") || anyVideo.closest(".reel-frame");
    if (anyVideo.muted) {
      anyVideo.muted = false;
      if (anyVideo.volume === 0) anyVideo.volume = 1;
      if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.unmute);
    } else {
      anyVideo.muted = true;
      if (shell) flashVideoHUD(shell, VIDEO_HUD_ICONS.mute);
    }
    if (shell) {
      shell.classList.remove("video-idle");
      syncPlayerControls(anyVideo);
    }
    const slide = anyVideo.closest("[data-reel-slide]");
    if (slide) {
      reelSoundEnabled = !anyVideo.muted;
      writeJson("watchbloom-reel-sound", reelSoundEnabled);
      syncReelSoundUI(slide);
    }
    return true;
  }

  return false;
}

function toggleVideoFullscreen(targetShell) {
  if (document.fullscreenElement) {
    document.exitFullscreen?.().catch(() => {});
    return;
  }
  const shell = targetShell || $("detail-dialog")?.querySelector(".video-shell") || document.querySelector(".video-shell");
  if (shell && $("detail-dialog")?.open) {
    shell.requestFullscreen?.().catch(() => {
      const message = $("player-message");
      if (message) { message.textContent = tr("fullscreenUnavailable"); message.hidden = false; }
    });
    return;
  }
  if ($("reels-dialog")?.open) {
    const activeSlide = $("reels-track")?.querySelector(".reel-slide.active") || $("reels-dialog")?.querySelector(".reel-slide");
    const frame = activeSlide?.querySelector(".reel-frame");
    frame?.requestFullscreen?.().catch(() => {});
    return;
  }
  if (shell) {
    shell.requestFullscreen?.().catch(() => {});
  }
}

function setupVideoActivityController(shell, video) {
  if (!shell || !video || shell._activityControllerAttached) return;
  shell._activityControllerAttached = true;
  let idleTimer = null;

  function wakeUp() {
    shell.classList.remove("video-idle");
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
    const menuOpen = shell.querySelector("#video-settings-menu:not([hidden]), #video-quality-menu:not([hidden])");
    const isFs = document.fullscreenElement === shell || shell.classList.contains("is-fullscreen");
    if (!menuOpen) {
      if (isFs || (!video.paused && !video.ended)) {
        idleTimer = setTimeout(() => {
          const stillOpen = shell.querySelector("#video-settings-menu:not([hidden]), #video-quality-menu:not([hidden])");
          if (!stillOpen) {
            shell.classList.add("video-idle");
          }
        }, 3000);
      }
    }
  }

  const events = ["mousemove", "mouseenter", "mousedown", "touchstart", "touchmove", "pointermove", "focusin"];
  events.forEach((evt) => shell.addEventListener(evt, wakeUp, { passive: true }));

  const onDocMouseMove = () => {
    if (document.fullscreenElement === shell || shell.classList.contains("is-fullscreen")) {
      wakeUp();
    }
  };
  document.addEventListener("mousemove", onDocMouseMove, { passive: true });

  video.addEventListener("play", wakeUp);
  video.addEventListener("pause", () => {
    shell.classList.remove("video-idle");
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  });
  video.addEventListener("ended", () => {
    shell.classList.remove("video-idle");
    if (idleTimer) {
      clearTimeout(idleTimer);
      idleTimer = null;
    }
  });

  const onFsChange = () => {
    const isFs = document.fullscreenElement === shell;
    shell.classList.toggle("is-fullscreen", isFs);
    syncPlayerControls(video);
    wakeUp();
  };
  document.addEventListener("fullscreenchange", onFsChange);
  document.addEventListener("webkitfullscreenchange", onFsChange);

  wakeUp();
}

function dateLabel(value) {
  const locale = LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || "en-IN";
  return new Intl.DateTimeFormat(locale, { day: "numeric", month: "short", year: "numeric" }).format(new Date(value + "T00:00:00"));
}

function initials(value) {
  return String(value || "W").split(/\s+/).map((word) => word[0] || "").join("").slice(0, 2).toUpperCase();
}

function art(item) { return artNames[item.art] || "art-blue"; }
function categoryLabel(category) { return tr("cat_" + (CATEGORY_KEYS.includes(category) ? category : "learning")); }
function creatorKey(author) { return norm(author).trim().replace(/\s+/g, " "); }

function creatorIdentity(author, extraClass = "") {
  const safeName = String(author || "Creator");
  return '<button type="button" class="creator-link ' + esc(extraClass) + '" data-open-channel="' + esc(safeName) + '" aria-label="Open creator channel: ' + esc(safeName) + '"><span class="creator-dot" aria-hidden="true">' + esc(initials(safeName)) + '</span><span class="creator-name">' + esc(safeName) + '</span></button>';
}

function creatorControls(author) {
  const key = creatorKey(author);
  const isFollowing = followedCreators.has(key);
  const alertMode = getCreatorAlertMode(key);
  const modeLabel = tr("alertMode_" + alertMode);
  const buttonTitle = tr("alertsButtonTitle").replace("{mode}", modeLabel);
  const buttonLabel = tr("alertsButtonLabel").replace("{creator}", author).replace("{mode}", modeLabel);
  const menuLabel = tr("alertsMenuLabel").replace("{creator}", author);
  const followLabel = isFollowing ? tr("unfollowCreator") : tr("follow");
  const follow = '<button type="button" class="creator-action follow-action" data-follow="' + esc(key) + '" data-author="' + esc(author) + '" aria-label="' + esc(followLabel + " " + author) + '">' + esc(followLabel) + '</button>';
  const bell = isFollowing
    ? '<span class="bell-control"><button type="button" class="creator-action bell-action" data-alert-menu="' + esc(key) + '" data-author="' + esc(author) + '" data-mode="' + alertMode + '" aria-label="' + esc(buttonLabel) + '" title="' + esc(buttonTitle) + '" aria-expanded="false"><svg viewBox="0 0 24 24" fill="' + (alertMode === "all" ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/><path class="bell-slash" d="m4 4 16 16"/></svg></button><span class="bell-menu" data-bell-menu="' + esc(key) + '" role="radiogroup" aria-label="' + esc(menuLabel) + '" hidden>' + ALERT_MODES.map((mode) => '<button type="button" class="bell-menu-option" role="radio" data-alert-mode="' + mode + '" data-alert-key="' + esc(key) + '" data-author="' + esc(author) + '" aria-checked="' + (alertMode === mode) + '"><span class="bell-menu-check" aria-hidden="true">✓</span><span>' + esc(tr("alertMode_" + mode)) + '</span></button>').join("") + '</span></span>'
    : "";

  return '<span class="creator-actions">' + follow + bell + '</span>';
}

function bindCreatorControls(root) {
  root.querySelectorAll(".creator-actions").forEach((actions) => {
    if (actions.dataset.controlsBound === "true") return;
    actions.dataset.controlsBound = "true";
    actions.addEventListener("click", (event) => {
      const follow = event.target.closest("[data-follow]");
      if (follow && actions.contains(follow)) {
        event.preventDefault();
        event.stopPropagation();
        toggleCreatorFollow(follow.dataset.follow, follow.dataset.author);
        return;
      }
      if (handleCreatorControlClick(event)) {
        event.preventDefault();
        event.stopPropagation();
      }
    });
  });
}

function getCreatorAlertMode(key) {
  const savedMode = alertModes[key];
  if (ALERT_MODES.includes(savedMode)) return savedMode;
  // Keep people’s earlier on/off choice when upgrading to the three-option menu.
  return alertCreators.has(key) ? "relevant" : "none";
}

function empty(title, body, icon) {
  return '<div class="empty-state"><span class="empty-icon" aria-hidden="true">' + icon + '</span><div><strong>' + esc(title) + '</strong><p>' + esc(body) + '</p></div></div>';
}

function card(item, query) {
  if (item.type === "video" && (!item.media_url || item.media_url.startsWith("blob:"))) {
    item.media_url = "/api/media/" + encodeURIComponent(item.id);
  }
  const saved = savedIds.has(item.id);
  const isShort = item.format === "short" || item.format === "reel";
  const kind = isShort ? tr("shortFormat") : item.type === "video" ? tr("originalVideo") : tr("playlist");
  const play = (item.media_url || item.type === "video") ? '<span class="cover-play" aria-hidden="true">▶</span>' : "";
  const itemViews = getItemViews(item);
  const uploadDate = formatUploadDate(item.date);
  return '<article class="media-card"><button class="cover-button" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc(item.title) + '"><div class="cover ' + art(item) + '"><span class="cover-type">' + esc(kind) + '</span><span class="cover-word">' + esc(categoryLabel(item.category)) + '</span><span class="cover-duration">' + esc(duration(item)) + '</span>' + play + '</div></button><div class="card-copy"><div><button class="card-title" type="button" data-open="' + esc(item.id) + '">' + hl(item.title, query) + '</button><p class="card-meta"><span data-item-views="' + esc(item.id) + '">' + esc(views(itemViews)) + ' ' + esc(tr("plays")) + '</span> · <span>' + esc(uploadDate) + '</span> · <span>' + esc(categoryLabel(item.category)) + '</span></p><div class="card-author">' + creatorIdentity(item.author) + '</div></div><button class="save-button" type="button" data-save="' + esc(item.id) + '" aria-label="' + esc(saved ? tr("removeSaved") : tr("saveItem")) + '" aria-pressed="' + saved + '"><svg viewBox="0 0 24 24" fill="' + (saved ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.7L6 21V4.5Z"/></svg></button></div></article>';
}

function followedCreatorCard(channel) {
  const author = String(channel.name || "Creator");
  const stats = Number(channel.video_count || 0) + " videos · " + Number(channel.playlist_count || 0) + " playlists";
  const topics = Array.isArray(channel.categories) ? channel.categories.slice(0, 3).map(categoryLabel).join(" · ") : "";
  return '<article class="creator-card"><div class="creator-card-banner"><span>WATCHBLOOM CREATOR</span></div><div class="creator-card-body">' + creatorIdentity(author, "creator-card-identity") + '<p class="creator-card-stats">' + esc(stats) + '</p>' + (topics ? '<p class="creator-card-topics">' + esc(topics) + '</p>' : '') + '<div class="creator-card-controls">' + creatorControls(author) + '</div></div></article>';
}

function shortShelfCard(item) {
  const itemId = esc(item.id);
  const play = item.media_url ? '<span class="cover-play" aria-hidden="true">▶</span>' : "";
  const itemViews = getItemViews(item);
  const uploadDate = formatUploadDate(item.date);
  return '<article class="shorts-shelf-card"><button class="cover-button" type="button" data-play-reel="' + itemId + '" aria-label="' + esc(tr("playReelSuggestion")).replace(/"/g, "&quot;") + ': ' + esc(item.title).replace(/"/g, "&quot;") + '"><div class="cover ' + art(item) + '"><span class="cover-type">' + esc(tr("shortFormat")) + '</span><span class="cover-word">' + esc(categoryLabel(item.category)) + '</span><span class="cover-duration">' + esc(duration(item)) + '</span>' + play + '</div></button><div class="shorts-shelf-copy"><button class="card-title shorts-shelf-title" type="button" data-play-reel="' + itemId + '">' + esc(item.title) + '</button><p class="shorts-shelf-meta">' + esc(item.author) + ' · <span data-item-views="' + itemId + '">' + esc(views(itemViews)) + ' ' + esc(tr("plays")) + '</span> · ' + esc(uploadDate) + '</p></div></article>';
}

function likedReelCard(item) {
  const saved = savedIds.has(item.id);
  const play = item.media_url ? '<span class="cover-play" aria-hidden="true">▶</span>' : "";
  const itemViews = getItemViews(item);
  const uploadDate = formatUploadDate(item.date);
  return '<article class="liked-reel-card">' +
    '<button class="cover-button liked-reel-cover-btn" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc(item.title) + '">' +
      '<div class="cover liked-reel-cover ' + art(item) + '">' +
        '<span class="cover-type liked-reel-badge">⚡ ' + esc(tr("shortFormat")) + '</span>' +
        '<span class="cover-word liked-reel-word">' + esc(categoryLabel(item.category)) + '</span>' +
        '<span class="cover-duration liked-reel-duration">' + esc(duration(item)) + '</span>' +
        play +
      '</div>' +
    '</button>' +
    '<div class="liked-reel-copy">' +
      '<div class="liked-reel-info">' +
        '<button class="card-title liked-reel-title" type="button" data-open="' + esc(item.id) + '">' + esc(item.title) + '</button>' +
        '<p class="card-meta liked-reel-meta"><span data-item-views="' + esc(item.id) + '">' + esc(views(itemViews)) + ' ' + esc(tr("plays")) + '</span> · <span>' + esc(uploadDate) + '</span> · <span>' + esc(categoryLabel(item.category)) + '</span></p>' +
        '<div class="card-author liked-reel-author">' + creatorIdentity(item.author) + '</div>' +
      '</div>' +
      '<button class="save-button liked-reel-save" type="button" data-save="' + esc(item.id) + '" aria-label="' + esc(saved ? tr("removeSaved") : tr("saveItem")) + '" aria-pressed="' + saved + '">' +
        '<svg viewBox="0 0 24 24" fill="' + (saved ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.7L6 21V4.5Z"/></svg>' +
      '</button>' +
    '</div>' +
  '</article>';
}

function renderLikedView(items, query) {
  const isAll = activeLikedSubFilter === "all";
  const isVideosOnly = activeLikedSubFilter === "videos";
  const isReelsOnly = activeLikedSubFilter === "reels";

  const videos = items.filter((item) => item.format !== "short" && item.format !== "reel" && item.category !== "shorts");
  const reels = items.filter((item) => item.format === "short" || item.format === "reel" || item.category === "shorts");

  const firstItem = items[0] || null;
  const ownerName = (typeof localProfile !== "undefined" && localProfile && localProfile.name && localProfile.name.trim())
    ? localProfile.name.trim()
    : "Watchbloom";

  const coverArt = firstItem ? art(firstItem) : "art-coral";
  const firstDuration = firstItem ? duration(firstItem) : "";
  const firstFormatTag = firstItem
    ? (firstItem.format === "short" || firstItem.format === "reel" ? tr("shortFormat") : tr("originalVideo"))
    : "";


  let rightContent = "";

  if (items.length === 0) {
    rightContent = empty(tr("noLikedTitle"), tr("noLikedText"), "💖");
  } else {
    // Sub-filters
    const subfilterBar = '<div class="liked-subfilter-bar" role="tablist" aria-label="Filter liked content">' +
      '<button type="button" class="liked-subfilter-pill ' + (isAll ? "active" : "") + '" data-liked-subfilter="all">' +
        esc(tr("all")) + ' <span class="liked-pill-count">' + items.length + '</span>' +
      '</button>' +
      '<button type="button" class="liked-subfilter-pill ' + (isVideosOnly ? "active" : "") + '" data-liked-subfilter="videos">' +
        esc(tr("videos")) + ' <span class="liked-pill-count">' + videos.length + '</span>' +
      '</button>' +
      '<button type="button" class="liked-subfilter-pill ' + (isReelsOnly ? "active" : "") + '" data-liked-subfilter="reels">' +
        esc(tr("shorts")) + ' <span class="liked-pill-count">' + reels.length + '</span>' +
      '</button>' +
    '</div>';

    let sectionsHtml = "";

    // Original Videos section (shown on "all" or "videos")
    if (isAll || isVideosOnly) {
      if (videos.length > 0) {
        sectionsHtml += '<section class="liked-content-section liked-videos-section">' +
          '<div class="liked-section-header">' +
            '<div class="liked-section-title-wrap">' +
              '<span class="liked-section-icon">🎬</span>' +
              '<h2 class="liked-section-title">' + esc(tr("originalVideos")) + '</h2>' +
              '<span class="liked-section-badge">' + videos.length + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="liked-videos-grid">' +
            videos.map((v) => card(v, query)).join("") +
          '</div>' +
        '</section>';
      } else if (isVideosOnly) {
        sectionsHtml += '<section class="liked-content-section liked-videos-section">' +
          '<div class="liked-section-header">' +
            '<div class="liked-section-title-wrap">' +
              '<span class="liked-section-icon">🎬</span>' +
              '<h2 class="liked-section-title">' + esc(tr("originalVideos")) + '</h2>' +
              '<span class="liked-section-badge">0</span>' +
            '</div>' +
          '</div>' +
          '<p class="liked-empty-section-note">' + esc(tr("noLikedVideosSub")) + '</p>' +
        '</section>';
      }
    }

    // Reels section (shown on "all" or "reels")
    if (isAll || isReelsOnly) {
      if (reels.length > 0) {
        sectionsHtml += '<section class="liked-content-section liked-reels-section">' +
          '<div class="liked-section-header">' +
            '<div class="liked-section-title-wrap">' +
              '<span class="liked-section-icon">⚡</span>' +
              '<h2 class="liked-section-title">' + esc(tr("shorts")) + '</h2>' +
              '<span class="liked-section-badge">' + reels.length + '</span>' +
            '</div>' +
          '</div>' +
          '<div class="liked-reels-grid">' +
            reels.map((r) => likedReelCard(r)).join("") +
          '</div>' +
        '</section>';
      } else if (isReelsOnly) {
        sectionsHtml += '<section class="liked-content-section liked-reels-section">' +
          '<div class="liked-section-header">' +
            '<div class="liked-section-title-wrap">' +
              '<span class="liked-section-icon">⚡</span>' +
              '<h2 class="liked-section-title">' + esc(tr("shorts")) + '</h2>' +
              '<span class="liked-section-badge">0</span>' +
            '</div>' +
          '</div>' +
          '<p class="liked-empty-section-note">' + esc(tr("noLikedReelsSub")) + '</p>' +
        '</section>';
      }
    }

    rightContent = subfilterBar + sectionsHtml;
  }

  // Left sidebar playlist card
  const playAllBtn = firstItem
    ? '<button type="button" class="liked-action-btn liked-btn-playall" data-liked-action="play-all" data-first-id="' + esc(firstItem.id) + '">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>' +
        '<span>' + esc(tr("playAll")) + '</span>' +
      '</button>'
    : '<button type="button" class="liked-action-btn liked-btn-playall" disabled style="opacity:0.5;cursor:not-allowed;">' +
        '<svg viewBox="0 0 24 24" fill="currentColor" width="18" height="18"><path d="M8 5v14l11-7z"/></svg>' +
        '<span>' + esc(tr("playAll")) + '</span>' +
      '</button>';

  const shuffleBtn = items.length > 0
    ? '<button type="button" class="liked-action-btn liked-btn-shuffle" data-liked-action="shuffle">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>' +
        '<span>' + esc(tr("shuffle")) + '</span>' +
      '</button>'
    : '<button type="button" class="liked-action-btn liked-btn-shuffle" disabled style="opacity:0.5;cursor:not-allowed;">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" width="18" height="18"><path d="M16 3h5v5M4 20l17-17M21 16v5h-5M15 15l6 6M4 4l5 5"/></svg>' +
        '<span>' + esc(tr("shuffle")) + '</span>' +
      '</button>';

  const leftCard = '<aside class="liked-playlist-sidebar">' +
    '<div class="liked-playlist-card">' +
      '<div class="liked-ambient-glow ' + coverArt + '"></div>' +
      '<div class="liked-playlist-cover-wrap">' +
        '<div class="liked-playlist-cover ' + coverArt + '">' +
          (firstFormatTag ? '<span class="liked-cover-tag">' + esc(firstFormatTag) + '</span>' : '') +
          '<span class="liked-cover-title">' + esc(firstItem ? categoryLabel(firstItem.category) : "Watchbloom") + '</span>' +
          (firstDuration ? '<span class="liked-cover-duration">' + esc(firstDuration) + '</span>' : '') +
        '</div>' +
      '</div>' +
      '<div class="liked-playlist-info">' +
        '<h1 class="liked-playlist-title">' + esc(tr("likedVideos")) + '</h1>' +
        '<p class="liked-playlist-owner">' + esc(ownerName) + '</p>' +
        '<p class="liked-playlist-meta">' + items.length + ' ' + esc(tr("videos")) + ' · ' + esc(tr("updatedToday")) + '</p>' +
        '<div class="liked-playlist-actions">' +
          playAllBtn +
          shuffleBtn +
        '</div>' +
      '</div>' +
    '</div>' +
  '</aside>';

  return '<div class="liked-layout-wrapper">' + leftCard + '<main class="liked-main-column">' + rightContent + '</main></div>';
}

let currentHistoryFilter = 'all';

function isReelItem(item) {
  if (!item) return false;
  const fmt = String(item.format || '').toLowerCase();
  return fmt === 'reel' || fmt === 'short' || item.category === 'shorts';
}

function formatRelativeTime(isoString) {
  if (!isoString) return '';
  try {
    const time = new Date(isoString).getTime();
    if (isNaN(time)) return '';
    const diff = Math.max(0, Date.now() - time);
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return tr('justNow') || 'Just now';
    if (mins < 60) return mins + 'm ago';
    const hours = Math.floor(mins / 60);
    if (hours < 24) return hours + 'h ago';
    const days = Math.floor(hours / 24);
    if (days === 1) return 'Yesterday';
    if (days < 7) return days + 'd ago';
    return new Date(isoString).toLocaleDateString();
  } catch (e) {
    return '';
  }
}

function historyVideoCard(item) {
  const saved = savedIds.has(item.id);
  const play = item.media_url ? '<span class="cover-play" aria-hidden="true">▶</span>' : '';
  const itemViews = getItemViews(item);
  const uploadDate = formatUploadDate(item.date);
  const relTime = formatRelativeTime(item.viewedAt);
  const watchedBadge = relTime
    ? '<span class="history-viewed-pill" title="' + esc(item.viewedAt) + '"><svg viewBox="0 0 24 24" width="12" height="12" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + esc(tr('watchedLabel')) + ' ' + esc(relTime) + '</span>'
    : '';

  return '<article class="media-card history-video-card" data-video-id="' + esc(item.id) + '">' +
    '<div class="history-card-media-wrap">' +
      '<button class="cover-button" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc(item.title) + '">' +
        '<div class="cover ' + art(item) + '">' +
          '<span class="cover-type">' + esc(tr('originalVideo')) + '</span>' +
          '<span class="cover-word">' + esc(categoryLabel(item.category)) + '</span>' +
          '<span class="cover-duration">' + esc(duration(item)) + '</span>' +
          play +
        '</div>' +
      '</button>' +
      '<button type="button" class="history-card-remove-btn" data-history-remove="' + esc(item.id) + '" title="' + esc(tr('removeFromHistory')) + '" aria-label="' + esc(tr('removeFromHistory')) + '">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="card-copy history-card-copy">' +
      '<div>' +
        '<button class="card-title history-card-title" type="button" data-open="' + esc(item.id) + '">' + esc(item.title) + '</button>' +
        '<p class="card-meta"><span data-item-views="' + esc(item.id) + '">' + esc(views(itemViews)) + ' ' + esc(tr('plays')) + '</span> · <span>' + esc(uploadDate) + '</span> · <span>' + esc(categoryLabel(item.category)) + '</span></p>' +
        '<div class="card-author">' + creatorIdentity(item.author) + '</div>' +
      '</div>' +
      '<div class="history-card-bottom">' +
        watchedBadge +
        '<button class="save-button" type="button" data-save="' + esc(item.id) + '" aria-label="' + esc(saved ? tr('removeSaved') : tr('saveItem')) + '" aria-pressed="' + saved + '">' +
          '<svg viewBox="0 0 24 24" fill="' + (saved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.7L6 21V4.5Z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function historyReelCard(item) {
  const saved = savedIds.has(item.id);
  const play = item.media_url ? '<span class="cover-play" aria-hidden="true">▶</span>' : '';
  const itemViews = getItemViews(item);
  const relTime = formatRelativeTime(item.viewedAt);
  const watchedBadge = relTime
    ? '<span class="history-viewed-pill reel-pill" title="' + esc(item.viewedAt) + '"><svg viewBox="0 0 24 24" width="11" height="11" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg> ' + esc(relTime) + '</span>'
    : '';

  return '<article class="history-reel-card" data-video-id="' + esc(item.id) + '">' +
    '<div class="history-reel-cover-wrap">' +
      '<button class="cover-button history-reel-cover-btn" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc(item.title) + '">' +
        '<div class="cover history-reel-cover ' + art(item) + '">' +
          '<span class="cover-type history-reel-badge">⚡ ' + esc(tr('shortFormat')) + '</span>' +
          '<span class="cover-word history-reel-word">' + esc(categoryLabel(item.category)) + '</span>' +
          '<span class="cover-duration history-reel-duration">' + esc(duration(item)) + '</span>' +
          play +
        '</div>' +
      '</button>' +
      '<button type="button" class="history-card-remove-btn history-reel-remove-btn" data-history-remove="' + esc(item.id) + '" title="' + esc(tr('removeFromHistory')) + '" aria-label="' + esc(tr('removeFromHistory')) + '">' +
        '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>' +
      '</button>' +
    '</div>' +
    '<div class="history-reel-copy">' +
      '<div class="history-reel-info">' +
        '<button class="card-title history-reel-title" type="button" data-open="' + esc(item.id) + '">' + esc(item.title) + '</button>' +
        '<p class="card-meta history-reel-meta"><span data-item-views="' + esc(item.id) + '">' + esc(views(itemViews)) + ' ' + esc(tr('plays')) + '</span> · <span>' + esc(categoryLabel(item.category)) + '</span></p>' +
        '<div class="card-author history-reel-author">' + creatorIdentity(item.author) + '</div>' +
      '</div>' +
      '<div class="history-card-bottom">' +
        watchedBadge +
        '<button class="save-button history-reel-save" type="button" data-save="' + esc(item.id) + '" aria-label="' + esc(saved ? tr('removeSaved') : tr('saveItem')) + '" aria-pressed="' + saved + '">' +
          '<svg viewBox="0 0 24 24" fill="' + (saved ? 'currentColor' : 'none') + '" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><path d="M6 4.5A1.5 1.5 0 0 1 7.5 3h9A1.5 1.5 0 0 1 18 4.5V21l-6-3.7L6 21V4.5Z"/></svg>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</article>';
}

function renderHistoryView(items, query) {
  if (!items || items.length === 0) {
    return '<div class="history-empty-container">' +
      '<div class="history-empty-card">' +
        '<div class="history-empty-glow"></div>' +
        '<div class="history-empty-icon-wrap">' +
          '<svg viewBox="0 0 24 24" width="48" height="48" fill="none" stroke="currentColor" stroke-width="1.6"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>' +
        '</div>' +
        '<h2 class="history-empty-title">' + esc(tr('historyEmptyTitle')) + '</h2>' +
        '<p class="history-empty-text">' + esc(tr('historyEmptyText')) + '</p>' +
        '<button type="button" class="history-empty-cta-btn" data-history-explore>' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg>' +
          '<span>' + esc(tr('discover')) + '</span>' +
        '</button>' +
      '</div>' +
    '</div>';
  }

  const isAll = currentHistoryFilter === 'all';
  const isVideosOnly = currentHistoryFilter === 'videos';
  const isReelsOnly = currentHistoryFilter === 'reels';

  const reels = items.filter((item) => isReelItem(item));
  const videos = items.filter((item) => !isReelItem(item));

  // Capsule Segmented Navigation Bar
  const capsuleNav = '<div class="history-header-dock">' +
    '<div class="history-capsule-container">' +
      '<nav class="history-capsule-bar" role="tablist" aria-label="Watch history categories">' +
        '<button type="button" role="tab" class="history-capsule-pill ' + (isAll ? 'active' : '') + '" data-history-filter="all" aria-selected="' + isAll + '">' +
          '<span class="history-pill-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg></span>' +
          '<span class="history-pill-label">' + esc(tr('historyAll')) + '</span>' +
          '<span class="history-pill-badge">' + items.length + '</span>' +
        '</button>' +
        '<button type="button" role="tab" class="history-capsule-pill ' + (isVideosOnly ? 'active' : '') + '" data-history-filter="videos" aria-selected="' + isVideosOnly + '">' +
          '<span class="history-pill-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect width="20" height="14" x="2" y="3" rx="2"/><line x1="8" x2="16" y1="21" y2="21"/><line x1="12" x2="12" y1="17" y2="21"/></svg></span>' +
          '<span class="history-pill-label">' + esc(tr('historyVideos')) + '</span>' +
          '<span class="history-pill-badge">' + videos.length + '</span>' +
        '</button>' +
        '<button type="button" role="tab" class="history-capsule-pill ' + (isReelsOnly ? 'active' : '') + '" data-history-filter="reels" aria-selected="' + isReelsOnly + '">' +
          '<span class="history-pill-icon"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></span>' +
          '<span class="history-pill-label">' + esc(tr('historyReels')) + '</span>' +
          '<span class="history-pill-badge">' + reels.length + '</span>' +
        '</button>' +
      '</nav>' +
      '<div class="history-actions-bar">' +
        '<button type="button" class="history-clear-trigger-btn" id="history-clear-trigger" title="' + esc(tr('clearWatchHistory')) + '">' +
          '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M10 11v6M14 11v6"/></svg>' +
          '<span>' + esc(tr('clearWatchHistory')) + '</span>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  let sectionsHtml = '';

  if (isAll) {
    if (reels.length > 0) {
      sectionsHtml += '<section class="history-shelf-section history-reels-shelf" aria-labelledby="history-reels-shelf-heading">' +
        '<div class="history-section-header">' +
          '<div class="history-section-title-wrap">' +
            '<span class="history-section-icon reels-glow-icon">⚡</span>' +
            '<h2 id="history-reels-shelf-heading" class="history-section-title">' + esc(tr('watchedReelsHeading')) + '</h2>' +
            '<span class="history-section-count-badge">' + reels.length + '</span>' +
          '</div>' +
          '<button type="button" class="history-view-all-pill" data-history-filter="reels">' +
            '<span>' + esc(tr('historyReels')) + '</span>' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg>' +
          '</button>' +
        '</div>' +
        '<div class="history-reels-shelf-track" tabindex="0" role="region" aria-label="Watched Reels">' +
          reels.map((r) => historyReelCard(r)).join('') +
        '</div>' +
      '</section>';
    }

    if (videos.length > 0) {
      sectionsHtml += '<section class="history-content-section history-videos-section" aria-labelledby="history-videos-shelf-heading">' +
        '<div class="history-section-header">' +
          '<div class="history-section-title-wrap">' +
            '<span class="history-section-icon videos-glow-icon">🎬</span>' +
            '<h2 id="history-videos-shelf-heading" class="history-section-title">' + esc(tr('watchedVideosHeading')) + '</h2>' +
            '<span class="history-section-count-badge">' + videos.length + '</span>' +
          '</div>' +
          (reels.length > 0 ? '<button type="button" class="history-view-all-pill" data-history-filter="videos"><span>' + esc(tr('historyVideos')) + '</span><svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.5"><path d="m9 18 6-6-6-6"/></svg></button>' : '') +
        '</div>' +
        '<div class="history-videos-grid">' +
          videos.map((v) => historyVideoCard(v)).join('') +
        '</div>' +
      '</section>';
    } else if (reels.length === 0) {
      sectionsHtml += '<div class="history-empty-sub"><span class="history-empty-icon">🎬</span><p>' + esc(tr('noHistoryVideosSub')) + '</p></div>';
    }
  } else if (isVideosOnly) {
    if (videos.length > 0) {
      sectionsHtml += '<section class="history-content-section history-videos-section">' +
        '<div class="history-videos-grid">' +
          videos.map((v) => historyVideoCard(v)).join('') +
        '</div>' +
      '</section>';
    } else {
      sectionsHtml += '<div class="history-empty-sub">' +
        '<div class="history-empty-sub-icon">🎬</div>' +
        '<h3>' + esc(tr('noHistoryVideosSub')) + '</h3>' +
        '<button type="button" class="history-sub-explore-btn" data-history-explore>' + esc(tr('discover')) + '</button>' +
      '</div>';
    }
  } else if (isReelsOnly) {
    if (reels.length > 0) {
      sectionsHtml += '<section class="history-content-section history-reels-section">' +
        '<div class="history-reels-grid">' +
          reels.map((r) => historyReelCard(r)).join('') +
        '</div>' +
      '</section>';
    } else {
      sectionsHtml += '<div class="history-empty-sub">' +
        '<div class="history-empty-sub-icon">⚡</div>' +
        '<h3>' + esc(tr('noHistoryReelsSub')) + '</h3>' +
        '<button type="button" class="history-sub-explore-btn" onclick="setView(\'reels\')">' + esc(tr('historyReels')) + '</button>' +
      '</div>';
    }
  }

  return '<div class="history-view-container">' + capsuleNav + '<div class="history-view-body">' + sectionsHtml + '</div></div>';
}

function trendingState(title, text, retry = false) {
  return '<div class="trend-state"><span class="trend-state-icon" aria-hidden="true">' + (retry ? "↻" : "↗") + '</span><div><strong>' + esc(tr(title)) + '</strong><p>' + esc(tr(text)) + '</p></div>' + (retry ? '<button class="trend-watch-button" type="button" data-trending-retry>' + esc(tr("trendingRetry")) + '</button>' : '') + '</div>';
}

function trendingSpotlight(item) {
  const isReel = ["short", "reel"].includes(String(item.format || "").toLowerCase());
  const typeLabel = isReel ? tr("shortFormat") : tr("originalVideo");
  return '<div class="trend-spotlight-art"><button class="cover-button trend-spotlight-media" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc(item.title) + '"><div class="cover ' + art(item) + ' trend-spotlight-cover"><span class="cover-type">' + esc(typeLabel) + '</span><span class="trend-rank">#1</span><span class="trend-spotlight-glyph" aria-hidden="true"><svg viewBox="0 0 24 24" fill="currentColor"><path d="m8 5 11 7-11 7z"/></svg></span><span class="cover-word">' + esc(categoryLabel(item.category)) + '</span></div></button></div><div class="trend-spotlight-copy"><p class="trend-spotlight-label"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22c4.4 0 7-3.1 7-7 0-2.8-1.4-5.2-4.5-8-.1 2.4-1 3.8-2.3 4.6C12 8 10.1 4.7 6.8 2 7.2 6.5 5 8.9 5 13.2 5 18.3 7.8 22 12 22Z"/></svg>' + esc(tr("trendingFeatured")) + '</p><h2>' + esc(item.title) + '</h2><p class="trend-spotlight-author">' + esc(item.author) + '</p><div class="trend-spotlight-meta"><span>' + esc(views(item.views)) + ' ' + esc(tr("plays")) + '</span><span>' + esc(categoryLabel(item.category)) + '</span></div><button class="trend-watch-button" type="button" data-open="' + esc(item.id) + '"><svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="m8 5 11 7-11 7z"/></svg>' + esc(tr("trendingWatchFeatured")) + '</button></div>';
}

function trendingVideoCard(item, rank) {
  const markup = card(item, "");
  return markup.replace('<article class="media-card">', '<article class="media-card trending-video-card"><span class="trend-rank">#' + rank + '</span>');
}

function paintTrending(items) {
  const spotlight = $("trending-spotlight");
  const reelsTrack = $("trending-reels");
  const videosGrid = $("trending-videos");
  const reels = items.filter((item) => ["short", "reel"].includes(String(item.format || "").toLowerCase())
    && !notInterestedIds.has(item.id) && !hiddenCreatorKeys.has(creatorKey(item.author)));
  const videos = items.filter((item) => !["short", "reel"].includes(String(item.format || "").toLowerCase()));
  const featured = videos[0] || reels[0] || items[0];

  if (featured) {
    visibleItems.set(featured.id, featured);
    spotlight.innerHTML = trendingSpotlight(featured);
  } else {
    spotlight.innerHTML = trendingState("trendingEmptyVideosTitle", "trendingEmptyVideosText");
  }

  reels.forEach((item) => visibleItems.set(item.id, item));
  reelsTrack.innerHTML = reels.length
    ? reels.slice(0, 8).map((item, index) => shortShelfCard(item).replace('<article class="shorts-shelf-card">', '<article class="shorts-shelf-card trend-reel-card"><span class="trend-rank">#' + (index + 1) + '</span>')).join("")
    : trendingState("trendingEmptyReelsTitle", "trendingEmptyReelsText");

  const rankedVideos = videos.filter((item) => item.id !== featured?.id);
  rankedVideos.forEach((item) => visibleItems.set(item.id, item));
  videosGrid.innerHTML = rankedVideos.length
    ? rankedVideos.slice(0, 9).map((item, index) => trendingVideoCard(item, index + (featured && videos[0]?.id === featured.id ? 2 : 1))).join("")
    : trendingState("trendingEmptyVideosTitle", "trendingEmptyVideosText");

  $("trending-reels-count").textContent = reels.length + " " + tr("trendingReelCount");
  $("trending-videos-count").textContent = videos.length + " " + tr("trendingVideoCount");
}


let activeGameTag = "all";
let gamersRequest = 0;
async function renderGamersHub(query = "") {
  const request = ++gamersRequest;
  try {
    const response = await fetch("/api/v1/explore?category=gaming&limit=50");
    if (!response.ok) return;
    const data = await response.json();
    if (request !== gamersRequest || activeView !== "gamers") return;
    const rawItems = data.results || [];

    // STRICT CONTENT ANCHORING: Only gaming videos; merge uploaded gaming items; strictly exclude vlogs, news, courses, music
    const uploadedGaming = loadUploadedVideos().filter((it) => it && it.category === "gaming" && !isReelItem(it));
    const merged = new Map();
    uploadedGaming.forEach((it) => merged.set(it.id, it));
    rawItems.forEach((it) => { if (!merged.has(it.id)) merged.set(it.id, it); });

    const allGaming = Array.from(merged.values());
    allGaming.forEach((item) => visibleItems.set(item.id, item));

    const isGamingContent = (item) => {
      if (!item || isReelItem(item)) return false;
      const cat = String(item.category || "").toLowerCase();
      return cat === "gaming" || (typeof item.id === "string" && item.id.startsWith("g_v"));
    };

    const items = allGaming.filter(isGamingContent);

    let displayItems = items;

    if (activeGameTag === "action") {
      const filtered = items.filter((it) => (String(it.tags || "").toLowerCase().includes("action") || String(it.title || "").toLowerCase().includes("gta") || String(it.title || "").toLowerCase().includes("battle") || String(it.title || "").toLowerCase().includes("speedrun")));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeGameTag === "rpg") {
      const filtered = items.filter((it) => (String(it.tags || "").toLowerCase().includes("campaign") || String(it.tags || "").toLowerCase().includes("rpg") || String(it.tags || "").toLowerCase().includes("mods") || String(it.title || "").toLowerCase().includes("boss") || String(it.title || "").toLowerCase().includes("encounters")));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeGameTag === "tiny") {
      const filtered = items.filter((it) => String(it.title).toLowerCase().includes("game") || String(it.tags || "").toLowerCase().includes("mechanic") || String(it.tags || "").toLowerCase().includes("tiny"));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeGameTag === "openworld") {
      const filtered = items.filter((it) => (String(it.tags || "").toLowerCase().includes("openworld") || String(it.title || "").toLowerCase().includes("gta") || String(it.title || "").toLowerCase().includes("night city")));
      displayItems = filtered.length ? filtered : displayItems;
    }
    if (!displayItems.length) displayItems = items;

    if (query && String(query).trim()) {
      const needle = norm(query.trim());
      displayItems = displayItems.filter((it) => norm([it.title, it.author, it.description, it.tags].join(" ")).includes(needle));
    }

    // Sync pill active state in DOM
    const bar = document.querySelector("#gamers-page .hub-topic-bar");
    if (bar) {
      bar.querySelectorAll("[data-game-tag]").forEach((btn) => {
        const isAct = btn.dataset.gameTag === activeGameTag;
        btn.classList.toggle("active", isAct);
        btn.setAttribute("aria-selected", String(isAct));
      });
    }

    // Featured row
    const featured = displayItems.slice(0, 4);
    const featuredGrid = $("gamers-featured-grid");
    if (featuredGrid) featuredGrid.innerHTML = featured.length ? featured.map((item) => card(item, query)).join("") : '<div class="channel-empty" style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--muted);">' + esc(tr("noItemsText") || "No gaming videos found.") + '</div>';

    // Recommended row
    const recommended = (displayItems.length > 4 ? displayItems.slice(4, 8) : displayItems.slice(0, 4));
    const recGrid = $("gamers-recommended-grid");
    if (recGrid) recGrid.innerHTML = (recommended.length ? recommended : displayItems.slice(0, 4)).map((item) => card(item, query)).join("");

    // Game Shelf 1: Speedruns & Mechanics
    const shelf1Items = displayItems.slice(0, 6);
    const shelf1 = $("gamers-shelf-1");
    if (shelf1) shelf1.innerHTML = shelf1Items.map((item) => card(item, query)).join("");

    // Game Shelf 2: Campaigns & Action
    const shelf2Items = (displayItems.length > 2 ? displayItems.slice(2, 8) : displayItems);
    const shelf2 = $("gamers-shelf-2");
    if (shelf2) shelf2.innerHTML = shelf2Items.map((item) => card(item, query)).join("");
  } catch (err) {
    console.error("Gamers hub failed", err);
  }
}

let activeNewsTab = "top";
let headlinesRequest = 0;
async function renderHeadlinesHub(query = "") {
  const request = ++headlinesRequest;
  try {
    const response = await fetch("/api/v1/explore?category=news&limit=50");
    if (!response.ok) return;
    const data = await response.json();
    if (request !== headlinesRequest || activeView !== "headlines") return;
    const rawItems = data.results || [];

    // STRICT CONTENT ANCHORING: Only news bulletins; merge uploaded news items; strictly exclude vlogs, gaming, courses, music
    const uploadedNews = loadUploadedVideos().filter((it) => it && it.category === "news" && !isReelItem(it));
    const merged = new Map();
    uploadedNews.forEach((it) => merged.set(it.id, it));
    rawItems.forEach((it) => { if (!merged.has(it.id)) merged.set(it.id, it); });

    const allNews = Array.from(merged.values());
    allNews.forEach((item) => visibleItems.set(item.id, item));

    const isNewsContent = (item) => {
      if (!item || isReelItem(item)) return false;
      const cat = String(item.category || "").toLowerCase();
      return cat === "news" || (typeof item.id === "string" && item.id.startsWith("n_v"));
    };

    const items = allNews.filter(isNewsContent);

    let displayItems = items;

    if (activeNewsTab === "sport") {
      const filtered = items.filter((it) => String(it.tags || "").includes("sport") || String(it.title || "").toLowerCase().includes("olympic") || String(it.title || "").toLowerCase().includes("fifa"));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeNewsTab === "entertainment") {
      const filtered = items.filter((it) => String(it.tags || "").includes("entertainment") || String(it.title || "").toLowerCase().includes("festival") || String(it.title || "").toLowerCase().includes("cinema") || String(it.title || "").toLowerCase().includes("oscars"));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeNewsTab === "business") {
      const filtered = items.filter((it) => String(it.tags || "").includes("business") || String(it.tags || "").includes("economy") || String(it.title || "").toLowerCase().includes("market") || String(it.title || "").toLowerCase().includes("inflation"));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeNewsTab === "world") {
      const filtered = items.filter((it) => String(it.tags || "").includes("world") || String(it.title || "").toLowerCase().includes("global") || String(it.title || "").toLowerCase().includes("climate") || String(it.title || "").toLowerCase().includes("space"));
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeNewsTab === "national") {
      const filtered = items.filter((it) => String(it.tags || "").includes("national") || String(it.title || "").toLowerCase().includes("election") || String(it.title || "").toLowerCase().includes("metro") || String(it.title || "").toLowerCase().includes("budget"));
      displayItems = filtered.length ? filtered : displayItems;
    }
    if (!displayItems.length) displayItems = items;

    if (query && String(query).trim()) {
      const needle = norm(query.trim());
      displayItems = displayItems.filter((it) => norm([it.title, it.author, it.description, it.tags].join(" ")).includes(needle));
    }

    // Sync pill active state in DOM
    const bar = document.querySelector("#headlines-page .hub-topic-bar");
    if (bar) {
      bar.querySelectorAll("[data-news-tab]").forEach((btn) => {
        const isAct = btn.dataset.newsTab === activeNewsTab;
        btn.classList.toggle("active", isAct);
        btn.setAttribute("aria-selected", String(isAct));
      });
    }

    const spotlightTitle = $("headlines-spotlight-title");
    if (spotlightTitle && items.length) {
      const topHeadline = items[0];
      spotlightTitle.innerHTML = '<button type="button" class="breaking-headline-btn" data-open="' + esc(topHeadline.id) + '" style="background: none; border: none; color: inherit; font: inherit; cursor: pointer; text-align: left; padding: 0; text-decoration: underline;">' + esc(topHeadline.title) + '</button>';
    }

    const topStories = $("headlines-top-stories");
    if (topStories) {
      topStories.innerHTML = displayItems.length
        ? displayItems.slice(0, 6).map((item) => card(item, query)).join("")
        : '<div class="channel-empty" style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--muted);">' + esc(tr("noItemsText") || "No news reports found.") + '</div>';
    }

    const latestPosts = $("headlines-latest-posts");
    if (latestPosts) {
      const posts = displayItems.length > 2 ? displayItems.slice(2, 6) : displayItems.slice(0, 4);
      latestPosts.innerHTML = posts.length ? posts.map((item) => card(item, query)).join("") : "";
    }
  } catch (err) {
    console.error("Headlines hub failed", err);
  }
}

let activeMusicTag = "all";
let musicRequest = 0;
async function renderMusicHub(query = "") {
  const request = ++musicRequest;
  try {
    const response = await fetch("/api/v1/explore?limit=150");
    if (!response.ok) return;
    const data = await response.json();
    if (request !== musicRequest || activeView !== "music") return;
    const rawItems = data.results || [];

    // STRICT CONTENT ANCHORING: Only music tracks; merge uploaded music items; strictly exclude vlogs, news, gaming, courses
    const uploadedMusic = loadUploadedVideos().filter((it) => it && it.category === "music" && !isReelItem(it));
    const merged = new Map();
    uploadedMusic.forEach((it) => merged.set(it.id, it));
    rawItems.forEach((it) => { if (!merged.has(it.id)) merged.set(it.id, it); });

    const allMusic = Array.from(merged.values());
    allMusic.forEach((item) => visibleItems.set(item.id, item));

    const isMusicContent = (item) => {
      if (!item || isReelItem(item)) return false;
      const cat = String(item.category || "").toLowerCase();
      if (cat === "music") return true;
      if (typeof item.id === "string" && (item.id === "v8" || item.id.startsWith("m_v") || item.id.startsWith("ost_"))) return true;
      const tags = String(item.tags || "").toLowerCase();
      return tags.includes("#music") || tags.includes("#lofi") || tags.includes("#beats") || tags.includes("#soundtrack");
    };

    const items = allMusic.filter(isMusicContent);

    let displayItems = items;

    if (activeMusicTag === "lofi") {
      const filtered = items.filter((it) => String(it.tags || "").includes("lofi") || String(it.title || "").toLowerCase().includes("lo-fi") || it.id === "v8" || it.id === "m_v1");
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeMusicTag === "synth") {
      const filtered = items.filter((it) => String(it.tags || "").includes("synth") || String(it.title || "").toLowerCase().includes("synthwave") || it.id === "m_v2");
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeMusicTag === "scores") {
      const filtered = items.filter((it) => String(it.tags || "").includes("scores") || String(it.title || "").toLowerCase().includes("orchestral") || it.id === "m_v3");
      displayItems = filtered.length ? filtered : displayItems;
    } else if (activeMusicTag === "chill") {
      const filtered = items.filter((it) => String(it.tags || "").includes("chill") || it.id === "m_v4" || it.id === "v8");
      displayItems = filtered.length ? filtered : displayItems;
    }
    if (!displayItems.length) displayItems = items;

    if (query && String(query).trim()) {
      const needle = norm(query.trim());
      displayItems = displayItems.filter((it) => norm([it.title, it.author, it.description, it.tags].join(" ")).includes(needle));
    }

    // Sync pill active state in DOM
    const bar = document.querySelector("#music-page .hub-topic-bar");
    if (bar) {
      bar.querySelectorAll("[data-music-tag]").forEach((btn) => {
        const isAct = btn.dataset.musicTag === activeMusicTag;
        btn.classList.toggle("active", isAct);
        btn.setAttribute("aria-selected", String(isAct));
      });
    }

    const musicFeatured = $("music-featured-shelf");
    if (musicFeatured) {
      musicFeatured.innerHTML = displayItems.length
        ? displayItems.slice(0, 6).map((item) => card(item, query)).join("")
        : '<div class="channel-empty" style="grid-column: 1/-1; padding: 24px; text-align: center; color: var(--muted);">' + esc(tr("noItemsText") || "No music tracks found.") + '</div>';
    }

    const lofiTrack = $("music-lofi-track");
    if (lofiTrack) {
      const tracks = displayItems.length > 2 ? displayItems.slice(2, 8) : displayItems;
      lofiTrack.innerHTML = tracks.map((item) => card(item, query)).join("");
    }
  } catch (err) {
    console.error("Music hub failed", err);
  }
}

let activeCoursesTrack = "all";
let coursesRequest = 0;
async function renderCoursesHub(query = "") {
  const request = ++coursesRequest;
  try {
    const response = await fetch("/api/v1/explore?type=all&limit=150");
    if (!response.ok) return;
    const data = await response.json();
    if (request !== coursesRequest || activeView !== "courses") return;
    const rawItems = data.results || [];

    // STRICT CONTENT ANCHORING: Only educational courses and playlists; merge uploaded learning items; strictly exclude vlogs, news, gaming, music
    const uploadedLearning = loadUploadedVideos().filter((it) => it && it.category === "learning" && !isReelItem(it));
    const merged = new Map();
    uploadedLearning.forEach((it) => merged.set(it.id, it));
    rawItems.forEach((it) => { if (!merged.has(it.id)) merged.set(it.id, it); });

    const allLearning = Array.from(merged.values());
    allLearning.forEach((item) => visibleItems.set(item.id, item));

    // STRICT: Courses & Academy strictly allows only multi-part courses, playlists, and educational long videos (NO REELS, NO SHORTS)
    const isCourseContent = (item) => {
      if (!item || isReelItem(item)) return false;
      const cat = String(item.category || "").toLowerCase();
      if (cat === "learning") return true;
      if (item.type === "playlist" && (cat === "learning" || (typeof item.id === "string" && item.id.startsWith("p")))) return true;
      if (typeof item.id === "string" && (item.id.startsWith("c_v") || ["v1", "v2", "v3", "v5", "v7"].includes(item.id))) return true;
      return false;
    };

    const items = allLearning.filter(isCourseContent);

    let displayItems = items;
    if (activeCoursesTrack === "web") {
      displayItems = items.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return it.id === "p3" || it.id === "p5" || it.id === "c_v1" || it.id === "c_v2" || it.id === "v3" || it.id === "v2" || it.id === "v7" ||
          text.includes("web") || text.includes("css") || text.includes("javascript") || text.includes("api") || text.includes("html") || text.includes("frontend");
      });
    } else if (activeCoursesTrack === "python") {
      displayItems = items.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return it.id === "p4" || it.id === "c_v3" || it.id === "v1" || it.id === "v7" ||
          text.includes("python") || text.includes("backend") || text.includes("game") || text.includes("api") || text.includes("loop");
      });
    } else if (activeCoursesTrack === "data") {
      displayItems = items.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return it.id === "p2" || it.id === "c_v4" || it.id === "v5" || it.id === "v2" ||
          text.includes("data") || text.includes("chart") || text.includes("analytics") || text.includes("dataset") || text.includes("visualization") || text.includes("weather");
      });
    } else if (activeCoursesTrack === "uiux") {
      displayItems = items.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return it.id === "p3" || it.id === "p1" || it.id === "c_v5" || it.id === "v6" || it.id === "v3" || it.id === "v4" ||
          text.includes("design") || text.includes("ui") || text.includes("ux") || text.includes("palette") || text.includes("motion") || text.includes("color") || text.includes("grid");
      });
    } else {
      // "all": Structured multi-part course playlists first, followed by educational long videos
      const playlists = items.filter((it) => it.type === "playlist");
      const learningVideos = items.filter((it) => it.type === "video" && (it.category === "learning" || String(it.id).startsWith("c_v") || ["v1", "v2", "v3", "v5", "v7"].includes(it.id)));
      displayItems = [...playlists, ...learningVideos];
    }

    if (!displayItems.length) {
      displayItems = items;
    }

    // Filter by search query if user has searched
    if (query && String(query).trim()) {
      const needle = norm(query.trim());
      displayItems = displayItems.filter((it) => norm([it.title, it.author, it.description, it.tags].join(" ")).includes(needle));
    }

    // Sync pill active state in DOM
    const bar = document.querySelector("#courses-page .hub-topic-bar");
    if (bar) {
      bar.querySelectorAll("[data-courses-track]").forEach((btn) => {
        const isAct = btn.dataset.coursesTrack === activeCoursesTrack;
        btn.classList.toggle("active", isAct);
        btn.setAttribute("aria-selected", String(isAct));
      });
    }

    const coursesGrid = $("courses-grid");
    if (coursesGrid) {
      coursesGrid.innerHTML = displayItems.length
        ? displayItems.map((item) => card(item, query)).join("")
        : '<div class="channel-empty" style="grid-column: 1 / -1; padding: 48px 20px; text-align: center; color: var(--muted); font-size: 14px;">' + esc(tr("noItemsText") || "No courses available for this track.") + '</div>';
    }
  } catch (err) {
    console.error("Courses hub failed", err);
  }
}

let cinemaRequest = 0;
let activeCinemaTag = "all";
let cinemaCountdownInterval = null;
let activeSoundtrackAudio = null;
let activePlayingSoundtrackId = null;

const CINEMA_SOUNDTRACKS = [
  {
    id: "ost_1",
    title: "Cyberpunk 2077 · Neon Night City Synth",
    composer: "Arun Rana & Marcin Przybyłowicz",
    duration: "3:45",
    art: "art-violet",
    format: "24-bit 96kHz · Synthwave",
    frequency: 140
  },
  {
    id: "ost_2",
    title: "House of the Dragon · Blood & Fire Theme",
    composer: "Ramin Djawadi (Orchestral Cover)",
    duration: "4:12",
    art: "art-night",
    format: "7.1 Atmos · Symphonic Brass",
    frequency: 110
  },
  {
    id: "ost_3",
    title: "Interstellar · Stay (Cosmic Spatial Mix)",
    composer: "Hans Zimmer · IMAX Spatial Mix",
    duration: "5:20",
    art: "art-teal",
    format: "Dolby Atmos · Spatial Audio",
    frequency: 85
  },
  {
    id: "ost_4",
    title: "Loki Season 2 · Glorious Purpose Suite",
    composer: "Natalie Holt (Cinematic Remaster)",
    duration: "3:58",
    art: "art-emerald",
    format: "Hi-Res Master · Theremin & Strings",
    frequency: 160
  }
];

const CINEMA_UPCOMING = [
  {
    id: "up_1",
    title: "Blade Runner 2099: Neo-Tokyo Chronicle",
    desc: "A futuristic detective noir film rendered in real-time Unreal Engine 5.5 path tracing.",
    releaseDate: "Friday · 8:00 PM IST",
    targetSeconds: 13320,
    badge: "GLOBAL PREMIERE",
    art: "art-aqua",
    director: "Arun Rana · Cyberpunk Studios"
  },
  {
    id: "up_2",
    title: "The Elden Realm: The Shattered Crown",
    desc: "An epic 4K high-fantasy saga following the last dragon knight across the fog of ages.",
    releaseDate: "Sunday · 7:30 PM IST",
    targetSeconds: 65700,
    badge: "FANTASY SELECTION",
    art: "art-rose",
    director: "Watchbloom Cinematic Universe"
  },
  {
    id: "up_3",
    title: "Chrono Drift: Midnight Synth Odyssey",
    desc: "High-octane midnight highway drifting with retro-futuristic visuals and analog synthesizers.",
    releaseDate: "Monday · 9:00 PM IST",
    targetSeconds: 100200,
    badge: "INDIE SPOTLIGHT",
    art: "art-amber",
    director: "Tokyo Motion Labs"
  }
];

function formatCinemaCountdown(totalSecs) {
  if (totalSecs <= 0) return "NOW SCREENING";
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return String(hrs).padStart(2, "0") + "h : " + String(mins).padStart(2, "0") + "m : " + String(secs).padStart(2, "0") + "s";
}

function startCinemaCountdowns() {
  if (cinemaCountdownInterval) clearInterval(cinemaCountdownInterval);
  cinemaCountdownInterval = setInterval(() => {
    CINEMA_UPCOMING.forEach((item) => {
      if (item.targetSeconds > 0) item.targetSeconds--;
      const el = document.querySelector('[data-upcoming-timer="' + item.id + '"]');
      if (el) el.textContent = formatCinemaCountdown(item.targetSeconds);
    });
  }, 1000);
}

function toggleCinemaSoundtrack(id) {
  if (activePlayingSoundtrackId === id) {
    stopCinemaSoundtrack();
    return;
  }
  stopCinemaSoundtrack();
  const track = CINEMA_SOUNDTRACKS.find((s) => s.id === id);
  if (!track) return;

  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx) return;
    const ctx = new AudioCtx();
    const now = ctx.currentTime;
    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(0.01, now);
    gainNode.gain.exponentialRampToValueAtTime(0.24, now + 0.6);
    gainNode.gain.exponentialRampToValueAtTime(0.01, now + 12);

    const baseFreq = track.frequency || 130;
    const freqs = [baseFreq, baseFreq * 1.25, baseFreq * 1.5, baseFreq * 2];
    const oscs = freqs.map((f, i) => {
      const osc = ctx.createOscillator();
      osc.type = i % 2 === 0 ? "sawtooth" : "sine";
      osc.frequency.setValueAtTime(f, now);
      const subGain = ctx.createGain();
      subGain.gain.setValueAtTime(0.25 / freqs.length, now);
      osc.connect(subGain);
      subGain.connect(gainNode);
      osc.start(now);
      osc.stop(now + 12);
      return osc;
    });

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.setValueAtTime(1400, now);
    filter.frequency.exponentialRampToValueAtTime(450, now + 12);
    gainNode.connect(filter);
    filter.connect(ctx.destination);

    activeSoundtrackAudio = { ctx, oscs, gainNode };
    activePlayingSoundtrackId = id;

    document.querySelectorAll(".soundtrack-card").forEach((card) => {
      const isCardActive = card.dataset.soundtrackId === id;
      card.classList.toggle("is-playing", isCardActive);
      const btn = card.querySelector(".soundtrack-play-btn");
      if (btn) {
        btn.innerHTML = isCardActive
          ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
          : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 18,12 6,20"/></svg>';
      }
    });

    showFollowToast("Now playing score preview: " + track.title);

    setTimeout(() => {
      if (activePlayingSoundtrackId === id) stopCinemaSoundtrack();
    }, 12000);
  } catch (err) {
    console.warn("Could not play synthesized cinema soundtrack:", err);
  }
}

function stopCinemaSoundtrack() {
  if (activeSoundtrackAudio) {
    try {
      activeSoundtrackAudio.gainNode.gain.exponentialRampToValueAtTime(0.001, activeSoundtrackAudio.ctx.currentTime + 0.3);
      setTimeout(() => {
        try { activeSoundtrackAudio.ctx.close(); } catch (_) {}
        activeSoundtrackAudio = null;
      }, 350);
    } catch (_) {
      activeSoundtrackAudio = null;
    }
  }
  activePlayingSoundtrackId = null;
  document.querySelectorAll(".soundtrack-card").forEach((card) => {
    card.classList.remove("is-playing");
    const btn = card.querySelector(".soundtrack-play-btn");
    if (btn) {
      btn.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 18,12 6,20"/></svg>';
    }
  });
}

function cinemaSpotlight(item) {
  if (!item) return "";
  const title = item.title;
  const subtitle = item.description || "Official high-definition feature presentation on Watchbloom Cinema in Dolby Vision and 7.1 Atmos audio.";
  const author = item.author || "Warner Bros · Premieres";
  const coverArtClass = art(item);
  const isSaved = savedIds.has(item.id);
  const playUrl = item.media_url || ("/api/media/" + encodeURIComponent(item.id));
  const hasVideo = Boolean(item.media || item.media_url);

  const saveBtnMarkup = '<button class="cinema-save-btn ' + (isSaved ? 'is-saved' : '') + '" type="button" data-save="' + esc(item.id) + '" aria-label="' + esc(isSaved ? 'Remove from Watchlist' : 'Add to Watchlist') + '" aria-pressed="' + isSaved + '">' +
    (isSaved
      ? '<svg viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>✓ In Watchlist</span>'
      : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span>Add to Watchlist</span>'
    ) +
  '</button>';

  // Theatrical IMAX Screen Preview Frame (Right Column)
  const screenContent = '<div class="cinema-screen-box">' +
    '<div class="cinema-screen-ambient-halo ' + coverArtClass + '"></div>' +
    '<div class="cinema-screen-bezel" data-open="' + esc(item.id) + '" role="button" tabindex="0" title="Click to Watch Premiere in Cinema Mode">' +
      '<div class="cinema-screen-viewport ' + coverArtClass + '">' +
        (hasVideo
          ? '<video class="cinema-teaser-video" src="' + esc(playUrl) + '" muted loop playsinline preload="metadata"></video>'
          : ''
        ) +
        '<div class="cinema-screen-glass-sheen"></div>' +
        '<div class="cinema-screen-hud-top">' +
          '<span class="cinema-hud-live-tag"><span class="rec-red-pulse"></span> THEATER SCREEN 1</span>' +
          '<span class="cinema-hud-format-tag">4K UHD · 60 FPS</span>' +
        '</div>' +
        '<div class="cinema-screen-center-play">' +
          '<div class="cinema-play-ring-pulse"></div>' +
          '<div class="cinema-screen-play-badge">' +
            '<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="7,4 19,12 7,20"/></svg>' +
          '</div>' +
          '<span class="cinema-screen-play-text">PLAY PREMIERE</span>' +
        '</div>' +
        '<div class="cinema-screen-hud-bottom">' +
          '<div class="cinema-audio-viz">' +
            '<span class="viz-bar"></span><span class="viz-bar"></span><span class="viz-bar"></span><span class="viz-bar"></span><span class="viz-bar"></span>' +
          '</div>' +
          '<span class="cinema-hud-sound-tag">DOLBY ATMOS 7.1</span>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  return '<div class="cinema-spotlight-card">' +
    '<div class="cinema-spotlight-backdrop ' + coverArtClass + '">' +
      '<div class="cinema-projector-light"></div>' +
    '</div>' +
    '<div class="cinema-spotlight-content">' +
      '<div class="cinema-spotlight-badges">' +
        '<span class="cinema-star-badge">★ EXCLUSIVE PREMIERE</span>' +
        '<span class="cinema-spec-pill">DOLBY VISION</span>' +
        '<span class="cinema-spec-pill">7.1 ATMOS</span>' +
        '<span class="cinema-spec-pill">4K UHD</span>' +
        '<span class="cinema-spec-pill">IMAX ENHANCED</span>' +
      '</div>' +
      '<h2 class="cinema-spotlight-title">' + esc(title) + '</h2>' +
      '<p class="cinema-spotlight-desc">' + esc(subtitle) + '</p>' +
      '<div class="cinema-spotlight-meta">' +
        '<span class="cinema-rating">★★★★★ 9.9 IMDB</span>' +
        '<span class="cinema-meta-dot">·</span>' +
        '<span>' + esc(author) + '</span>' +
        '<span class="cinema-meta-dot">·</span>' +
        '<span>' + esc(duration(item)) + '</span>' +
        '<span class="cinema-meta-dot">·</span>' +
        '<span class="cinema-badge-genre">' + esc(categoryLabel(item.category)) + '</span>' +
      '</div>' +
      '<div class="cinema-spotlight-actions">' +
        '<button class="cinema-play-btn" type="button" data-open="' + esc(item.id) + '" aria-label="' + esc(title) + '">' +
          '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>' +
          '<span>Watch Feature Premiere</span>' +
        '</button>' +
        saveBtnMarkup +
        '<button class="cinema-share-btn" type="button" data-cinema-share="' + esc(item.id) + '" aria-label="Share Premiere">' +
          '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><polyline points="16 6 12 2 8 6"/><line x1="12" y1="2" x2="12" y2="15"/></svg>' +
          '<span>Share</span>' +
        '</button>' +
      '</div>' +
    '</div>' +
    screenContent +
  '</div>';
}

async function renderCinemaHub(query = "") {
  const request = ++cinemaRequest;
  try {
    const response = await fetch("/api/v1/explore?limit=50");
    if (!response.ok) return;
    const data = await response.json();
    if (request !== cinemaRequest || activeView !== "cinema") return;
    const backendItems = data.results || [];
    const uploadedItems = loadUploadedVideos();

    const mergedMap = new Map();
    uploadedItems.forEach((it) => {
      if (it && it.id) {
        if (!it.media_url || it.media_url.startsWith("blob:")) it.media_url = "/api/media/" + encodeURIComponent(it.id);
        mergedMap.set(it.id, it);
      }
    });
    backendItems.forEach((it) => {
      if (it && it.id && !mergedMap.has(it.id)) {
        if (it.type === "video" && (!it.media_url || it.media_url.startsWith("blob:"))) {
          it.media_url = "/api/media/" + encodeURIComponent(it.id);
        }
        mergedMap.set(it.id, it);
      }
    });

    const allItems = Array.from(mergedMap.values());
    allItems.forEach((it) => visibleItems.set(it.id, it));

    // STRICT CONTENT ANCHORING: Cinema & Series strictly showcases theatrical feature films, cinematic edits & series
    // STRICTLY DISALLOWS: vlogs ("lifestyle"), news ("news"), courses/tutorials ("learning"), gaming ("gaming"), sports ("sports"), podcasts.
    const isCinemaContent = (item) => {
      if (!item || isReelItem(item)) return false;
      const cat = String(item.category || "").toLowerCase();
      if (cat === "entertainment" || cat === "creative") return true;
      if (typeof item.id === "string" && (item.id === "v9" || item.id.startsWith("up_"))) return true;
      return false;
    };

    const items = allItems.filter(isCinemaContent);

    let queryFiltered = items;
    const cleanQ = String(query || "").trim().toLowerCase();
    if (cleanQ) {
      queryFiltered = items.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "") + " " + (it.author || "")).toLowerCase();
        return text.includes(cleanQ);
      });
    }

    let displayItems = queryFiltered;
    if (activeCinemaTag === "fantasy") {
      displayItems = queryFiltered.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return it.category === "entertainment" || text.includes("dragon") || text.includes("thrones") || text.includes("myth") || text.includes("saga");
      });
    } else if (activeCinemaTag === "visuals") {
      displayItems = queryFiltered.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return it.category === "creative" || text.includes("vfx") || text.includes("loki") || text.includes("animation");
      });
    } else if (activeCinemaTag === "scifi") {
      displayItems = queryFiltered.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return text.includes("cyberpunk") || text.includes("future") || text.includes("neon") || text.includes("city");
      });
    } else if (activeCinemaTag === "shorts") {
      displayItems = queryFiltered.filter((it) => Number(it.mins) <= 15);
    } else if (activeCinemaTag === "behind") {
      displayItems = queryFiltered.filter((it) => {
        const text = (it.title + " " + (it.tags || "") + " " + (it.description || "")).toLowerCase();
        return text.includes("making") || text.includes("behind") || text.includes("mastery") || text.includes("director");
      });
    }
    if (!displayItems.length) displayItems = queryFiltered;

    // Dynamically pick the spotlight item to match activeCinemaTag!
    let spotlightItem = null;
    if (activeCinemaTag === "fantasy") {
      spotlightItem = items.find((it) => it.title.toLowerCase().includes("dragon") || it.title.toLowerCase().includes("thrones") || it.category === "entertainment") || displayItems[0];
    } else if (activeCinemaTag === "visuals") {
      spotlightItem = items.find((it) => it.title.toLowerCase().includes("loki") || it.title.toLowerCase().includes("vfx") || it.title.toLowerCase().includes("animation") || it.category === "creative") || displayItems[0];
    } else if (activeCinemaTag === "scifi") {
      spotlightItem = items.find((it) => it.title.toLowerCase().includes("cyberpunk") || it.title.toLowerCase().includes("city")) || displayItems[0];
    } else if (activeCinemaTag === "shorts") {
      spotlightItem = items.find((it) => Number(it.mins) <= 15) || displayItems[0];
    } else if (activeCinemaTag === "behind") {
      spotlightItem = items.find((it) => it.title.toLowerCase().includes("director") || it.title.toLowerCase().includes("cinematic") || it.category === "creative") || displayItems[0];
    } else {
      spotlightItem = items.find((it) => it.title.toLowerCase().includes("cyberpunk") || it.category === "creative" || it.category === "entertainment") || items[0];
    }

    const spotlightWrapper = $("cinema-featured-spotlight");
    if (spotlightWrapper && spotlightItem) {
      spotlightWrapper.innerHTML = cinemaSpotlight(spotlightItem);
    }

    // Sync pill active state in DOM
    const cinBar = document.querySelector("#cinema-page .cinema-topic-bar");
    if (cinBar) {
      cinBar.querySelectorAll("[data-cinema-tag]").forEach((btn) => {
        const isAct = btn.dataset.cinemaTag === activeCinemaTag;
        btn.classList.toggle("active", isAct);
        btn.setAttribute("aria-selected", String(isAct));
      });
    }

    // Shelf 1: Now Screening Blockbusters
    const premieresGrid = $("cinema-premieres-grid");
    if (premieresGrid) premieresGrid.innerHTML = displayItems.slice(0, 8).map((item) => card(item, query)).join("");

    // Shelf 2: Fantasy & Cinematic Edits Carousel
    const editsTrack = $("cinema-edits-track");
    if (editsTrack) {
      const editItems = items.filter((it) => it.category === "entertainment" || it.category === "creative" || it.title.toLowerCase().includes("animation") || it.title.toLowerCase().includes("dragon") || it.title.toLowerCase().includes("loki"));
      editsTrack.innerHTML = (editItems.length ? editItems : items).map((item) => card(item, query)).join("");
    }

    // Shelf 3: Director's Cut & Visual Mastery
    const studiosGrid = $("cinema-studios-grid");
    if (studiosGrid) studiosGrid.innerHTML = items.slice(0, 6).map((item) => card(item, query)).join("");

    // Shelf 4: Soundtracks & Scores (Interactive Vinyl)
    const soundtracksGrid = $("cinema-soundtracks-grid");
    if (soundtracksGrid) {
      soundtracksGrid.innerHTML = CINEMA_SOUNDTRACKS.map((st) => {
        const isPlaying = activePlayingSoundtrackId === st.id;
        return '<div class="soundtrack-card ' + (isPlaying ? 'is-playing' : '') + '" data-soundtrack-id="' + esc(st.id) + '">' +
          '<div class="soundtrack-vinyl-wrap">' +
            '<div class="vinyl-disc">' +
              '<div class="vinyl-grooves"></div>' +
              '<div class="vinyl-center-art ' + esc(st.art) + '"></div>' +
            '</div>' +
          '</div>' +
          '<div class="soundtrack-info">' +
            '<h4 class="soundtrack-title">' + esc(st.title) + '</h4>' +
            '<span class="soundtrack-composer">' + esc(st.composer) + '</span>' +
            '<div class="soundtrack-spec-row">' +
              '<span class="soundtrack-spec-pill">' + esc(st.format) + '</span>' +
              '<span class="soundtrack-duration">' + esc(st.duration) + '</span>' +
            '</div>' +
          '</div>' +
          '<button type="button" class="soundtrack-play-btn" data-soundtrack-play="' + esc(st.id) + '" aria-label="Play soundtrack preview">' +
            (isPlaying
              ? '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><rect x="6" y="4" width="4" height="16"/><rect x="14" y="4" width="4" height="16"/></svg>'
              : '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 18,12 6,20"/></svg>'
            ) +
          '</button>' +
        '</div>';
      }).join("");
    }

    // Shelf 5: Upcoming Premieres & Live Countdown
    const upcomingGrid = $("cinema-upcoming-grid");
    if (upcomingGrid) {
      const reminders = new Set(readJson("watchbloom-premiere-reminders", []));
      upcomingGrid.innerHTML = CINEMA_UPCOMING.map((up) => {
        const isReminded = reminders.has(up.id);
        return '<div class="upcoming-card ' + esc(up.art) + '">' +
          '<div class="upcoming-top-row">' +
            '<span class="upcoming-badge">' + esc(up.badge) + '</span>' +
            '<span class="upcoming-director">' + esc(up.director) + '</span>' +
          '</div>' +
          '<div>' +
            '<h3 class="upcoming-title">' + esc(up.title) + '</h3>' +
            '<p class="upcoming-desc">' + esc(up.desc) + '</p>' +
          '</div>' +
          '<div class="upcoming-countdown-box">' +
            '<span class="upcoming-countdown-label">PREMIERES IN</span>' +
            '<span class="upcoming-countdown-timer" data-upcoming-timer="' + esc(up.id) + '">' + formatCinemaCountdown(up.targetSeconds) + '</span>' +
          '</div>' +
          '<div class="upcoming-bottom-row">' +
            '<span class="upcoming-release-date">' + esc(up.releaseDate) + '</span>' +
            '<button type="button" class="upcoming-remind-btn ' + (isReminded ? 'is-reminded' : '') + '" data-upcoming-remind="' + esc(up.id) + '" data-upcoming-title="' + esc(up.title) + '">' +
              (isReminded ? '<span>✓ Reminder Set</span>' : '<span>🔔 Remind Me</span>') +
            '</button>' +
          '</div>' +
        '</div>';
      }).join("");
      startCinemaCountdowns();
    }
  } catch (err) {
    console.error("Cinema hub failed", err);
  }
}

async function renderTrending(query = "") {
  const request = ++trendingRequest;
  $("trending-spotlight").innerHTML = trendingState("trendingLoadingTitle", "trendingLoadingText");
  $("trending-reels").innerHTML = trendingState("trendingLoadingTitle", "trendingLoadingText");
  $("trending-videos").innerHTML = trendingState("trendingLoadingTitle", "trendingLoadingText");
  $("trending-reels-count").textContent = "";
  $("trending-videos-count").textContent = "";
  const params = new URLSearchParams({
    type: "video",
    format: "all",
    sort: "popularity",
    duration: "all",
    uploaded: "any",
    category: "all",
    limit: "50",
    offset: "0",
  });
  if (String(query || "").trim()) params.set("q", String(query).trim());

  try {
    const endpoint = String(query || "").trim() ? "/api/v1/search?" : "/api/v1/explore?";
    const response = await fetch(endpoint + params);
    if (!response.ok) throw new Error("Trending request failed: " + response.status);
    const data = await response.json();
    if (request !== trendingRequest || activeView !== "trending") return;
    const items = (Array.isArray(data.results) ? data.results : [])
      .filter((item) => item && item.type === "video")
      .sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    paintTrending(items);
  } catch (error) {
    if (request !== trendingRequest || activeView !== "trending") return;
    console.error("Trending feed failed to load", error);
    $("trending-spotlight").innerHTML = trendingState("trendingErrorTitle", "trendingErrorText", true);
    $("trending-reels").innerHTML = trendingState("trendingErrorTitle", "trendingErrorText");
    $("trending-videos").innerHTML = trendingState("trendingErrorTitle", "trendingErrorText");
  }
}

function reelExtraMarkup(item) {
  const paragraphs = [];
  if (Array.isArray(item.paragraphs)) paragraphs.push(...item.paragraphs);
  if (typeof item.details === "string" && item.details.trim()) paragraphs.push(item.details.trim());
  else if (Array.isArray(item.details)) paragraphs.push(...item.details);
  const textMarkup = paragraphs
    .filter((paragraph) => typeof paragraph === "string" && paragraph.trim())
    .map((paragraph) => '<p class="reel-extra-paragraph">' + esc(paragraph.trim()) + '</p>')
    .join("");
  const links = (Array.isArray(item.links) ? item.links : []).map((entry) => {
    const raw = typeof entry === "string" ? entry : String(entry?.url || entry?.href || "");
    if (!raw) return "";
    let url;
    try { url = new URL(raw, location.href); } catch (error) { return ""; }
    if (!['http:', 'https:'].includes(url.protocol)) return "";
    const label = typeof entry === "object" && entry?.label ? String(entry.label) : raw;
    const external = url.origin !== location.origin;
    return '<a class="reel-extra-link" href="' + esc(url.href) + '"' + (external ? ' target="_blank" rel="noopener noreferrer"' : '') + '>' + esc(label) + ' ↗</a>';
  }).filter(Boolean).join("");
  if (!textMarkup && !links) return "";
  return '<div class="reel-extras">' + textMarkup + (links ? '<div class="reel-extra-links">' + links + '</div>' : '') + '</div>';
}

function reelMenuMarkup(item) {
  const id = esc(item.id); const hasVideo = true;
  return '<div class="reel-menu-wrap"><button type="button" class="reel-menu-toggle" data-reel-menu-toggle aria-label="' + esc(tr("reelMore")) + '" aria-haspopup="menu" aria-expanded="false">⋮</button>' +
    '<div class="reel-menu-popover" data-reel-menu role="menu" hidden>' +
      '<button type="button" role="menuitem" data-reel-menu-action="description">☰ <span>' + esc(tr("reelDescriptionLabel")) + '</span></button>' +
      '<button type="button" role="menuitem" data-reel-menu-action="playlist">♧ <span>' + esc(tr("saveToPlaylist")) + '</span></button>' +
      '<button type="button" role="menuitemcheckbox" data-reel-menu-action="ambient" aria-checked="' + ambientReelIds.has(item.id) + '"><span aria-hidden="true">✧</span><span>' + esc(tr("reelAmbient")) + '</span><span class="reel-menu-state">' + (ambientReelIds.has(item.id) ? '✓' : '') + '</span></button>' +
      '<button type="button" role="menuitem" data-reel-menu-action="captions">CC <span>' + esc(tr("reelCaptions")) + '</span><span class="reel-menu-state">Off ›</span></button>' +
      '<button type="button" role="menuitem" data-reel-menu-action="fullscreen">⛶ <span>' + esc(tr("reelFullScreen")) + '</span></button>' +
      '<label class="reel-speed-row reel-quality-row"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 15V9h2.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H7m7-4v6m0-3h3m0-3v6"/></svg> <span>' + esc(tr("quality")) + '</span><select data-reel-quality aria-label="' + esc(tr("quality")) + '"><option value="auto">Auto</option><option value="2160p">2160p (4K UHD)</option><option value="1440p">1440p (2K QHD)</option><option value="1080p">1080p (Full HD)</option><option value="720p">720p (HD)</option><option value="480p">480p</option><option value="360p">360p</option><option value="240p">240p</option><option value="144p">144p</option></select></label>' +
      '<label class="reel-speed-row">◴ <span>' + esc(tr("playbackSpeed")) + '</span><select data-reel-speed aria-label="' + esc(tr("playbackSpeed")) + '"><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option></select></label>' +
      '<div class="reel-menu-divider" role="separator"></div>' +
      '<button type="button" role="menuitem" data-reel-menu-action="not-interested">⊘ <span>' + esc(tr("reelNotInterested")) + '</span></button>' +
      '<button type="button" role="menuitem" data-reel-menu-action="hide-creator">◎ <span>' + esc(tr("reelHideCreator")) + '</span></button>' +
      '<button type="button" role="menuitem" data-reel-menu-action="report">⚑ <span>' + esc(tr("reelReport")) + '</span></button>' +
      '<button type="button" role="menuitem" data-reel-menu-action="feedback">▢ <span>' + esc(tr("reelSendFeedback")) + '</span></button>' +
    '</div></div>';
}

function closeReelMenus(except = null) {
  document.querySelectorAll("[data-reel-menu]").forEach((menu) => {
    if (menu === except) return;
    menu.hidden = true;
    menu.closest(".reel-menu-wrap")?.querySelector("[data-reel-menu-toggle]")?.setAttribute("aria-expanded", "false");
  });
}

function positionReelMenu(button, menu) {
  menu.hidden = false;
  const rect = button.getBoundingClientRect();
  const menuRect = menu.getBoundingClientRect();
  const left = Math.max(12, Math.min(window.innerWidth - menuRect.width - 12, rect.right - menuRect.width));
  const below = rect.bottom + 8;
  const top = below + menuRect.height <= window.innerHeight - 12 ? below : Math.max(12, rect.top - menuRect.height - 8);
  menu.style.left = left + "px";
  menu.style.top = top + "px";
}

function handleReelMenuAction(button) {
  const slide = button.closest("[data-reel-slide]");
  const id = slide?.dataset.itemId;
  const item = visibleItems.get(id);
  const action = button.dataset.reelMenuAction;
  if (!slide || !id || !item) return;
  closeReelMenus();
  if (action === "description") {
    slide.querySelector(".reel-description")?.scrollIntoView({ behavior: "smooth", block: "center" });
  } else if (action === "playlist" || action === "captions") {
    openDetails(id);
    requestAnimationFrame(() => {
      const content = $("dialog-content");
      if (action === "playlist") {
        content.querySelector('[data-player-action="toggle-playlist"]')?.click();
        content.querySelector("[data-playlist-select]")?.focus();
      } else {
        content.querySelector('[data-player-action="toggle-more"]')?.click();
        content.querySelector("#subtitle-language")?.focus();
      }
    });
  } else if (action === "ambient") {
    const enabled = !ambientReelIds.has(id);
    if (enabled) ambientReelIds.add(id); else ambientReelIds.delete(id);
    writeJson("watchbloom-ambient-reels", Array.from(ambientReelIds));
    slide.classList.toggle("ambient-mode", enabled);
    const menuItem = slide.querySelector('[data-reel-menu-action="ambient"]');
    if (menuItem) {
      menuItem.setAttribute("aria-checked", String(enabled));
      menuItem.querySelector(".reel-menu-state").textContent = enabled ? "✓" : "";
    }
  } else if (action === "fullscreen") {
    const request = slide.querySelector(".reel-frame")?.requestFullscreen?.();
    request?.catch(() => {});
  } else if (action === "not-interested") {
    notInterestedIds.add(id);
    writeJson("watchbloom-not-interested", Array.from(notInterestedIds));
    render(q.value, false);
  } else if (action === "hide-creator") {
    hiddenCreatorKeys.add(creatorKey(item.author));
    writeJson("watchbloom-hidden-creators", Array.from(hiddenCreatorKeys));
    render(q.value, false);
  } else if (action === "report") {
    const reason = window.prompt(tr("reelReportPrompt"));
    if (reason?.trim()) {
      const reports = readJson("watchbloom-reel-reports", []);
      const rows = Array.isArray(reports) ? reports : [];
      rows.push({ itemId: id, author: item.author, reason: reason.trim().slice(0, 300), createdAt: new Date().toISOString() });
      writeJson("watchbloom-reel-reports", rows.slice(-100));
      window.alert(tr("reelReportSaved"));
    }
  } else if (action === "feedback") {
    openCreatorPanel("help");
  }
}

function reelSoundIcon(muted) {
  return '<svg class="reel-sound-svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 10v4h4l5 4V6l-5 4H4Z"/>'
    + (muted ? '<path d="m17 9 5 6m0-6-5 6"/>' : '<path d="M16 9a5 5 0 0 1 0 6m3-9a9 9 0 0 1 0 12"/>')
    + '</svg>';
}

function syncReelSoundUI(slide) {
  const video = slide?.querySelector("[data-reel-video]");
  if (!video) return;
  const muted = video.muted || video.volume === 0;
  slide.querySelectorAll("[data-reel-mute]").forEach((button) => {
    button.setAttribute("aria-pressed", String(!muted));
    button.setAttribute("aria-label", muted ? tr("reelSoundOn") : tr("reelMuteSound"));
    const icon = button.querySelector(".reel-action-icon, .reel-sound-badge-icon");
    if (icon) icon.innerHTML = reelSoundIcon(muted);
    if (button.matches("[data-reel-muted]")) {
      button.hidden = !muted;
      const label = button.querySelector("[data-reel-sound-label]");
      if (label) label.textContent = tr("reelSoundOn");
    }
  });
}

async function playReelVideo(video) {
  if (!video) return;
  video.muted = !reelSoundEnabled;
  syncReelSoundUI(video.closest("[data-reel-slide]"));
  try {
    await video.play();
    const item = visibleItems.get(video.dataset.reelId);
    if (item) rememberViewed(item);
  } catch (error) {
    // Browsers commonly block sound-on autoplay until the viewer interacts.
    // Keep the reel moving silently, then offer a one-tap sound control.
    if (error?.name === "NotAllowedError" && reelSoundEnabled) {
      video.muted = true;
      syncReelSoundUI(video.closest("[data-reel-slide]"));
      try {
        await video.play();
        const item = visibleItems.get(video.dataset.reelId);
        if (item) rememberViewed(item);
      } catch (_) { /* The play button remains available. */ }
    }
  }
}

function toggleReelSound(button) {
  const slide = button.closest("[data-reel-slide]");
  const video = slide?.querySelector("[data-reel-video]");
  if (!video) return;
  video.muted = !video.muted;
  reelSoundEnabled = !video.muted;
  writeJson("watchbloom-reel-sound", reelSoundEnabled);
  syncReelSoundUI(slide);
  if (!video.muted && video.paused) video.play().catch(() => {});
}

function reelPlaybackIcon(isPlaying) {
  return isPlaying
    ? '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="4" width="4" height="16" rx="1.5"></rect><rect x="14" y="4" width="4" height="16" rx="1.5"></rect></svg>'
    : '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M7 4.9c0-.8.9-1.3 1.6-.9l11 7.1a1.1 1.1 0 0 1 0 1.8l-11 7.1c-.7.4-1.6-.1-1.6-.9V4.9Z"></path></svg>';
}
function handleReelVideoError(video) {
  if (!video || video.dataset.retryAttempted === "2") return;
  const reelId = video.dataset.reelId;
  if (!reelId) return;

  if (!video.dataset.retryAttempted) {
    video.dataset.retryAttempted = "1";
    const cleanUrl = prepareMediaUrlForNetwork("/api/media/" + encodeURIComponent(reelId));
    if (video.src !== cleanUrl && !video.src.endsWith(cleanUrl)) {
      video.src = cleanUrl;
      video.load();
      video.play().catch(() => {});
      return;
    }
  }

  video.dataset.retryAttempted = "2";
  const item = typeof visibleItems !== "undefined" ? visibleItems.get(reelId) : null;
  if (item && item.media && typeof item.media === "string") {
    video.src = prepareMediaUrlForNetwork("/api/media/" + encodeURIComponent(item.media));
    video.load();
    video.play().catch(() => {});
  }
}

function reelSlide(item, index) {
  const id = esc(item.id); const hasVideo = true;
  const targetMediaUrl = item.media_url || (item.id ? "/api/media/" + encodeURIComponent(item.id) : "");
  let activeMediaUrl = "";
  if (hasVideo && targetMediaUrl) {
    const isLive = Boolean(item.isLiveVod || item.format === "live" || (typeof item.id === "string" && item.id.startsWith("v_live_")));
    if (!isLive && currentVideoQuality && currentVideoQuality !== "auto") {
      const sep = targetMediaUrl.includes("?") ? "&" : "?";
      activeMediaUrl = targetMediaUrl + sep + "quality=" + encodeURIComponent(currentVideoQuality);
    } else {
      activeMediaUrl = targetMediaUrl;
    }
    activeMediaUrl = prepareMediaUrlForNetwork(activeMediaUrl);
  }

  const media = activeMediaUrl
    ? '<video class="reel-video" data-reel-video data-reel-id="' + id + '" data-quality="' + esc(currentVideoQuality) + '" src="' + esc(activeMediaUrl) + '" onerror="handleReelVideoError(this)" playsinline loop preload="' + (index < 2 ? 'auto' : 'metadata') + '" aria-label="' + esc(item.title) + '"></video>'
    : '<div class="reel-missing ' + art(item) + '"><span>▶</span><strong>' + esc(tr("watchFileMissing")) + '</strong></div>';
  const summary = reactionSummaries.get(item.id) || { likes: 0, reaction: null };
  const liked = summary.reaction === "like";
  const commentCount = localComments(item.id).length;
  const paragraphs = [item.description ? '<p>' + esc(item.description) + '</p>' : "", reelExtraMarkup(item)].filter(Boolean).join("");
  const creator = '<div class="reel-creator">' + creatorIdentity(item.author) + '</div>';
  const creatorBadge = creatorIdentity(item.author, "reel-account-link");
  const itemViews = getItemViews(item);
  const formattedDate = formatUploadDate(item.date);
  return '<article class="reel-slide' + (ambientReelIds.has(item.id) ? ' ambient-mode' : '') + '" data-reel-slide data-item-id="' + id + '"><div class="reel-frame">' + media + '<button class="reel-play-toggle" type="button" data-reel-play aria-label="Play Reel"><span aria-hidden="true">' + reelPlaybackIcon(false) + '</span></button><button class="reel-muted-badge" type="button" data-reel-muted data-reel-mute aria-label="' + esc(tr("reelSoundOn")) + '" hidden><span class="reel-sound-badge-icon" aria-hidden="true">' + reelSoundIcon(true) + '</span><span data-reel-sound-label>' + esc(tr("reelSoundOn")) + '</span></button></div><section class="reel-details" aria-label="Reel details"><p class="reel-eyebrow">' + esc(categoryLabel(item.category)) + ' · <span data-item-views="' + id + '">' + esc(views(itemViews)) + ' ' + esc(tr("plays")) + '</span> · ' + esc(formattedDate) + '</p><div class="reel-title-row"><h2>' + esc(item.title) + '</h2>' + reelMenuMarkup(item) + '</div>' + creator + '<div class="reel-description">' + paragraphs + '</div><button class="reel-open-details" type="button" data-open="' + id + '">' + esc(tr("reelDetails")) + ' <span aria-hidden="true">↗</span></button></section><aside class="reel-actions" aria-label="Reel actions"><button class="reel-action" type="button" data-reaction="like" data-item-id="' + id + '" aria-pressed="' + liked + '" aria-label="' + esc(tr("like")) + '"><span class="reel-action-icon" aria-hidden="true">' + reelActionIcon("like") + '</span><span>' + esc(tr("like")) + '</span><span class="reel-action-count" data-reaction-count="like">' + esc(views(summary.likes)) + '</span></button><button class="reel-action" type="button" data-reel-comments="' + id + '" aria-label="' + esc(tr("comments")) + '"><span class="reel-action-icon" aria-hidden="true">' + reelActionIcon("comments") + '</span><span>' + esc(tr("comments")) + '</span><span class="reel-action-count" data-reel-comment-count="' + id + '">' + esc(views(commentCount)) + '</span></button><button class="reel-action" type="button" data-reel-save="' + id + '" aria-pressed="' + savedIds.has(item.id) + '" aria-label="' + esc(savedIds.has(item.id) ? tr("removeWatchLater") : tr("watchLater")) + '"><span class="reel-action-icon" aria-hidden="true">' + reelActionIcon(savedIds.has(item.id) ? "saved" : "save") + '</span><span>' + esc(tr("watchLater")) + '</span></button><button class="reel-action" type="button" data-reel-share="' + id + '" aria-label="' + esc(tr("share")) + '"><span class="reel-action-icon" aria-hidden="true">' + reelActionIcon("share") + '</span><span data-reel-share-label>' + esc(tr("share")) + '</span></button>' + creatorBadge + '</aside></article>';
}

function pauseReelFeed(root = document) {
  root.querySelectorAll("[data-reel-video]").forEach((video) => video.pause());
  if (activeReelVideo && root.contains(activeReelVideo)) activeReelVideo = null;
}

function resumeReelFeed() {
  const feed = results.querySelector(".reel-feed");
  if (!feed) return;
  const slide = Array.from(feed.querySelectorAll("[data-reel-slide]")).sort((a, b) => {
    const ar = a.getBoundingClientRect(); const br = b.getBoundingClientRect();
    return Math.abs(ar.top) - Math.abs(br.top);
  })[0];
  const video = slide?.querySelector("[data-reel-video]");
  if (video) { activeReelVideo = video; playReelVideo(video); }
}

function mountReelFeed(feed = results.querySelector(".reel-feed"), owner = "main") {
  const previousObserver = owner === "home" ? homeReelObserver : reelObserver;
  if (previousObserver) previousObserver.disconnect();
  if (!feed) return;
  if (owner === "main" && feed.dataset.scrollBound !== "true") {
    feed.dataset.scrollBound = "true";
    feed.addEventListener("scroll", closeReelMenus, { passive: true });
    feed.addEventListener("scroll", () => {
      if (!$('more').hidden && feed.dataset.loading !== "true" && feed.scrollTop + feed.clientHeight >= feed.scrollHeight - feed.clientHeight * 0.8) {
        feed.dataset.loading = "true";
        render(q.value, true);
      }
    }, { passive: true });
  }
  const slides = Array.from(feed.querySelectorAll("[data-reel-slide]"));
  slides.forEach((slide) => {
    const video = slide.querySelector("[data-reel-video]");
    if (!video || video.dataset.reelBound) return;
    video.dataset.reelBound = "true";
    video.playbackRate = Number(reelPlaybackRates[slide.dataset.itemId]) || 1;
    video.dataset.quality = currentVideoQuality;
    video.addEventListener("play", () => {
      slide.classList.add("is-playing");
      const button = slide.querySelector("[data-reel-play]");
      if (button) { button.setAttribute("aria-label", "Pause Reel"); button.firstElementChild.innerHTML = reelPlaybackIcon(true); }
    });
    video.addEventListener("pause", () => {
      slide.classList.remove("is-playing");
      const button = slide.querySelector("[data-reel-play]");
      if (button) { button.setAttribute("aria-label", "Play Reel"); button.firstElementChild.innerHTML = reelPlaybackIcon(false); }
    });
    video.addEventListener("volumechange", () => syncReelSoundUI(slide));
    video.addEventListener("click", () => { if (video.paused) playReelVideo(video); else video.pause(); });
    syncReelSoundUI(slide);
  });
  if (!('IntersectionObserver' in window)) {
    const firstVideo = slides[0]?.querySelector("[data-reel-video]");
    if (firstVideo) { activeReelVideo = firstVideo; playReelVideo(firstVideo); }
    return;
  }
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      const slide = entry.target;
      const video = slide.querySelector("[data-reel-video]");
      if (entry.isIntersecting && entry.intersectionRatio >= 0.6) {
        if (video && video !== activeReelVideo) {
          document.querySelectorAll("[data-reel-video]").forEach((other) => { if (other !== video) other.pause(); });
          activeReelVideo = video;
          playReelVideo(video);
        }
        if (!reactionSummaries.has(slide.dataset.itemId)) loadReactionSummary(slide.dataset.itemId);
      } else if (video && video === activeReelVideo && entry.intersectionRatio < 0.35) {
        video.pause();
        activeReelVideo = null;
      }
    });
  }, { root: feed, threshold: [0.35, 0.6, 0.85] });
  slides.forEach((slide) => observer.observe(slide));
  if (owner === "home") homeReelObserver = observer;
  else reelObserver = observer;
}

function paintHomeShorts(items, state = "ready") {
  const track = $("home-shorts-track");
  items = items.filter((item) => !notInterestedIds.has(item.id) && !hiddenCreatorKeys.has(creatorKey(item.author)));
  if (homeReelObserver) { homeReelObserver.disconnect(); homeReelObserver = null; }
  track.querySelectorAll("[data-reel-video]").forEach((video) => video.pause());
  if (state === "loading") {
    track.innerHTML = '<div class="shorts-shelf-empty"><span class="shorts-feature-mark" aria-hidden="true">' + REELS_ICON + '</span><div class="shorts-shelf-empty-copy"><strong>' + esc(tr("shortsShelfTitle")) + '</strong><p>' + esc(tr("shortsShelfLoading")) + '</p></div></div>';
  } else if (state === "error") {
    track.innerHTML = '<div class="shorts-shelf-empty"><span class="shorts-feature-mark" aria-hidden="true">↻</span><div class="shorts-shelf-empty-copy"><strong>' + esc(tr("shortsShelfTitle")) + '</strong><p>' + esc(tr("shortsShelfError")) + '</p></div><button type="button" data-retry-shorts>' + esc(tr("shortsSeeAll")) + '</button></div>';
  } else if (!items.length) {
    track.innerHTML = '<div class="shorts-shelf-empty"><span class="shorts-feature-mark" aria-hidden="true">' + REELS_ICON + '</span><div class="shorts-shelf-empty-copy"><strong>' + esc(tr("shortsShelfEmptyTitle")) + '</strong><p>' + esc(tr("shortsShelfEmptyText")) + '</p></div><button type="button" data-create-short>' + esc(tr("shortsShelfCreate")) + '</button></div>';
  } else {
    track.innerHTML = items.slice(0, 8).map(shortShelfCard).join("");
  }
}

async function refreshHomeShortsShelf(query) {
  const section = $("home-shorts");
  const shouldShow = (activeView === "home" || activeView === "explore") && !String(query || "").trim();
  section.hidden = !shouldShow;
  const request = ++homeShortsRequest;
  if (!shouldShow) {
    if (homeReelObserver) { homeReelObserver.disconnect(); homeReelObserver = null; }
    section.querySelectorAll("[data-reel-video]").forEach((video) => video.pause());
    return;
  }

  const params = new URLSearchParams({
    type: "video",
    format: "all",
    sort: $("sort").value,
    duration: $("duration").value,
    uploaded: $("uploaded").value,
    category: activeCategory,
    limit: "50",
    offset: "0",
  });
  const key = params.toString();
  if (homeShortsCache?.key === key) {
    paintHomeShorts(homeShortsCache.items);
    return;
  }
  paintHomeShorts([], "loading");
  try {
    const response = await fetch("/api/v1/explore?" + key);
    if (!response.ok) throw new Error("Shorts request failed");
    const data = await response.json();
    if (request !== homeShortsRequest) return;
    const items = (data.results || []).filter((item) => item.type === "video" && ["short", "reel"].includes(String(item.format || "").toLowerCase()));
    items.forEach((item) => visibleItems.set(item.id, item));
    homeShortsCache = { key, items };
    paintHomeShorts(items);
  } catch (error) {
    if (request === homeShortsRequest) paintHomeShorts([], "error");
  }
}

function updateSaved() {
  $("saved-count").textContent = savedIds.size;
  const heroSaved = $("hero-saved-count");
  if (heroSaved) heroSaved.textContent = savedIds.size;
}
function updateLiked() {
  const el = $("liked-count");
  if (el) el.textContent = likedIds.size;
  const heroLiked = $("hero-liked-count");
  if (heroLiked) heroLiked.textContent = likedIds.size;
}
function updateFollowing() {
  $("following-count").textContent = followedCreators.size;
  const heroFollowing = $("hero-following-count");
  if (heroFollowing) heroFollowing.textContent = followedCreators.size;
}

function showRecent() {
  const history = readJson("watchbloom-recent", []).filter((value) => typeof value === "string").slice(0, 5);
  const box = $("recent");
  if (!history.length) { box.classList.remove("visible"); box.innerHTML = ""; return; }
  box.classList.add("visible");
  box.innerHTML = '<span class="recent-label">' + esc(tr("recent")) + '</span>' + history.map((value) => '<button class="recent-chip" type="button" data-recent="' + esc(value) + '">' + esc(value) + '</button>').join("") + '<button class="recent-clear" type="button" data-clear-recent>' + esc(tr("clear")) + '</button>';
}

function remember(value) {
  value = String(value || "").trim();
  if (!value) return;
  const history = readJson("watchbloom-recent", []).filter((entry) => entry !== value);
  history.unshift(value);
  writeJson("watchbloom-recent", history.slice(0, 5));
  showRecent();
}

function buildUrlHashFromState(state = {}) {
  const params = new URLSearchParams();
  const currentView = state.view || activeView || "home";
  const currentCategory = state.category !== undefined ? state.category : activeCategory;
  const currentQ = state.q !== undefined ? state.q : q.value.trim();

  if (currentQ) params.set("q", currentQ);
  params.set("view", currentView);
  if (currentCategory && currentCategory !== "all") params.set("category", currentCategory);
  if ($("sort")?.value && $("sort").value !== "relevance") params.set("sort", $("sort").value);
  if ($("duration")?.value && $("duration").value !== "all") params.set("duration", $("duration").value);
  if ($("uploaded")?.value && $("uploaded").value !== "any") params.set("uploaded", $("uploaded").value);

  if (state.type === "video" && state.id) {
    params.set("v", state.id);
  } else if (state.type === "channel" && state.author) {
    params.set("channel", state.author);
    if (state.tab && state.tab !== "home") params.set("tab", state.tab);
  } else if (state.type === "panel" && state.action) {
    params.set("panel", state.action);
  }
  return "#" + params.toString();
}

function currentWindowSnapshot() {
  if ($("creator-dialog")?.open) {
    if ($("creator-dialog").dataset.profileEditor === "true") {
      return { type: "panel", action: "profile" };
    }
    if ($("creator-dialog").dataset.channelOpen === "true" && $("creator-dialog").dataset.channelAuthor) {
      return {
        type: "channel",
        author: $("creator-dialog").dataset.channelAuthor,
        tab: $("creator-dialog").dataset.channelTab || "home"
      };
    }
    return {
      type: "panel",
      action: $("creator-dialog").dataset.creatorAction || "create"
    };
  }
  if ($("detail-dialog")?.open && $("detail-dialog").dataset.itemId) {
    return {
      type: "video",
      id: $("detail-dialog").dataset.itemId
    };
  }
  return {
    type: "feed",
    view: activeView || "home",
    category: activeCategory || "all",
    q: q.value.trim()
  };
}

function syncUrl() {
  if (isNavigatingHistory) return;
  const snapshot = currentWindowSnapshot();
  const hash = buildUrlHashFromState(snapshot);
  try {
    history.replaceState(snapshot, "", hash);
  } catch (e) {
    location.hash = hash;
  }
}

function pushWindowHistory(state) {
  if (isNavigatingHistory) return;
  const last = windowNavStack[windowNavStack.length - 1];
  if (last && last.type === state.type && last.id === state.id && last.author === state.author && last.tab === state.tab && last.action === state.action && last.view === state.view) {
    return;
  }
  const entry = { ...state, navIdx: windowNavStack.length };
  windowNavStack.push(entry);
  const hash = buildUrlHashFromState(entry);
  try {
    history.pushState(entry, "", hash);
  } catch (e) {
    location.hash = hash;
  }
}

let lastBackNavigationTime = 0;
function handleWindowBack() {
  const now = Date.now();
  if (now - lastBackNavigationTime < 250) return;
  lastBackNavigationTime = now;
  if (windowNavStack.length > 1) {
    window.history.back();
    return;
  }
  fallbackWindowBack();
}

function fallbackWindowBack() {
  if ($("creator-dialog")?.open) {
    $("creator-dialog").close();
    syncUrl();
    return;
  }
  if ($("detail-dialog")?.open) {
    $("detail-dialog").close();
    syncUrl();
    return;
  }
  if (activeView !== "home") {
    setView("home");
  }
}

function applyWindowState(state) {
  if (!state) {
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    return;
  }
  if (state.type === "video" && state.id) {
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    openDetails(state.id, true);
  } else if (state.type === "channel" && state.author) {
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    openCreatorChannel(state.author, state.tab || "home", true);
  } else if (state.type === "panel") {
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    if (state.action === "profile") openProfileEditor(true);
    else if (state.action === "studio") openCreatorStudio(state.tab || "dashboard", true);
    else openCreatorPanel(state.action || "create", true);
  } else {
    // feed
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    if (state.view && VIEWS.includes(state.view) && state.view !== activeView) {
      setView(state.view, true, true);
    }
    if (state.category && state.category !== activeCategory) {
      setCategory(state.category, false);
    }
    if (state.q !== undefined && state.q !== q.value) {
      q.value = state.q;
      render(q.value, false);
    }
  }
}

function parseHashAndApply() {
  const hash = location.hash.slice(1);
  if (!hash) {
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    if (activeView !== "home") setView("home", true, true);
    return;
  }
  const params = new URLSearchParams(hash);
  const videoId = params.get("v") || params.get("video");
  const channelName = params.get("channel");
  const channelTab = params.get("tab") || "home";
  const panel = params.get("panel");
  const view = params.get("view");
  const category = params.get("category");
  const query = params.get("q");

  if (videoId) {
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    openDetails(videoId, true);
  } else if (channelName) {
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    openCreatorChannel(channelName, channelTab, true);
  } else if (panel) {
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    if (panel === "profile") openProfileEditor(true);
    else if (panel === "studio") openCreatorStudio(params.get("tab") || "dashboard", true);
    else openCreatorPanel(panel, true);
  } else {
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    if ($("detail-dialog")?.open) $("detail-dialog").close();
    if (view && VIEWS.includes(view) && view !== activeView) {
      setView(view, true, true);
    }
    if (category && category !== activeCategory) {
      setCategory(category, false);
    }
    if (query !== null && query !== undefined && query !== q.value) {
      q.value = query;
      render(q.value, false);
    }
  }
}

window.addEventListener("popstate", (event) => {
  isNavigatingHistory = true;
  try {
    if (event.state && typeof event.state.navIdx === "number") {
      windowNavStack = windowNavStack.slice(0, event.state.navIdx + 1);
    } else if (windowNavStack.length > 1) {
      windowNavStack.pop();
    }
    const targetState = event.state || windowNavStack[windowNavStack.length - 1];
    if (targetState) {
      applyWindowState(targetState);
    } else {
      parseHashAndApply();
    }
  } finally {
    isNavigatingHistory = false;
  }
});

function emptyFor(query) {
  if (activeView === "history" && !query.trim()) return empty(tr("historyEmptyTitle"), tr("historyEmptyText"), "◷");
  if (activeView === "reels" && !query.trim()) return empty(tr("emptyShortsTitle"), tr("emptyShortsText"), REELS_ICON) + '<button class="empty-short-action" type="button" data-create-short>' + esc(tr("createShortAction")) + '</button>';
  if (activeView === "saved" && !savedIds.size) return empty(tr("noSavedTitle"), tr("noSavedText"), "☆");
  if (activeView === "liked" && !likedIds.size) return empty(tr("noLikedTitle"), tr("noLikedText"), "👍");
  if (activeView === "following" && !followedCreators.size) return empty(tr("noFollowingTitle"), tr("noFollowingText"), "♡");
  if (activeView === "following") return empty(tr("noFollowingItemsTitle"), tr("noFollowingItemsText"), "♡");
  if (query.trim()) return empty(tr("noResultsTitle"), tr("noResultsText"), "⌕");
  if (activeCategory !== "all") {
    return empty(tr("emptyCategoryTitle").replace("{category}", categoryLabel(activeCategory)), tr("emptyCategoryText"), "✦");
  }
  return empty(tr("noItemsTitle"), tr("noItemsText"), "✦");
}

async function render(query, append) {
  const my = ++requestSeq;
  const discoverView = DISCOVER_VIEWS[activeView];
  const reelsView = activeView === "reels";
  document.body.classList.toggle("reels-view", reelsView);
  document.body.classList.toggle("following-view", activeView === "following");
  if (!reelsView) {
    if (reelObserver) { reelObserver.disconnect(); reelObserver = null; }
    pauseReelFeed(results);
  }
  refreshHomeShortsShelf(query);
  results.classList.toggle("shorts-feed", reelsView);
  if (activeView === "trending") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderTrending(query);
    return;
  }
  if (activeView === "gamers") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderGamersHub(query);
    return;
  }
  if (activeView === "headlines") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderHeadlinesHub(query);
    return;
  }
  if (activeView === "music") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderMusicHub(query);
    return;
  }
  if (activeView === "courses") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderCoursesHub(query);
    return;
  }
  if (activeView === "cinema") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderCinemaHub(query);
    return;
  }
  if (activeView === "settings") {
    results.setAttribute("aria-busy", "false");
    $("more").hidden = true;
    $("more").disabled = false;
    $("count").textContent = "";
    $("catalog-size").textContent = "";
    renderSettingsHub();
    return;
  }
  const isAppend = Boolean(append);
  const pageOffset = isAppend ? nextOffset : 0;
  results.setAttribute("aria-busy", "true");
  $("more").disabled = true;
  if (!isAppend) {
    nextOffset = 0;
  }
  $("clear-search").hidden = !q.value.trim();
  const savedView = activeView === "saved";
  const likedView = activeView === "liked";
  const historyView = activeView === "history";
  const followingView = activeView === "following";
  const localPlaylistCount = activeView === "playlists" && !query.trim() ? localPlaylists.length : 0;
  const limit = savedView || likedView || followingView || reelsView || historyView ? 100 : PAGE_SIZE;
  const offset = savedView || likedView || followingView || historyView ? 0 : Math.max(0, pageOffset - localPlaylistCount);
  const params = new URLSearchParams({
    type: discoverView?.type || (activeView === "videos" || activeView === "reels" ? "video" : activeView === "playlists" ? "playlist" : "all"),
    sort: $("sort").value,
    duration: $("duration").value,
    uploaded: $("uploaded").value,
    category: discoverView?.category || (savedView ? "all" : activeCategory),
    limit: String(limit),
    offset: String(offset),
  });
  if (reelsView) params.set("format", "reel");
  if (activeView === "videos") params.set("format", "video");
  const searching = Boolean(query.trim());
  if (searching) params.set("q", query.trim());

  try {
    const endpoint = (searching ? "/api/v1/search" : "/api/v1/explore") + "?";
    let data;
    let catalog = [];
    if (historyView) {
      let rows = loadWatchHistory().map((row) => ({ ...row.item, viewedAt: row.viewedAt }));
      if (searching) {
        const needle = norm(query).trim();
        rows = rows.filter((item) => norm([item.title, item.author, item.description, item.tags].join(" ")).includes(needle));
      }
      data = { results: rows, total: rows.length };
    } else if (followingView) {
      const response = await fetch("/api/v1/channels?sort=popularity&limit=50");
      if (!response.ok) throw new Error("Creator list request failed");
      data = await response.json();
      (data.results || []).forEach((channel) => creatorCatalog.set(creatorKey(channel.name), channel));
    } else if (likedView) {
      try {
        const response = await fetch("/api/v1/liked", {
          headers: { "X-Watchbloom-Visitor": visitorId },
          cache: "no-store",
        });
        if (response.ok) {
          data = await response.json();
          if (Array.isArray(data.results)) {
            likedIds.clear();
            data.results.forEach((item) => likedIds.add(item.id));
            writeJson("watchbloom-liked", Array.from(likedIds));
            updateLiked();
          }
        } else {
          throw new Error("Liked list request failed");
        }
      } catch (err) {
        const localRows = Array.from(likedIds).map((id) => visibleItems.get(id)).filter(Boolean);
        data = { results: localRows, total: localRows.length };
      }
    } else {
      const response = await fetch(endpoint + params);
      if (!response.ok) throw new Error("Request failed");
      data = await response.json();
    }
    if (my !== requestSeq) return;
    let total = data.total || 0;
    let list = historyView ? (data.results || []) : followingView ? (data.results || []).filter((channel) => followedCreators.has(creatorKey(channel.name))) : (data.results || []);
    if (followingView && searching) list = list.filter((channel) => norm(channel.name).includes(norm(query).trim()));
    if (followingView && activeCategory !== "all") list = list.filter((channel) => Array.isArray(channel.categories) && channel.categories.includes(activeCategory));
    if (followingView && $("sort").value === "popularity") list.sort((a, b) => (Number(b.views) || 0) - (Number(a.views) || 0));
    else if (followingView && $("sort").value === "newest") list.sort((a, b) => String(a.name).localeCompare(String(b.name)));
    if (historyView) {
      total = list.length;
    }
    if (reelsView && !searching) {
      list = list.filter((item) => !notInterestedIds.has(item.id) && !hiddenCreatorKeys.has(creatorKey(item.author)));
    }
    if (followingView) total = list.length;
    if (reelsView) {
      list = list.filter((item) => item.type === "video" && (item.format === "short" || item.format === "reel"));
      total = list.length;
    }
    if (activeView === "videos") {
      list = list.filter((item) => !isReelItem(item));
      total = list.length;
    }
    if (savedView) {
      list = list.filter((item) => savedIds.has(item.id));
      total = list.length;
      list = list.slice(pageOffset, pageOffset + PAGE_SIZE);
    } else if (likedView) {
      if (searching) {
        const needle = norm(query).trim();
        list = list.filter((item) => norm([item.title, item.author, item.description, item.tags].join(" ")).includes(needle));
      }
      total = list.length;
    } else if (followingView) {
      list = list.slice(pageOffset, pageOffset + PAGE_SIZE);
    }
    if (activeView === "home" && !searching && homeShuffleSeed > 0) {
      // Seeded-feeling rotation so each home click yields freshly ordered new videos
      const shift = homeShuffleSeed % list.length;
      list = [...list.slice(shift), ...list.slice(0, shift)];
    }
    const localRows = !isAppend && localPlaylistCount ? localPlaylists.map((playlist) => {
      const children = playlist.items.map((itemId) => visibleItems.get(itemId)).filter(Boolean);
      return {
        id: playlist.id, type: "playlist", title: playlist.title, author: "You",
        tags: "your saved videos personal playlist", mins: children.reduce((sum, child) => sum + (Number(child.mins) || 0), 0),
        description: "Your personal playlist, saved in this browser.", views: 0,
        date: new Date().toISOString().slice(0, 10), art: children[0]?.art || "aqua",
        category: children[0]?.category || "learning", featured: 0,
        items: playlist.items.slice(), playlist_items: children, localPlaylist: true,
      };
    }) : [];
    if (localRows.length) { list = [...list, ...localRows]; total += localRows.length; }
    if (!list.length) {
      if (!isAppend) results.innerHTML = likedView ? renderLikedView([], query) : historyView ? renderHistoryView([], query) : emptyFor(query);
      $("more").hidden = true;
      $("more").disabled = false;
      $("count").textContent = "";
      $("catalog-size").textContent = savedView ? savedIds.size + " " + tr("savedCount") : likedView ? likedIds.size + " " + tr("likedCountSuffix") : total + " " + tr("inView");
      results.setAttribute("aria-busy", "false");
      return;
    }
    list.forEach((item) => {
      visibleItems.set(item.id, item);
      (item.playlist_items || []).forEach((child) => visibleItems.set(child.id, child));
    });
    if (reelsView) {
      const cards = list.map((item, index) => reelSlide(item, pageOffset + index)).join("");
      let feed = results.querySelector(".reel-feed");
      if (isAppend && feed) feed.insertAdjacentHTML("beforeend", cards);
      else results.innerHTML = '<div class="reel-feed" aria-label="Scroll through Reels">' + cards + '</div>';
      feed = results.querySelector(".reel-feed");
      if (feed) feed.dataset.loading = "false";
      if (pendingReelId && feed) {
        const selectedSlide = Array.from(feed.querySelectorAll("[data-reel-slide]"))
          .find((slide) => slide.dataset.itemId === pendingReelId);
        if (selectedSlide) {
          feed.scrollTop += selectedSlide.getBoundingClientRect().top - feed.getBoundingClientRect().top;
          pendingReelId = null;
        }
      }
      mountReelFeed();
    } else if (likedView) {
      results.innerHTML = renderLikedView(list, query);
    } else if (historyView) {
      results.innerHTML = renderHistoryView(list, query);
    } else {
      const cards = followingView ? list.map(followedCreatorCard).join("") : list.map((item) => card(item, data.corrected_query || query)).join("");
      if (isAppend) results.insertAdjacentHTML("beforeend", cards);
      else results.innerHTML = cards;
      if (followingView) bindCreatorControls(results);
    }
    nextOffset = pageOffset + list.length;
    $("more").hidden = (likedView || historyView) ? true : nextOffset >= total;
    const note = (data.corrected_query ? tr("corrected").replace("{query}", data.corrected_query) : "") + (data.partial ? tr("partial") : "");
    $("count").textContent = followingView ? tr("creatorResults").replace("{shown}", nextOffset).replace("{total}", total) : note + tr("searchResults").replace("{shown}", nextOffset).replace("{total}", total).replace("{plural}", total === 1 ? "" : "s");
    $("catalog-size").textContent = savedView ? savedIds.size + " " + tr("savedCount") : likedView ? likedIds.size + " " + tr("likedCountSuffix") : followingView ? total + " " + tr("creators") : total + " " + tr("inView");
    $("more").disabled = false;
    results.setAttribute("aria-busy", "false");
  } catch (error) {
    if (my !== requestSeq) return;
    if (!isAppend) results.innerHTML = empty(tr("connectionTitle"), tr("connectionText"), "↻");
    results.querySelector(".reel-feed")?.setAttribute("data-loading", "false");
    $("count").textContent = isAppend ? tr("couldNotLoad") : "";
    $("more").disabled = false;
    results.setAttribute("aria-busy", "false");
  }
}

async function showSuggestions() {
  const my = ++suggestionSeq;
  const query = q.value.trim();
  if (!query) { suggestions.hidden = true; q.setAttribute("aria-expanded", "false"); suggestionItems = []; return; }
  let list = [];
  try {
    const response = await fetch("/api/v1/suggestions?q=" + encodeURIComponent(query));
    if (response.ok) list = (await response.json()).suggestions || [];
  } catch (error) { /* suggestions are optional */ }
  if (my !== suggestionSeq) return;
  suggestionItems = list;
  suggestions.hidden = !list.length;
  q.setAttribute("aria-expanded", String(Boolean(list.length)));
  suggestions.innerHTML = list.map((item, index) => '<li role="option" id="suggestion-' + index + '" aria-selected="false" data-suggestion="' + index + '"><span>' + hl(item.text, query) + '</span><small>' + esc(item.type === "video" ? tr("video") : tr("playlist")) + '</small></li>').join("");
  activeSuggestion = -1;
}

function markSuggestion(index) {
  activeSuggestion = index;
  Array.from(suggestions.children).forEach((element, i) => element.setAttribute("aria-selected", String(i === index)));
  if (index >= 0) q.setAttribute("aria-activedescendant", "suggestion-" + index);
  else q.removeAttribute("aria-activedescendant");
}

function closeSuggestions() {
  suggestions.hidden = true;
  q.setAttribute("aria-expanded", "false");
  q.removeAttribute("aria-activedescendant");
}

let dialogSearchTimer = null;
let dialogSuggestionSeq = 0;
let dialogSuggestionItems = [];
let activeDialogSuggestion = -1;

async function showDialogSuggestions(input) {
  if (!input) return;
  const wrap = input.closest(".dialog-search-wrap");
  if (!wrap) return;
  const listEl = wrap.querySelector("[data-dialog-suggestions]");
  if (!listEl) return;
  const my = ++dialogSuggestionSeq;
  const query = input.value.trim();
  if (!query) {
    listEl.hidden = true;
    input.setAttribute("aria-expanded", "false");
    dialogSuggestionItems = [];
    activeDialogSuggestion = -1;
    return;
  }
  let list = [];
  try {
    const response = await fetch("/api/v1/suggestions?q=" + encodeURIComponent(query));
    if (response.ok) list = (await response.json()).suggestions || [];
  } catch (error) { /* suggestions are optional */ }
  if (my !== dialogSuggestionSeq) return;
  dialogSuggestionItems = list;
  listEl.hidden = !list.length;
  input.setAttribute("aria-expanded", String(Boolean(list.length)));
  listEl.innerHTML = list.map((item, index) =>
    '<li role="option" id="dialog-suggestion-' + index + '" aria-selected="false" data-dialog-suggestion="' + index + '"><span>' + hl(item.text, query) + '</span><small>' + esc(item.type === "video" ? tr("video") : tr("playlist")) + '</small></li>'
  ).join("");
  activeDialogSuggestion = -1;
}

function markDialogSuggestion(wrap, index) {
  if (!wrap) return;
  const listEl = wrap.querySelector("[data-dialog-suggestions]");
  const input = wrap.querySelector("[data-dialog-search-input]");
  if (!listEl || !input) return;
  activeDialogSuggestion = index;
  Array.from(listEl.children).forEach((element, i) => element.setAttribute("aria-selected", String(i === index)));
  if (index >= 0) input.setAttribute("aria-activedescendant", "dialog-suggestion-" + index);
  else input.removeAttribute("aria-activedescendant");
}

function closeDialogSuggestions() {
  document.querySelectorAll("[data-dialog-suggestions]").forEach((listEl) => {
    listEl.hidden = true;
    listEl.innerHTML = "";
  });
  document.querySelectorAll("[data-dialog-search-input]").forEach((input) => {
    input.setAttribute("aria-expanded", "false");
    input.removeAttribute("aria-activedescendant");
  });
  dialogSuggestionItems = [];
  activeDialogSuggestion = -1;
}

function go(value) {
  if ($("detail-dialog")?.open) $("detail-dialog").close();
  if ($("creator-dialog")?.open) $("creator-dialog").close();
  closeDialogSuggestions();
  q.value = value;
  closeSuggestions();
  remember(value);
  pushWindowHistory({ type: "feed", view: activeView, q: value });
  render(value, false);
}

function setView(view, shouldRender = true, fromHistory = false) {
  if ($("detail-dialog")?.open) $("detail-dialog").close();
  if ($("creator-dialog")?.open) $("creator-dialog").close();
  closeAccountMenu();
  closeNotificationPopover();
  if (view === "shorts") view = "reels";
  activeNavView = view;
  if (!VIEWS.includes(view)) { view = "home"; activeNavView = "home"; }
  activeView = view;
  if (view === "liked") activeLikedSubFilter = "all";
  if (view === "history") currentHistoryFilter = "all";
  if (view !== "cinema") stopCinemaSoundtrack();
  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "feed", view });
  }
  if (view === "trending") $("sort").value = "popularity";
  const discoverView = DISCOVER_VIEWS[view];
  if (discoverView) {
    activeCategory = discoverView.category;
    clearTimeout(searchTimer);
    suggestionSeq += 1;
    q.value = "";
    $("clear-search").hidden = true;
    closeSuggestions();
  } else {
    // For Your space views (home, explore, reels, videos, playlists, history, following, saved),
    // reset activeCategory to "all" so catalog videos are never filtered out by a previous discover view
    activeCategory = "all";
    if (view === "history") {
      clearTimeout(searchTimer);
      suggestionSeq += 1;
      q.value = "";
      $("clear-search").hidden = true;
      closeSuggestions();
    }
  }
  setCategory(activeCategory, false);
  document.body.classList.toggle("reels-view", view === "reels");
  document.body.classList.toggle("following-view", view === "following");
  document.querySelectorAll("[data-view]").forEach((button) => {
    const selected = button.classList.contains("nav-link") ? button.dataset.view === activeNavView : button.dataset.view === view || (Boolean(discoverView) && button.classList.contains("view-tab") && button.dataset.view === "explore");
    button.classList.toggle("active", selected);
    if (button.classList.contains("nav-link")) button.setAttribute("aria-current", selected ? "page" : "false");
  });
  updateViewCopy();
  closeNavigation();

  // Always scroll smoothly to top - NEVER jump down
  window.scrollTo({ top: 0, behavior: "smooth" });

  if (view === "home") {
    // When Home is clicked, refresh videos with fresh shuffle and clear shorts cache
    homeShuffleSeed++;
    homeShortsCache = null;
    homeShortsRequest++;
    requestSeq++;
    nextOffset = 0;
    const refreshIcon = document.querySelector("#home-refresh-cta .refresh-icon");
    if (refreshIcon) {
      refreshIcon.classList.remove("refresh-spin-active");
      void refreshIcon.offsetWidth;
      refreshIcon.classList.add("refresh-spin-active");
    }
    render(q.value, false);
    syncUrl();
    return;
  }

  if (shouldRender) {
    render(q.value, false);
    syncUrl();
  }
}

function toggleNavigation() {
  const sidebar = $("sidebar");
  const overlay = $("nav-overlay");
  const open = !sidebar.classList.contains("open");
  sidebar.classList.toggle("open", open);
  overlay.hidden = !open;
  overlay.classList.toggle("visible", open);
  const detailDialog = $("detail-dialog");
  const creatorDialog = $("creator-dialog");
  let toggle = $("menu-toggle");
  if (detailDialog && detailDialog.contains(sidebar)) {
    toggle = $("dialog-content")?.querySelector(".dialog-menu-toggle") || toggle;
  } else if (creatorDialog && creatorDialog.contains(sidebar)) {
    toggle = $("creator-dialog-content")?.querySelector(".dialog-menu-toggle") || toggle;
  }
  if (toggle) toggle.setAttribute("aria-expanded", String(open));
}

function closeNavigation() {
  $("sidebar").classList.remove("open");
  $("nav-overlay").classList.remove("visible");
  $("nav-overlay").hidden = true;
  document.querySelectorAll("#menu-toggle, .dialog-menu-toggle").forEach((button) => button.setAttribute("aria-expanded", "false"));
}

function moveNavigationIntoDialog(dialog) {
  if (!dialog) return;
  const sidebar = $("sidebar");
  const overlay = $("nav-overlay");
  if (sidebar.parentElement !== dialog) {
    dialog.appendChild(overlay);
    dialog.appendChild(sidebar);
  }
  closeNavigation();
}

function restorePopoversFromDialog(dialog) {
  const menu = $("account-menu");
  const panel = $("notification-popover");
  const toast = $("follow-toast");
  const topbarAccountControl = document.querySelector(".topbar .account-control");
  const topbarNotificationControl = document.querySelector(".topbar .notification-control");
  if (menu && topbarAccountControl && menu.parentElement !== topbarAccountControl) {
    topbarAccountControl.appendChild(menu);
  }
  if (panel && topbarNotificationControl && panel.parentElement !== topbarNotificationControl) {
    topbarNotificationControl.appendChild(panel);
  }
  if (toast && toast.parentElement !== document.body) {
    document.body.appendChild(toast);
  }
  if (menu) {
    menu.hidden = true;
    document.querySelectorAll("#account-menu-toggle, [data-dialog-account-toggle]").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
  }
  if (panel) {
    panel.hidden = true;
    document.querySelectorAll("#notification-toggle, [data-dialog-notification-toggle]").forEach((btn) => {
      btn.setAttribute("aria-expanded", "false");
    });
  }
}

function restoreNavigationFromDialog(dialog) {
  restorePopoversFromDialog(dialog);
  const sidebar = $("sidebar");
  if (!dialog || !dialog.contains(sidebar)) return;
  const shell = document.querySelector(".app-shell");
  shell.insertBefore(sidebar, shell.querySelector(".main"));
  document.body.insertBefore($("nav-overlay"), shell);
  closeNavigation();
}

function moveNavigationIntoPlayer() {
  moveNavigationIntoDialog($("detail-dialog"));
}

function restoreNavigationFromPlayer() {
  restoreNavigationFromDialog($("detail-dialog"));
}
function updateViewCopy() {
  document.body.dataset.activeView = activeView;
  document.body.classList.toggle("explore-page", activeView === "home" || activeView === "explore");
  document.body.classList.toggle("trending-view", activeView === "trending");
  $("trending-page").hidden = activeView !== "trending";
  if ($("gamers-page")) $("gamers-page").hidden = activeView !== "gamers";
  if ($("headlines-page")) $("headlines-page").hidden = activeView !== "headlines";
  if ($("music-page")) $("music-page").hidden = activeView !== "music";
  if ($("courses-page")) $("courses-page").hidden = activeView !== "courses";
  if ($("cinema-page")) $("cinema-page").hidden = activeView !== "cinema";
  if ($("settings-page")) $("settings-page").hidden = activeView !== "settings";
  $("view-title").textContent = tr("view_" + activeView + "_title") || "Explore videos";
  $("view-note").textContent = tr("view_" + activeView + "_note") || "Fresh finds across every topic.";
  $("section-eyebrow").textContent = activeView === "saved" || activeView === "liked" || activeView === "following" || activeView === "history" ? tr("yourSpace") : (DISCOVER_VIEWS[activeView] || activeView === "reels") ? tr("discover") : tr("collection");

  const heroSaved = $("hero-saved-count");
  if (heroSaved) heroSaved.textContent = savedIds.size;
  const heroFollowing = $("hero-following-count");
  if (heroFollowing) heroFollowing.textContent = followedCreators.size;
  const heroLiked = $("hero-liked-count");
  if (heroLiked) heroLiked.textContent = likedIds.size;
}

function setCategory(category, shouldRender = true) {
  if (!CATEGORY_KEYS.includes(category)) category = "all";
  activeCategory = category;
  document.querySelectorAll("[data-category]").forEach((button) => {
    const selected = button.dataset.category === category;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-pressed", String(selected));
  });
  if (shouldRender) {
    render(q.value, false);
    syncUrl();
  }
}

function toggleSaved(id) {
  const isNowSaved = !savedIds.has(id);
  if (isNowSaved) savedIds.add(id);
  else savedIds.delete(id);
  writeJson("watchbloom-saved", Array.from(savedIds));
  updateSaved();

  // Sync to authenticated user's private saved videos collection in database
  if (typeof localProfile !== "undefined" && localProfile && !localProfile.isGuest) {
    if (isNowSaved) {
      fetch("/api/v1/user/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ item_id: id })
      }).catch(() => {});
    } else {
      fetch("/api/v1/user/saved/" + encodeURIComponent(id), {
        method: "DELETE"
      }).catch(() => {});
    }
  }
  document.querySelectorAll('.watch-later-action[data-player-action="watch-later"]').forEach((button) => {
    if ($("detail-dialog").dataset.itemId !== id) return;
    const selected = savedIds.has(id);
    button.setAttribute("aria-pressed", String(selected));
    button.textContent = selected ? "✓ " + tr("removeWatchLater") : "＋ " + tr("watchLater");
  });
  if (activeView === "saved") { render(q.value, false); return; }
  document.querySelectorAll('[data-save="' + CSS.escape(id) + '"]').forEach((button) => {
    const selected = savedIds.has(id);
    button.setAttribute("aria-pressed", String(selected));
    button.setAttribute("aria-label", selected ? tr("removeWatchLater") : tr("watchLater"));
    button.querySelector("svg")?.setAttribute("fill", selected ? "currentColor" : "none");
    if (button.classList.contains("cinema-save-btn")) {
      button.classList.toggle("is-saved", selected);
      button.innerHTML = selected
        ? '<svg viewBox="0 0 24 24" fill="#fbbf24" stroke="#fbbf24" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg><span>✓ In Watchlist</span>'
        : '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 5v14M5 12h14"/></svg><span>Add to Watchlist</span>';
    }
  });
}

let followToastTimer = 0;
let voiceSearchListening = false;
let voiceSearchSupported = true;
let voiceRecognitionInstance = null;

function updateVoiceSearchButton() {
  const buttons = document.querySelectorAll("#voice-search, [data-dialog-voice-search]");
  const label = tr(!voiceSearchSupported ? "voiceUnsupported" : voiceSearchListening ? "voiceListening" : "voiceSearch");
  buttons.forEach((button) => {
    button.disabled = !voiceSearchSupported;
    button.setAttribute("aria-label", label);
    button.title = label;
    button.setAttribute("aria-pressed", String(voiceSearchListening));
  });
}

function toggleVoiceSearch() {
  if (!voiceRecognitionInstance) return;
  if (voiceSearchListening) {
    voiceRecognitionInstance.stop();
    return;
  }
  voiceRecognitionInstance.lang = LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || navigator.language || "en-IN";
  try {
    voiceRecognitionInstance.start();
  } catch (_) {
    voiceSearchListening = false;
    updateVoiceSearchButton();
    showFollowToast(tr("voiceSearchFailed"));
  }
}

function initializeVoiceSearch() {
  const button = $("voice-search");
  const Recognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!Recognition) {
    voiceSearchSupported = false;
    updateVoiceSearchButton();
    return;
  }
  const recognition = new Recognition();
  voiceRecognitionInstance = recognition;
  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  recognition.onstart = () => {
    voiceSearchListening = true;
    updateVoiceSearchButton();
  };
  recognition.onresult = (event) => {
    const transcript = event.results?.[0]?.[0]?.transcript?.trim() || "";
    if (!transcript) return;
    $("clear-search").hidden = false;
    document.querySelectorAll("[data-dialog-search-input]").forEach((input) => {
      input.value = transcript;
      const wrap = input.closest(".dialog-search-wrap");
      const clearBtn = wrap?.querySelector("[data-dialog-clear-search]");
      if (clearBtn) clearBtn.hidden = false;
    });
    go(transcript);
  };
  recognition.onerror = (event) => {
    voiceSearchListening = false;
    updateVoiceSearchButton();
    if (event.error === "not-allowed" || event.error === "service-not-allowed") showFollowToast(tr("voicePermission"));
    else if (event.error !== "aborted" && event.error !== "no-speech") showFollowToast(tr("voiceSearchFailed"));
  };
  recognition.onend = () => {
    voiceSearchListening = false;
    updateVoiceSearchButton();
  };
  button?.addEventListener("click", () => toggleVoiceSearch());
  updateVoiceSearchButton();
}
function showFollowToast(message) {
  const toast = $("follow-toast");
  if (!toast) return;
  const activeDialog = document.querySelector("dialog[open]");
  if (activeDialog && toast.parentElement !== activeDialog) {
    activeDialog.appendChild(toast);
  } else if (!activeDialog && toast.parentElement !== document.body) {
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  clearTimeout(followToastTimer);
  followToastTimer = setTimeout(() => { toast.hidden = true; }, 3600);
}

function refreshOpenDetails() {
  const dialog = $("detail-dialog");
  if (dialog.open && dialog.dataset.itemId) openDetails(dialog.dataset.itemId);
}

function toggleCreatorFollow(key, author) {
  if (followedCreators.has(key)) {
    followedCreators.delete(key);
    alertCreators.delete(key);
    delete alertModes[key];
  } else {
    followedCreators.add(key);
  }
  writeJson("watchbloom-following", Array.from(followedCreators));
  writeJson("watchbloom-alerts", Array.from(alertCreators));
  writeJson("watchbloom-alert-modes", alertModes);
  updateFollowing();
  closeBellMenus();
  refreshCreatorControls(key);
  syncFollowingCreatorCard(key);
  const state = followedCreators.has(key) ? tr("followedState") : tr("unfollowedState");
  showFollowToast(tr("followToast").replace("{creator}", author).replace("{state}", state));
}

function refreshCreatorControls(key) {
  document.querySelectorAll("[data-follow]").forEach((button) => {
    if (button.dataset.follow !== key) return;
    const author = button.dataset.author || "Creator";
    const actions = button.closest(".creator-actions");
    if (!actions) return;
    const restoreFocus = actions.contains(document.activeElement);
    actions.outerHTML = creatorControls(author);
    bindCreatorControls(actions.parentElement || document);
    if (restoreFocus) {
      const replacement = Array.from(document.querySelectorAll("[data-follow]"))
        .find((candidate) => candidate.dataset.follow === key);
      replacement?.focus({ preventScroll: true });
    }
  });
}

function syncFollowingCreatorCard(key) {
  if (activeView !== "following") return;
  const cards = Array.from(results.querySelectorAll(".creator-card"));
  const card = cards.find((entry) => {
    const link = entry.querySelector("[data-open-channel]");
    return link && creatorKey(link.dataset.openChannel) === key;
  });
  if (!followedCreators.has(key)) {
    const hadFocus = Boolean(card?.contains(document.activeElement));
    card?.remove();
    if (hadFocus) $("find-creators").focus({ preventScroll: true });
  } else if (!card) {
    const channel = creatorCatalog.get(key);
    const matchesQuery = channel && (!q.value.trim() || norm(channel.name).includes(norm(q.value).trim()));
    const matchesCategory = channel && (activeCategory === "all" || channel.categories?.includes(activeCategory));
    if (channel && matchesQuery && matchesCategory) results.insertAdjacentHTML("beforeend", followedCreatorCard(channel));
  }
  const count = results.querySelectorAll(".creator-card").length;
  if (!count) results.innerHTML = emptyFor(q.value);
  $("count").textContent = tr("creatorResults").replace("{shown}", count).replace("{total}", count);
  $("catalog-size").textContent = count + " " + tr("creators");
}

function closeBellMenus() {
  document.querySelectorAll(".bell-menu:not([hidden])").forEach((menu) => {
    menu.hidden = true;
    const control = menu.closest(".bell-control");
    control?.querySelector("[data-alert-menu]")?.setAttribute("aria-expanded", "false");
    control?.closest(".creator-card")?.classList.remove("bell-open");
  });
}

function toggleBellMenu(button, event) {
  const control = button.closest(".bell-control");
  const menu = control?.querySelector(".bell-menu");
  if (!menu) return;
  const shouldOpen = menu.hidden;
  closeBellMenus();
  if (!shouldOpen) return;
  menu.hidden = false;
  control.closest(".creator-card")?.classList.add("bell-open");
  button.setAttribute("aria-expanded", "true");
  button.classList.remove("bell-pop");
  void button.offsetWidth;
  button.classList.add("bell-pop");
  button.addEventListener("animationend", () => button.classList.remove("bell-pop"), { once: true });
  if (event.detail === 0) menu.querySelector('[role="radio"][aria-checked="true"]')?.focus();
}

function animateBellControls(key) {
  document.querySelectorAll("[data-alert-menu]").forEach((button) => {
    if (button.dataset.alertMenu !== key) return;
    button.classList.remove("bell-pop");
    void button.offsetWidth;
    button.classList.add("bell-pop");
    button.addEventListener("animationend", () => button.classList.remove("bell-pop"), { once: true });
  });
}

function updateCreatorAlertControls(key) {
  const mode = getCreatorAlertMode(key);
  const modeLabel = tr("alertMode_" + mode);
  document.querySelectorAll("[data-alert-menu]").forEach((button) => {
    if (button.dataset.alertMenu !== key) return;
    const author = button.dataset.author || "";
    button.dataset.mode = mode;
    button.title = tr("alertsButtonTitle").replace("{mode}", modeLabel);
    button.setAttribute("aria-label", tr("alertsButtonLabel")
      .replace("{creator}", author)
      .replace("{mode}", modeLabel));
    button.querySelector("svg")?.setAttribute("fill", mode === "all" ? "currentColor" : "none");
    const menu = button.closest(".bell-control")?.querySelector(".bell-menu");
    menu?.querySelectorAll("[data-alert-mode]").forEach((option) => {
      option.setAttribute("aria-checked", String(option.dataset.alertMode === mode));
    });
  });
}

function setCreatorAlertMode(key, mode, author, option) {
  if (!ALERT_MODES.includes(mode)) return;
  alertModes[key] = mode;
  writeJson("watchbloom-alert-modes", alertModes);
  closeBellMenus();
  updateCreatorAlertControls(key);
  option.closest(".bell-control")?.querySelector("[data-alert-menu]")?.focus({ preventScroll: true });
  animateBellControls(key);
  showFollowToast(tr("alertsSaved")
    .replace("{creator}", author)
    .replace("{mode}", tr("alertMode_" + mode)));
}

function handleCreatorControlClick(event) {
  const option = event.target.closest("[data-alert-mode]");
  if (option) {
    setCreatorAlertMode(option.dataset.alertKey, option.dataset.alertMode, option.dataset.author, option);
    return true;
  }
  const bell = event.target.closest("[data-alert-menu]");
  if (bell) {
    toggleBellMenu(bell, event);
    return true;
  }
  return false;
}

function localComments(itemId) {
  const all = readJson("watchbloom-comments", {});
  return all && typeof all === "object" && !Array.isArray(all) && Array.isArray(all[itemId]) ? all[itemId] : [];
}

function renderComments(itemId, sort = playerCommentSort) {
  const host = $("comment-list");
  if (!host) return;
  const comments = localComments(itemId).slice();
  const commentCount = $("dialog-content").querySelector("[data-comment-count]");
  const locale = LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || "en-IN";
  if (commentCount) commentCount.textContent = new Intl.NumberFormat(locale).format(comments.length);
  document.querySelectorAll('[data-reel-comment-count="' + CSS.escape(itemId) + '"]').forEach((count) => {
    count.textContent = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(comments.length);
    count.title = new Intl.NumberFormat(locale).format(comments.length);
  });
  comments.sort(sort === "best"
    ? (a, b) => (Number(b.likes ?? b.helpful) || 0) - (Number(a.likes ?? a.helpful) || 0) || (b.createdAt || "").localeCompare(a.createdAt || "")
    : (a, b) => (b.createdAt || "").localeCompare(a.createdAt || ""));
  if (!comments.length) {
    host.innerHTML = '<p class="comments-empty">' + esc(tr("noComments")) + '</p>';
    return;
  }
  host.innerHTML = comments.map((comment) => {
    const date = comment.createdAt ? new Intl.DateTimeFormat(LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || "en-IN", { dateStyle: "medium" }).format(new Date(comment.createdAt)) : "";
    const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy : [];
    const liked = likedBy.includes(visitorId) || (!Array.isArray(comment.likedBy) && Boolean(comment.voted));
    const likes = Math.max(Number(comment.likes) || 0, Number(comment.helpful) || 0, likedBy.length);
    const isOwner = comment.ownerId === visitorId || (!comment.ownerId && comment.author === "You");
    return '<article class="comment-entry"><div class="comment-avatar" aria-hidden="true">' + esc(initials(comment.author || "You")) + '</div><div class="comment-body"><div class="comment-byline"><strong>' + esc(comment.author || "You") + '</strong><time>' + esc(date) + '</time></div><p>' + esc(comment.text || "") + '</p><div class="comment-actions"><button type="button" class="comment-like-button" data-comment-like="' + esc(comment.id) + '" aria-label="' + esc(tr(liked ? "unlikeComment" : "likeComment")) + '" aria-pressed="' + liked + '"><svg viewBox="0 0 24 24" fill="' + (liked ? "currentColor" : "none") + '" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8l1.1 1.1L12 21l7.8-7.5 1.1-1.1a5.5 5.5 0 0 0-.1-7.8Z"/></svg><span>' + likes + '</span></button>' + (isOwner ? '<button type="button" class="comment-delete-button" data-comment-delete="' + esc(comment.id) + '" aria-label="' + esc(tr("deleteComment")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 7h16M10 11v6m4-6v6M5.5 7l1 13h11l1-13M9 7V4h6v3"/></svg><span>' + esc(tr("deleteComment")) + '</span></button>' : '') + '</div></div></article>';
  }).join("");
}

function syncReactionUI(itemId, summary) {
  const current = summary || { likes: 0, dislikes: 0, reaction: null };
  const locale = LANGUAGE_OPTIONS.find((entry) => entry.code === language)?.locale || "en-IN";
  ["like", "dislike"].forEach((kind) => {
    const value = Number(current[kind === "like" ? "likes" : "dislikes"]) || 0;
    const formatted = new Intl.NumberFormat(locale, { notation: "compact", maximumFractionDigits: 1 }).format(value);
    const full = new Intl.NumberFormat(locale).format(value);
    document.querySelectorAll('[data-reaction="' + kind + '"][data-item-id="' + CSS.escape(itemId) + '"]').forEach((button) => {
      const count = button.querySelector('[data-reaction-count="' + kind + '"]');
      if (count) { count.textContent = formatted; count.title = full; }
      button.setAttribute("aria-pressed", String(current.reaction === kind));
      button.setAttribute("aria-label", tr(kind) + ", " + full);
      const icon = button.querySelector(".reel-action-icon");
      if (icon && kind === "like") icon.textContent = current.reaction === "like" ? "♥" : "♡";
    });
    if ($("detail-dialog").dataset.itemId === itemId) {
      const content = $("dialog-content");
      const button = content.querySelector('[data-reaction="' + kind + '"]');
      const count = content.querySelector('[data-reaction-count="' + kind + '"]');
      if (count) { count.textContent = formatted; count.title = full; }
      if (button) {
        button.setAttribute("aria-pressed", String(current.reaction === kind));
        button.setAttribute("aria-label", tr(kind) + ", " + full);
      }
    }
  });
}

async function loadReactionSummary(itemId) {
  if (reactionLoads.has(itemId)) return;
  reactionLoads.add(itemId);
  try {
    const response = await fetch("/api/v1/videos/" + encodeURIComponent(itemId) + "/reactions", {
      headers: { "X-Watchbloom-Visitor": visitorId },
      cache: "no-store",
    });
    if (!response.ok) throw new Error("reaction summary unavailable");
    const summary = await response.json();
    reactionSummaries.set(itemId, summary);
    syncReactionUI(itemId, summary);
  } catch (error) {
    if ($("detail-dialog").dataset.itemId === itemId) syncReactionUI(itemId, reactionSummaries.get(itemId));
  } finally {
    reactionLoads.delete(itemId);
    document.querySelectorAll('[data-reaction][data-item-id="' + CSS.escape(itemId) + '"]').forEach((button) => { button.disabled = false; });
    if ($("detail-dialog").dataset.itemId === itemId) {
      $("dialog-content").querySelectorAll("[data-reaction]").forEach((button) => { button.disabled = false; });
    }
  }
}

async function setVideoReaction(itemId, selected) {
  const old = reactionSummaries.get(itemId) || { likes: 0, dislikes: 0, reaction: null };
  const reaction = old.reaction === selected ? null : selected;
  const content = $("dialog-content");
  const feedButtons = Array.from(document.querySelectorAll('[data-reaction][data-item-id="' + CSS.escape(itemId) + '"]'));
  const dialogButtons = $("detail-dialog").dataset.itemId === itemId ? Array.from(content.querySelectorAll("[data-reaction]")) : [];
  const buttons = [...feedButtons, ...dialogButtons];
  const status = content.querySelector("[data-reaction-status]");
  const optimistic = { ...old, reaction };
  if (old.reaction === "like") optimistic.likes = Math.max(0, (Number(old.likes) || 0) - 1);
  if (old.reaction === "dislike") optimistic.dislikes = Math.max(0, (Number(old.dislikes) || 0) - 1);
  if (reaction === "like") optimistic.likes = (Number(optimistic.likes) || 0) + 1;
  if (reaction === "dislike") optimistic.dislikes = (Number(optimistic.dislikes) || 0) + 1;
  reactionSummaries.set(itemId, optimistic);
  syncReactionUI(itemId, optimistic);
  if (reaction === "like") {
    likedIds.add(itemId);
  } else {
    likedIds.delete(itemId);
  }
  writeJson("watchbloom-liked", Array.from(likedIds));
  updateLiked();
  if (activeView === "liked") {
    render(q.value, false);
  }
  buttons.forEach((button) => { button.disabled = true; });
  if (status) status.textContent = "";
  try {
    const response = await fetch("/api/v1/videos/" + encodeURIComponent(itemId) + "/reactions", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Watchbloom-Visitor": visitorId },
      body: JSON.stringify({ reaction }),
      cache: "no-store",
    });
    if (!response.ok) throw new Error("reaction update failed");
    const summary = await response.json();
    reactionSummaries.set(itemId, summary);
    syncReactionUI(itemId, summary);
  } catch (error) {
    reactionSummaries.set(itemId, old);
    syncReactionUI(itemId, old);
    if (old.reaction === "like") {
      likedIds.add(itemId);
    } else {
      likedIds.delete(itemId);
    }
    writeJson("watchbloom-liked", Array.from(likedIds));
    updateLiked();
    if (activeView === "liked") {
      render(q.value, false);
    }
    if (status && $("detail-dialog").dataset.itemId === itemId) status.textContent = tr("reactionUnavailable");
  } finally {
    buttons.forEach((button) => { button.disabled = false; });
  }
}

function applySubtitleSelection(video) {
  const select = $("subtitle-language");
  if (!select || !video?.textTracks) return;
  const selected = Number(select.value);
  Array.from(video.textTracks).forEach((track, index) => {
    track.mode = Number.isInteger(selected) && selected === index ? "showing" : "disabled";
  });
  const button = $("dialog-content").querySelector("[data-player-action=toggle-subtitles]");
  const enabled = select.value !== "off" && Number.isInteger(selected) && video.textTracks[selected]?.mode === "showing";
  if (button) {
    button.setAttribute("aria-pressed", String(enabled));
    button.setAttribute("aria-label", enabled ? tr("subtitlesEnabled") : tr("subtitles"));
    button.title = enabled ? tr("subtitlesEnabled") : tr("subtitles");
    const state = button.querySelector("[data-subtitle-state]");
    if (state) state.textContent = enabled ? tr("subtitlesOn") : tr("subtitlesOff");
  }
}

function toggleSubtitleTrack(video) {
  const select = $("subtitle-language");
  const status = $("subtitle-status");
  if (!video || !select || !video.textTracks?.length || select.options.length < 2) {
    if (status) {
      status.textContent = tr("subtitlesUnavailable");
      status.hidden = false;
    }
    return;
  }
  const turningOn = select.value === "off";
  select.value = turningOn ? "0" : "off";
  applySubtitleSelection(video);
  if (status) {
    const track = video.textTracks[Number(select.value)];
    const selectedLabel = track?.label || track?.language || "";
    status.textContent = turningOn ? tr("subtitlesEnabled") + " · " + selectedLabel : tr("subtitlesDisabled");
    status.hidden = false;
  }
}

function configureSubtitleTracks(video, tracks) {
  const select = $("subtitle-language");
  const note = $("subtitle-track-note");
  if (!select || !note) return;
  select.replaceChildren(new Option(tr("subtitlesOff"), "off"));
  tracks.forEach((track, index) => {
    const label = track.label || track.language || ("Track " + (index + 1));
    select.add(new Option((index === 0 ? tr("subtitlesOn") + " · " : "") + label, String(index)));
  });
  select.disabled = tracks.length === 0;
  select.value = "off";
  note.textContent = tracks.length ? "" : tr("subtitlesUnavailable");
  applySubtitleSelection(video);
}

let currentActiveDetailItem = null;
let currentSuggestedFilter = "all";

function formatCardDuration(item) {
  if (item && item.duration_seconds && Number.isFinite(Number(item.duration_seconds)) && Number(item.duration_seconds) > 0) {
    const sec = Math.round(Number(item.duration_seconds));
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return m + ":" + String(s).padStart(2, "0");
  }
  if (item && item.mins && Number.isFinite(Number(item.mins))) {
    return item.mins + ":00";
  }
  return duration(item);
}

function renderRelated(activeItem, filter) {
  const chosenFilter = filter || currentSuggestedFilter || "all";
  const host = $("related-list");
  if (!host) return;

  const currentItem = activeItem || currentActiveDetailItem;
  let candidates = Array.from(currentLoadedRelatedVideos || [])
    .filter((cand) => cand && cand.id !== currentItem?.id && !isReelItem(cand));

  if (chosenFilter === "related" && currentItem) {
    candidates = candidates.filter((cand) => cand.category === currentItem.category);
  } else if (chosenFilter === "creator" && currentItem) {
    candidates = candidates.filter((cand) => creatorKey(cand.author) === creatorKey(currentItem.author));
  } else if (chosenFilter === "recent") {
    candidates.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
  }

  const rail = host.closest(".suggested-rail") || document.querySelector(".suggested-rail");
  if (rail) {
    rail.querySelectorAll("[data-suggested-filter]").forEach((btn) => {
      const isSel = btn.dataset.suggestedFilter === chosenFilter;
      btn.classList.toggle("active", isSel);
      btn.setAttribute("aria-selected", String(isSel));
    });
  }

  if (!candidates.length) {
    let emptyHtml = '<div class="suggested-empty-wrap">' +
      '<p class="suggested-empty-text">' + esc(tr("noItemsText")) + '</p>';
    if (chosenFilter !== "all") {
      emptyHtml += '<button type="button" class="suggested-chip active" data-suggested-filter="all" style="margin-top:10px;">' +
        esc(tr("cat_all") || "All") + '</button>';
    }
    emptyHtml += '</div>';
    host.innerHTML = emptyHtml;
    return;
  }

  host.innerHTML = candidates.map((item, index) => {
    const itemViews = getItemViews(item);
    const formattedDate = formatUploadDate(item.date, false);
    const durationLabel = formatCardDuration(item);
    const authorInitials = initials(item.author || "Creator");
    const isFirst = index === 0;

    let thumbBadges = '<span class="suggested-cat-badge">' + esc(categoryLabel(item.category)) + '</span>' +
      '<span class="suggested-time-badge">' + esc(durationLabel) + '</span>';
    if (isFirst && isAutoplayEnabled) {
      thumbBadges += '<span class="suggested-upnext-tag">' + esc(tr("upNext") || "Up next") + '</span>';
    }

    return '<button type="button" class="suggested-video-card" data-open="' + esc(item.id) + '" data-video-id="' + esc(item.id) + '" aria-label="' + esc(item.title) + '">' +
      '<div class="suggested-thumb-wrap ' + art(item) + '">' +
        '<div class="suggested-thumb-overlay">' +
          '<span class="suggested-play-icon" aria-hidden="true">▶</span>' +
        '</div>' +
        thumbBadges +
      '</div>' +
      '<div class="suggested-meta-wrap">' +
        '<h4 class="suggested-video-title" title="' + esc(item.title) + '">' + esc(item.title) + '</h4>' +
        '<div class="suggested-channel-row">' +
          '<span class="suggested-channel-dot" aria-hidden="true">' + esc(authorInitials) + '</span>' +
          '<span class="suggested-channel-name">' + esc(item.author || "Creator") + '</span>' +
        '</div>' +
        '<div class="suggested-stats-row">' +
          '<span>' + esc(views(itemViews)) + ' ' + esc(tr("plays")) + '</span>' +
          '<span class="suggested-stat-separator">•</span>' +
          '<span>' + esc(formattedDate) + '</span>' +
        '</div>' +
      '</div>' +
    '</button>';
  }).join("");
}

async function loadRelated(item) {
  currentActiveDetailItem = item;
  const map = new Map();

  function rankList(list) {
    return [...list].sort((a, b) => {
      const aCat = a.category === item.category ? 2 : 0;
      const bCat = b.category === item.category ? 2 : 0;
      const aAuth = creatorKey(a.author) === creatorKey(item.author) ? 1 : 0;
      const bAuth = creatorKey(b.author) === creatorKey(item.author) ? 1 : 0;
      const scoreA = aCat + aAuth;
      const scoreB = bCat + bAuth;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return (Number(b.views) || 0) - (Number(a.views) || 0);
    });
  }

  // 1. Local visibleItems & uploads (only long videos, reels strictly in reels section)
  Array.from(visibleItems.values()).forEach((cand) => {
    if (cand && cand.id && cand.id !== item.id && cand.type === "video" && !isReelItem(cand)) {
      map.set(cand.id, cand);
    }
  });
  loadUploadedVideos().forEach((cand) => {
    if (cand && cand.id && cand.id !== item.id && !isReelItem(cand)) {
      map.set(cand.id, cand);
    }
  });

  currentLoadedRelatedVideos = rankList(Array.from(map.values()));
  renderRelated(item, currentSuggestedFilter);

  // 2. Fetch from backend to ensure full catalog is available (format: video strictly excludes reels)
  try {
    const exploreParams = new URLSearchParams({ type: "video", format: "video", limit: "50", sort: "popularity" });
    const response = await fetch("/api/v1/explore?" + exploreParams);
    if (response.ok) {
      const data = await response.json();
      const currentDialogId = $("detail-dialog")?.dataset.itemId;
      if (currentDialogId !== item.id) return;
      (data.results || []).forEach((cand) => {
        if (cand && cand.id && cand.id !== item.id && !isReelItem(cand)) {
          visibleItems.set(cand.id, cand);
          map.set(cand.id, cand);
        }
      });
      currentLoadedRelatedVideos = rankList(Array.from(map.values()));
      renderRelated(item, currentSuggestedFilter);
    }
  } catch (error) {
    // Keep local pool
  }
}

function configureAudioTracks(video) {
  const select = $("audio-language");
  const note = $("audio-track-note");
  if (!select || !note) return;
  const tracks = video.audioTracks;
  select.replaceChildren(new Option(tr("originalAudio"), "0"));
  if (!tracks || tracks.length < 2) {
    const unavailable = new Option(tr("aiAudioUnavailable"), "unavailable");
    unavailable.disabled = true;
    select.add(unavailable);
    select.disabled = false;
    select.value = "0";
    note.textContent = tr("audioTracksNote");
    return;
  }
  Array.from(tracks).forEach((track, index) => {
    if (index === 0) return;
    const language = track.language || track.label || ("Track " + (index + 1));
    select.add(new Option(tr("aiTranslatedAudio") + " · " + language, String(index)));
  });
  select.disabled = false;
  const active = Array.from(tracks).findIndex((track) => track.enabled);
  select.value = String(Math.max(0, active));
  note.textContent = "";
}

function dialogSearchMarkup() {
  const currentVal = typeof q !== "undefined" && q ? q.value : "";
  return '<div class="search-wrap dialog-search-wrap">' +
    '<form class="search-form dialog-search-form" data-dialog-search-form role="search" autocomplete="off">' +
      '<svg class="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.6 4.6"/></svg>' +
      '<input class="dialog-search-input" data-dialog-search-input type="search" placeholder="' + esc(tr("searchPlaceholder")) + '" aria-label="' + esc(tr("searchLabel")) + '" role="combobox" aria-autocomplete="list" aria-expanded="false" value="' + esc(currentVal) + '">' +
      '<button class="clear-search dialog-clear-search" data-dialog-clear-search type="button" aria-label="' + esc(tr("clearSearch")) + '"' + (currentVal ? '' : ' hidden') + '>✕</button>' +
      '<button class="search-submit dialog-search-submit" data-dialog-search-submit type="submit" aria-label="' + esc(tr("searchButton")) + '">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.6 4.6"/></svg>' +
      '</button>' +
    '</form>' +
    '<button class="voice-search dialog-voice-search" data-dialog-voice-search type="button" aria-label="' + esc(tr(!voiceSearchSupported ? "voiceUnsupported" : voiceSearchListening ? "voiceListening" : "voiceSearch")) + '" title="' + esc(tr(!voiceSearchSupported ? "voiceUnsupported" : voiceSearchListening ? "voiceListening" : "voiceSearch")) + '" aria-pressed="' + String(voiceSearchListening) + '"' + (!voiceSearchSupported ? ' disabled' : '') + '>' +
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="9" y="2.5" width="6" height="12" rx="3"/><path d="M5.5 11.5a6.5 6.5 0 0 0 13 0M12 18v3.5M9 21.5h6"/></svg>' +
    '</button>' +
    '<ul class="suggestions dialog-suggestions" data-dialog-suggestions role="listbox" hidden></ul>' +
  '</div>';
}

function dialogActionsMarkup(isCreator = false) {
  const avatarContent = localProfile.photo
    ? '<img src="' + esc(localProfile.photo) + '" alt="">'
    : esc(localProfile.name ? initials(localProfile.name) : "WB");
  return '<div class="dialog-top-actions">' +
    buildLanguageSelectMarkup("dialog-language-picker") +
    '<button class="icon-button dialog-action-btn dialog-create-btn" type="button" data-dialog-action="create" aria-label="' + esc(tr("create")) + '" title="' + esc(tr("create")) + '">' +
      CREATE_ICON +
    '</button>' +
    '<div class="notification-control dialog-notification-control">' +
      '<button class="icon-button dialog-action-btn dialog-notification-toggle" type="button" data-dialog-notification-toggle aria-label="' + esc(tr("notifications")) + '" title="' + esc(tr("notifications")) + '" aria-haspopup="dialog" aria-expanded="false">' +
        NOTIFICATION_BELL_ICON +
      '</button>' +
    '</div>' +
    '<div class="account-control dialog-account-control">' +
      '<button class="avatar avatar-button dialog-avatar-btn dialog-account-toggle" type="button" data-dialog-account-toggle aria-label="' + esc(tr("accountMenu")) + '" aria-haspopup="true" aria-expanded="false">' +
        avatarContent +
      '</button>' +
    '</div>' +
    '<button class="dialog-close' + (isCreator ? ' creator-close' : '') + '" type="button" aria-label="' + esc(tr("close")) + '">×</button>' +
  '</div>';
}

function dialogHeader(kindLabel, isCreator = false) {
  return '<div class="dialog-top">' +
    '<div class="dialog-top-leading">' +
      '<button type="button" class="dialog-back-btn" data-player-action="back" aria-label="' + esc(tr("back")) + '" title="' + esc(tr("back")) + '">' +
        BACK_ARROW_ICON +
      '</button>' +
      '<button type="button" class="dialog-menu-toggle" data-player-action="toggle-navigation" aria-label="Open navigation" aria-expanded="false">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>' +
      '</button>' +
      '<button type="button" class="dialog-brand" data-player-action="home" aria-label="Watchbloom home">' +
        '<img src="/watchbloom-mark.svg" alt="" aria-hidden="true">' +
        '<span class="brand-text"><span class="brand-watch">Watch</span><span class="brand-bloom">bloom</span></span>' +
      '</button>' +
      '<span class="dialog-kind">' + esc(kindLabel) + '</span>' +
    '</div>' +
    dialogSearchMarkup() +
    dialogActionsMarkup(isCreator) +
  '</div>';
}

function creatorDialogHeader(kindLabel) {
  return dialogHeader(kindLabel, true);
}

// ============================================================================
// AUTOPLAY & ENDED VIDEO ADVANCE CONTROLLER
// ============================================================================
let isAutoplayEnabled = readJson("watchbloom-autoplay", true);
let autoplayCountdownTimer = null;
let autoplaySecondsRemaining = 5;
let currentLoadedRelatedVideos = [];

function clearAutoplayCountdown() {
  if (autoplayCountdownTimer) {
    clearInterval(autoplayCountdownTimer);
    autoplayCountdownTimer = null;
  }
  const overlay = $("video-autoplay-overlay");
  if (overlay) overlay.remove();
}

function syncAutoplayButtons() {
  const title = isAutoplayEnabled ? (tr("autoplayOn") || "Autoplay is on") : (tr("autoplayOff") || "Autoplay is off");
  document.querySelectorAll(".video-autoplay-toggle-btn").forEach((btn) => {
    btn.classList.toggle("active", isAutoplayEnabled);
    btn.setAttribute("aria-pressed", String(isAutoplayEnabled));
    btn.setAttribute("aria-label", title);
    btn.title = title;
  });
  document.querySelectorAll(".autoplay-switch-track").forEach((track) => {
    track.classList.toggle("active", isAutoplayEnabled);
  });
}

function getNextVideoForAutoplay(currentItem) {
  if (!currentItem) return null;

  // 1. If currently inside a playlist:
  if (currentItem.localPlaylist && Array.isArray(currentItem.playlist_items) && currentItem.playlist_items.length) {
    const idx = currentItem.playlist_items.findIndex((x) => x.id === currentItem.id);
    if (idx !== -1 && idx + 1 < currentItem.playlist_items.length) {
      return currentItem.playlist_items[idx + 1];
    }
  }

  // 2. From cached related items of this video (long videos only):
  if (Array.isArray(currentLoadedRelatedVideos) && currentLoadedRelatedVideos.length) {
    const candidate = currentLoadedRelatedVideos.find((x) => x.id !== currentItem.id && !isReelItem(x));
    if (candidate) return candidate;
  }

  // 3. From uploaded videos (long videos only):
  const uploaded = loadUploadedVideos().filter((x) => x.id !== currentItem.id && !isReelItem(x));
  if (uploaded.length) return uploaded[0];

  // 4. From any loaded video in visibleItems (long videos only):
  const pool = Array.from(visibleItems.values()).filter((x) => x.type === "video" && x.id !== currentItem.id && !isReelItem(x));
  if (pool.length) return pool[0];

  return null;
}

function showVideoReplayOverlay(video) {
  const shell = video.closest(".video-shell");
  if (!shell) return;
  const existing = shell.querySelector(".video-replay-overlay");
  if (existing) existing.remove();

  const overlay = document.createElement("div");
  overlay.className = "video-replay-overlay";
  overlay.innerHTML = `<button type="button" class="video-replay-btn" data-player-action="replay-video"><span>↻</span> <span>${esc(tr("replay") || "Replay")}</span></button>`;
  shell.appendChild(overlay);
}

function showAutoplayCountdownOverlay(nextItem, video) {
  clearAutoplayCountdown();
  const shell = video.closest(".video-shell");
  if (!shell) return;

  const overlay = document.createElement("div");
  overlay.className = "video-autoplay-overlay";
  overlay.id = "video-autoplay-overlay";
  overlay.dataset.nextId = nextItem.id;
  autoplaySecondsRemaining = 5;

  const nextViews = getItemViews(nextItem);
  overlay.innerHTML = `
    <div class="autoplay-card">
      <div class="autoplay-countdown-circle">
        <svg class="autoplay-svg" viewBox="0 0 44 44">
          <circle class="autoplay-circle-bg" cx="22" cy="22" r="18" fill="none" stroke-width="3"></circle>
          <circle class="autoplay-circle-bar" id="autoplay-circle-bar" cx="22" cy="22" r="18" fill="none" stroke-width="3" stroke-dasharray="113" stroke-dashoffset="0"></circle>
        </svg>
        <span class="autoplay-seconds" id="autoplay-countdown-sec">5</span>
      </div>
      <div class="autoplay-info">
        <span class="autoplay-label">${esc(tr("upNext") || "Up Next")} in <span id="autoplay-sec-text">5</span>s</span>
        <h3 class="autoplay-next-title">${esc(nextItem.title)}</h3>
        <p class="autoplay-next-author">${esc(nextItem.author || "Creator")} · ${esc(views(nextViews))} ${esc(tr("plays"))}</p>
      </div>
      <div class="autoplay-actions">
        <button type="button" class="autoplay-btn autoplay-cancel-btn" data-player-action="cancel-autoplay">${esc(tr("cancel") || "Cancel")}</button>
        <button type="button" class="autoplay-btn autoplay-play-btn" data-player-action="play-now-autoplay">${esc(tr("playNow") || "Play Now")} ▶</button>
      </div>
    </div>
  `;

  shell.appendChild(overlay);

  const secEl = $("autoplay-countdown-sec");
  const secTextEl = $("autoplay-sec-text");
  const barEl = $("autoplay-circle-bar");

  autoplayCountdownTimer = setInterval(() => {
    autoplaySecondsRemaining--;
    if (secEl) secEl.textContent = autoplaySecondsRemaining;
    if (secTextEl) secTextEl.textContent = autoplaySecondsRemaining;
    if (barEl) {
      const offset = 113 * (1 - (autoplaySecondsRemaining / 5));
      barEl.style.strokeDashoffset = String(offset);
    }

    if (autoplaySecondsRemaining <= 0) {
      clearAutoplayCountdown();
      overlay.remove();
      openDetails(nextItem.id, false, true);
    }
  }, 1000);
}

function handleVideoEnded(item, video) {
  clearAutoplayCountdown();

  if (!isAutoplayEnabled) {
    showVideoReplayOverlay(video);
    return;
  }

  const nextItem = getNextVideoForAutoplay(item);
  if (!nextItem) {
    showVideoReplayOverlay(video);
    return;
  }

  showAutoplayCountdownOverlay(nextItem, video);
}

// ============================================================================
// 5-SECOND INLINE HOVER PREVIEW CONTROLLER
// ============================================================================
let activeInlinePreviewCard = null;
let inlinePreviewHoverTimer = null;
let inlinePreviewDurationTimer = null;
let inlinePreviewActiveVideo = null;
let inlinePreviewCanvasAnim = null;

function clearActiveInlinePreview() {
  if (inlinePreviewHoverTimer) {
    clearTimeout(inlinePreviewHoverTimer);
    inlinePreviewHoverTimer = null;
  }
  if (inlinePreviewDurationTimer) {
    clearTimeout(inlinePreviewDurationTimer);
    inlinePreviewDurationTimer = null;
  }
  if (inlinePreviewCanvasAnim) {
    cancelAnimationFrame(inlinePreviewCanvasAnim);
    inlinePreviewCanvasAnim = null;
  }
  if (inlinePreviewActiveVideo) {
    try {
      inlinePreviewActiveVideo.pause();
      inlinePreviewActiveVideo.removeAttribute("src");
      inlinePreviewActiveVideo.load();
    } catch (_) {}
    inlinePreviewActiveVideo = null;
  }
  if (activeInlinePreviewCard) {
    const existing = activeInlinePreviewCard.querySelectorAll(".inline-preview-overlay");
    existing.forEach((el) => el.remove());
    activeInlinePreviewCard = null;
  }
}

function startInlineCanvasPreview(canvas, item) {
  const ctx = canvas.getContext("2d");
  let frame = 0;
  const title = (item && item.title) ? item.title : "Watchbloom";

  function drawFrame() {
    frame++;
    ctx.fillStyle = "#0c0e12";
    ctx.fillRect(0, 0, 480, 270);

    const grad = ctx.createLinearGradient(0, 0, 480, 270);
    grad.addColorStop(0, "#1e1b4b");
    grad.addColorStop(0.5, "#312e81");
    grad.addColorStop(1, "#0f172a");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 480, 270);

    const bars = 24;
    const barW = 12;
    const gap = 6;
    const startX = 240 - ((bars * (barW + gap)) / 2);
    for (let i = 0; i < bars; i++) {
      const h = Math.abs(Math.sin((frame * 0.1) + (i * 0.4))) * 70 + 8;
      const x = startX + i * (barW + gap);
      const y = 140 - h / 2;
      ctx.fillStyle = i % 2 === 0 ? "#c3a8ff" : "#ef4444";
      ctx.fillRect(x, y, barW, h);
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 18px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(title.slice(0, 32), 240, 205);

    ctx.fillStyle = "#94a3b8";
    ctx.font = "12px Inter, system-ui, sans-serif";
    ctx.fillText("5-SECOND SCENE TEASER", 240, 230);

    inlinePreviewCanvasAnim = requestAnimationFrame(drawFrame);
  }
  drawFrame();
}

function startInlinePreview(cover, itemId, cardEl) {
  clearActiveInlinePreview();
  activeInlinePreviewCard = cardEl;

  let item = visibleItems.get(itemId);
  if (!item) {
    item = loadUploadedVideos().find((v) => v.id === itemId);
  }

  const overlay = document.createElement("div");
  overlay.className = "inline-preview-overlay";
  overlay.innerHTML = `
    <span class="inline-preview-pill"><span class="inline-preview-pill-dot"></span> 5s PREVIEW</span>
    <div class="inline-preview-progress"><div class="inline-preview-bar"></div></div>
  `;

  if (hasVideo && item.media_url) {
    const video = document.createElement("video");
    video.className = "inline-preview-video";
    video.muted = true;
    video.defaultMuted = true;
    video.playsInline = true;
    video.preload = "auto";
    video.src = item.media_url;
    inlinePreviewActiveVideo = video;
    overlay.prepend(video);
    cover.appendChild(overlay);

    video.play().catch(() => {});
  } else {
    const canvas = document.createElement("canvas");
    canvas.className = "inline-preview-canvas";
    canvas.width = 480;
    canvas.height = 270;
    overlay.prepend(canvas);
    cover.appendChild(overlay);
    startInlineCanvasPreview(canvas, item || { title: "Watchbloom Preview" });
  }

  const bar = overlay.querySelector(".inline-preview-bar");
  requestAnimationFrame(() => {
    if (bar) {
      bar.style.transition = "width 5000ms linear";
      bar.style.width = "100%";
    }
  });

  inlinePreviewDurationTimer = setTimeout(() => {
    if (inlinePreviewActiveVideo) {
      inlinePreviewActiveVideo.pause();
    }
    if (inlinePreviewCanvasAnim) {
      cancelAnimationFrame(inlinePreviewCanvasAnim);
      inlinePreviewCanvasAnim = null;
    }
    const pill = overlay.querySelector(".inline-preview-pill");
    if (pill) {
      pill.innerHTML = "<span>✓ PREVIEW DONE</span>";
    }
  }, 5000);
}

function initializeInlineHoverPreview() {
  document.addEventListener("pointerover", (event) => {
    if (event.pointerType === "touch") return;
    const hoverCard = event.target.closest(".media-card, .shorts-shelf-card, .liked-reel-card, .history-reel-card, .trend-spotlight-art, .related-card, .suggested-video-card");
    if (!hoverCard) return;
    if (hoverCard === activeInlinePreviewCard) return;

    const openBtn = hoverCard.closest("[data-open], [data-play-reel]") || hoverCard.querySelector("[data-open], [data-play-reel]") || hoverCard;
    const itemId = openBtn.dataset.open || openBtn.dataset.playReel || hoverCard.dataset.cardId;
    if (!itemId) return;

    const previewCover = hoverCard.querySelector(".cover, .related-cover, .trend-spotlight-cover, .suggested-thumb-wrap");
    if (!previewCover) return;

    if (inlinePreviewHoverTimer) clearTimeout(inlinePreviewHoverTimer);
    inlinePreviewHoverTimer = setTimeout(() => {
      startInlinePreview(previewCover, itemId, hoverCard);
    }, 240);
  });

  document.addEventListener("pointerout", (event) => {
    if (event.pointerType === "touch") return;
    const outCard = event.target.closest(".media-card, .shorts-shelf-card, .liked-reel-card, .history-reel-card, .trend-spotlight-art, .related-card, .suggested-video-card");
    if (outCard && outCard === activeInlinePreviewCard) {
      const related = event.relatedTarget;
      if (!related || !outCard.contains(related)) {
        clearActiveInlinePreview();
      }
    } else if (!outCard && inlinePreviewHoverTimer) {
      clearTimeout(inlinePreviewHoverTimer);
      inlinePreviewHoverTimer = null;
    }
  });

  window.addEventListener("scroll", clearActiveInlinePreview, { passive: true });
}

// ── WATCHBLOOM HLS & QOE TELEMETRY ENGINE ──
window.activeHlsPlayer = null;
window.activeHlsVideoId = null;

function sendQoETelemetry(videoId, eventType, value) {
  if (!videoId) return;
  const payload = JSON.stringify({ videoId: String(videoId), type: String(eventType), value: value || 1 });
  if (navigator.sendBeacon) {
    try {
      navigator.sendBeacon('/api/v1/telemetry', new Blob([payload], { type: 'application/json' }));
      return;
    } catch (_) {}
  }
  fetch('/api/v1/telemetry', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: payload,
    keepalive: true
  }).catch(() => {});
}

function applyHlsQuality(hls, quality) {
  if (!hls || !hls.levels || !hls.levels.length) return;
  if (quality === "auto" || !quality) {
    hls.currentLevel = -1; // Adaptive Bitrate
    return;
  }
  const targetHeight = parseInt(quality, 10);
  let matchedIdx = -1;
  hls.levels.forEach((lvl, idx) => {
    if (lvl.height === targetHeight) matchedIdx = idx;
  });
  hls.currentLevel = matchedIdx >= 0 ? matchedIdx : -1;
}

function setupQoETelemetry(video, videoId) {
  let loadStartTime = performance.now();
  let firstFrameRendered = false;
  let stallStartTime = 0;
  let lastDroppedFrames = 0;

  video.addEventListener("waiting", () => {
    stallStartTime = performance.now();
    sendQoETelemetry(videoId, "stall", 1);
  });

  video.addEventListener("playing", () => {
    if (!firstFrameRendered) {
      firstFrameRendered = true;
      const startupSec = (performance.now() - loadStartTime) / 1000;
      sendQoETelemetry(videoId, "startup_time", startupSec);
    }
    if (stallStartTime > 0) {
      const stallSec = (performance.now() - stallStartTime) / 1000;
      sendQoETelemetry(videoId, "stall_duration", stallSec);
      stallStartTime = 0;
    }
  });

  const dropMonitor = setInterval(() => {
    if (!video || video.paused || video.ended) return;
    if (video.getVideoPlaybackQuality) {
      const q = video.getVideoPlaybackQuality();
      const delta = q.droppedVideoFrames - lastDroppedFrames;
      if (delta > 0) {
        lastDroppedFrames = q.droppedVideoFrames;
        sendQoETelemetry(videoId, "dropped_frames", delta);
      }
    }
  }, 6000);

  video.addEventListener("ended", () => clearInterval(dropMonitor), { once: true });
}

function attachHlsAndQoE(video, item, fallbackMediaUrl) {
  if (window.activeHlsPlayer) {
    try { window.activeHlsPlayer.destroy(); } catch (_) {}
    window.activeHlsPlayer = null;
  }
  window.activeHlsVideoId = item?.id || null;
  if (!video || !item) return;

  setupQoETelemetry(video, item.id);

  const fallbackUrl = prepareMediaUrlForNetwork(fallbackMediaUrl || item.media_url || (item.id ? `/api/media/${encodeURIComponent(item.id)}` : ""));
  function fallbackToProgressive() {
    if (window.activeHlsPlayer) {
      try { window.activeHlsPlayer.destroy(); } catch (_) {}
      window.activeHlsPlayer = null;
    }
    if (fallbackUrl && (video.src !== fallbackUrl && !video.src.endsWith(fallbackUrl))) {
      video.src = fallbackUrl;
      video.load();
      video.play().catch(() => {});
    }
  }

  const isLive = Boolean(item.isLiveVod || item.format === "live" || (typeof item.id === "string" && item.id.startsWith("v_live_")));
  const hasWebmMedia = (item.media && String(item.media).toLowerCase().endsWith(".webm")) || (fallbackUrl && fallbackUrl.toLowerCase().includes(".webm"));

  // Detect native WebM decoder support (Chrome/Firefox/Edge support it; iOS/Safari does NOT)
  const canPlayWebm = Boolean(
    video.canPlayType && (
      video.canPlayType('video/webm; codecs="vp8, opus"') ||
      video.canPlayType('video/webm; codecs="vp9, opus"') ||
      video.canPlayType('video/webm')
    )
  );

  // If live broadcast replay is native WebM and the browser natively supports it, play directly
  if ((isLive || hasWebmMedia) && canPlayWebm) {
    if (window.activeHlsPlayer) {
      try { window.activeHlsPlayer.destroy(); } catch (_) {}
      window.activeHlsPlayer = null;
    }
    const targetUrl = prepareMediaUrlForNetwork(fallbackUrl || `/api/media/${encodeURIComponent(item.id)}`);
    if (video.src !== targetUrl && !video.src.endsWith(targetUrl)) {
      video.src = targetUrl;
      video.load();
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    }
    return;
  }

  const hlsUrl = prepareMediaUrlForNetwork(isLive
    ? `/api/v1/hls/live/${encodeURIComponent(item.id)}/live.m3u8`
    : (item.hls_url || `/api/v1/hls/${encodeURIComponent(item.id)}/master.m3u8`));

  if (window.Hls && Hls.isSupported()) {
    let networkRetries = 0;
    let mediaRetries = 0;
    const hls = new Hls({
      maxBufferLength: 30,
      lowLatencyMode: true,
      enableWorker: true,
      backBufferLength: 60,
      xhrSetup: function (xhr, url) {
        try {
          xhr.setRequestHeader("ngrok-skip-browser-warning", "true");
        } catch (_) {}
      },
    });
    window.activeHlsPlayer = hls;

    hls.on(Hls.Events.MANIFEST_PARSED, (ev, data) => {
      // 1. Remove unsupported AV1 levels on MPEG-TS streams to prevent MediaSource bufferAppendingError
      if (hls.levels && hls.levels.length > 0) {
        for (let i = hls.levels.length - 1; i >= 0; i--) {
          const lvl = hls.levels[i];
          const c = (lvl.codecs || lvl.attrs?.CODECS || "").toLowerCase();
          if (c.includes("av01") || c.includes("av1") || (lvl.name && lvl.name.includes("av1"))) {
            try { hls.removeLevel(i); } catch (_) {}
          }
        }
      }

      // If no valid levels remain, fallback to progressive MP4
      if (!hls.levels || hls.levels.length === 0) {
        console.warn("HLS manifest parsed with 0 playable levels; falling back to progressive MP4");
        fallbackToProgressive();
        return;
      }

      // 2. Select initial quality
      if (currentVideoQuality && currentVideoQuality !== "auto") {
        applyHlsQuality(hls, currentVideoQuality);
      }

      // 3. Trigger initial playback
      video.play().catch(() => {
        video.muted = true;
        video.play().catch(() => {});
      });
    });

    hls.on(Hls.Events.LEVEL_SWITCHED, (ev, data) => {
      const level = hls.levels[data.level];
      if (level) {
        const badge = level.height ? `${level.height}p` : "auto";
        document.querySelectorAll("[data-quality-badge]").forEach((b) => { b.textContent = badge; });
        sendQoETelemetry(item.id, "quality_switch", level.bitrate || 0);
      }
    });

    hls.on(Hls.Events.ERROR, (ev, data) => {
      if (data.fatal) {
        switch (data.type) {
          case Hls.ErrorTypes.NETWORK_ERROR:
            if (
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_ERROR ||
              data.details === Hls.ErrorDetails.MANIFEST_LOAD_TIMEOUT ||
              data.details === Hls.ErrorDetails.MANIFEST_PARSING_ERROR ||
              (data.response && data.response.code >= 400)
            ) {
              console.warn("Fatal manifest network error, falling back to progressive MP4:", data.details);
              fallbackToProgressive();
              return;
            }
            networkRetries++;
            if (networkRetries <= 2) {
              hls.startLoad();
            } else {
              console.warn("HLS network retries exhausted, falling back to progressive MP4");
              fallbackToProgressive();
            }
            break;
          case Hls.ErrorTypes.MEDIA_ERROR:
            mediaRetries++;
            if (mediaRetries === 1) {
              hls.recoverMediaError();
            } else if (mediaRetries === 2) {
              hls.swapAudioCodec();
              hls.recoverMediaError();
            } else {
              console.warn("HLS media errors unrecoverable, falling back to progressive MP4");
              fallbackToProgressive();
            }
            break;
          default:
            console.warn("Fatal HLS error, falling back to progressive MP4:", data);
            fallbackToProgressive();
            break;
        }
      }
    });

    hls.loadSource(hlsUrl);
    hls.attachMedia(video);
  } else if (video.canPlayType('application/vnd.apple.mpegurl')) {
    // Safari Native HLS
    video.src = hlsUrl;
    video.play().catch(() => {});
  } else {
    // Direct progressive fallback
    fallbackToProgressive();
  }
}

function openDetails(id, fromHistory = false, autoPlayVideo = false) {
  clearAutoplayCountdown();
  clearActiveInlinePreview();

  let item = visibleItems.get(id);
  if (!item) {
    const uploaded = loadUploadedVideos().find((v) => v.id === id);
    if (uploaded) {
      item = uploaded;
      visibleItems.set(item.id, item);
    }
  }
  if (!item && Array.isArray(studioCachedVideos)) {
    const cached = studioCachedVideos.find((v) => v.id === id);
    if (cached) {
      item = cached;
      visibleItems.set(item.id, item);
    }
  }

  // Ensure media_url is ALWAYS valid and NEVER a dead/revoked blob URL
  if (item && (item.type === "video" || item.isLiveVod || item.format === "live")) {
    if (!item.media_url || item.media_url.startsWith("blob:") || item.isLiveVod || item.format === "live" || (typeof item.id === "string" && item.id.startsWith("v_live_"))) {
      item.media_url = "/api/media/" + encodeURIComponent(item.id);
    }
  }

  if (item && item.type === "video" && !item.media_url) {
    item.media_url = "/api/media/" + encodeURIComponent(item.id);
  }

  if (!item) {
    fetch("/api/v1/videos/" + encodeURIComponent(id))
      .then((res) => res.ok ? res.json() : null)
      .then((data) => {
        const it = (data && data.item) ? data.item : data;
        if (it && it.id) {
          if (it.type === "video" && (!it.media_url || it.media_url.startsWith("blob:") || it.isLiveVod || it.format === "live" || (typeof it.id === "string" && it.id.startsWith("v_live_")))) {
            it.media_url = "/api/media/" + encodeURIComponent(it.id);
          }
          visibleItems.set(it.id, it);
          openDetails(it.id, fromHistory, autoPlayVideo);
        } else if (id.startsWith("v_live_") || id.startsWith("v_up_") || id.includes("live")) {
          const isGuestViewer = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
          const fallbackLive = {
            id: id,
            title: id.startsWith("v_up_") ? "Uploaded Video" : "[LIVE REPLAY] Live Stream Broadcast",
            description: id.startsWith("v_up_") ? "Original video uploaded on Watchbloom." : "Recorded live broadcast replay on Watchbloom.",
            author: isGuestViewer ? "Watchbloom Creator" : (localProfile.name || "Watchbloom Creator"),
            date: new Date().toISOString().slice(0, 10),
            views: 45,
            type: "video",
            format: id.startsWith("v_up_") ? "standard" : "live",
            art: "art-night",
            mins: 5,
            duration: 300,
            category: "entertainment",
            tags: "#live #broadcast",
            media: "",
            media_url: "/api/media/" + encodeURIComponent(id),
            isLiveVod: !id.startsWith("v_up_")
          };
          visibleItems.set(fallbackLive.id, fallbackLive);
          openDetails(fallbackLive.id, fromHistory, autoPlayVideo);
        }
      }).catch(() => {});
    return;
  }
  restorePopoversFromDialog();
  let switching = false;
  if ($("creator-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("creator-dialog").close();
  }
  rememberViewed(item);
  const dialog = $("detail-dialog");
  dialog.dataset.itemId = item.id;
  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "video", id: item.id });
  }
  if (activeView === "reels") pauseReelFeed(results);
  if (activeView === "explore") $("home-shorts-track").querySelectorAll("[data-reel-video]").forEach((video) => video.pause());
  if (item.localPlaylist && Array.isArray(item.items) && !item.localItemsFetchAttempted) {
    const missing = item.items.filter((itemId) => !visibleItems.has(itemId));
    if (missing.length) {
      item.localItemsFetchAttempted = true;
      Promise.all(missing.map((itemId) => fetch("/api/v1/videos/" + encodeURIComponent(itemId)).then((response) => response.ok ? response.json() : null).catch(() => null)))
        .then((rows) => {
          if (!dialog.open || dialog.dataset.itemId !== item.id) return;
          rows.filter(Boolean).forEach((child) => visibleItems.set(child.id, child));
          item.playlist_items = item.items.map((itemId) => visibleItems.get(itemId)).filter(Boolean);
          openDetails(item.id);
        });
    }
  }
  dialog.classList.remove("cinema-mode");
  dialog.classList.toggle("reel-mode", item.format === "reel" || item.format === "short");
  const content = $("dialog-content");
  const hasVideo = item.type === "video";
  const tags = String(item.tags || "").split(/\s+/).filter(Boolean).map((tag) => "<span>" + esc(tag) + "</span>").join("");
  const subtitleTracks = Array.isArray(item.subtitle_tracks) ? item.subtitle_tracks : [];
  const trackMarkup = subtitleTracks.map((track) => '<track kind="subtitles" srclang="' + esc(track.language || "en") + '" label="' + esc(track.label || track.language || "Subtitles") + '" src="' + esc(track.url || "") + '">').join("");
  const downloadAction = hasVideo && item.media_url
    ? '<a class="video-menu-download" href="' + esc(item.media_url + (item.media_url.includes("?") ? "&" : "?") + "download=1") + '" download><span aria-hidden="true">⇩</span><span>' + esc(tr("downloadVideo")) + '</span></a>' : "";
  const qualityOptionsList = [
    { value: "auto", label: "Auto (Recommended)" },
    { value: "2160p", label: "2160p (4K UHD)" },
    { value: "1440p", label: "1440p (2K QHD)" },
    { value: "1080p", label: "1080p (Full HD)" },
    { value: "720p", label: "720p (HD)" },
    { value: "480p", label: "480p" },
    { value: "360p", label: "360p" },
    { value: "240p", label: "240p" },
    { value: "144p", label: "144p" }
  ];

  const qualityItemsMarkup = qualityOptionsList.map((opt) => {
    const isSelected = currentVideoQuality === opt.value;
    return '<button type="button" class="video-quality-option" data-set-quality="' + esc(opt.value) + '" role="radio" aria-checked="' + isSelected + '">' +
      '<span class="quality-opt-check" aria-hidden="true">' + (isSelected ? "✓" : "") + '</span>' +
      '<span class="quality-opt-label">' + esc(opt.label) + '</span>' +
    '</button>';
  }).join("");

  const playerQualityMenu = hasVideo && item.media_url ? (
    '<div id="video-quality-menu" class="video-quality-menu" data-quality-panel hidden>' +
      '<div class="video-quality-menu-header">' +
        '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" width="16" height="16" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="M7 15V9h2.5a2 2 0 0 1 2 2v0a2 2 0 0 1-2 2H7m7-4v6m0-3h3m0-3v6"/></svg>' +
        '<span>' + esc(tr("quality")) + '</span>' +
      '</div>' +
      '<div class="video-quality-options" role="radiogroup" aria-label="' + esc(tr("quality")) + '">' +
        qualityItemsMarkup +
      '</div>' +
    '</div>'
  ) : "";

  const autoplayTitle = isAutoplayEnabled ? (tr("autoplayOn") || "Autoplay is on") : (tr("autoplayOff") || "Autoplay is off");
  const autoplayButtonMarkup = '<button type="button" class="video-control-button video-autoplay-toggle-btn ' + (isAutoplayEnabled ? 'active' : '') + '" data-player-action="toggle-autoplay" aria-pressed="' + isAutoplayEnabled + '" aria-label="' + esc(autoplayTitle) + '" title="' + esc(autoplayTitle) + '">' +
    '<span class="autoplay-switch-track ' + (isAutoplayEnabled ? 'active' : '') + '"><span class="autoplay-switch-thumb">▶</span></span>' +
  '</button>';

  const playerSettings = hasVideo && item.media_url ? (
    '<div id="video-settings-menu" class="player-more-menu video-settings-menu" data-more-panel hidden>' +
      downloadAction +
      '<div class="video-menu-toggle-row">' +
        '<span>' + esc(tr("autoplay") || "Autoplay next video") + '</span>' +
        '<button type="button" class="video-autoplay-toggle-btn ' + (isAutoplayEnabled ? 'active' : '') + '" data-player-action="toggle-autoplay" style="padding:0;">' +
          '<span class="autoplay-switch-track ' + (isAutoplayEnabled ? 'active' : '') + '"><span class="autoplay-switch-thumb">▶</span></span>' +
        '</button>' +
      '</div>' +
      '<label>' + esc(tr("playbackSpeed")) + '<select data-playback-speed><option value="0.5">0.5×</option><option value="0.75">0.75×</option><option value="1" selected>1×</option><option value="1.25">1.25×</option><option value="1.5">1.5×</option><option value="1.75">1.75×</option><option value="2">2×</option></select></label>' +
      '<button type="button" class="video-menu-item" data-player-action="toggle-pip">▣ <span>' + esc(tr("pictureInPicture")) + '</span></button>' +
      '<label>' + esc(tr("audioLanguage")) + '<select id="audio-language" disabled><option>' + esc(tr("originalAudio")) + '</option></select><small id="audio-track-note">' + esc(tr("audioTracksNote")) + '</small></label>' +
      '<label>' + esc(tr("subtitles")) + '<select id="subtitle-language" disabled><option value="off">' + esc(tr("subtitlesOff")) + '</option></select><small id="subtitle-track-note">' + esc(tr("subtitlesUnavailable")) + '</small></label>' +
      '<button type="button" class="video-menu-item subtitle-menu-toggle" data-player-action="toggle-subtitles" aria-pressed="false" aria-label="' + esc(tr("subtitles")) + '"><span class="subtitle-menu-icon" aria-hidden="true">CC</span><span data-subtitle-state>' + esc(tr("subtitlesOff")) + '</span></button>' +
      '<button type="button" class="video-menu-item" data-player-action="cinema" aria-pressed="false">▣ <span>' + esc(tr("cinemaMode")) + '</span></button>' +
    '</div>'
  ) : "";

  if (hasVideo && (!item.media_url || item.media_url.startsWith("blob:") || item.isLiveVod || item.format === "live" || (typeof item.id === "string" && item.id.startsWith("v_live_")))) {
    item.media_url = "/api/media/" + encodeURIComponent(item.id);
  }
  let activeMediaUrl = "";
  if (hasVideo && item.media_url) {
    const isLive = Boolean(item.isLiveVod || item.format === "live" || (typeof item.id === "string" && item.id.startsWith("v_live_")));
    if (!isLive && currentVideoQuality && currentVideoQuality !== "auto") {
      const sep = item.media_url.includes("?") ? "&" : "?";
      activeMediaUrl = item.media_url + sep + "quality=" + encodeURIComponent(currentVideoQuality);
    } else {
      activeMediaUrl = item.media_url;
    }
  }



  const headlineMarkup = '<div class="video-headline-overlay" data-video-headline><div class="video-headline-content"><h2 class="video-headline-title">' + esc(item.title) + '</h2></div></div>';
  const media = hasVideo && item.media_url
    ? '<div class="video-shell" data-quality="' + esc(currentVideoQuality) + '">' + headlineMarkup + '<video class="video-player" playsinline preload="metadata" data-quality="' + esc(currentVideoQuality) + '">' + trackMarkup + '</video>' +
      '<div class="video-control-bar" aria-label="Video controls">' +
        '<div class="video-control-row">' +
          '<button type="button" class="video-control-button" data-player-action="toggle-play" aria-label="Play video"><span data-player-play-icon aria-hidden="true">▶</span></button>' +
          '<span class="video-time" data-video-time>0:00 / 0:00</span>' +
          '<span class="video-control-spacer"></span>' +
          autoplayButtonMarkup +
          '<input class="video-volume" data-video-volume type="range" min="0" max="1" step="0.05" value="1" aria-label="Volume">' +
          '<button type="button" class="video-control-button" data-player-action="toggle-mute" aria-label="Mute video" title="Mute"><span data-video-volume-icon aria-hidden="true">◖))</span></button>' +
          '<button type="button" class="video-control-button video-quality-badge-btn" data-player-action="toggle-quality-menu" data-quality="' + esc(currentVideoQuality) + '" aria-label="' + esc(tr("quality")) + '" title="' + esc(tr("quality")) + ': ' + esc(qualityFullLabel(currentVideoQuality)) + '"><span class="quality-badge-pill" data-quality-badge>' + qualityBadgeLabel(currentVideoQuality) + '</span></button>' +
          '<button type="button" class="video-control-button video-fullscreen-button" data-player-action="toggle-fullscreen" aria-label="Fullscreen" title="Fullscreen">⛶</button>' +
          '<button type="button" class="video-control-button video-options-button" data-player-action="toggle-more" aria-label="More video options" aria-expanded="false" aria-controls="video-settings-menu">⋮</button>' +
        '</div>' +
        '<input class="video-seek" data-video-seek type="range" min="0" max="1000" step="1" value="0" aria-label="Seek video">' +
      '</div>' + playerQualityMenu + playerSettings + '</div><p id="player-message" class="player-message" hidden></p><p id="subtitle-status" class="player-message" role="status" aria-live="polite" hidden></p>'
    : '<p class="player-message">' + esc(hasVideo ? tr("watchFileMissing") : tr("playlistNote")) + '</p>';
  const playlistItems = (item.playlist_items || []).map((child) =>
    '<button type="button" class="playlist-item" data-open="' + esc(child.id) + '" aria-label="' + esc(child.title) + '"><span class="playlist-mini-cover ' + art(child) + '" aria-hidden="true">▶</span><span class="playlist-item-title">' + esc(child.title) + '</span><span class="playlist-item-meta">' + esc(child.mins + " " + tr("mins")) + '</span></button>'
  ).join("");
  const playlistSection = !hasVideo
    ? '<h3 class="playlist-heading">' + esc(tr("playlistContents")) + '</h3><div class="playlist-items">' + (playlistItems || '<p class="player-message">' + esc(tr("playlistEmpty")) + '</p>') + '</div>' : "";
  const extraDetails = reelExtraMarkup(item);
  const creator = '<div class="card-author detail-author">' + creatorIdentity(item.author) + creatorControls(item.author) + '</div>';
  const myPlaylists = localPlaylists.map((list) => '<option value="' + esc(list.id) + '">' + esc(list.title) + ' (' + list.items.length + ')</option>').join("");
  const playerActions = hasVideo ? '<div class="player-action-row">' +
    '<button type="button" class="player-action state-action reaction-action" data-reaction="like" aria-label="' + esc(tr("like")) + '" aria-pressed="false" disabled><svg class="reaction-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11m0-10 5-7a2.2 2.2 0 0 1 2.1 2.8L13.5 10H19a2 2 0 0 1 1.9 2.6l-1.4 6a2 2 0 0 1-1.9 1.5H7"/><path d="M4 10h3v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/></svg><span>' + esc(tr("like")) + '</span><span class="reaction-count" data-reaction-count="like">0</span></button>' +
    '<button type="button" class="player-action state-action reaction-action" data-reaction="dislike" aria-label="' + esc(tr("dislike")) + '" aria-pressed="false" disabled><svg class="reaction-icon reaction-icon-down" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M7 10v11m0-10 5-7a2.2 2.2 0 0 1 2.1 2.8L13.5 10H19a2 2 0 0 1 1.9 2.6l-1.4 6a2 2 0 0 1-1.9 1.5H7"/><path d="M4 10h3v11H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2Z"/></svg><span>' + esc(tr("dislike")) + '</span><span class="reaction-count" data-reaction-count="dislike">0</span></button>' +
    '<button type="button" class="player-action state-action comment-action" data-player-action="focus-comments" aria-label="' + esc(tr("commentAction")) + '"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h-.5A2.5 2.5 0 0 1 3 14.5v-9A2.5 2.5 0 0 1 5.5 3Z"/><path d="M7 8h10M7 12h7"/></svg><span>' + esc(tr("commentAction")) + '</span><span class="reaction-count" data-comment-count="0">0</span></button>' +
    '<button type="button" class="player-action state-action watch-later-action" data-player-action="watch-later" aria-pressed="' + savedIds.has(item.id) + '">' + (savedIds.has(item.id) ? '✓ ' + esc(tr("removeWatchLater")) : '＋ ' + esc(tr("watchLater"))) + '</button>' +
    '<button type="button" class="player-action state-action" data-player-action="toggle-playlist">＋ ' + esc(tr("saveToPlaylist")) + '</button>' +
    '<button type="button" class="player-action state-action share-video-action" data-player-action="share-video" data-video-id="' + esc(item.id) + '" aria-label="' + esc(tr("share")) + '"><svg viewBox="0 0 24 24" fill="currentColor" width="16" height="16" aria-hidden="true" style="vertical-align:-2px"><path d="M14 5 21 12l-7 7v-4c-5 0-8 2-11 5 1-6 4-10 11-10V5Z"/></svg> <span class="share-label">' + esc(tr("share")) + '</span></button></div>' +
    '<div class="playlist-save-panel" data-playlist-panel hidden><label>' + esc(tr("playlistChoose")) + '<select data-playlist-select><option value="">' + esc(tr("playlistChoose")) + '</option>' + myPlaylists + '</select></label><label>' + esc(tr("playlistName")) + '<input data-new-playlist maxlength="70" placeholder="Weekend ideas"></label><button type="button" class="player-action state-action" data-player-action="save-playlist">' + esc(tr("saveToSelected")) + '</button><p class="local-only-note">' + esc(tr("localOnly")) + '</p><p class="playlist-save-status" data-playlist-status role="status"></p></div>' +
    '<p class="reaction-status" data-reaction-status role="status" aria-live="polite"></p>' : "";
  const comments = hasVideo ? '<section id="video-comments" class="comments-section"><div class="comments-heading"><h3><svg class="comments-title-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" aria-hidden="true"><path d="M4 5.5A2.5 2.5 0 0 1 6.5 3h11A2.5 2.5 0 0 1 20 5.5v9a2.5 2.5 0 0 1-2.5 2.5H11l-5 4v-4h-.5A2.5 2.5 0 0 1 3 14.5v-9A2.5 2.5 0 0 1 5.5 3Z"/><path d="M7 8h10M7 12h7"/></svg>' + esc(tr("comments")) + '</h3><div class="comment-sort" role="group" aria-label="' + esc(tr("comments")) + '"><button type="button" data-comment-sort="newest" aria-pressed="' + (playerCommentSort === "newest") + '">' + esc(tr("newestComments")) + '</button><button type="button" data-comment-sort="best" aria-pressed="' + (playerCommentSort === "best") + '">' + esc(tr("bestComments")) + '</button></div></div><form class="comment-form" data-comment-form><label class="sr-only" for="new-comment">' + esc(tr("writeComment")) + '</label><textarea id="new-comment" maxlength="600" required placeholder="' + esc(tr("writeComment")) + '"></textarea><button class="player-action state-action" type="submit">' + esc(tr("postComment")) + '</button></form><div id="comment-list" class="comment-list"></div></section>' : "";
  const relatedRail = hasVideo ? '<aside class="recommendation-rail suggested-rail" aria-label="' + esc(tr("suggestedVideos")) + '">' +
    '<div class="suggested-rail-header">' +
      '<div class="suggested-rail-title-row">' +
        '<div class="suggested-rail-title-group">' +
          '<svg class="suggested-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><polygon points="5 3 19 12 5 21 5 3"/><path d="M19 5v14"/></svg>' +
          '<h3 class="suggested-heading">' + esc(tr("suggestedVideos")) + '</h3>' +
        '</div>' +
        '<div class="suggested-autoplay-quick">' +
          '<span class="suggested-autoplay-text">' + esc(tr("autoplay")) + '</span>' +
          '<button type="button" class="video-autoplay-toggle-btn ' + (isAutoplayEnabled ? 'active' : '') + '" data-player-action="toggle-autoplay" aria-label="' + esc(autoplayTitle) + '" title="' + esc(autoplayTitle) + '" style="padding:0; margin:0;">' +
            '<span class="autoplay-switch-track ' + (isAutoplayEnabled ? 'active' : '') + '"><span class="autoplay-switch-thumb">▶</span></span>' +
          '</button>' +
        '</div>' +
      '</div>' +
      '<div class="suggested-filter-chips" role="tablist" aria-label="Suggested video filters">' +
        '<button type="button" class="suggested-chip ' + (currentSuggestedFilter === 'all' ? 'active' : '') + '" data-suggested-filter="all">' + esc(tr("cat_all") || "All") + '</button>' +
        '<button type="button" class="suggested-chip ' + (currentSuggestedFilter === 'related' ? 'active' : '') + '" data-suggested-filter="related">' + esc(tr("filterRelated") || "Related") + '</button>' +
        '<button type="button" class="suggested-chip ' + (currentSuggestedFilter === 'creator' ? 'active' : '') + '" data-suggested-filter="creator">' + esc(tr("filterFromCreator") || "From channel") + '</button>' +
        '<button type="button" class="suggested-chip ' + (currentSuggestedFilter === 'recent' ? 'active' : '') + '" data-suggested-filter="recent">' + esc(tr("newest") || "Recently added") + '</button>' +
      '</div>' +
    '</div>' +
    '<div id="related-list" class="related-list suggested-list"></div>' +
  '</aside>' : "";
  const itemViews = getItemViews(item);
  const formattedUploadDate = formatUploadDate(item.date, true);
  const isLiveItem = Boolean(item.isLiveVod || item.format === "live" || (typeof item.id === "string" && item.id.startsWith("v_live_")));
  const liveBadgePill = isLiveItem
    ? '<span class="golive-badge-live" style="margin-right: 6px; display:inline-flex; align-items:center;">● ' + esc(tr("streamLive") || "LIVE") + '</span><span data-live-viewers="' + esc(item.id) + '" style="font-weight:700; color:#ef4444; margin-right: 8px;">1 watching</span>'
    : '<span data-item-views="' + esc(item.id) + '">' + esc(views(itemViews)) + ' ' + esc(tr("plays")) + '</span>';
  const cover = '<div class="cover dialog-cover ' + art(item) + '"' + (hasVideo && item.media_url ? ' hidden' : '') + '><span class="cover-type">' + esc(categoryLabel(item.category)) + '</span><span class="cover-word">' + esc(item.title) + '</span><span class="cover-duration">' + esc(duration(item)) + '</span></div>';
  content.innerHTML = dialogHeader(hasVideo ? tr("originalVideo") : tr("playlist"), false) + '<div class="player-layout"><div class="player-main">' + cover + media + '<section class="dialog-content"><h2 id="dialog-title">' + esc(item.title) + '</h2>' + creator + playerActions + '<p>' + liveBadgePill + ' · ' + esc(tr("category")) + ': ' + esc(categoryLabel(item.category)) + ' · ' + esc(tr("added")) + ' ' + esc(formattedUploadDate) + '</p><p>' + esc(item.description) + '</p>' + extraDetails + '<div class="dialog-tags">' + tags + '</div>' + playlistSection + (!item.media_url && hasVideo ? '<div class="dialog-note">' + esc(tr("noMediaTag")) + '</div>' : '') + '</section>' + comments + '</div>' + relatedRail + '</div>';

  if (isLiveItem) {
    connectLiveStreamSSE(item.id, (data) => {
      const vEl = content.querySelector('[data-live-viewers="' + item.id + '"]');
      if (vEl && typeof data.viewers === "number") {
        vEl.textContent = data.viewers + " watching";
      }
    });
  }



  bindCreatorControls(content);
  const video = content.querySelector("video");
  const qualSel = content.querySelector("[data-video-quality]");
  if (qualSel) qualSel.value = currentVideoQuality;
  if (video) {
    const shell = video.closest(".video-shell");
    if (shell) setupVideoActivityController(shell, video);
    attachHlsAndQoE(video, item, activeMediaUrl);
    video.addEventListener("error", (e) => {
      if (window.activeHlsPlayer && video.src && video.src.startsWith("blob:")) {
        return;
      }
      console.warn("Video load error for:", item?.id, video.src, e);
      if (video.src.includes("quality=") && !video.dataset.retriedClean) {
        video.dataset.retriedClean = "true";
        video.src = video.src.split("?")[0];
        video.load();
        video.play().catch(() => {});
        return;
      }
      if (!video.dataset.retriedServer && item?.id) {
        video.dataset.retriedServer = "true";
        const canonical = "/api/media/" + encodeURIComponent(item.id);
        if (video.src !== canonical && !video.src.endsWith(canonical)) {
          video.src = canonical;
          video.load();
          video.play().catch(() => {});
          return;
        }
      }
      if (!video.dataset.retriedFilename && item?.media && typeof item.media === "string") {
        video.dataset.retriedFilename = "true";
        video.src = "/api/media/" + encodeURIComponent(item.media);
        video.load();
        video.play().catch(() => {});
        return;
      }
      const isLiveItem = Boolean(item?.isLiveVod || item?.format === "live" || (typeof item?.id === "string" && item.id.startsWith("v_live_")));
      if (isLiveItem) {
        console.warn("Live stream playback error for:", item?.id, video.src);
        const inMemBlob = liveStreamBlobs.get(item?.id);
        if (inMemBlob && video.src !== inMemBlob) {
          video.src = inMemBlob;
          video.load();
          video.play().catch(() => {});
          return;
        }
        const shell = video.closest(".video-shell");
        if (shell) shell.hidden = true;
        const message = $("player-message");
        if (message) { message.textContent = tr("playbackFailed") || "Live broadcast replay is currently unavailable."; message.hidden = false; }
        return;
      }
      const shell = video.closest(".video-shell");
      if (shell) shell.hidden = true;
      const message = $("player-message");
      if (message) { message.textContent = tr("playbackFailed"); message.hidden = false; }
    });
    video.addEventListener("play", () => {
      recordVideoView(item.id);
    });
    video.addEventListener("ended", () => {
      handleVideoEnded(item, video);
    });
    const playerSyncEvents = ["loadedmetadata", "durationchange", "timeupdate", "play", "pause", "volumechange"];
    playerSyncEvents.forEach((eventName) => {
      video.addEventListener(eventName, () => syncPlayerControls(video));
    });
    video.addEventListener("loadedmetadata", () => {
      if (video.duration === Infinity && !window.activeHlsPlayer && (video.currentSrc || video.src || "").includes(".webm")) {
        const knownDuration = Number(item?.duration) || (Number(item?.mins) ? item.mins * 60 : 0);
        if (knownDuration > 0) {
          video.dataset.knownDuration = String(knownDuration);
        }
        video.currentTime = 1e101;
        video.addEventListener("timeupdate", function fixDur() {
          video.removeEventListener("timeupdate", fixDur);
          video.currentTime = 0;
          syncPlayerControls(video);
        }, { once: true });
      }
      syncPlayerControls(video);
    }, { once: true });
    video.addEventListener("loadedmetadata", () => configureAudioTracks(video), { once: true });
    configureAudioTracks(video);
    video.addEventListener("loadedmetadata", () => applySubtitleSelection(video), { once: true });
    configureSubtitleTracks(video, subtitleTracks);
    video.addEventListener("click", () => {
      if (video.paused) video.play().catch(() => {});
      else video.pause();
    });
    syncPlayerControls(video);
    if (autoPlayVideo) {
      setTimeout(() => {
        video.play().catch(() => {
          video.muted = true;
          video.play().catch(() => {});
        });
      }, 120);
    }
  }
  renderComments(item.id);
  if (hasVideo) {
    syncReactionUI(item.id, reactionSummaries.get(item.id));
    loadReactionSummary(item.id);
  }
  if (hasVideo) loadRelated(item);
  moveNavigationIntoPlayer();
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;
}

let activeLiveMediaStream = null;
let activeLiveAudioContext = null;
let activeLiveAudioAnalyser = null;
let activeLiveAudioAnimFrame = null;
let isLiveBroadcasting = false;
let liveStreamStartTime = null;
let liveStreamTimerInterval = null;
let liveChatSimulationInterval = null;
let liveViewersInterval = null;
let liveStreamViewers = 24;
let liveStreamLikes = 18;
let liveStreamSuperChatTotal = 0;
let liveCameraMuted = false;
let liveMicMuted = false;
let liveIsScreenSharing = false;
let liveVirtualModeActive = false;
let liveVirtualCanvasAnim = null;
let currentLiveBroadcastMeta = null;
let liveMediaRecorder = null;
let liveRecordedChunks = [];
let latestRecordedLiveBlob = null;
let latestRecordedLiveUrl = null;
let currentEndedLiveId = null;
let currentActiveLiveId = null;
const liveStreamBlobs = new Map();

function startLiveRecording() {
  liveRecordedChunks = [];
  latestRecordedLiveBlob = null;
  latestRecordedLiveUrl = null;

  if (!activeLiveMediaStream || typeof MediaRecorder === "undefined") {
    console.warn("activeLiveMediaStream or MediaRecorder not available for recording");
    return;
  }

  try {
    let mimeType = "";
    if (MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")) {
      mimeType = "video/webm;codecs=vp9,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm;codecs=vp8,opus")) {
      mimeType = "video/webm;codecs=vp8,opus";
    } else if (MediaRecorder.isTypeSupported("video/webm")) {
      mimeType = "video/webm";
    } else if (MediaRecorder.isTypeSupported("video/mp4")) {
      mimeType = "video/mp4";
    }
    const options = mimeType ? { mimeType } : {};
    liveMediaRecorder = new MediaRecorder(activeLiveMediaStream, options);
    liveMediaRecorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) {
        liveRecordedChunks.push(event.data);
        if (currentActiveLiveId) {
          const chunkData = new FormData();
          chunkData.append("id", currentActiveLiveId);
          chunkData.append("chunk", event.data, "chunk.webm");
          fetch("/api/v1/live/feed", {
            method: "POST",
            body: chunkData
          }).catch(() => {});
        }
      }
    };
    liveMediaRecorder.start(1000);
    console.log("Live stream recording started with mimeType:", mimeType || "default");
  } catch (err) {
    console.warn("Could not start MediaRecorder on live stream:", err);
  }
}

function stopLiveRecording() {
  return new Promise((resolve) => {
    if (!liveMediaRecorder || liveMediaRecorder.state === "inactive") {
      if (liveRecordedChunks.length) {
        try {
          const mime = liveMediaRecorder?.mimeType || "video/webm";
          latestRecordedLiveBlob = new Blob(liveRecordedChunks, { type: mime });
          latestRecordedLiveUrl = URL.createObjectURL(latestRecordedLiveBlob);
        } catch (_) {}
      }
      resolve(latestRecordedLiveBlob);
      return;
    }

    liveMediaRecorder.addEventListener("stop", () => {
      try {
        const mime = liveMediaRecorder.mimeType || "video/webm";
        latestRecordedLiveBlob = new Blob(liveRecordedChunks, { type: mime });
        latestRecordedLiveUrl = URL.createObjectURL(latestRecordedLiveBlob);
        console.log("Live recording finalized, size:", latestRecordedLiveBlob.size, "bytes");
      } catch (err) {
        console.warn("Error finalizing live recording blob:", err);
      }
      resolve(latestRecordedLiveBlob);
    }, { once: true });

    try {
      if (typeof liveMediaRecorder.requestData === "function") {
        liveMediaRecorder.requestData();
      }
      liveMediaRecorder.stop();
    } catch (e) {
      console.warn("Error stopping liveMediaRecorder:", e);
      resolve(null);
    }
  });
}

// ── SERVER-SENT EVENTS (SSE) FOR REAL-TIME LIVE STREAM TELEMETRY ──
let activeLiveEventSource = null;

function connectLiveStreamSSE(streamId, onUpdate) {
  disconnectLiveStreamSSE();
  if (!window.EventSource || !streamId) return;

  const url = "/api/v1/live/" + encodeURIComponent(streamId) + "/events";
  try {
    activeLiveEventSource = new EventSource(url);

    activeLiveEventSource.addEventListener("connected", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof onUpdate === "function") onUpdate(data);
      } catch (_) {}
    });

    activeLiveEventSource.addEventListener("viewer_count", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof onUpdate === "function") onUpdate(data);
      } catch (_) {}
    });

    activeLiveEventSource.addEventListener("stream_status", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof onUpdate === "function") onUpdate(data);
      } catch (_) {}
    });

    activeLiveEventSource.addEventListener("stream_like", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (typeof onUpdate === "function") onUpdate(data);
      } catch (_) {}
    });

    activeLiveEventSource.addEventListener("chat_message", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.text) {
          appendLiveChatMessage(data.author || "Viewer", data.text, Boolean(data.is_host));
        }
      } catch (_) {}
    });

    activeLiveEventSource.addEventListener("super_chat", (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data && data.amount) {
          const curSymbol = data.currency === "INR" ? "₹" : (data.currency === "USD" ? "$" : "");
          appendLiveSuperChat(data.author || "Supporter", curSymbol + data.amount, data.text || "");
          if (typeof liveStreamSuperChatTotal === "number") {
            liveStreamSuperChatTotal += parseFloat(data.amount) || 0;
            const scTotalEl = $("golive-superchat-total");
            if (scTotalEl) scTotalEl.textContent = liveStreamSuperChatTotal.toFixed(2);
          }
        }
      } catch (_) {}
    });

    activeLiveEventSource.onerror = () => {
      // Browser EventSource automatically handles backoff and reconnect
    };
  } catch (err) {
    console.debug("SSE EventSource initialization error:", err);
  }
}

function disconnectLiveStreamSSE() {
  if (activeLiveEventSource) {
    try {
      activeLiveEventSource.close();
    } catch (_) {}
    activeLiveEventSource = null;
  }
}

function stopActiveLiveStream() {
  disconnectLiveStreamSSE();
  if (activeLiveMediaStream) {
    try {
      activeLiveMediaStream.getTracks().forEach((track) => track.stop());
    } catch (_) {}
    activeLiveMediaStream = null;
  }
  if (activeLiveAudioAnimFrame) {
    cancelAnimationFrame(activeLiveAudioAnimFrame);
    activeLiveAudioAnimFrame = null;
  }
  if (activeLiveAudioContext) {
    try { activeLiveAudioContext.close(); } catch (_) {}
    activeLiveAudioContext = null;
    activeLiveAudioAnalyser = null;
  }
  if (liveVirtualCanvasAnim) {
    cancelAnimationFrame(liveVirtualCanvasAnim);
    liveVirtualCanvasAnim = null;
  }
  if (liveStreamTimerInterval) {
    clearInterval(liveStreamTimerInterval);
    liveStreamTimerInterval = null;
  }
  if (liveChatSimulationInterval) {
    clearInterval(liveChatSimulationInterval);
    liveChatSimulationInterval = null;
  }
  if (liveViewersInterval) {
    clearInterval(liveViewersInterval);
    liveViewersInterval = null;
  }
  isLiveBroadcasting = false;
  liveCameraMuted = false;
  liveMicMuted = false;
  liveIsScreenSharing = false;
  liveVirtualModeActive = false;
}


function loadCommunityPosts() {
  const rows = readJson("watchbloom-community-posts", []);
  if (!Array.isArray(rows) || !rows.length) {
    const defaultPost = {
      id: "post_default_live_1",
      author: "Arun Singh Rana",
      handle: "@Anime_onthewayy",
      photo: null,
      text: "Namaste everyone! Welcome to my official channel on Watchbloom. Make sure to catch our high-definition 4K live streams, VFX demos, and interactive Q&A sessions right here!",
      createdAt: new Date(Date.now() - 3600000 * 20).toISOString(),
      likes: 19,
      streamMeta: {
        videoId: "v_live_1792487105156",
        title: "Arun Singh Rana · Unreal Engine 5 & Creative VFX Live Stream",
        desc: "Interactive live broadcast replay with real-time Q&A.",
        category: "creative",
        status: "replay",
        url: window.location.origin + "/?view=live",
        art: "art-violet",
        viewers: 2840,
        superChat: true
      }
    };
    writeJson("watchbloom-community-posts", [defaultPost]);
    return [defaultPost];
  }
  let modified = false;
  rows.forEach((p) => {
    if (p.streamMeta) {
      const titleLower = (p.streamMeta.title || "").toLowerCase();
      if (!p.streamMeta.videoId || p.streamMeta.videoId === "v_live_1792483699587") {
        if (titleLower.includes("vfx") || titleLower.includes("unreal") || titleLower.includes("creative") || titleLower.includes("blender")) {
          p.streamMeta.videoId = "v_live_1792487105156";
          modified = true;
        } else if (titleLower.includes("build") || titleLower.includes("code") || titleLower.includes("app")) {
          p.streamMeta.videoId = "v_live_1792488157981";
          modified = true;
        } else if (titleLower.includes("loki")) {
          p.streamMeta.videoId = "v_live_1792492149621";
          modified = true;
        } else if (titleLower.includes("story")) {
          p.streamMeta.videoId = "v_live_1792494296797";
          modified = true;
        } else if (!p.streamMeta.videoId) {
          p.streamMeta.videoId = "v_live_1792483699587";
          modified = true;
        }
      }
    }
  });
  if (modified) {
    writeJson("watchbloom-community-posts", rows);
  }
  return rows;
}

function saveCommunityPost(post) {
  const posts = loadCommunityPosts().filter((p) => p.id !== post.id);
  posts.unshift(post);
  writeJson("watchbloom-community-posts", posts);
}

function deleteCommunityPost(id) {
  const posts = loadCommunityPosts().filter((p) => p.id !== id);
  writeJson("watchbloom-community-posts", posts);
}

function openShareLivePostModal(customMeta = null) {
  const isGuest = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const authorName = isGuest ? "Watchbloom Creator" : localProfile.name.trim();
  const authorHandle = isGuest ? "@creator" : (localProfile.handle || "@" + channelSlug(authorName));

  const meta = customMeta || currentLiveBroadcastMeta || {
    title: (isGuest ? "Live Stream" : (authorName + " · Live Stream")),
    desc: "Join me live today on Watchbloom!",
    category: "entertainment",
    isLive: isLiveBroadcasting
  };

  const isLive = customMeta?.isLive ?? isLiveBroadcasting;
  const existingModal = $("share-live-post-modal");
  if (existingModal) existingModal.remove();
  const defaultCaption = isLive
    ? "🔴 I am live streaming right now on Watchbloom! Come join the broadcast, chat live with me, and ask questions: " + meta.title
    : "🎬 Check out the replay of my live stream: \"" + meta.title + "\" on Watchbloom! Drop your thoughts in the comments.";

  const streamUrl = isLive
    ? window.location.origin + "/?view=live&host=" + encodeURIComponent(authorName)
    : window.location.origin + "/#video=" + encodeURIComponent(meta.videoId || meta.id || "");

  const modalHtml = document.createElement("div");
  modalHtml.id = "share-live-post-modal";
  modalHtml.className = "share-post-modal-backdrop";
  modalHtml.innerHTML = '<div class="share-post-modal-card" role="dialog" aria-labelledby="share-post-modal-title">' +
    '<div class="share-post-modal-header">' +
      '<div style="display: flex; align-items: center; gap: 8px;">' +
        '<span style="font-size: 20px;">📢</span>' +
        '<h3 id="share-post-modal-title" style="margin: 0; font-size: 17px; font-weight: 800; color: var(--ink);">' +
          esc(tr("shareLivePostTitle") || "Share Live Stream as Post") +
        '</h3>' +
      '</div>' +
      '<button type="button" class="creator-close" data-close-share-post aria-label="Close">×</button>' +
    '</div>' +

    '<div class="share-post-author-row">' +
      '<div class="community-avatar" style="width: 40px; height: 40px; font-size: 14px;">' +
        profilePhotoMarkup(localProfile.photo, authorName) +
      '</div>' +
      '<div>' +
        '<strong style="font-size: 13.5px; color: var(--ink); display: block;">' + esc(authorName) + '</strong>' +
        '<span style="font-size: 11.5px; color: var(--muted);">' + esc(authorHandle) + ' · Channel Post</span>' +
      '</div>' +
      '<span class="golive-badge-live" style="margin-left: auto; font-size: 10px; padding: 3px 8px;">' +
        (isLive ? '● LIVE BROADCAST' : '🎬 LIVE STREAM VOD') +
      '</span>' +
    '</div>' +

    '<div class="share-post-body">' +
      '<label style="display: block; font-size: 12px; font-weight: 700; color: var(--muted); margin-bottom: 6px;">Post Caption / Message:</label>' +
      '<textarea id="share-post-caption" class="share-post-textarea" rows="3" maxlength="400" placeholder="Write something about your live stream...">' + esc(defaultCaption) + '</textarea>' +

      '<div class="share-post-stream-card">' +
        '<div class="share-post-stream-thumb ' + esc(meta.art || "art-violet") + '">' +
          '<div class="share-post-pulse-dot"></div>' +
          '<span style="font-size: 22px;">' + (isLive ? '📡' : '▶') + '</span>' +
        '</div>' +
        '<div class="share-post-stream-info">' +
          '<span class="share-post-badge">' + (isLive ? '🔴 LIVE STREAM' : '▶ WATCH REPLAY') + '</span>' +
          '<strong class="share-post-stream-title">' + esc(meta.title) + '</strong>' +
          '<span class="share-post-stream-meta">' + esc(authorName) + ' · ' + esc(meta.category || "entertainment") + (isLive ? ' · WebRTC Ultra-Low Latency' : '') + '</span>' +
        '</div>' +
      '</div>' +
    '</div>' +

    '<div class="share-post-social-row">' +
      '<span style="font-size: 11.5px; color: var(--muted); font-weight: 600;">Share externally:</span>' +
      '<button type="button" class="share-social-pill" data-share-social="whatsapp" title="Share to WhatsApp">💬 WhatsApp</button>' +
      '<button type="button" class="share-social-pill" data-share-social="twitter" title="Share to X">𝕏 Twitter</button>' +
      '<button type="button" class="share-social-pill" data-share-social="telegram" title="Share to Telegram">✈️ Telegram</button>' +
      '<button type="button" class="share-social-pill" data-share-social="copy" title="Copy Link">🔗 Copy Link</button>' +
    '</div>' +

    '<div class="share-post-actions-bar">' +
      '<button type="button" class="studio-pill-btn" data-close-share-post>' + esc(tr("cancel") || "Cancel") + '</button>' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" id="share-post-publish-btn">' +
        '<span>📢</span> <span>' + esc(tr("publishToCommunity") || "Publish to Community") + '</span>' +
      '</button>' +
    '</div>' +
  '</div>';

  const parent = ($("creator-dialog")?.open ? $("creator-dialog") : document.body);
  parent.appendChild(modalHtml);

  modalHtml.querySelectorAll("[data-close-share-post]").forEach((btn) => {
    btn.addEventListener("click", () => modalHtml.remove());
  });
  modalHtml.addEventListener("click", (e) => {
    if (e.target === modalHtml) modalHtml.remove();
  });

  modalHtml.querySelectorAll("[data-share-social]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const type = btn.dataset.shareSocial;
      const caption = ($("share-post-caption")?.value || defaultCaption).trim();
      const fullText = caption + "\n" + streamUrl;
      if (type === "whatsapp") {
        window.open("https://api.whatsapp.com/send?text=" + encodeURIComponent(fullText), "_blank");
      } else if (type === "twitter") {
        window.open("https://twitter.com/intent/tweet?text=" + encodeURIComponent(caption) + "&url=" + encodeURIComponent(streamUrl), "_blank");
      } else if (type === "telegram") {
        window.open("https://t.me/share/url?url=" + encodeURIComponent(streamUrl) + "&text=" + encodeURIComponent(caption), "_blank");
      } else if (type === "copy") {
        if (navigator.clipboard) {
          navigator.clipboard.writeText(fullText).then(() => {
            showFollowToast("Post text and stream link copied to clipboard!");
          }).catch(() => {
            showFollowToast("Link copied: " + streamUrl);
          });
        } else {
          showFollowToast("Link copied: " + streamUrl);
        }
      }
    });
  });

  const pubBtn = modalHtml.querySelector("#share-post-publish-btn");
  if (pubBtn) {
    pubBtn.addEventListener("click", async () => {
      pubBtn.disabled = true;
      pubBtn.innerHTML = "<span>⏳</span> <span>Publishing to Community...</span>";

      const caption = ($("share-post-caption")?.value || defaultCaption).trim();
      const videoId = customMeta?.videoId || currentEndedLiveId || (liveStreamStartTime ? ("v_live_" + liveStreamStartTime) : ("v_live_" + Date.now()));
      const postObj = {
        id: "post_live_" + Date.now(),
        author: authorName,
        handle: authorHandle,
        photo: localProfile.photo || null,
        text: caption,
        createdAt: new Date().toISOString(),
        likes: Math.floor(Math.random() * 6) + 4,
        streamMeta: {
          videoId: videoId,
          title: meta.title,
          desc: meta.desc,
          category: meta.category,
          status: isLive ? "live" : "replay",
          url: streamUrl,
          art: meta.art || "art-violet",
          viewers: liveStreamViewers || 24,
          superChat: meta.superChat
        }
      };

      const existingVideo = visibleItems.get(videoId) || loadUploadedVideos().find((v) => v.id === videoId);
      const chosenBlobUrl = customMeta?.blobUrl || latestRecordedLiveUrl;
      const chosenBlob = customMeta?.blob || latestRecordedLiveBlob;

      if (!existingVideo) {
        const liveTitle = meta.title.startsWith("[LIVE") ? meta.title : (isLive ? meta.title : ("[LIVE REPLAY] " + meta.title));
        const liveItem = {
          id: videoId,
          title: liveTitle,
          description: meta.desc || ("Recorded live stream broadcast with " + authorName + "."),
          author: authorName,
          date: new Date().toISOString().slice(0, 10),
          views: (liveStreamViewers || 24) * 3 + 14,
          type: "video",
          format: "live",
          art: meta.art || "art-violet",
          mins: 5,
          duration: 300,
          category: meta.category || "entertainment",
          tags: "#live #broadcast #" + (meta.category || "entertainment"),
          media: chosenBlob ? (videoId + ".webm") : "",
          media_url: "/api/media/" + encodeURIComponent(videoId),
          isLiveVod: true
        };

        if (chosenBlobUrl) {
          liveStreamBlobs.set(videoId, chosenBlobUrl);
        }

        if (chosenBlob) {
          try {
            const formData = new FormData();
            formData.append("id", videoId);
            formData.append("title", liveItem.title);
            formData.append("description", liveItem.description);
            formData.append("author", liveItem.author);
            formData.append("category", liveItem.category);
            formData.append("tags", liveItem.tags);
            formData.append("mins", String(liveItem.mins));
            formData.append("duration", "300");
            formData.append("views", String(liveItem.views));
            formData.append("file", chosenBlob, videoId + ".webm");

            const res = await fetch("/api/v1/live/save", {
              method: "POST",
              body: formData
            });
            if (res.ok) {
              const d = await res.json();
              if (d.item && d.item.media) {
                liveItem.media = d.item.media;
              }
            }
          } catch (_) {}
        } else {
          try {
            const res = await fetch("/api/v1/live/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify(liveItem)
            });
            if (res.ok) {
              const d = await res.json();
              if (d.item && d.item.media) {
                liveItem.media = d.item.media;
              }
            }
          } catch (_) {}
        }

        saveUploadedVideo(liveItem);
        visibleItems.set(videoId, liveItem);
      } else {
        if (!existingVideo.media_url || existingVideo.media_url.startsWith("blob:")) {
          existingVideo.media_url = "/api/media/" + encodeURIComponent(videoId);
        }
        if (chosenBlobUrl) {
          liveStreamBlobs.set(videoId, chosenBlobUrl);
        }
        saveUploadedVideo(existingVideo);
        visibleItems.set(videoId, existingVideo);
      }

      saveCommunityPost(postObj);
      showFollowToast(tr("livePostSuccessToast") || "Live stream shared as community post!");
      modalHtml.remove();
      const creatorDialog = $("creator-dialog");
      if (creatorDialog && creatorDialog.open && creatorDialog.dataset.channelTab === "community") {
        renderCreatorChannelItems(creatorDialog, "community");
      }
    });
  }
}

function renderChannelCommunityTab(posts, isOwn) {
  let createPostBox = "";
  if (isOwn) {
    const isGuestOwner = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
    const authorDisplayName = isGuestOwner ? "Guest" : localProfile.name.trim();
    createPostBox = '<div class="community-create-post-card">' +
      '<div class="community-create-post-head">' +
        '<div class="community-avatar" style="width: 36px; height: 36px; font-size: 13px;">' +
          profilePhotoMarkup(isGuestOwner ? "" : localProfile.photo, isGuestOwner ? "WB" : authorDisplayName) +
        '</div>' +
        '<input type="text" class="community-create-input" id="community-quick-post-input" placeholder="Share an update or thoughts with your community...">' +
        '<button type="button" class="studio-pill-btn studio-pill-primary" id="community-quick-post-btn" style="padding: 8px 16px;">Post</button>' +
      '</div>' +
    '</div>';
  }

  const postsHtml = posts.length ? posts.map((p) => {
    let streamEmbed = "";
    if (p.streamMeta) {
      const isCurrentlyLive = p.streamMeta.status === "live" && isLiveBroadcasting;
      const vidId = p.streamMeta.videoId || "";
      streamEmbed = '<div class="community-post-stream-embed" data-post-stream-id="' + esc(vidId) + '" data-is-live="' + (isCurrentlyLive ? "true" : "false") + '" data-post-stream-url="' + esc(p.streamMeta.url || "") + '">' +
        '<div class="community-stream-thumb ' + esc(p.streamMeta.art || "art-violet") + '">' +
          '<span class="stream-embed-play">' + (isCurrentlyLive ? '📡' : '▶') + '</span>' +
          (isCurrentlyLive ? '<span class="stream-embed-live-tag">LIVE</span>' : '') +
        '</div>' +
        '<div class="community-stream-meta">' +
          '<span class="community-stream-badge">' + (isCurrentlyLive ? '🔴 LIVE STREAM BROADCAST' : '🎬 LIVE STREAM REPLAY') + '</span>' +
          '<strong class="community-stream-title">' + esc(p.streamMeta.title) + '</strong>' +
          '<p class="community-stream-desc">' + esc(p.streamMeta.desc || "Interactive broadcast on Watchbloom") + '</p>' +
          '<span class="community-stream-info">👥 ' + (p.streamMeta.viewers || 24) + ' viewers · ' + esc(p.streamMeta.category || "entertainment") + '</span>' +
        '</div>' +
      '</div>';
    }

    return '<div class="community-post-card" data-post-id="' + esc(p.id) + '">' +
      '<div class="community-post-head">' +
        '<div class="community-avatar" style="width: 38px; height: 38px; font-size: 13px;">' +
          profilePhotoMarkup(p.photo, p.author) +
        '</div>' +
        '<div>' +
          '<strong style="font-size: 13.5px; color: var(--ink); display: block;">' + esc(p.author) + '</strong>' +
          '<span style="font-size: 11px; color: var(--muted);">' + esc(p.handle || "@creator") + ' · ' + formatUploadDate(p.createdAt) + '</span>' +
        '</div>' +
      '</div>' +
      '<p class="community-post-text">' + esc(p.text) + '</p>' +
      streamEmbed +
      '<div class="community-post-actions">' +
        '<button type="button" class="community-action-btn" data-post-like="' + esc(p.id) + '">👍 ' + (p.likes || 0) + '</button>' +
        '<button type="button" class="community-action-btn" data-post-share="' + esc(p.id) + '">🔗 Share</button>' +
        (isOwn ? '<button type="button" class="community-action-btn" data-post-delete="' + esc(p.id) + '" style="color: #f87171; margin-left: auto;">🗑️ Delete</button>' : '') +
      '</div>' +
    '</div>';
  }).join("") : '<div class="channel-empty" style="padding: 40px; text-align: center; color: var(--muted);">' + esc(tr("noPostsFound") || "No community posts yet.") + '</div>';

  return '<div class="channel-community-feed">' + createPostBox + postsHtml + '</div>';
}
function openGoLiveStudio(fromHistory = false) {
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    restorePopoversFromDialog();
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    showFollowToast("Please sign in or create an account to start a live stream broadcast.");
    openAuthModal("signin");
    return;
  }

  stopActiveLiveStream();
  restorePopoversFromDialog();
  let switching = false;
  if ($("detail-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("detail-dialog").close();
  }
  const content = $("creator-dialog-content");
  const dialog = $("creator-dialog");
  delete dialog.dataset.profileEditor;
  delete dialog.dataset.channelOpen;
  delete dialog.dataset.channelAuthor;
  delete dialog.dataset.channelTab;
  delete dialog.dataset.channelLoadedAuthor;
  delete dialog.dataset.loadingAuthor;
  dialog.dataset.creatorAction = "live";
  dialog.dataset.channelRequest = String((Number(dialog.dataset.channelRequest) || 0) + 1);
  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "panel", action: "live" });
  }

  const isGuest = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const authorName = isGuest ? "Watchbloom Creator" : localProfile.name.trim();
  const defaultTitle = isGuest ? "Watchbloom Live Stream & Casual Talk" : (authorName + " · Live Stream & Casual Talk");

  content.innerHTML = creatorDialogHeader(tr("goLiveStudio") || "Go Live Studio") +
    '<div class="golive-container" id="golive-root">' +
      '<div class="golive-header-bar">' +
        '<div class="golive-title-row">' +
          '<h2 style="margin: 0; font-size: 22px; font-weight: 850; letter-spacing: -0.02em;">' + esc(tr("goLiveStudio") || "Go Live Studio") + '</h2>' +
          '<span class="golive-badge-setup" id="golive-state-pill">● ' + esc(tr("cameraPreview") || "Camera Preview") + '</span>' +
        '</div>' +
        '<div style="display: flex; gap: 8px;">' +
          '<button type="button" class="studio-pill-btn" data-golive-virtual-toggle title="Toggle Virtual Studio Camera"><span>🎬</span> <span>' + esc(tr("virtualStudioMode") || "Virtual Studio") + '</span></button>' +
        '</div>' +
      '</div>' +

      '<div class="golive-setup-grid" id="golive-setup-view">' +
        '<div>' +
          '<div class="golive-preview-wrapper" id="golive-preview-box">' +
            '<video id="golive-preview-video" class="golive-video" autoplay playsinline muted></video>' +
            '<div id="golive-cam-placeholder" class="golive-cam-off-placeholder is-hidden" style="display: none;" hidden>' +
              '<div class="golive-cam-off-avatar">' + esc(initials(isGuest ? "WB" : authorName)) + '</div>' +
              '<strong>Camera Paused</strong>' +
            '</div>' +
            '<div id="golive-permission-card" class="golive-cam-off-placeholder is-hidden" style="padding: 24px; text-align: center; display: none;" hidden>' +
              '<span style="font-size: 38px;">📹</span>' +
              '<strong style="font-size: 15px; color: var(--ink);">' + esc(tr("cameraPermissionNeeded") || "Camera access is needed to broadcast live.") + '</strong>' +
              '<div id="golive-perm-err-msg" style="max-width: 380px; margin: 4px auto 14px;">' +
                '<p style="font-size: 12px; margin: 0; color: var(--muted);">Click Allow Camera below or check the lock icon in your browser address bar.</p>' +
              '</div>' +
              '<div style="display: flex; gap: 10px; flex-wrap: wrap; justify-content: center;">' +
                '<button type="button" class="studio-pill-btn studio-pill-primary" data-golive-retry-cam><span>🔄</span> <span>' + esc(tr("allowCamera") || "Allow Camera") + '</span></button>' +
                '<button type="button" class="studio-pill-btn" data-golive-use-virtual><span>🎬</span> <span>' + esc(tr("virtualStudioMode") || "Virtual Studio Mode") + '</span></button>' +
              '</div>' +
            '</div>' +
            '<div class="golive-controls-bar">' +
              '<button type="button" class="golive-icon-btn" data-golive-toggle-cam title="Toggle Camera (On/Off)">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
              '</button>' +
              '<button type="button" class="golive-icon-btn" data-golive-toggle-mic title="Toggle Microphone (Mute/Unmute)">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
              '</button>' +
              '<button type="button" class="golive-icon-btn" data-golive-toggle-screenshare title="Share Screen">' +
                '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' +
              '</button>' +
              '<div class="golive-audio-meter-box" title="Microphone Level">' +
                '<div class="golive-audio-level"></div>' +
              '</div>' +
            '</div>' +
          '</div>' +
          '<p style="margin: 8px 4px 0; font-size: 11.5px; color: var(--muted); display: flex; align-items: center; gap: 6px;">' +
            '<span>✓ Webcam &amp; audio check active</span> · <span>WebRTC Ultra-Low Latency Ready</span>' +
          '</p>' +
        '</div>' +

        '<form class="golive-setup-panel" id="golive-setup-form">' +
          '<div class="golive-form-group">' +
            '<label class="golive-form-label" for="golive-title">' + esc(tr("streamTitle") || "Stream Title") + '</label>' +
            '<input type="text" id="golive-title" class="golive-input" required maxlength="90" value="' + esc(defaultTitle) + '" placeholder="e.g. My First Live Stream">' +
          '</div>' +

          '<div class="golive-form-group">' +
            '<label class="golive-form-label" for="golive-desc">' + esc(tr("streamDesc") || "Stream Description") + '</label>' +
            '<textarea id="golive-desc" class="golive-textarea" rows="2" placeholder="Tell viewers what this broadcast is about...">Join me live today for a casual talk, Q&A, and creative demo!</textarea>' +
          '</div>' +

          '<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">' +
            '<div class="golive-form-group">' +
              '<label class="golive-form-label" for="golive-category">' + esc(tr("streamCategory") || "Category") + '</label>' +
              '<select id="golive-category" class="golive-select">' +
                '<option value="entertainment" selected>Entertainment</option>' +
                '<option value="technology">Technology &amp; Coding</option>' +
                '<option value="gaming">Gaming</option>' +
                '<option value="creative">Creative Arts &amp; VFX</option>' +
                '<option value="music">Music &amp; Performance</option>' +
                '<option value="learning">Education &amp; Learning</option>' +
              '</select>' +
            '</div>' +
            '<div class="golive-form-group">' +
              '<label class="golive-form-label" for="golive-privacy">' + esc(tr("streamPrivacy") || "Visibility") + '</label>' +
              '<select id="golive-privacy" class="golive-select">' +
                '<option value="public" selected>Public</option>' +
                '<option value="unlisted">Unlisted</option>' +
              '</select>' +
            '</div>' +
          '</div>' +

          '<div style="padding: 10px 12px; border-radius: 10px; background: var(--panel2); border: 1px solid var(--line); display: flex; align-items: center; justify-content: space-between;">' +
            '<div>' +
              '<strong style="font-size: 12.5px; color: var(--ink); display: block;">Super Chat &amp; Fan Donations (₹)</strong>' +
              '<span style="font-size: 11px; color: var(--muted);">Allow fans to send highlighted rupee superchats</span>' +
            '</div>' +
            '<input type="checkbox" id="golive-superchat-toggle" checked style="width: 18px; height: 18px; accent-color: var(--accent);">' +
          '</div>' +

          '<button type="submit" class="golive-btn-start" id="golive-start-btn">' +
            '<span style="font-size: 16px;">🔴</span>' +
            '<span>' + esc(tr("startBroadcast") || "Go Live Now") + '</span>' +
          '</button>' +
        '</form>' +
      '</div>' +
    '</div>';

  moveNavigationIntoDialog(dialog);
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;

  requestCameraPreview();
}

async function acquireLiveMediaStream() {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    throw new Error("getUserMedia is not supported on this browser or connection is not secure (requires localhost or HTTPS).");
  }

  // Tier 1: HD 720p Video + Audio
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: true
    });
  } catch (err1) {
    console.warn("Tier 1 HD Video+Audio failed:", err1);
  }

  // Tier 2: Standard Video + Audio
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true
    });
  } catch (err2) {
    console.warn("Tier 2 Video+Audio failed:", err2);
  }

  // Tier 3: HD Video only (when mic not found or mic blocked)
  try {
    return await navigator.mediaDevices.getUserMedia({
      video: { width: { ideal: 1280 }, height: { ideal: 720 }, facingMode: "user" },
      audio: false
    });
  } catch (err3) {
    console.warn("Tier 3 Video Only failed:", err3);
  }

  // Tier 4: Basic Video only
  return await navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false
  });
}

async function requestCameraPreview() {
  const videoEl = $("golive-preview-video");
  const permCard = $("golive-permission-card");
  const camPlaceholder = $("golive-cam-placeholder");
  if (!videoEl) return;

  if (liveVirtualCanvasAnim) {
    cancelAnimationFrame(liveVirtualCanvasAnim);
    liveVirtualCanvasAnim = null;
  }
  if (activeLiveMediaStream) {
    try {
      activeLiveMediaStream.getTracks().forEach((t) => t.stop());
    } catch (_) {}
    activeLiveMediaStream = null;
  }

  if (permCard) {
    permCard.hidden = true;
    permCard.style.display = "none";
    permCard.classList.add("is-hidden");
  }
  if (camPlaceholder) {
    camPlaceholder.hidden = true;
    camPlaceholder.style.display = "none";
    camPlaceholder.classList.add("is-hidden");
  }

  try {
    const stream = await acquireLiveMediaStream();
    activeLiveMediaStream = stream;
    liveVirtualModeActive = false;
    liveCameraMuted = false;

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.srcObject = stream;
    videoEl.classList.remove("screen-share");
    videoEl.classList.remove("virtual-mode");
    try {
      await videoEl.play();
    } catch (pErr) {
      console.warn("video.play error:", pErr);
    }

    if (stream.getAudioTracks().length) {
      setupLiveAudioMeter(stream);
    }

    const pill = $("golive-state-pill");
    if (pill) {
      pill.textContent = "● " + (tr("cameraPreview") || "Webcam Active");
      pill.style.background = "#10b98122";
      pill.style.color = "#10b981";
      pill.style.borderColor = "#10b98144";
    }

    showFollowToast("Webcam connected successfully!");
  } catch (err) {
    console.warn("Camera access failed or denied:", err);
    if (permCard) {
      permCard.hidden = false;
      permCard.style.display = "flex";
      permCard.classList.remove("is-hidden");

      const errBox = $("golive-perm-err-msg");
      if (errBox) {
        if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
          errBox.innerHTML = '<div style="margin: 4px 0 10px; padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; color: #fca5a5; font-size: 12px; text-align: left;">' +
            '<strong style="display:block; margin-bottom: 3px; color: #f87171;">⚠️ Camera access blocked</strong>' +
            'Browser or Windows has blocked camera access. Click the 🔒 lock or 📹 icon in your browser URL bar, set <strong>Camera</strong> to <em>Allow</em>, then click <strong>Allow Camera</strong> below.' +
          '</div>';
        } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
          errBox.innerHTML = '<div style="margin: 4px 0 10px; padding: 10px 14px; background: rgba(234, 179, 8, 0.15); border: 1px solid rgba(234, 179, 8, 0.4); border-radius: 10px; color: #fde047; font-size: 12px; text-align: left;">' +
            '<strong style="display:block; margin-bottom: 3px; color: #facc15;">📷 No camera detected</strong>' +
            'No physical webcam found. You can test live streaming right now using <strong>Virtual Studio Mode</strong> below!' +
          '</div>';
        } else if (err.name === "NotReadableError" || err.name === "TrackStartError") {
          errBox.innerHTML = '<div style="margin: 4px 0 10px; padding: 10px 14px; background: rgba(239, 68, 68, 0.15); border: 1px solid rgba(239, 68, 68, 0.4); border-radius: 10px; color: #fca5a5; font-size: 12px; text-align: left;">' +
            '<strong style="display:block; margin-bottom: 3px; color: #f87171;">⚠️ Camera is busy in another app</strong>' +
            'Your webcam is currently being used by another app (Zoom, Teams, Skype, OBS, or Windows Camera). Please close it and click <strong>Allow Camera</strong>.' +
          '</div>';
        } else {
          errBox.innerHTML = '<div style="margin: 4px 0 10px; padding: 8px 12px; background: rgba(255,255,255,0.06); border-radius: 8px; color: var(--muted); font-size: 11.5px;">' +
            esc(err.message || err.name || "Camera device access error") +
          '</div>';
        }
      }
    }

    const pill = $("golive-state-pill");
    if (pill) {
      pill.textContent = "● " + (tr("cameraPermissionNeeded") || "Camera Access Needed");
      pill.style.background = "#ef444422";
      pill.style.color = "#f87171";
      pill.style.borderColor = "#ef444444";
    }
  }
}

async function startVirtualStudioFeed(videoEl) {
  if (!videoEl) return;
  liveVirtualModeActive = true;
  liveCameraMuted = false;

  // 1. Preserve existing live audio track if available, stop existing video tracks
  let audioTrack = null;
  if (activeLiveMediaStream) {
    try {
      const existingAudio = activeLiveMediaStream.getAudioTracks().find((t) => t.readyState === "live");
      if (existingAudio) {
        audioTrack = existingAudio;
      }
      activeLiveMediaStream.getVideoTracks().forEach((t) => {
        try { t.stop(); } catch (_) {}
      });
      activeLiveMediaStream.getAudioTracks().forEach((t) => {
        if (t !== audioTrack) {
          try { t.stop(); } catch (_) {}
        }
      });
    } catch (_) {}
    activeLiveMediaStream = null;
  }
  if (liveVirtualCanvasAnim) {
    cancelAnimationFrame(liveVirtualCanvasAnim);
    liveVirtualCanvasAnim = null;
  }

  // 2. Hide permission cards & placeholders
  const permCard = $("golive-permission-card");
  if (permCard) {
    permCard.hidden = true;
    permCard.style.display = "none";
    permCard.classList.add("is-hidden");
  }
  const camPlaceholder = $("golive-cam-placeholder");
  if (camPlaceholder) {
    camPlaceholder.hidden = true;
    camPlaceholder.style.display = "none";
    camPlaceholder.classList.add("is-hidden");
  }

  // 3. Acquire live microphone stream if not already active
  let isSyntheticAudio = false;
  if (!audioTrack && navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
    try {
      const micStream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });
      const tracks = micStream.getAudioTracks();
      if (tracks.length && tracks[0].readyState === "live") {
        audioTrack = tracks[0];
      }
    } catch (micErr) {
      console.warn("Virtual studio microphone access note:", micErr);
    }
  }

  // 4. Fallback synthetic audio track if real microphone is unavailable / blocked
  if (!audioTrack) {
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const dummyCtx = new AudioCtx();
        const dest = dummyCtx.createMediaStreamDestination();
        const osc = dummyCtx.createOscillator();
        const gain = dummyCtx.createGain();
        osc.frequency.value = 220;
        gain.gain.value = 0.00001;
        osc.connect(gain);
        gain.connect(dest);
        osc.start();
        const synthTracks = dest.stream.getAudioTracks();
        if (synthTracks.length) {
          audioTrack = synthTracks[0];
          isSyntheticAudio = true;
        }
      }
    } catch (synthErr) {
      console.warn("Synthetic studio audio fallback error:", synthErr);
    }
  }

  // 5. Build high-framerate Virtual Studio broadcast canvas
  const canvas = document.createElement("canvas");
  canvas.width = 1280;
  canvas.height = 720;
  const ctx = canvas.getContext("2d");

  let frameCount = 0;
  function renderVirtual() {
    frameCount++;
    ctx.fillStyle = "#0c0e12";
    ctx.fillRect(0, 0, 1280, 720);

    const grad = ctx.createRadialGradient(640, 360, 50, 640, 360, 600);
    grad.addColorStop(0, "rgba(99, 102, 241, 0.25)");
    grad.addColorStop(0.5, "rgba(168, 85, 247, 0.12)");
    grad.addColorStop(1, "rgba(15, 23, 42, 0.95)");
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1280, 720);

    ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
    ctx.lineWidth = 1;
    for (let x = 0; x < 1280; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, 720); ctx.stroke();
    }
    for (let y = 0; y < 720; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(1280, y); ctx.stroke();
    }

    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 44px Inter, system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText(localProfile.name || "Watchbloom Live Creator", 640, 290);

    ctx.fillStyle = "#a1a1aa";
    ctx.font = "19px Inter, system-ui, sans-serif";
    ctx.fillText("STUDIO BROADCAST FEED · ULTRA-LOW LATENCY", 640, 335);

    // Audio Visualizer Equalizer dynamically wired to microphone
    const barCount = 32;
    const barWidth = 14;
    const gap = 8;
    const totalW = barCount * (barWidth + gap);
    const startX = 640 - totalW / 2;

    let freqBins = null;
    let micLevel = 0;
    if (activeLiveAudioAnalyser && !liveMicMuted) {
      freqBins = new Uint8Array(activeLiveAudioAnalyser.frequencyBinCount);
      activeLiveAudioAnalyser.getByteFrequencyData(freqBins);
      let sum = 0;
      for (let k = 0; k < freqBins.length; k++) sum += freqBins[k];
      micLevel = sum / (freqBins.length || 1);
    }

    if (liveMicMuted) {
      for (let i = 0; i < barCount; i++) {
        const x = startX + i * (barWidth + gap);
        ctx.fillStyle = "#475569";
        ctx.fillRect(x, 447, barWidth, 6);
      }
      ctx.fillStyle = "#f87171";
      ctx.font = "bold 14px Inter, system-ui, sans-serif";
      ctx.fillText("🔇 MICROPHONE MUTED", 640, 485);
    } else {
      for (let i = 0; i < barCount; i++) {
        let h = 8;
        if (freqBins && micLevel > 1) {
          const binIdx = Math.min(freqBins.length - 1, Math.floor((i / barCount) * freqBins.length));
          const val = freqBins[binIdx] || 0;
          const liveHeight = (val / 255) * 140;
          const ripple = Math.sin((frameCount * 0.08) + (i * 0.35)) * 8;
          h = Math.max(10, Math.min(150, liveHeight + ripple));
        } else {
          h = Math.abs(Math.sin((frameCount * 0.06) + (i * 0.35))) * 28 + 10;
        }
        const x = startX + i * (barWidth + gap);
        const y = 450 - h / 2;
        ctx.fillStyle = i % 2 === 0 ? "#818cf8" : "#ec4899";
        if (ctx.roundRect) {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, h, 6);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, h);
        }
      }

      ctx.fillStyle = micLevel > 4 ? "#34d399" : "rgba(255, 255, 255, 0.45)";
      ctx.font = "bold 13px Inter, system-ui, sans-serif";
      ctx.fillText(micLevel > 4 ? "🎙️ MIC SIGNAL LIVE" : "🎙️ MICROPHONE READY · SPEAK TO BROADCAST", 640, 520);
    }

    ctx.fillStyle = "rgba(255, 255, 255, 0.6)";
    ctx.font = "15px monospace";
    ctx.fillText(new Date().toLocaleTimeString("en-IN", { hour12: false }) + " IST", 640, 560);

    liveVirtualCanvasAnim = requestAnimationFrame(renderVirtual);
  }
  renderVirtual();

  try {
    const stream = canvas.captureStream(30);
    if (audioTrack) {
      audioTrack.enabled = !liveMicMuted;
      stream.addTrack(audioTrack);
    }
    activeLiveMediaStream = stream;

    videoEl.muted = true;
    videoEl.defaultMuted = true;
    videoEl.playsInline = true;
    videoEl.srcObject = stream;
    videoEl.classList.remove("screen-share");
    videoEl.classList.add("virtual-mode");
    videoEl.play().catch(() => {});

    // Set up live audio meter with the active stream
    setupLiveAudioMeter(stream);
    if (activeLiveAudioContext && activeLiveAudioContext.state === "suspended") {
      activeLiveAudioContext.resume().catch(() => {});
    }

    const pill = $("golive-state-pill");
    if (pill) {
      pill.textContent = "● Virtual Studio Active";
      pill.style.background = "#8b5cf622";
      pill.style.color = "#a78bfa";
      pill.style.borderColor = "#8b5cf644";
    }
    showFollowToast(isSyntheticAudio ? "Virtual Studio active (Fallback mic tone)" : "Virtual Studio active · Microphone working!");
  } catch (e) {
    console.warn("captureStream not supported", e);
  }
}

function setupLiveAudioMeter(stream) {
  if (activeLiveAudioContext) {
    try { activeLiveAudioContext.close(); } catch(_) {}
    activeLiveAudioContext = null;
    activeLiveAudioAnalyser = null;
  }
  if (activeLiveAudioAnimFrame) {
    cancelAnimationFrame(activeLiveAudioAnimFrame);
    activeLiveAudioAnimFrame = null;
  }
  try {
    const AudioCtx = window.AudioContext || window.webkitAudioContext;
    if (!AudioCtx || !stream || !stream.getAudioTracks().length) return;
    activeLiveAudioContext = new AudioCtx();
    if (activeLiveAudioContext.state === "suspended") {
      const resume = () => {
        if (activeLiveAudioContext && activeLiveAudioContext.state === "suspended") {
          activeLiveAudioContext.resume().catch(() => {});
        }
      };
      activeLiveAudioContext.resume().catch(() => {});
      document.addEventListener("click", resume, { once: true });
      document.addEventListener("keydown", resume, { once: true });
    }
    const source = activeLiveAudioContext.createMediaStreamSource(stream);
    activeLiveAudioAnalyser = activeLiveAudioContext.createAnalyser();
    activeLiveAudioAnalyser.fftSize = 64;
    source.connect(activeLiveAudioAnalyser);
    const dataArr = new Uint8Array(activeLiveAudioAnalyser.frequencyBinCount);

    function pollMeter() {
      if (!activeLiveAudioAnalyser) return;
      const meter = document.querySelector(".golive-audio-level");
      if (meter) {
        if (liveMicMuted) {
          meter.style.width = "4%";
          meter.style.background = "#64748b";
        } else {
          activeLiveAudioAnalyser.getByteFrequencyData(dataArr);
          let sum = 0;
          for (let i = 0; i < dataArr.length; i++) sum += dataArr[i];
          const avg = sum / (dataArr.length || 1);
          const pct = Math.min(100, Math.round((avg / 65) * 100));
          meter.style.width = Math.max(5, pct) + "%";
          if (pct > 75) meter.style.background = "#ef4444";
          else if (pct > 40) meter.style.background = "#eab308";
          else meter.style.background = "#10b981";
        }
      }
      activeLiveAudioAnimFrame = requestAnimationFrame(pollMeter);
    }
    pollMeter();
  } catch (err) {
    console.warn("Audio meter setup skipped:", err);
  }
}

function toggleLiveCam() {
  liveCameraMuted = !liveCameraMuted;
  if (activeLiveMediaStream) {
    activeLiveMediaStream.getVideoTracks().forEach((track) => {
      track.enabled = !liveCameraMuted;
    });
  }
  const placeholder = $("golive-cam-placeholder");
  if (placeholder) {
    placeholder.hidden = !liveCameraMuted;
    placeholder.style.display = liveCameraMuted ? "flex" : "none";
    placeholder.classList.toggle("is-hidden", !liveCameraMuted);
  }
  const btns = document.querySelectorAll("[data-golive-toggle-cam]");
  btns.forEach((b) => b.classList.toggle("danger", liveCameraMuted));
  showFollowToast(liveCameraMuted ? tr("camMutedToast") || "Camera paused" : tr("camActiveToast") || "Camera active");
}

function toggleLiveMic() {
  liveMicMuted = !liveMicMuted;
  if (activeLiveMediaStream) {
    activeLiveMediaStream.getAudioTracks().forEach((track) => {
      track.enabled = !liveMicMuted;
    });
  }
  if (!liveMicMuted && activeLiveAudioContext && activeLiveAudioContext.state === "suspended") {
    activeLiveAudioContext.resume().catch(() => {});
  }
  const btns = document.querySelectorAll("[data-golive-toggle-mic]");
  btns.forEach((b) => {
    b.classList.toggle("danger", liveMicMuted);
    b.setAttribute("title", liveMicMuted ? "Unmute Microphone" : "Mute Microphone");
  });
  showFollowToast(liveMicMuted ? tr("micMutedToast") || "Microphone muted" : tr("micActiveToast") || "Microphone active");
}

async function toggleLiveScreenShare() {
  if (liveIsScreenSharing) {
    liveIsScreenSharing = false;
    await requestCameraPreview();
    const vid = $("golive-active-video") || $("golive-preview-video");
    if (vid) vid.classList.remove("screen-share");
    showFollowToast("Switched back to camera");
    return;
  }
  try {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getDisplayMedia) {
      showFollowToast("Screen share not supported in this browser");
      return;
    }
    const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true, audio: true });
    liveIsScreenSharing = true;
    activeLiveMediaStream = screenStream;
    const vid = $("golive-active-video") || $("golive-preview-video");
    if (vid) {
      vid.srcObject = screenStream;
      vid.classList.add("screen-share");
      vid.play().catch(() => {});
    }
    screenStream.getVideoTracks()[0].addEventListener("ended", () => {
      liveIsScreenSharing = false;
      requestCameraPreview();
    }, { once: true });
    showFollowToast("Screen sharing started");
  } catch (e) {
    console.warn("Screen share cancelled or failed:", e);
  }
}

function startLiveBroadcastAction(meta) {
  isLiveBroadcasting = true;
  liveStreamStartTime = Date.now();
  currentLiveBroadcastMeta = meta;
  currentActiveLiveId = "v_live_" + liveStreamStartTime;
  liveStreamViewers = Math.floor(Math.random() * 8) + 18;
  liveStreamLikes = Math.floor(Math.random() * 5) + 12;
  liveStreamSuperChatTotal = 0;
  startLiveRecording();

  const isGuestBroadcaster = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const liveAuthorName = isGuestBroadcaster ? "Watchbloom Creator" : localProfile.name.trim();

  // Register active live broadcast on backend server
  fetch("/api/v1/live/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: currentActiveLiveId,
      title: meta.title,
      description: meta.desc,
      author: liveAuthorName,
      category: meta.category
    })
  }).catch(() => {});

  const root = $("golive-root");
  if (!root) return;

  root.innerHTML = '<div class="golive-active-room">' +
    '<div class="golive-stream-viewport">' +
      '<video id="golive-active-video" class="golive-active-video' + (liveIsScreenSharing ? ' screen-share' : '') + (liveVirtualModeActive ? ' virtual-mode' : '') + '" autoplay playsinline muted></video>' +
      '<div id="golive-cam-placeholder" class="golive-cam-off-placeholder' + (liveCameraMuted ? '' : ' is-hidden') + '" style="' + (liveCameraMuted ? '' : 'display:none;') + '" ' + (liveCameraMuted ? '' : 'hidden') + '>' +
        '<div class="golive-cam-off-avatar">' + esc(initials(isGuestBroadcaster ? "WB" : liveAuthorName)) + '</div>' +
        '<strong>Camera Paused</strong>' +
      '</div>' +

      '<div class="golive-overlay-top">' +
        '<div class="golive-stat-chips">' +
          '<span class="golive-badge-live">● ' + esc(tr("streamLive") || "LIVE") + '</span>' +
          '<span class="golive-chip" id="golive-timer">00:00:00</span>' +
          '<span class="golive-chip">👥 <strong id="golive-viewers-count">' + liveStreamViewers + '</strong></span>' +
          '<span class="golive-chip">👍 <strong id="golive-likes-count">' + liveStreamLikes + '</strong></span>' +
          (meta.superChat ? '<span class="golive-chip" style="color: #fbbf24; border-color: rgba(245, 158, 11, 0.4);">₹ <strong id="golive-superchat-total">0.00</strong></span>' : '') +
        '</div>' +
        '<button type="button" class="golive-btn-end" data-golive-end>' + esc(tr("endBroadcast") || "End Stream") + '</button>' +
      '</div>' +

      '<div class="golive-overlay-bottom">' +
        '<div class="golive-controls-bar" style="position: static; transform: none;">' +
          '<button type="button" class="golive-icon-btn' + (liveCameraMuted ? ' danger' : '') + '" data-golive-toggle-cam title="Toggle Camera">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 7l-7 5 7 5V7z"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2"/></svg>' +
          '</button>' +
          '<button type="button" class="golive-icon-btn' + (liveMicMuted ? ' danger' : '') + '" data-golive-toggle-mic title="Toggle Microphone">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>' +
          '</button>' +
          '<button type="button" class="golive-icon-btn' + (liveIsScreenSharing ? ' danger' : '') + '" data-golive-toggle-screenshare title="Share Screen">' +
            '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>' +
          '</button>' +
          '<button type="button" class="golive-icon-btn" data-golive-like title="Send Love / Thumbs Up">' +
            '💖' +
          '</button>' +
        '</div>' +
        '<span style="font-size: 13px; font-weight: 750; color: #ffffff; text-shadow: 0 1px 4px rgba(0,0,0,0.8);">' + esc(meta.title) + '</span>' +
      '</div>' +
    '</div>' +

    '<div class="golive-chat-card">' +
      '<div class="golive-chat-header">' +
        '<span>💬 ' + esc(tr("liveChat") || "Live Chat") + '</span>' +
        '<span style="font-size: 11px; color: var(--muted);">' + esc(meta.category) + '</span>' +
      '</div>' +
      '<div class="golive-chat-messages" id="golive-chat-messages"></div>' +
      '<form class="golive-chat-form" id="golive-chat-form">' +
        '<input type="text" id="golive-chat-input" class="golive-chat-input" maxlength="200" placeholder="Chat publicly as Host..." required>' +
        '<button type="submit" class="golive-chat-send">' + esc(tr("sendChat") || "Send") + '</button>' +
      '</form>' +
    '</div>' +
  '</div>';

  const activeVideo = $("golive-active-video");
  if (activeVideo && activeLiveMediaStream) {
    activeVideo.muted = true;
    activeVideo.defaultMuted = true;
    activeVideo.playsInline = true;
    activeVideo.srcObject = activeLiveMediaStream;
    activeVideo.play().catch(() => {});
  }

  // Start Live Timer
  liveStreamTimerInterval = setInterval(() => {
    const elapsed = Math.floor((Date.now() - liveStreamStartTime) / 1000);
    const hrs = Math.floor(elapsed / 3600);
    const mins = Math.floor((elapsed % 3600) / 60);
    const secs = elapsed % 60;
    const formatted = (hrs ? String(hrs).padStart(2, "0") + ":" : "") +
      String(mins).padStart(2, "0") + ":" +
      String(secs).padStart(2, "0");
    const timerEl = $("golive-timer");
    if (timerEl) timerEl.textContent = formatted;
  }, 1000);

  // Fluctuating Viewers fallback
  liveViewersInterval = setInterval(() => {
    const delta = Math.floor(Math.random() * 3) - 1;
    liveStreamViewers = Math.max(1, liveStreamViewers + delta);
    const viewersEl = $("golive-viewers-count");
    if (viewersEl) viewersEl.textContent = liveStreamViewers;
  }, 8000);

  // Connect Real-Time Server-Sent Events (SSE) for live viewer counts and broadcast telemetry
  connectLiveStreamSSE(currentActiveLiveId, (data) => {
    if (typeof data.viewers === "number") {
      liveStreamViewers = Math.max(1, data.viewers);
      const viewersEl = $("golive-viewers-count");
      if (viewersEl) viewersEl.textContent = liveStreamViewers;
    }
    if (typeof data.likes === "number") {
      liveStreamLikes = Math.max(liveStreamLikes, data.likes);
      const likesEl = $("golive-likes-count");
      if (likesEl) likesEl.textContent = liveStreamLikes;
    }
  });

  // Start Simulated Live Chat Messages
  initLiveChatSimulation(meta);
}

function initLiveChatSimulation(meta) {
  const container = $("golive-chat-messages");
  if (!container) return;

  const initialMessages = [
    { author: "CyberVFX_Pro", text: "Stream is live! Audio and video look crystal clear 🔥" },
    { author: "Rohit_Sharma", text: "Namaste Arun! Glad to catch your broadcast today 🙌" },
    { author: "Pooja_Designs", text: "Camera quality is top-notch! Which mic are you using?" }
  ];

  initialMessages.forEach((msg) => appendLiveChatMessage(msg.author, msg.text));

  const simulationPool = [
    { author: "Aman_Verma", text: "Loving the live stream! Hello from Bengaluru 🚀" },
    { author: "Simran_K", text: "Audio balance is super smooth." },
    { author: "GamerBoy_99", text: "Keep streaming brother, great energy!" },
    { author: "DevPraveen", text: "Nice setup! Can you share a quick tip on lighting?" },
    { author: "TechGuru_India", isSuperChat: true, amount: "₹100.00", text: "Great content as always Arun! Keep it up 🎉" },
    { author: "Priyanka_M", text: "Watching live from Delhi. All the best!" },
    { author: "VFX_Artist_Leo", isSuperChat: true, amount: "₹250.00", text: "Super Chat support for your awesome channel! ❤️" },
    { author: "Kabir_S", text: "The video stream has virtually 0 latency. Fantastic!" }
  ];

  let poolIdx = 0;
  liveChatSimulationInterval = setInterval(() => {
    if (poolIdx >= simulationPool.length) poolIdx = 0;
    const item = simulationPool[poolIdx++];
    if (item.isSuperChat && meta.superChat) {
      appendLiveSuperChat(item.author, item.amount, item.text);
      const val = parseFloat(item.amount.replace(/[^0-9.]/g, "")) || 0;
      liveStreamSuperChatTotal += val;
      const totalEl = $("golive-superchat-total");
      if (totalEl) totalEl.textContent = liveStreamSuperChatTotal.toFixed(2);
    } else {
      appendLiveChatMessage(item.author, item.text);
    }
  }, 5500);
}

function appendLiveChatMessage(author, text, isHost = false) {
  const container = $("golive-chat-messages");
  if (!container) return;
  const msgEl = document.createElement("div");
  msgEl.className = "golive-chat-item";
  msgEl.innerHTML = '<span class="golive-chat-author' + (isHost ? ' is-host' : '') + '">' +
    (isHost ? '<span class="golive-host-tag">HOST</span>' : '') +
    esc(author) + ':</span> ' +
    '<span class="golive-chat-text">' + esc(text) + '</span>';
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function appendLiveSuperChat(author, amount, text) {
  const container = $("golive-chat-messages");
  if (!container) return;
  const msgEl = document.createElement("div");
  msgEl.className = "golive-chat-item";
  msgEl.innerHTML = '<div class="golive-superchat-bubble">' +
    '<div style="display:flex; justify-content:space-between; align-items:center;">' +
      '<strong style="font-size:12px; color:var(--ink);">' + esc(author) + '</strong>' +
      '<span class="golive-superchat-amount">' + esc(amount) + '</span>' +
    '</div>' +
    '<span class="golive-chat-text" style="font-weight:600;">' + esc(text) + '</span>' +
  '</div>';
  container.appendChild(msgEl);
  container.scrollTop = container.scrollHeight;
}

function handleLiveStreamLike() {
  liveStreamLikes++;
  const likesEl = $("golive-likes-count");
  if (likesEl) {
    likesEl.textContent = liveStreamLikes;
    likesEl.classList.add("view-bump");
    setTimeout(() => likesEl.classList.remove("view-bump"), 600);
  }
  const viewport = document.querySelector(".golive-stream-viewport");
  if (viewport) {
    const heart = document.createElement("span");
    heart.textContent = ["💖", "🔥", "❤️", "⭐"][Math.floor(Math.random() * 4)];
    heart.style.cssText = "position:absolute; bottom:60px; right:" + (20 + Math.random() * 40) + "px; font-size:24px; pointer-events:none; z-index:20; animation:float-up 1.2s ease-out forwards;";
    viewport.appendChild(heart);
    setTimeout(() => heart.remove(), 1200);
  }
}

async function endLiveBroadcastAction() {
  if (!confirm("Are you sure you want to end your live stream?")) return;

  const durationSecs = Math.max(1, Math.floor((Date.now() - (liveStreamStartTime || Date.now())) / 1000));
  const hrs = Math.floor(durationSecs / 3600);
  const mins = Math.floor((durationSecs % 3600) / 60);
  const secs = durationSecs % 60;
  const durationText = (hrs ? hrs + "h " : "") + (mins ? mins + "m " : "") + secs + "s";
  const peakViewers = Math.max(liveStreamViewers, Math.floor(liveStreamViewers * 1.35));
  const totalPlays = Math.round(liveStreamViewers * 2.8) + 14;
  const superChatEarnings = liveStreamSuperChatTotal.toFixed(2);
  const meta = currentLiveBroadcastMeta || { title: "Live Stream", desc: "", category: "entertainment" };

  await stopLiveRecording();
  stopActiveLiveStream();
  currentEndedLiveId = currentActiveLiveId || ("v_live_" + (liveStreamStartTime || Date.now()));
  if (currentActiveLiveId) {
    fetch("/api/v1/live/end", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: currentActiveLiveId })
    }).catch(() => {});
    currentActiveLiveId = null;
  }

  const root = $("golive-root");
  if (!root) return;

  root.innerHTML = '<div class="golive-summary-box">' +
    '<span style="font-size: 42px;">🏁</span>' +
    '<h2 style="margin: 0; font-size: 24px; font-weight: 850;">' + esc(tr("streamEnded") || "Stream Ended") + '</h2>' +
    '<p style="margin: 0; font-size: 13px; color: var(--muted);">' + esc(meta.title) + '</p>' +
    '<div class="golive-summary-stats">' +
      '<div class="golive-summary-stat"><span class="golive-stat-big">' + esc(durationText) + '</span><span class="golive-stat-lbl">Stream Duration</span></div>' +
      '<div class="golive-summary-stat"><span class="golive-stat-big">' + totalPlays + '</span><span class="golive-stat-lbl">Total Views Reached</span></div>' +
      '<div class="golive-summary-stat"><span class="golive-stat-big">' + peakViewers + '</span><span class="golive-stat-lbl">Peak Concurrent Viewers</span></div>' +
      '<div class="golive-summary-stat"><span class="golive-stat-big" style="color: #fbbf24;">₹' + superChatEarnings + '</span><span class="golive-stat-lbl">Super Chat Revenue</span></div>' +
    '</div>' +
    '<div style="display: flex; flex-direction: column; gap: 10px; margin-top: 6px;">' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" id="golive-save-vod" style="justify-content: center; padding: 12px;">' +
        '<span>💾</span> <span>' + esc(tr("saveLiveVod") || "Save as Video to Channel") + '</span>' +
      '</button>' +
      '<button type="button" class="studio-pill-btn" id="golive-share-post-btn" style="justify-content: center; padding: 11px; background: rgba(245, 158, 11, 0.15); color: #fbbf24; border-color: rgba(245, 158, 11, 0.35);">' +
        '<span>📢</span> <span>' + esc(tr("shareLivePostTitle") || "Share Live Stream as Post") + '</span>' +
      '</button>' +
      '<button type="button" class="studio-pill-btn" data-creator-dismiss style="justify-content: center; padding: 10px;">' +
        esc(tr("close") || "Close Studio") +
      '</button>' +
    '</div>' +
  '</div>';

  const saveBtn = $("golive-save-vod");
  if (saveBtn) {
    saveBtn.addEventListener("click", async () => {
      saveBtn.disabled = true;
      saveBtn.innerHTML = "<span>⏳</span> <span>Saving Live Stream...</span>";

      const liveId = currentEndedLiveId || ("v_live_" + Date.now());
      const isGuestLiveOwner = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
      const vodAuthor = isGuestLiveOwner ? "Watchbloom Creator" : localProfile.name.trim();
      const liveItem = {
        id: liveId,
        title: "[LIVE REPLAY] " + meta.title,
        description: meta.desc || ("Recorded live broadcast stream with " + vodAuthor + "."),
        author: vodAuthor,
        date: new Date().toISOString().slice(0, 10),
        views: totalPlays,
        type: "video",
        format: "live",
        art: "art-night",
        mins: Math.ceil(durationSecs / 60) || 1,
        duration: durationSecs,
        category: meta.category || "entertainment",
        tags: "#live #broadcast #" + (meta.category || "entertainment"),
        media: latestRecordedLiveBlob ? (liveId + ".webm") : "",
        media_url: "/api/media/" + encodeURIComponent(liveId),
        isLiveVod: true
      };

      if (latestRecordedLiveUrl) {
        liveStreamBlobs.set(liveId, latestRecordedLiveUrl);
      }

      if (latestRecordedLiveBlob) {
        try {
          const formData = new FormData();
          formData.append("id", liveId);
          formData.append("title", liveItem.title);
          formData.append("description", liveItem.description);
          formData.append("author", liveItem.author);
          formData.append("category", liveItem.category);
          formData.append("tags", liveItem.tags);
          formData.append("mins", String(liveItem.mins));
          formData.append("duration", String(durationSecs));
          formData.append("views", String(totalPlays));
          formData.append("file", latestRecordedLiveBlob, liveId + ".webm");

          const res = await fetch("/api/v1/live/save", {
            method: "POST",
            body: formData
          });
          if (res.ok) {
            const data = await res.json();
            if (data.item && data.item.media) {
              liveItem.media = data.item.media;
            }
          }
        } catch (uploadErr) {
          console.warn("Could not upload live recording to server:", uploadErr);
        }
      } else {
        fetch("/api/v1/live/save", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(liveItem)
        }).catch(() => {});
      }

      saveUploadedVideo(liveItem);
      visibleItems.set(liveItem.id, liveItem);
      showFollowToast(tr("streamSavedToast") || "Live stream saved to your channel videos!");
      saveBtn.innerHTML = "<span>✓</span> <span>Saved to Channel!</span>";
    }, { once: true });
  }
}

function openCreatorPanel(action, fromHistory = false) {
  if (action === "live") {
    return openGoLiveStudio(fromHistory);
  }
  restorePopoversFromDialog();
  let switching = false;
  if ($("detail-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("detail-dialog").close();
  }
  const content = $("creator-dialog-content");
  const dialog = $("creator-dialog");
  delete dialog.dataset.profileEditor;
  delete dialog.dataset.channelOpen;
  delete dialog.dataset.channelAuthor;
  delete dialog.dataset.channelTab;
  delete dialog.dataset.channelLoadedAuthor;
  delete dialog.dataset.loadingAuthor;
  dialog.dataset.creatorAction = action;
  dialog.dataset.channelRequest = String((Number(dialog.dataset.channelRequest) || 0) + 1);
  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "panel", action });
  }
  const titles = { create: tr("create"), account: tr("account"), live: tr("goLive"), upload: tr("uploadOriginal"), playlist: tr("playlistCreate"), short: tr("createShort"), signup: tr("signUp"), signin: tr("signIn"), settings: tr("settings"), help: tr("helpFeedback") };
  const messages = { create: tr("createPending"), account: tr("accountPending"), live: tr("livePending"), upload: tr("createPending"), playlist: tr("createPending"), short: tr("shortCreateHint"), signup: tr("accountPending"), signin: tr("accountPending"), settings: tr("settingsPending"), help: tr("helpPending") };
  const showChoices = action === "create" || action === "account" || action === "short";
  let choices = "";
  if (action === "create") {
    choices = '<div class="creator-choices"><button class="creator-choice" type="button" data-creator-next="upload"><span>' + esc(tr("uploadOriginal")) + '<small>' + esc(tr("createPending")) + '</small></span><span aria-hidden="true">＋</span></button><button class="creator-choice" type="button" data-creator-next="short"><span>' + esc(tr("createShort")) + '<small>' + esc(tr("shortCreateHint")) + '</small></span><span aria-hidden="true">' + REELS_ICON + '</span></button><button class="creator-choice" type="button" data-creator-next="playlist"><span>' + esc(tr("playlistCreate")) + '<small>' + esc(tr("createPending")) + '</small></span><span aria-hidden="true">＋</span></button><button class="creator-choice" type="button" data-creator-next="live"><span>' + esc(tr("goLive")) + '<small>' + esc(tr("livePending")) + '</small></span><span aria-hidden="true">›</span></button></div>';
  } else if (action === "short") {
    choices = '<div class="creator-choices"><button class="creator-choice" type="button" data-creator-open-shorts><span>' + esc(tr("shorts")) + '<small>' + esc(tr("view_shorts_note")) + '</small></span><span aria-hidden="true">›</span></button><button class="creator-choice" type="button" data-creator-next="upload"><span>' + esc(tr("uploadOriginal")) + '<small>' + esc(tr("createPending")) + '</small></span><span aria-hidden="true">＋</span></button></div>';
  } else if (action === "account") {
    choices = '<div class="creator-choices"><button class="creator-choice" type="button" data-creator-next="signup"><span>' + esc(tr("signUp")) + '<small>' + esc(tr("accountPending")) + '</small></span><span aria-hidden="true">→</span></button><button class="creator-choice" type="button" data-creator-next="signin"><span>' + esc(tr("signIn")) + '<small>' + esc(tr("accountPending")) + '</small></span><span aria-hidden="true">→</span></button></div>';
  } else if (action === "live") {
    choices = '<div class="creator-choices"><button class="creator-choice" type="button" disabled><span>' + esc(tr("startLive")) + '<small>' + esc(tr("livePending")) + '</small></span><span aria-hidden="true">◉</span></button></div>';
  }
  content.innerHTML = creatorDialogHeader(titles[action] || tr("creatorTools")) +
    '<div class="creator-panel-card"><span class="creator-status">' + esc(tr("setupNeeded")) + '</span><h2 id="creator-dialog-title">' + esc(titles[action] || tr("creatorTools")) + '</h2><p>' + esc(messages[action] || tr("createPending")) + '</p>' + (showChoices || action === "live" ? choices : "") + '<div class="creator-actions-row"><button class="creator-dismiss" type="button" data-creator-dismiss>' + esc(tr("close")) + '</button></div></div>';
  moveNavigationIntoDialog(dialog);
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;
}

function updateOwnProfileUI() {
  const buttons = document.querySelectorAll("#account-menu-toggle, [data-dialog-account-toggle]");
  const isGuest = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const displayName = isGuest ? "Guest" : localProfile.name.trim();
  buttons.forEach((button) => {
    button.replaceChildren();
    if (localProfile.photo && !isGuest) {
      const image = document.createElement("img");
      image.src = localProfile.photo;
      image.alt = "";
      button.append(image);
    } else {
      button.textContent = isGuest ? "WB" : (displayName ? initials(displayName) : "WB");
    }
    button.setAttribute("aria-label", tr("accountMenu") + ": " + displayName);
  });
  const summary = $("account-display-name");
  if (summary) summary.textContent = displayName;
  const guestLabel = document.querySelector(".account-summary small");
  if (guestLabel) {
    if (isGuest) {
      guestLabel.textContent = "Guest mode · Sign in to personalize";
    } else {
      const roleStr = (localProfile.role || "viewer").toUpperCase();
      const contactInfo = localProfile.email || localProfile.mobile || localProfile.handle;
      guestLabel.textContent = `${roleStr} · ${contactInfo}`;
    }
  }

  // Update account menu items dynamically based on authenticated state
  const menu = $("account-menu");
  if (menu) {
    let authRow = menu.querySelector(".account-auth-action-row");
    let signoutRow = menu.querySelector(".account-signout-action-row");

    if (isGuest) {
      if (signoutRow) signoutRow.remove();
      if (!authRow) {
        authRow = document.createElement("button");
        authRow.type = "button";
        authRow.className = "account-menu-row account-auth-action-row";
        authRow.dataset.accountAction = "auth";
        authRow.innerHTML = '<span class="account-row-icon" style="color:var(--accent);">👤</span><span><strong style="color:var(--accent);">Sign in / Register</strong><small>Sync saved videos, history & channel</small></span><span class="account-chevron" style="color:var(--accent);">›</span>';
        const divider = menu.querySelector(".account-menu-divider");
        if (divider) {
          menu.insertBefore(authRow, divider);
        } else {
          menu.prepend(authRow);
        }
      }
    } else {
      if (authRow) authRow.remove();
      if (!signoutRow) {
        signoutRow = document.createElement("button");
        signoutRow.type = "button";
        signoutRow.className = "account-menu-row account-signout-action-row";
        signoutRow.dataset.accountAction = "signout";
        signoutRow.innerHTML = '<span class="account-row-icon" style="color:var(--danger, #f87171);">↪</span><span><strong style="color:var(--danger, #f87171);">Sign out (' + esc(displayName) + ')</strong><small style="color:var(--muted);">Switch to guest or another account</small></span>';
        menu.appendChild(signoutRow);
      } else {
        const strongEl = signoutRow.querySelector("strong");
        if (strongEl) strongEl.textContent = "Sign out (" + displayName + ")";
      }
    }
  }
}

function profilePhotoMarkup(photo, name) {
  return photo ? '<img src="' + esc(photo) + '" alt="">' : '<span>' + esc(initials(name || "Watchbloom")) + '</span>';
}

function openProfileEditor(fromHistory = false) {
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    restorePopoversFromDialog();
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    showFollowToast("Please sign in or create an account to view and edit your profile.");
    openAuthModal("signin");
    return;
  }
  restorePopoversFromDialog();
  let switching = false;
  if ($("detail-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("detail-dialog").close();
  }
  const dialog = $("creator-dialog");
  const content = $("creator-dialog-content");
  pendingProfilePhoto = localProfile.photo;
  delete dialog.dataset.channelAuthor;
  delete dialog.dataset.channelTab;
  delete dialog.dataset.channelLoadedAuthor;
  delete dialog.dataset.loadingAuthor;
  delete dialog.dataset.creatorAction;
  dialog.dataset.channelRequest = String((Number(dialog.dataset.channelRequest) || 0) + 1);
  dialog.removeAttribute("data-channel-open");
  dialog.dataset.profileEditor = "true";
  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "panel", action: "profile" });
  }
  const isGuest = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const myName = isGuest ? "" : (localProfile.name || "");
  const myBio = isGuest ? "" : (localProfile.bio || "");
  content.innerHTML = creatorDialogHeader(tr("myProfile")) +
    '<div class="creator-editor-card">' +
      '<h2 id="creator-dialog-title">' + esc(tr("myProfile")) + '</h2>' +
      '<label class="profile-field"><span>' + esc(tr("profileName")) + '</span><input id="profile-name-input" type="text" maxlength="40" placeholder="' + esc(tr("profileNamePlaceholder")) + '" value="' + esc(myName) + '"></label>' +
      '<label class="profile-field"><span>Gmail / Email</span><input id="profile-email-input" type="email" placeholder="name@gmail.com" value="' + esc(localProfile.email || '') + '"></label>' +
      '<label class="profile-field"><span>Mobile Contact</span><input id="profile-mobile-input" type="tel" placeholder="+91..." value="' + esc(localProfile.mobile || '') + '"></label>' +
      '<label class="profile-field"><span>' + esc(tr("profileBio")) + '</span><textarea id="profile-bio-input" rows="2" maxlength="200" placeholder="' + esc(tr("profileBioPlaceholder")) + '">' + esc(myBio) + '</textarea></label>' +
      '<div class="profile-photo-row">' +
        '<div id="profile-photo-preview" class="profile-photo-preview">' + profilePhotoMarkup(pendingProfilePhoto, myName) + '</div>' +
        '<div>' +
          '<strong>' + esc(tr("profilePhoto")) + '</strong>' +
          '<div class="profile-photo-actions">' +
            '<button type="button" class="profile-photo-button" data-profile-image>' + esc(tr("choosePhoto")) + '</button>' +
            '<button type="button" class="profile-photo-button" data-profile-clear>' + esc(tr("removePhoto")) + '</button>' +
          '</div>' +
        '</div>' +
      '</div>' +
      '<input id="profile-photo-file" type="file" accept="image/*" hidden>' +
      '<div class="profile-channel-preview-banner">' +
        '<div class="profile-channel-preview-info">' +
          '<div class="profile-channel-preview-avatar">' + profilePhotoMarkup(pendingProfilePhoto, myName) + '</div>' +
          '<div>' +
            '<h4>' + esc(myName || "Guest Channel") + '</h4>' +
            '<p>@' + esc(channelSlug(myName || "guest")) + ' • ' + esc(tr("channelSubscribers")) + '</p>' +
          '</div>' +
        '</div>' +
        '<button type="button" class="channel-pill-btn profile-go-channel-btn" data-open-my-channel>' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>' +
          '<span>' + esc(tr("viewChannel")) + '</span>' +
        '</button>' +
      '</div>' +
      '<p class="profile-local-note">' + esc(tr("profileLocalNote")) + '</p>' +
      '<div class="creator-actions-row">' +
        '<button class="creator-dismiss" type="button" data-creator-dismiss>' + esc(tr("close")) + '</button>' +
        '<button class="profile-save-button" type="button" data-profile-save>' + esc(tr("saveProfile")) + '</button>' +
      '</div>' +
    '</div>';
  moveNavigationIntoDialog(dialog);
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;
}

function updateProfilePreview() {
  const isGuest = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const currentName = $("profile-name-input")?.value?.trim() || (isGuest ? "Guest" : localProfile.name);
  const preview = $("profile-photo-preview");
  if (preview) preview.innerHTML = profilePhotoMarkup(pendingProfilePhoto, currentName);
  const bannerPreview = document.querySelector(".profile-channel-preview-avatar");
  if (bannerPreview) bannerPreview.innerHTML = profilePhotoMarkup(pendingProfilePhoto, currentName);
  const bannerName = document.querySelector(".profile-channel-preview-info h4");
  if (bannerName) bannerName.textContent = currentName;
  const bannerHandle = document.querySelector(".profile-channel-preview-info p");
  if (bannerHandle) bannerHandle.textContent = "@" + channelSlug(currentName) + " • " + tr("channelSubscribers");
}

function processProfilePhoto(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/") || file.size > 8 * 1024 * 1024) { reject(new Error("image")); return; }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      const scale = Math.min(1, 512 / Math.max(image.naturalWidth, image.naturalHeight));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
      canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
      canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      try { resolve(canvas.toDataURL("image/jpeg", 0.84)); } catch (error) { reject(error); }
    };
    image.onerror = () => { URL.revokeObjectURL(url); reject(new Error("image")); };
    image.src = url;
  });
}

function channelSlug(author) {
  return String(author || "creator").normalize("NFKD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "creator";
}

function channelItemsForTab(data, channelTab) {
  if (channelTab === "videos") return data.regularVideos || [];
  if (channelTab === "reels") return data.reels || [];
  if (channelTab === "live") return data.liveStreams || [];
  if (channelTab === "playlists") return data.playlists || [];
  if (channelTab === "community") return loadCommunityPosts();
  const all = [];
  const seen = new Set();
  const pushUnique = (list) => {
    (list || []).forEach((item) => {
      if (item && item.id && !seen.has(item.id)) {
        seen.add(item.id);
        all.push(item);
      }
    });
  };
  pushUnique(data.regularVideos);
  pushUnique(data.liveStreams);
  pushUnique(data.reels);
  pushUnique(data.playlists);
  return all;
}

function renderCreatorChannelItems(dialog, channelTab) {
  const channelName = dialog.dataset.channelAuthor;
  const key = creatorKey(channelName);
  const data = creatorChannelCache.get(key);
  const host = dialog.querySelector(".channel-content");
  if (!data || !host) return false;
  const isOwn = isMyChannel(channelName);

  if (isOwn) {
    const userUploaded = (localProfile && !localProfile.isGuest && localProfile.id)
      ? (readJson("watchbloom-uploaded-videos-" + localProfile.id, []) || []).filter((item) => isItemOwnedByProfile(item, localProfile))
      : [];

    const liveStreams = [...(data.liveStreams || [])];
    const reels = [...(data.reels || [])];
    const regularVideos = [...(data.regularVideos || [])];
    const seenIds = new Set([
      ...liveStreams.map((v) => v.id),
      ...reels.map((v) => v.id),
      ...regularVideos.map((v) => v.id)
    ]);

    userUploaded.forEach((item) => {
      if (!item || !item.id || seenIds.has(item.id)) return;
      seenIds.add(item.id);
      if (!item.media_url || item.media_url.startsWith("blob:")) {
        item.media_url = "/api/media/" + encodeURIComponent(item.id);
      }
      visibleItems.set(item.id, item);

      const isLive = Boolean(item.isLiveVod || item.format === "live" || (item.tags || "").includes("#live") || (item.title || "").toLowerCase().includes("[live") || item.id.startsWith("v_live_"));
      const isReel = !isLive && ["reel", "short"].includes(String(item.format || "").toLowerCase());

      if (isLive) liveStreams.unshift(item);
      else if (isReel) reels.unshift(item);
      else regularVideos.unshift(item);
    });

    data.liveStreams = liveStreams;
    data.reels = reels;
    data.regularVideos = regularVideos;

    // Immediately update header count in real time!
    const statsEl = dialog.querySelector(".channel-meta-yt span:last-child");
    const totalCount = liveStreams.length + reels.length + regularVideos.length;
    if (statsEl) {
      const subText = localProfile.subscribers || tr("channelSubscribers") || "0 subscribers";
      statsEl.textContent = subText + " · " + totalCount + " " + tr("videos");
    }
  }

  const selectedTab = ["home", "videos", "reels", "live", "playlists", "community"].includes(channelTab) ? channelTab : "home";
  dialog.dataset.channelTab = selectedTab;
  dialog.querySelectorAll("[data-channel-tab]").forEach((button) => {
    const selected = button.dataset.channelTab === selectedTab;
    button.classList.toggle("active", selected);
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });

  if (selectedTab === "community") {
    const posts = loadCommunityPosts();
    host.innerHTML = renderChannelCommunityTab(posts, isOwn);
    return true;
  }

  if (selectedTab === "live") {
    const liveItems = data.liveStreams || [];
    if (liveItems.length) {
      host.innerHTML = '<div class="results-grid channel-results">' + liveItems.map((item) => card(item, "")).join("") + '</div>';
    } else {
      host.innerHTML = '<div class="channel-empty-yt">' +
        '<div class="yt-live-empty-icon" style="font-size: 50px; margin-bottom: 12px;">📡</div>' +
        '<h3>' + esc(tr("channelLiveEmptyTitle") || "No live streams yet") + '</h3>' +
        '<p>' + esc(tr("channelLiveEmptyDesc") || "Broadcast live to your viewers and connect in real time using Watchbloom Go Live Studio.") + '</p>' +
        (isOwn ? '<button type="button" class="channel-upload-hero-btn" data-action="live" style="background: #ef4444; border-color: #ef4444;">🔴 ' + esc(tr("goLive") || "Go live") + '</button>' : '') +
      '</div>';
    }
    return true;
  }

  if (selectedTab === "reels") {
    const reelItems = data.reels || [];
    if (reelItems.length) {
      host.innerHTML = '<div class="results-grid channel-results">' + reelItems.map((item) => card(item, "")).join("") + '</div>';
    } else {
      host.innerHTML = '<div class="channel-empty-yt">' +
        '<div style="font-size: 50px; margin-bottom: 12px;">📱</div>' +
        '<h3>No Reels yet</h3>' +
        '<p>Create vertical short videos (under 60s) to share with your audience.</p>' +
        (isOwn ? '<button type="button" class="channel-upload-hero-btn" data-channel-create-reel>Create a Reel</button>' : '') +
      '</div>';
    }
    return true;
  }

  const items = channelItemsForTab(data, selectedTab);
  if (items.length) {
    host.innerHTML = '<div class="results-grid channel-results">' + items.map((item) => card(item, "")).join("") + '</div>';
  } else if (isOwn) {
    host.innerHTML = '<div class="channel-empty-yt">' +
      '<div class="yt-clapper-art">' +
        '<svg class="yt-clapper-svg" viewBox="0 0 160 160" fill="none">' +
          '<g transform="translate(80, 80) rotate(-6)">' +
            '<path d="M-50 -40 L-45 -55 L-40 -40 L-25 -35 L-40 -30 L-45 -15 L-50 -30 L-65 -35 Z" fill="#93c5fd" opacity="0.6"/>' +
            '<path d="M45 -45 L50 -60 L55 -45 L70 -40 L55 -35 L50 -20 L45 -35 L30 -40 Z" fill="#cbd5e1" opacity="0.7"/>' +
            '<polygon points="50,25 60,15 65,30" fill="#38bdf8"/>' +
            '<g transform="rotate(-18, -45, -20)">' +
              '<rect x="-50" y="-32" width="100" height="20" rx="4" fill="#0284c7"/>' +
              '<path d="M-35 -32 L-23 -12 M-15 -32 L-3 -12 M5 -32 L17 -12 M25 -32 L37 -12" stroke="#ffffff" stroke-width="5" stroke-linecap="round"/>' +
            '</g>' +
            '<rect x="-50" y="-10" width="100" height="66" rx="8" fill="#0f766e"/>' +
            '<path d="M-36 24 C-30 12, -22 12, -16 24 C-10 36, -2 36, 4 24 C10 12, 18 12, 24 24 C30 36, 38 36, 44 24" fill="none" stroke="#5eead4" stroke-width="3" stroke-linecap="round"/>' +
          '</g>' +
        '</svg>' +
      '</div>' +
      '<h3>' + esc(tr("channelEmptyClapperTitle")) + '</h3>' +
      '<p>' + esc(tr("channelEmptyClapperDesc")) + '</p>' +
      '<button type="button" class="channel-upload-hero-btn" data-channel-upload>' + esc(tr("channelEmptyClapperBtn")) + '</button>' +
    '</div>';
  } else {
    host.innerHTML = '<div class="channel-empty">' + esc(tr("noItemsTitle")) + '</div>';
  }
  return true;
}

function renderCreatorChannelProfile(dialog, channelName, channelTab, data) {
  restorePopoversFromDialog();
  const content = $("creator-dialog-content");
  const channel = data.channel || {};
  const isOwn = isMyChannel(channelName);
  const displayName = isOwn ? (localProfile.name || channelName) : (channel.name || channelName);
  creatorCatalog.set(creatorKey(displayName), channel);

  const totalVideos = (data.regularVideos ? data.regularVideos.length : 0) + (data.reels ? data.reels.length : 0) + (data.liveStreams ? data.liveStreams.length : 0);
  const subText = localProfile.subscribers || (isOwn ? "0 subscribers" : (tr("channelSubscribers") || "0 subscribers"));
  const stats = isOwn
    ? subText + " · " + totalVideos + " " + tr("videos")
    : Number(channel.video_count || 0) + " videos · " + Number(channel.playlist_count || 0) + " playlists";

  const tabButtons = [
    ["home", "channelHome"],
    ["videos", "channelVideos"],
    ["reels", "channelReels"],
    ["live", "channelLive"],
    ["playlists", "channelPlaylists"],
    ["community", "channelCommunity"]
  ]
    .map(([key, label]) => '<button type="button" class="channel-tab' + (channelTab === key ? ' active' : '') + '" data-channel-tab="' + key + '" role="tab" aria-selected="' + (channelTab === key) + '" tabindex="' + (channelTab === key ? "0" : "-1") + '">' + esc(tr(label) || label) + '</button>').join("");

  let bannerMarkup = '';
  let avatarMarkup = '';
  let actionsMarkup = '';
  let bioMarkup = '';

  if (isOwn) {
    const bannerStyle = localProfile.banner
      ? ' style="background-image: url(\'' + esc(localProfile.banner) + '\'); background-size: cover; background-position: center;"'
      : '';
    bannerMarkup = '<div class="channel-banner channel-banner-yt"' + bannerStyle + '>' +
      '<button type="button" class="channel-banner-edit-btn" data-banner-change title="' + esc(tr("changeBanner")) + '">' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/><circle cx="12" cy="13" r="4"/></svg>' +
        '<span>' + esc(tr("changeBanner")) + '</span>' +
      '</button>' +
      '<input id="channel-banner-file" type="file" accept="image/*" hidden>' +
    '</div>';

    avatarMarkup = '<div class="channel-avatar channel-avatar-yt">' + profilePhotoMarkup(localProfile.photo, displayName) + '</div>';

    actionsMarkup = '<div class="channel-cta-row-yt">' +
      '<button type="button" class="channel-pill-btn channel-pill-studio" data-channel-studio>' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4"/><polygon points="10,7 15,10 10,13" fill="currentColor"/></svg>' +
        '<span>' + esc(tr("creatorStudio")) + '</span>' +
      '</button>' +
      '<button type="button" class="channel-pill-btn" data-channel-customise>' + esc(tr("customiseChannel")) + '</button>' +
      '<button type="button" class="channel-pill-btn" data-channel-manage>' + esc(tr("manageVideos")) + '</button>' +
      '<button type="button" class="channel-pill-btn channel-pill-primary" data-channel-upload>' +
        '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '<span>' + esc(tr("uploadVideo")) + '</span>' +
      '</button>' +
    '</div>';

    const bioText = localProfile.bio || "";
    bioMarkup = bioText ? ('<div class="channel-bio-yt">' + esc(bioText) + ' <span class="bio-more">...more</span></div>') : '';
  } else {
    bannerMarkup = '<div class="channel-banner"><span>' + esc(categoryLabel((channel.categories || [])[0] || "learning")) + '</span></div>';
    avatarMarkup = '<div class="channel-avatar">' + esc(initials(displayName)) + '</div>';
    actionsMarkup = '<div class="channel-follow-controls">' + creatorControls(displayName) + '</div>';
    bioMarkup = '<p class="channel-description">' + esc(tr("channelIntro")) + '</p>';
  }

  content.innerHTML = creatorDialogHeader(isOwn ? tr("yourChannel").toUpperCase() : "WATCHBLOOM CREATOR") +
    '<div class="channel-profile' + (isOwn ? ' channel-profile-yt' : '') + '">' +
    bannerMarkup +
    '<div class="channel-identity-row' + (isOwn ? ' channel-identity-row-yt' : '') + '">' +
      avatarMarkup +
      '<div class="channel-title channel-info-yt">' +
        '<h2 id="creator-dialog-title" class="channel-name-yt">' + esc(displayName) + '</h2>' +
        '<div class="channel-meta-yt"><span>@' + esc(channelSlug(displayName)) + '</span><span class="meta-dot">•</span><span>' + esc(stats) + '</span></div>' +
        bioMarkup +
        (isOwn ? actionsMarkup : '') +
      '</div>' +
      (!isOwn ? actionsMarkup : '') +
    '</div>' +
    '<div class="channel-tabs channel-tabs-yt" role="tablist">' + tabButtons + '</div>' +
    '<div class="channel-content"></div>' +
  '</div>';

  dialog.dataset.channelLoadedAuthor = channelName;
  if (!isOwn) bindCreatorControls(content);
  renderCreatorChannelItems(dialog, channelTab);
}

async function openCreatorChannel(author, tab = "home", fromHistory = false) {
  restorePopoversFromDialog();
  let switching = false;
  if ($("detail-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("detail-dialog").close();
  }
  const dialog = $("creator-dialog");
  const content = $("creator-dialog-content");

  const isGuest = !localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest";
  const rawAuthor = String(author || "").trim();
  const lowerAuthor = rawAuthor.toLowerCase().replace(/^@/, "");

  // If Guest or special own-channel tokens requested while unauthenticated
  if (lowerAuthor === "guest" || lowerAuthor === "my-channel" || lowerAuthor === "me") {
    if (isGuest) {
      restorePopoversFromDialog();
      if ($("creator-dialog")?.open) $("creator-dialog").close();
      showFollowToast(tr("yourChannelAuthRequired") || "Your channel requires a registered account. Please sign in to view and manage your channel.");
      openAuthModal("signin");
      return;
    }
  }

  // If authenticated user asked for guest/my-channel, route to their real channel name
  const channelName = (lowerAuthor === "guest" || lowerAuthor === "my-channel" || lowerAuthor === "me")
    ? (localProfile.name || localProfile.username || "Creator")
    : rawAuthor;

  if (!channelName || channelName.toLowerCase() === "guest") {
    restorePopoversFromDialog();
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    showFollowToast(tr("yourChannelAuthRequired") || "Your channel requires a registered account. Please sign in to view and manage your channel.");
    openAuthModal("signin");
    return;
  }

  const isOwn = isMyChannel(channelName);
  const channelTab = ["home", "videos", "reels", "live", "playlists", "community"].includes(tab) ? tab : "home";
  const key = creatorKey(channelName);
  const requestId = String((Number(dialog.dataset.channelRequest) || 0) + 1);
  dialog.dataset.channelRequest = requestId;
  dialog.dataset.channelAuthor = channelName;
  dialog.dataset.channelTab = channelTab;
  dialog.dataset.channelOpen = "true";
  delete dialog.dataset.profileEditor;
  delete dialog.dataset.creatorAction;
  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "channel", author: channelName, tab: channelTab });
  }
  moveNavigationIntoDialog(dialog);
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;

  const hasSameProfile = dialog.dataset.channelLoadedAuthor === channelName && Boolean(content.querySelector(".channel-profile"));
  const cached = creatorChannelCache.get(key);
  if (cached) {
    if (hasSameProfile && renderCreatorChannelItems(dialog, channelTab)) return;
    renderCreatorChannelProfile(dialog, channelName, channelTab, cached);
    return;
  }
  if (!hasSameProfile && !(dialog.dataset.loadingAuthor === channelName && content.querySelector(".channel-loading"))) {
    content.innerHTML = creatorDialogHeader(isOwn ? tr("yourChannel").toUpperCase() : "WATCHBLOOM CREATOR") + '<div class="channel-loading">' + esc(tr("couldNotLoad")) + '</div>';
    dialog.dataset.loadingAuthor = channelName;
  }

  let request = creatorChannelRequests.get(key);
  if (!request) {
    if (isOwn) {
      request = (async () => {
        let channelData = {
          name: localProfile.name || channelName,
          handle: localProfile.handle || ("@" + channelSlug(localProfile.name || channelName)),
          bio: localProfile.bio || "",
          photo: localProfile.photo || "",
          banner: localProfile.banner || "",
          video_count: 0,
          playlist_count: 0
        };
        let regularVideos = [];
        let reels = [];
        let liveStreams = [];
        let allMyVideos = [];

        try {
          const res = await fetch("/api/v1/user/channel", {
            credentials: "same-origin",
            headers: { "Accept": "application/json" }
          });
          if (res.ok) {
            const data = await res.json();
            if (data && data.success) {
              if (data.channel) {
                channelData = { ...channelData, ...data.channel };
              }
              regularVideos = data.regularVideos || [];
              reels = data.reels || [];
              liveStreams = data.liveStreams || [];
              allMyVideos = data.videos || [];
            }
          }
        } catch (e) {
          console.debug("Failed fetching /api/v1/user/channel:", e);
        }

        // Merge any locally isolated uploads belonging to this profile
        const userUploaded = (localProfile && !localProfile.isGuest && localProfile.id)
          ? (readJson("watchbloom-uploaded-videos-" + localProfile.id, []) || []).filter((item) => isItemOwnedByProfile(item, localProfile))
          : [];

        const seenIds = new Set(allMyVideos.map((v) => v.id));
        userUploaded.forEach((item) => {
          if (!item || !item.id || seenIds.has(item.id)) return;
          seenIds.add(item.id);
          const isLive = Boolean(item.isLiveVod || item.format === "live" || (item.tags || "").includes("#live") || (item.title || "").toLowerCase().includes("[live") || item.id.startsWith("v_live_"));
          const isReel = !isLive && ["reel", "short"].includes(String(item.format || "").toLowerCase());
          if (isLive) liveStreams.unshift(item);
          else if (isReel) reels.unshift(item);
          else regularVideos.unshift(item);
          allMyVideos.unshift(item);
        });

        channelData.video_count = allMyVideos.length;

        return {
          channel: channelData,
          regularVideos: regularVideos,
          reels: reels,
          liveStreams: liveStreams,
          playlists: []
        };
      })();
    } else {
      const url = "/api/v1/channels/" + encodeURIComponent(channelSlug(channelName));
      request = (async () => {
        const responses = await Promise.all([
          fetch(url).catch(() => null),
          fetch(url + "/videos?limit=50&sort=newest").catch(() => null),
          fetch(url + "/playlists?limit=50&sort=newest").catch(() => null)
        ]);
        const [channelRes, videoRes, playlistRes] = responses;
        const channelData = (channelRes && channelRes.ok) ? await channelRes.json() : { channel: { name: channelName, video_count: 0, playlist_count: 0 } };
        const videoData = (videoRes && videoRes.ok) ? await videoRes.json() : { results: [] };
        const playlistData = (playlistRes && playlistRes.ok) ? await playlistRes.json() : { results: [] };
        const videos = (videoData.results || []).filter((item) => item.type === "video");

        return {
          channel: channelData.channel || { name: channelName, video_count: 0, playlist_count: 0 },
          regularVideos: videos.filter((item) => !["reel", "short", "live"].includes(String(item.format || "").toLowerCase()) && !item.isLiveVod),
          reels: videos.filter((item) => ["reel", "short"].includes(String(item.format || "").toLowerCase())),
          liveStreams: videos.filter((item) => item.isLiveVod || item.format === "live" || (item.tags || "").includes("#live") || (item.title || "").toLowerCase().includes("[live")),
          playlists: (playlistData.results || []).filter((item) => item.type === "playlist"),
        };
      })();
    }
    creatorChannelRequests.set(key, request);
    request.then(() => creatorChannelRequests.delete(key), () => creatorChannelRequests.delete(key));
  }

  try {
    const data = await request;
    creatorChannelCache.set(key, data);
    const channel = data.channel || {};
    creatorCatalog.set(creatorKey(channel.name || channelName), channel);
    if (dialog.dataset.channelAuthor !== channelName || dialog.dataset.channelRequest !== requestId) return;
    delete dialog.dataset.loadingAuthor;
    const activeTab = dialog.dataset.channelTab || channelTab;
    if (dialog.dataset.channelLoadedAuthor === channelName && content.querySelector(".channel-profile")) {
      renderCreatorChannelItems(dialog, activeTab);
    } else {
      renderCreatorChannelProfile(dialog, channelName, activeTab, data);
    }
  } catch (error) {
    if (dialog.dataset.channelAuthor === channelName && dialog.dataset.channelRequest === requestId) {
      delete dialog.dataset.loadingAuthor;
      content.innerHTML = creatorDialogHeader("WATCHBLOOM CREATOR") + '<div class="channel-empty">' + esc(tr("channelUnavailable")) + '</div>';
    }
  }
}

let pendingUploadFormat = "video";
let pendingUploadFile = null;

function openUploadModal() {
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    restorePopoversFromDialog();
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    showFollowToast("Please sign in or create an account to upload videos to your channel.");
    openAuthModal("signin");
    return;
  }

  restorePopoversFromDialog();
  let switching = false;
  if ($("detail-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("detail-dialog").close();
  }
  const dialog = $("creator-dialog");
  const content = $("creator-dialog-content");
  delete dialog.dataset.channelAuthor;
  delete dialog.dataset.channelTab;
  delete dialog.dataset.channelLoadedAuthor;
  delete dialog.dataset.loadingAuthor;
  delete dialog.dataset.creatorAction;
  dialog.dataset.channelRequest = String((Number(dialog.dataset.channelRequest) || 0) + 1);
  dialog.removeAttribute("data-channel-open");
  dialog.dataset.profileEditor = "upload";
  pendingUploadFormat = "video";
  pendingUploadFile = null;

  content.innerHTML = creatorDialogHeader(tr("uploadDialogTitle")) +
    '<div class="upload-dialog-card">' +
      '<div class="upload-dialog-header">' +
        '<h2>' + esc(tr("uploadDialogTitle")) + '</h2>' +
        '<span class="upload-demo-badge">Channel Connected</span>' +
      '</div>' +
      '<div class="upload-format-toggle">' +
        '<button type="button" class="upload-format-btn active" data-upload-format="video">' +
          '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="4" width="20" height="16" rx="3"/><path d="m10 9 5 3-5 3V9Z" fill="currentColor"/></svg>' +
          '<span>' + esc(tr("uploadFormatLong")) + '</span>' +
        '</button>' +
        '<button type="button" class="upload-format-btn" data-upload-format="reel">' +
          REELS_ICON +
          '<span>' + esc(tr("uploadFormatShort")) + '</span>' +
        '</button>' +
      '</div>' +
      '<div class="upload-field-row">' +
        '<label for="upload-video-title">' + esc(tr("uploadTitleLabel")) + ' *</label>' +
        '<input type="text" id="upload-video-title" required maxlength="100" placeholder="' + esc(tr("uploadTitlePlaceholder")) + '">' +
      '</div>' +
      '<div class="upload-field-row">' +
        '<label for="upload-video-desc">' + esc(tr("uploadDescLabel")) + '</label>' +
        '<textarea id="upload-video-desc" rows="3" maxlength="300" placeholder="' + esc(tr("uploadDescPlaceholder")) + '"></textarea>' +
      '</div>' +
      '<div class="upload-field-row">' +
        '<label for="upload-video-cat">' + esc(tr("uploadCategoryLabel")) + ' <span style="color: #ef4444;" aria-hidden="true">*</span></label>' +
        '<select id="upload-video-cat" required style="border-radius: 8px; padding: 10px 12px; background: var(--panel2); color: var(--ink); border: 1.5px solid var(--line); font-size: 13.5px; width: 100%; transition: border-color 0.2s, box-shadow 0.2s;">' +
          '<option value="" disabled selected>-- ' + esc(tr("uploadCategoryPlaceholder") || "Select a mandatory category (Required)") + ' --</option>' +
          CATEGORY_KEYS.filter((c) => c !== "all").map((c) => '<option value="' + esc(c) + '">' + esc(categoryLabel(c)) + '</option>').join("") +
        '</select>' +
        '<small class="upload-field-hint" style="display: block; margin-top: 5px; font-size: 11px; color: var(--muted); line-height: 1.4;">' +
          '🔒 <strong>Strict Category Anchoring:</strong> Your video will strictly route to its designated tab (Courses, Gaming, Cinema & Series, Music, or Headlines) and Home/Explore. Cross-category misclassification is prohibited.' +
        '</small>' +
      '</div>' +
      '<div class="upload-field-row">' +
        '<label>' + esc(tr("uploadFileLabel")) + '</label>' +
        '<div class="upload-file-dropzone" id="upload-dropzone">' +
          '<svg viewBox="0 0 24 24" width="32" height="32" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/></svg>' +
          '<p id="upload-file-name">' + esc(tr("uploadFileHint")) + '</p>' +
          '<input type="file" id="upload-file-input" accept="video/mp4,video/webm" hidden>' +
        '</div>' +
        '<div style="margin-top: 10px; display: flex; align-items: center; gap: 8px;">' +
          '<small style="color: var(--muted); font-size: 11px;">Or pick ready sample:</small>' +
          '<select id="upload-sample-select" style="font-size: 11px; padding: 4px 8px; border-radius: 6px; background: var(--panel2); color: var(--ink); border: 1px solid var(--line);">' +
            '<option value="MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4">Sample: Mother of Dragons (Vertical Short / Reel)</option>' +
            '<option value="v1_1080p.mp4">Sample: 4K Showcase Video (16:9 Long Video)</option>' +
            '<option value="v9_1080p.mp4">Sample: Creative Feature Video (16:9 Long Video)</option>' +
          '</select>' +
        '</div>' +
      '</div>' +
      '<div class="upload-actions-bar">' +
        '<button type="button" class="creator-dismiss" data-creator-dismiss>' + esc(tr("close")) + '</button>' +
        '<button type="button" class="profile-save-button" id="upload-submit-btn">' + esc(tr("publishVideo")) + '</button>' +
      '</div>' +
    '</div>';

  moveNavigationIntoDialog(dialog);
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;
}

async function handleVideoUploadSubmit() {
  const titleInput = $("upload-video-title");
  const title = (titleInput?.value || "").trim();
  if (!title) {
    if (titleInput) { titleInput.focus(); titleInput.style.borderColor = "#ef4444"; }
    showFollowToast("Please enter a title for your video.");
    return;
  }
  const catSelect = $("upload-video-cat");
  const category = (catSelect?.value || "").trim().toLowerCase();
  if (!category || category === "all" || category === "") {
    if (catSelect) {
      catSelect.focus();
      catSelect.style.borderColor = "#ef4444";
      catSelect.style.boxShadow = "0 0 0 2px rgba(239, 68, 68, 0.25)";
    }
    showFollowToast("Please select a mandatory category for your video to ensure accurate placement.");
    return;
  }
  const desc = ($("upload-video-desc")?.value || "").trim();
  const isGuestUploader = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const authorName = isGuestUploader ? "Watchbloom Creator" : localProfile.name.trim();
  const submitBtn = $("upload-submit-btn");
  if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = "Publishing..."; }

  try {
    let resultItem = null;
    if (pendingUploadFile) {
      const formData = new FormData();
      formData.append("title", title);
      formData.append("description", desc);
      formData.append("category", category);
      formData.append("format", pendingUploadFormat);
      formData.append("author", authorName);
      formData.append("file", pendingUploadFile);
      const res = await fetch("/api/v1/videos/upload", { method: "POST", body: formData });
      if (res.ok) {
        const json = await res.json();
        resultItem = json.item;
      }
    } else {
      const sampleSelect = $("upload-sample-select");
      const sampleFile = sampleSelect?.value || (pendingUploadFormat === "reel" ? "MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4" : "v1_1080p.mp4");
      const payload = {
        title: title,
        description: desc,
        category: category,
        format: pendingUploadFormat,
        author: authorName,
        video_file: sampleFile
      };
      const res = await fetch("/api/v1/videos/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        const json = await res.json();
        resultItem = json.item;
      }
    }

    if (!resultItem) {
      const stamp = Date.now();
      resultItem = {
        id: "v_up_" + stamp,
        type: "video",
        format: pendingUploadFormat,
        title: title,
        description: desc || "Original video uploaded by " + authorName,
        author: authorName,
        category: category,
        date: new Date().toISOString().split("T")[0],
        views: 1,
        mins: 2,
        media: pendingUploadFormat === "reel" ? "MOTHER OF DRAGONS(GAME OF THRONES)#gameofthrones #gameofthronesedit  #viral #viralshorts.mp4" : "v1_1080p.mp4",
        art: "art-saffron"
      };
    }

    saveUploadedVideo(resultItem);
    visibleItems.set(resultItem.id, resultItem);
    creatorChannelCache.delete(creatorKey(authorName));
    showFollowToast(tr("uploadSuccessToast"));
    openMyChannel(pendingUploadFormat === "reel" ? "reels" : "videos");
  } catch (err) {
    showFollowToast("Upload failed: " + err.message);
    if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = tr("publishVideo"); }
  }
}

function openManageVideosModal() {
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    showFollowToast("Please sign in or create an account to manage your channel content.");
    openAuthModal("signin");
    return;
  }
  openCreatorStudio("content");
}

let currentStudioTab = "dashboard";
let currentStudioContentFilter = "all";
let currentStudioAnalyticsPeriod = "28d";
let currentStudioEarnTab = "summary";
let currentStudioCommunityFilter = "published";
let studioCachedVideos = [];
const studioDeletedSampleCommentIds = new Set(readJson("watchbloom-deleted-sample-comments", []));

async function getMyChannelVideos() {
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    studioCachedVideos = [];
    return [];
  }

  const deletedIds = new Set(readJson("watchbloom-deleted-video-ids", []));
  const currentName = String(localProfile.name || "").trim();
  const slug = channelSlug(currentName || "guest");

  let backendVideos = [];
  try {
    const studioRes = await fetch("/api/v1/studio/content");
    if (studioRes.ok) {
      const data = await studioRes.json();
      if (Array.isArray(data.videos)) {
        backendVideos = data.videos;
      }
    }
  } catch (err) {
    console.debug("Studio content API notice:", err);
  }

  // Fallback to channel endpoint if studio endpoint returned empty
  if (backendVideos.length === 0 && currentName && currentName !== "Guest") {
    try {
      const res = await fetch("/api/v1/channels/" + encodeURIComponent(slug) + "/videos?limit=100");
      if (res.ok) {
        const data = await res.json();
        backendVideos = (data.results || []).filter((item) => item.type === "video");
      }
    } catch (_) {}
  }

  // Load uploaded videos owned by THIS user
  const userKey = "watchbloom-uploaded-videos-" + localProfile.id;
  const userIsolated = readJson(userKey, []);
  const globalUploaded = loadUploadedVideos();
  const allCandidates = [...userIsolated, ...globalUploaded, ...backendVideos];

  const combined = [];
  const seenIds = new Set();

  for (const item of allCandidates) {
    if (!item || !item.id || deletedIds.has(item.id) || seenIds.has(item.id)) continue;
    // Strict ownership verification:
    if (isItemOwnedByProfile(item, localProfile)) {
      seenIds.add(item.id);
      combined.push(item);
    }
  }

  studioCachedVideos = combined;
  return combined;
}

function getChannelAnalyticsData(videos, period = "28d") {
  const totalVideos = videos.length;
  const reels = videos.filter((v) => ["reel", "short"].includes(String(v.format || "").toLowerCase()));
  const regular = videos.filter((v) => !["reel", "short"].includes(String(v.format || "").toLowerCase()));

  let liveSumViews = 0;
  videos.forEach((v) => {
    liveSumViews += getItemViews(v);
  });

  const now = Date.now();
  const events = loadViewEvents();
  const events60m = events.filter((e) => (now - (e.timestamp || 0)) <= 60 * 60 * 1000).length;
  const events48h = events.filter((e) => (now - (e.timestamp || 0)) <= 48 * 60 * 60 * 1000).length;

  const rt48h = Math.max(28, Math.round(liveSumViews * 0.08) + events48h);
  const rt60m = Math.max(4, Math.round(liveSumViews * 0.015) + events60m);
  const rtVelocity = "+" + Math.max(1, Math.round(rt60m * 1.2)) + "/hr";

  let rtBarsHtml = "";
  const hourHeights = [
    18, 22, 14, 10, 8, 12, 26, 42, 55, 68, 74, 82,
    78, 65, 70, 85, 92, 88, 96, 90, 84, 76, 88, 100
  ];
  for (let i = 0; i < 24; i++) {
    const isNow = i === 23;
    const boost = isNow ? Math.min(100, Math.max(40, rt60m * 12)) : hourHeights[i];
    rtBarsHtml += '<div class="realtime-bar-col" title="Hour ' + (i + 1) + '">' +
      '<div class="realtime-bar-fill' + (isNow ? ' active' : '') + '" style="height: ' + boost + '%;"></div>' +
    '</div>';
  }

  let totalViews = 0;
  let watchHours = "0.0";
  let subscribers = 0;
  let estimatedRevenue = 0.00;
  let paceViews = "";
  let paceHours = "";
  let paceSubs = "";
  let paceRevenue = "";

  if (period === "today") {
    totalViews = Math.max(14, Math.round(liveSumViews * 0.04) + events60m);
    watchHours = (totalViews * 1.8 / 60).toFixed(1);
    subscribers = 2 + Math.floor(totalViews / 15);
    estimatedRevenue = (totalViews * 0.48) + 12.50;
    paceViews = "18% higher than usual today";
    paceHours = "Watching pace is steady";
    paceSubs = "+2 gained today";
    paceRevenue = "₹" + estimatedRevenue.toFixed(2) + " earned today";
  } else if (period === "7d") {
    totalViews = Math.max(120, Math.round(liveSumViews * 0.28) + 95);
    watchHours = (totalViews * 2.2 / 60).toFixed(1);
    subscribers = 9 + Math.floor(totalViews / 20);
    estimatedRevenue = (totalViews * 0.45) + 140.00;
    paceViews = "24% more views in last 7 days";
    paceHours = "28% watch time growth";
    paceSubs = "+9 this week";
    paceRevenue = "₹" + (estimatedRevenue / 7).toFixed(2) + "/day average";
  } else if (period === "1y") {
    totalViews = Math.max(2800, Math.round(liveSumViews * 7.5) + 3200);
    watchHours = (totalViews * 2.1 / 60).toFixed(1);
    subscribers = 310 + Math.floor(totalViews / 35);
    estimatedRevenue = 14200.00 + (liveSumViews * 18.0);
    paceViews = "42% increase year-over-year";
    paceHours = "38% annual watch growth";
    paceSubs = "+310 this year";
    paceRevenue = "₹" + (estimatedRevenue / 12).toFixed(2) + "/mo average";
  } else if (period === "lifetime") {
    totalViews = Math.max(9400, Math.round(liveSumViews * 22.0) + 8600);
    watchHours = (totalViews * 2.0 / 60).toFixed(1);
    subscribers = 890 + Math.floor(totalViews / 40);
    estimatedRevenue = 28500.00 + (liveSumViews * 26.0);
    paceViews = "Cumulative all-time channel views";
    paceHours = "Lifetime total watch time";
    paceSubs = "Lifetime community base";
    paceRevenue = "Total all-time studio revenue";
  } else {
    // Default: "28d" (1 Month)
    totalViews = Math.max(480, Math.round(liveSumViews * 1.0) + 420);
    watchHours = (totalViews * 2.1 / 60).toFixed(1);
    subscribers = 42 + Math.floor(totalViews / 25);
    estimatedRevenue = (6980.00 + (liveSumViews * 10.5));
    paceViews = "14% more views than usual";
    paceHours = "22% watch time increase";
    paceSubs = "+42 new subscribers";
    paceRevenue = "₹1,180.00 RPM pace";
  }

  const reelViews = Math.round(totalViews * 0.58);
  const videoViews = totalViews - reelViews;

  const balance = Math.min(7940.00, (6980.00 + (liveSumViews * 10.5))).toFixed(2);
  const totalEarnings = (17800.00 + (liveSumViews * 22.0)).toFixed(2);
  const ytdEarnings = (10800.00 + (liveSumViews * 15.0)).toFixed(2);
  const balanceProgress = Math.min(100, Math.max(10, ((Number(balance) / 8000) * 100))).toFixed(1);

  return {
    totalVideos,
    reelsCount: reels.length,
    regularCount: regular.length,
    totalViews,
    reelViews,
    videoViews,
    watchHours,
    subscribers,
    estimatedRevenue,
    paceViews,
    paceHours,
    paceSubs,
    paceRevenue,
    rt48h,
    rt60m,
    rtVelocity,
    rtBarsHtml,
    balance,
    totalEarnings,
    ytdEarnings,
    balanceProgress,
  };
}

function getStudioChannelComments(videos) {
  const allComments = readJson("watchbloom-comments", {});
  const list = [];
  const videoMap = new Map();
  videos.forEach((v) => videoMap.set(v.id, v));

  for (const [itemId, rows] of Object.entries(allComments)) {
    const video = videoMap.get(itemId);
    if (video && Array.isArray(rows)) {
      rows.forEach((r) => {
        list.push({ ...r, videoTitle: video.title, videoId: video.id });
      });
    }
  }

  const sample = (videos.length > 0 && localProfile.name && localProfile.name.toLowerCase().includes("arun")) ? [
    {
      id: "comm_sample_1",
      author: "CyberVFX_Pro",
      ownerId: "other_user_1",
      text: "The cyberpunk neon atmosphere and camera pans in Unreal Engine 5 look stunning! What lighting rig did you use?",
      createdAt: new Date(Date.now() - 3600000 * 4).toISOString(),
      likes: 14,
      videoId: videos[0]?.id || "v_up_1792388382764",
      videoTitle: videos[0]?.title || "3D Animation Cyberpunk City Tour",
      replies: [
        { author: "Arun Singh Rana", text: "Thanks a lot! Used Lumen with hardware raytracing and custom emissive shaders." }
      ]
    },
    {
      id: "comm_sample_2",
      author: "MayaMotion",
      ownerId: "other_user_2",
      text: "Amazing visual effects showreel 2026. The 9:16 vertical framing works so well on mobile!",
      createdAt: new Date(Date.now() - 86400000 * 2).toISOString(),
      likes: 9,
      videoId: videos[1]?.id || "v_up_1792388528864",
      videoTitle: videos[1]?.title || "3D VFX Animation Showreel 2026",
      replies: []
    },
    {
      id: "comm_sample_3",
      author: "DevPraveen",
      ownerId: "other_user_3",
      text: "Bhai visual sound design bhi bahut tagda hai! Full tutorial banao please.",
      createdAt: new Date(Date.now() - 86400000 * 3).toISOString(),
      likes: 6,
      videoId: videos[0]?.id || "v_up_1792388382764",
      videoTitle: videos[0]?.title || "3D Animation Cyberpunk City Tour",
      replies: []
    }
  ] : [];

  for (const s of sample) {
    if (!studioDeletedSampleCommentIds.has(s.id) && !list.some((c) => c.id === s.id)) {
      list.push(s);
    }
  }

  return list;
}

function renderStudioSidebar(activeTab) {
  const isGuest = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const displayName = isGuest ? "Guest" : localProfile.name.trim();
  const displayHandle = isGuest ? "@guest" : (localProfile.handle || "@" + channelSlug(displayName));
  const avatarContent = localProfile.photo && !isGuest
    ? '<img src="' + esc(localProfile.photo) + '" alt="">'
    : esc(isGuest ? "WB" : (displayName ? initials(displayName) : "WB"));

  const tabs = [
    { id: "dashboard", label: tr("studioDashboard"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="3" width="7" height="9" rx="1.5"/><rect x="14" y="3" width="7" height="5" rx="1.5"/><rect x="14" y="12" width="7" height="9" rx="1.5"/><rect x="3" y="16" width="7" height="5" rx="1.5"/></svg>' },
    { id: "content", label: tr("studioContent"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><polygon points="5,3 19,12 5,21" fill="currentColor"/></svg>' },
    { id: "analytics", label: tr("studioAnalytics"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-3 3"/></svg>' },
    { id: "community", label: tr("studioCommunity"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>' },
    { id: "earn", label: tr("studioEarn"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="12" cy="12" r="10"/><path d="M12 6v12M15 9.5a3.5 3.5 0 0 0-7 0c0 4 7 2 7 6a3.5 3.5 0 0 1-7 0"/></svg>' },
    { id: "customisation", label: tr("studioCustomisation"), icon: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"><path d="m12 3 2 4 4.5.5-3.5 3.5 1 4.5-4-2.5-4 2.5 1-4.5L4.5 7.5 9 7z"/><path d="M4 21h16"/></svg>' },
  ];

  const itemsHtml = tabs.map((t) =>
    '<button type="button" class="studio-nav-item' + (activeTab === t.id ? ' active' : '') + '" data-studio-tab="' + t.id + '">' +
      t.icon +
      '<span>' + esc(t.label) + '</span>' +
    '</button>'
  ).join("");

  return '<aside class="studio-sidebar">' +
    '<div class="studio-channel-card">' +
      '<div class="studio-channel-avatar">' + avatarContent + '</div>' +
      '<h3 class="studio-channel-name">' + esc(displayName) + '</h3>' +
      '<span class="studio-channel-handle">' + esc(displayHandle) + '</span>' +
      '<span class="studio-channel-badge">' + esc(tr("creatorStudio")) + '</span>' +
    '</div>' +
    '<nav class="studio-nav-list" role="navigation">' + itemsHtml + '</nav>' +
  '</aside>';
}

function renderStudioDashboard(videos, analytics, comments) {
  const latestVideo = videos[0] || (localProfile.name && localProfile.name.toLowerCase().includes("arun") ? {
    id: "sample_vid",
    title: "3D VFX Animation Showreel 2026",
    views: 1420,
    date: "2026-10-19",
    category: "creative",
    art: "art-saffron"
  } : null);

  const recentComment = comments[0];

  const isGuestDash = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const dashName = isGuestDash ? "Guest" : localProfile.name.trim();
  const dashHandle = isGuestDash ? "@guest" : (localProfile.handle || "@" + channelSlug(dashName));

  const latestCardBody = latestVideo ? (
    '<div class="dashboard-video-preview">' +
      '<div class="dashboard-video-thumb ' + esc(latestVideo.art || "art-violet") + '" style="cursor: pointer;" data-studio-play="' + esc(latestVideo.id) + '">' +
        '<span>▶</span>' +
      '</div>' +
      '<div class="dashboard-video-info">' +
        '<h4 style="cursor: pointer;" data-studio-play="' + esc(latestVideo.id) + '">' + esc(latestVideo.title) + '</h4>' +
        '<p>' + esc(latestVideo.category || "creative") + ' · ' + esc(latestVideo.date || "Today") + '</p>' +
      '</div>' +
    '</div>' +
    '<div class="dashboard-stats-row">' +
      '<div class="dashboard-stat-unit">' +
        '<span class="dashboard-stat-label">Views</span>' +
        '<span class="dashboard-stat-val">' + (Number(latestVideo.views) || 0) + '</span>' +
      '</div>' +
      '<div class="dashboard-stat-unit">' +
        '<span class="dashboard-stat-label">Imp. CTR</span>' +
        '<span class="dashboard-stat-val">8.4%</span>' +
      '</div>' +
      '<div class="dashboard-stat-unit">' +
        '<span class="dashboard-stat-label">Avg. Duration</span>' +
        '<span class="dashboard-stat-val">1:45</span>' +
      '</div>' +
    '</div>'
  ) : (
    '<div style="padding: 24px 10px; text-align: center; color: var(--muted);">' +
      '<div style="font-size: 32px; margin-bottom: 8px;">📹</div>' +
      '<strong style="color: var(--ink);">No published content yet</strong>' +
      '<p style="font-size: 12px; margin: 4px 0 14px;">Publish a video or start a live broadcast to view real-time metrics.</p>' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" data-studio-upload style="margin: 0 auto;"><span>+</span> <span>Upload Video</span></button>' +
    '</div>'
  );

  return '<div class="studio-header-row">' +
    '<div>' +
      '<h2 class="studio-header-title">' + esc(tr("channelDashboard")) + '</h2>' +
      '<p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">' + esc(dashName) + ' (' + esc(dashHandle) + ')</p>' +
    '</div>' +
    '<div class="studio-header-actions">' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" data-studio-upload>' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '<span>' + esc(tr("uploadVideoAction")) + '</span>' +
      '</button>' +
    '</div>' +
  '</div>' +
  '<div class="dashboard-grid">' +
    '<div class="dashboard-card">' +
      '<div class="dashboard-card-head">' +
        '<h3 class="dashboard-card-title">' + esc(tr("latestVideoPerformance")) + '</h3>' +
      '</div>' +
      latestCardBody +
      '<button type="button" class="studio-pill-btn" data-studio-tab="analytics" style="justify-content: center;">' + esc(tr("channelAnalyticsOverview")) + ' ›</button>' +
    '</div>' +

    '<div class="dashboard-card">' +
      '<div class="dashboard-card-head">' +
        '<h3 class="dashboard-card-title">' + esc(tr("channelAnalyticsOverview")) + '</h3>' +
        '<span style="font-size: 11px; color: var(--muted);">' + esc(tr("last28Days")) + '</span>' +
      '</div>' +
      '<div style="display: flex; flex-direction: column; gap: 4px;">' +
        '<span style="font-size: 12px; color: var(--muted);">' + esc(tr("currentSubscribers")) + '</span>' +
        '<strong style="font-size: 28px; font-weight: 900; color: var(--ink);">' + analytics.subscribers + '</strong>' +
        '<span style="font-size: 11.5px; color: #10b981; font-weight: 700;">▲ +12 in last 28 days</span>' +
      '</div>' +
      '<div class="dashboard-stats-row">' +
        '<div class="dashboard-stat-unit">' +
          '<span class="dashboard-stat-label">Views</span>' +
          '<span class="dashboard-stat-val">' + analytics.totalViews.toLocaleString() + '</span>' +
        '</div>' +
        '<div class="dashboard-stat-unit">' +
          '<span class="dashboard-stat-label">Watch Hours</span>' +
          '<span class="dashboard-stat-val">' + analytics.watchHours + 'h</span>' +
        '</div>' +
        '<div class="dashboard-stat-unit">' +
          '<span class="dashboard-stat-label">Est. Revenue</span>' +
          '<span class="dashboard-stat-val">₹' + Number(analytics.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
        '</div>' +
      '</div>' +
      '<button type="button" class="studio-pill-btn" data-studio-tab="earn" style="justify-content: center; background: color-mix(in srgb, #8b5cf6 15%, var(--panel2)); color: #a78bfa; border-color: rgba(139, 92, 246, 0.4);">' + esc(tr("paymentDetails")) + ' (₹' + Number(analytics.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ') ›</button>' +
    '</div>' +

    '<div class="dashboard-card">' +
      '<div class="dashboard-card-head">' +
        '<h3 class="dashboard-card-title">' + esc(tr("latestComments")) + '</h3>' +
        '<button type="button" class="studio-pill-btn" data-studio-tab="community" style="padding: 4px 10px; font-size: 11.5px;">See all</button>' +
      '</div>' +
      (recentComment ? (
        '<div style="display: flex; flex-direction: column; gap: 8px;">' +
          '<div style="display: flex; align-items: center; gap: 10px;">' +
            '<div class="community-avatar" style="width: 30px; height: 30px; font-size: 11px;">' + esc(initials(recentComment.author)) + '</div>' +
            '<div style="font-size: 12px; font-weight: 700; color: var(--ink);">' + esc(recentComment.author) + ' <small style="color: var(--muted); font-weight: 400;">on ' + esc(recentComment.videoTitle || "video") + '</small></div>' +
          '</div>' +
          '<p style="margin: 0; font-size: 12.5px; color: var(--ink); line-height: 1.4;">' + esc(recentComment.text) + '</p>' +
          '<div style="display: flex; gap: 8px; margin-top: 4px;">' +
            '<button type="button" class="community-action-btn" data-community-reply-toggle="' + esc(recentComment.id) + '">' + esc(tr("replyAction")) + '</button>' +
          '</div>' +
        '</div>'
      ) : '<p style="color: var(--muted); font-size: 12px;">' + esc(tr("noCommentsFound")) + '</p>') +
    '</div>' +

    '<div class="dashboard-card">' +
      '<div class="dashboard-card-head">' +
        '<h3 class="dashboard-card-title">' + esc(tr("creatorActions")) + '</h3>' +
      '</div>' +
      '<div style="display: flex; flex-direction: column; gap: 10px;">' +
        '<button type="button" class="studio-pill-btn" data-studio-upload style="justify-content: flex-start; gap: 12px;">' +
          '<span>📹</span> <span>' + esc(tr("uploadVideoAction")) + '</span>' +
        '</button>' +
        '<button type="button" class="studio-pill-btn" data-studio-create-reel style="justify-content: flex-start; gap: 12px;">' +
          '<span>📱</span> <span>' + esc(tr("createReelAction")) + '</span>' +
        '</button>' +
        '<button type="button" class="studio-pill-btn" data-open-my-channel style="justify-content: flex-start; gap: 12px;">' +
          '<span>🌐</span> <span>' + esc(tr("viewChannelAction")) + '</span>' +
        '</button>' +
      '</div>' +
    '</div>' +
  '</div>';
}

function showStudioDeleteConfirmModal(videoId) {
  if (!videoId) return;
  const v = (studioCachedVideos || []).find((item) => item.id === videoId) ||
            loadUploadedVideos().find((item) => item.id === videoId) ||
            visibleItems.get(videoId);
  const title = v?.title || "this video";

  const existing = document.getElementById("studio-delete-confirm-modal");
  if (existing) existing.remove();

  const modal = document.createElement("div");
  modal.id = "studio-delete-confirm-modal";
  modal.className = "share-post-modal-backdrop";
  modal.style.zIndex = "10001";

  modal.innerHTML = '<div class="share-post-modal-card" role="dialog" aria-modal="true" aria-labelledby="delete-confirm-title" style="max-width: 480px; text-align: left;">' +
    '<div class="share-post-modal-header" style="border-bottom: 1px solid var(--line); padding-bottom: 12px; margin-bottom: 4px;">' +
      '<div style="display: flex; align-items: center; gap: 10px;">' +
        '<span style="font-size: 22px;">🗑️</span>' +
        '<h3 id="delete-confirm-title" style="margin: 0; font-size: 17px; font-weight: 800; color: #ef4444;">Permanently Delete Video?</h3>' +
      '</div>' +
      '<button type="button" class="creator-close" data-confirm-cancel aria-label="Close" style="cursor: pointer;">×</button>' +
    '</div>' +
    '<div style="font-size: 13.5px; line-height: 1.5; color: var(--ink);">' +
      '<p style="margin: 8px 0 12px;">' +
        'Are you sure you want to permanently delete: ' +
        '<strong style="display: block; margin-top: 8px; padding: 10px 12px; background: var(--panel2); border-radius: 8px; border: 1px solid var(--line); color: var(--ink); word-break: break-word;">' +
          esc(title) +
        '</strong>' +
      '</p>' +
      '<p style="margin: 0; font-size: 12px; color: var(--muted);">' +
        '⚠️ This action <strong>cannot be undone</strong>. The video, stream recording, and associated analytics will be permanently removed from your channel and catalog.' +
      '</p>' +
    '</div>' +
    '<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 18px; padding-top: 14px; border-top: 1px solid var(--line);">' +
      '<button type="button" class="studio-pill-btn" data-confirm-cancel style="padding: 9px 18px; font-weight: 600; cursor: pointer;">No, Cancel</button>' +
      '<button type="button" class="studio-pill-btn" id="confirm-delete-action-btn" style="background: #ef4444; color: #ffffff; border-color: #dc2626; padding: 9px 20px; font-weight: 700; cursor: pointer;">' +
        '<span>🗑️</span> <span>Yes, Delete</span>' +
      '</button>' +
    '</div>' +
  '</div>';

  const parent = ($("creator-dialog")?.open ? $("creator-dialog") : document.body);
  parent.appendChild(modal);

  const closeModal = () => {
    modal.remove();
    document.removeEventListener("keydown", onKeyDown);
  };

  const onKeyDown = (e) => {
    if (e.key === "Escape") closeModal();
  };
  document.addEventListener("keydown", onKeyDown);

  modal.querySelectorAll("[data-confirm-cancel]").forEach((btn) => {
    btn.addEventListener("click", closeModal);
  });
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeModal();
  });

  const confirmBtn = modal.querySelector("#confirm-delete-action-btn");
  if (confirmBtn) {
    confirmBtn.addEventListener("click", async () => {
      confirmBtn.disabled = true;
      confirmBtn.innerHTML = "<span>⏳</span> <span>Deleting...</span>";

      try {
        await deleteUploadedVideo(videoId);
      } catch (err) {
        console.warn("Delete error:", err);
      }

      closeModal();

      if (Array.isArray(studioCachedVideos)) {
        studioCachedVideos = studioCachedVideos.filter((item) => item.id !== videoId);
      }
      renderStudioView(studioCachedVideos);
      showFollowToast("Video permanently deleted.");

      getMyChannelVideos().then((fresh) => {
        studioCachedVideos = fresh;
        if (currentStudioTab === "content" || currentStudioTab === "dashboard") {
          renderStudioView(studioCachedVideos);
        }
      });
    });
  }
}

function renderStudioContent(videos, filter) {
  let filtered = videos;
  if (filter === "videos") {
    filtered = videos.filter((v) => !["reel", "short", "live"].includes(String(v.format || "").toLowerCase()) && !v.isLiveVod);
  } else if (filter === "reels") {
    filtered = videos.filter((v) => ["reel", "short"].includes(String(v.format || "").toLowerCase()));
  } else if (filter === "live") {
    filtered = videos.filter((v) => v.isLiveVod || v.format === "live" || (v.tags || "").includes("#live") || (v.title || "").toLowerCase().includes("[live"));
  }

  const liveVideos = videos.filter((v) => v.isLiveVod || v.format === "live" || (v.tags || "").includes("#live") || (v.title || "").toLowerCase().includes("[live"));
  const regularVideos = videos.filter((v) => !["reel", "short", "live"].includes(String(v.format || "").toLowerCase()) && !v.isLiveVod);
  const reelVideos = videos.filter((v) => ["reel", "short"].includes(String(v.format || "").toLowerCase()));

  const rowsHtml = filtered.length ? filtered.map((v) => {
    const isLive = v.isLiveVod || v.format === "live" || (v.tags || "").includes("#live") || (v.title || "").toLowerCase().includes("[live");
    const isReel = !isLive && ["reel", "short"].includes(String(v.format || "").toLowerCase());
    const viewsCount = getItemViews(v);
    const commentsCount = (readJson("watchbloom-comments", {})[v.id] || []).length || (isReel ? 4 : (isLive ? 6 : 2));
    const likesCount = Math.round(viewsCount * 0.12) || 1;
    const formattedDate = formatUploadDate(v.date, true);

    const formatBadge = isLive
      ? '<span class="format-badge badge-live">● Live Stream</span>'
      : (isReel ? '<span class="format-badge badge-reel">Reel</span>' : '<span class="format-badge badge-video">Video</span>');

    return '<tr>' +
      '<td>' +
        '<div class="table-video-cell">' +
          '<div class="table-video-thumb ' + (isReel ? 'reel-thumb' : '') + ' ' + esc(v.art || "art-aqua") + '" style="cursor: pointer;" data-studio-play="' + esc(v.id) + '">' +
            '<span>' + (isLive ? '📡' : '▶') + '</span>' +
          '</div>' +
          '<div class="table-video-meta">' +
            '<span class="table-video-title" style="cursor: pointer;" data-studio-play="' + esc(v.id) + '">' + esc(v.title) + '</span>' +
            '<span class="table-video-desc">' + esc(v.description || "") + '</span>' +
          '</div>' +
        '</div>' +
      '</td>' +
      '<td>' + formatBadge + '</td>' +
      '<td>' +
        '<span class="visibility-public"><span class="visibility-dot"></span> ' + esc(tr("publishedStatus")) + '</span>' +
      '</td>' +
      '<td class="table-date-cell">' +
        '<strong>' + esc(formattedDate) + '</strong>' +
        '<span class="table-date-sub">' + (isLive ? 'Broadcast' : esc(tr("publishedStatus"))) + '</span>' +
      '</td>' +
      '<td class="table-views-cell">' +
        '<span class="live-views-pill">' +
          '<span class="live-dot-mini" aria-hidden="true"></span>' +
          '<strong class="live-views-num" data-item-views-num="' + esc(v.id) + '">' + viewsCount.toLocaleString() + '</strong>' +
        '</span>' +
      '</td>' +
      '<td class="table-comments-cell">' +
        '<button type="button" class="table-comments-btn" title="View video comments" data-studio-comments="' + esc(v.id) + '">' +
          '<svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          '<span>' + commentsCount + '</span>' +
        '</button>' +
      '</td>' +
      '<td>' + likesCount + ' (100%)</td>' +
      '<td>' +
        '<div class="table-actions">' +
          '<button type="button" class="table-action-icon-btn" title="Play video" data-studio-play="' + esc(v.id) + '">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><polygon points="6,4 18,12 6,20"/></svg>' +
          '</button>' +
          '<button type="button" class="table-action-icon-btn" title="Comments" data-studio-comments="' + esc(v.id) + '">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>' +
          '</button>' +
          '<button type="button" class="table-action-icon-btn" title="Share video" data-studio-share="' + esc(v.id) + '">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 5 21 12l-7 7v-4c-5 0-8 2-11 5 1-6 4-10 11-10V5Z"/></svg>' +
          '</button>' +
          '<button type="button" class="table-action-icon-btn danger" title="Delete video" data-studio-delete="' + esc(v.id) + '">' +
            '<svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>' +
          '</button>' +
        '</div>' +
      '</td>' +
    '</tr>';
  }).join("") : (
    filter === "live"
      ? '<tr><td colspan="8" style="text-align: center; padding: 48px 20px;">' +
          '<div style="font-size: 38px; margin-bottom: 8px;">📡</div>' +
          '<strong style="display:block; font-size:15px; margin-bottom: 4px; color: var(--ink);">No live streams found</strong>' +
          '<p style="color: var(--muted); font-size: 12.5px; margin: 0 0 16px;">Go Live to broadcast directly from your browser to your audience.</p>' +
          '<button type="button" class="studio-pill-btn studio-pill-primary" data-studio-start-live style="margin: 0 auto;">' +
            '<span>🔴</span> <span>Go Live Now</span>' +
          '</button>' +
        '</td></tr>'
      : '<tr><td colspan="8" style="text-align: center; padding: 50px 20px;">' +
          '<div style="font-size: 38px; margin-bottom: 8px;">🎬</div>' +
          '<strong style="display:block; font-size:15px; margin-bottom: 6px; color: var(--ink);">' + (videos.length === 0 ? "No videos uploaded yet" : (tr("noItemsTitle") || "No content found in this category")) + '</strong>' +
          '<p style="color: var(--muted); font-size: 13px; margin: 0 0 16px;">' + (videos.length === 0 ? "Upload your first video or start a live stream to publish content to your channel." : "Try selecting a different filter above.") + '</p>' +
          (videos.length === 0 ? '<div style="display:inline-flex; gap: 10px;"><button type="button" class="studio-pill-btn studio-pill-primary" data-studio-upload><span>+</span> <span>' + esc(tr("uploadVideo")) + '</span></button><button type="button" class="studio-pill-btn" data-studio-start-live><span>🔴</span> <span>Go Live</span></button></div>' : '') +
        '</td></tr>'
  );

  return '<div class="studio-header-row">' +
    '<div>' +
      '<h2 class="studio-header-title">' + esc(tr("channelContent")) + '</h2>' +
      '<p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">' + filtered.length + ' items</p>' +
    '</div>' +
    '<div class="studio-header-actions">' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" data-studio-upload>' +
        '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>' +
        '<span>' + esc(tr("uploadVideo")) + '</span>' +
      '</button>' +
    '</div>' +
  '</div>' +
  '<div class="studio-subtabs">' +
    '<button type="button" class="studio-subtab' + (filter === "all" ? ' active' : '') + '" data-studio-filter="all">' + esc(tr("contentAll")) + ' (' + videos.length + ')</button>' +
    '<button type="button" class="studio-subtab' + (filter === "videos" ? ' active' : '') + '" data-studio-filter="videos">' + esc(tr("contentVideos")) + ' (' + regularVideos.length + ')</button>' +
    '<button type="button" class="studio-subtab' + (filter === "reels" ? ' active' : '') + '" data-studio-filter="reels">' + esc(tr("contentReels")) + ' (' + reelVideos.length + ')</button>' +
    '<button type="button" class="studio-subtab' + (filter === "live" ? ' active' : '') + '" data-studio-filter="live">🔴 ' + (tr("contentLive") || "Live") + ' (' + liveVideos.length + ')</button>' +
  '</div>' +
  '<div class="content-table-wrapper">' +
    '<div style="overflow-x: auto;">' +
      '<table class="content-table">' +
        '<thead>' +
          '<tr>' +
            '<th>' + esc(tr("tableVideo")) + '</th>' +
            '<th>' + esc(tr("tableFormat")) + '</th>' +
            '<th>' + esc(tr("tableVisibility")) + '</th>' +
            '<th>' + esc(tr("tableUploadDate") || tr("tableDate")) + '</th>' +
            '<th>' + esc(tr("tableRealtimeViews") || tr("tableViews")) + '</th>' +
            '<th>' + esc(tr("tableComments")) + '</th>' +
            '<th>' + esc(tr("tableLikes")) + '</th>' +
            '<th>' + esc(tr("tableActions")) + '</th>' +
          '</tr>' +
        '</thead>' +
        '<tbody>' + rowsHtml + '</tbody>' +
      '</table>' +
    '</div>' +
  '</div>';
}

function getAnalyticsChartMarkup(period, analytics) {
  let subtitle = "";
  let pointsArea = "";
  let pointsLine = "";
  let circles = "";
  let xLabels = [];

  if (period === "today") {
    subtitle = "Live Hourly Performance (Today)";
    pointsArea = "0,180 0,160 50,155 100,165 150,150 200,140 250,130 300,110 350,90 400,75 450,55 500,40 550,28 600,20 600,180";
    pointsLine = "0,160 50,155 100,165 150,150 200,140 250,130 300,110 350,90 400,75 450,55 500,40 550,28 600,20";
    circles = '<circle cx="450" cy="55" r="5" fill="var(--accent)" stroke="#fff" stroke-width="2"/><circle cx="600" cy="20" r="5" fill="#10b981" stroke="#fff" stroke-width="2"/>';
    xLabels = ["00:00", "04:00", "08:00", "12:00", "16:00", "20:00", "Live"];
  } else if (period === "7d") {
    subtitle = "7-Day View Velocity (1 Week)";
    pointsArea = "0,180 0,145 100,135 200,115 300,95 400,65 500,45 600,25 600,180";
    pointsLine = "0,145 100,135 200,115 300,95 400,65 500,45 600,25";
    circles = '<circle cx="300" cy="95" r="5" fill="var(--accent)" stroke="#fff" stroke-width="2"/><circle cx="600" cy="25" r="5" fill="#10b981" stroke="#fff" stroke-width="2"/>';
    xLabels = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Today"];
  } else if (period === "1y") {
    subtitle = "Annual Growth Trajectory (1 Year)";
    pointsArea = "0,180 0,150 100,140 200,125 300,105 400,70 500,45 600,22 600,180";
    pointsLine = "0,150 100,140 200,125 300,105 400,70 500,45 600,22";
    circles = '<circle cx="300" cy="105" r="5" fill="var(--accent)" stroke="#fff" stroke-width="2"/><circle cx="600" cy="22" r="5" fill="#10b981" stroke="#fff" stroke-width="2"/>';
    xLabels = ["Jan", "Mar", "May", "Jul", "Sep", "Nov", "Current"];
  } else if (period === "lifetime") {
    subtitle = "Multi-Year Cumulative Reach (Years)";
    pointsArea = "0,180 0,165 120,150 240,125 360,90 480,50 600,15 600,180";
    pointsLine = "0,165 120,150 240,125 360,90 480,50 600,15";
    circles = '<circle cx="360" cy="90" r="5" fill="var(--accent)" stroke="#fff" stroke-width="2"/><circle cx="600" cy="15" r="5" fill="#10b981" stroke="#fff" stroke-width="2"/>';
    xLabels = ["2023", "2024", "2025", "2026", "2027"];
  } else {
    // 28d (1 Month)
    subtitle = "28-Day Audience Growth (1 Month)";
    pointsArea = "0,180 0,140 50,130 100,145 150,110 200,95 250,120 300,75 350,85 400,60 450,45 500,55 550,25 600,30 600,180";
    pointsLine = "0,140 50,130 100,145 150,110 200,95 250,120 300,75 350,85 400,60 450,45 500,55 550,25 600,30";
    circles = '<circle cx="300" cy="75" r="5" fill="var(--accent)" stroke="#fff" stroke-width="2"/><circle cx="550" cy="25" r="5" fill="#10b981" stroke="#fff" stroke-width="2"/>';
    xLabels = ["Week 1", "Week 2", "Week 3", "Week 4", "Now"];
  }

  const xLabelsHtml = '<div class="chart-x-labels">' +
    xLabels.map((lbl) => '<span>' + esc(lbl) + '</span>').join("") +
  '</div>';

  return '<div class="analytics-chart-card">' +
    '<div class="chart-header">' +
      '<h3 class="chart-title">Views &amp; Audience Growth Curve</h3>' +
      '<span style="font-size: 12px; color: var(--muted);">' + esc(subtitle) + '</span>' +
    '</div>' +
    '<div class="chart-svg-wrap">' +
      '<svg class="chart-svg" viewBox="0 0 600 180" preserveAspectRatio="none">' +
        '<defs>' +
          '<linearGradient id="studio-chart-gradient" x1="0" y1="0" x2="0" y2="1">' +
            '<stop offset="0%" stop-color="var(--accent)" stop-opacity="0.35"/>' +
            '<stop offset="100%" stop-color="var(--accent)" stop-opacity="0.0"/>' +
          '</linearGradient>' +
        '</defs>' +
        '<line x1="0" y1="40" x2="600" y2="40" stroke="var(--line)" stroke-dasharray="4 4" stroke-width="1"/>' +
        '<line x1="0" y1="90" x2="600" y2="90" stroke="var(--line)" stroke-dasharray="4 4" stroke-width="1"/>' +
        '<line x1="0" y1="140" x2="600" y2="140" stroke="var(--line)" stroke-dasharray="4 4" stroke-width="1"/>' +
        '<polygon points="' + pointsArea + '" class="chart-area"/>' +
        '<polyline points="' + pointsLine + '" class="chart-line"/>' +
        circles +
      '</svg>' +
    '</div>' +
    xLabelsHtml +
  '</div>';
}

function renderStudioAnalytics(videos, analytics, period) {
  const topVids = videos.slice(0, 4);

  return '<div class="studio-header-row">' +
    '<div>' +
      '<h2 class="studio-header-title">' + esc(tr("studioAnalytics")) + '</h2>' +
      '<p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">Real-time views, watch hours, subscriber growth & revenue</p>' +
    '</div>' +
    '<div class="studio-header-actions">' +
      '<div class="view-tabs" style="margin: 0;">' +
        '<button type="button" class="view-tab' + (period === "today" ? ' active' : '') + '" data-analytics-period="today">' + esc(tr("periodToday") || "Today") + '</button>' +
        '<button type="button" class="view-tab' + (period === "7d" ? ' active' : '') + '" data-analytics-period="7d">' + esc(tr("periodWeek") || "1 Week") + '</button>' +
        '<button type="button" class="view-tab' + (period === "28d" ? ' active' : '') + '" data-analytics-period="28d">' + esc(tr("periodMonth") || "1 Month") + '</button>' +
        '<button type="button" class="view-tab' + (period === "1y" ? ' active' : '') + '" data-analytics-period="1y">' + esc(tr("periodYear") || "1 Year") + '</button>' +
        '<button type="button" class="view-tab' + (period === "lifetime" ? ' active' : '') + '" data-analytics-period="lifetime">' + esc(tr("periodYears") || "Years") + '</button>' +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="realtime-activity-card">' +
    '<div class="realtime-card-head">' +
      '<div class="realtime-title-group">' +
        '<h3 class="realtime-title">' + esc(tr("realtimeTitle") || "Realtime Activity (Live)") + '</h3>' +
        '<div class="realtime-pulse-chip">' +
          '<span class="realtime-pulse-circle" aria-hidden="true"></span>' +
          '<span>' + esc(tr("updatingLive") || "Updating live") + '</span>' +
        '</div>' +
      '</div>' +
      '<span class="realtime-status-pill">' + esc(tr("realtimeSubs") || "Realtime Subscribers") + ': <strong style="color:var(--ink); font-weight:800;">' + analytics.subscribers + '</strong></span>' +
    '</div>' +
    '<div class="realtime-metrics-grid">' +
      '<div class="realtime-stat-block">' +
        '<span class="realtime-stat-label">' + esc(tr("viewsLast48h") || "Views · Last 48 hours") + '</span>' +
        '<span class="realtime-big-num" id="rt-views-48h">' + Number(analytics.rt48h).toLocaleString() + '</span>' +
      '</div>' +
      '<div class="realtime-stat-block">' +
        '<span class="realtime-stat-label">' + esc(tr("viewsLast60m") || "Views · Last 60 minutes") + '</span>' +
        '<span class="realtime-big-num" id="rt-views-60m" style="color: #10b981;">' + Number(analytics.rt60m).toLocaleString() + '</span>' +
      '</div>' +
      '<div class="realtime-stat-block">' +
        '<span class="realtime-stat-label">' + esc(tr("hourlyVelocity") || "Live 24h Hourly Velocity") + '</span>' +
        '<span class="realtime-big-num" style="font-size: 20px;">' + analytics.rtVelocity + '</span>' +
      '</div>' +
    '</div>' +
    '<div class="realtime-bars-container">' +
      '<div class="realtime-bars-label">' +
        '<span>24-Hour Velocity Curve</span>' +
        '<span>Now (Live)</span>' +
      '</div>' +
      '<div class="realtime-bars-track" aria-label="Hourly velocity">' +
        analytics.rtBarsHtml +
      '</div>' +
    '</div>' +
  '</div>' +
  '<div class="analytics-cards-grid">' +
    '<div class="analytics-card">' +
      '<span class="analytics-card-label">' + esc(tr("tableViews")) + '</span>' +
      '<span class="analytics-card-val">' + analytics.totalViews.toLocaleString() + '</span>' +
      '<span class="analytics-card-change">▲ ' + esc(analytics.paceViews) + '</span>' +
    '</div>' +
    '<div class="analytics-card">' +
      '<span class="analytics-card-label">' + esc(tr("watchTimeHours")) + '</span>' +
      '<span class="analytics-card-val">' + analytics.watchHours + 'h</span>' +
      '<span class="analytics-card-change">▲ ' + esc(analytics.paceHours) + '</span>' +
    '</div>' +
    '<div class="analytics-card">' +
      '<span class="analytics-card-label">' + esc(tr("currentSubscribers")) + '</span>' +
      '<span class="analytics-card-val">' + analytics.subscribers + '</span>' +
      '<span class="analytics-card-change">▲ ' + esc(analytics.paceSubs) + '</span>' +
    '</div>' +
    '<div class="analytics-card" style="border-color: rgba(139, 92, 246, 0.4); background: linear-gradient(135deg, color-mix(in srgb, var(--panel2) 90%, #8b5cf6 10%), var(--panel2));">' +
      '<span class="analytics-card-label" style="color: #a78bfa;">' + esc(tr("estimatedRevenue")) + '</span>' +
      '<span class="analytics-card-val" style="color: #c4b5fd;">₹' + Number(analytics.estimatedRevenue).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
      '<span class="analytics-card-change">▲ ' + esc(analytics.paceRevenue) + '</span>' +
    '</div>' +
  '</div>' +
  getAnalyticsChartMarkup(period, analytics) +
  '<div class="analytics-two-col">' +
    '<div class="format-split-card">' +
      '<h3 class="dashboard-card-title">' + esc(tr("topVideos")) + '</h3>' +
      '<div style="display: flex; flex-direction: column; gap: 10px;">' +
        topVids.map((v) =>
          '<div style="display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 6px 0; border-bottom: 1px solid var(--line);">' +
            '<div style="display: flex; align-items: center; gap: 10px; min-width: 0;">' +
              '<span class="format-badge ' + (["reel", "short"].includes(String(v.format || "").toLowerCase()) ? 'badge-reel' : 'badge-video') + '">' + (["reel", "short"].includes(String(v.format || "").toLowerCase()) ? 'Reel' : 'Vid') + '</span>' +
              '<span style="font-size: 13px; font-weight: 700; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">' + esc(v.title) + '</span>' +
            '</div>' +
            '<span style="font-size: 12.5px; font-weight: 800; color: var(--ink); white-space: nowrap;" data-item-views-num="' + esc(v.id) + '">' + getItemViews(v).toLocaleString() + ' plays</span>' +
          '</div>'
        ).join("") +
      '</div>' +
    '</div>' +
    '<div class="format-split-card">' +
      '<h3 class="dashboard-card-title">Content Format Distribution</h3>' +
      '<div class="format-split-row">' +
        '<div class="split-meta"><span>Vertical Reels (58%)</span><span>' + analytics.reelViews.toLocaleString() + ' views</span></div>' +
        '<div class="split-bar-track"><div class="split-bar-fill split-bar-reel" style="width: 58%;"></div></div>' +
      '</div>' +
      '<div class="format-split-row">' +
        '<div class="split-meta"><span>Long Videos (42%)</span><span>' + analytics.videoViews.toLocaleString() + ' views</span></div>' +
        '<div class="split-bar-track"><div class="split-bar-fill split-bar-video" style="width: 42%;"></div></div>' +
      '</div>' +
      '<p style="margin: 6px 0 0; font-size: 11.5px; color: var(--muted); line-height: 1.5;">Reels are driving 58% of your overall channel reach. Publishing 2 Reels per week accelerates watch hours.</p>' +
    '</div>' +
  '</div>';
}

function renderStudioEarn(analytics, subtab) {
  const isPaymentDetails = subtab === "payment-details";

  const summaryContent = '<div class="earnings-top-grid">' +
    '<div class="earn-balance-card">' +
      '<span class="earn-card-tag">' + esc(tr("balanceCard")) + '</span>' +
      '<span class="earn-balance-num">₹' + Number(analytics.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
      '<span class="earn-min-threshold">' + esc(tr("minPaymentAmount")) + '</span>' +
      '<div class="earn-progress-container">' +
        '<div class="earn-progress-bar">' +
          '<div class="earn-progress-bar-fill" style="width: ' + analytics.balanceProgress + '%;"></div>' +
        '</div>' +
        '<div class="earn-progress-label">' +
          '<span>₹' + Number(analytics.balance).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + ' earned</span>' +
          '<span>' + analytics.balanceProgress + '% of ₹8,000.00</span>' +
        '</div>' +
      '</div>' +
      '<p class="earn-helper-text">' + esc(tr("balanceThresholdNote")) + '</p>' +
      '<div class="earn-payout-connected">' +
        '<span>✓</span> <span>' + esc(tr("paymentMethodActive")) + '</span>' +
      '</div>' +
    '</div>' +

    '<div class="earn-stat-card">' +
      '<span class="earn-card-tag">' + esc(tr("totalEarnings")) + '</span>' +
      '<span class="earn-stat-num">₹' + Number(analytics.totalEarnings).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
      '<p class="earn-helper-text">' + esc(tr("totalEarningsNote")) + '</p>' +
    '</div>' +

    '<div class="earn-stat-card">' +
      '<span class="earn-card-tag">' + esc(tr("ytdEarnings")) + '</span>' +
      '<span class="earn-stat-num">₹' + Number(analytics.ytdEarnings).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '</span>' +
      '<p class="earn-helper-text">' + esc(tr("ytdEarningsNote")) + '</p>' +
    '</div>' +
  '</div>' +

  '<div class="dashboard-card" style="margin-top: 10px;">' +
    '<div class="dashboard-card-head">' +
      '<h3 class="dashboard-card-title">' + esc(tr("monthlyBreakdown")) + '</h3>' +
      '<span style="font-size: 12px; color: var(--muted);">Currency: INR (₹)</span>' +
    '</div>' +
    '<div class="monthly-table-wrap">' +
      '<div style="overflow-x: auto;">' +
        '<table class="content-table">' +
          '<thead>' +
            '<tr>' +
              '<th>Month</th>' +
              '<th>' + esc(tr("monetizedViews")) + '</th>' +
              '<th>' + esc(tr("cpmRate")) + '</th>' +
              '<th>' + esc(tr("rpmRate")) + '</th>' +
              '<th>' + esc(tr("earningsAmount")) + '</th>' +
              '<th>' + esc(tr("payoutStatus")) + '</th>' +
            '</tr>' +
          '</thead>' +
          '<tbody>' +
            '<tr>' +
              '<td><strong>October 2026</strong></td>' +
              '<td>420 plays</td>' +
              '<td>₹230.00</td>' +
              '<td>₹175.00</td>' +
              '<td><strong style="color: var(--accent);">₹2,840.00</strong></td>' +
              '<td><span class="payout-status-badge processing">● ' + esc(tr("statusProcessing")) + '</span></td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>September 2026</strong></td>' +
              '<td>650 plays</td>' +
              '<td>₹245.00</td>' +
              '<td>₹180.00</td>' +
              '<td><strong style="color: var(--accent);">₹4,140.00</strong></td>' +
              '<td><span class="payout-status-badge processing">● ' + esc(tr("statusProcessing")) + '</span></td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>August 2026</strong></td>' +
              '<td>1,120 plays</td>' +
              '<td>₹260.00</td>' +
              '<td>₹195.00</td>' +
              '<td><strong style="color: #10b981;">₹5,150.00</strong></td>' +
              '<td><span class="payout-status-badge paid">✓ ' + esc(tr("statusPaid")) + ' (Txn #WB-9921)</span></td>' +
            '</tr>' +
            '<tr>' +
              '<td><strong>July 2026</strong></td>' +
              '<td>980 plays</td>' +
              '<td>₹250.00</td>' +
              '<td>₹185.00</td>' +
              '<td><strong style="color: #10b981;">₹5,670.00</strong></td>' +
              '<td><span class="payout-status-badge paid">✓ ' + esc(tr("statusPaid")) + ' (Txn #WB-8834)</span></td>' +
            '</tr>' +
          '</tbody>' +
        '</table>' +
      '</div>' +
    '</div>' +
  '</div>';

  const paymentDetailsContent = '<div class="dashboard-card">' +
    '<div class="dashboard-card-head">' +
      '<h3 class="dashboard-card-title">' + esc(tr("paymentDetails")) + '</h3>' +
    '</div>' +
    '<div style="display: flex; flex-direction: column; gap: 16px; max-width: 600px;">' +
      '<div style="padding: 16px; border-radius: 12px; background: var(--panel3); border: 1px solid var(--line);">' +
        '<div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px;">' +
          '<strong style="font-size: 14px; color: var(--ink);">Primary Payout Method</strong>' +
          '<span class="payout-status-badge paid">✓ Verified</span>' +
        '</div>' +
        '<p style="margin: 0; font-size: 13px; color: var(--ink);">Direct Deposit to Bank Account</p>' +
        '<p style="margin: 4px 0 0; font-size: 12px; color: var(--muted);">Beneficiary: ' + esc((!localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest) ? "Guest Creator" : localProfile.name) + ' · Account ending in ••••4821</p>' +
      '</div>' +
      '<div style="display: flex; gap: 10px;">' +
        '<button type="button" class="studio-pill-btn" onclick="alert(\'Payout account is verified and ready for the next ₹8,000 payout cycle.\')">' + esc(tr("managePaymentMethod")) + '</button>' +
      '</div>' +
    '</div>' +
  '</div>';

  return '<div class="studio-header-row">' +
    '<div>' +
      '<h2 class="studio-header-title">' + esc(tr("studioEarn")) + ' &amp; ' + esc(tr("paymentDetails")) + '</h2>' +
      '<p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">Monetization metrics, threshold progress and payout history</p>' +
    '</div>' +
    '<div class="studio-header-actions">' +
      '<div class="studio-subtabs" style="margin: 0; border: 0;">' +
        '<button type="button" class="studio-subtab' + (!isPaymentDetails ? ' active' : '') + '" data-earn-tab="summary">' + esc(tr("paymentSummary")) + '</button>' +
        '<button type="button" class="studio-subtab' + (isPaymentDetails ? ' active' : '') + '" data-earn-tab="payment-details">' + esc(tr("paymentDetails")) + '</button>' +
      '</div>' +
    '</div>' +
  '</div>' +
  (isPaymentDetails ? paymentDetailsContent : summaryContent);
}

function renderStudioCommunity(comments, filter) {
  const isHeld = filter === "held";
  const displayComments = isHeld ? [] : comments;

  const commentsHtml = displayComments.length ? displayComments.map((c) => {
    const repliesHtml = (c.replies || []).map((r) =>
      '<div style="margin-top: 8px; margin-left: 20px; padding: 8px 12px; border-left: 2px solid var(--accent); background: var(--panel3); border-radius: 0 8px 8px 0;">' +
        '<strong style="font-size: 12px; color: var(--accent);">' + esc(r.author) + '</strong>' +
        '<p style="margin: 2px 0 0; font-size: 12.5px; color: var(--ink);">' + esc(r.text) + '</p>' +
      '</div>'
    ).join("");

    return '<div class="community-comment-card" data-comment-row-id="' + esc(c.id) + '">' +
      '<div class="community-comment-head">' +
        '<div class="community-avatar">' + esc(initials(c.author)) + '</div>' +
        '<div class="community-comment-meta">' +
          '<span class="community-author-name">' + esc(c.author) + '</span>' +
          '<span class="community-video-link" data-studio-play="' + esc(c.videoId) + '" title="Open video player">▶ ' + esc(c.videoTitle || "Video") + '</span>' +
        '</div>' +
      '</div>' +
      '<p class="community-comment-body">' + esc(c.text) + '</p>' +
      '<div class="community-comment-actions">' +
        '<button type="button" class="community-action-btn" data-community-like="' + esc(c.id) + '">👍 ' + (c.likes || 0) + '</button>' +
        '<button type="button" class="community-action-btn" data-community-reply-toggle="' + esc(c.id) + '">💬 ' + esc(tr("replyAction")) + '</button>' +
        '<button type="button" class="community-action-btn" data-community-delete="' + esc(c.id) + '" data-comment-item-id="' + esc(c.videoId) + '">🗑️ Delete</button>' +
      '</div>' +
      repliesHtml +
      '<div class="community-reply-box" id="reply-box-' + esc(c.id) + '" hidden>' +
        '<textarea class="community-reply-textarea" id="reply-input-' + esc(c.id) + '" placeholder="' + esc(tr("replyPlaceholder")) + '"></textarea>' +
        '<div class="community-reply-actions">' +
          '<button type="button" class="studio-pill-btn" data-community-reply-cancel="' + esc(c.id) + '">' + esc(tr("replyCancel")) + '</button>' +
          '<button type="button" class="studio-pill-btn studio-pill-primary" data-community-reply-submit="' + esc(c.id) + '" data-comment-item-id="' + esc(c.videoId) + '">' + esc(tr("replySubmit")) + '</button>' +
        '</div>' +
      '</div>' +
    '</div>';
  }).join("") : '<div class="channel-empty" style="padding: 40px; text-align: center; color: var(--muted);">' + (isHeld ? 'No comments held for review.' : esc(tr("noCommentsFound"))) + '</div>';

  const posts = loadCommunityPosts();
  const isPostsTab = filter === "posts";

  let communityBody = "";
  if (isPostsTab) {
    communityBody = renderChannelCommunityTab(posts, true);
  } else {
    communityBody = '<div class="community-comment-list">' + commentsHtml + '</div>';
  }

  return '<div class="studio-header-row">' +
    '<div>' +
      '<h2 class="studio-header-title">' + (isPostsTab ? (tr("communityPosts") || "Community Posts") : esc(tr("channelComments"))) + '</h2>' +
      '<p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">Manage community posts, comments, live broadcast links &amp; feedback</p>' +
    '</div>' +
  '</div>' +
  '<div class="studio-subtabs">' +
    '<button type="button" class="studio-subtab' + (!isHeld && !isPostsTab ? ' active' : '') + '" data-community-filter="published">' + esc(tr("commentsPublished")) + ' (' + comments.length + ')</button>' +
    '<button type="button" class="studio-subtab' + (isHeld && !isPostsTab ? ' active' : '') + '" data-community-filter="held">' + esc(tr("commentsHeld")) + ' (0)</button>' +
    '<button type="button" class="studio-subtab' + (isPostsTab ? ' active' : '') + '" data-community-filter="posts">📢 ' + (tr("communityPosts") || "Community Posts") + ' (' + posts.length + ')</button>' +
  '</div>' +
  communityBody;
}

function renderStudioCustomisation() {
  const bannerStyle = localProfile.banner
    ? 'style="background-image: url(\'' + esc(localProfile.banner) + '\'); background-size: cover; background-position: center;"'
    : '';

  const isGuestCust = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
  const studioNameVal = isGuestCust ? "" : (localProfile.name || "");
  const studioHandleVal = isGuestCust ? "" : (localProfile.handle || "");
  const studioBioVal = isGuestCust ? "" : (localProfile.bio || "");

  return '<div class="studio-header-row">' +
    '<div>' +
      '<h2 class="studio-header-title">' + esc(tr("channelCustomisation")) + '</h2>' +
      '<p style="margin: 4px 0 0; color: var(--muted); font-size: 13px;">Customize your channel identity, name, handle and visual branding</p>' +
    '</div>' +
    '<div class="studio-header-actions">' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" data-studio-customise-save>' +
        esc(tr("saveStudioProfile")) +
      '</button>' +
    '</div>' +
  '</div>' +
  '<form class="customise-form" onsubmit="event.preventDefault();">' +
    '<div id="studio-save-status" aria-live="polite"></div>' +
    '<div class="customise-form-group">' +
      '<label class="customise-label">' + esc(tr("channelBanner")) + '</label>' +
      '<span class="customise-hint">Recommended banner resolution: 1440 × 400 pixels</span>' +
      '<div class="customise-banner-preview" id="studio-banner-preview" ' + bannerStyle + '>' +
        '<button type="button" class="customise-banner-btn" data-studio-banner-change>' + esc(tr("changeImage")) + '</button>' +
        '<input type="file" id="studio-banner-file" accept="image/*" hidden>' +
      '</div>' +
    '</div>' +

    '<div class="customise-form-group">' +
      '<label class="customise-label">' + esc(tr("channelAvatar")) + '</label>' +
      '<div style="display: flex; align-items: center; gap: 16px;">' +
        '<div class="studio-channel-avatar" id="studio-avatar-preview" style="width: 56px; height: 56px; margin: 0;">' +
          profilePhotoMarkup(isGuestCust ? "" : localProfile.photo, isGuestCust ? "WB" : (localProfile.name || "WB")) +
        '</div>' +
        '<button type="button" class="studio-pill-btn" data-studio-avatar-change>' + esc(tr("changeImage")) + '</button>' +
        '<input type="file" id="studio-avatar-file" accept="image/*" hidden>' +
      '</div>' +
    '</div>' +

    '<div class="customise-form-group">' +
      '<label class="customise-label" for="studio-name-input">' + esc(tr("channelName")) + '</label>' +
      '<input type="text" class="customise-input" id="studio-name-input" value="' + esc(studioNameVal) + '" placeholder="e.g. Arun Rana" maxlength="40" required>' +
    '</div>' +

    '<div class="customise-form-group">' +
      '<label class="customise-label" for="studio-handle-input">' + esc(tr("channelHandle")) + '</label>' +
      '<input type="text" class="customise-input" id="studio-handle-input" value="' + esc(studioHandleVal) + '" placeholder="e.g. @Anime_onthewayy" maxlength="40" required>' +
    '</div>' +

    '<div class="customise-form-group">' +
      '<label class="customise-label" for="studio-bio-input">' + esc(tr("channelBio")) + '</label>' +
      '<textarea class="customise-textarea" id="studio-bio-input" rows="3" placeholder="Tell viewers about your channel..." maxlength="200">' + esc(studioBioVal) + '</textarea>' +
    '</div>' +

    '<div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 10px;">' +
      '<button type="button" class="studio-pill-btn studio-pill-primary" data-studio-customise-save>' +
        esc(tr("saveStudioProfile")) +
      '</button>' +
    '</div>' +
  '</form>';
}

function renderStudioView(videos) {
  const dialog = $("creator-dialog");
  const content = $("creator-dialog-content");
  if (!dialog || !content) return;
  const analytics = getChannelAnalyticsData(videos, currentStudioAnalyticsPeriod);
  const comments = getStudioChannelComments(videos);

  let mainHtml = "";
  if (currentStudioTab === "content") {
    mainHtml = renderStudioContent(videos, currentStudioContentFilter);
  } else if (currentStudioTab === "analytics") {
    mainHtml = renderStudioAnalytics(videos, analytics, currentStudioAnalyticsPeriod);
  } else if (currentStudioTab === "earn") {
    mainHtml = renderStudioEarn(analytics, currentStudioEarnTab);
  } else if (currentStudioTab === "community") {
    mainHtml = renderStudioCommunity(comments, currentStudioCommunityFilter);
  } else if (currentStudioTab === "customisation") {
    mainHtml = renderStudioCustomisation();
  } else {
    mainHtml = renderStudioDashboard(videos, analytics, comments);
  }

  content.innerHTML = creatorDialogHeader(tr("creatorStudio")) +
    '<div class="studio-layout">' +
      renderStudioSidebar(currentStudioTab) +
      '<main class="studio-main">' + mainHtml + '</main>' +
    '</div>';
}

async function openCreatorStudio(tab = "dashboard", fromHistory = false) {
  // Strict Privacy Invariant: Creator Studio is reserved for registered account holders
  if (!localProfile || localProfile.isGuest || !localProfile.name || localProfile.name.trim() === "Guest") {
    restorePopoversFromDialog();
    if ($("creator-dialog")?.open) $("creator-dialog").close();
    showFollowToast("Creator Studio requires a registered account. Please sign in to manage your channel.");
    openAuthModal("signin");
    return;
  }

  restorePopoversFromDialog();
  let switching = false;
  if ($("detail-dialog")?.open) {
    switching = true;
    isSwitchingDialog = true;
    $("detail-dialog").close();
  }
  const dialog = $("creator-dialog");
  const content = $("creator-dialog-content");
  delete dialog.dataset.channelOpen;
  delete dialog.dataset.channelAuthor;
  delete dialog.dataset.channelTab;
  delete dialog.dataset.channelLoadedAuthor;
  delete dialog.dataset.loadingAuthor;
  dialog.dataset.profileEditor = "studio";
  dialog.dataset.creatorAction = "studio";
  currentStudioTab = tab;

  if (!fromHistory && !isNavigatingHistory) {
    pushWindowHistory({ type: "panel", action: "studio", tab });
  }

  content.innerHTML = creatorDialogHeader(tr("creatorStudio")) +
    '<div class="studio-loading" style="padding: 60px; text-align: center; color: var(--muted);">' +
      '<span style="font-size: 28px; display: block; margin-bottom: 10px;">⏳</span>' +
      '<strong>' + esc(tr("loading") || "Loading Creator Studio…") + '</strong>' +
    '</div>';

  moveNavigationIntoDialog(dialog);
  if (!dialog.open) dialog.showModal();
  if (switching) isSwitchingDialog = false;

  const videos = await getMyChannelVideos();
  renderStudioView(videos);
}

let lastActiveAccountToggle = null;
let lastActiveNotificationToggle = null;

function toggleAccountMenu(button) {
  const menu = $("account-menu");
  if (!menu) return;
  const parentControl = button.closest(".account-control") || document.querySelector(".topbar .account-control");
  const isCurrentlyOpen = !menu.hidden && menu.parentElement === parentControl;
  closeNotificationPopover();
  if (isCurrentlyOpen) {
    closeAccountMenu();
  } else {
    if (parentControl && menu.parentElement !== parentControl) {
      parentControl.appendChild(menu);
    }
    menu.hidden = false;
    document.querySelectorAll("#account-menu-toggle, [data-dialog-account-toggle]").forEach((btn) => {
      btn.setAttribute("aria-expanded", String(btn === button));
    });
    lastActiveAccountToggle = button;
  }
}

function closeAccountMenu(restoreFocus = false) {
  const menu = $("account-menu");
  if (!menu || menu.hidden) return;
  menu.hidden = true;
  document.querySelectorAll("#account-menu-toggle, [data-dialog-account-toggle]").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
  const topbarAccountControl = document.querySelector(".topbar .account-control");
  if (topbarAccountControl && menu.parentElement !== topbarAccountControl) {
    topbarAccountControl.appendChild(menu);
  }
  if (restoreFocus && lastActiveAccountToggle) lastActiveAccountToggle.focus();
}

function prepareMediaUrlForNetwork(url) {
  if (!url || typeof url !== "string") return url;
  if (typeof window !== "undefined" && window.location && window.location.hostname) {
    const isNgrok = window.location.hostname.includes("ngrok");
    if (isNgrok && !url.includes("ngrok-skip-browser-warning")) {
      const sep = url.includes("?") ? "&" : "?";
      return url + sep + "ngrok-skip-browser-warning=true";
    }
  }
  return url;
}

function handleAccountMenuAction(action) {
  closeAccountMenu();
  if (action === "my-channel") { openMyChannel(); return; }
  if (action === "studio") { openCreatorStudio(); return; }
  if (action === "my-videos") { openManageVideosModal(); return; }
  if (action === "saved" || action === "following" || action === "liked" || action === "settings") { setView(action); return; }
  if (action === "help") { setView("settings"); switchSettingsSubTab("support"); return; }
  if (action === "auth" || action === "signin") { openAuthModal("login"); return; }
  if (action === "signup" || action === "register") { openAuthModal("register"); return; }
  if (action === "signout" || action === "logout") { handleSignOut(); return; }
  if (action === "account") {
    if (localProfile.isGuest) {
      openAuthModal("login");
    } else {
      openProfileEditor();
    }
    return;
  }
  if (action === "theme") {
    applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark");
    return;
  }
  if (action === "language") {
    openLanguagePickerModal();
    return;
  }
  openCreatorPanel(action === "account" ? "account" : action);
}

function openAuthModal(initialTab = "login") {
  closeAccountMenu();
  let modal = $("auth-modal");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "auth-modal";
    modal.className = "detail-dialog auth-modal";
    modal.setAttribute("aria-labelledby", "auth-modal-title");
    document.body.appendChild(modal);
  }

  let activeTab = initialTab;
  let otpState = {
    sessionId: null,
    targetMasked: "",
    targetType: "email",
    purpose: "signup",
    timerInterval: null,
    secondsLeft: 600,
    devOtp: null,
  };

  function clearOtpTimer() {
    if (otpState.timerInterval) {
      clearInterval(otpState.timerInterval);
      otpState.timerInterval = null;
    }
  }

  function startOtpTimer(initialSeconds = 600) {
    clearOtpTimer();
    otpState.secondsLeft = initialSeconds;
    const timerEl = $("auth-otp-timer-val");
    if (timerEl) {
      const m = String(Math.floor(otpState.secondsLeft / 60)).padStart(2, "0");
      const s = String(otpState.secondsLeft % 60).padStart(2, "0");
      timerEl.textContent = `${m}:${s}`;
    }
    otpState.timerInterval = setInterval(() => {
      otpState.secondsLeft -= 1;
      const el = $("auth-otp-timer-val");
      if (el) {
        if (otpState.secondsLeft <= 0) {
          el.textContent = "00:00 (Expired)";
          clearOtpTimer();
        } else {
          const m = String(Math.floor(otpState.secondsLeft / 60)).padStart(2, "0");
          const s = String(otpState.secondsLeft % 60).padStart(2, "0");
          el.textContent = `${m}:${s}`;
        }
      }
    }, 1000);
  }

  function renderAuthDialog(tab) {
    clearOtpTimer();
    activeTab = tab;
    modal.innerHTML = `
      <div class="dialog-inner auth-dialog-inner">
        <div class="dialog-top">
          <div class="auth-brand-head">
            <span class="auth-brand-mark"><img src="/watchbloom-mark.svg" alt="Watchbloom"></span>
            <div>
              <strong id="auth-modal-title" style="font-size:15px; color:var(--ink);">Watchbloom Account</strong>
              <small style="display:block; color:var(--muted); font-size:11px;">Flask-Login & Multi-Channel OTP</small>
            </div>
          </div>
          <button class="dialog-close auth-modal-close" type="button" aria-label="Close dialog">×</button>
        </div>

        <div class="auth-tabs-bar" role="tablist">
          <button type="button" class="auth-tab-pill ${activeTab === 'login' ? 'active' : ''}" data-auth-tab="login">Sign in</button>
          <button type="button" class="auth-tab-pill ${activeTab === 'register' ? 'active' : ''}" data-auth-tab="register">Create account</button>
        </div>

        <div id="auth-feedback-banner" class="auth-feedback-banner" hidden></div>

        ${activeTab === 'login' ? `
          <form id="auth-login-form" class="auth-form-card" autocomplete="on">
            <label class="auth-label">
              <span>Username, Gmail, or Mobile</span>
              <input id="auth-login-identifier" type="text" class="auth-input" placeholder="e.g. user, user@gmail.com, or +91..." required autofocus autocomplete="username">
            </label>
            <label class="auth-label">
              <span>Password</span>
              <input id="auth-login-password" type="password" class="auth-input" placeholder="Your password" required autocomplete="current-password">
            </label>
            <div class="auth-actions-group">
              <button type="submit" class="auth-primary-submit">
                <span>Sign In via 6-Digit OTP</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>
            <div class="auth-switch-prompt">
              <span>New to Watchbloom?</span>
              <button type="button" class="auth-text-link" data-switch-auth="register">Create an account</button>
            </div>
          </form>
        ` : `
          <form id="auth-register-form" class="auth-form-card" autocomplete="on">
            <label class="auth-label">
              <span>Channel / Display Name</span>
              <input id="auth-reg-username" type="text" class="auth-input" placeholder="e.g. Arun Rana" maxlength="60" required autofocus autocomplete="name">
            </label>

            <div class="auth-grid-two-col">
              <label class="auth-label">
                <span>Gmail Address</span>
                <input id="auth-reg-email" type="email" class="auth-input" placeholder="name@gmail.com" required autocomplete="email">
                <small class="auth-field-hint">For 6-digit OTP via Gmail</small>
              </label>
              <label class="auth-label">
                <span>Mobile Contact</span>
                <input id="auth-reg-mobile" type="tel" class="auth-input" placeholder="+91 98765 43210" required autocomplete="tel">
                <small class="auth-field-hint">For 6-digit OTP via SMS</small>
              </label>
            </div>

            <div class="auth-grid-two-col">
              <label class="auth-label">
                <span>New Password</span>
                <input id="auth-reg-password" type="password" class="auth-input" placeholder="At least 6 characters" minlength="6" required autocomplete="new-password">
              </label>
              <label class="auth-label">
                <span>New Password Again</span>
                <input id="auth-reg-confirm-password" type="password" class="auth-input" placeholder="Confirm password again" minlength="6" required autocomplete="new-password">
              </label>
            </div>

            <label class="auth-label">
              <span>Send 6-Digit OTP Via</span>
              <div class="auth-channel-options">
                <label class="auth-channel-chip selected" data-chan="email">
                  <input type="radio" name="auth-reg-chan" value="email" checked>
                  <span>✉️ Gmail (Flask-Mail)</span>
                </label>
                <label class="auth-channel-chip" data-chan="mobile">
                  <input type="radio" name="auth-reg-chan" value="mobile">
                  <span>📱 Mobile SMS</span>
                </label>
              </div>
            </label>

            <label class="auth-label">
              <span>Account Type</span>
              <select id="auth-reg-role" class="auth-input auth-select">
                <option value="creator" selected>Creator (Upload Videos, Reels & Go Live)</option>
                <option value="viewer">Viewer (Watch, Like, Save to Playlists)</option>
              </select>
            </label>

            <div class="auth-actions-group" style="margin-top: 10px;">
              <button type="submit" class="auth-primary-submit auth-join-now-btn" id="auth-reg-submit-btn">
                <span>Join now</span>
                <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>
              </button>
            </div>

            <div class="auth-switch-prompt" style="margin-top: 10px;">
              <span>Already on Watchbloom?</span>
              <button type="button" class="auth-text-link" data-switch-auth="login">Sign in</button>
            </div>
          </form>
        `}
      </div>
    `;

    bindFormEvents();
  }

  function renderOtpView() {
    const isEmail = otpState.targetType === "email";
    modal.innerHTML = `
      <div class="dialog-inner auth-dialog-inner">
        <div class="dialog-top">
          <div class="auth-brand-head">
            <span class="auth-brand-mark"><img src="/watchbloom-mark.svg" alt="Watchbloom"></span>
            <div>
              <strong id="auth-modal-title" style="font-size:15px; color:var(--ink);">Security Verification</strong>
              <small style="display:block; color:var(--muted); font-size:11px;">6-Digit OTP Validation</small>
            </div>
          </div>
          <button class="dialog-close auth-modal-close" type="button" aria-label="Close dialog">×</button>
        </div>

        <div id="auth-feedback-banner" class="auth-feedback-banner" hidden></div>

        <form id="auth-otp-form" class="auth-otp-step-card">
          <div class="auth-otp-badge">
            ${isEmail ? `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
            ` : `
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="2" ry="2"/><line x1="12" y1="18" x2="12.01" y2="18"/></svg>
            `}
          </div>

          <div>
            <h3 class="auth-otp-title">Enter Verification Code</h3>
            <p class="auth-otp-subtitle">
              A 6-digit code was sent via <strong>${isEmail ? "Flask-Mail (Gmail)" : "SMS"}</strong> to
              <br><span class="auth-otp-target-highlight">${esc(otpState.targetMasked)}</span>
            </p>
          </div>

          ${otpState.devOtp ? `
            <div style="background: rgba(249, 115, 22, 0.12); border: 1.5px dashed #f97316; border-radius: 12px; padding: 12px 16px; font-size: 13px; color: #f97316; margin: 4px 0;">
              🔑 <strong>Test OTP: <span style="font-size:18px; letter-spacing:3px; font-family:monospace;">${esc(otpState.devOtp)}</span></strong>
              <div style="font-size: 11px; color: var(--muted); margin-top: 4px;">To receive real OTP directly on your phone/Gmail, add credentials in <code>.env</code></div>
            </div>
          ` : ''}

          <label class="auth-label" style="align-items:center;">
            <span>6-Digit Numeric Code</span>
            <input id="auth-otp-code" type="text" inputmode="numeric" pattern="[0-9]{6}" maxlength="6" class="auth-otp-code-input" placeholder="••••••" autofocus required autocomplete="one-time-code">
          </label>

          <div class="auth-countdown-container">
            <span>Code expires in</span>
            <span id="auth-otp-timer-val" class="auth-countdown-timer">10:00</span>
          </div>

          <div class="auth-otp-buttons-row">
            <button type="button" id="auth-otp-back-btn" class="auth-back-btn">← Back</button>
            <button type="submit" id="auth-otp-submit-btn" class="auth-primary-submit" style="flex:2;">
              <span>Verify & Continue</span>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"/></svg>
            </button>
          </div>

          <div class="auth-switch-prompt" style="margin-top:4px;">
            <span>Didn't receive code?</span>
            <button type="button" id="auth-resend-otp-link" class="auth-text-link">Resend Code</button>
          </div>
        </form>
      </div>
    `;

    startOtpTimer(otpState.secondsLeft || 600);
    bindOtpEvents();
  }

  function bindFormEvents() {
    const feedback = $("auth-feedback-banner");

    function showError(msg) {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.className = "auth-feedback-banner error";
      feedback.hidden = false;
    }

    modal.querySelectorAll("[data-auth-tab]").forEach((btn) => {
      btn.onclick = () => renderAuthDialog(btn.dataset.authTab);
    });

    modal.querySelectorAll("[data-switch-auth]").forEach((btn) => {
      btn.onclick = () => renderAuthDialog(btn.dataset.switchAuth);
    });

    const closeBtn = modal.querySelector(".auth-modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        clearOtpTimer();
        try { modal.close(); } catch (_) {}
      };
    }

    // Channel chip selector
    modal.querySelectorAll(".auth-channel-chip").forEach((chip) => {
      chip.onclick = () => {
        modal.querySelectorAll(".auth-channel-chip").forEach((c) => c.classList.remove("selected"));
        chip.classList.add("selected");
        const radio = chip.querySelector("input[type='radio']");
        if (radio) radio.checked = true;
      };
    });

    // Sign In Form Submission
    const loginForm = $("auth-login-form");
    if (loginForm) {
      loginForm.onsubmit = async (e) => {
        e.preventDefault();
        feedback.hidden = true;
        const identifier = $("auth-login-identifier")?.value.trim();
        const password = $("auth-login-password")?.value;
        const submitBtn = loginForm.querySelector("button[type='submit']");
        if (submitBtn) submitBtn.disabled = true;

        try {
          const res = await fetch("/api/v1/auth/signin/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ identifier: identifier, password: password })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Sign in failed. Check your credentials.");
          }

          otpState.sessionId = data.session_id;
          otpState.targetMasked = data.target_masked || identifier;
          otpState.targetType = data.target_type || "email";
          otpState.purpose = "signin";
          otpState.secondsLeft = data.expires_in || 600;
          otpState.devOtp = data.dev_otp || null;

          renderOtpView();
        } catch (err) {
          showError(err.message);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }

    // Sign Up Form Submission
    const regForm = $("auth-register-form");
    if (regForm) {
      regForm.onsubmit = async (e) => {
        e.preventDefault();
        feedback.hidden = true;
        const username = $("auth-reg-username")?.value.trim();
        const email = $("auth-reg-email")?.value.trim();
        const mobile = $("auth-reg-mobile")?.value.trim();
        const password = $("auth-reg-password")?.value || "";
        const confirmPassword = $("auth-reg-confirm-password")?.value || "";
        const role = $("auth-reg-role")?.value || "creator";
        const channel = modal.querySelector("input[name='auth-reg-chan']:checked")?.value || "email";
        const submitBtn = $("auth-reg-submit-btn") || regForm.querySelector("button[type='submit']");

        // Reset any previous input highlight
        const confirmInput = $("auth-reg-confirm-password");
        if (confirmInput) confirmInput.style.borderColor = "";

        if (password.length < 6) {
          showError("Password must be at least 6 characters long.");
          $("auth-reg-password")?.focus();
          return;
        }

        if (password !== confirmPassword) {
          showError("Passwords do not match. Please verify 'New Password' and 'New Password Again'.");
          if (confirmInput) {
            confirmInput.focus();
            confirmInput.style.borderColor = "#f87171";
          }
          return;
        }

        if (submitBtn) {
          submitBtn.disabled = true;
          submitBtn.innerHTML = '<span>⏳ Sending OTP...</span>';
        }

        try {
          const res = await fetch("/api/v1/auth/signup/send-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              username: username,
              email: email,
              mobile: mobile,
              password: password,
              confirm_password: confirmPassword,
              role: role,
              channel: channel,
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Registration validation failed.");
          }

          otpState.sessionId = data.session_id;
          otpState.targetMasked = data.target_masked || (channel === "email" ? email : mobile);
          otpState.targetType = data.target_type || channel;
          otpState.purpose = "signup";
          otpState.secondsLeft = data.expires_in || 600;
          otpState.devOtp = data.dev_otp || null;

          renderOtpView();
        } catch (err) {
          showError(err.message);
        } finally {
          if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.innerHTML = '<span>Join now</span><svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 12h14M12 5l7 7-7 7"/></svg>';
          }
        }
      };
    }
  }

  function bindOtpEvents() {
    const feedback = $("auth-feedback-banner");

    function showError(msg) {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.className = "auth-feedback-banner error";
      feedback.hidden = false;
    }

    function showSuccess(msg) {
      if (!feedback) return;
      feedback.textContent = msg;
      feedback.className = "auth-feedback-banner success";
      feedback.hidden = false;
    }

    const closeBtn = modal.querySelector(".auth-modal-close");
    if (closeBtn) {
      closeBtn.onclick = () => {
        clearOtpTimer();
        try { modal.close(); } catch (_) {}
      };
    }

    const backBtn = $("auth-otp-back-btn");
    if (backBtn) {
      backBtn.onclick = () => {
        renderAuthDialog(activeTab);
      };
    }

    // Auto-focus code input
    const codeInput = $("auth-otp-code");
    if (codeInput) {
      if (otpState.devOtp) {
        codeInput.value = otpState.devOtp;
      }
      codeInput.focus();
      codeInput.oninput = () => {
        codeInput.value = codeInput.value.replace(/\D/g, "");
      };
    }

    // Resend OTP handler
    const resendLink = $("auth-resend-otp-link");
    if (resendLink) {
      resendLink.onclick = async () => {
        try {
          resendLink.textContent = "Sending...";
          const res = await fetch("/api/v1/auth/resend-otp", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ session_id: otpState.sessionId })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Failed to resend code.");
          }
          if (data.dev_otp) {
            otpState.devOtp = data.dev_otp;
            if (codeInput) codeInput.value = data.dev_otp;
          }
          startOtpTimer(data.expires_in || 600);
          showSuccess("New 6-digit verification code dispatched!");
        } catch (err) {
          showError(err.message);
        } finally {
          resendLink.textContent = "Resend Code";
        }
      };
    }

    // Submit OTP verification
    const otpForm = $("auth-otp-form");
    if (otpForm) {
      otpForm.onsubmit = async (e) => {
        e.preventDefault();
        feedback.hidden = true;
        const otpCode = $("auth-otp-code")?.value.trim();
        const submitBtn = $("auth-otp-submit-btn");
        if (submitBtn) submitBtn.disabled = true;

        const endpoint = otpState.purpose === "signup"
          ? "/api/v1/auth/signup/verify-otp"
          : "/api/v1/auth/signin/verify-otp";

        try {
          const res = await fetch(endpoint, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              session_id: otpState.sessionId,
              otp_code: otpCode,
            })
          });
          const data = await res.json();
          if (!res.ok || !data.success) {
            throw new Error(data.error || "Verification failed.");
          }

          clearOtpTimer();
          applyAuthenticatedSession(data.user);
          try { modal.close(); } catch (_) {}
          showFollowToast(
            otpState.purpose === "signup"
              ? `Account verified! Welcome to Watchbloom, ${data.user.username || data.user.name}!`
              : `Welcome back, ${data.user.username || data.user.name}!`
          );
        } catch (err) {
          showError(err.message);
        } finally {
          if (submitBtn) submitBtn.disabled = false;
        }
      };
    }
  }

  renderAuthDialog(initialTab);
  if (!modal.open) modal.showModal();
}

function applyAuthenticatedSession(user) {
  localProfile = {
    isGuest: false,
    id: user.id,
    name: user.username || user.name || "Watchbloom User",
    email: user.email || "",
    mobile: user.mobile || "",
    handle: user.handle || ("@" + (user.username || user.name || "user").toLowerCase().replace(/\s+/g, "_")),
    bio: user.bio || "",
    photo: user.photo || "",
    banner: user.banner || "",
    role: user.role || "viewer",
  };
  writeJson("watchbloom-local-profile", localProfile);
  creatorChannelCache.clear();
  updateOwnProfileUI();
  syncPersonalizedData();
}

async function handleSignOut() {
  try {
    await fetch("/api/v1/auth/logout", { method: "POST" });
  } catch (_) {}
  localProfile = {
    isGuest: true,
    id: "guest",
    name: "Guest",
    email: "",
    mobile: "",
    handle: "@guest",
    bio: "",
    photo: "",
    banner: "",
    role: "viewer",
  };
  writeJson("watchbloom-local-profile", localProfile);
  savedIds.clear();
  updateSaved();
  updateLiked();
  creatorChannelCache.clear();
  updateOwnProfileUI();
  showFollowToast("Signed out. Switched to guest mode.");
  if (activeView === "saved" || activeView === "history" || activeView === "following") {
    render(q.value, false);
  }
}

async function syncUserAuth() {
  try {
    const res = await fetch("/api/v1/auth/me", {
      credentials: "same-origin",
      headers: { "Accept": "application/json" }
    });
    if (res.ok) {
      const data = await res.json();
      if (data && data.authenticated && data.user) {
        const u = data.user;
        localProfile = {
          isGuest: false,
          id: u.id || "user",
          name: u.username || u.name || "Watchbloom User",
          email: u.email || "",
          mobile: u.mobile || "",
          handle: u.handle || ("@" + (u.username || u.name || "user").toLowerCase().replace(/\s+/g, "_")),
          bio: u.bio || "",
          photo: u.photo || "",
          banner: u.banner || "",
          role: u.role || "viewer",
        };
        writeJson("watchbloom-local-profile", localProfile);
        updateOwnProfileUI();
        syncPersonalizedData();
        return;
      }
    }
  } catch (e) {
    console.debug("Auth sync notice:", e);
  }

  // Not authenticated: enforce Guest mode strictly
  localProfile = {
    isGuest: true,
    id: "guest",
    name: "Guest",
    email: "",
    mobile: "",
    handle: "@guest",
    bio: "",
    photo: "",
    banner: "",
    role: "viewer",
  };
  writeJson("watchbloom-local-profile", localProfile);
  updateOwnProfileUI();
}

async function syncPersonalizedData() {
  if (localProfile.isGuest) return;
  try {
    const [savedRes, histRes] = await Promise.all([
      fetch("/api/v1/user/saved"),
      fetch("/api/v1/user/history")
    ]);
    if (savedRes.ok) {
      const savedData = await savedRes.json();
      if (savedData && Array.isArray(savedData.results)) {
        savedIds = new Set(savedData.results.map(it => it.id));
        updateSaved();
      }
    }
    if (histRes.ok) {
      const histData = await histRes.json();
      if (histData && Array.isArray(histData.results)) {
        const rows = histData.results.map((it) => ({
          item: it,
          viewedAt: it.date || new Date().toISOString()
        }));
        writeJson("watchbloom-history", rows);
      }
    }
  } catch (err) {
    console.debug("Personalized data sync error:", err);
  }
}

function openLanguagePickerModal() {
  closeAccountMenu();
  let modal = $("language-modal");
  if (!modal) {
    modal = document.createElement("dialog");
    modal.id = "language-modal";
    modal.className = "detail-dialog language-modal";
    modal.setAttribute("aria-labelledby", "language-modal-title");
    document.body.appendChild(modal);
  }
  if (!modal.dataset.bound) {
    modal.dataset.bound = "true";
    modal.addEventListener("click", (e) => {
      const card = e.target.closest("[data-lang-code]");
      if (card) {
        const selectedCode = card.dataset.langCode;
        applyLanguage(selectedCode);
        const selLang = LANGUAGE_OPTIONS.find((entry) => entry.code === selectedCode);
        showFollowToast((selLang?.native || selectedCode) + (selLang?.name ? (" · " + selLang.name) : ""));
        try { modal.close(); } catch (_) {}
        return;
      }
      if (e.target.closest(".language-modal-close")) {
        try { modal.close(); } catch (_) {}
        return;
      }
      if (e.target === modal) {
        const rect = modal.getBoundingClientRect();
        const isInDialog = (
          rect.top <= e.clientY && e.clientY <= rect.top + rect.height &&
          rect.left <= e.clientX && e.clientX <= rect.left + rect.width
        );
        if (!isInDialog) {
          try { modal.close(); } catch (_) {}
        }
      }
    });
    modal.addEventListener("cancel", () => {
      try { modal.close(); } catch (_) {}
    });
  }
  const currentLang = language;
  const cardsHtml = LANGUAGE_OPTIONS.map((entry) => {
    const isSel = entry.code === currentLang;
    return '<button type="button" class="lang-option-card' + (isSel ? ' active' : '') + '" data-lang-code="' + esc(entry.code) + '" lang="' + esc(entry.locale) + '">' +
      '<div class="lang-option-text">' +
        '<span class="lang-native">' + esc(entry.native) + '</span>' +
        '<span class="lang-english">' + esc(entry.name) + '</span>' +
      '</div>' +
      (isSel ? '<span class="lang-check" aria-hidden="true">✓</span>' : '') +
    '</button>';
  }).join("");

  modal.innerHTML = '<div class="dialog-inner language-modal-inner">' +
    '<div class="dialog-top language-modal-top">' +
      '<div class="dialog-top-leading">' +
        '<span class="language-modal-icon" aria-hidden="true">文A</span>' +
        '<h2 id="language-modal-title">' + esc(tr("displayLanguage")) + '</h2>' +
      '</div>' +
      '<button type="button" class="dialog-close language-modal-close" aria-label="' + esc(tr("close")) + '">×</button>' +
    '</div>' +
    '<p class="language-modal-desc">' + esc(tr("displayLanguage")) + ' · Choose your language across all windows</p>' +
    '<div class="lang-grid">' + cardsHtml + '</div>' +
  '</div>';

  if (!modal.open) modal.showModal();
}

function refreshOpenDialogsOnLanguageChange() {
  const detailDialog = $("detail-dialog");
  if (detailDialog && detailDialog.open && detailDialog.dataset.itemId) {
    const video = detailDialog.querySelector("video");
    const currentTime = video && !isNaN(video.currentTime) ? video.currentTime : 0;
    const isPlaying = video ? !video.paused : false;
    openDetails(detailDialog.dataset.itemId, true);
    const newVideo = detailDialog.querySelector("video");
    if (newVideo) {
      newVideo.currentTime = currentTime;
      if (isPlaying) newVideo.play().catch(() => {});
    }
  }

  const creatorDialog = $("creator-dialog");
  if (creatorDialog && creatorDialog.open) {
    if (creatorDialog.dataset.profileEditor === "upload") {
      const titleVal = $("upload-video-title")?.value || "";
      const descVal = $("upload-video-desc")?.value || "";
      const catVal = $("upload-video-cat")?.value || "";
      const format = typeof pendingUploadFormat !== "undefined" ? pendingUploadFormat : "video";
      openUploadModal();
      if ($("upload-video-title")) $("upload-video-title").value = titleVal;
      if ($("upload-video-desc")) $("upload-video-desc").value = descVal;
      if ($("upload-video-cat") && catVal) $("upload-video-cat").value = catVal;
      pendingUploadFormat = format;
      const fmtBtn = creatorDialog.querySelector('[data-upload-format="' + format + '"]');
      if (fmtBtn) {
        creatorDialog.querySelectorAll(".upload-format-btn").forEach((b) => b.classList.toggle("active", b === fmtBtn));
      }
    } else if (creatorDialog.dataset.profileEditor === "studio") {
      renderStudioView(studioCachedVideos);
    } else if (creatorDialog.dataset.profileEditor === "true") {
      openProfileEditor(true);
    } else if (creatorDialog.dataset.channelOpen === "true" && creatorDialog.dataset.channelAuthor) {
      openCreatorChannel(creatorDialog.dataset.channelAuthor, creatorDialog.dataset.channelTab || "home", true);
    } else if (creatorDialog.dataset.creatorAction) {
      openCreatorPanel(creatorDialog.dataset.creatorAction, true);
    }
  }
}

function updateThemeToggle() {
  const value = document.documentElement.dataset.theme || "dark";
  const button = $("theme-toggle");
  const label = language === "hi"
    ? (value === "dark" ? "Light mode lagao" : "Dark mode lagao")
    : (value === "dark" ? "Switch to light theme" : "Switch to dark theme");
  button.innerHTML = value === "dark" ? SUN_THEME_ICON : MOON_THEME_ICON;
  button.setAttribute("aria-label", label);
  button.setAttribute("title", label);
}

function toggleNotificationPopover(button) {
  const panel = $("notification-popover");
  if (!panel) return;
  const parentControl = button.closest(".notification-control") || document.querySelector(".topbar .notification-control");
  const isCurrentlyOpen = !panel.hidden && panel.parentElement === parentControl;
  closeAccountMenu();
  if (isCurrentlyOpen) {
    closeNotificationPopover();
  } else {
    if (parentControl && panel.parentElement !== parentControl) {
      parentControl.appendChild(panel);
    }
    panel.hidden = false;
    document.querySelectorAll("#notification-toggle, [data-dialog-notification-toggle]").forEach((btn) => {
      btn.setAttribute("aria-expanded", String(btn === button));
    });
    lastActiveNotificationToggle = button;
  }
}

function closeNotificationPopover(restoreFocus = false) {
  const panel = $("notification-popover");
  if (!panel || panel.hidden) return;
  panel.hidden = true;
  document.querySelectorAll("#notification-toggle, [data-dialog-notification-toggle]").forEach((btn) => {
    btn.setAttribute("aria-expanded", "false");
  });
  const topbarNotificationControl = document.querySelector(".topbar .notification-control");
  if (topbarNotificationControl && panel.parentElement !== topbarNotificationControl) {
    topbarNotificationControl.appendChild(panel);
  }
  if (restoreFocus && lastActiveNotificationToggle) lastActiveNotificationToggle.focus();
}

function applyTheme(value) {
  document.documentElement.dataset.theme = value;
  updateThemeToggle();
  $("menu-theme").textContent = tr(value === "dark" ? "darkTheme" : "lightTheme");
  writeJson("watchbloom-theme", value);
}

function applyLanguage(value, refresh = true) {
  language = LANGUAGE_OPTIONS.some((entry) => entry.code === value) ? value : "en";
  const selectedLanguage = LANGUAGE_OPTIONS.find((entry) => entry.code === language);
  document.documentElement.lang = selectedLanguage?.locale || "en-IN";
  document.querySelectorAll(".language-select").forEach((sel) => {
    sel.value = language;
    sel.setAttribute("aria-label", tr("displayLanguage"));
  });
  const menuLang = $("menu-language");
  if (menuLang) menuLang.textContent = selectedLanguage?.native || "English";
  if ($("menu-theme")) $("menu-theme").textContent = tr((document.documentElement.dataset.theme || "dark") === "dark" ? "darkTheme" : "lightTheme");
  updateOwnProfileUI();
  document.querySelectorAll("[data-i18n]").forEach((element) => { element.textContent = tr(element.dataset.i18n); });
  document.querySelectorAll("[data-category]").forEach((button) => { button.textContent = categoryLabel(button.dataset.category); });
  q.placeholder = tr("searchPlaceholder");
  q.setAttribute("aria-label", tr("searchLabel"));
  $("clear-search")?.setAttribute("aria-label", tr("clearSearch"));
  $("search-form")?.querySelector(".search-submit")?.setAttribute("aria-label", tr("searchButton"));
  document.querySelectorAll("[data-dialog-search-input]").forEach((input) => {
    input.placeholder = tr("searchPlaceholder");
    input.setAttribute("aria-label", tr("searchLabel"));
  });
  document.querySelectorAll("[data-dialog-clear-search]").forEach((btn) => {
    btn.setAttribute("aria-label", tr("clearSearch"));
  });
  document.querySelectorAll("[data-dialog-search-submit]").forEach((btn) => {
    btn.setAttribute("aria-label", tr("searchButton"));
  });
  updateVoiceSearchButton();
  updateThemeToggle();

  document.querySelectorAll('[data-dialog-action="create"], #header-create-btn').forEach((btn) => {
    btn.setAttribute("aria-label", tr("create"));
    btn.setAttribute("title", tr("create"));
  });
  document.querySelectorAll('[data-dialog-notification-toggle], #notification-toggle').forEach((btn) => {
    btn.setAttribute("aria-label", tr("notifications"));
    btn.setAttribute("title", tr("notifications"));
  });
  document.querySelectorAll('[data-dialog-account-toggle], #account-menu-toggle').forEach((btn) => {
    btn.setAttribute("aria-label", tr("accountMenu") + ": " + (localProfile.name.trim() || "Watchbloom"));
  });
  document.querySelectorAll('[data-player-action="back"], .dialog-back-btn').forEach((btn) => {
    btn.setAttribute("aria-label", tr("back"));
    btn.setAttribute("title", tr("back"));
  });
  document.querySelectorAll(".dialog-close").forEach((btn) => {
    btn.setAttribute("aria-label", tr("close"));
  });
  document.querySelector("[data-notification-close]")?.setAttribute("aria-label", tr("closeNotifications"));
  const moreBtn = $("more");
  if (moreBtn) moreBtn.textContent = tr("showMore");
  updateViewCopy();
  showRecent();
  refreshOpenDialogsOnLanguageChange();
  if (refresh) render(q.value, false);
  writeJson("watchbloom-language", language);
}

function restoreUrl() {
  const params = new URLSearchParams(location.hash.slice(1));
  const sharedReel = params.get("reel");
  if (sharedReel && /^[A-Za-z0-9_-]+$/.test(sharedReel)) pendingReelId = sharedReel;
  const sharedVideo = params.get("v") || params.get("video");
  if (sharedVideo && /^[A-Za-z0-9_-]+$/.test(sharedVideo)) pendingVideoId = sharedVideo;
  const sharedChannel = params.get("channel");
  if (sharedChannel) {
    pendingChannelAuthor = sharedChannel;
    pendingChannelTab = params.get("tab") || "home";
  }
  const sharedPanel = params.get("panel");
  if (sharedPanel) pendingPanelAction = sharedPanel;
  const query = params.get("q");
  const view = params.get("view");
  const sort = params.get("sort");
  const durationValue = params.get("duration");
  const uploaded = params.get("uploaded");
  const category = params.get("category");
  if (query) q.value = query;
  if (view === "shorts") activeView = "reels";
  else if (VIEWS.includes(view)) activeView = view;
  activeNavView = activeView;
  if (activeView === "trending") $("sort").value = "popularity";
  else if (SORTS.includes(sort)) $("sort").value = sort;
  if (["all", "under3", "3to20", "over20"].includes(durationValue)) $("duration").value = durationValue;
  if (["any", "today", "week", "month", "year"].includes(uploaded)) $("uploaded").value = uploaded;
  if (DISCOVER_VIEWS[activeView]) {
    activeCategory = DISCOVER_VIEWS[activeView].category;
  } else if (activeView === "home" || !view) {
    activeCategory = "all";
  } else if (CATEGORY_KEYS.includes(category)) {
    activeCategory = category;
  } else {
    activeCategory = "all";
  }
}

q.addEventListener("input", () => {
  clearTimeout(searchTimer);
  $("clear-search").hidden = !q.value;
  searchTimer = setTimeout(() => { showSuggestions(); render(q.value, false); syncUrl(); }, 180);
});
q.addEventListener("focus", () => { if (q.value.trim()) showSuggestions(); });
q.addEventListener("keydown", (event) => {
  if (event.key === "ArrowDown" && suggestionItems.length) { event.preventDefault(); markSuggestion((activeSuggestion + 1) % suggestionItems.length); }
  else if (event.key === "ArrowUp" && suggestionItems.length) { event.preventDefault(); markSuggestion((activeSuggestion - 1 + suggestionItems.length) % suggestionItems.length); }
  else if (event.key === "Escape") closeSuggestions();
  else if (event.key === "Enter" && activeSuggestion >= 0) { event.preventDefault(); go(suggestionItems[activeSuggestion].text); }
});
$("search-form").addEventListener("submit", (event) => { event.preventDefault(); go(q.value); });
document.addEventListener("submit", (event) => {
  const dialogForm = event.target.closest("[data-dialog-search-form]");
  if (dialogForm) {
    event.preventDefault();
    const input = dialogForm.querySelector("[data-dialog-search-input]");
    const val = input ? input.value.trim() : "";
    go(val);
    return;
  }
  const goLiveForm = event.target.closest("#golive-setup-form");
  if (goLiveForm) {
    event.preventDefault();
    const isGuestLive = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
    const title = $("golive-title")?.value.trim() || (isGuestLive ? "Watchbloom Live Stream" : (localProfile.name + " · Live Stream"));
    const desc = $("golive-desc")?.value.trim() || "";
    const category = $("golive-category")?.value || "entertainment";
    const privacy = $("golive-privacy")?.value || "public";
    const superChat = $("golive-superchat-toggle")?.checked ?? true;
    startLiveBroadcastAction({ title, desc, category, privacy, superChat });
    return;
  }
  const goLiveChatForm = event.target.closest("#golive-chat-form");
  if (goLiveChatForm) {
    event.preventDefault();
    const input = $("golive-chat-input");
    const text = (input?.value || "").trim();
    if (text) {
      const isGuestChat = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
      const chatAuthor = isGuestChat ? "Host" : (localProfile.name || "Host");
      input.value = "";

      const streamId = currentActiveLiveId || (detailItem && detailItem.id);
      if (streamId) {
        fetch("/api/v1/live/" + encodeURIComponent(streamId) + "/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            text: text,
            author: chatAuthor,
            is_host: Boolean(isLiveBroadcasting)
          })
        }).catch(() => {
          appendLiveChatMessage(chatAuthor, text, Boolean(isLiveBroadcasting));
        });
      } else {
        appendLiveChatMessage(chatAuthor, text, Boolean(isLiveBroadcasting));
      }
    }
    return;
  }
});
initializeVoiceSearch();
$("clear-search").addEventListener("click", () => { q.value = ""; closeSuggestions(); render("", false); q.focus(); syncUrl(); });
suggestions.addEventListener("mousedown", (event) => {
  const row = event.target.closest("[data-suggestion]");
  if (row) { event.preventDefault(); go(suggestionItems[Number(row.dataset.suggestion)].text); }
});
document.addEventListener("mousedown", (event) => {
  const row = event.target.closest("[data-dialog-suggestion]");
  if (row) {
    event.preventDefault();
    const index = Number(row.dataset.dialogSuggestion);
    if (dialogSuggestionItems[index]) {
      go(dialogSuggestionItems[index].text);
    }
  }
});
document.addEventListener("input", (event) => {
  if (event.target.matches("[data-dialog-search-input]")) {
    const input = event.target;
    const wrap = input.closest(".dialog-search-wrap");
    const clearBtn = wrap?.querySelector("[data-dialog-clear-search]");
    if (clearBtn) clearBtn.hidden = !input.value;
    clearTimeout(dialogSearchTimer);
    dialogSearchTimer = setTimeout(() => {
      showDialogSuggestions(input);
    }, 180);
  }
});
document.addEventListener("click", (event) => {
  const clearBtn = event.target.closest("[data-dialog-clear-search]");
  if (clearBtn) {
    event.preventDefault();
    const wrap = clearBtn.closest(".dialog-search-wrap");
    const input = wrap?.querySelector("[data-dialog-search-input]");
    if (input) {
      input.value = "";
      clearBtn.hidden = true;
      closeDialogSuggestions();
      input.focus();
    }
    return;
  }
  const voiceBtn = event.target.closest("[data-dialog-voice-search]");
  if (voiceBtn) {
    event.preventDefault();
    toggleVoiceSearch();
    return;
  }
  if (!event.target.closest(".search-wrap")) closeSuggestions();
  if (!event.target.closest(".dialog-search-wrap")) closeDialogSuggestions();
  if (!event.target.closest(".bell-control")) closeBellMenus();
});
document.addEventListener("focusin", (event) => {
  if (event.target.matches("[data-dialog-search-input]")) {
    if (event.target.value.trim()) showDialogSuggestions(event.target);
  }
  if (!event.target.closest(".bell-control")) closeBellMenus();
});
document.addEventListener("keydown", (event) => {
  if (event.target.matches("[data-dialog-search-input]")) {
    const input = event.target;
    const wrap = input.closest(".dialog-search-wrap");
    if (event.key === "ArrowDown" && dialogSuggestionItems.length) {
      event.preventDefault();
      markDialogSuggestion(wrap, (activeDialogSuggestion + 1) % dialogSuggestionItems.length);
    } else if (event.key === "ArrowUp" && dialogSuggestionItems.length) {
      event.preventDefault();
      markDialogSuggestion(wrap, (activeDialogSuggestion - 1 + dialogSuggestionItems.length) % dialogSuggestionItems.length);
    } else if (event.key === "Escape") {
      closeDialogSuggestions();
    } else if (event.key === "Enter" && activeDialogSuggestion >= 0) {
      event.preventDefault();
      const chosen = dialogSuggestionItems[activeDialogSuggestion];
      if (chosen) go(chosen.text);
    }
    return;
  }
  const menu = event.target.closest?.(".bell-menu");
  if (!menu) return;
  if (event.key === "Escape") {
    event.preventDefault();
    const trigger = menu.closest(".bell-control")?.querySelector("[data-alert-menu]");
    closeBellMenus();
    trigger?.focus();
    return;
  }
  if (!["ArrowDown", "ArrowRight", "ArrowUp", "ArrowLeft"].includes(event.key)) return;
  const options = Array.from(menu.querySelectorAll('[role="radio"]'));
  const currentIndex = options.indexOf(document.activeElement);
  if (!options.length) return;
  event.preventDefault();
  const forward = event.key === "ArrowDown" || event.key === "ArrowRight";
  const nextIndex = (currentIndex + (forward ? 1 : -1) + options.length) % options.length;
  options[nextIndex].focus();
});
document.querySelectorAll("[data-view]").forEach((button) => button.addEventListener("click", () => setView(button.dataset.view)));
document.querySelectorAll("[data-action]").forEach((button) => button.addEventListener("click", () => {
  if (button.dataset.action === "account") {
    if (localProfile.isGuest) {
      showFollowToast("Please sign in or create an account to access your account profile.");
      openAuthModal("signin");
    } else {
      openProfileEditor();
    }
  }
  else if (button.dataset.action === "my-channel") openMyChannel();
  else if (button.dataset.action === "studio") openCreatorStudio();
  else if (button.dataset.action === "my-videos") openManageVideosModal();
  else if (button.dataset.action === "upload") openUploadModal();
  else if (button.dataset.action === "live") openGoLiveStudio();
  else if (button.dataset.action === "create") {
    if (localProfile.isGuest) {
      showFollowToast("Please sign in or create an account to create content.");
      openAuthModal("signin");
    } else {
      openCreatorPanel("create");
    }
  }
  else openCreatorPanel(button.dataset.action);
}));
$("creator-dialog-content").addEventListener("click", (event) => {
  // Channel Video Playback Click Handler
  const channelOpenBtn = event.target.closest("[data-open]");
  if (channelOpenBtn) {
    event.preventDefault();
    event.stopPropagation();
    const vidId = channelOpenBtn.dataset.open;
    if (vidId) {
      let v = visibleItems.get(vidId) || loadUploadedVideos().find((item) => item.id === vidId) || (studioCachedVideos || []).find((item) => item.id === vidId);
      if (v) {
        if (!v.media_url || v.media_url.startsWith("blob:")) {
          v.media_url = "/api/media/" + encodeURIComponent(v.id);
        }
        visibleItems.set(vidId, v);
      }
      $("creator-dialog")?.close();
      openDetails(vidId, false, true);
    }
    return;
  }

  // Fallback: Click anywhere on a channel video card (excluding save/follow buttons)
  const channelCardEl = event.target.closest(".channel-content .media-card");
  if (channelCardEl && !event.target.closest("[data-save], [data-follow], .creator-follow-btn")) {
    const openTarget = channelCardEl.querySelector("[data-open]");
    if (openTarget) {
      event.preventDefault();
      event.stopPropagation();
      const vidId = openTarget.dataset.open;
      if (vidId) {
        let v = visibleItems.get(vidId) || loadUploadedVideos().find((item) => item.id === vidId);
        if (v) {
          if (!v.media_url || v.media_url.startsWith("blob:")) {
            v.media_url = "/api/media/" + encodeURIComponent(v.id);
          }
          visibleItems.set(vidId, v);
        }
        $("creator-dialog")?.close();
        openDetails(vidId, false, true);
      }
      return;
    }
  }

  // Play reel click handler
  const channelPlayReel = event.target.closest("[data-play-reel]");
  if (channelPlayReel) {
    event.preventDefault();
    event.stopPropagation();
    const rId = channelPlayReel.dataset.playReel;
    if (rId) {
      let v = visibleItems.get(rId) || loadUploadedVideos().find((item) => item.id === rId);
      if (v) {
        if (!v.media_url || v.media_url.startsWith("blob:")) {
          v.media_url = "/api/media/" + encodeURIComponent(v.id);
        }
        visibleItems.set(rId, v);
      }
      $("creator-dialog")?.close();
      openDetails(rId, false, true);
    }
    return;
  }

  // Save video click handler
  const channelSaveBtn = event.target.closest("[data-save]");
  if (channelSaveBtn) {
    event.preventDefault();
    event.stopPropagation();
    toggleSaved(channelSaveBtn.dataset.save);
    return;
  }

  // Go live action button from empty live tab
  if (event.target.closest('[data-action="live"]')) {
    event.preventDefault();
    event.stopPropagation();
    openGoLiveStudio();
    return;
  }

  // Create reel action button from empty reels tab
  if (event.target.closest("[data-channel-create-reel]")) {
    event.preventDefault();
    event.stopPropagation();
    pendingUploadFormat = "reel";
    openUploadModal();
    return;
  }

  if (event.target.closest('[data-player-action="back"], .dialog-back-btn')) {
    event.preventDefault();
    event.stopPropagation();
    handleWindowBack();
    return;
  }
  if (event.target.closest('[data-player-action="toggle-navigation"]')) { toggleNavigation(); return; }
  if (event.target.closest('[data-player-action="home"]')) {
    $("creator-dialog").close();
    q.value = "";
    $("clear-search").hidden = true;
    closeSuggestions();
    $("sort").value = "relevance";
    $("duration").value = "all";
    $("uploaded").value = "any";
    setCategory("all");
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (event.target.closest("[data-creator-dismiss], .creator-close, .dialog-close")) { $("creator-dialog").close(); return; }
  if (event.target.closest("[data-open-my-channel]")) { event.preventDefault(); event.stopPropagation(); openMyChannel(); return; }
  if (event.target.closest("[data-channel-studio]")) { event.preventDefault(); event.stopPropagation(); openCreatorStudio(); return; }
  if (event.target.closest("[data-channel-customise]")) { event.preventDefault(); event.stopPropagation(); openProfileEditor(); return; }
  if (event.target.closest("[data-channel-manage]")) { event.preventDefault(); event.stopPropagation(); openManageVideosModal(); return; }
  if (event.target.closest("[data-channel-upload]")) { event.preventDefault(); event.stopPropagation(); openUploadModal(); return; }
  if (event.target.closest("[data-banner-change]")) { event.preventDefault(); event.stopPropagation(); $("channel-banner-file")?.click(); return; }

  // Go Live Studio actions
  if (event.target.closest("[data-golive-virtual-toggle]")) {
    event.preventDefault();
    event.stopPropagation();
    const vid = $("golive-active-video") || $("golive-preview-video");
    if (vid) {
      if (liveVirtualModeActive) {
        requestCameraPreview();
      } else {
        startVirtualStudioFeed(vid);
      }
    }
    return;
  }
  if (event.target.closest("[data-golive-retry-cam]")) {
    event.preventDefault();
    event.stopPropagation();
    requestCameraPreview();
    return;
  }
  if (event.target.closest("[data-golive-use-virtual]")) {
    event.preventDefault();
    event.stopPropagation();
    const vid = $("golive-preview-video");
    if (vid) startVirtualStudioFeed(vid);
    return;
  }
  if (event.target.closest("[data-golive-toggle-cam]")) {
    event.preventDefault();
    event.stopPropagation();
    toggleLiveCam();
    return;
  }
  if (event.target.closest("[data-golive-toggle-mic]")) {
    event.preventDefault();
    event.stopPropagation();
    toggleLiveMic();
    return;
  }
  if (event.target.closest("[data-golive-toggle-screenshare]")) {
    event.preventDefault();
    event.stopPropagation();
    toggleLiveScreenShare();
    return;
  }
  if (event.target.closest("[data-golive-like]")) {
    event.preventDefault();
    event.stopPropagation();
    handleLiveStreamLike();
    return;
  }
  if (event.target.closest("[data-golive-end]")) {
    event.preventDefault();
    event.stopPropagation();
    endLiveBroadcastAction();
    return;
  }

  const studioTabBtn = event.target.closest("[data-studio-tab]");
  if (studioTabBtn) {
    event.preventDefault();
    event.stopPropagation();
    currentStudioTab = studioTabBtn.dataset.studioTab;
    renderStudioView(studioCachedVideos);
    return;
  }

  const studioFilterBtn = event.target.closest("[data-studio-filter]");
  if (studioFilterBtn) {
    event.preventDefault();
    event.stopPropagation();
    currentStudioContentFilter = studioFilterBtn.dataset.studioFilter;
    renderStudioView(studioCachedVideos);
    return;
  }

  const studioPlayBtn = event.target.closest("[data-studio-play]");
  if (studioPlayBtn) {
    event.preventDefault();
    event.stopPropagation();
    const playId = studioPlayBtn.dataset.studioPlay;
    if (!playId) return;
    const v = (studioCachedVideos || []).find((item) => item.id === playId) || loadUploadedVideos().find((item) => item.id === playId);
    if (v) {
      if (!v.media_url || v.media_url.startsWith("blob:")) {
        v.media_url = "/api/media/" + encodeURIComponent(v.id);
      }
      visibleItems.set(playId, v);
    }
    $("creator-dialog")?.close();
    openDetails(playId, false, true);
    return;
  }

  const studioCommentsBtn = event.target.closest("[data-studio-comments]");
  if (studioCommentsBtn) {
    event.preventDefault();
    event.stopPropagation();
    const commId = studioCommentsBtn.dataset.studioComments;
    if (!commId) return;
    const v = (studioCachedVideos || []).find((item) => item.id === commId) || loadUploadedVideos().find((item) => item.id === commId);
    if (v) {
      if (!v.media_url || v.media_url.startsWith("blob:")) {
        v.media_url = "/api/media/" + encodeURIComponent(v.id);
      }
      visibleItems.set(commId, v);
    }
    $("creator-dialog")?.close();
    openDetails(commId, false, false);
    setTimeout(() => {
      const section = $("video-comments");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector("textarea")?.focus({ preventScroll: true });
    }, 280);
    return;
  }

  const studioDeleteBtn = event.target.closest("[data-studio-delete]");
  if (studioDeleteBtn) {
    event.preventDefault();
    event.stopPropagation();
    const id = studioDeleteBtn.dataset.studioDelete;
    showStudioDeleteConfirmModal(id);
    return;
  }

  if (event.target.closest("#golive-share-post-btn")) {
    event.preventDefault();
    event.stopPropagation();
    if (!currentEndedLiveId && !latestRecordedLiveBlob && !latestRecordedLiveUrl) {
      showFollowToast("Please wait for your live stream to finish before publishing as a post.");
      return;
    }
    const isGuestLivePost = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
    const currentTitle = currentLiveBroadcastMeta?.title || $("golive-title")?.value?.trim() || (isGuestLivePost ? "Watchbloom Live Stream" : (localProfile.name + " · Live Stream"));
    const currentDesc = currentLiveBroadcastMeta?.desc || $("golive-desc")?.value?.trim() || "";
    const currentCategory = currentLiveBroadcastMeta?.category || $("golive-category")?.value || "entertainment";
    const liveVidId = currentEndedLiveId || (liveStreamStartTime ? ("v_live_" + liveStreamStartTime) : ("v_live_" + Date.now()));
    openShareLivePostModal({
      videoId: liveVidId,
      blobUrl: latestRecordedLiveUrl,
      blob: latestRecordedLiveBlob,
      title: currentTitle,
      desc: currentDesc,
      category: currentCategory,
      isLive: false
    });
    return;
  }

  const studioSharePostBtn = event.target.closest("[data-studio-share], [data-studio-share-post]");
  if (studioSharePostBtn) {
    event.preventDefault();
    event.stopPropagation();
    const vidId = studioSharePostBtn.dataset.studioShare || studioSharePostBtn.dataset.studioSharePost;
    const v = (studioCachedVideos || []).find((item) => item.id === vidId) || visibleItems.get(vidId) || loadUploadedVideos().find((item) => item.id === vidId);
    if (v) {
      openShareLivePostModal({
        videoId: v.id,
        title: v.title,
        desc: v.description,
        category: v.category,
        art: v.art,
        isLive: false
      });
    } else if (vidId) {
      shareVideo(studioSharePostBtn, vidId);
    }
    return;
  }

  if (event.target.closest("[data-studio-start-live]")) {
    event.preventDefault();
    event.stopPropagation();
    openGoLiveStudio();
    return;
  }

  const quickPostBtn = event.target.closest("#community-quick-post-btn");
  if (quickPostBtn) {
    event.preventDefault();
    event.stopPropagation();
    const inp = $("community-quick-post-input");
    const val = (inp?.value || "").trim();
    if (val) {
      const isGuestCommPost = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
      const commAuthor = isGuestCommPost ? "Watchbloom Creator" : localProfile.name.trim();
      const commHandle = isGuestCommPost ? "@creator" : (localProfile.handle || "@" + channelSlug(commAuthor));
      saveCommunityPost({
        id: "post_" + Date.now(),
        author: commAuthor,
        handle: commHandle,
        photo: isGuestCommPost ? null : localProfile.photo,
        text: val,
        createdAt: new Date().toISOString(),
        likes: 0,
        streamMeta: null
      });
      inp.value = "";
      showFollowToast("Post published to your channel community!");
      if (currentStudioTab === "community") {
        renderStudioView(studioCachedVideos);
      } else {
        const dialog = $("creator-dialog");
        if (dialog) renderCreatorChannelItems(dialog, "community");
      }
    }
    return;
  }

  const postLikeBtn = event.target.closest("[data-post-like]");
  if (postLikeBtn) {
    event.preventDefault();
    event.stopPropagation();
    const pid = postLikeBtn.dataset.postLike;
    const posts = loadCommunityPosts();
    const p = posts.find((x) => x.id === pid);
    if (p) {
      p.likes = (p.likes || 0) + 1;
      saveCommunityPost(p);
      postLikeBtn.textContent = "👍 " + p.likes;
      postLikeBtn.classList.add("view-bump");
      setTimeout(() => postLikeBtn.classList.remove("view-bump"), 500);
    }
    return;
  }

  const postShareBtn = event.target.closest("[data-post-share]");
  if (postShareBtn) {
    event.preventDefault();
    event.stopPropagation();
    const pid = postShareBtn.dataset.postShare;
    const p = loadCommunityPosts().find((x) => x.id === pid);
    if (p) {
      const shareUrl = window.location.origin + "/?view=community&post=" + p.id;
      if (navigator.clipboard) {
        navigator.clipboard.writeText(p.text + "\n" + shareUrl).then(() => {
          showFollowToast("Community post link copied to clipboard!");
        });
      } else {
        showFollowToast("Link copied!");
      }
    }
    return;
  }

  const postDeleteBtn = event.target.closest("[data-post-delete]");
  if (postDeleteBtn) {
    event.preventDefault();
    event.stopPropagation();
    if (confirm("Are you sure you want to delete this community post?")) {
      const pid = postDeleteBtn.dataset.postDelete;
      deleteCommunityPost(pid);
      showFollowToast("Post deleted.");
      if (currentStudioTab === "community") {
        renderStudioView(studioCachedVideos);
      } else {
        const dialog = $("creator-dialog");
        if (dialog) renderCreatorChannelItems(dialog, "community");
      }
    }
    return;
  }

  const postStreamEmbed = event.target.closest(".community-post-stream-embed");
  if (postStreamEmbed) {
    event.preventDefault();
    event.stopPropagation();
    const vidId = postStreamEmbed.dataset.postStreamId;
    const isLive = postStreamEmbed.dataset.isLive === "true" && isLiveBroadcasting;
    if (isLive) {
      openGoLiveStudio();
    } else if (vidId) {
      openDetails(vidId);
    } else {
      const title = postStreamEmbed.querySelector(".community-stream-title")?.textContent || "Live Stream Replay";
      const titleLower = title.toLowerCase();
      const uploaded = loadUploadedVideos();
      const match = uploaded.find((v) => v.title === title || (v.title && v.title.includes(title))) ||
                    Array.from(visibleItems.values()).find((v) => v.title === title || (v.title && v.title.includes(title)));
      if (match) {
        openDetails(match.id);
      } else if (titleLower.includes("vfx") || titleLower.includes("blender") || titleLower.includes("unreal")) {
        openDetails("v_live_1792487105156");
      } else if (titleLower.includes("build") || titleLower.includes("app") || titleLower.includes("code")) {
        openDetails("v_live_1792488157981");
      } else if (titleLower.includes("loki")) {
        openDetails("v_live_1792492149621");
      } else if (titleLower.includes("story")) {
        openDetails("v_live_1792494296797");
      } else {
        openDetails("v_live_1792487105156");
      }
    }
    return;
  }

  if (event.target.closest("[data-studio-upload]")) {
    event.preventDefault();
    event.stopPropagation();
    openUploadModal();
    return;
  }

  if (event.target.closest("[data-studio-create-reel]")) {
    event.preventDefault();
    event.stopPropagation();
    pendingUploadFormat = "reel";
    openUploadModal();
    return;
  }

  const analyticsPeriodBtn = event.target.closest("[data-analytics-period]");
  if (analyticsPeriodBtn) {
    event.preventDefault();
    event.stopPropagation();
    currentStudioAnalyticsPeriod = analyticsPeriodBtn.dataset.analyticsPeriod;
    renderStudioView(studioCachedVideos);
    return;
  }

  const earnTabBtn = event.target.closest("[data-earn-tab]");
  if (earnTabBtn) {
    event.preventDefault();
    event.stopPropagation();
    currentStudioEarnTab = earnTabBtn.dataset.earnTab;
    renderStudioView(studioCachedVideos);
    return;
  }

  const commFilterBtn = event.target.closest("[data-community-filter]");
  if (commFilterBtn) {
    event.preventDefault();
    event.stopPropagation();
    currentStudioCommunityFilter = commFilterBtn.dataset.communityFilter;
    renderStudioView(studioCachedVideos);
    return;
  }

  const replyToggle = event.target.closest("[data-community-reply-toggle]");
  if (replyToggle) {
    event.preventDefault();
    event.stopPropagation();
    const box = document.getElementById("reply-box-" + replyToggle.dataset.communityReplyToggle);
    if (box) box.hidden = !box.hidden;
    return;
  }

  const replyCancel = event.target.closest("[data-community-reply-cancel]");
  if (replyCancel) {
    event.preventDefault();
    event.stopPropagation();
    const box = document.getElementById("reply-box-" + replyCancel.dataset.communityReplyCancel);
    if (box) box.hidden = true;
    return;
  }

  const replySubmit = event.target.closest("[data-community-reply-submit]");
  if (replySubmit) {
    event.preventDefault();
    event.stopPropagation();
    const commId = replySubmit.dataset.communityReplySubmit;
    const input = document.getElementById("reply-input-" + commId);
    const text = (input?.value || "").trim();
    if (!text) return;
    
    const isGuestReplier = !localProfile.name || localProfile.name.trim() === "Guest" || localProfile.isGuest;
    const replierName = isGuestReplier ? "Watchbloom Creator" : localProfile.name.trim();

    const allComments = readJson("watchbloom-comments", {});
    let found = false;
    for (const [vid, list] of Object.entries(allComments)) {
      const targetComment = list.find((c) => c.id === commId);
      if (targetComment) {
        targetComment.replies = targetComment.replies || [];
        targetComment.replies.push({
          author: replierName,
          text: text,
          createdAt: new Date().toISOString()
        });
        found = true;
        break;
      }
    }
    if (!found) {
      const vidId = replySubmit.dataset.commentItemId || studioCachedVideos[0]?.id || "v_up_1792388382764";
      const existingList = Array.isArray(allComments[vidId]) ? allComments[vidId] : [];
      existingList.push({
        id: commId,
        author: "CyberVFX_Pro",
        ownerId: "other_user_1",
        text: "The cyberpunk neon atmosphere and camera pans look stunning!",
        createdAt: new Date().toISOString(),
        likes: 15,
        replies: [{ author: replierName, text: text, createdAt: new Date().toISOString() }]
      });
      allComments[vidId] = existingList;
    }
    writeJson("watchbloom-comments", allComments);
    showFollowToast("Reply posted!");
    renderStudioView(studioCachedVideos);
    return;
  }

  const commDelete = event.target.closest("[data-community-delete]");
  if (commDelete) {
    event.preventDefault();
    event.stopPropagation();
    const commId = commDelete.dataset.communityDelete;
    const allComments = readJson("watchbloom-comments", {});
    for (const [vid, list] of Object.entries(allComments)) {
      const idx = list.findIndex((c) => c.id === commId);
      if (idx !== -1) {
        list.splice(idx, 1);
        break;
      }
    }
    writeJson("watchbloom-comments", allComments);
    studioDeletedSampleCommentIds.add(commId);
    writeJson("watchbloom-deleted-sample-comments", Array.from(studioDeletedSampleCommentIds));
    showFollowToast("Comment deleted.");
    renderStudioView(studioCachedVideos);
    return;
  }

  const commLike = event.target.closest("[data-community-like]");
  if (commLike) {
    event.preventDefault();
    event.stopPropagation();
    const commId = commLike.dataset.communityLike;
    const allComments = readJson("watchbloom-comments", {});
    for (const [vid, list] of Object.entries(allComments)) {
      const targetComment = list.find((c) => c.id === commId);
      if (targetComment) {
        targetComment.likes = (targetComment.likes || 0) + 1;
        break;
      }
    }
    writeJson("watchbloom-comments", allComments);
    renderStudioView(studioCachedVideos);
    return;
  }

  if (event.target.closest("[data-studio-customise-save]")) {
    event.preventDefault();
    event.stopPropagation();
    const nameInput = $("studio-name-input");
    const handleInput = $("studio-handle-input");
    const bioInput = $("studio-bio-input");

    const enteredName = (nameInput?.value || "").trim().slice(0, 40);
    let rawHandle = (handleInput?.value || "").trim().slice(0, 40);
    const newBio = (bioInput?.value || "").trim().slice(0, 200);

    const isGuestNow = !enteredName && localProfile.isGuest;
    const newName = enteredName || (isGuestNow ? "Guest" : (localProfile.name || "Guest"));
    let newHandle = "";
    if (rawHandle) {
      newHandle = rawHandle.startsWith("@") ? rawHandle : "@" + rawHandle;
    } else if (enteredName) {
      newHandle = "@" + channelSlug(enteredName);
    } else {
      newHandle = isGuestNow ? "@guest" : (localProfile.handle || "@" + channelSlug(newName));
    }

    localProfile.isGuest = isGuestNow;
    localProfile.name = newName;
    localProfile.handle = newHandle;
    localProfile.bio = newBio;
    writeJson("watchbloom-local-profile", localProfile);

    // Sync input fields in case formatting changed
    if (nameInput) nameInput.value = newName;
    if (handleInput) handleInput.value = newHandle;
    if (bioInput) bioInput.value = newBio;

    // Invalidate creator catalog & channel caches
    creatorChannelCache.clear();
    updateOwnProfileUI();

    // Immediately update sidebar channel card in Studio
    const sidebarAvatar = document.querySelector(".studio-sidebar .studio-channel-avatar");
    if (sidebarAvatar) {
      sidebarAvatar.innerHTML = localProfile.photo
        ? '<img src="' + esc(localProfile.photo) + '" alt="">'
        : esc(initials(newName));
    }
    const sidebarName = document.querySelector(".studio-sidebar .studio-channel-name");
    if (sidebarName) sidebarName.textContent = newName;
    const sidebarHandle = document.querySelector(".studio-sidebar .studio-channel-handle");
    if (sidebarHandle) sidebarHandle.textContent = newHandle;

    // Show button feedback
    document.querySelectorAll("[data-studio-customise-save]").forEach((btn) => {
      btn.classList.add("btn-saved");
      const origText = btn.dataset.origText || btn.textContent;
      btn.dataset.origText = origText;
      btn.textContent = "✓ " + (tr("savedFeedback") || "Saved!");
      setTimeout(() => {
        btn.classList.remove("btn-saved");
        btn.textContent = btn.dataset.origText || esc(tr("saveStudioProfile"));
      }, 2500);
    });

    // Show prominent banner inside customisation form
    const statusBox = $("studio-save-status");
    if (statusBox) {
      statusBox.innerHTML = '<div class="customise-success-banner" role="status">' +
        '<span class="success-icon">✓</span>' +
        '<div>' +
          '<strong>' + esc(tr("studioProfileSaved") || "Channel customisation saved successfully!") + '</strong>' +
          '<p>' + esc(tr("studioProfileSavedSub") || "Your channel name, handle, and bio are saved and updated across Watchbloom.") + '</p>' +
        '</div>' +
      '</div>';
    }

    showFollowToast(tr("studioProfileSaved") || "Channel customisation saved successfully!");
    return;
  }

  if (event.target.closest("[data-studio-banner-change]")) {
    event.preventDefault();
    event.stopPropagation();
    $("studio-banner-file")?.click();
    return;
  }

  if (event.target.closest("[data-studio-avatar-change]")) {
    event.preventDefault();
    event.stopPropagation();
    $("studio-avatar-file")?.click();
    return;
  }

  const formatBtn = event.target.closest("[data-upload-format]");
  if (formatBtn) {
    document.querySelectorAll(".upload-format-btn").forEach((b) => b.classList.remove("active"));
    formatBtn.classList.add("active");
    pendingUploadFormat = formatBtn.dataset.uploadFormat;
    return;
  }
  if (event.target.closest("#upload-dropzone")) { $("upload-file-input")?.click(); return; }
  if (event.target.closest("#upload-submit-btn")) { handleVideoUploadSubmit(); return; }

  const playBtn = event.target.closest("[data-manage-play]");
  if (playBtn) { openDetails(playBtn.dataset.managePlay); return; }
  const delBtn = event.target.closest("[data-manage-delete]");
  if (delBtn) {
    event.preventDefault();
    event.stopPropagation();
    showStudioDeleteConfirmModal(delBtn.dataset.manageDelete);
    return;
  }

  const channelLink = event.target.closest("[data-open-channel]");
  if (channelLink) { event.preventDefault(); event.stopPropagation(); openCreatorChannel(channelLink.dataset.openChannel); return; }
  const channelTab = event.target.closest(".channel-tab[data-channel-tab]");
  if (channelTab) { event.preventDefault(); event.stopPropagation(); openCreatorChannel($("creator-dialog").dataset.channelAuthor, channelTab.dataset.channelTab); return; }
  const follow = event.target.closest("[data-follow]");
  if (follow) { toggleCreatorFollow(follow.dataset.follow, follow.dataset.author); return; }
  if (handleCreatorControlClick(event)) return;
  if (event.target.closest("[data-profile-image]")) { $("profile-photo-file")?.click(); return; }
  if (event.target.closest("[data-profile-clear]")) { pendingProfilePhoto = ""; updateProfilePreview(); return; }
  if (event.target.closest("[data-profile-save]")) {
    const enteredName = ($("profile-name-input")?.value || "").trim().slice(0, 40);
    const enteredBio = ($("profile-bio-input")?.value || "").trim().slice(0, 200);
    const enteredEmail = ($("profile-email-input")?.value || "").trim().slice(0, 120);
    const enteredMobile = ($("profile-mobile-input")?.value || "").trim().slice(0, 30);
    const isGuest = !enteredName;
    localProfile = {
      isGuest: isGuest,
      id: localProfile.id || "guest",
      name: isGuest ? "Guest" : enteredName,
      email: isGuest ? "" : (enteredEmail || localProfile.email || ""),
      mobile: isGuest ? "" : (enteredMobile || localProfile.mobile || ""),
      handle: isGuest ? "@guest" : ("@" + channelSlug(enteredName)),
      bio: enteredBio,
      photo: isGuest ? "" : (pendingProfilePhoto || localProfile.photo || ""),
      banner: isGuest ? "" : (localProfile.banner || ""),
      role: localProfile.role || "viewer",
    };
    writeJson("watchbloom-local-profile", localProfile);
    if (!isGuest) {
      fetch("/api/v1/user/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: enteredName,
          bio: enteredBio,
          email: enteredEmail,
          mobile: enteredMobile,
          photo: localProfile.photo,
          banner: localProfile.banner,
        })
      }).catch(() => {});
    }
    updateOwnProfileUI();
    $("creator-dialog").close();
    showFollowToast(tr("profileSaved"));
    return;
  }
  if (event.target.closest("[data-creator-open-shorts]")) { $("creator-dialog").close(); setView("reels"); return; }
  const next = event.target.closest("[data-creator-next]");
  if (next) {
    if (next.dataset.creatorNext === "upload") openUploadModal();
    else if (next.dataset.creatorNext === "live") openGoLiveStudio();
    else if (next.dataset.creatorNext === "signin") { $("creator-dialog")?.close(); openAuthModal("login"); }
    else if (next.dataset.creatorNext === "signup") { $("creator-dialog")?.close(); openAuthModal("register"); }
    else openCreatorPanel(next.dataset.creatorNext);
  }
});
$("creator-dialog-content").addEventListener("change", async (event) => {
  if (event.target.matches("#studio-banner-file")) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const bannerData = await processBannerImage(file);
      localProfile.banner = bannerData;
      writeJson("watchbloom-local-profile", localProfile);
      creatorChannelCache.clear();
      const preview = $("studio-banner-preview");
      if (preview) preview.style.backgroundImage = 'url("' + bannerData + '")';
      const statusBox = $("studio-save-status");
      if (statusBox) {
        statusBox.innerHTML = '<div class="customise-success-banner" role="status"><span class="success-icon">✓</span><div><strong>Channel banner updated!</strong><p>Your new banner image has been saved successfully.</p></div></div>';
      }
      showFollowToast("Channel banner updated!");
    } catch (err) {
      showFollowToast("Could not process banner image.");
    }
    event.target.value = "";
    return;
  }
  if (event.target.matches("#studio-avatar-file")) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const photoData = await processProfilePhoto(file);
      localProfile.photo = photoData;
      writeJson("watchbloom-local-profile", localProfile);
      creatorChannelCache.clear();
      updateOwnProfileUI();
      const preview = $("studio-avatar-preview");
      if (preview) preview.innerHTML = '<img src="' + photoData + '" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
      const sidebarAvatar = document.querySelector(".studio-sidebar .studio-channel-avatar");
      if (sidebarAvatar) sidebarAvatar.innerHTML = '<img src="' + photoData + '" alt="" style="width: 100%; height: 100%; border-radius: 50%; object-fit: cover;">';
      const statusBox = $("studio-save-status");
      if (statusBox) {
        statusBox.innerHTML = '<div class="customise-success-banner" role="status"><span class="success-icon">✓</span><div><strong>Profile photo updated!</strong><p>Your new profile picture has been saved successfully.</p></div></div>';
      }
      showFollowToast("Profile photo updated!");
    } catch (err) {
      showFollowToast(tr("profileImageError"));
    }
    event.target.value = "";
    return;
  }
  if (event.target.matches("#profile-photo-file")) {
    const file = event.target.files?.[0];
    if (!file) return;
    try { pendingProfilePhoto = await processProfilePhoto(file); updateProfilePreview(); }
    catch (error) { showFollowToast(tr("profileImageError")); }
    event.target.value = "";
    return;
  }
  if (event.target.matches("#channel-banner-file")) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const bannerData = await processBannerImage(file);
      localProfile.banner = bannerData;
      writeJson("watchbloom-local-profile", localProfile);
      const bannerEl = document.querySelector(".channel-banner-yt");
      if (bannerEl) {
        bannerEl.style.backgroundImage = 'url("' + bannerData + '")';
        bannerEl.style.backgroundSize = "cover";
        bannerEl.style.backgroundPosition = "center";
      }
      showFollowToast("Channel banner updated!");
    } catch (err) {
      showFollowToast("Could not process banner image.");
    }
    event.target.value = "";
    return;
  }
  if (event.target.matches("#upload-file-input")) {
    const file = event.target.files?.[0];
    if (file) {
      pendingUploadFile = file;
      const nameEl = $("upload-file-name");
      if (nameEl) nameEl.textContent = file.name + " (" + (file.size / (1024 * 1024)).toFixed(1) + " MB)";
      const titleInput = $("upload-video-title");
      if (titleInput && !titleInput.value.trim()) {
        titleInput.value = file.name.replace(/\.[^/.]+$/, "").replace(/[-_]/g, " ");
      }
    }
  }
});
$("creator-dialog-content").addEventListener("input", (event) => { if (event.target.matches("#profile-name-input")) updateProfilePreview(); });
$("creator-dialog").addEventListener("click", (event) => { if (event.target === $("creator-dialog")) $("creator-dialog").close(); });
$("creator-dialog").addEventListener("close", () => {
  stopActiveLiveStream();
  closeDialogSuggestions();
  restoreNavigationFromDialog($("creator-dialog"));
  if (!isNavigatingHistory && !isSwitchingDialog && !$("creator-dialog")?.open && !$("detail-dialog")?.open) {
    syncUrl();
    windowNavStack = [currentWindowSnapshot()];
  }
});
window.addEventListener("beforeunload", stopActiveLiveStream);
document.querySelectorAll("[data-category]").forEach((button) => button.addEventListener("click", () => {
  setView("explore", false);
  setCategory(button.dataset.category);
}));
$("sort").addEventListener("change", () => { render(q.value, false); syncUrl(); });
$("duration").addEventListener("change", () => { render(q.value, false); syncUrl(); });
$("uploaded").addEventListener("change", () => { render(q.value, false); syncUrl(); });
$("more").addEventListener("click", () => render(q.value, true));
$("recent").addEventListener("click", (event) => {
  const chip = event.target.closest("[data-recent]");
  if (chip) { go(chip.dataset.recent); return; }
  if (event.target.closest("[data-clear-recent]")) { writeJson("watchbloom-recent", []); showRecent(); }
});
async function shareReel(button) {
  const id = button.dataset.reelShare;
  const title = button.closest("[data-reel-slide]")?.querySelector(".reel-title-row h2")?.textContent?.trim() || "Watchbloom Reel";
  const params = new URLSearchParams({ view: "reels", reel: id });
  const url = location.origin + location.pathname + location.search + "#" + params.toString();

  try {
    await navigator.clipboard.writeText(url);
    const label = button.querySelector("[data-reel-share-label]");
    if (!label) return;
    const previous = label.textContent;
    label.textContent = tr("linkCopied");
    button.setAttribute("aria-label", tr("linkCopied"));
    window.setTimeout(() => {
      if (!button.isConnected) return;
      label.textContent = previous;
      button.setAttribute("aria-label", tr("share"));
    }, 1800);
  } catch (error) {
    button.title = url;
  }
}

async function shareVideo(button, videoId) {
  const item = visibleItems.get(videoId);
  const params = new URLSearchParams({ view: activeView || "home", v: videoId });
  const url = location.origin + location.pathname + "#" + params.toString();

  let copied = false;
  if (navigator.clipboard && navigator.clipboard.writeText) {
    try {
      await navigator.clipboard.writeText(url);
      copied = true;
    } catch (e) {}
  }
  if (!copied) {
    try {
      const textarea = document.createElement("textarea");
      textarea.value = url;
      textarea.style.position = "fixed";
      textarea.style.opacity = "0";
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand("copy");
      document.body.removeChild(textarea);
      copied = true;
    } catch (e) {}
  }

  const label = button.querySelector(".share-label") || button.querySelector("span") || button;
  const previous = label.textContent;
  label.textContent = "✓ " + tr("linkCopied");
  button.classList.add("copied");
  showFollowToast(tr("linkCopied"));

  window.setTimeout(() => {
    if (!button.isConnected) return;
    label.textContent = previous;
    button.classList.remove("copied");
    button.setAttribute("aria-label", tr("share"));
  }, 2000);
}

function qualityBadgeLabel(q) {
  if (!q || q === "auto") return "Auto";
  if (q === "2160p") return "4K";
  if (q === "1440p") return "2K";
  return q;
}

function qualityFullLabel(q) {
  const labels = {
    auto: "Auto",
    "2160p": "2160p (4K UHD)",
    "1440p": "1440p (2K QHD)",
    "1080p": "1080p (Full HD)",
    "720p": "720p (HD)",
    "480p": "480p (SD)",
    "360p": "360p",
    "240p": "240p",
    "144p": "144p"
  };
  return labels[q] || q;
}

function setVideoQuality(quality, showNotification = true) {
  currentVideoQuality = quality;
  try {
    localStorage.setItem("watchbloom_video_quality", quality);
  } catch (e) {}
  if (window.activeHlsPlayer) applyHlsQuality(window.activeHlsPlayer, quality);

  document.querySelectorAll("[data-video-quality]").forEach((sel) => {
    sel.value = quality;
  });
  document.querySelectorAll("[data-reel-quality]").forEach((sel) => {
    sel.value = quality;
  });
  document.querySelectorAll("[data-set-quality]").forEach((opt) => {
    const isSelected = opt.dataset.setQuality === quality;
    opt.setAttribute("aria-checked", String(isSelected));
    const checkEl = opt.querySelector(".quality-opt-check");
    if (checkEl) checkEl.textContent = isSelected ? "✓" : "";
  });

  const badgeText = qualityBadgeLabel(quality);
  document.querySelectorAll("[data-quality-badge]").forEach((badge) => {
    badge.textContent = badgeText;
  });
  document.querySelectorAll(".video-quality-badge-btn").forEach((btn) => {
    btn.dataset.quality = quality;
    btn.setAttribute("title", tr("quality") + ": " + qualityFullLabel(quality));
  });

  document.querySelectorAll("video.video-player, video.reel-video").forEach((v) => {
    v.dataset.quality = quality;
    const currentSrc = v.currentSrc || v.src || "";
    if (currentSrc && currentSrc.includes("/api/media/")) {
      const base = currentSrc.split("?")[0];
      const targetSrc = (quality && quality !== "auto") ? (base + "?quality=" + encodeURIComponent(quality)) : base;
      const urlA = new URL(currentSrc, location.href);
      const urlB = new URL(targetSrc, location.href);
      if (urlA.pathname !== urlB.pathname || urlA.search !== urlB.search) {
        const time = v.currentTime || 0;
        const paused = v.paused;
        v.src = targetSrc;
        v.addEventListener("loadedmetadata", () => {
          try {
            v.currentTime = time;
            if (!paused) v.play().catch(() => {});
          } catch (e) {}
        }, { once: true });
        v.load();
      }
    }
  });
  document.querySelectorAll(".video-shell").forEach((shell) => {
    shell.dataset.quality = quality;
  });

  if (showNotification) {
    showFollowToast("Quality: " + qualityFullLabel(quality));
  }
}
results.addEventListener("click", (event) => {
  const histFilterBtn = event.target.closest("[data-history-filter]");
  if (histFilterBtn) {
    currentHistoryFilter = histFilterBtn.dataset.historyFilter;
    render(q.value, false);
    return;
  }
  const histRemoveBtn = event.target.closest("[data-history-remove]");
  if (histRemoveBtn) {
    event.stopPropagation();
    event.preventDefault();
    const itemId = histRemoveBtn.dataset.historyRemove;
    removeWatchHistoryItem(itemId);
    render(q.value, false);
    return;
  }
  const histClearBtn = event.target.closest("#history-clear-trigger, [data-history-clear]");
  if (histClearBtn) {
    event.stopPropagation();
    event.preventDefault();
    if (confirm("Are you sure you want to clear your watch history on this browser?")) {
      clearAllWatchHistory();
      render(q.value, false);
    }
    return;
  }
  const histExploreBtn = event.target.closest("[data-history-explore]");
  if (histExploreBtn) {
    event.stopPropagation();
    event.preventDefault();
    setView("explore");
    return;
  }
  const subfilterBtn = event.target.closest("[data-liked-subfilter]");
  if (subfilterBtn) {
    activeLikedSubFilter = subfilterBtn.dataset.likedSubfilter;
    render(q.value, false);
    return;
  }
  const playAllBtn = event.target.closest('[data-liked-action="play-all"]');
  if (playAllBtn) {
    const firstId = playAllBtn.dataset.firstId;
    if (firstId) openDetails(firstId);
    return;
  }
  const shuffleBtn = event.target.closest('[data-liked-action="shuffle"]');
  if (shuffleBtn) {
    const ids = Array.from(likedIds);
    if (ids.length) {
      const randomId = ids[Math.floor(Math.random() * ids.length)];
      openDetails(randomId);
    }
    return;
  }
  if (event.target.closest("[data-create-short]")) { openCreatorPanel("short"); return; }
  const menuToggle = event.target.closest("[data-reel-menu-toggle]");
  if (menuToggle) {
    const menu = menuToggle.closest(".reel-menu-wrap")?.querySelector("[data-reel-menu]");
    if (!menu) return;
    const opening = menu.hidden;
    closeReelMenus(menu);
    if (opening) {
      const slide = menuToggle.closest("[data-reel-slide]");
      const video = slide?.querySelector("[data-reel-video]");
      const speed = menu.querySelector("[data-reel-speed]");
      if (speed && video) speed.value = String(video.playbackRate || 1);
      const qual = menu.querySelector("[data-reel-quality]");
      if (qual) qual.value = currentVideoQuality;
      positionReelMenu(menuToggle, menu);
    } else menu.hidden = true;
    menuToggle.setAttribute("aria-expanded", String(opening));
    return;
  }
  const menuAction = event.target.closest("[data-reel-menu-action]");
  if (menuAction) { handleReelMenuAction(menuAction); return; }
  const follow = event.target.closest("[data-follow]");
  if (follow) { toggleCreatorFollow(follow.dataset.follow, follow.dataset.author); return; }
  if (handleCreatorControlClick(event)) return;
  const save = event.target.closest("[data-save], [data-reel-save]");
  if (save) {
    const id = save.dataset.save || save.dataset.reelSave;
    toggleSaved(id);
    document.querySelectorAll('[data-reel-save="' + CSS.escape(id) + '"]').forEach((button) => {
      const selected = savedIds.has(id);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", selected ? tr("removeWatchLater") : tr("watchLater"));
      button.querySelector(".reel-action-icon").innerHTML = reelActionIcon(selected ? "saved" : "save");
    });
    return;
  }
  const reaction = event.target.closest('[data-reaction][data-item-id]');
  if (reaction) { setVideoReaction(reaction.dataset.itemId, reaction.dataset.reaction); return; }
  const reelComments = event.target.closest("[data-reel-comments]");
  if (reelComments) {
    openDetails(reelComments.dataset.reelComments);
    requestAnimationFrame(() => $("video-comments")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
  const shareButton = event.target.closest("[data-reel-share]");
  if (shareButton) { shareReel(shareButton); return; }
  const muteButton = event.target.closest("[data-reel-mute]");
  if (muteButton) {
    toggleReelSound(muteButton);
    return;
  }
  const playButton = event.target.closest("[data-reel-play]");
  if (playButton) {
    const video = playButton.closest("[data-reel-slide]")?.querySelector("[data-reel-video]");
    if (video) { if (video.paused) playReelVideo(video); else video.pause(); }
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) openDetails(open.dataset.open);
});
results.addEventListener("change", (event) => {
  if (!event.target.matches("[data-reel-speed]")) return;
  const slide = event.target.closest("[data-reel-slide]");
  const video = slide?.querySelector("[data-reel-video]");
  if (!video) return;
  const rate = Number(event.target.value) || 1;
  video.playbackRate = rate;
  reelPlaybackRates[slide.dataset.itemId] = rate;
  writeJson("watchbloom-reel-speeds", reelPlaybackRates);
});
$("home-shorts-see-all").addEventListener("click", () => {
  setView("reels");
  $("catalog-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("home-shorts-track").addEventListener("click", (event) => {
  if (event.target.closest("[data-create-short]")) { openCreatorPanel("short"); return; }
  if (event.target.closest("[data-retry-shorts]")) { refreshHomeShortsShelf(q.value); return; }
  const playReel = event.target.closest("[data-play-reel]");
  if (playReel) {
    pendingReelId = playReel.dataset.playReel;
    setView("reels");
    $("catalog-section").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const follow = event.target.closest("[data-follow]");
  if (follow) { toggleCreatorFollow(follow.dataset.follow, follow.dataset.author); return; }
  if (handleCreatorControlClick(event)) return;
  const save = event.target.closest("[data-reel-save]");
  if (save) {
    const id = save.dataset.reelSave;
    toggleSaved(id);
    document.querySelectorAll('[data-reel-save="' + CSS.escape(id) + '"]').forEach((button) => {
      const selected = savedIds.has(id);
      button.setAttribute("aria-pressed", String(selected));
      button.setAttribute("aria-label", selected ? tr("removeWatchLater") : tr("watchLater"));
      button.querySelector(".reel-action-icon").innerHTML = reelActionIcon(selected ? "saved" : "save");
    });
    return;
  }
  const reaction = event.target.closest('[data-reaction][data-item-id]');
  if (reaction) { setVideoReaction(reaction.dataset.itemId, reaction.dataset.reaction); return; }
  const comments = event.target.closest("[data-reel-comments]");
  if (comments) {
    openDetails(comments.dataset.reelComments);
    requestAnimationFrame(() => $("video-comments")?.scrollIntoView({ behavior: "smooth", block: "start" }));
    return;
  }
  const shareButton = event.target.closest("[data-reel-share]");
  if (shareButton) { shareReel(shareButton); return; }
  const muteButton = event.target.closest("[data-reel-mute]");
  if (muteButton) { toggleReelSound(muteButton); return; }
  const playButton = event.target.closest("[data-reel-play]");
  if (playButton) {
    const video = playButton.closest("[data-reel-slide]")?.querySelector("[data-reel-video]");
    if (video) { if (video.paused) playReelVideo(video); else video.pause(); }
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) openDetails(open.dataset.open);
});
$("trending-page").addEventListener("click", (event) => {
  if (event.target.closest("[data-trending-retry]")) { renderTrending(q.value); return; }
  const reel = event.target.closest("[data-play-reel]");
  if (reel) {
    pendingReelId = reel.dataset.playReel;
    setView("reels");
    $("catalog-section").scrollIntoView({ behavior: "smooth", block: "start" });
    return;
  }
  const save = event.target.closest("[data-save]");
  if (save) { toggleSaved(save.dataset.save); return; }
  const open = event.target.closest("[data-open]");
  if (open) openDetails(open.dataset.open);
});

// Cinema & Series Hub Event Listener
const cinemaRoot = $("cinema-page");
if (cinemaRoot) {
  cinemaRoot.addEventListener("click", (event) => {
    // 1. Theater Lights toggle
    const lightsToggle = event.target.closest("#cinema-lights-toggle");
    if (lightsToggle) {
      event.preventDefault();
      const isDim = cinemaRoot.getAttribute("data-cinema-lights") === "dim";
      if (isDim) {
        cinemaRoot.removeAttribute("data-cinema-lights");
        lightsToggle.classList.remove("active");
        lightsToggle.setAttribute("aria-pressed", "false");
        const lbl = lightsToggle.querySelector(".lights-label");
        if (lbl) lbl.textContent = "Dim Lights";
        const icon = lightsToggle.querySelector(".lights-icon");
        if (icon) icon.textContent = "💡";
        showFollowToast("Theater lights restored.");
      } else {
        cinemaRoot.setAttribute("data-cinema-lights", "dim");
        lightsToggle.classList.add("active");
        lightsToggle.setAttribute("aria-pressed", "true");
        const lbl = lightsToggle.querySelector(".lights-label");
        if (lbl) lbl.textContent = "Lights On";
        const icon = lightsToggle.querySelector(".lights-icon");
        if (icon) icon.textContent = "☀️";
        showFollowToast("VIP Theater Mode Active · Lights Dimmed 🍿");
      }
      return;
    }

    // 2. Carousel Prev/Next Buttons
    const prevBtn = event.target.closest(".cinema-carousel-prev");
    if (prevBtn) {
      event.preventDefault();
      $("cinema-edits-track")?.scrollBy({ left: -460, behavior: "smooth" });
      return;
    }
    const nextBtn = event.target.closest(".cinema-carousel-next");
    if (nextBtn) {
      event.preventDefault();
      $("cinema-edits-track")?.scrollBy({ left: 460, behavior: "smooth" });
      return;
    }

    // 3. Share Premiere
    const shareBtn = event.target.closest("[data-cinema-share]");
    if (shareBtn) {
      event.preventDefault();
      const videoId = shareBtn.dataset.cinemaShare;
      const shareUrl = window.location.origin + "/#v=" + encodeURIComponent(videoId);
      if (navigator.clipboard?.writeText) {
        navigator.clipboard.writeText(shareUrl).then(() => {
          showFollowToast("Premiere link copied to clipboard: " + shareUrl);
        }).catch(() => {
          showFollowToast("Premiere link: " + shareUrl);
        });
      } else {
        showFollowToast("Premiere link: " + shareUrl);
      }
      return;
    }

    // 4. Soundtrack Play / Stop
    const sndBtn = event.target.closest("[data-soundtrack-play]");
    if (sndBtn) {
      event.preventDefault();
      toggleCinemaSoundtrack(sndBtn.dataset.soundtrackPlay);
      return;
    }

    // 5. Upcoming Premiere Reminder
    const remindBtn = event.target.closest("[data-upcoming-remind]");
    if (remindBtn) {
      event.preventDefault();
      const upId = remindBtn.dataset.upcomingRemind;
      const upTitle = remindBtn.dataset.upcomingTitle || "Upcoming Premiere";
      const set = new Set(readJson("watchbloom-premiere-reminders", []));
      if (set.has(upId)) {
        set.delete(upId);
        remindBtn.classList.remove("is-reminded");
        remindBtn.innerHTML = "<span>🔔 Remind Me</span>";
        showFollowToast("Reminder removed for: " + upTitle);
      } else {
        set.add(upId);
        remindBtn.classList.add("is-reminded");
        remindBtn.innerHTML = "<span>✓ Reminder Set</span>";
        showFollowToast("🔔 Reminder set! You will be notified when " + upTitle + " premieres.");
      }
      writeJson("watchbloom-premiere-reminders", Array.from(set));
      return;
    }

    // 6. Save to Watchlist
    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
      event.preventDefault();
      toggleSaved(saveBtn.dataset.save);
      return;
    }

    // 7. Open details / Play
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      event.preventDefault();
      openDetails(openBtn.dataset.open, false, true);
      return;
    }
  });
}

// Courses & Academy Hub Event Listener
const coursesRoot = $("courses-page");
if (coursesRoot) {
  coursesRoot.addEventListener("click", (event) => {
    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
      event.preventDefault();
      toggleSaved(saveBtn.dataset.save);
      return;
    }
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      event.preventDefault();
      openDetails(openBtn.dataset.open, false, true);
      return;
    }
    const cardEl = event.target.closest(".media-card, .hub-card");
    if (cardEl && !event.target.closest("button, a, input")) {
      const openChild = cardEl.querySelector("[data-open]");
      if (openChild && openChild.dataset.open) {
        event.preventDefault();
        openDetails(openChild.dataset.open, false, true);
        return;
      }
    }
  });
}

// Gaming Hub Event Listener
const gamersRoot = $("gamers-page");
if (gamersRoot) {
  gamersRoot.addEventListener("click", (event) => {
    const viewAllBtn = event.target.closest(".hub-view-all, [data-view]");
    if (viewAllBtn) {
      event.preventDefault();
      setView(viewAllBtn.dataset.view || "videos");
      return;
    }
    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
      event.preventDefault();
      toggleSaved(saveBtn.dataset.save);
      return;
    }
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      event.preventDefault();
      openDetails(openBtn.dataset.open, false, true);
      return;
    }
    const cardEl = event.target.closest(".media-card, .hub-card");
    if (cardEl && !event.target.closest("button, a, input")) {
      const openChild = cardEl.querySelector("[data-open]");
      if (openChild && openChild.dataset.open) {
        event.preventDefault();
        openDetails(openChild.dataset.open, false, true);
        return;
      }
    }
  });
}

// Headlines / News Hub Event Listener
const headlinesRoot = $("headlines-page");
if (headlinesRoot) {
  headlinesRoot.addEventListener("click", (event) => {
    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
      event.preventDefault();
      toggleSaved(saveBtn.dataset.save);
      return;
    }
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      event.preventDefault();
      openDetails(openBtn.dataset.open, false, true);
      return;
    }
    const spotlightBtn = event.target.closest("#headlines-spotlight-title, .breaking-news-box");
    if (spotlightBtn && !event.target.closest("button, a, input")) {
      const openChild = spotlightBtn.querySelector("[data-open]");
      if (openChild && openChild.dataset.open) {
        event.preventDefault();
        openDetails(openChild.dataset.open, false, true);
        return;
      }
    }
    const cardEl = event.target.closest(".media-card, .hub-card");
    if (cardEl && !event.target.closest("button, a, input")) {
      const openChild = cardEl.querySelector("[data-open]");
      if (openChild && openChild.dataset.open) {
        event.preventDefault();
        openDetails(openChild.dataset.open, false, true);
        return;
      }
    }
  });
}

// Music & Beats Hub Event Listener
const musicRoot = $("music-page");
if (musicRoot) {
  musicRoot.addEventListener("click", (event) => {
    const viewAllBtn = event.target.closest(".hub-view-all, [data-view]");
    if (viewAllBtn) {
      event.preventDefault();
      setView(viewAllBtn.dataset.view || "videos");
      return;
    }
    const saveBtn = event.target.closest("[data-save]");
    if (saveBtn) {
      event.preventDefault();
      toggleSaved(saveBtn.dataset.save);
      return;
    }
    const openBtn = event.target.closest("[data-open]");
    if (openBtn) {
      event.preventDefault();
      openDetails(openBtn.dataset.open, false, true);
      return;
    }
    const cardEl = event.target.closest(".media-card, .hub-card");
    if (cardEl && !event.target.closest("button, a, input")) {
      const openChild = cardEl.querySelector("[data-open]");
      if (openChild && openChild.dataset.open) {
        event.preventDefault();
        openDetails(openChild.dataset.open, false, true);
        return;
      }
    }
  });
}

// Universal Global Click Fallback for Video Cards across all tabs
document.addEventListener("click", (event) => {
  if (event.target.closest("#creator-dialog, #detail-dialog")) return;

  const viewAllBtn = event.target.closest(".hub-view-all");
  if (viewAllBtn) {
    event.preventDefault();
    setView(viewAllBtn.dataset.view || "videos");
    return;
  }

  const openBtn = event.target.closest("[data-open]");
  if (openBtn) {
    if (!openBtn.closest("#results, #trending-page, #cinema-page, #courses-page, #gamers-page, #headlines-page, #music-page")) {
      event.preventDefault();
      const vidId = openBtn.dataset.open;
      if (vidId) {
        openDetails(vidId, false, true);
      }
      return;
    }
  }

  const cardEl = event.target.closest(".media-card, .hub-card, .shorts-shelf-card, .liked-reel-card");
  if (cardEl && !event.target.closest("button, a, input, [data-save], [data-follow]")) {
    if (!cardEl.closest("#results, #trending-page, #cinema-page, #courses-page, #gamers-page, #headlines-page, #music-page")) {
      const openChild = cardEl.querySelector("[data-open]");
      if (openChild && openChild.dataset.open) {
        event.preventDefault();
        openDetails(openChild.dataset.open, false, true);
        return;
      }
    }
  }
});

 $("dialog-content").addEventListener("click", (event) => {
  if (event.target.closest('[data-player-action="back"], .dialog-back-btn')) {
    event.preventDefault();
    event.stopPropagation();
    handleWindowBack();
    return;
  }
  if (event.target.closest('[data-player-action="toggle-navigation"]')) { toggleNavigation(); return; }
  if (event.target.closest('[data-player-action="home"]')) {
    $("detail-dialog").close();
    q.value = "";
    $("clear-search").hidden = true;
    closeSuggestions();
    $("sort").value = "relevance";
    $("duration").value = "all";
    $("uploaded").value = "any";
    setCategory("all");
    setView("home");
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }
  if (event.target.closest(".dialog-close")) { $("detail-dialog").close(); return; }
  const settingsPanel = $("dialog-content").querySelector("[data-more-panel]");
  const settingsButton = $("dialog-content").querySelector('[data-player-action="toggle-more"]');
  if (settingsPanel && !settingsPanel.hidden && !event.target.closest("[data-more-panel]") && !event.target.closest('[data-player-action="toggle-more"]')) {
    settingsPanel.hidden = true;
    settingsButton?.setAttribute("aria-expanded", "false");
  }
  const qualityPanel = $("dialog-content").querySelector("[data-quality-panel]");
  const qualityButton = $("dialog-content").querySelector('[data-player-action="toggle-quality-menu"]');
  if (qualityPanel && !qualityPanel.hidden && !event.target.closest("[data-quality-panel]") && !event.target.closest('[data-player-action="toggle-quality-menu"]')) {
    qualityPanel.hidden = true;
    qualityButton?.setAttribute("aria-expanded", "false");
  }
  const qualityOption = event.target.closest("[data-set-quality]");
  if (qualityOption) {
    const chosenQuality = qualityOption.dataset.setQuality;
    setVideoQuality(chosenQuality, true);
    if (qualityPanel) qualityPanel.hidden = true;
    qualityButton?.setAttribute("aria-expanded", "false");
    return;
  }
  const reactionButton = event.target.closest("[data-reaction]");
  if (reactionButton) {
    setVideoReaction($("detail-dialog").dataset.itemId, reactionButton.dataset.reaction);
    return;
  }
  const playerAction = event.target.closest("[data-player-action]");
  if (playerAction) {
    const currentId = $("detail-dialog").dataset.itemId;
    if (playerAction.dataset.playerAction === "toggle-autoplay") {
      isAutoplayEnabled = !isAutoplayEnabled;
      writeJson("watchbloom-autoplay", isAutoplayEnabled);
      syncAutoplayButtons();
      showFollowToast(isAutoplayEnabled ? (tr("autoplayOn") || "Autoplay is on") : (tr("autoplayOff") || "Autoplay is off"));
      return;
    }
    if (playerAction.dataset.playerAction === "cancel-autoplay") {
      clearAutoplayCountdown();
      const overlay = $("dialog-content").querySelector(".video-autoplay-overlay");
      if (overlay) overlay.remove();
      const video = $("dialog-content").querySelector("video");
      if (video) showVideoReplayOverlay(video);
      return;
    }
    if (playerAction.dataset.playerAction === "play-now-autoplay") {
      const overlay = $("dialog-content").querySelector(".video-autoplay-overlay");
      const nextId = overlay?.dataset.nextId;
      clearAutoplayCountdown();
      if (overlay) overlay.remove();
      if (nextId) openDetails(nextId, false, true);
      return;
    }
    if (playerAction.dataset.playerAction === "replay-video") {
      const overlay = $("dialog-content").querySelector(".video-replay-overlay");
      if (overlay) overlay.remove();
      const video = $("dialog-content").querySelector("video");
      if (video) {
        video.currentTime = 0;
        video.play().catch(() => {});
      }
      return;
    }
    if (playerAction.dataset.playerAction === "focus-comments") {
      const section = $("video-comments");
      section?.scrollIntoView({ behavior: "smooth", block: "start" });
      section?.querySelector("textarea")?.focus({ preventScroll: true });
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-subtitles") {
      toggleSubtitleTrack($("dialog-content").querySelector("video"));
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-play") {
      toggleActiveVideoPlayback();
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-mute") {
      toggleActiveVideoMute();
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-fullscreen") {
      toggleVideoFullscreen(playerAction.closest(".video-shell"));
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-pip") {
      const video = $("dialog-content").querySelector("video");
      const action = document.pictureInPictureElement
        ? document.exitPictureInPicture?.()
        : video?.requestPictureInPicture?.();
      if (action?.catch) action.catch(() => {
        const message = $("player-message");
        if (message) { message.textContent = tr("pipUnavailable"); message.hidden = false; }
      });
      else if (!document.pictureInPictureElement && !video?.requestPictureInPicture) {
        const message = $("player-message");
        if (message) { message.textContent = tr("pipUnavailable"); message.hidden = false; }
      }
      settingsPanel && (settingsPanel.hidden = true);
      settingsButton?.setAttribute("aria-expanded", "false");
      return;
    }
    if (playerAction.dataset.playerAction === "watch-later") { toggleSaved(currentId); return; }
    if (playerAction.dataset.playerAction === "toggle-playlist") {
      const panel = $("dialog-content").querySelector("[data-playlist-panel]");
      if (panel) { panel.hidden = !panel.hidden; if (!panel.hidden) panel.querySelector("select")?.focus(); }
      return;
    }
    if (playerAction.dataset.playerAction === "share-video") {
      shareVideo(playerAction, playerAction.dataset.videoId || currentId);
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-quality-menu") {
      const shell = playerAction.closest(".video-shell") || $("dialog-content");
      const qualityMenu = shell.querySelector("[data-quality-panel]");
      const settingsMenu = shell.querySelector("[data-more-panel]");
      const moreBtn = shell.querySelector('[data-player-action="toggle-more"]');
      if (settingsMenu && !settingsMenu.hidden) {
        settingsMenu.hidden = true;
        moreBtn?.setAttribute("aria-expanded", "false");
      }
      if (qualityMenu) {
        const willOpen = qualityMenu.hidden;
        qualityMenu.hidden = !willOpen;
        playerAction.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
          const activeOpt = qualityMenu.querySelector('.video-quality-option[aria-checked="true"]') || qualityMenu.querySelector('.video-quality-option');
          activeOpt?.focus();
        }
      }
      return;
    }
    if (playerAction.dataset.playerAction === "toggle-more") {
      const shell = playerAction.closest(".video-shell") || $("dialog-content");
      const settingsMenu = shell.querySelector("[data-more-panel]");
      const qualityMenu = shell.querySelector("[data-quality-panel]");
      const qualBtn = shell.querySelector('[data-player-action="toggle-quality-menu"]');
      if (qualityMenu && !qualityMenu.hidden) {
        qualityMenu.hidden = true;
        qualBtn?.setAttribute("aria-expanded", "false");
      }
      if (settingsMenu) {
        const willOpen = settingsMenu.hidden;
        settingsMenu.hidden = !willOpen;
        playerAction.setAttribute("aria-expanded", String(willOpen));
        if (willOpen) {
          settingsMenu.querySelector("button, select")?.focus();
        }
      }
      return;
    }
    if (playerAction.dataset.playerAction === "cinema") {
      const dialog = $("detail-dialog");
      const enabled = dialog.classList.toggle("cinema-mode");
      playerAction.setAttribute("aria-pressed", String(enabled));
      return;
    }
    if (playerAction.dataset.playerAction === "save-playlist") {
      const content = $("dialog-content");
      const selectedId = content.querySelector("[data-playlist-select]")?.value || "";
      const nameInput = content.querySelector("[data-new-playlist]");
      const name = nameInput?.value.trim().slice(0, 70) || "";
      let target = name ? localPlaylists.find((list) => list.title.toLocaleLowerCase() === name.toLocaleLowerCase()) : localPlaylists.find((list) => list.id === selectedId);
      if (!target && name) {
        const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "playlist";
        target = { id: "local-" + slug + "-" + Date.now().toString(36), title: name, items: [] };
        localPlaylists.push(target);
      }
      const status = content.querySelector("[data-playlist-status]");
      if (!target) { if (status) status.textContent = tr("playlistChoose"); return; }
      if (!target.items.includes(currentId)) target.items.push(currentId);
      writeJson("watchbloom-user-playlists", localPlaylists);
      if (status) status.textContent = tr("savedToPlaylist") + " " + target.title;
      if (nameInput) nameInput.value = "";
      const select = content.querySelector("[data-playlist-select]");
      if (select && !Array.from(select.options).some((option) => option.value === target.id)) select.add(new Option(target.title + " (" + target.items.length + ")", target.id, true, true));
      else if (select) select.value = target.id;
      return;
    }
  }
  const sortButton = event.target.closest("[data-comment-sort]");
  if (sortButton) {
    playerCommentSort = sortButton.dataset.commentSort === "best" ? "best" : "newest";
    $("dialog-content").querySelectorAll("[data-comment-sort]").forEach((button) => button.setAttribute("aria-pressed", String(button === sortButton)));
    renderComments($("detail-dialog").dataset.itemId);
    return;
  }
  const likeButton = event.target.closest("[data-comment-like]");
  if (likeButton) {
    const itemId = $("detail-dialog").dataset.itemId;
    const all = readJson("watchbloom-comments", {});
    const rows = Array.isArray(all[itemId]) ? all[itemId] : [];
    const comment = rows.find((row) => row.id === likeButton.dataset.commentLike);
    if (comment) {
      const likedBy = Array.isArray(comment.likedBy) ? comment.likedBy.slice() : (comment.voted ? [visitorId] : []);
      const hasLiked = likedBy.includes(visitorId);
      const currentLikes = Math.max(Number(comment.likes) || 0, Number(comment.helpful) || 0, likedBy.length);
      comment.likedBy = hasLiked ? likedBy.filter((id) => id !== visitorId) : [...likedBy, visitorId];
      comment.likes = Math.max(0, currentLikes + (hasLiked ? -1 : 1));
      comment.helpful = comment.likes;
      comment.voted = comment.likedBy.includes(visitorId);
      all[itemId] = rows;
      writeJson("watchbloom-comments", all);
      renderComments(itemId);
    }
    return;
  }
  const deleteButton = event.target.closest("[data-comment-delete]");
  if (deleteButton) {
    const itemId = $("detail-dialog").dataset.itemId;
    const all = readJson("watchbloom-comments", {});
    const rows = Array.isArray(all[itemId]) ? all[itemId] : [];
    const index = rows.findIndex((row) => row.id === deleteButton.dataset.commentDelete);
    const comment = rows[index];
    if (comment && (comment.ownerId === visitorId || (!comment.ownerId && comment.author === "You"))) {
      rows.splice(index, 1);
      all[itemId] = rows;
      writeJson("watchbloom-comments", all);
      renderComments(itemId);
    }
    return;
  }
  const follow = event.target.closest("[data-follow]");
  if (follow) { toggleCreatorFollow(follow.dataset.follow, follow.dataset.author); return; }
  if (handleCreatorControlClick(event)) return;
  const filterBtn = event.target.closest("[data-suggested-filter]");
  if (filterBtn) {
    event.preventDefault();
    event.stopPropagation();
    currentSuggestedFilter = filterBtn.dataset.suggestedFilter || "all";
    renderRelated(currentActiveDetailItem, currentSuggestedFilter);
    return;
  }
  const open = event.target.closest("[data-open]");
  if (open) {
    const isSuggestedOrCard = Boolean(open.closest(".suggested-video-card, .related-card, #related-list"));
    openDetails(open.dataset.open, false, isSuggestedOrCard);
    const inner = $("dialog-content")?.closest(".dialog-inner") || $("detail-dialog");
    if (inner) inner.scrollTo({ top: 0, behavior: "smooth" });
  }
 });
$("dialog-content").addEventListener("input", (event) => {
  const video = $("dialog-content").querySelector("video");
  if (!video) return;
  if (event.target.matches("[data-video-seek]") && Number.isFinite(video.duration) && video.duration > 0) {
    video.currentTime = video.duration * (Number(event.target.value) / 1000);
  }
  if (event.target.matches("[data-video-volume]")) {
    video.volume = Math.max(0, Math.min(1, Number(event.target.value)));
    video.muted = video.volume === 0;
  }
});
$("dialog-content").addEventListener("submit", (event) => {
  if (!event.target.matches("[data-comment-form]")) return;
  event.preventDefault();
  const input = event.target.querySelector("textarea");
  const text = input?.value.trim().slice(0, 600) || "";
  if (!text) return;
  const itemId = $("detail-dialog").dataset.itemId;
  const all = readJson("watchbloom-comments", {});
  const rows = Array.isArray(all[itemId]) ? all[itemId] : [];
  rows.push({ id: "comment-" + Date.now().toString(36) + "-" + Math.random().toString(36).slice(2, 7), author: "You", ownerId: visitorId, text, createdAt: new Date().toISOString(), likes: 0, likedBy: [] });
  all[itemId] = rows;
  writeJson("watchbloom-comments", all);
  input.value = "";
  playerCommentSort = "newest";
  $("dialog-content").querySelectorAll("[data-comment-sort]").forEach((button) => button.setAttribute("aria-pressed", String(button.dataset.commentSort === "newest")));
  renderComments(itemId);
});
$("dialog-content").addEventListener("change", (event) => {
  if (event.target.matches("[data-video-quality]")) {
    setVideoQuality(event.target.value, true);
  }
  if (event.target.matches("[data-playback-speed]")) {
    const video = $("dialog-content").querySelector("video");
    if (video) video.playbackRate = Number(event.target.value) || 1;
  }
  if (event.target.matches("#audio-language")) {
    const video = $("dialog-content").querySelector("video");
    const tracks = video?.audioTracks;
    if (tracks) Array.from(tracks).forEach((track, index) => { track.enabled = index === Number(event.target.value); });
  }
  if (event.target.matches("#subtitle-language")) {
    applySubtitleSelection($("dialog-content").querySelector("video"));
    const status = $("subtitle-status");
    if (status) status.hidden = true;
  }
});
document.addEventListener("change", (event) => {
  if (event.target.matches("[data-reel-quality]")) {
    setVideoQuality(event.target.value, true);
  }
});
$("detail-dialog").addEventListener("click", (event) => { if (event.target === $("detail-dialog")) $("detail-dialog").close(); });
$("detail-dialog").addEventListener("close", () => {
  disconnectLiveStreamSSE();
  if (window.activeHlsPlayer) { try { window.activeHlsPlayer.destroy(); } catch (_) {} window.activeHlsPlayer = null; }
  clearAutoplayCountdown();
  const vid = $("dialog-content")?.querySelector("video");
  if (vid) {
    try { vid.pause(); } catch (_) {}
  }
  closeDialogSuggestions();
  restoreNavigationFromPlayer();
  if (!isNavigatingHistory && !isSwitchingDialog && !$("creator-dialog")?.open && !$("detail-dialog")?.open) {
    syncUrl();
    windowNavStack = [currentWindowSnapshot()];
  }
  if (activeView === "reels") resumeReelFeed();
  else if (activeView === "explore") {
    const feed = $("home-shorts-track").querySelector(".quick-watch-feed");
    if (!feed) return;
    const bounds = feed.getBoundingClientRect();
    if (!bounds.height || bounds.bottom <= 0 || bounds.top >= window.innerHeight) return;
    const slides = Array.from(feed.querySelectorAll("[data-reel-slide]"));
    const center = feed.getBoundingClientRect().top + feed.clientHeight / 2;
    const closest = slides.sort((a, b) => Math.abs(a.getBoundingClientRect().top + a.clientHeight / 2 - center) - Math.abs(b.getBoundingClientRect().top + b.clientHeight / 2 - center))[0];
    const video = closest?.querySelector("[data-reel-video]");
    if (video) { activeReelVideo = video; playReelVideo(video); }
  }
});
$("detail-dialog").addEventListener("keydown", (event) => {
  if (event.key !== "Escape") return;
  const panel = $("dialog-content").querySelector("[data-more-panel]");
  if (panel && !panel.hidden) {
    event.preventDefault();
    panel.hidden = true;
    $("dialog-content").querySelector('[data-player-action="toggle-more"]')?.setAttribute("aria-expanded", "false");
  }
});
$("theme-toggle").addEventListener("click", () => applyTheme(document.documentElement.dataset.theme === "dark" ? "light" : "dark"));
$("notification-popover").addEventListener("click", (event) => {
  if (event.target.closest("[data-notification-close]")) {
    closeNotificationPopover(true);
    return;
  }
  if (event.target.closest("#notifications-following")) {
    closeNotificationPopover();
    setView("following");
  }
});
document.addEventListener("change", (event) => {
  const sel = event.target.closest(".language-select");
  if (sel) {
    applyLanguage(sel.value);
  }
});
$("account-menu").addEventListener("click", (event) => {
  const row = event.target.closest("[data-account-action]");
  if (row) handleAccountMenuAction(row.dataset.accountAction);
});
document.addEventListener("click", (event) => {
  const backBtn = event.target.closest('[data-player-action="back"], .dialog-back-btn');
  if (backBtn) {
    event.preventDefault();
    handleWindowBack();
    return;
  }
  const createBtn = event.target.closest('[data-dialog-action="create"], #header-create-btn');
  if (createBtn) {
    event.preventDefault();
    closeAccountMenu();
    closeNotificationPopover();
    if (localProfile.isGuest) {
      showFollowToast("Please sign in or create an account to create content.");
      openAuthModal("signin");
    } else {
      openCreatorPanel("create");
    }
    return;
  }
  const notifToggle = event.target.closest('[data-dialog-notification-toggle], #notification-toggle');
  if (notifToggle) {
    event.preventDefault();
    toggleNotificationPopover(notifToggle);
    return;
  }
  const acctToggle = event.target.closest('[data-dialog-account-toggle], #account-menu-toggle');
  if (acctToggle) {
    event.preventDefault();
    toggleAccountMenu(acctToggle);
    return;
  }
  const channelLink = event.target.closest("[data-open-channel]");
  if (channelLink) { event.preventDefault(); openCreatorChannel(channelLink.dataset.openChannel); return; }
  if (!event.target.closest(".account-control")) closeAccountMenu();
  if (!event.target.closest(".notification-control")) closeNotificationPopover();
  if (!event.target.closest(".reel-menu-wrap")) closeReelMenus();
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !$("account-menu").hidden) closeAccountMenu(true);
  if (event.key === "Escape" && !$("notification-popover").hidden) closeNotificationPopover(true);
  if (event.key === "Escape") closeReelMenus();
  if (event.key === "Escape") {
    const qMenu = $("dialog-content")?.querySelector("[data-quality-panel]");
    if (qMenu && !qMenu.hidden) {
      qMenu.hidden = true;
      const qualBtn = $("dialog-content")?.querySelector('[data-player-action="toggle-quality-menu"]');
      qualBtn?.setAttribute("aria-expanded", "false");
      qualBtn?.focus();
      return;
    }
    const sMenu = $("dialog-content")?.querySelector("[data-more-panel]");
    if (sMenu && !sMenu.hidden) {
      sMenu.hidden = true;
      const moreBtn = $("dialog-content")?.querySelector('[data-player-action="toggle-more"]');
      moreBtn?.setAttribute("aria-expanded", "false");
      moreBtn?.focus();
      return;
    }
  }
  if (event.ctrlKey || event.altKey || event.metaKey) return;
  if (isEditableTarget(document.activeElement)) return;

  if (event.key === "f" || event.key === "F") {
    if (document.fullscreenElement || $("detail-dialog")?.open || $("reels-dialog")?.open) {
      event.preventDefault();
      toggleVideoFullscreen();
    }
    return;
  }

  if (event.key === " " || event.key === "Spacebar" || event.code === "Space") {
    if (toggleActiveVideoPlayback()) {
      event.preventDefault();
    }
    return;
  }

  if (event.key === "m" || event.key === "M") {
    if (toggleActiveVideoMute()) {
      event.preventDefault();
    }
    return;
  }
});

($("explore-button") || document.createElement("button")).addEventListener("click", () => {
  setView("explore");
  $("catalog-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
($("find-creators") || document.createElement("button")).addEventListener("click", () => setView("explore"));
($("shorts-feature-button") || document.createElement("button")).addEventListener("click", () => {
  setView("reels");
  $("catalog-section").scrollIntoView({ behavior: "smooth", block: "start" });
});
$("menu-toggle").addEventListener("click", toggleNavigation);
$("nav-overlay").addEventListener("click", closeNavigation);
$("sidebar").addEventListener("click", (event) => {
  if (event.target.closest("[data-view]")) {
    closeNavigation();
    if ($("detail-dialog")?.contains($("sidebar"))) $("detail-dialog").close();
    if ($("creator-dialog")?.contains($("sidebar"))) $("creator-dialog").close();
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    const sb = $("sidebar");
    if (sb && sb.classList.contains("open")) {
      event.preventDefault();
      event.stopPropagation();
      closeNavigation();
    }
  }
}, true);
document.addEventListener("click", (event) => {
  const sb = $("sidebar");
  if (sb && sb.classList.contains("open")) {
    if (!sb.contains(event.target) && !event.target.closest("#menu-toggle, .dialog-menu-toggle, [data-player-action='toggle-navigation']")) {
      closeNavigation();
    }
  }
}, true);
restoreUrl();
initializeInlineHoverPreview();
document.body.classList.toggle("following-view", activeView === "following");
applyTheme(readJson("watchbloom-theme", "dark") === "light" ? "light" : "dark");
updateSaved();
updateLiked();
updateFollowing();
fetch("/api/v1/liked", {
  headers: { "X-Watchbloom-Visitor": visitorId },
  cache: "no-store",
}).then((res) => res.ok ? res.json() : null)
  .then((data) => {
    if (data && Array.isArray(data.results)) {
      data.results.forEach((it) => likedIds.add(it.id));
      writeJson("watchbloom-liked", Array.from(likedIds));
      updateLiked();
    }
  }).catch(() => {});
applyLanguage(readJson("watchbloom-language", "en"), false);
updateOwnProfileUI();
syncUserAuth();
document.querySelectorAll("[data-view]").forEach((button) => {
  const selected = button.classList.contains("nav-link") ? button.dataset.view === activeNavView : button.dataset.view === activeView || (Boolean(DISCOVER_VIEWS[activeView]) && button.classList.contains("view-tab") && button.dataset.view === "explore");
  button.classList.toggle("active", selected);
  if (button.classList.contains("nav-link")) button.setAttribute("aria-current", selected ? "page" : "false");
});
setCategory(activeCategory);

const rootFeedState = {
  type: "feed",
  view: activeView || "home",
  category: activeCategory || "all",
  q: q.value.trim(),
  navIdx: 0
};
windowNavStack = [rootFeedState];

if (pendingVideoId || pendingChannelAuthor || pendingPanelAction) {
  try {
    history.replaceState(rootFeedState, "", buildUrlHashFromState(rootFeedState));
  } catch (e) {}

  if (pendingVideoId) {
    const vid = pendingVideoId;
    pendingVideoId = null;
    openDetails(vid);
  } else if (pendingChannelAuthor) {
    const author = pendingChannelAuthor;
    const tab = pendingChannelTab || "home";
    pendingChannelAuthor = null;
    openCreatorChannel(author, tab);
  } else if (pendingPanelAction) {
    const action = pendingPanelAction;
    pendingPanelAction = null;
    if (action === "profile") openProfileEditor();
    else openCreatorPanel(action);
  }
} else {
  try {
    history.replaceState(rootFeedState, "", buildUrlHashFromState(rootFeedState));
  } catch (e) {}
}

// Watchbloom brand logo click → always go Home with fresh refresh
document.querySelector('.brand')?.addEventListener('click', function(event) {
  event.preventDefault();
  setView('home');
});
document.addEventListener("click", (event) => {
  const refreshBtn = event.target.closest("#home-refresh-cta");
  if (refreshBtn) {
    event.preventDefault();
    setView("home");
    return;
  }
  const clearHistBtn = event.target.closest("#clear-history-btn");
  if (clearHistBtn) {
    event.preventDefault();
    if (confirm("Are you sure you want to clear your watch history on this browser?")) {
      writeJson("watchbloom-history", []);
      render(q.value, false);
    }
    return;
  }
  const tag = event.target.closest(".explore-tag-chip");
  if (tag && tag.dataset.category) {
    event.preventDefault();
    setCategory(tag.dataset.category);
    return;
  }
});

document.addEventListener("click", (event) => {
  const pill = event.target.closest(".hub-pill");
  if (pill) {
    const parentBar = pill.closest(".hub-topic-bar");
    if (parentBar) {
      parentBar.querySelectorAll(".hub-pill").forEach((btn) => {
        btn.classList.remove("active");
        btn.setAttribute("aria-selected", "false");
      });
      pill.classList.add("active");
      pill.setAttribute("aria-selected", "true");
    }
    if (pill.dataset.coursesTrack) {
      activeCoursesTrack = pill.dataset.coursesTrack;
      renderCoursesHub(q.value);
    } else if (pill.dataset.cinemaTag) {
      activeCinemaTag = pill.dataset.cinemaTag;
      renderCinemaHub(q.value);
    } else if (pill.dataset.gameTag) {
      activeGameTag = pill.dataset.gameTag;
      renderGamersHub(q.value);
    } else if (pill.dataset.newsTab) {
      activeNewsTab = pill.dataset.newsTab;
      renderHeadlinesHub(q.value);
    } else if (pill.dataset.musicTag) {
      activeMusicTag = pill.dataset.musicTag;
      renderMusicHub(q.value);
    }
  }
});


/* ==========================================================================
   SETTINGS, MAIL & REPORTING HUB LOGIC
   ========================================================================== */
let settingsInitialized = false;
let activeSettingsTab = "privacy";

function switchSettingsSubTab(tabName) {
  activeSettingsTab = tabName;
  document.querySelectorAll("[data-settings-tab]").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.settingsTab === tabName);
  });
  document.querySelectorAll(".settings-panel").forEach((panel) => {
    panel.classList.toggle("active", panel.id === "settings-panel-" + tabName);
  });
  if (tabName === "activity") {
    loadSettingsActivity();
  }
}

async function renderSettingsHub() {
  if (!settingsInitialized) {
    initSettingsListeners();
    settingsInitialized = true;
  }
  await loadUserSettings();
  if (activeSettingsTab === "activity") {
    await loadSettingsActivity();
  }
}

function initSettingsListeners() {
  // Tab pills
  document.querySelectorAll("[data-settings-tab]").forEach((btn) => {
    btn.addEventListener("click", () => switchSettingsSubTab(btn.dataset.settingsTab));
  });

  // Form submits
  $("settings-privacy-form")?.addEventListener("submit", savePrivacySettings);
  $("settings-playback-form")?.addEventListener("submit", savePlaybackSettings);
  $("settings-notifications-form")?.addEventListener("submit", saveNotificationSettings);
  $("settings-support-form")?.addEventListener("submit", submitSupportInquiry);
  $("settings-report-form")?.addEventListener("submit", submitAbuseReport);
  $("refresh-activity-btn")?.addEventListener("click", loadSettingsActivity);
}

async function loadUserSettings() {
  try {
    const res = await fetch("/api/v1/user/settings", {
      headers: { "X-Watchbloom-Visitor": visitorId }
    });
    if (!res.ok) return;
    const data = await res.json();
    const s = data.settings || {};

    // Privacy
    if (s.privacy) {
      if ($("settings-profile-visibility")) $("settings-profile-visibility").value = s.privacy.profile_visibility || "public";
      if ($("settings-show-subscriptions")) $("settings-show-subscriptions").checked = Boolean(s.privacy.show_subscriptions);
      if ($("settings-show-liked")) $("settings-show-liked").checked = Boolean(s.privacy.show_liked_videos);
      if ($("settings-search-indexing")) $("settings-search-indexing").checked = Boolean(s.privacy.search_indexing);
    }

    // Playback
    if (s.playback) {
      if ($("settings-default-quality")) $("settings-default-quality").value = s.playback.default_quality || "auto";
      if ($("settings-playback-rate")) $("settings-playback-rate").value = String(s.playback.default_playback_rate || 1.0);
      if ($("settings-ambient-mode")) $("settings-ambient-mode").checked = Boolean(s.playback.ambient_mode);
      if ($("settings-autoplay-next")) $("settings-autoplay-next").checked = Boolean(s.playback.autoplay_next);
      if ($("settings-captions")) $("settings-captions").checked = Boolean(s.playback.captions_enabled);
    }

    // Notifications
    if (s.notifications) {
      if ($("settings-email-notifications")) $("settings-email-notifications").checked = Boolean(s.notifications.email_notifications);
      if ($("settings-sub-alerts")) $("settings-sub-alerts").checked = Boolean(s.notifications.new_subscriber_alerts);
      if ($("settings-rec-digests")) $("settings-rec-digests").checked = Boolean(s.notifications.recommendation_digests);
      if ($("settings-sec-alerts")) $("settings-sec-alerts").checked = Boolean(s.notifications.security_alerts);
    }
  } catch (err) {
    console.error("Failed to load user settings:", err);
  }
}

async function savePrivacySettings(e) {
  e.preventDefault();
  const feedback = $("settings-privacy-feedback");
  const payload = {
    privacy: {
      profile_visibility: $("settings-profile-visibility")?.value || "public",
      show_subscriptions: Boolean($("settings-show-subscriptions")?.checked),
      show_liked_videos: Boolean($("settings-show-liked")?.checked),
      search_indexing: Boolean($("settings-search-indexing")?.checked)
    }
  };
  try {
    const res = await fetch("/api/v1/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Watchbloom-Visitor": visitorId },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      if (feedback) {
        feedback.className = "settings-feedback-banner success";
        feedback.textContent = "✓ Privacy settings saved and synced to Redis cache.";
      }
      showFollowToast("Privacy settings updated");
    } else {
      throw new Error(result.error || "Update failed");
    }
  } catch (err) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Error saving privacy settings: " + err.message;
    }
  }
}

async function savePlaybackSettings(e) {
  e.preventDefault();
  const feedback = $("settings-playback-feedback");
  const payload = {
    playback: {
      default_quality: $("settings-default-quality")?.value || "auto",
      default_playback_rate: parseFloat($("settings-playback-rate")?.value || "1.0"),
      ambient_mode: Boolean($("settings-ambient-mode")?.checked),
      autoplay_next: Boolean($("settings-autoplay-next")?.checked),
      captions_enabled: Boolean($("settings-captions")?.checked)
    }
  };
  try {
    const res = await fetch("/api/v1/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Watchbloom-Visitor": visitorId },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      if (feedback) {
        feedback.className = "settings-feedback-banner success";
        feedback.textContent = "✓ Playback preferences saved and synced.";
      }
      showFollowToast("Playback preferences updated");
    } else {
      throw new Error(result.error || "Update failed");
    }
  } catch (err) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Error saving playback preferences: " + err.message;
    }
  }
}

async function saveNotificationSettings(e) {
  e.preventDefault();
  const feedback = $("settings-notifications-feedback");
  const payload = {
    notifications: {
      email_notifications: Boolean($("settings-email-notifications")?.checked),
      new_subscriber_alerts: Boolean($("settings-sub-alerts")?.checked),
      recommendation_digests: Boolean($("settings-rec-digests")?.checked),
      security_alerts: Boolean($("settings-sec-alerts")?.checked)
    }
  };
  try {
    const res = await fetch("/api/v1/user/settings", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Watchbloom-Visitor": visitorId },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      if (feedback) {
        feedback.className = "settings-feedback-banner success";
        feedback.textContent = "✓ Notification preferences saved.";
      }
      showFollowToast("Notification preferences updated");
    } else {
      throw new Error(result.error || "Update failed");
    }
  } catch (err) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Error saving notification preferences: " + err.message;
    }
  }
}

async function submitSupportInquiry(e) {
  e.preventDefault();
  const feedback = $("settings-support-feedback");
  const userEmail = $("support-contact-email")?.value?.trim() || "";
  const category = $("support-contact-category")?.value || "technical";
  const subject = $("support-contact-subject")?.value?.trim() || "";
  const message = $("support-contact-message")?.value?.trim() || "";

  // Client-side validation
  if (!userEmail || !userEmail.includes("@")) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Please enter a valid email address.";
    }
    return;
  }
  if (!subject) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Subject is required.";
    }
    return;
  }
  if (!message) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Message cannot be empty.";
    }
    return;
  }

  const payload = {
    user_email: userEmail,
    category: category,
    subject: subject,
    message: message
  };
  try {
    const res = await fetch("/api/v1/support/contact", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Watchbloom-Visitor": visitorId },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      if (feedback) {
        feedback.className = "settings-feedback-banner success";
        feedback.textContent = `✓ Ticket #${result.mail_id || "created"} submitted successfully. We'll respond to ${userEmail} shortly.`;
      }
      showFollowToast("Support inquiry submitted");
      $("settings-support-form")?.reset();
    } else {
      throw new Error(result.error || "Submission failed");
    }
  } catch (err) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Submission error: " + err.message;
    }
  }
}

async function submitAbuseReport(e) {
  e.preventDefault();
  const feedback = $("settings-report-feedback");
  const payload = {
    target_type: $("report-target-type")?.value || "video",
    target_id: $("report-target-id")?.value?.trim() || "",
    reason_code: $("report-reason-code")?.value || "other",
    description: $("report-description")?.value?.trim() || ""
  };
  try {
    const res = await fetch("/api/v1/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Watchbloom-Visitor": visitorId },
      body: JSON.stringify(payload)
    });
    const result = await res.json();
    if (res.ok) {
      if (feedback) {
        feedback.className = "settings-feedback-banner success";
        feedback.textContent = `✓ Abuse Report #${result.report_id || "queued"} received and queued for Trust & Safety review.`;
      }
      showFollowToast("Abuse report submitted");
      $("settings-report-form")?.reset();
    } else {
      throw new Error(result.error || "Submission failed");
    }
  } catch (err) {
    if (feedback) {
      feedback.className = "settings-feedback-banner error";
      feedback.textContent = "✗ Submission error: " + err.message;
    }
  }
}

async function loadSettingsActivity() {
  const container = $("settings-activity-feed");
  if (!container) return;
  container.innerHTML = '<div style="color:var(--muted); font-size:12px; padding:12px;">Loading recent activity & notifications...</div>';

  try {
    const res = await fetch("/api/v1/notifications", {
      headers: { "X-Watchbloom-Visitor": visitorId }
    });
    if (!res.ok) throw new Error("Failed to load notifications");
    const data = await res.json();
    const list = data.notifications || [];

    if (!list.length) {
      container.innerHTML = '<div style="color:var(--muted); font-size:12px; padding:16px; border:1px dashed var(--line); border-radius:12px; text-align:center;">No recent alerts or inquiries. All caught up!</div>';
      return;
    }

    container.innerHTML = list.map((item) => {
      const isUnread = !item.read;
      const dateStr = item.created_at ? new Date(item.created_at * 1000).toLocaleString() : "Recently";
      return `
        <div class="settings-activity-card ${isUnread ? "unread" : ""}">
          <div class="activity-badge-dot ${isUnread ? "" : "read"}"></div>
          <div class="activity-content">
            <div class="activity-title">${esc(item.title || "System Alert")}</div>
            <div style="font-size:12px; color:var(--ink); margin: 3px 0 5px;">${esc(item.message || "")}</div>
            <div class="activity-meta">${dateStr} · Type: ${esc(item.type || "system")}</div>
          </div>
          ${isUnread ? `<button type="button" class="activity-action-btn" onclick="markNotificationRead('${esc(item.id)}')">Mark read</button>` : ""}
        </div>
      `;
    }).join("");
  } catch (err) {
    container.innerHTML = `<div style="color:var(--danger, #f87171); font-size:12px; padding:12px;">Error loading activity: ${esc(err.message)}</div>`;
  }
}

async function markNotificationRead(notifId) {
  try {
    const res = await fetch(`/api/v1/notifications/${encodeURIComponent(notifId)}/read`, {
      method: "POST",
      headers: { "X-Watchbloom-Visitor": visitorId }
    });
    if (res.ok) {
      await loadSettingsActivity();
      showFollowToast("Notification marked as read");
    }
  } catch (err) {
    console.error("Failed to mark notification read:", err);
  }
}
