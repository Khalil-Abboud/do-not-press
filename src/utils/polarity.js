const POLARITY_BUTTON_POSITIONS = [
    { x: 15, y: 24 },
    { x: 38, y: 20 },
    { x: 62, y: 20 },
    { x: 85, y: 24 },
    { x: 24, y: 50 },
    { x: 50, y: 46 },
    { x: 76, y: 50 },
    { x: 15, y: 76 },
    { x: 38, y: 72 },
    { x: 62, y: 72 },
    { x: 85, y: 76 },
];

function shufflePositions(positions) {
    const shuffledPositions = [...positions];

    for (let index = shuffledPositions.length - 1; index > 0; index -= 1) {
        const randomIndex = Math.floor(Math.random() * (index + 1));
        [shuffledPositions[index], shuffledPositions[randomIndex]] = [shuffledPositions[randomIndex], shuffledPositions[index]];
    }

    return shuffledPositions;
}

function createPolarityRushButtons(buttonCount, targetIsWhite) {
    const positions = shufflePositions(POLARITY_BUTTON_POSITIONS).slice(0, buttonCount);
    const wrongColorButtonCount = Math.ceil(buttonCount * 0.65);

    return positions.map((position, index) => ({
        id: crypto.randomUUID(),
        isWhite: index < wrongColorButtonCount ? !targetIsWhite : targetIsWhite,
        isBreaking: false,
        position: position,
    }));
}

function togglePolarityButton(buttons, buttonIndex) {
    return buttons.map((button, index) => index === buttonIndex ? { ...button, isWhite: !button.isWhite } : button);
}

function isPolarityWaveComplete(buttons, targetIsWhite) {
    return buttons.length > 0 && buttons.every((button) => button.isWhite === targetIsWhite);
}

export { createPolarityRushButtons, togglePolarityButton, isPolarityWaveComplete };
