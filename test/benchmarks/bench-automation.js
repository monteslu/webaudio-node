/**
 * Benchmark: AudioParam Automation
 *
 * Tests AudioParam scheduling and automation performance.
 * Schedules many automation events and measures processing overhead.
 */

export async function benchmarkAutomation(OfflineAudioContext, numEvents = 1000, iterations = 5) {
    const sampleRate = 48000;
    const duration = 2.0; // 2 seconds
    const length = sampleRate * duration;

    const times = [];

    for (let iter = 0; iter < iterations; iter++) {
        const ctx = new OfflineAudioContext({
            numberOfChannels: 2,
            length: length,
            sampleRate: sampleRate
        });

        const osc = ctx.createOscillator();
        osc.frequency.value = 440;

        const gain = ctx.createGain();
        gain.gain.value = 0.0;

        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(0);

        // Schedule many automation events
        const scheduleStart = performance.now();
        for (let i = 0; i < numEvents; i++) {
            const time = (i / numEvents) * duration;
            const value = Math.sin(i / 10) * 0.5 + 0.5;

            if (i % 3 === 0) {
                gain.gain.setValueAtTime(value, time);
            } else if (i % 3 === 1) {
                gain.gain.linearRampToValueAtTime(value, time);
            } else {
                gain.gain.exponentialRampToValueAtTime(Math.max(0.01, value), time);
            }
        }
        const scheduleTime = performance.now() - scheduleStart;

        // Measure rendering time (includes automation processing)
        const renderStart = performance.now();
        await ctx.startRendering();
        const renderTime = performance.now() - renderStart;

        times.push({
            scheduleTime: scheduleTime,
            renderTime: renderTime,
            totalTime: scheduleTime + renderTime
        });
    }

    // Calculate statistics
    const avgScheduleTime = times.reduce((a, b) => a + b.scheduleTime, 0) / times.length;
    const avgRenderTime = times.reduce((a, b) => a + b.renderTime, 0) / times.length;
    const avgTotalTime = times.reduce((a, b) => a + b.totalTime, 0) / times.length;

    return {
        avgTimeMs: avgTotalTime, // For compatibility with benchmark runner
        numEvents: numEvents,
        avgScheduleTimeMs: avgScheduleTime,
        avgRenderTimeMs: avgRenderTime,
        avgTotalTimeMs: avgTotalTime,
        eventsPerSecSchedule: (numEvents / avgScheduleTime) * 1000,
        iterations: iterations
    };
}
