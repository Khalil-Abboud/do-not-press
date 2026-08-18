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
    GOLDEN_RUSH,
    RED_LIGHT_EVENT,
    POLARITY_EVENT,
    SPAWN_SPEED_UPGRADE,
} from "./data/gameConfig";
import { playBreakSound } from "./utils/audio"
import { createSmallButtonInstance, createGoldenButtonInstance } from "./utils/buttonUtils";
import { findLightningChain, createLightningPoints, createLightningBranches } from "./utils/lightning";
import { createPolarityRushButtons, togglePolarityButton, isPolarityWaveComplete } from "./utils/polarity";
import LightningEffect from "./components/LightningEffect";

function getSavedNumber(key, defaultValue) {
    const savedValue = localStorage.getItem(key);

    if (savedValue === null) {
        return defaultValue;
    }

    return Number(savedValue);
}

function getSavedArray(key) {
    const savedValue = localStorage.getItem(key);

    if (savedValue === null) {
        return [];
    }

    try {
        const parsedValue = JSON.parse(savedValue);
        return Array.isArray(parsedValue) ? parsedValue : [];
    } catch {
        return [];
    }
}

function getRandomDuration([minimum, maximum]) {
    return minimum + Math.random() * (maximum - minimum);
}

function getSavedPolarityEventIndex() {
    const savedEventIndex = getSavedNumber("pendingPolarityEventIndex", -1);
    return savedEventIndex >= 0 && savedEventIndex < POLARITY_EVENT.attempts.length ? savedEventIndex : -1;
}

const EVENT_INTRO_DELAY_SECONDS = 2;

export default function App() {
    const [presses, setPresses] = useState(0);
    const [totalManualPresses, setTotalManualPresses] = useState(() => getSavedNumber("totalManualPresses", 0));
    const [buttonIndex, setButtonIndex] = useState(0);
    const currentButton = BUTTONS[buttonIndex];
    const [activeSmallButtons, setActiveSmallButtons,] = useState([]);
    const [goldenButtons, setGoldenButtons] = useState([]);
    const [rewardPopups, setRewardPopups] = useState([]);
    const [lightningEffect, setLightningEffect] = useState(null);
    const [buttonDurability, setButtonDurability] = useState(
        BUTTONS[0].durability,);

    const [buttonsBroken, setButtonsBroken] = useState(0);
    const [energy, setEnergy] = useState(() =>
        getSavedNumber("energy", 0),);
    const [fingerHealth, setFingerHealth] = useState(0);
    const [isRunActive, setIsRunActive] = useState(false);
    const [gamePhase, setGamePhase] = useState(() => getSavedPolarityEventIndex() >= 0 ? "polarityIntro" : "waiting");
    const [stageMessage, setStageMessage] = useState("");
    const [phaseTimeLeft, setPhaseTimeLeft] = useState(SMALL_BUTTON_PHASE.durationSeconds,);
    const [goldenRushTimeLeft, setGoldenRushTimeLeft] = useState(0);
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
    const [completedGoldenRushes, setCompletedGoldenRushes] = useState(() =>
        getSavedArray("completedGoldenRushes"),);
    const [completedRedLightEvents, setCompletedRedLightEvents] = useState(() => getSavedArray("completedRedLightEvents"));
    const [redLightEventIndex, setRedLightEventIndex] = useState(null);
    const [redLightTimeLeft, setRedLightTimeLeft] = useState(0);
    const [redLightHits, setRedLightHits] = useState(0);
    const [redLightState, setRedLightState] = useState("green");
    const [redLightResult, setRedLightResult] = useState(null);
    const [polarityEventsPlayed, setPolarityEventsPlayed] = useState(() => Math.min(Math.max(getSavedNumber("polarityEventsPlayed", 0), 0), POLARITY_EVENT.attempts.length));
    const [pendingPolarityEventIndex, setPendingPolarityEventIndex] = useState(() => getSavedPolarityEventIndex());
    const [activePolarityEventIndex, setActivePolarityEventIndex] = useState(() => {
        const savedEventIndex = getSavedPolarityEventIndex();
        return savedEventIndex >= 0 ? savedEventIndex : null;
    });
    const [polarityButtons, setPolarityButtons] = useState([]);
    const [polarityTimeLeft, setPolarityTimeLeft] = useState(0);
    const [polarityMoves, setPolarityMoves] = useState(0);
    const [polarityWave, setPolarityWave] = useState(1);
    const [polarityTargetIsWhite, setPolarityTargetIsWhite] = useState(true);
    const [polarityResult, setPolarityResult] = useState(null);
    const [isPolarityResolving, setIsPolarityResolving] = useState(false);
    const [eventIntroTimeLeft, setEventIntroTimeLeft] = useState(() => getSavedPolarityEventIndex() >= 0 ? EVENT_INTRO_DELAY_SECONDS : 0);
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

    const pendingRedLightEventIndex = RED_LIGHT_EVENT.appearances.findIndex((appearance, index) => totalManualPresses >= appearance.requiredTotalPresses && !completedRedLightEvents.includes(index));
    const currentRedLightEvent = redLightEventIndex === null ? null : RED_LIGHT_EVENT.appearances[redLightEventIndex];

    const isPolaritySoldOut = polarityEventsPlayed >= POLARITY_EVENT.attempts.length;
    const nextPolarityAttempt = isPolaritySoldOut ? null : POLARITY_EVENT.attempts[polarityEventsPlayed];
    const currentPolarityAttempt = activePolarityEventIndex === null ? null : POLARITY_EVENT.attempts[activePolarityEventIndex];
    const nextPolarityTotalReward = nextPolarityAttempt ? nextPolarityAttempt.buttonCount * nextPolarityAttempt.waves * nextPolarityAttempt.rewardPerButton : 0;
    const currentPolarityTotalReward = currentPolarityAttempt ? currentPolarityAttempt.buttonCount * currentPolarityAttempt.waves * currentPolarityAttempt.rewardPerButton : 0;
    const isEventScreenOpen = ["goldenRushIntro", "goldenRush", "redLightIntro", "redLightEvent", "redLightResult", "polarityIntro", "polarityEvent", "polarityResult"].includes(gamePhase);

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
    const redLightFinishedRef = useRef(false);
    const polarityGridRef = useRef(null);
    const polarityFinishedRef = useRef(false);
    const polarityResolvingRef = useRef(false);

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
        localStorage.setItem("completedGoldenRushes", JSON.stringify(completedGoldenRushes));
        localStorage.setItem("totalManualPresses", String(totalManualPresses));
        localStorage.setItem("completedRedLightEvents", JSON.stringify(completedRedLightEvents));
        localStorage.setItem("polarityEventsPlayed", String(polarityEventsPlayed));
        localStorage.setItem("pendingPolarityEventIndex", String(pendingPolarityEventIndex));
    }, [energy, powerLevel, healthLevel, healItemCount, chainLightningLevel, spawnSpeedLevel, healingButtonLevel, completedGoldenRushes, totalManualPresses, completedRedLightEvents, polarityEventsPlayed, pendingPolarityEventIndex]);

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

        setEnergy(
            (currentEnergy) =>
                currentEnergy + buttonType.pressReward,
        );

        damageSmallButton(
            targetButton,
            pressPower,
        );

    }

    function destroyGoldenButton(button) {
        if (!button || button.isBreaking) {
            return;
        }

        setButtonsBroken((currentButtons) => currentButtons + 1);
        setEnergy((currentEnergy) => currentEnergy + button.breakReward);
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
        const nextButtonIndex = Math.min(buttonIndex + 1, BUTTONS.length - 1);

        setButtonIndex(nextButtonIndex);
        setButtonDurability(BUTTONS[nextButtonIndex].durability);
        setStageMessage(currentButton.defeatMessage);
        setActiveSmallButtons([]);
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setGamePhase("stageComplete");
        setIsButtonBreaking(false);
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
        setButtonsBroken((currentButtons) => currentButtons + solvedButtons.length);

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

        setEnergy((currentEnergy) => currentEnergy + currentButton.pressReward);

        if (buttonDurability <= pressPower) {
            const destroyedBossPosition = bossPosition || getElementCenterPosition(bossButtonRef.current, chamberRef.current);

            setButtonDurability(0);
            playBreakSound();
            setIsButtonBreaking(true);
            setEnergy((currentEnergy) => currentEnergy + currentButton.breakReward);
            showRewardPopup(currentButton.breakReward, destroyedBossPosition);

            setTimeout(() => {
                setButtonsBroken((currentButtons) => currentButtons + 1);

                // setFingerHealth((currentHealth) =>
                //     Math.max(0, currentHealth - RUN_RULES.bossBreakDamage),
                // );

                if (completedGoldenRushes.includes(buttonIndex)) {
                    completeCurrentStage();
                } else {
                    showGoldenRushIntro();
                }
            }, 1000);

            return;
        }

        setButtonDurability((currentDurability) => Math.max(0, currentDurability - pressPower),);
    }

    function startNormalRun() {
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
        setGoldenButtons([]);
        setGoldenRushTimeLeft(0);
        setIsButtonBreaking(false);
        setRedLightEventIndex(null);
        setRedLightResult(null);
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
                                <small className="secret-event-label red-light-secret-label">SECRET EVENT</small>
                                <strong className="red-light-intro-title">🚦 HUMAN CLICK VERIFICATION</strong>
                                <small className="red-light-rules">
                                    CLICK ON GREEN · RED MEANS STOP · CAUGHT LOCKS YOU FOR {RED_LIGHT_EVENT.caughtDurationMs / 1000} SECONDS
                                </small>
                                <small className="red-light-goal">
                                    {currentRedLightEvent.targetHits} SAFE CLICKS · {RED_LIGHT_EVENT.durationSeconds} SECONDS · {currentRedLightEvent.reward}⚡ REWARD
                                </small>
                                <span className="event-intro-action-slot">
                                    {eventIntroTimeLeft > 0 ? (
                                        <strong className="event-unlock-notice">YOU UNLOCKED A SECRET EVENT</strong>
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
                        <button className={`start-area red-light-result red-light-result-${redLightResult}`} type="button" onClick={startNormalRun}>
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

                    {isFingerExhausted && gamePhase !== "redLightIntro" && gamePhase !== "redLightEvent" && gamePhase !== "redLightResult" && gamePhase !== "polarityIntro" && gamePhase !== "polarityEvent" && gamePhase !== "polarityResult" && (
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

                    <section className="upgrade polarity-upgrade">
                        <h2>⚫ POLARITY RUSH ⚪</h2>
                        <p>{`Tickets used: ${polarityEventsPlayed} / ${POLARITY_EVENT.attempts.length}`}</p>
                        <p>
                            {isPolaritySoldOut
                                ? "All event tickets completed"
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
