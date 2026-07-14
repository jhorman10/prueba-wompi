/**
 * Spacing scale — 4px base increment.
 */
export const spacing = {
  /** 2px — micro */
  xxs: 2,
  /** 4px — tiny */
  xs: 4,
  /** 8px — small */
  sm: 8,
  /** 12px — medium-small */
  md: 12,
  /** 16px — base */
  base: 16,
  /** 20px — medium */
  lg: 20,
  /** 24px — large */
  xl: 24,
  /** 32px — x-large */
  xxl: 32,
  /** 40px — huge */
  xxxl: 40,
  /** 48px — massive */
  huge: 48,
} as const;

export type SpacingKey = keyof typeof spacing;
export type Spacing = (typeof spacing)[SpacingKey];
