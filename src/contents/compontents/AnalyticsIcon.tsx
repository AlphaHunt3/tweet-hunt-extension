import React from 'react';

export const AnalyticsIcon = ({ className = "w-6 h-6" }: { className?: string }) => (
    <svg
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className={className}
    >
        <path
            d="M3 12C3 7.02944 7.02944 3 12 3C16.9706 3 21 7.02944 21 12C21 16.9706 16.9706 21 12 21C7.02944 21 3 16.9706 3 12Z"
            className="stroke-blue-400"
            strokeWidth="1.5"
        />
        <path
            d="M8 14L10.5 11.5L13 14L16 11"
            className="stroke-blue-400"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
        />
        <path
            d="M8 8.5H16"
            className="stroke-blue-400"
            strokeWidth="1.5"
            strokeLinecap="round"
        />
        <circle
            cx="12"
            cy="12"
            r="3"
            className="fill-blue-400/20"
        />
    </svg>
);