
/**
 * Gets the maximum value from a list of comparable values.
 * @param values The list of values to find the maximum from.
 * @returns The maximum value in the list.
 */
function max<T>(values: T[]) : T {
    let current: T = values[0];
    for (const value of values) {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

// Except for the generics, it's still the same as js
let list = [15, 10];
if (process.argv.length > 2) {
    list = process.argv.slice(2).map(arg => parseInt(arg));
}

const maxValue = max(list);

console.log(`values: ${list}`);
console.log(`max: ${maxValue}`);
