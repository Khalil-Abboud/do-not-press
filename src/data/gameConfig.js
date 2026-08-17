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
    cost: 100,
    damageMultiplier: 0.5,
    durationMs: 180,
};

const BUTTONS = [
    {
        name: "FINGER BREAKER",
        buttonText: "DO NOT PRESS",
        // buttonText: "",
        durability: 120,
        pressReward: 0,
        breakReward: 50,
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
        breakReward: 200,
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
        breakReward: 1000,
        damagePerSecond: 8,
        colorClass: "green-button",
        defeatMessage: "YOU WON. YOUR FINGER DIDN'T.",
    },
    {
        name: "THE GOLDEN TROLL",
        buttonText: "😏 YOU CAME THIS FAR FOR A BUTTON?",
        durability: 10000,
        pressReward: 0,
        breakReward: 2500,
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
    },
];

const RUN_RULES = {
    // bossBreakDamage: 0,
    restartCooldownSeconds: 3,
    healthTickMs: 50,
    stageDamagePerSecond: 1,
};

const SMALL_BUTTON_PHASE = {
    durationSeconds: 10,
    spawnIntervalMs: 2000,
    maxActiveButtons: 16,
    breakDurationMs: 100,
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
        durabilityMultiplier: 5,
        rewardMultiplier: 3,
    },
    {
        durabilityMultiplier: 10,
        rewardMultiplier: 6,
    },
    {
        durabilityMultiplier: 20,
        rewardMultiplier: 12,
    },
];
export {
    BUTTONS,
    SMALL_BUTTONS,
    POWER_UPGRADE,
    HEALTH_UPGRADE,
    REPAIR_KIT,
    CHAIN_LIGHTNING,
    RUN_RULES,
    SMALL_BUTTON_PHASE,
    SPAWN_SPEED_UPGRADE,
    SMALL_BUTTON_STAGE_SCALING,
};