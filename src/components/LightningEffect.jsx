function LightningEffect({ effect }) {
    if (!effect) {
        return null;
    }

    return (
        <svg
            key={effect.id}
            className="lightning-layer"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            aria-hidden="true"
        >
            {effect.bolts.map((bolt) => (
                <g key={bolt.id}>
                    {bolt.branches.map((branchPoints, index) => (
                        <g key={`${bolt.id}-branch-${index}`}>
                            <polyline
                                className="lightning-glow lightning-branch-glow"
                                points={branchPoints}
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                                style={{
                                    animationDelay: `${bolt.delayMs + index * 7}ms`,
                                }}
                            />

                            <polyline
                                className="lightning-core lightning-branch-core"
                                points={branchPoints}
                                fill="none"
                                vectorEffect="non-scaling-stroke"
                                style={{
                                    animationDelay: `${bolt.delayMs + index * 7}ms`,
                                }}
                            />
                        </g>
                    ))}

                    <polyline
                        className="lightning-glow"
                        points={bolt.points}
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                        style={{
                            animationDelay: `${bolt.delayMs}ms`,
                        }}
                    />

                    <polyline
                        className="lightning-core"
                        points={bolt.points}
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                        style={{
                            animationDelay: `${bolt.delayMs}ms`,
                        }}
                    />
                </g>
            ))}
        </svg>
    );
}

export default LightningEffect;
