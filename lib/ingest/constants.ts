export const TARGET_NAICS = [
    // Construction
    '236220', // Commercial Build
    // '237120', // Oil/Gas Pipeline
    // '237310', // Highway/Catch Basins
    // '237990', // Heavy Civil
    // // Logistics/Services
    // '541614', // Logistics Consulting
    // '488510', // Freight Arrangement
    // '213112', // Oil/Gas Support
    // // Manufacturing
    // '332311', // Prefab Metal Buildings - PEMB
]

export const TIER_1_SET_ASIDES = [
    '8A', // 8(a) Competed (Code might vary, e.g., '8A')
    '8AN', // 8(a) Sole Source
    'IEE', // Indian Economic Enterprise
    'ISBEE', // Indian Small Business Economic Enterprise
    'SDVOSB', // Service-Disabled Veteran-Owned Small Business
    'WOSB', // Women-Owned Small Business
    'HUBZone', // HUBZone
    'VOSB', // Veteran-Owned Small Business
]

export const TIER_2_SET_ASIDES = [
    'SBA', // Total Small Business
    'SBP', // Partial Small Business
]

export const TARGET_STATES = ['AK', 'AZ']
export const TARGET_COUNTRIES = ['MEX', 'USA'] // USA is implied for states, MEX for international

// SAM API usually uses codes. We might need to map '8A', 'IEE' to actual SAM codes if different.
// For now we assume these strings match or we filtered by them in text.
