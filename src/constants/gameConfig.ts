// 基础尺寸常量
export const BASE_WIDTH = 500;
export const BASE_HEIGHT = 800;
export const TOTAL_LEVELS = 10;

// 生成基于 HSL 的蓝色到红色的渐变色（色相渐变）
export const getGradientColor = (
  level: number, 
  total: number, 
  power: number = 1.5
) => {
  if (total === 1) {
    return 'hsl(260, 85%, 55%)';
  }
  
  const ratio = level / (total - 1);
  const easedRatio = ratio < 0.5 
    ? Math.pow(2 * ratio, power) / 2 
    : 1 - Math.pow(2 * (1 - ratio), power) / 2;

  const hue = Math.round(260 * (1 - easedRatio));
  const saturation = 85;
  
  let lightness = 55;
  if (hue > 70 && hue < 170) {
    lightness = 45;
  }
  
  return `hsl(${hue}, ${saturation}%, ${lightness}%)`;
};

// 基础水果配置
export const FRUIT_CONFIG_BASE = Array.from({ length: TOTAL_LEVELS }, (_, i) => ({
  name: i === TOTAL_LEVELS - 1 ? '刘院长' : `导师_${i}`,
  radius: 15 + i * 15,
  color: getGradientColor(i, TOTAL_LEVELS),
  score: Math.pow(2, i),
  emoji: '🎓'
}));

// 半径映射
export const RADIUS_MAPPING = [15, 24, 34, 45, 56, 69, 84, 99, 115, 135, 157, 185, 230];

// 应用半径映射到基础配置
FRUIT_CONFIG_BASE.forEach((config, i) => {
  config.radius = RADIUS_MAPPING[i] || (180 + (i - 10) * 30);
});
