import { useEffect, useRef, useState } from "react";
import {
    BUTTONS,
    SMALL_BUTTONS,
    HEALING_BUTTON_UPGRADE,
    POWER_UPGRADE,
    HEALTH_UPGRADE,
    REPAIR_KIT,
    CHAIN_LIGHTNING,
    RUN_RULES,
    SMALL_BUTTON_PHASE,
    SPAWN_SPEED_UPGRADE,
} from "./data/gameConfig";
import { playBreakSound } from "./utils/audio"
import { createSmallButtonInstance } from "./utils/buttonUtils";
import { findLightningChain, createLightningPoints, createLightningBranches } from "./utils/lightning";
import LightningEffect from "./components/LightningEffect";

function getSavedNumber(key, defaultValue) {
    const savedValue = localStorage.getItem(key);

    if (savedValue === null) {
        return defaultValue;
    }

    return Number(savedValue);
}

export default function App() {
    const [presses, setPresses] = useState(0);
    const [buttonIndex, setButtonIndex] = useState(0);
    const currentButton = BUTTONS[buttonIndex];
    const [activeSmallButtons, setActiveSmallButtons,] = useState([]);
    const [lightningEffect, setLightningEffect] = useState(null);
    const [buttonDurability, setButtonDurability] = useState(
        BUTTONS[0].durability,);

    const [buttonsBroken, setButtonsBroken] = useState(0);
    const [energy, setEnergy] = useState(() =>
        getSavedNumber("energy", 0),);
    const [fingerHealth, setFingerHealth] = useState(0);
    const [isRunActive, setIsRunActive] = useState(false);
    const [gamePhase, setGamePhase] = useState("waiting");
    const [stageMessage, setStageMessage] = useState("");
    const [phaseTimeLeft, setPhaseTimeLeft] = useState(SMALL_BUTTON_PHASE.durationSeconds,);
    const [restartCooldown, setRestartCooldown] = useState(0);
    const [isButtonBreaking, setIsButtonBreaking] = useState(false);
    const [powerLevel, setPowerLevel] = useState(() =>
        getSavedNumber("powerLevel", 0),);
    const [healthLevel, setHealthLevel] = useState(() =>
        getSavedNumber("healthLevel", 0),);
    const [spawnSpeedLevel, setSpawnSpeedLevel] = useState(() =>
        getSavedNumber("spawnSpeedLevel", 0),);
    const [healItemCount, setHealItemCount] = useState(() =>
        getSavedNumber("healItemCount", 0),);
    const [healingButtonLevel, setHealingButtonLevel] = useState(() =>
        getSavedNumber("healingButtonLevel", 0),);
    const [chainLightningLevel, setChainLightningLevel] = useState(() => {
        const savedLevel = getSavedNumber("chainLightningLevel", getSavedNumber("hasChainLightning", 0));
        return Math.min(Math.max(savedLevel, 0), CHAIN_LIGHTNING.levels.length - 1);
    });

    const chainLightningLevels = CHAIN_LIGHTNING.levels;
    const currentChainLightning = chainLightningLevels[chainLightningLevel];
    const isChainLightningMax = chainLightningLevel === chainLightningLevels.length - 1;
    const nextChainLightning = isChainLightningMax ? null : chainLightningLevels[chainLightningLevel + 1];
    const chainLightningUpgradeCost = nextChainLightning ? nextChainLightning.cost : 0;
    const nextChainJumpIndex = currentChainLightning.damageMultipliers.length;
    const nextChainJumpDamageMultiplier = nextChainLightning ? nextChainLightning.damageMultipliers[nextChainJumpIndex] ?? 0 : 0;
    const hasChainLightning = chainLightningLevel > 0;

    const healingButtonLevels = HEALING_BUTTON_UPGRADE.levels;
    const currentHealingButton = healingButtonLevels[healingButtonLevel];
    const isHealingButtonMax = healingButtonLevel === healingButtonLevels.length - 1;
    const nextHealingButton = isHealingButtonMax ? null : healingButtonLevels[healingButtonLevel + 1];
    const healingButtonUpgradeCost = nextHealingButton ? nextHealingButton.cost : 0;
    const healingButtonHealAmount = SMALL_BUTTONS[HEALING_BUTTON_UPGRADE.buttonTypeIndex].healAmount;

    const healItemCost = REPAIR_KIT.baseCost * 2 ** healItemCount;

    const pressPower = POWER_UPGRADE.basePower + powerLevel * POWER_UPGRADE.powerPerLevel;
    const powerUpgradeCost = POWER_UPGRADE.baseCost * (powerLevel + 1);

    const maxFingerHealth = HEALTH_UPGRADE.baseHealth + healthLevel * HEALTH_UPGRADE.healthPerLevel;
    const healthUpgradeCost = HEALTH_UPGRADE.baseCost * (healthLevel + 1);

    const spawnSpeedLevels = SPAWN_SPEED_UPGRADE.levels;

    const currentSpawnSpeed =
        spawnSpeedLevels[spawnSpeedLevel];

    const spawnIntervalMs =
        SMALL_BUTTON_PHASE.spawnIntervalMs /
        currentSpawnSpeed.multiplier;

    const isSpawnSpeedMax =
        spawnSpeedLevel === spawnSpeedLevels.length - 1;

    const nextSpawnSpeed =
        isSpawnSpeedMax
            ? null
            : spawnSpeedLevels[spawnSpeedLevel + 1];

    const spawnSpeedUpgradeCost =
        nextSpawnSpeed ? nextSpawnSpeed.cost : 0;

    const nextSpawnSpeedBonus =
        nextSpawnSpeed
            ? (nextSpawnSpeed.multiplier - 1) * 100
            : null;

    const musicRef = useRef(null);
    const chamberRef = useRef(null);
    const bossButtonRef = useRef(null);

    const isFingerExhausted = fingerHealth === 0;

    let startMessage;

    if (restartCooldown > 0) {
        startMessage =
            `FINGER RECOVERY... ${restartCooldown}`;
    } else if (gamePhase === "waiting") {
        startMessage =
            "CLICK TO MAKE A BAD DECISION";
    } else {
        startMessage =
            "READY TO SUFFER AGAIN?";
    }

    useEffect(() => {
        localStorage.setItem("energy", String(energy));
        localStorage.setItem("powerLevel", String(powerLevel));
        localStorage.setItem("healthLevel", String(healthLevel));
        localStorage.setItem("healItemCount", String(healItemCount));
        localStorage.setItem("spawnSpeedLevel", String(spawnSpeedLevel),);
        localStorage.setItem("chainLightningLevel", String(chainLightningLevel),);
        localStorage.setItem("healingButtonLevel", String(healingButtonLevel));
    }, [energy, powerLevel, healthLevel, healItemCount, chainLightningLevel, spawnSpeedLevel, healingButtonLevel,]);

    useEffect(() => {
        if (
            !isRunActive ||
            gamePhase === "stageComplete"
        ) {
            return;
        }

        const timerId = setInterval(() => {
            const phaseDamage =
                gamePhase === "boss"
                    ? currentButton.damagePerSecond
                    : RUN_RULES.stageDamagePerSecond;

            const damagePerTick =
                phaseDamage * (RUN_RULES.healthTickMs / 1000);

            setFingerHealth((currentHealth) =>
                Math.max(0, currentHealth - damagePerTick),
            );
        }, RUN_RULES.healthTickMs);

        return () => {
            clearInterval(timerId);
        };
    }, [isRunActive, gamePhase, currentButton.damagePerSecond]);

    useEffect(() => {
        if (
            gamePhase !== "smallButtons" && gamePhase !== "boss" ||
            !isRunActive
        ) {
            return;
        }

        const spawnTimerId = setInterval(() => {
            setActiveSmallButtons(
                (currentButtons) => {
                    if (
                        currentButtons.length >=
                        SMALL_BUTTON_PHASE.maxActiveButtons
                    ) {
                        return currentButtons;
                    }

                    return [
                        ...currentButtons,
                        createSmallButtonInstance(buttonIndex, healingButtonLevel),
                    ];
                },
            );
        }, spawnIntervalMs);

        return () => {
            clearInterval(spawnTimerId);
        };
    }, [gamePhase, isRunActive, spawnIntervalMs, buttonIndex, healingButtonLevel,]);

    useEffect(() => {
        if (!isFingerExhausted || !isRunActive) {
            return;
        }

        setIsRunActive(false);
        setGamePhase("cooldown");
        setRestartCooldown(RUN_RULES.restartCooldownSeconds);
    }, [isFingerExhausted, isRunActive]);

    useEffect(() => {
        if (restartCooldown === 0) {
            return;
        }

        const timeoutId = setTimeout(() => {
            setRestartCooldown((currentCooldown) => currentCooldown - 1);
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [restartCooldown]);

    useEffect(() => {
        if (gamePhase !== "smallButtons") {
            return;
        }

        if (phaseTimeLeft === 0) {
            //setActiveSmallButtons([]);
            setGamePhase("boss");
            return;
        }

        const timeoutId = setTimeout(() => {
            setPhaseTimeLeft(
                (currentTime) => currentTime - 1,
            );
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [gamePhase, phaseTimeLeft]);

    useEffect(() => {
        const music = musicRef.current;

        if (!music) {
            return;
        }

        const shouldPlay =
            isRunActive &&
            (gamePhase === "smallButtons" || gamePhase === "boss");

        if (shouldPlay) {
            music.play();
        } else {
            music.pause();
        }
    }, [isRunActive, gamePhase]);

    function destroySmallButton(button) {
        if (!button || button.isBreaking) {
            return;
        }

        setButtonsBroken(
            (currentButtons) => currentButtons + 1,
        );

        setEnergy(
            (currentEnergy) =>
                currentEnergy + button.breakReward
        );

        if (button.healAmount > 0) {
            setFingerHealth((currentHealth) => Math.min(maxFingerHealth, currentHealth + button.healAmount));
        }

        playBreakSound(
            SMALL_BUTTON_PHASE.breakDurationMs / 1000,
        );

        setActiveSmallButtons(
            (currentButtons) =>
                currentButtons.map((currentButton) => {
                    if (currentButton.id !== button.id) {
                        return currentButton;
                    }

                    return {
                        ...currentButton,
                        durability: 0,
                        isBreaking: true,
                    };
                }),
        );

        setTimeout(() => {
            setActiveSmallButtons(
                (currentButtons) =>
                    currentButtons.filter(
                        (currentButton) =>
                            currentButton.id !== button.id,
                    ),
            );
        }, SMALL_BUTTON_PHASE.breakDurationMs);
    }

    function damageSmallButton(
        button,
        damageAmount,
    ) {
        if (!button || button.isBreaking) {
            return;
        }

        if (button.durability <= damageAmount) {
            destroySmallButton(button);
            return;
        }

        setActiveSmallButtons(
            (currentButtons) =>
                currentButtons.map((currentButton) => {
                    if (currentButton.id !== button.id) {
                        return currentButton;
                    }

                    return {
                        ...currentButton,
                        durability: Math.max(
                            0,
                            currentButton.durability -
                            damageAmount,
                        ),
                    };
                }),
        );
    }

    function getElementCenterPosition(element, container) {
        if (!element || !container) {
            return null;
        }

        const elementRect = element.getBoundingClientRect();
        const containerRect = container.getBoundingClientRect();

        if (
            containerRect.width === 0 ||
            containerRect.height === 0
        ) {
            return null;
        }

        return {
            x:
                ((elementRect.left + elementRect.width / 2 -
                    containerRect.left) /
                    containerRect.width) *
                100,
            y:
                ((elementRect.top + elementRect.height / 2 -
                    containerRect.top) /
                    containerRect.height) *
                100,
        };
    }

    function showLightningEffect(sourcePosition, targets) {
        const effectId = crypto.randomUUID();
        let fromPosition = sourcePosition;

        const bolts = targets.map((target, index) => {
            const toPosition = target.position;
            const mainPoints = createLightningPoints(fromPosition, toPosition);
            const branches = createLightningBranches(mainPoints);

            const bolt = {
                id: `${effectId}-${index}`,
                points: mainPoints,
                branches: branches,
                delayMs: index * CHAIN_LIGHTNING.jumpDelayMs,
            };

            fromPosition = toPosition;
            return bolt;
        });

        setLightningEffect({ id: effectId, bolts: bolts });

        const totalDuration = CHAIN_LIGHTNING.durationMs + (bolts.length - 1) * CHAIN_LIGHTNING.jumpDelayMs;

        setTimeout(() => {
            setLightningEffect((currentEffect) => {
                if (currentEffect && currentEffect.id === effectId) {
                    return null;
                }

                return currentEffect;
            });
        }, totalDuration);
    }

    function triggerChainLightning(sourceButton) {
        const damageMultipliers = currentChainLightning.damageMultipliers;

        if (damageMultipliers.length === 0) {
            return;
        }

        const targets = findLightningChain(sourceButton, activeSmallButtons, damageMultipliers.length);

        if (targets.length === 0) {
            return;
        }

        showLightningEffect(sourceButton.position, targets);

        targets.forEach((target, index) => {
            const chainDamage = pressPower * damageMultipliers[index];
            damageSmallButton(target, chainDamage);
        });
    }

    function handleSmallButtonPress(buttonId) {
        const targetButton = activeSmallButtons.find(
            (button) => button.id === buttonId,
        );

        if (!targetButton || targetButton.isBreaking) {
            return;
        }

        triggerChainLightning(targetButton);

        const buttonType =
            SMALL_BUTTONS[targetButton.typeIndex];

        setPresses(
            (currentPresses) => currentPresses + 1,
        );

        setEnergy(
            (currentEnergy) =>
                currentEnergy + buttonType.pressReward,
        );

        damageSmallButton(
            targetButton,
            pressPower,
        );

    }

    function handlePress() {
        if (isButtonBreaking) {
            return;
        }

        if (hasChainLightning) {
            const bossPosition = getElementCenterPosition(bossButtonRef.current, chamberRef.current);

            if (bossPosition) {
                triggerChainLightning({ id: "boss", position: bossPosition });
            }
        }

        setPresses((currentPresses) => currentPresses + 1);

        setEnergy((currentEnergy) => currentEnergy + currentButton.pressReward);

        if (buttonDurability <= pressPower) {
            setButtonDurability(0);
            playBreakSound();
            setIsButtonBreaking(true);

            setTimeout(() => {
                setButtonsBroken((currentButtons) => currentButtons + 1);
                setEnergy((currentEnergy) => currentEnergy + currentButton.breakReward);

                // setFingerHealth((currentHealth) =>
                //     Math.max(0, currentHealth - RUN_RULES.bossBreakDamage),
                // );

                const nextButtonIndex = Math.min(
                    buttonIndex + 1,
                    BUTTONS.length - 1,
                );

                setButtonIndex(nextButtonIndex);
                setButtonDurability(BUTTONS[nextButtonIndex].durability,);

                setStageMessage(currentButton.defeatMessage);
                setActiveSmallButtons([]);
                setGamePhase("stageComplete");
                setIsButtonBreaking(false);
            }, 1000);

            return;
        }

        setButtonDurability((currentDurability) => Math.max(0, currentDurability - pressPower),);
    }

    function startNewRun() {
        if (restartCooldown > 0) {
            return;
        }

        const music = musicRef.current;

        if (music) {
            music.currentTime = 0;
            music.volume = 0.2;
            music.play();
        }

        setFingerHealth(maxFingerHealth);
        setButtonIndex(0);
        setButtonDurability(BUTTONS[0].durability);
        setButtonsBroken(0);
        setPresses(0);
        setIsRunActive(true);
        setGamePhase("smallButtons");
        setPhaseTimeLeft(SMALL_BUTTON_PHASE.durationSeconds);
        setActiveSmallButtons([createSmallButtonInstance(0, healingButtonLevel),]);
        setIsButtonBreaking(false);
    }

    function startNextStage() {
        setActiveSmallButtons([
            createSmallButtonInstance(buttonIndex, healingButtonLevel),
        ]);

        setPhaseTimeLeft(
            SMALL_BUTTON_PHASE.durationSeconds,
        );

        setGamePhase("smallButtons");
    }

    function buySpawnSpeedUpgrade() {
        if (
            isRunActive ||
            isSpawnSpeedMax ||
            energy < spawnSpeedUpgradeCost
        ) {
            return;
        }

        setEnergy(
            (currentEnergy) =>
                currentEnergy - spawnSpeedUpgradeCost,
        );

        setSpawnSpeedLevel(
            (currentLevel) => currentLevel + 1,
        );
    }

    function buyChainLightning() {
        if (
            isRunActive ||
            isChainLightningMax ||
            energy < chainLightningUpgradeCost
        ) {
            return;
        }

        setEnergy((currentEnergy) => currentEnergy - chainLightningUpgradeCost);

        setChainLightningLevel((currentLevel) => currentLevel + 1);
    }

    function buyHealingButtonUpgrade() {
        if (isRunActive || isHealingButtonMax || energy < healingButtonUpgradeCost) {
            return;
        }

        setEnergy((currentEnergy) => currentEnergy - healingButtonUpgradeCost);
        setHealingButtonLevel((currentLevel) => currentLevel + 1);
    }

    function buyHealItem() {
        if (
            isRunActive ||
            energy < healItemCost
        ) {
            return;
        }

        setEnergy(
            (currentEnergy) =>
                currentEnergy - healItemCost,
        );

        setHealItemCount(
            (currentCount) => currentCount + 1,
        );
    }

    function useHealItem() {
        if (
            !isRunActive ||
            healItemCount === 0 ||
            fingerHealth <= 0 ||
            fingerHealth >= maxFingerHealth
        ) {
            return;
        }

        setFingerHealth((currentHealth) =>
            Math.min(
                maxFingerHealth,
                currentHealth + maxFingerHealth * REPAIR_KIT.healPercentage,
            ),
        );

        setHealItemCount(
            (currentCount) => currentCount - 1,
        );
    }

    function buyPowerUpgrade() {
        if (isRunActive || energy < powerUpgradeCost) {
            return;
        }

        setEnergy(
            (currentEnergy) =>
                currentEnergy - powerUpgradeCost,
        );

        setPowerLevel(
            (currentLevel) => currentLevel + 1,
        );
    }

    function buyHealthUpgrade() {
        if (isRunActive || energy < healthUpgradeCost) {
            return;
        }

        setEnergy(
            (currentEnergy) =>
                currentEnergy - healthUpgradeCost,
        );

        setHealthLevel(
            (currentLevel) => currentLevel + 1,
        );
    }

    return (
        <main className="game">
            <audio
                ref={musicRef}
                src="/audio/monkeys-spinning-monkeys.mp3"
                loop
                preload="auto"
            />
            <header className="game-header">
                <div>
                    <p className="small-label">TEST CHAMBER 01</p>
                    <h1>DO NOT PRESS</h1>
                    <p className="warning">You have been warned.</p>
                </div>

                <div className="energy">
                    <span>⚡</span>
                    <div>
                        <strong>{energy}</strong>
                        <small>PRESS ENERGY</small>
                    </div>
                </div>
            </header>

            <section className="game-panel">
                <div className="meter">
                    <div className="meter-label">
                        <span>FINGER HEALTH</span>
                        <strong>
                            {fingerHealth.toFixed(1)} / {maxFingerHealth}
                        </strong>
                    </div>

                    <div className="meter-track">
                        <div
                            className="meter-fill health-fill"
                            style={{
                                width: `${(fingerHealth / maxFingerHealth) * 100}%`,
                            }}
                        />
                    </div>
                </div>

                <div
                    ref={chamberRef}
                    className="button-chamber"
                >
                    {isRunActive && healItemCount > 0 && (
                        <div className="run-tools">
                            <button
                                className="heal-item-button"
                                type="button"
                                onClick={useHealItem}
                                aria-label={`Use repair kit and restore ${REPAIR_KIT.healPercentage * 100}% of maximum health`}
                                title={`Restore ${REPAIR_KIT.healPercentage * 100}% of maximum health`}
                                disabled={
                                    fingerHealth <= 0 ||
                                    fingerHealth >= maxFingerHealth
                                }
                            >
                                🩹

                                <span
                                    className="heal-item-count"
                                    aria-hidden="true"
                                >
                                    {healItemCount}
                                </span>
                            </button>
                        </div>
                    )}
                    <LightningEffect effect={lightningEffect} />

                    {isFingerExhausted && (
                        <button
                            className="start-area"
                            type="button"
                            onClick={startNewRun}
                            disabled={
                                restartCooldown > 0 ||
                                isRunActive
                            }
                        >
                            <span className="start-message">
                                {startMessage}
                            </span>
                        </button>
                    )}

                    {!isFingerExhausted &&
                        gamePhase === "stageComplete" && (
                            <button
                                className="start-area"
                                type="button"
                                onClick={startNextStage}
                            >
                                <span className="start-message">
                                    {stageMessage}

                                    <small className="continue-hint">
                                        CLICK TO FACE THE NEXT MISTAKE
                                    </small>
                                </span>
                            </button>
                        )}

                    {!isFingerExhausted && isRunActive && activeSmallButtons.length > 0 && (
                        <div className="small-button-phase">
                            {activeSmallButtons.map((smallButton) => {
                                const buttonType =
                                    SMALL_BUTTONS[smallButton.typeIndex];

                                return (
                                    <div
                                        key={smallButton.id}
                                        className="small-target"
                                        style={{
                                            left: `${smallButton.position.x}%`,
                                            top: `${smallButton.position.y}%`,
                                        }}
                                    >
                                        <div className="small-meter">
                                            <div
                                                className="small-meter-fill"
                                                style={{
                                                    width: `${(
                                                        smallButton.durability /
                                                        smallButton.maxDurability
                                                    ) * 100}%`,
                                                }}
                                            />
                                        </div>

                                        <button
                                            className={`small-button ${buttonType.colorClass} ${smallButton.isBreaking ?
                                                 "is-breaking" : ""}`}
                                            type="button"
                                            disabled={smallButton.isBreaking}
                                            aria-label={buttonType.name}
                                            onPointerDown={(event) => {
                                                if (event.button === 0) {
                                                    event.currentTarget.setPointerCapture(
                                                        event.pointerId,
                                                    );
                                                }
                                            }}
                                            onPointerUp={(event) => {
                                                if (event.button === 0) {
                                                    handleSmallButtonPress(smallButton.id);
                                                }
                                            }}
                                            onClick={(event) => {
                                                if (event.detail === 0) {
                                                    handleSmallButtonPress(smallButton.id);
                                                }
                                            }}
                                        />
                                    </div>
                                );
                            })}
                        </div>
                    )}

                    {!isFingerExhausted && gamePhase === "boss" && (
                        <>
                            <div className="meter durability-meter">
                                <div className="meter-label">
                                    <span>{currentButton.name}</span>

                                    <strong>
                                        {buttonDurability} / {currentButton.durability}
                                    </strong>
                                </div>

                                <div className="meter-track">
                                    <div
                                        className="meter-fill durability-fill"
                                        style={{
                                            width: `${(
                                                buttonDurability /
                                                currentButton.durability
                                            ) * 100}%`,
                                        }}
                                    />
                                </div>
                            </div>

                            <button
                                ref={bossButtonRef}
                                className={`main-button play-button ${currentButton.colorClass
                                    } ${isButtonBreaking ? "is-breaking" : ""
                                    }`}
                                type="button"
                                onPointerDown={(event) => {
                                    if (event.button === 0) {
                                        event.currentTarget.setPointerCapture(
                                            event.pointerId,
                                        );
                                    }
                                }}
                                onPointerUp={(event) => {
                                    if (event.button === 0) {
                                        handlePress();
                                    }
                                }}
                                onClick={(event) => {
                                    if (event.detail === 0) {
                                        handlePress();
                                    }
                                }}
                                disabled={isButtonBreaking}
                            >
                                {isButtonBreaking ? "CRACK!" : currentButton.buttonText}
                            </button>
                        </>
                    )}
                </div>

                <div className="statistics">
                    <div>
                        <span>BUTTONS BROKEN</span>
                        <strong>{buttonsBroken}</strong>
                    </div>

                    <div>
                        <span>MANUAL PRESSES</span>
                        <strong>{presses}</strong>
                    </div>

                    <div>
                        <span>RUN STATUS</span>
                        <strong>{isRunActive ? "ACTIVE" : "STOPPED"}</strong>
                    </div>
                </div>

                <div className="upgrades">
                    <section className="upgrade">
                        <h2>BUTTON SPAWN RATE</h2>

                        <p>
                            {`Level: ${spawnSpeedLevel} / ${spawnSpeedLevels.length - 1}`}
                        </p>

                        <p>
                            {isSpawnSpeedMax
                                ? "Maximum level reached"
                                : `Next: +${nextSpawnSpeedBonus}% spawn rate`}
                        </p>

                        <button
                            type="button"
                            onClick={buySpawnSpeedUpgrade}
                            disabled={
                                isRunActive ||
                                isSpawnSpeedMax ||
                                energy < spawnSpeedUpgradeCost
                            }
                        >
                            {isSpawnSpeedMax
                                ? "MAX LEVEL"
                                : `UPGRADE — ${spawnSpeedUpgradeCost}⚡`}
                        </button>
                    </section>

                    <section className="upgrade">
                        <h2>⚡ CHAIN LIGHTNING</h2>

                        <p>
                            {`Level: ${chainLightningLevel} / ${chainLightningLevels.length - 1}`}
                        </p>

                        <p>
                            {isChainLightningMax
                                ? "Maximum level reached"
                                : `Next: Jump ${nextChainJumpIndex + 1} deals ${nextChainJumpDamageMultiplier * 100}% damage`}
                        </p>

                        <button
                            type="button"
                            onClick={buyChainLightning}
                            disabled={
                                isRunActive ||
                                isChainLightningMax ||
                                energy < chainLightningUpgradeCost
                            }
                        >
                            {isChainLightningMax
                                ? "MAX LEVEL"
                                : chainLightningLevel === 0
                                    ? `UNLOCK — ${chainLightningUpgradeCost}⚡`
                                    : `UPGRADE — ${chainLightningUpgradeCost}⚡`}
                        </button>
                    </section>

                    <section className="upgrade">
                        <h2>💚 HEALING BUTTONS</h2>

                        <p>{`Level: ${healingButtonLevel} / ${healingButtonLevels.length - 1}`}</p>

                        <p>
                            {isHealingButtonMax
                                ? `${currentHealingButton.spawnChance * 100}% spawn chance · +${healingButtonHealAmount} HP`
                                : `Next: ${nextHealingButton.spawnChance * 100}% spawn chance · +${healingButtonHealAmount} HP`}
                        </p>

                        <button
                            type="button"
                            onClick={buyHealingButtonUpgrade}
                            disabled={isRunActive || isHealingButtonMax || energy < healingButtonUpgradeCost}
                        >
                            {isHealingButtonMax
                                ? "MAX LEVEL"
                                : healingButtonLevel === 0
                                    ? `UNLOCK — ${healingButtonUpgradeCost}⚡`
                                    : `UPGRADE — ${healingButtonUpgradeCost}⚡`}
                        </button>
                    </section>

                    <section className="upgrade">
                        <h2>PRESS POWER</h2>

                        <p>Level: {powerLevel}</p>
                        <p>
                            {`Next: ${pressPower} → ${pressPower + POWER_UPGRADE.powerPerLevel} damage`}
                        </p>

                        <button
                            type="button"
                            onClick={buyPowerUpgrade}
                            disabled={
                                isRunActive ||
                                energy < powerUpgradeCost
                            }
                        >
                            UPGRADE — {powerUpgradeCost}⚡
                        </button>
                    </section>

                    <section className="upgrade">
                        <h2>FINGER HEALTH</h2>

                        <p>Level: {healthLevel}</p>
                        <p>
                            {`Next: ${maxFingerHealth} → ${maxFingerHealth + HEALTH_UPGRADE.healthPerLevel} max health`}
                        </p>

                        <button
                            type="button"
                            onClick={buyHealthUpgrade}
                            disabled={
                                isRunActive ||
                                energy < healthUpgradeCost
                            }
                        >
                            UPGRADE — {healthUpgradeCost}⚡
                        </button>
                    </section>

                    <section className="upgrade">
                        <h2>FINGER REPAIR KIT</h2>
                        <p>Owned: {healItemCount}</p>
                        <p>
                            {`Next: +1 kit (restores ${REPAIR_KIT.healPercentage * 100}% HP)`}
                        </p>

                        <button
                            type="button"
                            onClick={buyHealItem}
                            disabled={
                                isRunActive ||
                                energy < healItemCost
                            }
                        >
                            BUY — {healItemCost}⚡
                        </button>
                    </section>
                </div>

            </section>
        </main >

    );
}
