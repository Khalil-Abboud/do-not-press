function FireballDrop({ strike }) {
    if (!strike) {
        return null;
    }

    return (
        <div
            key={strike.id}
            className="fireball-drop"
            style={{
                "--fireball-x": `${strike.x}%`,
                "--fireball-lane-width": `${strike.laneWidthPercent}%`,
                "--fireball-warning-duration": `${strike.warningDurationMs}ms`,
                "--fireball-fall-duration": `${strike.fallDurationMs}ms`,
                "--fireball-impact-delay": `${strike.warningDurationMs + strike.fallDurationMs}ms`,
                "--fireball-impact-duration": `${strike.impactDurationMs}ms`,
            }}
            aria-hidden="true"
        >
            <span className="fireball-warning-lane" />

            <svg className="fireball-projectile" viewBox="0 0 64 96">
                <path
                    className="fireball-outer-flame"
                    d="M34 2C35 19 52 23 49 44C58 37 62 55 54 69C50 84 42 94 31 94C15 94 4 82 7 65C9 51 20 45 18 30C25 34 31 23 34 2Z"
                />
                <path
                    className="fireball-inner-flame"
                    d="M33 29C35 42 45 46 43 59C49 56 51 68 46 77C42 85 37 89 30 89C21 89 15 82 16 73C17 63 25 59 24 50C29 52 32 42 33 29Z"
                />
                <circle className="fireball-core" cx="31" cy="69" r="14" />
            </svg>

            <span className="fireball-impact-lane" />
        </div>
    );
}

export default FireballDrop;
