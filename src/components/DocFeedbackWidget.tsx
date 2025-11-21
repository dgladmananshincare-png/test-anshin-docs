import React, {useId, useState} from 'react';

export default function DocFeedbackWidget() {
    const [submitted, setSubmitted] = useState(false);
    const [hovered, setHovered] = useState<null | 'yes' | 'no'>(null);
    const [focused, setFocused] = useState<null | 'yes' | 'no'>(null);
    const qId = useId();

    const handleFeedback = (value: 'yes' | 'no') => {
        window.gtag?.("event", "feedback", {
            page_path: window.location.pathname,
            value,
        });
        setSubmitted(true);
    };

    return (
        <div
            style={{
                marginTop: "2rem",
                padding: "1rem 0",
                borderTop: "1px solid #ccc",
            }}
        >
            {!submitted ? (
                <div role="group" aria-labelledby={qId}>
                    <p id={qId} style={{ marginBottom: "0.5rem", fontWeight: "bold" }}>
                        このページは役に立ちましたか？
                    </p>
                    <button
                        type="button"
                        aria-label="役に立った"
                        onClick={() => handleFeedback('yes')}
                        onMouseEnter={() => setHovered('yes')}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setFocused('yes')}
                        onBlur={() => setFocused(null)}
                        style={{
                            marginRight: 8,
                            background: hovered === 'yes' ? 'var(--ifm-color-emphasis-200)' : 'transparent',
                            border: 'none',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background-color 120ms ease, box-shadow 120ms ease',
                            boxShadow: focused === 'yes' ? '0 0 0 3px rgba(2, 112, 243, 0.25)' : 'none',
                            outline: focused === 'yes' ? '2px solid var(--ifm-color-primary)' : 'none',
                            outlineOffset: 2,
                        }}
                    >
                        <svg
                          width="24"
                          height="24"
                          fill="none"
                          stroke="currentColor"
                          style={{ color: 'var(--ifm-color-primary)' }}
                          aria-hidden="true"
                          focusable="false"
                        >
                            <use href="/img/heroicons-outline.svg#thumb-up" />
                        </svg>
                    </button>
                    <button
                        type="button"
                        aria-label="役に立たなかった"
                        onClick={() => handleFeedback('no')}
                        onMouseEnter={() => setHovered('no')}
                        onMouseLeave={() => setHovered(null)}
                        onFocus={() => setFocused('no')}
                        onBlur={() => setFocused(null)}
                        style={{
                            background: hovered === 'no' ? 'var(--ifm-color-emphasis-200)' : 'transparent',
                            border: 'none',
                            width: 40,
                            height: 40,
                            borderRadius: '50%',
                            display: 'inline-flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            transition: 'background-color 120ms ease, box-shadow 120ms ease',
                            boxShadow: focused === 'no' ? '0 0 0 3px rgba(2, 112, 243, 0.25)' : 'none',
                            outline: focused === 'no' ? '2px solid var(--ifm-color-primary)' : 'none',
                            outlineOffset: 2,
                        }}
                    >
                        <svg
                          width="24"
                          height="24"
                          fill="none"
                          stroke="currentColor"
                          style={{ color: "var(--ifm-color-primary)" }}
                          aria-hidden="true"
                          focusable="false"
                        >
                            <use href="/img/heroicons-outline.svg#thumb-down" />
                        </svg>
                    </button>
                </div>
            ) : (
                <p role="status" aria-live="polite" style={{ fontWeight: "bold", color: "var(--ifm-color-primary)" }}>
                    ご意見ありがとうございます。
                </p>
            )}
        </div>
    );
}
