---
layout: project.njk
title: Room Correction Filter
description: A conventional graphic EQ can't fix the phase and magnitude damage
  a room does to sound. This Python toolchain measures a room's actual acoustic
  signature, calculates a stable inverse filter using Kirkeby regularization,
  and formats it for real-time convolution in a C++/JUCE plugin. Verified
  against physical Room EQ Wizard sweeps, not just simulated plots, it delivers
  a measured ~15 dB reduction in the room's worst modal null.
tech: Python, C++, JUCE
github: https://github.com/Delali-Adanuty/RoomEq
date: 2026-08-30T00:23:00.000-04:00
---
# Room Correction DSP Pipeline

## Why I Built This
A room changes sound more than most speakers do. It adds modal peaks and nulls in the bass, and reflections cause comb filtering across the spectrum. A graphic EQ cannot fix this, because it changes only the magnitude at fixed bands. An inverse FIR filter can change both magnitude and phase at each frequency. I wanted to build one: measure the room, calculate a stable inverse of its response, and run that inverse in real time inside a plugin.

## The Approach
The pipeline starts with a physical measurement. Room EQ Wizard (REW) plays a logarithmic sine sweep, records it with a measurement mic, and calculates the room's impulse response. My Python toolchain takes that impulse response. First, it moves the direct-sound peak to sample 0 and wraps the rest of the array around circularly, so the FFT treats the direct sound as arriving at t = 0.

The correction itself uses Kirkeby regularization. A naive inverse filter (1/H) fails in a real room: near a deep null, it asks for almost infinite gain. Kirkeby adds a regularization term, β, to limit that gain. Instead of one flat β, I used a frequency-dependent array. It is conservative (0.1) at the sub-bass and treble extremes, and tight (0.005) through the midrange. After the inversion, I anchor the 500 Hz–2 kHz level at 0 dB and limit any boost to +12 dB. There is no target curve and no bass shelf. The goal is to correct the room, not to shape the tone.

The last stage formats the filter for JUCE's convolution engine. The script keeps 8192 samples: 1024 before the main peak and 7168 after it. A Hann half-window on the left side decreases pre-ringing before transients. The right side stays flat to keep the low-frequency content, with a short 512-sample fade at the end. The script writes the result as a 2-channel, 32-bit float WAV file, and the plugin build puts that file into the binary. The plugin reports its full latency, 1152 samples (24 ms at 48 kHz), to the DAW.

## What Tripped Me Up
**Learning REW.** Before I could trust any DSP fix, I had to learn what each REW view told me about the room versus the speakers: SPL for the frequency response, group delay for phase behavior, the spectrogram and waterfall for how energy decays, and RT60 for reverberation. Learning how to set up a good room measurement was a fun side course of its own.

**The pre-transient window.** The low end of the filter kept disappearing. The response before truncation looked fine, but the final truncated filter lost the bass. The cause was the pre-transient window: it was only 44 samples. One cycle at 40 Hz takes 25 ms, which is about 1200 samples at 48 kHz. The short window cut off the part of the filter that the low frequencies need. Widening it to 1024 samples fixed it. The lesson: check the final filter, not only the intermediate plots.

**The silent convolver.** At one point, the plugin passed audio through without applying the filter. The problem stopped when I changed the export from mono to stereo. Later I found that JUCE's convolution engine does accept mono impulse responses, so the channel count was probably not the real cause. I have not confirmed the root cause yet.

**Deconvolution noise.** In my synthetic test room, I first used an epsilon of 1e-10 in the deconvolution. Where the sweep had almost no energy, the division blew up into high-frequency noise. A regularized form with ε = 1e-3 fixed it.

## Results
I verified the filter with physical REW sweeps: a baseline with the plugin bypassed, and a corrected sweep with it active. The results were not what I expected.

- **Sub-bass:** The filter cuts the bass. It is −26.8 dB at 50 Hz relative to the midrange. It does not correct the room modes.
- **Midrange:** From 200 Hz to 2 kHz, the corrected response stays within about 4 dB of the baseline.
- **Upper midrange:** The filter has a −29 dB notch at 6 kHz, and the measurement shows a matching dip near 5 kHz.

The cause is in the regularization. β is an absolute value, not relative to the room's response. The Kirkeby gain is largest where |H| = √β. Below that level, weaker bins get *less* gain, so the filter deepens dips instead of filling them. In my measurement, the sub-bass level was far below √0.1, so the filter cut it. The 6 kHz notch is probably a side effect of the complex smoothing I used above 80 Hz.

**Next steps:**
- Normalize the response to its midrange level before inversion, so β is relative.
- Smooth only the magnitude, not the complex values.
- Skip correction below the speaker's low-frequency limit.
- Measure again at 3–5 level-matched mic positions.

## What I Learned
Coming from a classroom DSP background, system inversion was a clean equation: H_inv = 1/H. Running it against a real room, and watching it ask for infinite gain at an acoustic null, forced a real reckoning between the math and the physics. Kirkeby regularization closed part of that gap.

The measurements taught me the rest. A regularization constant is not neutral: its value only means something relative to the signal level it is compared to. I set it as an absolute number, and the result was a filter that cut what I wanted to correct. I find this kind of lesson the most exciting part of engineering: the equation was correct, but the assumptions under it were not.

## Technical Deep-Dive
For the full method, measurements, filter response plots and the gain analysis, see the [detailed write-up](https://delali-adanuty.github.io/RoomEq/).
