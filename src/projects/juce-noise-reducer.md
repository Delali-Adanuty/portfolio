---
layout: project.njk
title: JUCE Noise Reducer
description: A real-time noise reduction engine that attenuates background hiss
  from live microphone input using spectral subtraction. The algorithm was first
  proven out in MATLAB, then rebuilt as a real-time C++ audio engine in JUCE,
  running as either a standalone desktop app or a VST3/AU plugin. A Voice
  Activity Detector tracks the room's noise profile continuously and pauses
  updates the moment speech is detected, so the ambient floor gets attenuated
  without cutting into the voice itself.
tech: C++, Python, MATLAB, JUCE
github: https://github.com/Delali-Adanuty/NoiseReductionJUCE
date: 2026-07-02T00:26:00.000-04:00
---
# Real-Time Noise Reducer (Standalone App & Plugin)

## Why I Built This
A noise gate mutes audio below a set threshold. The moment someone starts to talk, the gate opens and you hear the background hiss again. I wanted something better: a processor that measures the room's noise spectrum and subtracts it from every frame, so the noise floor drops even while someone is speaking.

## The Approach
I split the build into two phases. First, I proved the spectral subtraction math in MATLAB. The script estimates the noise spectrum from the first half-second of audio and subtracts it from the rest of the signal. A spectral floor stops heavily subtracted bins from reaching zero. An inverse STFT then rebuilds the audio.

Moving that into a real-time C++/JUCE engine was not a one-to-one port. A plugin gets audio in unpredictable block sizes and has strict audio-thread deadlines. So I built:

- **Ring buffers** to decouple the host's block size from my fixed 512-point FFT.
- **Overlap-add reconstruction** with a Hann window and a 256-sample hop (50% overlap).
- **A real-time voice activity detector (VAD).** A plugin can't "look at the first 0.5 seconds" the way a MATLAB script can. Instead, the VAD learns the noise spectrum from the first 20 non-silent frames. After that, it marks a frame as speech when its energy is more than 2× the noise estimate. The noise estimate freezes during speech. Between words, it rises quickly when the noise gets louder and falls slowly when it gets quieter.

## What Tripped Me Up
**A noise estimate stuck at zero.** At startup, the microphone sent pure digital silence for a short time. The VAD used those silent frames for its 20-frame learning phase, so the noise estimate became exactly 0. With a zero estimate, every later frame looked like speech, so the estimate never updated again. I added a digital-silence threshold: frames with almost no energy don't count toward learning.

**Output gain off by 2× — and by 54 dB.** My output was twice the input level. I had also added a 1/N scale after the inverse FFT, and that made it 54 dB too quiet. Two facts explained it. JUCE's inverse FFT already scales by 1/N, so my extra factor applied it twice. And JUCE's Hann window is normalized by default, so its mean is 1.0 and its peak is about 2.0. Two of those windows at 50% overlap add to about 2.0. (A plain Hann window adds to 1.0.) I removed the extra 1/N and multiplied the overlap-add output by 0.5. Finding *why* a "correct" pipeline was 6 dB too hot took real signal-flow debugging, not just re-reading the equations.

I used an AI assistant as a pair programmer through much of this. It mainly helped me trace memory states and rule out debugging theories faster.

## Results
I recorded speech with background noise through the plugin at 48 kHz and analyzed the input and output in Python.

- **Fan noise:** 15–20 dB of reduction from 4 kHz to 20 kHz. Below 3.5 kHz, the reduction is 3–10 dB. Most speech energy is in that band, and speech bins are much louder than the noise estimate, so the subtraction removes a smaller fraction there. (The VAD doesn't cause this: it makes one decision per frame and does not select frequency bands.)
- **White noise:** about 19–20 dB from 200 Hz to 16 kHz.
- **City noise:** 6–17 dB. City noise is not stationary, so it is harder to subtract.
- **Noise vs. speech:** in the 300 Hz–3 kHz band, noise-only frames dropped 16.3 dB and speech frames dropped 9.7 dB, so the plugin removes much more from noise than from speech.
- **Latency:** 512 samples, or 10.7 ms at 48 kHz. I confirmed it by aligning the input and output recordings.


## Technical Deep-Dive
For the full signal path, test results, and known issues, see the [technical documentation](https://delali-adanuty.github.io/NoiseReductionJUCE/).
