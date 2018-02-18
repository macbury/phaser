/**
 * @author       Richard Davey <rich@photonstorm.com>
 * @copyright    2018 Photon Storm Ltd.
 * @license      {@link https://github.com/photonstorm/phaser/blob/master/license.txt|MIT License}
 */
var Class = require('../../utils/Class');
var BaseSound = require('../BaseSound');

/**
 * @classdesc
 * HTML5 Audio implementation of the sound.
 *
 * @class HTML5AudioSound
 * @extends Phaser.Sound.BaseSound
 * @memberOf Phaser.Sound
 * @constructor
 * @author Pavle Goloskokovic <pgoloskokovic@gmail.com> (http://prunegames.com)
 * @since 3.0.0
 *
 * @param {Phaser.Sound.HTML5AudioSoundManager} manager - Reference to the current sound manager instance.
 * @param {string} key - Asset key for the sound.
 * @param {SoundConfig} [config={}] - An optional config object containing default sound settings.
 */
var HTML5AudioSound = new Class({
    Extends: BaseSound,
    initialize: function HTML5AudioSound (manager, key, config)
    {
        if (config === void 0) { config = {}; }

        /**
         * An array containing all HTML5 Audio tags that could be used for individual
         * sound's playback. Number of instances depends on the config value passed
         * to the Loader#audio method call, default is 1.
         *
         * @name Phaser.Sound.HTML5AudioSound#tags
         * @type {HTMLAudioElement[]}
         * @private
         * @since 3.0.0
         */
        this.tags = manager.game.cache.audio.get(key);
        if (!this.tags)
        {
            // eslint-disable-next-line no-console
            console.error('No audio loaded in cache with key: \'' + key + '\'!');
            return;
        }

        /**
         * Reference to an HTML5 Audio tag used for playing sound.
         *
         * @name Phaser.Sound.HTML5AudioSound#audio
         * @type {HTMLAudioElement}
         * @private
         * @default null
         * @since 3.0.0
         */
        this.audio = null;

        /**
         * Timestamp as generated by the Request Animation Frame or SetTimeout
         * representing the time at which the delayed sound playback should start.
         * Set to 0 if sound playback is not delayed.
         *
         * @name Phaser.Sound.HTML5AudioSound#startTime
         * @type {number}
         * @private
         * @default 0
         * @since 3.0.0
         */
        this.startTime = 0;

        /**
         * Audio tag's playback position recorded on previous
         * update method call. Set to 0 if sound is not playing.
         *
         * @name Phaser.Sound.HTML5AudioSound#previousTime
         * @type {number}
         * @private
         * @default 0
         * @since 3.0.0
         */
        this.previousTime = 0;
        this.duration = this.tags[0].duration;
        this.totalDuration = this.tags[0].duration;
        BaseSound.call(this, manager, key, config);
    },

    /**
     * Play this sound, or a marked section of it.
     * It always plays the sound from the start. If you want to start playback from a specific time
     * you can set 'seek' setting of the config object, provided to this call, to that value.
     *
     * @method Phaser.Sound.HTML5AudioSound#play
     * @since 3.0.0
     *
     * @param {string} [markerName=''] - If you want to play a marker then provide the marker name here, otherwise omit it to play the full sound.
     * @param {SoundConfig} [config] - Optional sound config object to be applied to this marker or entire sound if no marker name is provided. It gets memorized for future plays of current section of the sound.
     *
     * @return {boolean} Whether the sound started playing successfully.
     */
    play: function (markerName, config)
    {
        if (this.manager.isLocked(this, 'play', [ markerName, config ]))
        {
            return false;
        }
        if (!BaseSound.prototype.play.call(this, markerName, config))
        {
            return false;
        }

        //  \/\/\/ isPlaying = true, isPaused = false \/\/\/
        if (!this.pickAndPlayAudioTag())
        {
            return false;
        }

        /**
         * @event Phaser.Sound.HTML5AudioSound#play
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         */
        this.emit('play', this);
        return true;
    },

    /**
     * Pauses the sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#pause
     * @since 3.0.0
     *
     * @return {boolean} Whether the sound was paused successfully.
     */
    pause: function ()
    {
        if (this.manager.isLocked(this, 'pause'))
        {
            return false;
        }

        if (this.startTime > 0)
        {
            return false;
        }

        if (!BaseSound.prototype.pause.call(this))
        {
            return false;
        }

        //  \/\/\/ isPlaying = false, isPaused = true \/\/\/
        this.currentConfig.seek = this.audio.currentTime
            - (this.currentMarker ? this.currentMarker.start : 0);
        this.stopAndReleaseAudioTag();

        /**
         * @event Phaser.Sound.HTML5AudioSound#pause
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         */
        this.emit('pause', this);

        return true;
    },

    /**
     * Resumes the sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#resume
     * @since 3.0.0
     *
     * @return {boolean} Whether the sound was resumed successfully.
     */
    resume: function ()
    {
        if (this.manager.isLocked(this, 'resume'))
        {
            return false;
        }

        if (this.startTime > 0)
        {
            return false;
        }

        if (!BaseSound.prototype.resume.call(this))
        {
            return false;
        }

        //  \/\/\/ isPlaying = true, isPaused = false \/\/\/
        if (!this.pickAndPlayAudioTag())
        {
            return false;
        }

        /**
         * @event Phaser.Sound.HTML5AudioSound#resume
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         */
        this.emit('resume', this);

        return true;
    },

    /**
     * Stop playing this sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#stop
     * @since 3.0.0
     *
     * @return {boolean} Whether the sound was stopped successfully.
     */
    stop: function ()
    {
        if (this.manager.isLocked(this, 'stop'))
        {
            return false;
        }

        if (!BaseSound.prototype.stop.call(this))
        {
            return false;
        }

        //  \/\/\/ isPlaying = false, isPaused = false \/\/\/
        this.stopAndReleaseAudioTag();

        /**
         * @event Phaser.Sound.HTML5AudioSound#stop
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         */
        this.emit('stop', this);

        return true;
    },

    /**
     * Used internally to do what the name says.
     *
     * @method Phaser.Sound.HTML5AudioSound#pickAndPlayAudioTag
     * @private
     * @since 3.0.0
     *
     * @return {boolean} Whether the sound was assigned an audio tag successfully.
     */
    pickAndPlayAudioTag: function ()
    {
        if (!this.pickAudioTag())
        {
            this.reset();
            return false;
        }

        var seek = this.currentConfig.seek;
        var delay = this.currentConfig.delay;
        var offset = (this.currentMarker ? this.currentMarker.start : 0) + seek;
        this.previousTime = offset;
        this.audio.currentTime = offset;
        this.applyConfig();

        if (delay === 0)
        {
            this.startTime = 0;

            if (this.audio.paused)
            {
                this.playCatchPromise();
            }
        }
        else
        {
            this.startTime = window.performance.now() + delay * 1000;

            if (!this.audio.paused)
            {
                this.audio.pause();
            }
        }

        this.resetConfig();

        return true;
    },

    /**
     * This method performs the audio tag pooling logic. It first looks for
     * unused audio tag to assign to this sound object. If there are no unused
     * audio tags, based on HTML5AudioSoundManager#override property value, it
     * looks for sound with most advanced playback and hijacks its audio tag or
     * does nothing.
     *
     * @method Phaser.Sound.HTML5AudioSound#pickAudioTag
     * @private
     * @since 3.0.0
     *
     * @return {boolean} Whether the sound was assigned an audio tag successfully.
     */
    pickAudioTag: function ()
    {
        if (this.audio)
        {
            return true;
        }
        for (var i = 0; i < this.tags.length; i++)
        {
            var audio = this.tags[i];

            if (audio.dataset.used === 'false')
            {
                audio.dataset.used = 'true';
                this.audio = audio;
                return true;
            }
        }

        if (!this.manager.override)
        {
            return false;
        }

        var otherSounds = [];

        this.manager.forEachActiveSound(function (sound)
        {
            if (sound.key === this.key && sound.audio)
            {
                otherSounds.push(sound);
            }
        }, this);

        otherSounds.sort(function (a1, a2)
        {
            if (a1.loop === a2.loop)
            {
                // sort by progress
                return (a2.seek / a2.duration) - (a1.seek / a1.duration);
            }
            return a1.loop ? 1 : -1;
        });

        var selectedSound = otherSounds[0];

        this.audio = selectedSound.audio;
        selectedSound.reset();
        selectedSound.audio = null;
        selectedSound.startTime = 0;
        selectedSound.previousTime = 0;

        return true;
    },

    /**
     * Method used for playing audio tag and catching possible exceptions
     * thrown from rejected Promise returned from play method call.
     *
     * @method Phaser.Sound.HTML5AudioSound#playCatchPromise
     * @private
     * @since 3.0.0
     */
    playCatchPromise: function ()
    {
        var playPromise = this.audio.play();

        if (playPromise)
        {
            playPromise.catch(function () { });
        }
    },

    /**
     * Used internally to do what the name says.
     *
     * @method Phaser.Sound.HTML5AudioSound#stopAndReleaseAudioTag
     * @private
     * @since 3.0.0
     */
    stopAndReleaseAudioTag: function ()
    {
        this.audio.pause();
        this.audio.dataset.used = 'false';
        this.audio = null;
        this.startTime = 0;
        this.previousTime = 0;
    },

    /**
     * Method used internally to reset sound state, usually when stopping sound
     * or when hijacking audio tag from another sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#reset
     * @private
     * @since 3.0.0
     */
    reset: function ()
    {
        BaseSound.prototype.stop.call(this);
    },

    /**
     * Method used internally by sound manager for pausing sound if
     * Phaser.Sound.HTML5AudioSoundManager#pauseOnBlur is set to true.
     *
     * @method Phaser.Sound.HTML5AudioSoundManager#onBlur
     * @private
     * @since 3.0.0
     */
    onBlur: function ()
    {
        this.isPlaying = false;
        this.isPaused = true;
        this.currentConfig.seek = this.audio.currentTime -
            (this.currentMarker ? this.currentMarker.start : 0);
        this.currentConfig.delay = Math.max(0, (this.startTime - window.performance.now()) / 1000);
        this.stopAndReleaseAudioTag();
    },

    /**
     * Method used internally by sound manager for resuming sound if
     * Phaser.Sound.HTML5AudioSoundManager#pauseOnBlur is set to true.
     *
     * @method Phaser.Sound.HTML5AudioSound#onFocus
     * @private
     * @since 3.0.0
     */
    onFocus: function ()
    {
        this.isPlaying = true;
        this.isPaused = false;
        this.pickAndPlayAudioTag();
    },

    /**
     * Update method called automatically by sound manager on every game step.
     *
     * @method Phaser.Sound.HTML5AudioSound#update
     * @protected
     * @since 3.0.0
     *
     * @param {number} time - The current timestamp as generated by the Request Animation Frame or SetTimeout.
     * @param {number} delta - The delta time elapsed since the last frame.
     */
    update: function (time)
    {
        if (!this.isPlaying)
        {
            return;
        }

        // handling delayed playback
        if (this.startTime > 0)
        {
            if (this.startTime < time - this.manager.audioPlayDelay)
            {
                this.audio.currentTime += Math.max(0, time - this.startTime) / 1000;
                this.startTime = 0;
                this.previousTime = this.audio.currentTime;
                this.playCatchPromise();
            }
            return;
        }

        // handle looping and ending
        var startTime = this.currentMarker ? this.currentMarker.start : 0;
        var endTime = startTime + this.duration;
        var currentTime = this.audio.currentTime;
        if (this.currentConfig.loop)
        {
            if (currentTime >= endTime - this.manager.loopEndOffset)
            {
                this.audio.currentTime = startTime + Math.max(0, currentTime - endTime);
                currentTime = this.audio.currentTime;
            }
            else if (currentTime < startTime)
            {
                this.audio.currentTime += startTime;
                currentTime = this.audio.currentTime;
            }
            if (currentTime < this.previousTime)
            {
                /**
                 * @event Phaser.Sound.HTML5AudioSound#looped
                 * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
                 */
                this.emit('looped', this);
            }
        }
        else if (currentTime >= endTime)
        {
            this.reset();
            this.stopAndReleaseAudioTag();

            /**
             * @event Phaser.Sound.HTML5AudioSound#ended
             * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
             */
            this.emit('ended', this);
            return;
        }
        this.previousTime = currentTime;
    },

    /**
     * Calls Phaser.Sound.BaseSound#destroy method
     * and cleans up all HTML5 Audio related stuff.
     *
     * @method Phaser.Sound.HTML5AudioSound#destroy
     * @since 3.0.0
     */
    destroy: function ()
    {
        BaseSound.prototype.destroy.call(this);
        this.tags = null;
        if (this.audio)
        {
            this.stopAndReleaseAudioTag();
        }
    },

    /**
     * Method used internally to determine mute setting of the sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#setMute
     * @private
     * @since 3.0.0
     */
    setMute: function ()
    {
        if (this.audio)
        {
            this.audio.muted = this.currentConfig.mute || this.manager.mute;
        }
    },

    /**
     * Method used internally to calculate total volume of the sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#setVolume
     * @private
     * @since 3.0.0
     */
    setVolume: function ()
    {
        if (this.audio)
        {
            this.audio.volume = this.currentConfig.volume * this.manager.volume;
        }
    },

    /**
     * Method used internally to calculate total playback rate of the sound.
     *
     * @method Phaser.Sound.HTML5AudioSound#setRate
     * @protected
     * @since 3.0.0
     */
    setRate: function ()
    {
        BaseSound.prototype.setRate.call(this);
        if (this.audio)
        {
            this.audio.playbackRate = this.totalRate;
        }
    }
});

/**
 * Mute setting.
 *
 * @name Phaser.Sound.HTML5AudioSound#mute
 * @type {boolean}
 */
Object.defineProperty(HTML5AudioSound.prototype, 'mute', {

    get: function ()
    {
        return this.currentConfig.mute;
    },

    set: function (value)
    {
        this.currentConfig.mute = value;
        if (this.manager.isLocked(this, 'mute', value))
        {
            return;
        }
        this.setMute();

        /**
         * @event Phaser.Sound.HTML5AudioSound#mute
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         * @param {boolean} value - An updated value of Phaser.Sound.HTML5AudioSound#mute property.
         */
        this.emit('mute', this, value);
    }

});

/**
 * Volume setting.
 *
 * @name Phaser.Sound.HTML5AudioSound#volume
 * @type {number}
 */
Object.defineProperty(HTML5AudioSound.prototype, 'volume', {

    get: function ()
    {
        return this.currentConfig.volume;
    },

    set: function (value)
    {
        this.currentConfig.volume = value;
        if (this.manager.isLocked(this, 'volume', value))
        {
            return;
        }
        this.setVolume();

        /**
         * @event Phaser.Sound.HTML5AudioSound#volume
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         * @param {number} value - An updated value of Phaser.Sound.HTML5AudioSound#volume property.
         */
        this.emit('volume', this, value);
    }

});

/**
 * Playback rate.
 *
 * @name Phaser.Sound.HTML5AudioSound#rate
 * @type {number}
 */
Object.defineProperty(HTML5AudioSound.prototype, 'rate', {

    get: function ()
    {
        return Object.getOwnPropertyDescriptor(BaseSound.prototype, 'rate').get.call(this);
    },

    set: function (value)
    {
        this.currentConfig.rate = value;
        if (this.manager.isLocked(this, 'rate', value))
        {
            return;
        }
        Object.getOwnPropertyDescriptor(BaseSound.prototype, 'rate').set.call(this, value);
    }

});

/**
 * Detuning of sound.
 *
 * @name Phaser.Sound.HTML5AudioSound#detune
 * @type {number}
 */
Object.defineProperty(HTML5AudioSound.prototype, 'detune', {

    get: function ()
    {
        return Object.getOwnPropertyDescriptor(BaseSound.prototype, 'detune').get.call(this);
    },

    set: function (value)
    {
        this.currentConfig.detune = value;
        if (this.manager.isLocked(this, 'detune', value))
        {
            return;
        }
        Object.getOwnPropertyDescriptor(BaseSound.prototype, 'detune').set.call(this, value);
    }

});

/**
 * Current position of playing sound.
 *
 * @name Phaser.Sound.HTML5AudioSound#seek
 * @type {number}
 */
Object.defineProperty(HTML5AudioSound.prototype, 'seek', {

    get: function ()
    {
        if (this.isPlaying)
        {
            return this.audio.currentTime -
                (this.currentMarker ? this.currentMarker.start : 0);
        }
        else if (this.isPaused)
        {
            return this.currentConfig.seek;
        }
        else
        {
            return 0;
        }
    },

    set: function (value)
    {
        if (this.manager.isLocked(this, 'seek', value))
        {
            return;
        }
        if (this.startTime > 0)
        {
            return;
        }
        if (this.isPlaying || this.isPaused)
        {
            value = Math.min(Math.max(0, value), this.duration);
            if (this.isPlaying)
            {
                this.previousTime = value;
                this.audio.currentTime = value;
            }
            else if (this.isPaused)
            {
                this.currentConfig.seek = value;
            }

            /**
             * @event Phaser.Sound.HTML5AudioSound#seek
             * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
             * @param {number} value - An updated value of Phaser.Sound.HTML5AudioSound#seek property.
             */
            this.emit('seek', this, value);
        }
    }
});

/**
 * Property indicating whether or not
 * the sound or current sound marker will loop.
 *
 * @name Phaser.Sound.HTML5AudioSound#loop
 * @type {boolean}
 */
Object.defineProperty(HTML5AudioSound.prototype, 'loop', {

    get: function ()
    {
        return this.currentConfig.loop;
    },

    set: function (value)
    {
        this.currentConfig.loop = value;
        if (this.manager.isLocked(this, 'loop', value))
        {
            return;
        }
        if (this.audio)
        {
            this.audio.loop = value;
        }

        /**
         * @event Phaser.Sound.HTML5AudioSound#loop
         * @param {Phaser.Sound.HTML5AudioSound} sound - Reference to the sound that emitted event.
         * @param {boolean} value - An updated value of Phaser.Sound.HTML5AudioSound#loop property.
         */
        this.emit('loop', this, value);
    }

});

module.exports = HTML5AudioSound;
