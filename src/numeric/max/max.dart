
/*
 *  Get the maximum value of a sequence of values
 */

/// Get the maximum value of a sequence of values
/// 
/// The [values] are the values to get the maximum of
/// 
/// Returns the maximum value
T max<T extends num>(List<T> values) {
    T current = values[0];
    for (var value in values) {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

/// The main entry point to the application
/// 
/// The [arguments] are the command line arguments passed to the application
void main(List<String> arguments) {
    List<int> values = (arguments.length > 0)
        ? [for (var arg in arguments) int.parse(arg)]
        : [15, 10];

    int maxValue = max(values);

    print("values: ${values}");
    print("max: ${maxValue}");
}
