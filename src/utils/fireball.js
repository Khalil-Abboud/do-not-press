function chooseFireballLaneX(buttons, bossPosition) {
    const targetPositions = buttons
        .filter((button) => !button.isBreaking)
        .map((button) => button.position);

    if (bossPosition) {
        targetPositions.push(bossPosition);
    }

    if (targetPositions.length === 0) {
        return null;
    }

    const randomTargetIndex = Math.floor(Math.random() * targetPositions.length);
    return targetPositions[randomTargetIndex].x;
}

function isPositionInsideFireballLane(position, laneX, laneWidthPercent) {
    if (!position) {
        return false;
    }

    return Math.abs(position.x - laneX) <= laneWidthPercent / 2;
}

function findButtonsInsideFireballLane(buttons, laneX, laneWidthPercent) {
    return buttons.filter(
        (button) =>
            !button.isBreaking &&
            isPositionInsideFireballLane(button.position, laneX, laneWidthPercent),
    );
}

export {
    chooseFireballLaneX,
    isPositionInsideFireballLane,
    findButtonsInsideFireballLane,
};
