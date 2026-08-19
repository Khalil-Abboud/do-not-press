const GAME_SAVE_KEY = "doNotPressSave";
const GAME_SAVE_VERSION = 1;

const DEFAULT_GAME_SAVE = {
    version: GAME_SAVE_VERSION,
    progress: {
        energy: 0,
        highestUnlockedStage: 0,
        totalManualPresses: 0,
        bestScore: 0,
    },
    upgrades: {
        powerLevel: 0,
        healthLevel: 0,
        spawnSpeedLevel: 0,
        chainLightningLevel: 0,
        healingButtonLevel: 0,
        autoFingerLevel: 0,
        fireballLevel: 0,
    },
    inventory: {
        healItemCount: 0,
    },
    events: {
        completedGoldenRushes: [],
        completedRedLightEvents: [],
        polarityEventsPlayed: 0,
        pendingPolarityEventIndex: -1,
        hasSeenIntro: false,
        hasSeenEnding: false,
    },
};

function createDefaultGameSave() {
    return {
        ...DEFAULT_GAME_SAVE,
        progress: { ...DEFAULT_GAME_SAVE.progress },
        upgrades: { ...DEFAULT_GAME_SAVE.upgrades },
        inventory: { ...DEFAULT_GAME_SAVE.inventory },
        events: {
            ...DEFAULT_GAME_SAVE.events,
            completedGoldenRushes: [],
            completedRedLightEvents: [],
        },
    };
}

function normalizeNumber(value, defaultValue) {
    return Number.isFinite(value) ? value : defaultValue;
}

function normalizeArray(value) {
    return Array.isArray(value) ? value : [];
}

function normalizeGameSave(savedGame) {
    const defaults = createDefaultGameSave();
    const progress = savedGame?.progress ?? {};
    const upgrades = savedGame?.upgrades ?? {};
    const inventory = savedGame?.inventory ?? {};
    const events = savedGame?.events ?? {};

    return {
        version: GAME_SAVE_VERSION,
        progress: {
            energy: normalizeNumber(progress.energy, defaults.progress.energy),
            highestUnlockedStage: normalizeNumber(progress.highestUnlockedStage, defaults.progress.highestUnlockedStage),
            totalManualPresses: normalizeNumber(progress.totalManualPresses, defaults.progress.totalManualPresses),
            bestScore: normalizeNumber(progress.bestScore, defaults.progress.bestScore),
        },
        upgrades: {
            powerLevel: normalizeNumber(upgrades.powerLevel, defaults.upgrades.powerLevel),
            healthLevel: normalizeNumber(upgrades.healthLevel, defaults.upgrades.healthLevel),
            spawnSpeedLevel: normalizeNumber(upgrades.spawnSpeedLevel, defaults.upgrades.spawnSpeedLevel),
            chainLightningLevel: normalizeNumber(upgrades.chainLightningLevel, defaults.upgrades.chainLightningLevel),
            healingButtonLevel: normalizeNumber(upgrades.healingButtonLevel, defaults.upgrades.healingButtonLevel),
            autoFingerLevel: normalizeNumber(upgrades.autoFingerLevel, defaults.upgrades.autoFingerLevel),
            fireballLevel: normalizeNumber(upgrades.fireballLevel, defaults.upgrades.fireballLevel),
        },
        inventory: {
            healItemCount: normalizeNumber(inventory.healItemCount, defaults.inventory.healItemCount),
        },
        events: {
            completedGoldenRushes: normalizeArray(events.completedGoldenRushes),
            completedRedLightEvents: normalizeArray(events.completedRedLightEvents),
            polarityEventsPlayed: normalizeNumber(events.polarityEventsPlayed, defaults.events.polarityEventsPlayed),
            pendingPolarityEventIndex: normalizeNumber(events.pendingPolarityEventIndex, defaults.events.pendingPolarityEventIndex),
            hasSeenIntro: events.hasSeenIntro === true,
            hasSeenEnding: events.hasSeenEnding === true,
        },
    };
}

function loadGameSave() {
    const savedValue = localStorage.getItem(GAME_SAVE_KEY);

    if (savedValue === null) {
        return createDefaultGameSave();
    }

    try {
        return normalizeGameSave(JSON.parse(savedValue));
    } catch {
        return createDefaultGameSave();
    }
}

function saveGameSave(gameSave) {
    const normalizedSave = normalizeGameSave(gameSave);
    localStorage.setItem(GAME_SAVE_KEY, JSON.stringify(normalizedSave));
}

export { GAME_SAVE_KEY, loadGameSave, saveGameSave };
