// This application takes any number of integer arguments and prints the maximum value
import ballerina/io;

# Union type for supported number types in the generic max method
type Number int|float|decimal;

# Get the maximum value of a set of values
# 
# + values - The values to get the maximum of
# + return - The maximum value among the provided values
function max(Number... values) returns Number {
    Number current = 0;
    foreach Number value in values {
        if <decimal>value > <decimal>current {
            current = value;
        }
    }
    return current;
}

# The main entry point to the application
# 
# + others - The "other" command line arguments provided to the app
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
