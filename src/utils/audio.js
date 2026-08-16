function playBreakSound(duration = 1) {
    const audioContext = new AudioContext();
    const sampleRate = audioContext.sampleRate;

    const audioBuffer = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
    );

    const soundData = audioBuffer.getChannelData(0);

    for (let i = 0; i < soundData.length; i++) {
        const progress = i / soundData.length;
        const fadeOut = Math.pow(1 - progress, 3);
        const noise = Math.random() * 2 - 1;

        soundData[i] = noise * fadeOut;
    }

    const soundSource = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const volume = audioContext.createGain();

    soundSource.buffer = audioBuffer;

    filter.type = "highpass";
    filter.frequency.value = 500;

    volume.gain.setValueAtTime(
        0.25,
        audioContext.currentTime,
    );

    volume.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration,
    );

    soundSource.connect(filter);
    filter.connect(volume);
    volume.connect(audioContext.destination);

    soundSource.start();

    soundSource.addEventListener("ended", () => {
        audioContext.close();
    });
}

export { playBreakSound };