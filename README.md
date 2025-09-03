# Hype Video Controller
![Hype-ScrollMagic](https://playground.maxziebell.de/Hype/VideoController/HypeVideoController.jpg)

The **Hype Video Controller** extension enhances your Tumult Hype documents with powerful, flexible video playback control. It ensures videos start playing seamlessly during scene transitions, allows you to react to video lifecycle events, and provides a robust API to manage playback, volume, and seeking—all without leaving Hype’s familiar interface.

---

## Key Benefits

1. **Seamless Scene Transitions**  
   Videos begin playing **before** transitions finish, eliminating awkward delays. Similarly, outgoing scenes stop their videos gracefully, ensuring a professional, uninterrupted viewing experience.

2. **Event-Driven Integration**  
   Respond to video lifecycle events such as start, pause, and end. Sync timelines, trigger animations, or run custom scripts at precise video moments.

3. **Flexible Playback Controls**  
   Control videos directly from Hype actions, custom behaviors, or JavaScript. Easily play, pause, stop, seek, mute/unmute, and change volume—no complicated code required.

4. **Data Attribute Overrides**  
   Fine-tune playback behavior on a per-video basis with HTML data attributes. For example, enable or disable autostart on specific videos while relying on global defaults elsewhere.

5. **Automatic Cleanup and Resource Management**  
   The extension can automatically remove `<source>` elements from videos when they’re no longer visible, helping keep your project lightweight and memory-friendly.

---

## Installation & Setup

Simply include the **HypeVideoController** extension script alongside your Tumult Hype document. The extension initializes automatically on document load and binds to standard Hype lifecycle events.

---

## Configuration & Defaults

The extension comes with built-in defaults to streamline setup. You can override these defaults globally or per video.

### Global Defaults

| Setting | Default | Description |
| :--- | :--- | :--- |
| `autoPlay` | `true` | Automatically attempts to play videos when their scene is displayed. |
| `autoMute` | `true` | Automatically mutes videos. **Required on most browsers for autoplay to succeed.** |
| `autoPlaysInline` | `true` | Sets the `playsinline` attribute, allowing videos to play within their element on mobile devices instead of forcing fullscreen. |
| `autoObserver` | `true` | Automatically observes scene transitions to pause and unload videos in hidden scenes, saving resources. |
| `endOnStall` | `true` | If a video freezes (stalls) during playback, automatically triggers the "Video Ended" event. |
| `stallTimeout` | `2000` | The time in milliseconds to wait before considering a playing video to be stalled. |
| `endOnAutoplayFail` | `true` | If the browser blocks a video's autoplay, automatically triggers the "Video Ended" event to allow the sequence to continue. |

**Changing Defaults:**

Use `HypeVideoController.setDefault(key, value)` to change a single setting or pass an object to override multiple:

```javascript
// Set a single default
HypeVideoController.setDefault('autoStart', false);

// Set multiple defaults
HypeVideoController.setDefault({
  autoStart: false,
  removeSources: false
});
```

**Retrieving Defaults:**

```javascript
// Get a single default
const autoStart = HypeVideoController.getDefault('autoStart');

// Get all defaults
const allDefaults = HypeVideoController.getDefault();
```

---

## Per-Video Settings with Data Attributes

You can override defaults for individual videos by adding data attributes to your video elements in Hype’s **Additional HTML Attributes** panel.

For example, to control autostart for a single video:
- **Attribute Name:** `data-video-autostart`  
- **Value:** `true` or `false`

Other supported overrides:  
- `data-video-automute`  
- `data-video-autoInline`  
- (In future versions, more attributes may be added.)

These per-video settings take precedence over the global defaults.

---

## Identifying Your Videos

Assign a unique `data-video-name` attribute to your video elements:

1. Select the video element in the Scene.
2. In the **Identity Inspector**, open the **Additional HTML Attributes** section.
3. Add:  
   - **Attribute Name:** `data-video-name`  
   - **Value:** `intro` (or any unique identifier)

With this attribute set, you can easily reference the video from your code or actions.

---

## Playback Controls

Use the provided API methods to control video playback. These methods can be called from Hype's **Actions Inspector** (using the Run JavaScript action) or your own custom scripts.

| Method                                | Description                                                                  | Example                                     |
|----------------------------------------|------------------------------------------------------------------------------|---------------------------------------------|
| `hypeDocument.playVideo(name)`         | Plays the specified video.                                                   | `hypeDocument.playVideo("intro");`          |
| `hypeDocument.pauseVideo(name)`        | Pauses the specified video.                                                  | `hypeDocument.pauseVideo("intro");`         |
| `hypeDocument.stopVideo(name)`         | Stops the video and resets it to the start.                                  | `hypeDocument.stopVideo("intro");`          |
| `hypeDocument.isVideoPlaying(name)`    | Returns `true` if the video is currently playing, else `false`.               | `if (hypeDocument.isVideoPlaying("intro")) { ... }` |
| `hypeDocument.setVideoVolume(name, vol)`| Sets video volume (0–1).                                                      | `hypeDocument.setVideoVolume("intro", 0.5);`|
| `hypeDocument.seekVideoTo(name, time)` | Seeks the video to a specific time in seconds.                                | `hypeDocument.seekVideoTo("intro", 10);`    |
| `hypeDocument.seekVideoToPercentage(name, pct)` | Seeks the video to a specific percentage of its duration (0–100).  | `hypeDocument.seekVideoToPercentage("intro", 50);` |
| `hypeDocument.toggleVideoMute(name)`   | Toggles the video’s mute state.                                               | `hypeDocument.toggleVideoMute("intro");`    |
| `hypeDocument.getVideoDuration(name)`  | Returns the video’s total duration in seconds.                                | `let dur = hypeDocument.getVideoDuration("intro");` |

---

## Lifecycle Events

The extension triggers Hype Custom Behaviors at key video lifecycle points. Use these events to synchronize animations, run scripts, or trigger other behaviors in Hype:

| Event | Triggered When... | Example Use Case |
| :--- | :--- | :--- |
| `Video Started` | The video successfully begins playback. | Begin a related timeline animation or hide a "Loading..." message. |
| `Video Paused` | The video is paused by the user or by code. | Show a "Paused" overlay or a play button icon. |
| `Video Ended` | The video finishes playback naturally, or when a stall/autoplay failure fallback is triggered. | Automatically navigate to the next scene or loop the video. |
| `Video Autoplay Failed` | The browser blocks the video from automatically playing on scene load. | Display a custom "Tap to Play" button to the user. |
| `Video Stalled` | A playing video freezes for a configurable duration (`stallTimeout`). | Show a "Buffering..." indicator or log a playback error for analytics. |

**Tip:** If your video has a `data-video-name` attribute, the event name is suffixed with that name. For example, `Video Ended intro` if the `data-video-name` is `"intro"`.

---

## Scene Transition Logic

**Incoming Scenes:**  
As a scene is **prepared** for display (before it fully transitions in), the extension checks for videos set to autostart and plays them. This ensures your videos are ready to go the moment the scene finishes transitioning.

**Outgoing Scenes:**  
When a scene starts to unload, the extension automatically stops all running videos.

---

## Best Practices & Tips

- **Use `data-video-name` for Easy Referencing:**  
  This makes it simple to target videos for playback or event handling.
  
- **Rely on Defaults for Most Videos:**  
  Set global defaults that match your project’s needs, then override on a few special videos with data attributes.
  
- **Test Across Scenes:**  
  Make sure your videos transition smoothly between scenes by previewing in Tumult Hype’s browser preview mode.
  
- **Handle Event Triggers for Sync:**  
  Use the triggered behaviors (like `Video Started`) to synchronize animations or timelines, creating a polished, integrated narrative.
