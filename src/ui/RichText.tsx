import { Fragment } from 'react';

// Chuỗi lời thoại → JSX.   \n : xuống dòng.   [[...]] : đoạn nổi bật (vàng, phát sáng)
export function RichText({ text }: { text: string }) {
    return (
        <>
            {text.split('\n').map((line, i) => (
                <Fragment key={i}>
                    {i > 0 && <br />}
                    {line.split(/(\[\[.*?\]\])/).map((part, j) =>
                        part.startsWith('[[') ? <span key={j} className="hl">{part.slice(2, -2)}</span> : <Fragment key={j}>{part}</Fragment>,
                    )}
                </Fragment>
            ))}
        </>
    );
}
