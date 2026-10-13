---
layout: post.njk
title: High-Impedance (Hi-Z) Instrument Input Design for the PCM1802 ADC
date: 2026-10-11T23:22:00.000-04:00
---
An electric guitar pickup cannot connect directly to an Analog-to-Digital Converter (ADC). This article explains the two main signal problems in guitar interfaces and shows how a custom analog front-end circuit solves them.


## 1. Signal Problems

### High Output Impedance (Hi-Z)

* Voltage Loss: If you connect a high-impedance (Hi-Z) guitar signal to a low-impedance (Low-Z) ADC input, the source impedance and the input impedance form a voltage divider. Because the source impedance is high, the pickup loses more than half of its signal voltage across its own internal resistance.

* High-Frequency Loss: A guitar pickup is a wire coil that acts as an inductor. When this inductor connects to a low-impedance input, the circuit forms a Low-Pass Filter (LPF). This filter removes middle and treble frequencies from the audio signal.


### Problem 2: 0V Center Voltage

## 2. Design Solutions and Buffer Comparison

1. Increase the input impedance to approximately 1 MΩ. Compared to the 15 kΩ pickup impedance, a 1 MΩ input impedance brings the voltage divider ratio close to 1. A voltage follower buffer then lowers the output impedance so the signal can safely drive the ADC.

2. Shift the center voltage to 2.5 V. A resistor voltage divider and a coupling capacitor offset the 0 V guitar signal to a 2.5 V DC reference.


### Buffer Architecture Comparison

## 3. Circuit Stage Breakdown

### Stage 1: Anti-Pop Resistor and Input Impedance

* Components: 10 MΩ resistor connected in parallel from the TRS tip (

  `J1`

  ) to analog ground (

  `AGND`

  ).

* Function: At audio frequencies, the 1 kΩ resistor and the 100 nF film capacitor act as a short circuit. The 10 MΩ resistor sits in parallel with the 1 MΩ bias resistor (10 MΩ || 1 MΩ). This combination keeps the total input impedance near 1 MΩ, which prevents pickup loading and preserves the pickup resonance.

* Static Discharge: When no cable is plugged into the jack, static electricity can build up on the left side of the 100 nF capacitor. The 10 MΩ resistor drains this static charge to ground and stops loud popping noises when you plug in a guitar.


### Stage 2: Radio Frequency (RF) Low-Pass Filter

* Components: 1 kΩ series resistor and 220 pF capacitor to ground.

* Function: Because a guitar pickup is a wire coil, it acts as an antenna and picks up Radio Frequency (RF) interference. The 1 kΩ resistor and 220 pF capacitor form a passive Low-Pass Filter (LPF).

* Cutoff Frequency:

  `fc = 1 / (2 * π * R * C) = 1 / (2 * π * 1 kΩ * 220 pF) ≈ 720 kHz`

  Human hearing ranges from 20 Hz to 20 kHz. A 720 kHz cutoff blocks high-frequency RF noise before it reaches the op-amp, while leaving the audible guitar signal untouched.


### Stage 3: AC Coupling and 2.5V DC Biasing

* Components: 100 nF film capacitor, 1 MΩ resistor, two 100 kΩ resistors, and a 10 µF capacitor.

* DC Blocking and High-Pass Filter: The 100 nF film capacitor blocks DC voltage and passes only the AC guitar signal. This stops the 2.5 V internal bias voltage from flowing backward into the guitar. Together with the 1 MΩ resistor, the 100 nF capacitor forms a High-Pass Filter (HPF):

  `fc = 1 / (2 * π * R * C) = 1 / (2 * π * 1 MΩ * 100 nF) ≈ 1.59 Hz`

  This filter blocks 0 Hz DC signals on both sides of the capacitor.

* Reference Voltage (

  `VREF`

  ) Generation: Two 100 kΩ resistors divide the 

  `+5V_A`

   analog supply in half to create a 2.5 V reference (

  `VREF`

  ). The 100 nF capacitor holds this 2.5 V offset across its plates, which shifts the center of the guitar signal from 0 V to 2.5 V.

* Power Supply Noise Filtering: A 10 µF capacitor connects from the 

  `VREF`

   node to ground. Combined with the parallel impedance of the two 100 kΩ divider resistors (50 kΩ equivalent), it creates a Low-Pass Filter:

  `fc = 1 / (2 * π * Req * C) = 1 / (2 * π * 50 kΩ * 10 µF) ≈ 0.32 Hz`

  This filter acts as an AC ground. It shunts AC power supply noise to ground and passes a clean 2.5 V DC voltage through the 1 MΩ resistor to the non-inverting (

  `+`

  ) input of the op-amp.


### Stage 4: Active Impedance Buffer

* Component: MCP6022 operational amplifier (

  `U1A`

  ).

* Function: The op-amp connects in a voltage follower configuration, where the output loops directly back to the inverting (

  `-`

  ) input. The op-amp keeps the output voltage equal to the input voltage (preserving all guitar voltage changes), but converts the high input impedance into a very low output impedance. This low impedance safely drives the ADC input stage.


### Stage 5: Output DC Block and Anti-Aliasing Filter

* Components: 10 µF Non-Polarized (NP) capacitor, 100 Ω resistor, and 1 nF capacitor.

* Output DC Blocking: The 10 µF non-polarized capacitor sits between the op-amp output and the ADC input. It blocks the 2.5 V DC bias voltage from the op-amp so the PCM1802 ADC can center the signal around its own internal reference without a DC offset.

* ADC Input Filter: The 100 Ω resistor and 1 nF capacitor form a final Low-Pass Filter at the 

  `VINL`

   pin of the PCM1802:

  `fc = 1 / (2 * π * R * C) = 1 / (2 * π * 100 Ω * 1 nF) ≈ 1.6 MHz`

  The PCM1802 uses an internal oversampling rate of 2.8 MHz and applies a digital filter to remove frequencies above 20 kHz. This 1.6 MHz hardware LPF removes high-frequency noise above 1.6 MHz before the ADC samples the signal.

When you connect a guitar directly to an ADC, two problems occur:
A guitar pickup produces a high voltage, but it cannot supply much electric current. The internal impedance of a guitar pickup is approximately 15 kΩ.
A guitar outputs an Alternating Current (AC) signal centered at 0 V. A single-supply operational amplifier (op-amp) and ADC cannot read negative voltage swings below 0 V. If the signal is not shifted to a positive Direct Current (DC) reference voltage, the negative half of the audio waveform clips.
To capture the full guitar signal without tone loss or clipping, the input circuit must do two things:
You can build an impedance buffer with an operational amplifier (op-amp) or a discrete Field-Effect Transistor (FET).
**FeatureOp-Amp Buffer (Voltage Follower)Discrete FET Buffer (Source Follower)**Circuit ComponentIntegrated circuit op-ampJFET or MOSFET transistorDistortion & ToneVery low Total Harmonic Distortion (THD); flat frequency responseProduces even-order harmonic distortion that adds color to the soundClipping BehaviorHarsh clipping at the supply railsSoft clippingOutput & GainVery low output impedance; unity voltage gain (1:1)Voltage gain loss; inconsistent performance across different transistor partsPower RequirementsTraditional designs require dual power rails (+15 V and -15 V) unless biased for a single supplyLow power consumptionFor a clean digital audio interface, we use the MCP6022 op-amp configured as a single-supply voltage follower. It provides a flat frequency response and drives the PCM1802 ADC accurately.
The complete analog front-end circuit processes the signal from the TRS input jack (`J1`) to the left input pin (`VINL`) of the PCM1802 ADC.
