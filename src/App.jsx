import { useEffect, useRef, useState } from "react";
import {
    BUTTONS,
    SMALL_BUTTONS,
    HEALING_BUTTON_UPGRADE,
    POWER_UPGRADE,
    HEALTH_UPGRADE,
    REPAIR_KIT,
    CHAIN_LIGHTNING,
    AUTO_FINGER,
    FIREBALL_DROP,
    RUN_RULES,
    SMALL_BUTTON_PHASE,
    GOLDEN_RUSH,
    RED_LIGHT_EVENT,
    POLARITY_EVENT,
    SPAWN_SPEED_UPGRADE,
} from "./data/gameConfig";
import { playBreakSound } from "./utils/audio"
import { createSmallButtonInstance, createGoldenButtonInstance } from "./utils/buttonUtils";
import { findLightningChain, createLightningPoints, createLightningBranches } from "./utils/lightning";
import { createPolarityRushButtons, togglePolarityButton, isPolarityWaveComplete } from "./utils/polarity";
import { findNearestAutoFingerTarget } from "./utils/autoFinger";
import { chooseFireballLaneX, findButtonsInsideFireballLane, isPositionInsideFireballLane } from "./utils/fireball";
import { loadGameSave, saveGameSave } from "./utils/storage";
import LightningEffect from "./components/LightningEffect";
import AutoFinger from "./components/AutoFinger";
import FireballDrop from "./components/FireballDrop";

const initialGameSave = loadGameSave();

function getRandomDuration([minimum, maximum]) {
    return minimum + Math.random() * (maximum - minimum);
}

function getInitialPolarityEventIndex() {
    const savedEventIndex = initialGameSave.events.pendingPolarityEventIndex;
    return savedEventIndex >= 0 && savedEventIndex < POLARITY_EVENT.attempts.length ? savedEventIndex : -1;
}

function getInitialStageIndex() {
    return Math.min(Math.max(initialGameSave.progress.highestUnlockedStage, 0), BUTTONS.length - 1);
}

function getInitialGamePhase() {
    if (!initialGameSave.events.hasSeenIntro) {
        return "intro";
    }

    return getInitialPolarityEventIndex() >= 0 ? "polarityIntro" : "waiting";
}

const EVENT_INTRO_DELAY_SECONDS = 2;
const ENDING_CHOICE_DELAY_SECONDS = 2;

function getIntroResistanceMessage(seconds) {
    const displayedSeconds = seconds.toFixed(1);

    if (seconds < 2) {
        return `IMPRESSIVE SELF-CONTROL: ${displayedSeconds} SECONDS.`;
    }

    if (seconds < 10) {
        return `WELL. THAT TOOK ${displayedSeconds} SECONDS.`;
    }

    return `${displayedSeconds} SECONDS? CUTE. YOU STILL PRESSED IT.`;
}

function RunData({ className, currentScore, bestScore, totalPresses }) {
    return (
        <section className={`run-data ${className}`} aria-label="Stage score and total presses">
            <div className="stage-score">
                <span>CURRENT SCORE</span>
                <strong>{currentScore}</strong>
            </div>

            <div className="run-data-secondary">
                <div>
                    <span>BEST SCORE</span>
                    <strong>{bestScore}</strong>
                </div>

                <div>
                    <span>TOTAL PRESSES</span>
                    <strong>{totalPresses}</strong>
                </div>
            </div>
        </section>
    );
}

export default function App() {
    const [presses, setPresses] = useState(0);
    const [totalManualPresses, setTotalManualPresses] = useState(initialGameSave.progress.totalManualPresses);
    const [runScore, setRunScore] = useState(0);
    const [bestScore, setBestScore] = useState(initialGameSave.progress.bestScore);
    const [buttonIndex, setButtonIndex] = useState(0);
    const [highestUnlockedStage, setHighestUnlockedStage] = useState(getInitialStageIndex());
    const [selectedStartingStage, setSelectedStartingStage] = useState(getInitialStageIndex());
    const currentButton = BUTTONS[buttonIndex];
    const [activeSmallButtons, setActiveSmallButtons,] = useState([]);
    const [goldenButtons, setGoldenButtons] = useState([]);
    const [rewardPopups, setRewardPopups] = useState([]);
    const [lightningEffect, setLightningEffect] = useState(null);
    const [buttonDurability, setButtonDurability] = useState(
        BUTTONS[0].durability,);

    const [energy, setEnergy] = useState(initialGameSave.progress.energy);
    const [fingerHealth, setFingerHealth] = useState(0);
    const [isRunActive, setIsRunActive] = useState(false);
    const [isMusicMuted, setIsMusicMuted] = useState(false);
    const [gamePhase, setGamePhase] = useState(getInitialGamePhase());
    const [introStep, setIntroStep] = useState("temptation");
    const [introResistanceSeconds, setIntroResistanceSeconds] = useState(null);
    const [stageMessage, setStageMessage] = useState("");
    const [phaseTimeLeft, setPhaseTimeLeft] = useState(SMALL_BUTTON_PHASE.durationSeconds,);
    const [goldenRushTimeLeft, setGoldenRushTimeLeft] = useState(0);
    const [restartCooldown, setRestartCooldown] = useState(0);
    const [isButtonBreaking, setIsButtonBreaking] = useState(false);
    const [isExitConfirmationOpen, setIsExitConfirmationOpen] = useState(false);
    const [powerLevel, setPowerLevel] = useState(initialGameSave.upgrades.powerLevel);
    const [healthLevel, setHealthLevel] = useState(initialGameSave.upgrades.healthLevel);
    const [spawnSpeedLevel, setSpawnSpeedLevel] = useState(initialGameSave.upgrades.spawnSpeedLevel);
    const [healItemCount, setHealItemCount] = useState(initialGameSave.inventory.healItemCount);
    const [healingButtonLevel, setHealingButtonLevel] = useState(initialGameSave.upgrades.healingButtonLevel);
    const [completedGoldenRushes, setCompletedGoldenRushes] = useState(initialGameSave.events.completedGoldenRushes);
    const [hasSeenIntro, setHasSeenIntro] = useState(initialGameSave.events.hasSeenIntro);
    const [hasSeenEnding, setHasSeenEnding] = useState(initialGameSave.events.hasSeenEnding);
    const [endingChoiceTimeLeft, setEndingChoiceTimeLeft] = useState(0);
    const [completedRedLightEvents, setCompletedRedLightEvents] = useState(initialGameSave.events.completedRedLightEvents);
    const [redLightEventIndex, setRedLightEventIndex] = useState(null);
    const [redLightTimeLeft, setRedLightTimeLeft] = useState(0);
    const [redLightHits, setRedLightHits] = useState(0);
    const [redLightState, setRedLightState] = useState("green");
    const [redLightResult, setRedLightResult] = useState(null);
    const [polarityEventsPlayed, setPolarityEventsPlayed] = useState(Math.min(Math.max(initialGameSave.events.polarityEventsPlayed, 0), POLARITY_EVENT.attempts.length));
    const [pendingPolarityEventIndex, setPendingPolarityEventIndex] = useState(getInitialPolarityEventIndex());
    const [activePolarityEventIndex, setActivePolarityEventIndex] = useState(() => {
        const savedEventIndex = getInitialPolarityEventIndex();
        return savedEventIndex >= 0 ? savedEventIndex : null;
    });
    const [polarityButtons, setPolarityButtons] = useState([]);
    const [polarityTimeLeft, setPolarityTimeLeft] = useState(0);
    const [polarityMoves, setPolarityMoves] = useState(0);
    const [polarityWave, setPolarityWave] = useState(1);
    const [polarityTargetIsWhite, setPolarityTargetIsWhite] = useState(true);
    const [polarityResult, setPolarityResult] = useState(null);
    const [isPolarityResolving, setIsPolarityResolving] = useState(false);
    const [eventIntroTimeLeft, setEventIntroTimeLeft] = useState(getInitialPolarityEventIndex() >= 0 ? EVENT_INTRO_DELAY_SECONDS : 0);
    const [autoFingerLevel, setAutoFingerLevel] = useState(() => {
        const savedLevel = initialGameSave.upgrades.autoFingerLevel;
        return Math.min(Math.max(savedLevel, 0), AUTO_FINGER.levels.length - 1);
    });
    const [autoFingerVisualState, setAutoFingerVisualState] = useState(null);
    const [fireballLevel, setFireballLevel] = useState(() => {
        const savedLevel = initialGameSave.upgrades.fireballLevel;
        return Math.min(Math.max(savedLevel, 0), FIREBALL_DROP.levels.length - 1);
    });
    const [fireballStrike, setFireballStrike] = useState(null);
    const [chainLightningLevel, setChainLightningLevel] = useState(() => {
        const savedLevel = initialGameSave.upgrades.chainLightningLevel;
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

    const pendingRedLightEventIndex = RED_LIGHT_EVENT.appearances.findIndex((appearance, index) => totalManualPresses >= appearance.requiredTotalPresses && !completedRedLightEvents.includes(index));
    const currentRedLightEvent = redLightEventIndex === null ? null : RED_LIGHT_EVENT.appearances[redLightEventIndex];

    const isPolaritySoldOut = polarityEventsPlayed >= POLARITY_EVENT.attempts.length;
    const nextPolarityAttempt = isPolaritySoldOut ? null : POLARITY_EVENT.attempts[polarityEventsPlayed];
    const currentPolarityAttempt = activePolarityEventIndex === null ? null : POLARITY_EVENT.attempts[activePolarityEventIndex];
    const nextPolarityTotalReward = nextPolarityAttempt ? nextPolarityAttempt.buttonCount * nextPolarityAttempt.waves * nextPolarityAttempt.rewardPerButton : 0;
    const currentPolarityTotalReward = currentPolarityAttempt ? currentPolarityAttempt.buttonCount * currentPolarityAttempt.waves * currentPolarityAttempt.rewardPerButton : 0;
    const isEventScreenOpen = ["intro", "goldenRushIntro", "goldenRush", "redLightIntro", "redLightEvent", "redLightResult", "polarityIntro", "polarityEvent", "polarityResult", "demoEnding"].includes(gamePhase);
    const isStageSelectionLocked = isRunActive || isEventScreenOpen;
    const canAbortRun = isRunActive && fingerHealth > 0 && !isButtonBreaking && (gamePhase === "smallButtons" || gamePhase === "boss");
    const displayedStageIndex = isRunActive ? buttonIndex : selectedStartingStage;

    const healingButtonLevels = HEALING_BUTTON_UPGRADE.levels;
    const currentHealingButton = healingButtonLevels[healingButtonLevel];
    const isHealingButtonMax = healingButtonLevel === healingButtonLevels.length - 1;
    const nextHealingButton = isHealingButtonMax ? null : healingButtonLevels[healingButtonLevel + 1];
    const healingButtonUpgradeCost = nextHealingButton ? nextHealingButton.cost : 0;
    const healingButtonHealAmount = SMALL_BUTTONS[HEALING_BUTTON_UPGRADE.buttonTypeIndex].healAmount;

    const healItemCost = REPAIR_KIT.baseCost * 4 ** healItemCount;

    const pressPower = POWER_UPGRADE.basePower + powerLevel * POWER_UPGRADE.powerPerLevel;
    const powerUpgradeCost = POWER_UPGRADE.baseCost * (powerLevel + 1);

    const autoFingerLevels = AUTO_FINGER.levels;
    const currentAutoFinger = autoFingerLevels[autoFingerLevel];
    const isAutoFingerMax = autoFingerLevel === autoFingerLevels.length - 1;
    const nextAutoFinger = isAutoFingerMax ? null : autoFingerLevels[autoFingerLevel + 1];
    const autoFingerUpgradeCost = nextAutoFinger ? nextAutoFinger.cost : 0;
    const autoFingerDamage = Math.max(AUTO_FINGER.minimumDamage, pressPower * currentAutoFinger.damageMultiplier);
    const baseAutoFinger = autoFingerLevels[1];
    const describedAutoFinger = nextAutoFinger ?? currentAutoFinger;
    const baseAutoFingerClickRate = 1000 / baseAutoFinger.attackIntervalMs;
    const describedAutoFingerClickRate = 1000 / describedAutoFinger.attackIntervalMs;
    const autoFingerPowerIncrease = Math.round((describedAutoFinger.damageMultiplier / baseAutoFinger.damageMultiplier - 1) * 100);
    const autoFingerClickSpeedIncrease = Math.round((describedAutoFingerClickRate / baseAutoFingerClickRate - 1) * 100);

    let autoFingerDescription;

    if (autoFingerLevel === 0) {
        autoFingerDescription = `Next: ${Math.round(baseAutoFinger.damageMultiplier * 100)}% power · Click rate ${Number(baseAutoFingerClickRate.toFixed(2))}/sec`;
    } else if (isAutoFingerMax) {
        autoFingerDescription = `Power +${autoFingerPowerIncrease}% · Click speed +${autoFingerClickSpeedIncrease}%`;
    } else {
        autoFingerDescription = `Next: Power +${autoFingerPowerIncrease}% · Click speed +${autoFingerClickSpeedIncrease}%`;
    }

    const fireballLevels = FIREBALL_DROP.levels;
    const currentFireball = fireballLevels[fireballLevel];
    const isFireballMax = fireballLevel === fireballLevels.length - 1;
    const nextFireball = isFireballMax ? null : fireballLevels[fireballLevel + 1];
    const describedFireball = nextFireball ?? currentFireball;
    const fireballUpgradeCost = nextFireball ? nextFireball.cost : 0;
    const fireballDamage = Math.max(FIREBALL_DROP.minimumDamage, pressPower * currentFireball.damageMultiplier);
    const fireballDescription = `${isFireballMax ? "" : "Next: "}${Math.round(describedFireball.damageMultiplier * 100)}% power · ${describedFireball.attackIntervalMs / 1000}s · ${describedFireball.laneWidthPercent}% lane`;

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

    const currentSpawnSpeedBonus =
        (currentSpawnSpeed.multiplier - 1) * 100;

    const musicRef = useRef(null);
    const introStartedAtRef = useRef(performance.now());
    const gamePanelRef = useRef(null);
    const chamberRef = useRef(null);
    const bossButtonRef = useRef(null);
    const redLightFinishedRef = useRef(false);
    const polarityGridRef = useRef(null);
    const polarityFinishedRef = useRef(false);
    const polarityResolvingRef = useRef(false);
    const activeSmallButtonsRef = useRef(activeSmallButtons);
    const autoFingerPositionRef = useRef(AUTO_FINGER.homePosition);
    const autoFingerHitRef = useRef(null);
    const fireballHitRef = useRef(null);
    const bossBreakingRef = useRef(false);

    activeSmallButtonsRef.current = activeSmallButtons;

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
        saveGameSave({
            progress: {
                energy,
                highestUnlockedStage,
                totalManualPresses,
                bestScore,
            },
            upgrades: {
                powerLevel,
                healthLevel,
                spawnSpeedLevel,
                chainLightningLevel,
                healingButtonLevel,
                autoFingerLevel,
                fireballLevel,
            },
            inventory: {
                healItemCount,
            },
            events: {
                completedGoldenRushes,
                completedRedLightEvents,
                polarityEventsPlayed,
                pendingPolarityEventIndex,
                hasSeenIntro,
                hasSeenEnding,
            },
        });
    }, [energy, powerLevel, healthLevel, healItemCount, chainLightningLevel, spawnSpeedLevel, healingButtonLevel, autoFingerLevel, fireballLevel, completedGoldenRushes, totalManualPresses, completedRedLightEvents, polarityEventsPlayed, pendingPolarityEventIndex, hasSeenIntro, hasSeenEnding, highestUnlockedStage, bestScore]);

    useEffect(() => {
        if (runScore > bestScore) {
            setBestScore(runScore);
        }
    }, [runScore, bestScore]);

    useEffect(() => {
        if (
            !isRunActive ||
            isButtonBreaking ||
            gamePhase === "stageComplete" ||
            gamePhase === "goldenRushIntro" ||
            gamePhase === "goldenRush"
        ) {
            return;
        }

        const timerId = setInterval(() => {
            const phaseDamage =
                gamePhase === "boss"
                    ? currentButton.damagePerSecond
                    : Math.max(
                        RUN_RULES.minimumStageDamagePerSecond,
                        currentButton.damagePerSecond * RUN_RULES.stageDamageMultiplier,
                    );

            const damagePerTick =
                phaseDamage * (RUN_RULES.healthTickMs / 1000);

            setFingerHealth((currentHealth) =>
                Math.max(0, currentHealth - damagePerTick),
            );
        }, RUN_RULES.healthTickMs);

        return () => {
            clearInterval(timerId);
        };
    }, [isRunActive, isButtonBreaking, gamePhase, currentButton.damagePerSecond]);

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
        if (gamePhase !== "goldenRush") {
            return;
        }

        const spawnTimerId = setInterval(() => {
            setGoldenButtons((currentButtons) => {
                const now = Date.now();
                const activeButtons = currentButtons.filter((button) => button.isBreaking || now - button.createdAt < GOLDEN_RUSH.buttonLifetimeMs);

                if (activeButtons.length >= GOLDEN_RUSH.maxActiveButtons) {
                    return activeButtons;
                }

                return [...activeButtons, createGoldenButtonInstance(buttonIndex)];
            });
        }, GOLDEN_RUSH.spawnIntervalMs);

        const expirationTimerId = setInterval(() => {
            const now = Date.now();
            setGoldenButtons((currentButtons) => currentButtons.filter((button) => button.isBreaking || now - button.createdAt < GOLDEN_RUSH.buttonLifetimeMs));
        }, 100);

        return () => {
            clearInterval(spawnTimerId);
            clearInterval(expirationTimerId);
        };
    }, [gamePhase, buttonIndex]);

    useEffect(() => {
        if (!isFingerExhausted || !isRunActive) {
            return;
        }

        setIsRunActive(false);
        setGamePhase("cooldown");
        setRestartCooldown(RUN_RULES.restartCooldownSeconds);
        setSelectedStartingStage(highestUnlockedStage);
    }, [isFingerExhausted, isRunActive, highestUnlockedStage]);

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
        if (!isExitConfirmationOpen) {
            return;
        }

        const timeoutId = setTimeout(() => setIsExitConfirmationOpen(false), 3000);
        return () => clearTimeout(timeoutId);
    }, [isExitConfirmationOpen]);

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
        if (gamePhase !== "goldenRush") {
            return;
        }

        if (goldenRushTimeLeft === 0) {
            completeCurrentStage();
            return;
        }

        const timeoutId = setTimeout(() => {
            setGoldenRushTimeLeft((currentTime) => currentTime - 1);
        }, 1000);

        return () => {
            clearTimeout(timeoutId);
        };
    }, [gamePhase, goldenRushTimeLeft]);

    useEffect(() => {
        const isEventIntro = gamePhase === "goldenRushIntro" || gamePhase === "redLightIntro" || gamePhase === "polarityIntro";

        if (!isEventIntro || eventIntroTimeLeft === 0) {
            return;
        }

        const timeoutId = setTimeout(() => setEventIntroTimeLeft((currentTime) => currentTime - 1), 1000);
        return () => clearTimeout(timeoutId);
    }, [gamePhase, eventIntroTimeLeft]);

    useEffect(() => {
        if (gamePhase !== "demoEnding" || endingChoiceTimeLeft === 0) {
            return;
        }

        const timeoutId = setTimeout(
            () => setEndingChoiceTimeLeft((currentTime) => currentTime - 1),
            1000,
        );

        return () => clearTimeout(timeoutId);
    }, [gamePhase, endingChoiceTimeLeft]);

    useEffect(() => {
        if (gamePhase !== "redLightEvent") {
            return;
        }

        let duration;
        let nextState;

        if (redLightState === "green") {
            duration = getRandomDuration(RED_LIGHT_EVENT.greenDurationRangeMs);
            nextState = "warning";
        } else if (redLightState === "warning") {
            duration = RED_LIGHT_EVENT.warningDurationMs;
            nextState = "red";
        } else if (redLightState === "red") {
            duration = getRandomDuration(RED_LIGHT_EVENT.redDurationRangeMs);
            nextState = "green";
        } else {
            duration = RED_LIGHT_EVENT.caughtDurationMs;
            nextState = "green";
        }

        const timeoutId = setTimeout(() => setRedLightState(nextState), duration);
        return () => clearTimeout(timeoutId);
    }, [gamePhase, redLightState]);

    useEffect(() => {
        if (gamePhase !== "redLightEvent") {
            return;
        }

        if (redLightTimeLeft === 0) {
            finishRedLightEvent(false);
            return;
        }

        const timeoutId = setTimeout(() => setRedLightTimeLeft((currentTime) => currentTime - 1), 1000);
        return () => clearTimeout(timeoutId);
    }, [gamePhase, redLightTimeLeft]);

    useEffect(() => {
        if (gamePhase === "redLightEvent" && currentRedLightEvent && redLightHits >= currentRedLightEvent.targetHits) {
            finishRedLightEvent(true);
        }
    }, [gamePhase, redLightHits, currentRedLightEvent]);

    useEffect(() => {
        if (gamePhase !== "polarityEvent" || isPolarityResolving) {
            return;
        }

        const timerId = setInterval(() => setPolarityTimeLeft((currentTime) => Math.max(0, currentTime - 0.05)), 50);
        return () => clearInterval(timerId);
    }, [gamePhase, isPolarityResolving]);

    useEffect(() => {
        if (gamePhase === "polarityEvent" && !isPolarityResolving && polarityTimeLeft === 0) {
            finishPolarityEvent("failed");
        }
    }, [gamePhase, isPolarityResolving, polarityTimeLeft]);

    useEffect(() => {
        const music = musicRef.current;

        if (!music) {
            return;
        }

        const shouldPlay =
            isRunActive &&
            (gamePhase === "smallButtons" || gamePhase === "boss" || gamePhase === "goldenRush");

        if (shouldPlay) {
            music.play();
        } else {
            music.pause();
        }
    }, [isRunActive, gamePhase]);

    function showRewardPopup(amount, position) {
        if (!position) {
            return;
        }

        const rewardPopup = {
            id: crypto.randomUUID(),
            amount: amount,
            position: position,
        };

        setRewardPopups((currentPopups) => [...currentPopups, rewardPopup]);
    }

    function removeRewardPopup(popupId) {
        setRewardPopups((currentPopups) => currentPopups.filter((popup) => popup.id !== popupId));
    }

    function awardRunEnergy(amount) {
        setEnergy((currentEnergy) => currentEnergy + amount);
        setRunScore((currentScore) => currentScore + amount);
    }

    function destroySmallButton(button) {
        if (!button || button.isBreaking) {
            return;
        }

        awardRunEnergy(button.breakReward);

        showRewardPopup(button.breakReward, button.position);

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

    function recordManualPress() {
        setPresses((currentPresses) => currentPresses + 1);
        setTotalManualPresses((currentPresses) => currentPresses + 1);
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

        recordManualPress();

        awardRunEnergy(buttonType.pressReward);

        damageSmallButton(
            targetButton,
            pressPower,
        );

    }

    function destroyGoldenButton(button) {
        if (!button || button.isBreaking) {
            return;
        }

        awardRunEnergy(button.breakReward);
        showRewardPopup(button.breakReward, button.position);
        playBreakSound(GOLDEN_RUSH.breakDurationMs / 1000);

        setGoldenButtons((currentButtons) => currentButtons.map((currentButton) => {
            if (currentButton.id !== button.id) {
                return currentButton;
            }

            return { ...currentButton, isBreaking: true };
        }));

        setTimeout(() => {
            setGoldenButtons((currentButtons) => currentButtons.filter((currentButton) => currentButton.id !== button.id));
        }, GOLDEN_RUSH.breakDurationMs);
    }

    function handleGoldenButtonPress(buttonId) {
        const targetButton = goldenButtons.find((button) => button.id === buttonId);

        if (!targetButton || targetButton.isBreaking) {
            return;
        }

        recordManualPress();
        destroyGoldenButton(targetButton);
    }

    function completeCurrentStage() {
        setStageMessage(currentButton.defeatMessage);
        setActiveSmallButtons([]);
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setIsButtonBreaking(false);
        bossBreakingRef.current = false;

        if (buttonIndex === BUTTONS.length - 1) {
            setButtonDurability(currentButton.durability);
            setStageMessage("THE VOID RESPAWNED. FREEDOM LASTED 0 SECONDS.");
            setGamePhase("stageComplete");
            return;
        }

        const nextButtonIndex = buttonIndex + 1;
        setButtonIndex(nextButtonIndex);
        setButtonDurability(BUTTONS[nextButtonIndex].durability);
        setGamePhase("stageComplete");
    }

    function unlockNextStage() {
        const unlockedStage = Math.min(buttonIndex + 1, BUTTONS.length - 1);
        const newHighestStage = Math.max(highestUnlockedStage, unlockedStage);
        setHighestUnlockedStage(newHighestStage);
        setSelectedStartingStage(newHighestStage);
    }

    function startGoldenRush() {
        setCompletedGoldenRushes((currentRushes) => currentRushes.includes(buttonIndex) ? currentRushes : [...currentRushes, buttonIndex]);
        setActiveSmallButtons([]);
        setGoldenButtons([createGoldenButtonInstance(buttonIndex)]);
        setGoldenRushTimeLeft(GOLDEN_RUSH.durationSeconds);
        setGamePhase("goldenRush");
        setIsButtonBreaking(false);
    }

    function showGoldenRushIntro() {
        setActiveSmallButtons([]);
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setEventIntroTimeLeft(EVENT_INTRO_DELAY_SECONDS);
        setGamePhase("goldenRushIntro");
        setIsButtonBreaking(false);
    }

    function showDemoEnding() {
        setHasSeenEnding(true);
        setEndingChoiceTimeLeft(ENDING_CHOICE_DELAY_SECONDS);
        setIsRunActive(false);
        setActiveSmallButtons([]);
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setIsButtonBreaking(false);
        bossBreakingRef.current = false;
        setGamePhase("demoEnding");
    }

    function continueToEndlessMode() {
        if (endingChoiceTimeLeft > 0) {
            return;
        }

        const finalStageIndex = BUTTONS.length - 1;
        const music = musicRef.current;

        if (music) {
            music.volume = 0.2;
            music.play();
        }

        setSelectedStartingStage(finalStageIndex);
        setButtonIndex(finalStageIndex);
        setButtonDurability(BUTTONS[finalStageIndex].durability);
        setIsRunActive(true);
        setGamePhase("smallButtons");
        setPhaseTimeLeft(SMALL_BUTTON_PHASE.durationSeconds);
        setActiveSmallButtons([createSmallButtonInstance(finalStageIndex, healingButtonLevel)]);
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setIsButtonBreaking(false);
        setEndingChoiceTimeLeft(0);
        bossBreakingRef.current = false;
    }

    function leaveDemoEnding() {
        if (endingChoiceTimeLeft > 0) {
            return;
        }

        returnToStageSelection();
    }

    function showRedLightIntro() {
        if (pendingRedLightEventIndex === -1) {
            return;
        }

        setRedLightEventIndex(pendingRedLightEventIndex);
        setRedLightTimeLeft(0);
        setRedLightHits(0);
        setRedLightState("green");
        setRedLightResult(null);
        setEventIntroTimeLeft(EVENT_INTRO_DELAY_SECONDS);
        setGamePhase("redLightIntro");
        setIsRunActive(false);
    }

    function startRedLightEvent() {
        if (!currentRedLightEvent) {
            return;
        }

        redLightFinishedRef.current = false;
        setRedLightTimeLeft(RED_LIGHT_EVENT.durationSeconds);
        setRedLightHits(0);
        setRedLightState("green");
        setRedLightResult(null);
        setGamePhase("redLightEvent");
    }

    function handleRedLightPress() {
        if (gamePhase !== "redLightEvent" || !currentRedLightEvent || redLightState === "caught") {
            return;
        }

        if (redLightState === "red") {
            setRedLightState("caught");
            return;
        }

        setRedLightHits((currentHits) => Math.min(currentHits + 1, currentRedLightEvent.targetHits));
    }

    function finishRedLightEvent(success) {
        if (redLightFinishedRef.current || redLightEventIndex === null || !currentRedLightEvent) {
            return;
        }

        redLightFinishedRef.current = true;
        setCompletedRedLightEvents((currentEvents) => currentEvents.includes(redLightEventIndex) ? currentEvents : [...currentEvents, redLightEventIndex]);

        if (success) {
            setEnergy((currentEnergy) => currentEnergy + currentRedLightEvent.reward);
        }

        setRedLightResult(success ? "success" : "failed");
        setRedLightTimeLeft(0);
        setGamePhase("redLightResult");
    }

    function buyPolarityEvent() {
        if (isRunActive || isEventScreenOpen || !nextPolarityAttempt || energy < nextPolarityAttempt.cost) {
            return;
        }

        setEnergy((currentEnergy) => currentEnergy - nextPolarityAttempt.cost);
        setPendingPolarityEventIndex(polarityEventsPlayed);
        setActivePolarityEventIndex(polarityEventsPlayed);
        setPolarityButtons([]);
        setPolarityTimeLeft(0);
        setPolarityMoves(0);
        setPolarityWave(1);
        setPolarityResult(null);
        setIsPolarityResolving(false);
        polarityResolvingRef.current = false;
        setEventIntroTimeLeft(EVENT_INTRO_DELAY_SECONDS);
        setGamePhase("polarityIntro");
    }

    function startPolarityEvent() {
        if (!currentPolarityAttempt) {
            return;
        }

        const firstTargetIsWhite = Math.random() < 0.5;

        polarityFinishedRef.current = false;
        polarityResolvingRef.current = false;
        setPolarityButtons(createPolarityRushButtons(currentPolarityAttempt.buttonCount, firstTargetIsWhite));
        setPolarityTimeLeft(currentPolarityAttempt.waveDurationSeconds);
        setPolarityMoves(0);
        setPolarityWave(1);
        setPolarityTargetIsWhite(firstTargetIsWhite);
        setPolarityResult(null);
        setIsPolarityResolving(false);
        setGamePhase("polarityEvent");
    }

    function handlePolarityButtonPress(buttonIndex) {
        if (gamePhase !== "polarityEvent" || !currentPolarityAttempt || polarityResolvingRef.current) {
            return;
        }

        const updatedButtons = togglePolarityButton(polarityButtons, buttonIndex);
        setPolarityButtons(updatedButtons);
        setPolarityMoves((currentMoves) => currentMoves + 1);

        if (isPolarityWaveComplete(updatedButtons, polarityTargetIsWhite)) {
            completePolarityWave(updatedButtons);
        }
    }

    function completePolarityWave(solvedButtons) {
        if (!currentPolarityAttempt || polarityResolvingRef.current) {
            return;
        }

        polarityResolvingRef.current = true;
        setIsPolarityResolving(true);

        const buttonPositions = solvedButtons.map((button, index) => {
            const buttonElement = polarityGridRef.current?.querySelector(`[data-polarity-index="${index}"]`);
            return getElementCenterPosition(buttonElement, chamberRef.current);
        });

        setPolarityButtons(solvedButtons.map((button) => ({ ...button, isBreaking: true })));

        solvedButtons.forEach((button, index) => {
            setTimeout(() => {
                setEnergy((currentEnergy) => currentEnergy + currentPolarityAttempt.rewardPerButton);
                showRewardPopup(currentPolarityAttempt.rewardPerButton, buttonPositions[index]);
                playBreakSound(0.1);
            }, index * POLARITY_EVENT.buttonBreakStaggerMs);
        });

        const resultDelay = (solvedButtons.length - 1) * POLARITY_EVENT.buttonBreakStaggerMs + POLARITY_EVENT.resultDelayMs;

        setTimeout(() => {
            if (polarityWave >= currentPolarityAttempt.waves) {
                finishPolarityEvent("success");
                return;
            }

            const nextTargetIsWhite = !polarityTargetIsWhite;
            setPolarityWave((currentWave) => currentWave + 1);
            setPolarityTargetIsWhite(nextTargetIsWhite);
            setPolarityButtons(createPolarityRushButtons(currentPolarityAttempt.buttonCount, nextTargetIsWhite));
            setPolarityTimeLeft(currentPolarityAttempt.waveDurationSeconds);
            setIsPolarityResolving(false);
            polarityResolvingRef.current = false;
        }, resultDelay);
    }

    function finishPolarityEvent(result) {
        if (polarityFinishedRef.current || activePolarityEventIndex === null || !currentPolarityAttempt) {
            return;
        }

        polarityFinishedRef.current = true;
        setPolarityEventsPlayed((currentCount) => Math.max(currentCount, activePolarityEventIndex + 1));
        setPendingPolarityEventIndex(-1);
        setPolarityResult(result);
        setPolarityTimeLeft(0);
        setIsPolarityResolving(false);
        setGamePhase("polarityResult");
    }

    function leavePolarityEvent() {
        setActivePolarityEventIndex(null);
        setPolarityButtons([]);
        setPolarityTimeLeft(0);
        setPolarityMoves(0);
        setPolarityWave(1);
        setPolarityResult(null);
        setIsPolarityResolving(false);
        polarityResolvingRef.current = false;
        setGamePhase(presses === 0 ? "waiting" : "cooldown");
    }

    function damageBossButton(damageAmount, hitPosition) {
        if (bossBreakingRef.current) {
            return;
        }

        if (buttonDurability <= damageAmount) {
            const destroyedBossPosition = hitPosition || getElementCenterPosition(bossButtonRef.current, chamberRef.current);

            bossBreakingRef.current = true;
            setButtonDurability(0);
            playBreakSound();
            setIsButtonBreaking(true);
            awardRunEnergy(currentButton.breakReward);
            showRewardPopup(currentButton.breakReward, destroyedBossPosition);

            setTimeout(() => {
                unlockNextStage();

                if (buttonIndex === BUTTONS.length - 1 && !hasSeenEnding) {
                    showDemoEnding();
                    return;
                }

                if (completedGoldenRushes.includes(buttonIndex)) {
                    completeCurrentStage();
                } else {
                    showGoldenRushIntro();
                }
            }, 1000);

            return;
        }

        setButtonDurability((currentDurability) => Math.max(0, currentDurability - damageAmount));
    }

    function handlePress() {
        if (isButtonBreaking) {
            return;
        }

        let bossPosition = null;

        if (hasChainLightning) {
            bossPosition = getElementCenterPosition(bossButtonRef.current, chamberRef.current);

            if (bossPosition) {
                triggerChainLightning({ id: "boss", position: bossPosition });
            }
        }

        recordManualPress();

        awardRunEnergy(currentButton.pressReward);
        damageBossButton(pressPower, bossPosition);
    }

    function revealIntroPunishment() {
        const elapsedSeconds = (performance.now() - introStartedAtRef.current) / 1000;
        setIntroResistanceSeconds(elapsedSeconds);
        setIntroStep("punishment");
    }

    function enterGameFromIntro() {
        setHasSeenIntro(true);
        startNormalRun();

        requestAnimationFrame(() => {
            gamePanelRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "start",
            });
        });
    }

    function startNormalRun(startingStage = selectedStartingStage) {
        const music = musicRef.current;

        if (music) {
            music.currentTime = 0;
            music.volume = 0.2;
            music.play();
        }

        setFingerHealth(maxFingerHealth);
        setButtonIndex(startingStage);
        setButtonDurability(BUTTONS[startingStage].durability);
        setPresses(0);
        setRunScore(0);
        setIsRunActive(true);
        setGamePhase("smallButtons");
        setPhaseTimeLeft(SMALL_BUTTON_PHASE.durationSeconds);
        setActiveSmallButtons([createSmallButtonInstance(startingStage, healingButtonLevel),]);
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setIsButtonBreaking(false);
        bossBreakingRef.current = false;
        setRedLightEventIndex(null);
        setRedLightResult(null);
        setEndingChoiceTimeLeft(0);
    }

    function selectStartingStage(stageIndex) {
        if (isStageSelectionLocked || stageIndex > highestUnlockedStage) {
            return;
        }

        setSelectedStartingStage(stageIndex);
    }

    function returnToStageSelection() {
        setIsRunActive(false);
        setFingerHealth(0);
        setSelectedStartingStage(highestUnlockedStage);
        setActiveSmallButtons([]);
        setGoldenButtons([]);
        setEndingChoiceTimeLeft(0);
        setIsExitConfirmationOpen(false);
        setGamePhase("waiting");
    }

    function handleRunExit() {
        if (!canAbortRun) {
            return;
        }

        if (!isExitConfirmationOpen) {
            setIsExitConfirmationOpen(true);
            return;
        }

        returnToStageSelection();
    }

    function startNewRun() {
        if (restartCooldown > 0) {
            return;
        }

        if (pendingRedLightEventIndex !== -1) {
            showRedLightIntro();
            return;
        }

        startNormalRun();
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

    function buyAutoFingerUpgrade() {
        if (isRunActive || isAutoFingerMax || energy < autoFingerUpgradeCost) {
            return;
        }

        setEnergy((currentEnergy) => currentEnergy - autoFingerUpgradeCost);
        setAutoFingerLevel((currentLevel) => currentLevel + 1);
    }

    function buyFireballUpgrade() {
        if (isRunActive || isFireballMax || energy < fireballUpgradeCost) {
            return;
        }

        setEnergy((currentEnergy) => currentEnergy - fireballUpgradeCost);
        setFireballLevel((currentLevel) => currentLevel + 1);
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

    autoFingerHitRef.current = (target) => {
        if (target.kind === "boss") {
            if (gamePhase !== "boss" || isButtonBreaking) {
                return;
            }

            awardRunEnergy(currentButton.pressReward);
            damageBossButton(autoFingerDamage, target.position);
            return;
        }

        const latestButton = activeSmallButtonsRef.current.find((button) => button.id === target.id);

        if (!latestButton || latestButton.isBreaking) {
            return;
        }

        const buttonType = SMALL_BUTTONS[latestButton.typeIndex];
        awardRunEnergy(buttonType.pressReward);
        damageSmallButton(latestButton, autoFingerDamage);
    };

    useEffect(() => {
        const canAutoFingerAttack = autoFingerLevel > 0 && isRunActive && !isButtonBreaking && (gamePhase === "smallButtons" || gamePhase === "boss");

        if (!canAutoFingerAttack) {
            setAutoFingerVisualState(null);
            autoFingerPositionRef.current = AUTO_FINGER.homePosition;
            return;
        }

        let firstAttackTimeoutId;
        let travelTimeoutId;
        let releaseTimeoutId;

        function beginAutoFingerAttack() {
            let target;

            if (gamePhase === "boss") {
                const bossPosition = getElementCenterPosition(bossButtonRef.current, chamberRef.current);

                if (!bossPosition) {
                    return;
                }

                target = {
                    id: "boss",
                    kind: "boss",
                    position: bossPosition,
                };
            } else {
                const smallButton = findNearestAutoFingerTarget(activeSmallButtonsRef.current, autoFingerPositionRef.current);

                if (!smallButton) {
                    return;
                }

                target = {
                    id: smallButton.id,
                    kind: "smallButton",
                    position: smallButton.position,
                };
            }

            const attackId = crypto.randomUUID();
            autoFingerPositionRef.current = target.position;
            setAutoFingerVisualState({
                attackId,
                position: target.position,
                isPressing: false,
                travelDurationMs: AUTO_FINGER.travelDurationMs,
            });

            travelTimeoutId = setTimeout(() => {
                setAutoFingerVisualState((currentVisual) => currentVisual?.attackId === attackId ? { ...currentVisual, isPressing: true } : currentVisual);
                autoFingerHitRef.current?.(target);

                releaseTimeoutId = setTimeout(() => {
                    setAutoFingerVisualState((currentVisual) => currentVisual?.attackId === attackId ? { ...currentVisual, isPressing: false } : currentVisual);
                }, AUTO_FINGER.pressDurationMs);
            }, AUTO_FINGER.travelDurationMs);
        }

        setAutoFingerVisualState({
            attackId: "home",
            position: AUTO_FINGER.homePosition,
            isPressing: false,
            travelDurationMs: AUTO_FINGER.travelDurationMs,
        });
        autoFingerPositionRef.current = AUTO_FINGER.homePosition;

        firstAttackTimeoutId = setTimeout(beginAutoFingerAttack, 250);
        const attackIntervalId = setInterval(beginAutoFingerAttack, currentAutoFinger.attackIntervalMs);

        return () => {
            clearTimeout(firstAttackTimeoutId);
            clearTimeout(travelTimeoutId);
            clearTimeout(releaseTimeoutId);
            clearInterval(attackIntervalId);
        };
    }, [autoFingerLevel, currentAutoFinger.attackIntervalMs, gamePhase, isButtonBreaking, isRunActive]);

    fireballHitRef.current = (strike) => {
        const smallButtonTargets = findButtonsInsideFireballLane(
            activeSmallButtonsRef.current,
            strike.x,
            strike.laneWidthPercent,
        );

        smallButtonTargets.forEach((button) => {
            damageSmallButton(button, fireballDamage);
        });

        if (gamePhase !== "boss" || isButtonBreaking) {
            return;
        }

        const bossPosition = getElementCenterPosition(bossButtonRef.current, chamberRef.current);

        if (isPositionInsideFireballLane(bossPosition, strike.x, strike.laneWidthPercent)) {
            damageBossButton(fireballDamage, bossPosition);
        }
    };

    useEffect(() => {
        const canDropFireballs =
            fireballLevel > 0 &&
            isRunActive &&
            (gamePhase === "smallButtons" || gamePhase === "boss");

        if (!canDropFireballs) {
            setFireballStrike(null);
            return;
        }

        const timeoutIds = [];

        function beginFireballStrike() {
            if (bossBreakingRef.current) {
                return;
            }

            const bossPosition =
                gamePhase === "boss"
                    ? getElementCenterPosition(bossButtonRef.current, chamberRef.current)
                    : null;
            const laneX = chooseFireballLaneX(activeSmallButtonsRef.current, bossPosition);

            if (laneX === null) {
                return;
            }

            const strike = {
                id: crypto.randomUUID(),
                x: laneX,
                laneWidthPercent: currentFireball.laneWidthPercent,
                warningDurationMs: FIREBALL_DROP.warningDurationMs,
                fallDurationMs: FIREBALL_DROP.fallDurationMs,
                impactDurationMs: FIREBALL_DROP.impactDurationMs,
            };
            const impactDelay = FIREBALL_DROP.warningDurationMs + FIREBALL_DROP.fallDurationMs;
            const totalDuration = impactDelay + FIREBALL_DROP.impactDurationMs;

            setFireballStrike(strike);

            timeoutIds.push(
                setTimeout(() => fireballHitRef.current?.(strike), impactDelay),
                setTimeout(() => {
                    setFireballStrike((currentStrike) =>
                        currentStrike?.id === strike.id ? null : currentStrike,
                    );
                }, totalDuration),
            );
        }

        timeoutIds.push(setTimeout(beginFireballStrike, FIREBALL_DROP.firstStrikeDelayMs));
        const strikeIntervalId = setInterval(beginFireballStrike, currentFireball.attackIntervalMs);

        return () => {
            timeoutIds.forEach((timeoutId) => clearTimeout(timeoutId));
            clearInterval(strikeIntervalId);
            setFireballStrike(null);
        };
    }, [fireballLevel, currentFireball.attackIntervalMs, currentFireball.laneWidthPercent, gamePhase, isRunActive]);

    return (
        <main className="game">
            <audio
                ref={musicRef}
                src="/audio/monkeys-spinning-monkeys.mp3"
                muted={isMusicMuted}
                loop
                preload="auto"
            />

            {gamePhase === "intro" && (
                <div
                    className="intro-screen"
                    role="dialog"
                    aria-modal="true"
                    aria-labelledby="intro-title"
                >
                    <section className={`intro-panel intro-panel-${introStep}`}>
                        {introStep === "temptation" ? (
                            <>
                                <small className="intro-kicker">ONE SIMPLE INSTRUCTION</small>

                                <h2 id="intro-title" className="intro-title">
                                    DO NOT PRESS.
                                </h2>

                                <p className="intro-taunt">
                                    That’s it. Surely this will be enough.
                                </p>

                                <button
                                    className="intro-button"
                                    type="button"
                                    onClick={revealIntroPunishment}
                                >
                                    <span>DO NOT</span>
                                    <small>PRESS</small>
                                </button>

                                <small className="intro-legal">
                                    We trust you completely.
                                </small>
                            </>
                        ) : (
                            <>
                                <small className="intro-kicker intro-violation-label">
                                    ⚠ VIOLATION DETECTED
                                </small>

                                <h2 id="intro-title" className="intro-title intro-punishment-title">
                                    {getIntroResistanceMessage(introResistanceSeconds ?? 0)}
                                </h2>

                                <p className="intro-rule">
                                    You ignored the only instruction. Your punishment has been approved.
                                </p>

                                <div className="intro-sentence">
                                    <strong>WELCOME TO THE BUTTON TESTING DEPARTMENT</strong>

                                    <p>
                                        Break five cursed buttons. Turn finger pain into Press Energy.
                                        Automate your bad decisions. Earn your freedom.
                                    </p>
                                </div>

                                <p className="intro-punishment-joke">
                                    Good news: there is an exit. Bad news: getting out won't be as easy as getting in.
                                </p>

                                <button
                                    className="intro-enter-button"
                                    type="button"
                                    onClick={enterGameFromIntro}
                                >
                                    ACCEPT YOUR PUNISHMENT
                                </button>
                            </>
                        )}
                    </section>
                </div>
            )}

            <header className="game-header">
                <div>
                    <p className="small-label">THE FORBIDDEN BUTTON EXPERIMENT</p>
                    <h1>DO NOT PRESS</h1>
                    <p className="warning">You have been warned.</p>
                </div>
            </header>

            <div className="game-layout">
                <aside className="game-sidebar">
                    <div className="energy sidebar-energy" aria-label={`${energy} press energy`}>
                        <span>⚡</span>
                        <div>
                            <strong>{energy}</strong>
                            <small>PRESS ENERGY</small>
                        </div>
                    </div>

                    <div className="stage-selector">
                        <div className="stage-selector-header">
                            <p className="small-label">RUN ENTRY POINT</p>
                            <h2>STAGE SELECT</h2>
                            <p>Choose where the next run begins.</p>
                        </div>

                        <div className="stage-list">
                            {BUTTONS.map((stage, stageIndex) => {
                                const isUnlocked = stageIndex <= highestUnlockedStage;
                                const isSelected = stageIndex === displayedStageIndex;

                                return (
                                    <button
                                        key={stage.name}
                                        className={`stage-option ${isSelected ? "is-selected" : ""} ${!isUnlocked ? "is-locked" : ""}`}
                                        type="button"
                                        onClick={() => selectStartingStage(stageIndex)}
                                        disabled={!isUnlocked || isStageSelectionLocked}
                                        aria-pressed={isSelected}
                                    >
                                        <span className="stage-option-number">STAGE {String(stageIndex + 1).padStart(2, "0")}</span>
                                        <strong>{isUnlocked ? stage.name : "???"}</strong>
                                        <small>
                                            {!isUnlocked
                                                ? `DEFEAT STAGE ${stageIndex} BOSS TO UNLOCK`
                                                : isSelected
                                                    ? isRunActive ? "CURRENT STAGE" : "STARTING POINT"
                                                    : stageIndex === highestUnlockedStage ? "LATEST UNLOCK" : "UNLOCKED"}
                                        </small>
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </aside>

                <section ref={gamePanelRef} className="game-panel">
                    <div className="meter">
                        <div className="meter-label">
                            <div className="health-label-actions">
                                {canAbortRun && (
                                    <button
                                        className={`abort-run-button ${isExitConfirmationOpen ? "is-confirming" : ""}`}
                                        type="button"
                                        onClick={handleRunExit}
                                    >
                                        {isExitConfirmationOpen ? "CONFIRM EXIT" : "ABORT RUN"}
                                    </button>
                                )}

                                <button
                                    className={`music-toggle-button ${isMusicMuted ? "is-muted" : ""}`}
                                    type="button"
                                    onClick={() => setIsMusicMuted((currentValue) => !currentValue)}
                                    aria-pressed={isMusicMuted}
                                    title={isMusicMuted ? "Unmute background music" : "Mute background music"}
                                >
                                    {isMusicMuted ? "🔇 MUTED" : "🔊 MUSIC"}
                                </button>
                            </div>

                            <div className="health-value">
                                <span>FINGER HEALTH</span>

                                <strong>
                                    {fingerHealth.toFixed(1)} / {maxFingerHealth}
                                </strong>
                            </div>
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
                        <AutoFinger visualState={autoFingerVisualState} />
                        <FireballDrop strike={fireballStrike} />

                        {rewardPopups.map((rewardPopup) => (
                            <span
                                key={rewardPopup.id}
                                className="reward-popup"
                                style={{
                                    left: `${rewardPopup.position.x}%`,
                                    top: `${rewardPopup.position.y}%`,
                                }}
                                aria-hidden="true"
                                onAnimationEnd={() => removeRewardPopup(rewardPopup.id)}
                            >
                                +{rewardPopup.amount}⚡
                            </span>
                        ))}

                        {gamePhase === "polarityIntro" && currentPolarityAttempt && (
                            <div className="start-area event-intro-screen polarity-intro">
                                <div className="start-message polarity-intro-message">
                                    <small className="secret-event-label polarity-secret-label">EVENT TICKET ACTIVATED</small>
                                    <strong className="polarity-intro-title">⚫ POLARITY RUSH ⚪</strong>
                                    <small className="polarity-rules">CLICK A BUTTON TO FLIP ITS COLOR · MATCH THE TARGET COLOR</small>
                                    <small className="polarity-goal">
                                        {currentPolarityAttempt.waves} WAVES · {currentPolarityAttempt.waveDurationSeconds} SECONDS EACH · {currentPolarityTotalReward}⚡ REWARD
                                    </small>
                                    <span className="event-intro-action-slot">
                                        {eventIntroTimeLeft > 0 ? (
                                            <strong className="event-unlock-notice polarity-event-unlock-notice">YOU UNLOCKED A SECRET EVENT</strong>
                                        ) : (
                                            <button className="event-intro-action polarity-event-intro-action" type="button" onClick={startPolarityEvent}>START POLARITY RUSH</button>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {gamePhase === "polarityEvent" && currentPolarityAttempt && (
                            <div className="polarity-event">
                                <div className="polarity-event-header">
                                    <strong>⚫ POLARITY RUSH ⚪</strong>
                                    <span className={`polarity-timer ${polarityTimeLeft <= 3 ? "is-urgent" : ""}`}>{Math.ceil(polarityTimeLeft)}s</span>
                                </div>

                                <div className="polarity-timer-track">
                                    <div
                                        className={`polarity-timer-fill polarity-timer-fill-${polarityTargetIsWhite ? "white" : "black"}`}
                                        style={{ width: `${(polarityTimeLeft / currentPolarityAttempt.waveDurationSeconds) * 100}%` }}
                                    />
                                </div>

                                <div className="polarity-event-stats">
                                    <span>{`WAVE ${polarityWave} / ${currentPolarityAttempt.waves}`}</span>
                                    <strong>MOVES: {polarityMoves}</strong>
                                </div>

                                <strong className={`polarity-target polarity-target-${polarityTargetIsWhite ? "white" : "black"}`}>
                                    {`MAKE THEM ALL ${polarityTargetIsWhite ? "WHITE" : "BLACK"}!`}
                                </strong>

                                <div ref={polarityGridRef} className="polarity-rush-field">
                                    {polarityButtons.map((button, index) => (
                                        <button
                                            key={button.id}
                                            className={`polarity-button ${button.isWhite ? "polarity-button-white" : "polarity-button-black"} ${button.isBreaking ? "is-breaking" : ""}`}
                                            type="button"
                                            data-polarity-index={index}
                                            onClick={() => handlePolarityButtonPress(index)}
                                            disabled={isPolarityResolving}
                                            aria-label={`Polarity button ${index + 1}, currently ${button.isWhite ? "white" : "black"}`}
                                            style={{
                                                left: `${button.position.x}%`,
                                                top: `${button.position.y}%`,
                                                animationDelay: button.isBreaking ? `${index * POLARITY_EVENT.buttonBreakStaggerMs}ms` : undefined,
                                                animationDuration: button.isBreaking ? `${POLARITY_EVENT.breakDurationMs}ms` : undefined,
                                            }}
                                        />
                                    ))}
                                </div>

                                <p className="polarity-event-hint">CLICKING THE TARGET COLOR FLIPS IT BACK — MOVE FAST</p>
                            </div>
                        )}

                        {gamePhase === "polarityResult" && currentPolarityAttempt && (
                            <button className={`start-area polarity-result polarity-result-${polarityResult}`} type="button" onClick={leavePolarityEvent}>
                                <span className="start-message polarity-result-message">
                                    <small className="secret-event-label polarity-secret-label">POLARITY RUSH</small>
                                    <strong className="polarity-intro-title">
                                        {polarityResult === "success" ? "✅ PERFECTLY UNDECIDED" : "❌ POLARITY COLLAPSE"}
                                    </strong>
                                    <small className="polarity-rules">
                                        {polarityResult === "success" ? `ALL BUTTONS DESTROYED · +${currentPolarityTotalReward}⚡` : `TIME EXPIRED · TICKET ${activePolarityEventIndex + 1} USED`}
                                    </small>
                                    <small className="continue-hint">CLICK TO RETURN TO THE LAB</small>
                                </span>
                            </button>
                        )}

                        {gamePhase === "redLightIntro" && currentRedLightEvent && (
                            <div className="start-area event-intro-screen red-light-intro">
                                <div className="start-message red-light-intro-message">
                                    <small className="secret-event-label red-light-secret-label">SUSPICIOUS CLICK ACTIVITY</small>
                                    <strong className="red-light-intro-title">🚦 HUMAN CLICK VERIFICATION</strong>
                                    <small className="red-light-trigger">
                                        {currentRedLightEvent.requiredTotalPresses} TOTAL PRESSES DETECTED
                                    </small>
                                    <small className="red-light-reason">
                                        The chamber is starting to doubt you are human.
                                        <br />
                                        Honestly, so are we. Pass verification to continue.
                                    </small>
                                    <small className="red-light-rules">
                                        CLICK ON GREEN · RED MEANS STOP · CAUGHT LOCKS YOU FOR {RED_LIGHT_EVENT.caughtDurationMs / 1000} SECONDS
                                    </small>
                                    <small className="red-light-goal">
                                        {currentRedLightEvent.targetHits} SAFE CLICKS · {RED_LIGHT_EVENT.durationSeconds} SECONDS · {currentRedLightEvent.reward}⚡ REWARD
                                    </small>
                                    <span className="event-intro-action-slot">
                                        {eventIntroTimeLeft > 0 ? (
                                            <strong className="event-unlock-notice">SECURITY CHECK INITIALIZING...</strong>
                                        ) : (
                                            <button className="event-intro-action" type="button" onClick={startRedLightEvent}>START VERIFICATION</button>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {gamePhase === "redLightEvent" && currentRedLightEvent && (
                            <div className={`red-light-event red-light-event-${redLightState}`}>
                                <div className="red-light-event-header">
                                    <strong>🚦 HUMAN CLICK VERIFICATION</strong>
                                    <span>{redLightTimeLeft}s</span>
                                </div>

                                <div className="red-light-progress">
                                    <span>SAFE CLICKS</span>
                                    <strong>{redLightHits} / {currentRedLightEvent.targetHits}</strong>
                                </div>

                                <button
                                    className={`red-light-button red-light-button-${redLightState}`}
                                    type="button"
                                    onClick={handleRedLightPress}
                                    disabled={redLightState === "caught"}
                                    aria-label={redLightState === "red" ? "Do not press during red light" : "Press during green light"}
                                >
                                    {redLightState === "green" && "CLICK!"}
                                    {redLightState === "warning" && "LAST CHANCE!"}
                                    {redLightState === "red" && "DON'T MOVE!"}
                                    {redLightState === "caught" && "CAUGHT!"}
                                </button>

                                <p className="red-light-status">
                                    {redLightState === "green" && "GREEN LIGHT — GO!"}
                                    {redLightState === "warning" && "WARNING — RED LIGHT INCOMING!"}
                                    {redLightState === "red" && "RED LIGHT — HANDS OFF!"}
                                    {redLightState === "caught" && `INPUT LOCKED FOR ${RED_LIGHT_EVENT.caughtDurationMs / 1000} SECONDS`}
                                </p>
                            </div>
                        )}

                        {gamePhase === "redLightResult" && currentRedLightEvent && (
                            <button className={`start-area red-light-result red-light-result-${redLightResult}`} type="button" onClick={() => startNormalRun()}>
                                <span className="start-message red-light-result-message">
                                    <small className="secret-event-label red-light-secret-label">SECRET EVENT</small>
                                    <strong className="red-light-intro-title">
                                        {redLightResult === "success" ? "✅ HUMAN ENOUGH" : "❌ BOT BEHAVIOR DETECTED"}
                                    </strong>
                                    <small className="red-light-rules">
                                        {redLightResult === "success" ? `VERIFICATION PASSED · +${currentRedLightEvent.reward}⚡` : `TIME EXPIRED · ${redLightHits} / ${currentRedLightEvent.targetHits} SAFE CLICKS`}
                                    </small>
                                    <small className="continue-hint">CLICK TO START THE NEXT RUN</small>
                                </span>
                            </button>
                        )}

                        {!isFingerExhausted && gamePhase === "goldenRushIntro" && (
                            <div className="start-area event-intro-screen golden-rush-intro">
                                <div className="start-message golden-rush-intro-message">
                                    <small className="secret-event-label">SECRET EVENT</small>
                                    <strong className="golden-rush-intro-title">✨ GOLDEN RUSH ✨</strong>
                                    <small className="golden-rush-rules">
                                        ONE HIT · DOUBLE ENERGY · {GOLDEN_RUSH.durationSeconds} SECONDS
                                    </small>
                                    <span className="event-intro-action-slot">
                                        {eventIntroTimeLeft > 0 ? (
                                            <strong className="event-unlock-notice golden-event-unlock-notice">YOU UNLOCKED A SECRET EVENT</strong>
                                        ) : (
                                            <button className="event-intro-action golden-event-intro-action" type="button" onClick={startGoldenRush}>START GOLDEN RUSH</button>
                                        )}
                                    </span>
                                </div>
                            </div>
                        )}

                        {gamePhase === "goldenRush" && (
                            <>
                                <div className="golden-rush-banner">
                                    <strong>✨ GOLDEN RUSH ✨</strong>
                                    <span>{goldenRushTimeLeft}s</span>
                                </div>

                                <div className="small-button-phase golden-button-phase">
                                    {goldenButtons.map((goldenButton) => (
                                        <div
                                            key={goldenButton.id}
                                            className="small-target"
                                            style={{
                                                left: `${goldenButton.position.x}%`,
                                                top: `${goldenButton.position.y}%`,
                                            }}
                                        >
                                            <button
                                                className={`small-button golden-small-button ${goldenButton.isBreaking ? "is-breaking" : ""}`}
                                                type="button"
                                                disabled={goldenButton.isBreaking}
                                                aria-label="GOLDEN BUTTON"
                                                onPointerDown={(event) => {
                                                    if (event.button === 0) {
                                                        event.currentTarget.setPointerCapture(event.pointerId);
                                                    }
                                                }}
                                                onPointerUp={(event) => {
                                                    if (event.button === 0) {
                                                        handleGoldenButtonPress(goldenButton.id);
                                                    }
                                                }}
                                                onClick={(event) => {
                                                    if (event.detail === 0) {
                                                        handleGoldenButtonPress(goldenButton.id);
                                                    }
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </>
                        )}

                        {isFingerExhausted && gamePhase !== "intro" && gamePhase !== "redLightIntro" && gamePhase !== "redLightEvent" && gamePhase !== "redLightResult" && gamePhase !== "polarityIntro" && gamePhase !== "polarityEvent" && gamePhase !== "polarityResult" && gamePhase !== "demoEnding" && (
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

                        {gamePhase === "demoEnding" && (
                            <div
                                className="start-area ending-screen"
                                role="dialog"
                                aria-modal="true"
                                aria-labelledby="demo-ending-title"
                            >
                                <div className="ending-card">
                                    <small className="ending-label">DEMO COMPLETE</small>

                                    <strong id="demo-ending-title" className="ending-title">
                                        🏆 YOU DEFEATED THE VOID EMPEROR
                                    </strong>

                                    <p className="ending-copy">
                                        THE CHAMBER DOORS ARE OPEN. YOU BEAT THE DEMO. YOU ARE FINALLY FREE.
                                    </p>

                                    <p className="ending-joke">
                                        Unfortunately, your finger has already developed a clicking problem.
                                    </p>

                                    <p className="ending-credit">
                                        Built by{" "}
                                        <a
                                            href="https://github.com/Khalil-Abboud"
                                            target="_blank"
                                            rel="noreferrer"
                                        >
                                            Khalil Abboud
                                        </a>
                                    </p>

                                    <div className="ending-action-slot">
                                        {endingChoiceTimeLeft > 0 ? (
                                            <strong className="ending-wait">
                                                FREEDOM PROCESSING... {endingChoiceTimeLeft}
                                            </strong>
                                        ) : (
                                            <div className="ending-actions">
                                                <button
                                                    className="ending-leave-button"
                                                    type="button"
                                                    onClick={leaveDemoEnding}
                                                >
                                                    LEAVE THE CHAMBER
                                                </button>

                                                <button
                                                    className="ending-endless-button"
                                                    type="button"
                                                    onClick={continueToEndlessMode}
                                                >
                                                    KEEP CLICKING — ENDLESS MODE
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
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
                                            {Math.ceil(buttonDurability)} / {currentButton.durability}
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

                    <RunData
                        className="compact-run-data"
                        currentScore={runScore}
                        bestScore={bestScore}
                        totalPresses={totalManualPresses}
                    />

                    <div className="upgrades">
                        <section className="upgrade">
                            <h2>⏱️ BUTTON SPAWN RATE</h2>

                            <p>
                                {`Level: ${spawnSpeedLevel} / ${spawnSpeedLevels.length - 1}`}
                            </p>

                            <p>
                                {isSpawnSpeedMax
                                    ? `+${currentSpawnSpeedBonus}% spawn rate`
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

                        <section className="upgrade chain-lightning-upgrade">
                            <h2>⚡ CHAIN LIGHTNING</h2>

                            <p>
                                {`Level: ${chainLightningLevel} / ${chainLightningLevels.length - 1}`}
                            </p>

                            <p>
                                {isChainLightningMax
                                    ? `${currentChainLightning.damageMultipliers.length} jumps · ${currentChainLightning.damageMultipliers.map((multiplier) => `${multiplier * 100}%`).join(" → ")} damage`
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

                        <section className="upgrade auto-finger-upgrade">
                            <h2>🖱️ AUTO FINGER</h2>

                            <p>{`Level: ${autoFingerLevel} / ${autoFingerLevels.length - 1}`}</p>

                            <p>{autoFingerDescription}</p>

                            <button
                                type="button"
                                onClick={buyAutoFingerUpgrade}
                                disabled={isRunActive || isAutoFingerMax || energy < autoFingerUpgradeCost}
                            >
                                {isAutoFingerMax
                                    ? "MAX LEVEL"
                                    : autoFingerLevel === 0
                                        ? `UNLOCK — ${autoFingerUpgradeCost}⚡`
                                        : `UPGRADE — ${autoFingerUpgradeCost}⚡`}
                            </button>
                        </section>

                        <section className="upgrade fireball-upgrade">
                            <h2>🔥 FIREBALL DROP</h2>

                            <p>{`Level: ${fireballLevel} / ${fireballLevels.length - 1}`}</p>

                            <p>{fireballDescription}</p>

                            <button
                                type="button"
                                onClick={buyFireballUpgrade}
                                disabled={isRunActive || isFireballMax || energy < fireballUpgradeCost}
                            >
                                {isFireballMax
                                    ? "MAX LEVEL"
                                    : fireballLevel === 0
                                        ? `UNLOCK — ${fireballUpgradeCost}⚡`
                                        : `UPGRADE — ${fireballUpgradeCost}⚡`}
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
                            <h2>💪 PRESS POWER</h2>

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
                            <h2>❤️ FINGER HEALTH</h2>

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

                        <section className="upgrade polarity-upgrade">
                            <h2>⚫ POLARITY RUSH EVENT ⚪</h2>
                            <p>{`Tickets used: ${polarityEventsPlayed} / ${POLARITY_EVENT.attempts.length}`}</p>
                            <p>
                                {isPolaritySoldOut
                                    ? `${POLARITY_EVENT.attempts.length} event tickets completed`
                                    : `Next: Pay ${nextPolarityAttempt.cost}⚡ · Win ${nextPolarityTotalReward}⚡`}
                            </p>

                            <button
                                type="button"
                                onClick={buyPolarityEvent}
                                disabled={isRunActive || isEventScreenOpen || isPolaritySoldOut || energy < (nextPolarityAttempt?.cost ?? 0)}
                            >
                                {isPolaritySoldOut ? "SOLD OUT" : `BUY EVENT TICKET — ${nextPolarityAttempt.cost}⚡`}
                            </button>
                        </section>

                        <section className="upgrade">
                            <h2>🩹 FINGER REPAIR KIT</h2>
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
            </div>
        </main >

    );
}
