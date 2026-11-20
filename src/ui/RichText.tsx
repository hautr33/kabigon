import { Fragment, type ReactNode } from 'react';
import { Icon, isIconName, type IconName } from './Icon';

// Chuỗi lời thoại → JSX.
//   \n       : xuống dòng
//   [[...]]  : đoạn nổi bật (vàng, phát sáng)
//   :heart:  : icon vẽ sẵn (xem danh sách tên trong ui/Icon.tsx)
//   Mặt cười gõ kiểu nhắn tin tự đổi thành icon:  :>> / :>  → smug   ·   :<< / :<  → pout   ·   :3  → cat
export function RichText({ text }: { text: string }) {
    return (
        <>
            {text.split('\n').map((line, i) => (
                <Fragment key={i}>
                    {i > 0 && <br />}
                    {line.split(/(\[\[.*?\]\])/).map((part, j) =>
                        part.startsWith('[[') ? <span key={j} className="hl">{icons(part.slice(2, -2))}</span> : <Fragment key={j}>{icons(part)}</Fragment>,
                    )}
                </Fragment>
            ))}
        </>
    );
}

const EMOTICON: Record<string, IconName> = { ':>>': 'smug', ':>': 'smug', ':<<': 'pout', ':<': 'pout', ':3': 'cat' };
// chỉ đổi khi mặt cười đứng riêng (đầu câu / sau dấu cách), để "10:30" không bị đổi nhầm
const EMOTICON_RE = /(?<=^|\s)(:>>?|:<<?|:3)(?=$|[\s!?.,~)])/g;

function icons(text: string): ReactNode {
    return text.replace(EMOTICON_RE, (e) => `:${EMOTICON[e]}:`).split(/(:[a-z-]+:)/).map((part, k) => {
        const name = part.slice(1, -1);
        return part.length > 2 && part.startsWith(':') && part.endsWith(':') && isIconName(name) ? <Icon key={k} name={name} /> : part;
    });
}
