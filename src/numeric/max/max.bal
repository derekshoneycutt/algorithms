// This application takes any number of integer arguments and prints the maximum value
import ballerina/io;

# Get the maximum value of a set of values
# 
# + values - The values to get the maximum of
# + return - The maximum value among the provided values
function max(int... values) returns int {
    int current = 0;
    foreach int value in values {
        if value > current {
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
