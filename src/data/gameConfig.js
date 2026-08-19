const POWER_UPGRADE = {
    basePower: 1,
    powerPerLevel: 1,
    baseCost: 10,
};

const HEALTH_UPGRADE = {
    baseHealth: 10,
    healthPerLevel: 5,
    baseCost: 10,
};

const REPAIR_KIT = {
    baseCost: 15,
    healPercentage: 0.5,
};

const CHAIN_LIGHTNING = {
    durationMs: 180,
    jumpDelayMs: 60,

    levels: [
        {
            cost: 0,
            damageMultipliers: [],
        },
        {
            cost: 100,
            damageMultipliers: [0.5],
        },
        {
            cost: 500,
            damageMultipliers: [0.5, 0.25],
        },
    ],
};

const BUTTONS = [
    {
        name: "FINGER BREAKER",
        buttonText: "DO NOT PRESS",
        // buttonText: "",
        durability: 120,
        pressReward: 0,
        breakReward: 25,
        damagePerSecond: 2,
        colorClass: "red-button",
        defeatMessage: "LUCKY. THE NEXT ONE HITS BACK.",
    },
    {
        name: "Mouse nightmare",
        buttonText: "🤨 STILL CLICKING?",
        // buttonText: "",
        durability: 500,
        pressReward: 0,
        breakReward: 100,
        damagePerSecond: 4,
        colorClass: "blue-button",
        defeatMessage: "STILL CLICKING? YOUR FINGER HAS ISSUES.",
    },
    {
        name: "THE UNPRESSABLE",
        buttonText: "🫵 YOUR FINGER ASKED FOR THIS",
        // buttonText: "",
        durability: 2000,
        pressReward: 0,
        breakReward: 500,
        damagePerSecond: 8,
        colorClass: "green-button",
        defeatMessage: "YOU WON. YOUR FINGER DIDN'T.",
    },
    {
        name: "THE GOLDEN TROLL",
        buttonText: "😏 YOU CAME THIS FAR FOR A BUTTON?",
        durability: 10000,
        pressReward: 0,
        breakReward: 1000,
        damagePerSecond: 16,
        colorClass: "yellow-button",
        defeatMessage: "CONGRATS. YOU DEFEATED BASIC JUDGMENT.",
    },
];

const SMALL_BUTTONS = [
    {
        name: "SMALL BUTTON",
        durability: 10,
        pressReward: 0,
        breakReward: 2,
        healAmount: 0,
        colorClass: "",
    },
    {
        name: "HEALING BUTTON",
        durability: 10,
        pressReward: 0,
        breakReward: 2,
        healAmount: 5,
        colorClass: "healing-small-button",
    },
];

const HEALING_BUTTON_UPGRADE = {
    buttonTypeIndex: 1,
    levels: [
        {
            cost: 0,
            spawnChance: 0,
        },
        {
            cost: 100,
            spawnChance: 0.1,
        },
        {
            cost: 300,
            spawnChance: 0.15,
        },
        {
            cost: 750,
            spawnChance: 0.2,
        },
    ],
};

const RUN_RULES = {
    // bossBreakDamage: 0,
    restartCooldownSeconds: 3,
    healthTickMs: 50,
    stageDamagePerSecond: 1,
};

const SMALL_BUTTON_PHASE = {
    durationSeconds: 10,
    spawnIntervalMs: 2000,
    maxActiveButtons: 24,
    breakDurationMs: 100,
};

const GOLDEN_RUSH = {
    durationSeconds: 10,
    spawnIntervalMs: 250,
    buttonLifetimeMs: 1200,
    breakDurationMs: 250,
    maxActiveButtons: 6,
    rewardMultiplier: 3,
};

const RED_LIGHT_EVENT = {
    durationSeconds: 30,
    caughtDurationMs: 4000,
    warningDurationMs: 250,
    greenDurationRangeMs: [1800, 2800],
    redDurationRangeMs: [1200, 1800],
    appearances: [
        {
            requiredTotalPresses: 200,
            targetHits: 50,
            reward: 150,
        },
        {
            requiredTotalPresses: 500,
            targetHits: 65,
            reward: 350,
        },
        {
            requiredTotalPresses: 1000,
            targetHits: 80,
            reward: 750,
        },
    ],
};

const POLARITY_EVENT = {
    buttonBreakStaggerMs: 60,
    breakDurationMs: 300,
    resultDelayMs: 800,
    attempts: [
        {
            cost: 100,
            buttonCount: 6,
            waves: 2,
            waveDurationSeconds: 7,
            rewardPerButton: 20,
        },
        {
            cost: 300,
            buttonCount: 8,
            waves: 3,
            waveDurationSeconds: 6,
            rewardPerButton: 30,
        },
        {
            cost: 800,
            buttonCount: 10,
            waves: 3,
            waveDurationSeconds: 5,
            rewardPerButton: 60,
        },
    ],
};

const SPAWN_SPEED_UPGRADE = {
    levels: [
        {
            multiplier: 1,
            cost: 0,
        },
        {
            multiplier: 1.5,
            cost: 20,
        },
        {
            multiplier: 2,
            cost: 50,
        },
        {
            multiplier: 3,
            cost: 100,
        },
        {
            multiplier: 5,
            cost: 250,
        },
        {
            multiplier: 8,
            cost: 500,
        },
    ],
};

const SMALL_BUTTON_STAGE_SCALING = [
    {
        durabilityMultiplier: 1,
        rewardMultiplier: 1,
    },
    {
        durabilityMultiplier: 3,
        rewardMultiplier: 2,
    },
    {
        durabilityMultiplier: 6,
        rewardMultiplier: 4,
    },
    {
        durabilityMultiplier: 12,
        rewardMultiplier: 8,
    },
];
export {
    BUTTONS,
    SMALL_BUTTONS,
    HEALING_BUTTON_UPGRADE,
    POWER_UPGRADE,
    HEALTH_UPGRADE,
    REPAIR_KIT,
    CHAIN_LIGHTNING,
    RUN_RULES,
    SMALL_BUTTON_PHASE,
    GOLDEN_RUSH,
    RED_LIGHT_EVENT,
    POLARITY_EVENT,
    SPAWN_SPEED_UPGRADE,
    SMALL_BUTTON_STAGE_SCALING,
};
