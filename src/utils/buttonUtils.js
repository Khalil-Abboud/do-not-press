import {
    SMALL_BUTTONS,
    SMALL_BUTTON_STAGE_SCALING,
} from "../data/gameConfig";

function createRandomPosition() {
    return {
        x: 12 + Math.random() * 76,
        y: 15 + Math.random() * 70,
    };
}

function createSmallButtonInstance(stageIndex = 0) {
    const typeIndex = 0;
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
        position: createRandomPosition(),
        isBreaking: false,
    };
}

export { createSmallButtonInstance };