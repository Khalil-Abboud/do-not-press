import { useEffect, useRef, useState } from "react";
const BUTTONS = [
    {
        name: "FINGER BREAKER",
        buttonText: "DO NOT PRESS",
        // buttonText: "",
        durability: 120,
        pressReward: 0,
        breakReward: 50,
        damagePerSecond: 2,
        colorClass: "red-button",
        defeatMessage: "LUCKY. THE NEXT ONE HITS BACK.",
    },
    {
        name: "Mouse nightmare",
        buttonText: "🤨 STILL CLICKING?",
        // buttonText: "",
        durability: 500,
        pressReward: 0,
        breakReward: 200,
        damagePerSecond: 4,
        colorClass: "blue-button",
        defeatMessage: "STILL CLICKING? YOUR FINGER HAS ISSUES.",
    },
    {
        name: "THE UNPRESSABLE",
        buttonText: "🫵 YOUR FINGER ASKED FOR THIS",
        // buttonText: "",
        durability: 2000,
        pressReward: 0,
        breakReward: 1000,
        damagePerSecond: 8,
        colorClass: "green-button",
        defeatMessage: "YOU WON. YOUR FINGER DIDN'T.",
    },
];

const SMALL_BUTTONS = [
    {
        name: "SMALL BUTTON",
        durability: 10,
        pressReward: 0,
        breakReward: 2,
    },
];

const BASE_PRESS_POWER = 1;
const POWER_PER_LEVEL = 1;
const BASE_POWER_UPGRADE_COST = 10;

const BASE_FINGER_HEALTH = 5;
const HEALTH_PER_LEVEL = 5;
const BASE_HEALTH_UPGRADE_COST = 10;
const HEAL_ITEM_COST = 15;
const HEAL_AMOUNT = 10;

const FINGER_DAMAGE_PER_BUTTON = 1;
const RESTART_COOLDOWN_SECONDS = 3;
const HEALTH_TICK_MS = 50;
const STAGE_DAMAGE_PER_SECOND = 1;

const SMALL_BUTTON_PHASE_DURATION = 10;
const SMALL_BUTTON_SPAWN_INTERVAL_MS = 1500;
const MAX_ACTIVE_SMALL_BUTTONS = 16;
const SMALL_BUTTON_BREAK_DURATION_MS = 100;

function playBreakSound(duration = 1) {
    const audioContext = new AudioContext();
    const sampleRate = audioContext.sampleRate;

    const audioBuffer = audioContext.createBuffer(
        1,
        sampleRate * duration,
        sampleRate,
    );

    const soundData = audioBuffer.getChannelData(0);

    for (let i = 0; i < soundData.length; i++) {
        const progress = i / soundData.length;
        const fadeOut = Math.pow(1 - progress, 3);
        const noise = Math.random() * 2 - 1;

        soundData[i] = noise * fadeOut;
    }

    const soundSource = audioContext.createBufferSource();
    const filter = audioContext.createBiquadFilter();
    const volume = audioContext.createGain();

    soundSource.buffer = audioBuffer;

    filter.type = "highpass";
    filter.frequency.value = 500;

    volume.gain.setValueAtTime(
        0.25,
        audioContext.currentTime,
    );

    volume.gain.exponentialRampToValueAtTime(
        0.001,
        audioContext.currentTime + duration,
    );

    soundSource.connect(filter);
    filter.connect(volume);
    volume.connect(audioContext.destination);

    soundSource.start();

    soundSource.addEventListener("ended", () => {
        audioContext.close();
    });
}

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
    const [buttonDurability, setButtonDurability] = useState(
        BUTTONS[0].durability,);

    const [buttonsBroken, setButtonsBroken] = useState(0);
    const [energy, setEnergy] = useState(() =>
        getSavedNumber("energy", 0),);
    const [fingerHealth, setFingerHealth] = useState(0);
    const [isRunActive, setIsRunActive] = useState(false);
    const [gamePhase, setGamePhase] = useState("waiting");
    const [stageMessage, setStageMessage] = useState("");
    const [phaseTimeLeft, setPhaseTimeLeft] = useState(SMALL_BUTTON_PHASE_DURATION,);
    const [restartCooldown, setRestartCooldown] = useState(0);
    const [isButtonBreaking, setIsButtonBreaking] = useState(false);
    const [powerLevel, setPowerLevel] = useState(() =>
        getSavedNumber("powerLevel", 0),);
    const [healthLevel, setHealthLevel] = useState(() =>
        getSavedNumber("healthLevel", 0),);
    const [healItemCount, setHealItemCount] = useState(() =>
        getSavedNumber("healItemCount", 0),
    );

    const pressPower = BASE_PRESS_POWER + powerLevel * POWER_PER_LEVEL;
    const powerUpgradeCost = BASE_POWER_UPGRADE_COST * (powerLevel + 1);

    const maxFingerHealth = BASE_FINGER_HEALTH + healthLevel * HEALTH_PER_LEVEL;
    const healthUpgradeCost = BASE_HEALTH_UPGRADE_COST * (healthLevel + 1);

    const musicRef = useRef(null);

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
    }, [energy, powerLevel, healthLevel]);

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
                    : STAGE_DAMAGE_PER_SECOND;

            const damagePerTick =
                phaseDamage * (HEALTH_TICK_MS / 1000);

            setFingerHealth((currentHealth) =>
                Math.max(0, currentHealth - damagePerTick),
            );
        }, HEALTH_TICK_MS);

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
                        MAX_ACTIVE_SMALL_BUTTONS
                    ) {
                        return currentButtons;
                    }

                    return [
                        ...currentButtons,
                        createSmallButtonInstance(),
                    ];
                },
            );
        }, SMALL_BUTTON_SPAWN_INTERVAL_MS);

        return () => {
            clearInterval(spawnTimerId);
        };
    }, [gamePhase, isRunActive]);

    useEffect(() => {
        if (!isFingerExhausted || !isRunActive) {
            return;
        }

        setIsRunActive(false);
        setGamePhase("cooldown");
        setRestartCooldown(RESTART_COOLDOWN_SECONDS);
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

    function handleSmallButtonPress(buttonId) {
        const targetButton = activeSmallButtons.find(
            (button) => button.id === buttonId,
        );

        if (!targetButton || targetButton.isBreaking) {
            return;
        }

        const buttonType =
            SMALL_BUTTONS[targetButton.typeIndex];

        setPresses(
            (currentPresses) => currentPresses + 1,
        );

        setEnergy(
            (currentEnergy) =>
                currentEnergy + buttonType.pressReward,
        );

        if (targetButton.durability <= pressPower) {
            setButtonsBroken(
                (currentButtons) => currentButtons + 1,
            );

            setEnergy(
                (currentEnergy) =>
                    currentEnergy + buttonType.breakReward,
            );

            playBreakSound(SMALL_BUTTON_BREAK_DURATION_MS / 1000,);

            setActiveSmallButtons(
                (currentButtons) =>
                    currentButtons.map((button) => {
                        if (button.id !== buttonId) {
                            return button;
                        }

                        return {
                            ...button,
                            durability: 0,
                            isBreaking: true,
                        };
                    }),
            );

            setTimeout(() => {
                setActiveSmallButtons(
                    (currentButtons) =>
                        currentButtons.filter(
                            (button) => button.id !== buttonId,
                        ),
                );
            }, SMALL_BUTTON_BREAK_DURATION_MS);

            return;
        }

        setActiveSmallButtons(
            (currentButtons) =>
                currentButtons.map((button) => {
                    if (button.id !== buttonId) {
                        return button;
                    }

                    return {
                        ...button,
                        durability: Math.max(
                            0,
                            button.durability - pressPower,
                        ),
                    };
                }),
        );
    }

    function handlePress() {
        if (isButtonBreaking) {
            return;
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

                setFingerHealth((currentHealth) =>
                    Math.max(0, currentHealth - FINGER_DAMAGE_PER_BUTTON),
                );

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
        setPhaseTimeLeft(SMALL_BUTTON_PHASE_DURATION);
        setActiveSmallButtons([createSmallButtonInstance(),]);
        setIsButtonBreaking(false);
    }

    function startNextStage() {
        setActiveSmallButtons([
            createSmallButtonInstance(),
        ]);

        setPhaseTimeLeft(
            SMALL_BUTTON_PHASE_DURATION,
        );

        setGamePhase("smallButtons");
    }

    function buyHealItem() {
        if (
            isRunActive ||
            energy < HEAL_ITEM_COST ||
            healItemCount >= 1
        ) {
            return;
        }

        setEnergy(
            (currentEnergy) =>
                currentEnergy - HEAL_ITEM_COST,
        );

        setHealItemCount(
            (currentCount) => currentCount + 1,
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

                <div className="button-chamber">
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
                                                        buttonType.durability
                                                    ) * 100}%`,
                                                }}
                                            />
                                        </div>

                                        <button
                                            className={`small-button ${smallButton.isBreaking ?
                                                "is-breaking" : ""}`}
                                            type="button"
                                            disabled={smallButton.isBreaking}
                                            aria-label={buttonType.name}
                                            onClick={() =>
                                                handleSmallButtonPress(smallButton.id)
                                            }
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
                                className={`main-button play-button ${currentButton.colorClass
                                    } ${isButtonBreaking ? "is-breaking" : ""
                                    }`}
                                type="button"
                                onClick={handlePress}
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
                        <h2>PRESS POWER</h2>

                        <p>Level: {powerLevel}</p>
                        <p>Damage per press: {pressPower}</p>

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
                        <p>Health per run: {maxFingerHealth}</p>

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
                </div>

            </section>
        </main >

    );
}