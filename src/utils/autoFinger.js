function getDistanceSquared(firstPosition, secondPosition) {
    const horizontalDistance = firstPosition.x - secondPosition.x;
    const verticalDistance = firstPosition.y - secondPosition.y;
    return horizontalDistance ** 2 + verticalDistance ** 2;
}

function findNearestAutoFingerTarget(buttons, fingerPosition) {
    const availableButtons = buttons.filter((button) => !button.isBreaking && button.durability > 0);

    return availableButtons.reduce((nearestButton, button) => {
        if (nearestButton === null) {
            return button;
        }

        const buttonDistance = getDistanceSquared(button.position, fingerPosition);
        const nearestDistance = getDistanceSquared(nearestButton.position, fingerPosition);
        return buttonDistance < nearestDistance ? button : nearestButton;
    }, null);
}

export { findNearestAutoFingerTarget };
