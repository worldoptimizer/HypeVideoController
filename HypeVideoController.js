/*!
 * Hype Video Controller v1.0.3
 * Copyright (2024) Max Ziebell. MIT-license
 */

/*
 * Version-History
 * 1.0.0 Initial release under MIT-license
 * 1.0.1 Added defaults system with autoStart, autoMute and autoInline configuration
 * 1.0.2 Added scene observer with automatic source cleanup and configurable defaults
 * 1.0.3 Added data attribute overrides for individual video settings
 */

if ("HypeVideoController" in window === false) {
    window['HypeVideoController'] = (function () {

        const processedVideos = new WeakSet();
        const sceneObservers = new WeakMap();
        
        const _default = {
            autoStart: true,
            autoMute: true,
            autoInline: true,
            removeSources: true,
            autoObserver: true,
        };


        /**
         * Set default options for HypeVideoController
         * @param {String|Object} key - Option key or object with multiple settings
         * @param {*} value - Value to set (if key is string)
         */
         function setDefault(key, value) {
            if (typeof key === 'object') {
                Object.assign(_default, key);
            } else {
                _default[key] = value;
            }
        }

        /**
         * Get default option(s)
         * @param {String} [key] - Specific option key
         * @returns {*} Default value or entire defaults object
         */
        function getDefault(key) {
            return key ? _default[key] : {..._default};
        }

        /**
         * Stops all videos in a scene element
         * 
         * @param {HTMLElement} sceneElement - The scene element containing videos
         */
        function stopVideosInScene(sceneElement) {
            const videos = sceneElement.querySelectorAll('video');
            videos.forEach(video => {
                video.pause();
                video.currentTime = 0;
            });
        }

        /**
         * Sets up visibility observer for a Hype document
         * 
         * @param {Object} hypeDocument - The Hype document instance
         */
        function setupSceneObserver(hypeDocument) {
            if (!_default.autoObserver) return;
            
            const container = document.getElementById(hypeDocument.documentId());
            
            // Create observer for scene visibility changes
            const observer = new MutationObserver((mutations) => {
                mutations.forEach((mutation) => {
                    if (mutation.type === 'attributes' && 
                        mutation.attributeName === 'style' && 
                        mutation.target.classList.contains('HYPE_scene')) {
                        
                        const sceneElement = mutation.target;
                        const isVisible = window.getComputedStyle(sceneElement).display !== 'none';
                        
                        // If scene becomes hidden, stop all videos in it
                        if (!isVisible) {
                            stopVideosInScene(sceneElement);
                            // Remove sources if enabled
                            if (_default.removeSources) {
                                sceneElement.querySelectorAll('video').forEach(video => {
                                    video.querySelectorAll('source').forEach(source => {
                                        source.remove();
                                    });
                                });
                            }
                        }
                    }
                });
            });
            
            // Get all HYPE_scene elements and observe them directly
            const scenes = container.getElementsByClassName('HYPE_scene');
            const config = { 
                attributes: true, 
                attributeFilter: ['style']
            };
            
            // Observe each scene element individually
            Array.from(scenes).forEach(scene => {
                observer.observe(scene, config);
            });
            
            // Store observer reference
            sceneObservers.set(hypeDocument, observer);
        }

        /**
         * Cleanup observer when document is destroyed
         * 
         * @param {Object} hypeDocument - The Hype document instance
         */
        function cleanupSceneObserver(hypeDocument) {
            const observer = sceneObservers.get(hypeDocument);
            if (observer) {
                observer.disconnect();
                sceneObservers.delete(hypeDocument);
            }
        }

        /**
         * Checks if a video element is in a currently visible HYPE_scene
         * 
         * @param {Object} hypeDocument - The Hype document instance
         * @param {HTMLElement} video - The video element to check
         * @returns {Boolean} - Whether the video's scene is currently visible
         */
        function isVideoInCurrentScene(hypeDocument, video) {
            // Find the parent HYPE_scene element
            let sceneElement = video.closest('.HYPE_scene');
            if (!sceneElement) return false;
            
            // Check if this scene element is visible (display != 'none')
            return window.getComputedStyle(sceneElement).display !== 'none';
        }

        /**
         * Triggers a video event with optional named event
         * 
         * @param {Object} hypeDocument - The Hype document instance
         * @param {string} eventType - The base event type (e.g., "Video Started")
         * @param {HTMLElement} video - The video element
         */
        function triggerVideoEvent(hypeDocument, eventType, video) {
            // Only trigger events if video's scene is visible
            if (!isVideoInCurrentScene(hypeDocument, video)) return;
            
            // Base event (e.g., "Video Started")
            hypeDocument.triggerCustomBehaviorNamed(eventType);
            
            // Named event if video has data-video-name
            const videoName = video.getAttribute('data-video-name');
            if (videoName) {
                hypeDocument.triggerCustomBehaviorNamed(`${eventType} ${videoName}`);
            }
        }

        /**
         * Sets up ended event listeners for videos in the current scene
         * 
         * @param {Object} hypeDocument - The Hype document instance.
         */
        function setupVideoEndedListeners(hypeDocument) {
            const currentScene = hypeDocument.getElementById(hypeDocument.currentSceneId());
            const videos = currentScene.querySelectorAll('video');
            
            videos.forEach(video => {
                if (!processedVideos.has(video)) {
                    // Handle video end
                    video.addEventListener('ended', () => {
                        triggerVideoEvent(hypeDocument, 'Video Ended', video);
                    });

                    // Handle video start
                    video.addEventListener('play', () => {
                        triggerVideoEvent(hypeDocument, 'Video Started', video);
                    });

                    // Handle video pause
                    video.addEventListener('pause', () => {
                        triggerVideoEvent(hypeDocument, 'Video Paused', video);
                    });

                    processedVideos.add(video);
                }
            });
        }

        /**
         * Gets the effective setting for a video element considering data attributes
         * 
         * @param {HTMLElement} video - The video element
         * @param {String} setting - The setting name
         * @returns {Boolean} - The effective setting value
         */
        function getVideoSetting(video, setting) {
            const dataAttr = `data-video-${setting.toLowerCase()}`;
            const attrValue = video.getAttribute(dataAttr);
            
            // If attribute exists, use its value
            if (attrValue !== null) {
                return attrValue === 'true';
            }
            
            // Fall back to default
            return _default[setting];
        }

        /**
         * Starts videos with autoplay enabled in the current scene.
         * 
         * @param {Object} hypeDocument - The Hype document instance.
         */
        function startSceneVideos(hypeDocument) {
            const currentScene = hypeDocument.getElementById(hypeDocument.currentSceneId());
            const videos = currentScene.querySelectorAll('video');
            
            videos.forEach(video => {
                requestAnimationFrame(() => {
                    // Apply settings based on data attributes or defaults
                    if (getVideoSetting(video, 'autoMute')) video.muted = true;
                    if (getVideoSetting(video, 'autoInline')) video.playsInline = true;
                    
                    // Only attempt autoplay if enabled for this video
                    if (getVideoSetting(video, 'autoStart')) {
                        video.currentTime = 0;
                        video.play().catch(error => {
                            console.warn(`Failed to autoplay video: ${video.id || 'unnamed'}`, error);
                        });
                    }
                });
            });
        }

        /**
         * Stops and resets all videos in the current scene.
         * 
         * @param {Object} hypeDocument - The Hype document instance.
         */
        function stopSceneVideos(hypeDocument, reset) {
            const currentScene = hypeDocument.getElementById(hypeDocument.currentSceneId());
            const videos = currentScene.querySelectorAll('video');
            videos.forEach(video => {
                video.pause();
                if (reset) video.currentTime = 0; // Reset to the beginning
            });
        }

        /**
         * Handles the HypeDocumentLoad event.
         * 
         * @param {Object} hypeDocument - The Hype document instance.
         * @param {HTMLElement} element - The element associated with the event.
         * @param {Object} event - The event object.
         */
        function HypeDocumentLoad(hypeDocument, element, event) {
            setupSceneObserver(hypeDocument);
            
            /**
             * Get video element by name or selector
             * @param {string} name - The data-video-name value or CSS selector
             * @returns {HTMLVideoElement|null} The video element or null if not found
             */
            hypeDocument.getVideo = function(name) {
                const currentScene = this.getElementById(this.currentSceneId());
                // Check if name looks like a CSS selector
                if (name.match(/^[.#\[]/) || name.includes(' ')) {
                    return currentScene.querySelector(name);
                }
                return currentScene.querySelector(`video[data-video-name="${name}"]`);
            };

            /**
             * Check if a video is currently playing
             * @param {string} name - The data-video-name value or CSS selector
             * @returns {boolean} True if the video is playing, false otherwise
             */
            hypeDocument.isVideoPlaying = function(name) {
                const video = this.getVideo(name);
                return video ? !video.paused && !video.ended : false;
            };

            /**
             * Play video by name or selector
             * @param {string} name - The data-video-name value or CSS selector
             */
             hypeDocument.playVideo = function(name) {
                const video = this.getVideo(name);
                if (video) {
                    video.play().catch(error => {
                        console.warn(`Failed to play video "${name}":`, error);
                    });
                }
            };

            /**
             * Pause video by name or selector
             * @param {string} name - The data-video-name value or CSS selector
             */
            hypeDocument.pauseVideo = function(name) {
                const video = this.getVideo(name);
                if (video) {
                    video.pause();
                }
            };

            /**
             * Stop video by name or selector (pauses and resets to beginning)
             * @param {string} name - The data-video-name value or CSS selector
             */
            hypeDocument.stopVideo = function(name) {
                const video = this.getVideo(name);
                if (video) {
                    video.pause();
                    video.currentTime = 0;
                }
            };

            /**
             * Sets the volume of a video
             * @param {string} name - The data-video-name value or CSS selector
             * @param {number} volume - The volume level between 0 and 1
             */
            hypeDocument.setVideoVolume = function(name, volume) {
                const video = this.getVideo(name);
                if (video) {
                    if (volume >= 0 && volume <= 1) {
                        video.volume = volume;
                    }
                }
            };

            /**
             * Seeks to a specific time in the video
             * @param {string} name - The data-video-name value or CSS selector
             * @param {number} time - The time in seconds to seek to
             */
            hypeDocument.seekVideoTo = function(name, time) {
                const video = this.getVideo(name);
                if (video && time >= 0 && time <= video.duration) {
                    video.currentTime = time;
                }
            };

            /**
             * Toggles the mute state of a video
             * @param {string} name - The data-video-name value or CSS selector
             */
            hypeDocument.toggleVideoMute = function(name) {
                const video = this.getVideo(name);
                if (video) {
                    video.muted = !video.muted;
                }
            };

            /**
             * Gets the duration of a video
             * @param {string} name - The data-video-name value or CSS selector
             * @returns {number|null} The duration of the video in seconds, or null if video not found
             */
            hypeDocument.getVideoDuration = function(name) {
                const video = this.getVideo(name);
                return video ? video.duration : null;
            };

            /**
             * Seeks to a specific percentage in the video
             * @param {string} name - The data-video-name value or CSS selector
             * @param {number} percentage - The percentage to seek to (0-100)
             * @returns {number|null} The new currentTime if seek was successful, or null otherwise
             */
            hypeDocument.seekVideoToPercentage = function(name, percentage) {
                const video = this.getVideo(name);
                if (video && percentage >= 0 && percentage <= 100) {
                    const duration = video.duration;
                    const seekTime = (percentage / 100) * duration;
                    video.currentTime = seekTime;
                    return seekTime;
                }
                return null;
            };
            
        }

        /**
         * Handles the HypeScenePrepareForDisplay event.
         * 
         * @param {Object} hypeDocument - The Hype document instance.
         * @param {HTMLElement} element - The element associated with the event.
         * @param {Object} event - The event object.
         */
        function HypeScenePrepareForDisplay(hypeDocument, element, event) {
            setupVideoEndedListeners(hypeDocument);
            startSceneVideos(hypeDocument);
        }

        /**
         * Handles the HypeSceneUnload event.
         * 
         * @param {Object} hypeDocument - The Hype document instance.
         * @param {HTMLElement} element - The element associated with the event.
         * @param {Object} event - The event object.
         */
        function HypeSceneUnload(hypeDocument, element, event) {
            stopSceneVideos(hypeDocument);
        }

        // Register event listeners
        if ("HYPE_eventListeners" in window === false) {
            window.HYPE_eventListeners = Array();
        }
        window.HYPE_eventListeners.push({ "type": "HypeDocumentLoad", "callback": HypeDocumentLoad });
        window.HYPE_eventListeners.push({ "type": "HypeScenePrepareForDisplay", "callback": HypeScenePrepareForDisplay });
        window.HYPE_eventListeners.push({ "type": "HypeSceneUnload", "callback": HypeSceneUnload });

        return {
            version: '1.0.3',
            setDefault: setDefault,
            getDefault: getDefault,
        };

    })();
}
