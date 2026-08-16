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
            {effect.branches.map((branchPoints, index) => (
                <g key={`${effect.id}-${index}`}>
                    <polyline
                        className="lightning-glow lightning-branch-glow"
                        points={branchPoints}
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                        style={{
                            animationDelay: `${index * 7}ms`,
                        }}
                    />

                    <polyline
                        className="lightning-core lightning-branch-core"
                        points={branchPoints}
                        fill="none"
                        vectorEffect="non-scaling-stroke"
                        style={{
                            animationDelay: `${index * 7}ms`,
                        }}
                    />
                </g>
            ))}

            <polyline
                className="lightning-glow"
                points={effect.points}
                fill="none"
                vectorEffect="non-scaling-stroke"
            />

            <polyline
                className="lightning-core"
                points={effect.points}
                fill="none"
                vectorEffect="non-scaling-stroke"
            />
        </svg>
    );
}

export default LightningEffect;