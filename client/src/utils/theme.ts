/**
 * Utility for mapping product condition to its corresponding theme color.
 */
export const getTagColor = (condition: string) => {
    switch (condition) {
        case 'זמין':
            return 'bg-[#00AEEF]';
        case 'במשא ומתן':
            return 'bg-[#EF4444]';
        case 'הבעתי עניין':
            return 'bg-[#8DC63F]';
        default:
            return 'bg-[#1C4E80]';
    }
};
