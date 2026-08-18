import {
    SMALL_BUTTONS,
    SMALL_BUTTON_STAGE_SCALING,
    HEALING_BUTTON_UPGRADE,
    GOLDEN_RUSH,
} from "../data/gameConfig";

function createRandomPosition() {
    return {
        x: 12 + Math.random() * 76,
        y: 15 + Math.random() * 70,
    };
}

function createSmallButtonInstance(stageIndex = 0, healingButtonLevel = 0) {
    const healingButtonChance = HEALING_BUTTON_UPGRADE.levels[healingButtonLevel].spawnChance;
    const typeIndex = Math.random() < healingButtonChance ? HEALING_BUTTON_UPGRADE.buttonTypeIndex : 0;
    const buttonType = SMALL_BUTTONS[typeIndex];
    const stageScaling =
        SMALL_BUTTON_STAGE_SCALING[stageIndex];

    const maxDurability =
        buttonType.durability *
        stageScaling.durabilityMultiplier;

    const breakReward =
        buttonType.breakReward *
        stageScaling.rewardMultiplier;

    return {
        id: crypto.randomUUID(),
        typeIndex: typeIndex,
        stageIndex: stageIndex,
        durability: maxDurability,
        maxDurability: maxDurability,
        breakReward: breakReward,
        healAmount: buttonType.healAmount,
        position: createRandomPosition(),
        isBreaking: false,
    };
}

function createGoldenButtonInstance(stageIndex = 0) {
    const normalButtonType = SMALL_BUTTONS[0];
    const stageScaling = SMALL_BUTTON_STAGE_SCALING[stageIndex];
    const breakReward = normalButtonType.breakReward * stageScaling.rewardMultiplier * GOLDEN_RUSH.rewardMultiplier;

    return {
        id: crypto.randomUUID(),
        stageIndex: stageIndex,
        breakReward: breakReward,
        position: createRandomPosition(),
        createdAt: Date.now(),
        isBreaking: false,
    };
}

export { createSmallButtonInstance, createGoldenButtonInstance };
