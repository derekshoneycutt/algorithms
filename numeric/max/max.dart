
int max(List<int> values) {
    int current = 0;
    for (var value in values) {
        if (value > current) {
            current = value;
        }
    }
    return current;
}

void main(List<String> arguments) {
    List<int> values = (arguments.length > 0) ?
        [for (var arg in arguments) int.parse(arg)]
        : [15, 10];

    int maxValue = max(values);

    print("values: ${values}");
    print("max: ${maxValue}");
}
