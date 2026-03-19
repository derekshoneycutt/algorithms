static int max(params IEnumerable<int> values)
{
    int current = 0;
    foreach (int value in values)
    {
        if (value > current)
        {
            current = value;
        }
    }
    return current;
}

List<int> values = (args.Length > 0)
    ? [.. from arg in args select Int32.Parse(arg)]
    : [15, 10];

int maxValue = max(values);

Console.WriteLine($"values: [{String.Join(", ", values)}]");
Console.WriteLine($"max: {maxValue}");
