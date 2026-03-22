import ballerina/io;

function max(int... values) returns int {
    int current = 0;
    foreach int value in values {
        if value > current {
            current = value;
        }
    }
    return current;
}

public function main(int... others) {
    int[] useValues;
    if (others.length() < 1) {
        useValues = [15, 10];
    }
    else {
        useValues = others;
    }

    io:println(`values: ${useValues}`);
    io:println(`max: ${max(...useValues)}`);
}

