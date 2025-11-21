import React from 'react';

type SubtitleProps = {
    text?: string;
}

export default function Subtitle(props: SubtitleProps) {
    return (
        <>
            {props.text && (
                <h2 className="text-2xl font-bold my-4">{props.text}</h2>
            )}
        </>
    )
}