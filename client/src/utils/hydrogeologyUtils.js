/*
* Create file: blumanio/groundwater-sampling/groundwater-sampling-46bd3081445e84c43befac77c081b536b920eceb/client/src/utils/hydrogeologyUtils.js
*/

/**
 * Calculates the Theis well function W(u) using a polynomial approximation.
 * @param {number} u - The dimensionless parameter u = (r^2 * S) / (4 * T * t).
 * @returns {number} The value of the well function W(u).
 */
export function theisWellFunction(u) {
    if (u <= 0) return Infinity;
    if (u > 20) return 0; // Practically zero for large u

    if (u < 1.0) {
        // Series expansion for small u
        return -0.57721566 - Math.log(u) + u - Math.pow(u, 2) / 4 + Math.pow(u, 3) / 18 - Math.pow(u, 4) / 96 + Math.pow(u, 5) / 600;
    } else {
        // Asymptotic expansion for large u (less accurate for u near 1)
        // A more robust numerical integration or lookup table might be better for production.
        const x = 1 / u;
        // Simplified approximation - consider a more accurate one if needed
        return (Math.exp(-u) / u) * (1 - x + 2 * Math.pow(x, 2) - 6 * Math.pow(x, 3));
        // More terms from Abramowitz and Stegun 5.1.53:
        // (1 - x + 2 * Math.pow(x, 2) - 6 * Math.pow(x, 3) + 24 * Math.pow(x, 4) - 120 * Math.pow(x, 5));

    }
}

/**
 * Calculates drawdown using the Theis (1935) solution.
 * @param {number} time - Time since pumping started (days).
 * @param {number} pumpingRate - Pumping rate (Q) (m³/day).
 * @param {number} distance - Distance from pumping well to observation well (r) (m).
 * @param {number} T - Transmissivity (m²/day).
 * @param {number} S - Storativity (dimensionless).
 * @returns {number|null} Calculated drawdown (m), or null if parameters are invalid.
 */
export function calculateDrawdownTheis(time, pumpingRate, distance, T, S) {
    if (T <= 0 || S <= 0 || time <= 0 || pumpingRate <= 0 || distance <= 0) return null;
    const u = (distance * distance * S) / (4 * T * time);
    const Wu = theisWellFunction(u);
    if (!isFinite(Wu)) return null; // Avoid issues with Infinity
    return (pumpingRate / (4 * Math.PI * T)) * Wu;
}

/**
 * Calculates drawdown using the Cooper-Jacob (1946) approximation.
 * @param {number} time - Time since pumping started (days).
 * @param {number} pumpingRate - Pumping rate (Q) (m³/day).
 * @param {number} distance - Distance from pumping well to observation well (r) (m).
 * @param {number} T - Transmissivity (m²/day).
 * @param {number} S - Storativity (dimensionless).
 * @returns {number|null} Calculated drawdown (m), or null if parameters are invalid or u is too large.
 */
export function calculateDrawdownCooperJacob(time, pumpingRate, distance, T, S) {
    if (T <= 0 || S <= 0 || time <= 0 || pumpingRate <= 0 || distance <= 0) return null;
    const u = (distance * distance * S) / (4 * T * time);
    if (u >= 0.05) {
        // console.warn(`Cooper-Jacob not strictly valid for u=${u} at time=${time}`);
        return null; // Model not applicable or less accurate
    }
    // Use the natural logarithm form: s = (Q / 4πT) * ln(2.25Tt / r²S)
    // Which is equivalent to: s = (Q / 4πT) * (-0.5772 - ln(u))
    // Using the ln(u) form might be more numerically stable if theisWellFunction has issues
    const drawdown = (pumpingRate / (4 * Math.PI * T)) * (-0.57721566 - Math.log(u));
    return drawdown > 0 ? drawdown : null; // Ensure non-negative drawdown
}


/**
 * Calculates Root Mean Squared Error (RMSE) and R-squared (R²) for fit quality.
 * @param {Array<{x: number, y: number}>} observed - Array of observed data points {time, drawdown}.
 * @param {Array<{x: number, y: number}>} fitted - Array of calculated points {time, drawdown} from the model.
 * @param {function(number): number} calculateDrawdownForTime - Function to calculate drawdown for a specific time using current parameters.
 * @returns {{rmse: string, r2: string}} Object containing RMSE and R-squared values as formatted strings, or '-' if calculation is not possible.
 */
export function calculateFitMetrics(observed, fitted, calculateDrawdownForTime) {
    if (!observed || observed.length === 0 || !fitted || fitted.length < 2) {
        return { rmse: '-', r2: '-' };
    }

    let sumSqErr = 0;
    let sumSqTotal = 0;
    const meanObserved = observed.reduce((acc, val) => acc + val.y, 0) / observed.length;
    let validPoints = 0;

    observed.forEach(obsPoint => {
        // Find the corresponding fitted Y value by interpolation or direct calculation
        let fittedY = null;

        // Try linear interpolation first for smoother curves
        for (let i = 0; i < fitted.length - 1; i++) {
            // Check if observed x is within the range of two consecutive fitted points
            if (fitted[i].x <= obsPoint.x && fitted[i + 1].x >= obsPoint.x) {
                const x1 = fitted[i].x;
                const y1 = fitted[i].y;
                const x2 = fitted[i + 1].x;
                const y2 = fitted[i + 1].y;

                // Avoid division by zero if points are identical
                if (x2 - x1 === 0) {
                    fittedY = y1;
                } else {
                    // Linear interpolation formula: y = y1 + (x - x1) * (y2 - y1) / (x2 - x1)
                    const t = (obsPoint.x - x1) / (x2 - x1);
                    fittedY = y1 * (1 - t) + y2 * t;
                }
                break;
            }
        }

        // If interpolation wasn't possible (e.g., observed point outside fitted range), calculate directly
        if (fittedY === null) {
            fittedY = calculateDrawdownForTime(obsPoint.x);
        }


        if (fittedY !== null && isFinite(fittedY)) {
            const error = obsPoint.y - fittedY;
            sumSqErr += error * error;
            sumSqTotal += Math.pow(obsPoint.y - meanObserved, 2);
            validPoints++;
        }
    });

    if (validPoints === 0 || sumSqTotal === 0) {
        return { rmse: '-', r2: '-' };
    }

    const rmse = Math.sqrt(sumSqErr / validPoints);
    const r2 = 1 - (sumSqErr / sumSqTotal);

    return {
        rmse: rmse.toFixed(4),
        r2: r2.toFixed(4)
    };
}                                