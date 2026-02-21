
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
