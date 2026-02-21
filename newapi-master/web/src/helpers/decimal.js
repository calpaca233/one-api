import Decimal from 'decimal.js';

// 配置 decimal.js 的默认设置
Decimal.set({
  precision: 28,      // 精度
  rounding: 4,        // 四舍五入模式
  toExpNeg: -7,       // 指数记数法的负阈值
  toExpPos: 21,       // 指数记数法的正阈值
  maxE: 9e15,         // 最大指数
  minE: -9e15,        // 最小指数
  modulo: 1,          // 取模运算模式
  crypto: false       // 加密安全随机数
});

/**
 * 安全的加法运算
 * @param {string|number} a 
 * @param {string|number} b 
 * @returns {string}
 */
export function add(a, b) {
  return new Decimal(a).add(new Decimal(b)).toString();
}

/**
 * 安全的减法运算
 * @param {string|number} a 
 * @param {string|number} b 
 * @returns {string}
 */
export function subtract(a, b) {
  return new Decimal(a).sub(new Decimal(b)).toString();
}

/**
 * 安全的乘法运算
 * @param {string|number} a 
 * @param {string|number} b 
 * @returns {string}
 */
export function multiply(a, b) {
  return new Decimal(a).mul(new Decimal(b)).toString();
}

/**
 * 安全的除法运算
 * @param {string|number} a 
 * @param {string|number} b 
 * @returns {string}
 */
export function divide(a, b) {
  return new Decimal(a).div(new Decimal(b)).toString();
}

/**
 * 数值比较
 * @param {string|number} a 
 * @param {string|number} b 
 * @returns {number} 1: a > b, 0: a = b, -1: a < b
 */
export function compare(a, b) {
  return new Decimal(a).cmp(new Decimal(b));
}

/**
 * 判断是否相等
 * @param {string|number} a 
 * @param {string|number} b 
 * @returns {boolean}
 */
export function equals(a, b) {
  return new Decimal(a).eq(new Decimal(b));
}

/**
 * 保留指定小数位数（使用四舍五入）
 * @param {string|number} value 
 * @param {number} decimalPlaces 
 * @returns {string}
 */
export function toFixed(value, decimalPlaces = 2) {
  return new Decimal(value).toFixed(decimalPlaces);
}

/**
 * 保留指定小数位数（不进行四舍五入，直接截断）
 * @param {string|number} value 
 * @param {number} decimalPlaces 
 * @returns {string}
 */
export function toFixedTrunc(value, decimalPlaces = 2) {
  const decimal = new Decimal(value);
  const factor = new Decimal(10).pow(decimalPlaces);
  // 将数值乘以10^n，取整，再除以10^n实现截断效果
  return decimal.mul(factor).trunc().div(factor).toFixed(decimalPlaces);
}

/**
 * 转换为数字（注意：可能会有精度损失，仅在必要时使用）
 * @param {string|number} value 
 * @returns {number}
 */
export function toNumber(value) {
  return new Decimal(value).toNumber();
}

/**
 * 检查是否为有效数字
 * @param {any} value 
 * @returns {boolean}
 */
export function isValidNumber(value) {
  try {
    new Decimal(value);
    return true;
  } catch {
    return false;
  }
}

/**
 * 计算倍率价格：倍率 * 2
 * @param {string|number} ratio 
 * @returns {string}
 */
export function calculateRatioPrice(ratio) {
  return multiply(ratio, 2);
}

/**
 * 计算完成倍率价格：倍率 * 2 * 完成倍率
 * @param {string|number} ratio 
 * @param {string|number} completionRatio 
 * @returns {string}
 */
export function calculateCompletionRatioPrice(ratio, completionRatio) {
  return multiply(multiply(ratio, 2), completionRatio);
}

/**
 * 计算缓存倍率价格：倍率 * 2 * 缓存倍率
 * @param {string|number} ratio 
 * @param {string|number} cacheRatio 
 * @returns {string}
 */
export function calculateCacheRatioPrice(ratio, cacheRatio) {
  return multiply(multiply(ratio, 2), cacheRatio);
}

/**
 * 计算图像倍率价格：倍率 * 2 * 图像倍率
 * @param {string|number} ratio 
 * @param {string|number} imageRatio 
 * @returns {string}
 */
export function calculateImageRatioPrice(ratio, imageRatio) {
  return multiply(multiply(ratio, 2), imageRatio);
}

/**
 * 计算有效输入令牌数：输入令牌 - 缓存令牌 + 缓存令牌 * 缓存倍率
 * @param {number} inputTokens 
 * @param {number} cacheTokens 
 * @param {string|number} cacheRatio 
 * @returns {string}
 */
export function calculateEffectiveTokens(inputTokens, cacheTokens, cacheRatio) {
  return add(subtract(inputTokens, cacheTokens), multiply(cacheTokens, cacheRatio));
}

/**
 * 计算价格：(令牌数 / 1000000) * 单价 * 分组倍率
 * @param {string|number} tokens 
 * @param {string|number} unitPrice 
 * @param {string|number} groupRatio 
 * @returns {string}
 */
export function calculateTokenPrice(tokens, unitPrice, groupRatio) {
  return multiply(multiply(divide(tokens, 1000000), unitPrice), groupRatio);
}

// 导出 Decimal 类，以便需要更复杂操作时直接使用
export { Decimal };
