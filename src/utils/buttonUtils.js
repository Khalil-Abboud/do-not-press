import { SMALL_BUTTONS } from "../data/gameConfig";

function createRandomPosition() {
    return {
        x: 12 + Math.random() * 76,
        y: 15 + Math.random() * 70,
    };
}

function createSmallButtonInstance() {
    const typeIndex = 0;
    const buttonType = SMALL_BUTTONS[typeIndex];

    return {
        id: crypto.randomUUID(),
        typeIndex: typeIndex,
        durability: buttonType.durability,
        position: createRandomPosition(),
        isBreaking: false,
    };
}

export { createSmallButtonInstance };