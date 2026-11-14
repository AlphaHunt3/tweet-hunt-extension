import type { ReactNode, SVGProps } from 'react';

type IconProps = Omit<SVGProps<SVGSVGElement>, 'children'> & { size?: number };

function makeIcon(paths: ReactNode, filled = false) {
  return function Icon({ size = 16, ...props }: IconProps) {
    return (
      <svg
        viewBox='0 0 24 24'
        width={size}
        height={size}
        fill={filled ? 'currentColor' : 'none'}
        stroke={filled ? 'none' : 'currentColor'}
        strokeWidth={1.75}
        strokeLinecap='round'
        strokeLinejoin='round'
        aria-hidden='true'
        focusable='false'
        {...props}
      >
        {paths}
      </svg>
    );
  };
}

const GRID = [6, 12, 18];

export const LogoIcon = makeIcon(
  <>
    <circle cx='12' cy='12' r='6.5' />
    <path d='M12 2.5v5M12 16.5v5M2.5 12h5M16.5 12h5' />
  </>,
);
export const BellIcon = makeIcon(
  <>
    <path d='M6 16v-5a6 6 0 1 1 12 0v5l1.5 2h-15L6 16Z' />
    <path d='M10 20.5a2 2 0 0 0 4 0' />
  </>,
);
export const SlidersIcon = makeIcon(
  <>
    <path d='M4 7h10M18 7h2M4 17h4M12 17h8' />
    <circle cx='16' cy='7' r='2' />
    <circle cx='10' cy='17' r='2' />
  </>,
);
export const GripIcon = makeIcon(
  <>
    {GRID.map((y) => (
      <g key={y}>
        <circle cx='9' cy={y} r='1.3' />
        <circle cx='15' cy={y} r='1.3' />
      </g>
    ))}
  </>,
  true,
);
export const MoreIcon = makeIcon(
  <>
    <circle cx='12' cy='5.5' r='1.3' />
    <circle cx='12' cy='12' r='1.3' />
    <circle cx='12' cy='18.5' r='1.3' />
  </>,
  true,
);
export const MinimizeIcon = makeIcon(<path d='M4 14h6v6M20 10h-6V4M14 10l6-6M4 20l6-6' />);
export const SidebarIcon = makeIcon(
  <>
    <rect x='4' y='4' width='16' height='16' rx='3' />
    <path d='M9 4v16' />
  </>,
);
export const PopOutIcon = makeIcon(
  <>
    <path d='M14 4h6v6M20 4l-8 8' />
    <path d='M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5' />
  </>,
);
export const OverviewIcon = makeIcon(
  <>
    <rect x='4' y='4' width='7' height='7' rx='1.5' />
    <rect x='13' y='4' width='7' height='7' rx='1.5' />
    <rect x='4' y='13' width='7' height='7' rx='1.5' />
    <rect x='13' y='13' width='7' height='7' rx='1.5' />
  </>,
);
export const UsersIcon = makeIcon(
  <>
    <circle cx='9' cy='8' r='3.5' />
    <path d='M2.5 20a6.5 6.5 0 0 1 13 0' />
    <path d='M16 4.6a3.5 3.5 0 0 1 0 6.8M21.5 20a6.5 6.5 0 0 0-4-6' />
  </>,
);
export const PortraitIcon = makeIcon(
  <>
    <path d='M12 3 21 9.5 17.5 20h-11L3 9.5 12 3Z' />
    <path d='M12 8.5l3.6 2.6-1.4 4.4H9.8L8.4 11.1 12 8.5Z' />
  </>,
);
export const StarIcon = makeIcon(
  <path d='m12 3 2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9L12 3Z' />,
  true,
);
export const SparkleIcon = makeIcon(
  <path d='M12 3.5c.7 4.1 3.4 6.8 7.5 7.5-4.1.7-6.8 3.4-7.5 7.5-.7-4.1-3.4-6.8-7.5-7.5 4.1-.7 6.8-3.4 7.5-7.5Z' />,
);
export const SearchIcon = makeIcon(
  <>
    <circle cx='11' cy='11' r='7' />
    <path d='m20 20-3.5-3.5' />
  </>,
);
export const ChevronRightIcon = makeIcon(<path d='m9 6 6 6-6 6' />);
export const ChevronLeftIcon = makeIcon(<path d='m15 6-6 6 6 6' />);
export const ChevronDownIcon = makeIcon(<path d='m6 9 6 6 6-6' />);
export const ArrowLeftIcon = makeIcon(<path d='M19 12H5M11 6l-6 6 6 6' />);
export const CloseIcon = makeIcon(<path d='M18 6 6 18M6 6l12 12' />);
export const PlayIcon = makeIcon(<path d='M7 5v14l11-7L7 5Z' />);
export const InfoIcon = makeIcon(
  <>
    <circle cx='12' cy='12' r='9' />
    <path d='M12 11v5M12 8h.01' />
  </>,
);
