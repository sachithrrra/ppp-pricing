/**
 * @typedef {'none'|'currency'|'pretty'} RoundingStrategy
 */

/**
 * Builds a `ppp` calculator over a given price-level-ratio map, with no I/O of
 * its own so it can run identically in Node (fs-loaded data) and the browser
 * (data already parsed by the page).
 *
 * @param {Record<string, number>} pppData - ISO2/ISO3 country code -> price level ratio.
 */
export function createPpp(pppData) {
    /**
     * Calculates the Purchasing Power Parity (PPP) price for a given country.
     *
     * @param {number} originalPrice - The price in USD (International Dollars).
     * @param {string} countryCode - The ISO country code (2-letter or 3-letter).
     * @param {number} [smoothing=0.2] - A value between 0 and 1 to normalize the price.
     *                                   0.2 = Default (Balanced Discount).
     *                                   0 = Raw PPP (Theoretical / Maximum Discount).
     *                                   1 = No adjustment (Original Price).
     * @param {string} [rounding='none'] - Rounding strategy: 'none', 'currency', 'pretty'.
     *                                     'none' = Full precision.
     *                                     'currency' = 2 decimal places.
     *                                     'pretty' = Marketing friendly (e.g. 4.99, 4.49, 45, 140).
     * @returns {number} The PPP adjusted price in the local currency.
     *                   Returns null if country code is not found or inputs are invalid.
     */
    function ppp(originalPrice, countryCode, smoothing = 0.2, rounding = 'none') {
        if (typeof originalPrice !== 'number' || originalPrice < 0) {
            throw new Error('Original price must be a non-negative number.');
        }

        if (typeof countryCode !== 'string') {
            throw new Error('Country code must be a string.');
        }

        if (typeof smoothing !== 'number' || smoothing < 0 || smoothing > 1) {
            throw new Error('Smoothing must be a number between 0 and 1.');
        }

        if (typeof rounding !== 'string' || !['none', 'currency', 'pretty'].includes(rounding)) {
            throw new Error("Rounding must be one of: 'none', 'currency', 'pretty'.");
        }

        const code = countryCode.toUpperCase();
        const factor = pppData[code];

        if (factor === undefined) {
            return null;
        }

        // Apply smoothing
        const adjustedFactor = factor + (1 - factor) * smoothing;
        let finalPrice = originalPrice * adjustedFactor;

        // Apply Rounding
        if (rounding === 'currency') {
            // Standard concise rounding (2 decimal places)
            return Math.round(finalPrice * 100) / 100;
        } else if (rounding === 'pretty') {
            // Marketing friendly rounding
            // < 10: Round to x.99 or x.49
            // 10 - 100: Round to x9 or x5
            // > 100: Round to nearest 5 or 0 ending

            if (finalPrice < 10) {
                // e.g. 4.31 -> 4.49, 2.89 -> 2.99
                const integerPart = Math.floor(finalPrice);
                const decimalPart = finalPrice - integerPart;
                if (decimalPart < 0.5) return integerPart + 0.49;
                return integerPart + 0.99;
            } else if (finalPrice < 100) {
                // e.g. 43.2 -> 45, 48.7 -> 49
                return Math.round(finalPrice);
            } else {
                // e.g. 132 -> 130, 134 -> 135, 138 -> 140
                return Math.round(finalPrice / 5) * 5;
            }
        }

        return finalPrice; // 'none'
    }

    ppp.factor = function(countryCode) {
        if (typeof countryCode !== 'string') return null;
        return pppData[countryCode.toUpperCase()] || null;
    };

    return ppp;
}
