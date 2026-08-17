const LIGHTNING_SEGMENTS = 10;
const LIGHTNING_JITTER = 4;

function findNearestSmallButton(sourceButton, buttons) {
    let nearestButton = null;
    let shortestDistance = Infinity;

    buttons.forEach((button) => {
        if (
            button.id === sourceButton.id ||
            button.isBreaking ||
            button.durability <= 0
        ) {
            return;
        }

        const horizontalDistance =
            button.position.x - sourceButton.position.x;

        const verticalDistance =
            button.position.y - sourceButton.position.y;

        const distance = Math.hypot(
            horizontalDistance,
            verticalDistance,
        );

        if (distance < shortestDistance) {
            shortestDistance = distance;
            nearestButton = button;
        }
    });

    return nearestButton;
}

function findLightningChain(sourceButton, buttons, maxTargets) {
    const targets = [];
    const excludedIds = new Set([sourceButton.id]);
    let currentSource = sourceButton;

    for (let index = 0; index < maxTargets; index++) {
        const availableButtons = buttons.filter(
            (button) => !excludedIds.has(button.id),
        );

        const nearestButton = findNearestSmallButton(
            currentSource,
            availableButtons,
        );

        if (!nearestButton) {
            break;
        }

        targets.push(nearestButton);
        excludedIds.add(nearestButton.id);
        currentSource = nearestButton;
    }

    return targets;
}

function createLightningPoints(from, to) {
    const points = [];

    const horizontalDistance = to.x - from.x;
    const verticalDistance = to.y - from.y;

    const totalDistance = Math.hypot(
        horizontalDistance,
        verticalDistance,
    );

    if (totalDistance === 0) {
        return `${from.x},${from.y}`;
    }

    const perpendicularX =
        -verticalDistance / totalDistance;

    const perpendicularY =
        horizontalDistance / totalDistance;

    for (
        let index = 0;
        index <= LIGHTNING_SEGMENTS;
        index++
    ) {
        const progress =
            index / LIGHTNING_SEGMENTS;

        let x =
            from.x + horizontalDistance * progress;

        let y =
            from.y + verticalDistance * progress;

        if (
            index !== 0 &&
            index !== LIGHTNING_SEGMENTS
        ) {
            const middleStrength =
                Math.sin(Math.PI * progress);

            const randomOffset =
                (Math.random() * 2 - 1) *
                LIGHTNING_JITTER *
                middleStrength;

            x += perpendicularX * randomOffset;
            y += perpendicularY * randomOffset;
        }

        points.push(
            `${x.toFixed(2)},${y.toFixed(2)}`,
        );
    }

    return points.join(" ");
}

function createLightningBranches(mainPoints) {
    const parsedPoints = mainPoints
        .split(" ")
        .map((point) => {
            const [x, y] = point
                .split(",")
                .map(Number);

            return { x, y };
        });

    const mainStart = parsedPoints[0];

    const mainEnd =
        parsedPoints[parsedPoints.length - 1];

    const mainLength = Math.hypot(
        mainEnd.x - mainStart.x,
        mainEnd.y - mainStart.y,
    );

    const branches = [];

    const branchCount =
        mainLength < 15
            ? 1
            : mainLength < 35
                ? 2
                : 3;

    for (
        let index = 0;
        index < branchCount;
        index++
    ) {
        const startIndex =
            2 +
            Math.floor(
                Math.random() *
                (parsedPoints.length - 4),
            );

        const start = parsedPoints[startIndex];
        const previous = parsedPoints[startIndex - 1];
        const next = parsedPoints[startIndex + 1];

        const directionX = next.x - previous.x;
        const directionY = next.y - previous.y;

        const directionLength = Math.hypot(
            directionX,
            directionY,
        );

        if (directionLength === 0) {
            continue;
        }

        const forwardX =
            directionX / directionLength;

        const forwardY =
            directionY / directionLength;

        const perpendicularX = -forwardY;
        const perpendicularY = forwardX;

        const side =
            Math.random() < 0.5 ? -1 : 1;

        const maximumBranchLength = Math.min(
            7,
            Math.max(
                0.8,
                mainLength * 0.18,
            ),
        );

        const branchLength =
            maximumBranchLength *
            (0.55 + Math.random() * 0.45);

        const endX = Math.min(
            98,
            Math.max(
                2,
                start.x +
                forwardX * branchLength * 0.35 +
                perpendicularX *
                branchLength *
                side,
            ),
        );

        const endY = Math.min(
            98,
            Math.max(
                2,
                start.y +
                forwardY * branchLength * 0.35 +
                perpendicularY *
                branchLength *
                side,
            ),
        );

        const middleX =
            start.x +
            (endX - start.x) * 0.5 +
            perpendicularX *
            (Math.random() - 0.5) *
            1.5;

        const middleY =
            start.y +
            (endY - start.y) * 0.5 +
            perpendicularY *
            (Math.random() - 0.5) *
            1.5;

        branches.push(
            `${start.x},${start.y} ` +
            `${middleX.toFixed(2)},${middleY.toFixed(2)} ` +
            `${endX.toFixed(2)},${endY.toFixed(2)}`,
        );
    }

    return branches;
}

export {
    findLightningChain,
    createLightningPoints,
    createLightningBranches,
};
