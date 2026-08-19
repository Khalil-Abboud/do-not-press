function AutoFinger({ visualState }) {
    if (!visualState) {
        return null;
    }

    return (
        <div
            className={`auto-finger ${visualState.isPressing ? "is-pressing" : ""}`}
            style={{
                left: `${visualState.position.x}%`,
                top: `${visualState.position.y}%`,
                "--auto-finger-travel-duration": `${visualState.travelDurationMs}ms`,
            }}
            aria-hidden="true"
        >
            <span className="auto-finger-impact" />

            <svg className="auto-finger-cursor" viewBox="0 0 64 64">
                <path
                    d="M10 6V49L22.5 37.5L32.5 58L43 52.5L33.5 34H51L10 6Z"
                    fill="currentColor"
                    stroke="#12151a"
                    strokeWidth="4"
                    strokeLinejoin="round"
                />

                <path
                    d="M14 14V40L21 33.5L27 45.5"
                    fill="none"
                    stroke="#ffffff"
                    strokeWidth="3"
                    strokeLinecap="round"
                    opacity="0.65"
                />
            </svg>
        </div>
    );
}

export default AutoFinger;
