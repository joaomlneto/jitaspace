// Returns the smallest power of two greater than or equal to the given number
export const nextPowerOfTwo = (n: number) => {
  return 2 ** Math.ceil(Math.log2(n));
};

// Returns a valid `size` parameter for requesting an image at images.evetech.net.
// The returned size guarantees that the image resolution will be at least as large as the given dimensions.
export const esiImageSizeClamp = (size: number) => {
  const MIN_SIZE = 32;
  const MAX_SIZE = 1024;
  return Math.min(Math.max(nextPowerOfTwo(size), MIN_SIZE), MAX_SIZE);
};

/**
 * Returns a random number between min (inclusive) and max (exclusive)
 */
export function getRandomArbitrary(min: number, max: number) {
  return Math.random() * (max - min) + min;
}

/**
 * Returns a random integer between min (inclusive) and max (inclusive).
 * The value is no lower than min (or the next integer greater than min
 * if min isn't an integer) and no greater than max (or the next integer
 * lower than max if max isn't an integer).
 * Using Math.round() will give you a non-uniform distribution!
 */
export function getRandomInt(min: number, max: number) {
  min = Math.ceil(min);
  max = Math.floor(max);
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
/**
 * Shuffles array in place. ES6 version
 * @param {Array} a items An array containing the items.
 */
export function shuffleArray<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    // @ts-expect-error no-unchecked-indexed-access
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function getRandomArrayEntry<T>(array: T[]): T {
  // @ts-expect-error no-unchecked-indexed-access
  return array[getRandomInt(0, array.length - 1)];
}

/**
 * Bernoulli trial: returns true with probability p
 * @param probability of success
 */
export function randomBoolean(probability = 0.5) {
  return Math.random() < probability;
}

/**
 * Compute the average time until the next event based on a given rate of events
 * @arg rate: how many events per time period
 */
export function randomExponential(rate = 1) {
  return -Math.log(Math.random()) / rate;
}

/**
 * Return the number of failures before the first success with a geometric distribution
 */
export function randomGeometric(successProbability = 0.5) {
  return Math.floor(Math.log(Math.random()) / Math.log(1 - successProbability));
}
