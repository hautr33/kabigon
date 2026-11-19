export function HomeButton({ onClick, hidden }: { onClick: () => void; hidden?: boolean }) {
    return (
        <button className="icon-btn" onClick={onClick} title="Về menu" style={{ opacity: hidden ? 0 : 1, pointerEvents: hidden ? 'none' : 'auto' }}>
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M3 10.5 12 3l9 7.5" />
                <path d="M5.5 9v11h13V9" />
            </svg>
        </button>
    );
}
