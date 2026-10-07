export function Icons() {
  return null;
}

export const ShoppingBagIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z" />
    <path d="M3 6h18" />
    <path d="M16 10a4 4 0 0 1-8 0" />
  </svg>
);

export const OverviewIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="7" height="9" x="3" y="3" rx="1" />
    <rect width="7" height="5" x="14" y="3" rx="1" />
    <rect width="7" height="9" x="14" y="12" rx="1" />
    <rect width="7" height="5" x="3" y="16" rx="1" />
  </svg>
);

export const CatalogIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m7.5 4.27 9 5.15" />
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export const AuthCartIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="8" cy="21" r="1" />
    <circle cx="19" cy="21" r="1" />
    <path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12" />
  </svg>
);

export const OrdersIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <rect width="18" height="18" x="3" y="4" rx="2" />
    <path d="M3 10h18" />
    <path d="m9 16 2 2 4-4" />
  </svg>
);

export const LogisticsIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M14 18V6a2 2 0 0 0-2-2H4a2 2 0 0 0-2 2v11a1 1 0 0 0 1 1h2" />
    <path d="M15 18H9" />
    <path d="M19 18h2a1 1 0 0 0 1-1v-5l-3-4h-5v10Z" />
    <circle cx="7" cy="18" r="2" />
    <circle cx="17" cy="18" r="2" />
  </svg>
);

export const AnalyticsIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 3v18h18" />
    <path d="m19 9-5 5-4-4-3 3" />
  </svg>
);

export const LayersIcon = ({ className = 'nav-icon', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m12.83 2.18a2 2 0 0 0-1.66 0L2.6 6.08a1 1 0 0 0 0 1.83l8.58 3.91a2 2 0 0 0 1.66 0l8.58-3.9a1 1 0 0 0 0-1.83Z" />
    <path d="m22 12.5-8.58 3.91a2 2 0 0 1-1.66 0L2 12.5" />
    <path d="m22 17.5-8.58 3.91a2 2 0 0 1-1.66 0L2 17.5" />
  </svg>
);

export const SearchIcon = ({ className = 'search-icon', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="11" cy="11" r="8" />
    <path d="m21 21-4.3-4.3" />
  </svg>
);

export const CodeIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polyline points="16 18 22 12 16 6" />
    <polyline points="8 6 2 12 8 18" />
  </svg>
);

export const DatabaseIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <ellipse cx="12" cy="5" rx="9" ry="3" />
    <path d="M3 5V19A9 3 0 0 0 21 19V5" />
    <path d="M3 12A9 3 0 0 0 21 12" />
  </svg>
);

export const ServerIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="8" x="2" y="2" rx="2" ry="2" />
    <rect width="20" height="8" x="2" y="14" rx="2" ry="2" />
    <line x1="6" x2="6.01" y1="6" y2="6" />
    <line x1="6" x2="6.01" y1="18" y2="18" />
  </svg>
);

export const ZapIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
  </svg>
);

export const TruckIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M10 17h4V5H2v12h3" />
    <path d="M20 17h2v-3.34a4 4 0 0 0-1.17-2.83L19 9h-5v8h1" />
    <circle cx="7.5" cy="17.5" r="2.5" />
    <circle cx="17.5" cy="17.5" r="2.5" />
  </svg>
);

export const ShieldCheckIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z" />
    <path d="m9 12 2 2 4-4" />
  </svg>
);

export const SparklesIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m12 3-1.9 5.8a2 2 0 0 1-1.3 1.3L3 12l5.8 1.9a2 2 0 0 1 1.3 1.3L12 21l1.9-5.8a2 2 0 0 1 1.3-1.3L21 12l-5.8-1.9a2 2 0 0 1-1.3-1.3Z" />
  </svg>
);

export const CheckCircleIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
    <polyline points="22 4 12 14.01 9 11.01" />
  </svg>
);

export const ArrowRightIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M5 12h14" />
    <path d="m12 5 7 7-7 7" />
  </svg>
);

export const UserIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2" />
    <circle cx="12" cy="7" r="4" />
  </svg>
);

export const BoxIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M21 8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16Z" />
    <path d="m3.3 7 8.7 5 8.7-5" />
    <path d="M12 22V12" />
  </svg>
);

export const CreditCardIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <rect width="20" height="14" x="2" y="5" rx="2" />
    <line x1="2" x2="22" y1="10" y2="10" />
  </svg>
);

export const StarIcon = ({ className = 'w-4 h-4', fill = 'currentColor', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="1.5" {...props}>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
  </svg>
);

export const FlameIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 3.5z" />
  </svg>
);

export const ChevronLeftIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m15 18-6-6 6-6" />
  </svg>
);

export const ChevronRightIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m9 18 6-6-6-6" />
  </svg>
);

export const HeadphonesIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 14h3a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-7a9 9 0 0 1 18 0v7a2 2 0 0 1-2 2h-1a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h3" />
  </svg>
);

export const LaptopIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M20 16V7a2 2 0 0 0-2-2H6a2 2 0 0 0-2 2v9m16 0H4m16 0 1.28 2.55A1 1 0 0 1 20.38 20H3.62a1 1 0 0 1-.9-1.45L4 16" />
  </svg>
);

export const WatchIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="7" />
    <polyline points="12 9 12 12 13.5 13.5" />
    <path d="M16.51 17.35 15 21a2 2 0 0 1-2 1h-2a2 2 0 0 1-2-1l-1.51-3.65" />
    <path d="M7.49 6.65 9 3a2 2 0 0 1 2-1h2a2 2 0 0 1 2 1l1.51 3.65" />
  </svg>
);

export const BatteryChargingIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="m11 7-3 5h4l-3 5" />
    <path d="M14 6h3a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2h-3" />
    <path d="M6 6H5a2 2 0 0 0-2 2v8a2 2 0 0 0 2 2h1" />
    <line x1="22" x2="22" y1="11" y2="13" />
  </svg>
);

export const RefreshCwIcon = ({ className = 'w-5 h-5', style, width = 20, height = 20, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" />
    <path d="M21 3v5h-5" />
    <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" />
    <path d="M8 16H3v5" />
  </svg>
);

export const EyeIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

export const HeartIcon = ({ className = 'w-4 h-4', fill = 'none', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill={fill} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z" />
  </svg>
);

export const FilterIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
  </svg>
);

export const XIcon = ({ className = 'w-4 h-4', style, width = 16, height = 16, ...props }) => (
  <svg className={className} width={width} height={height} style={style} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);
