
/**
 * Gets the maximum value from a list of numbers.
 * We don't need generics in JavaScript because the type system is wonky on its own.
 * @param {Array} values The list of numbers to find the maximum from.
 * @returns {number} The maximum value in the list.
 */
function max(values) {
    let current = 0;
    for (const value of values) {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

var list = [15, 10];
if (process.argv.length > 2) {
    list = process.argv.slice(2).map(arg => parseInt(arg));
}

var maxValue = max(list);

console.log(`values: ${list}`);
console.log(`max: ${maxValue}`);
