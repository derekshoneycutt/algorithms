static T max<T>(params IEnumerable<T> values)
    where T : IComparable<T>
{
    T current = default(T);
    foreach (T value in values)
    {
        if (value.CompareTo(current) > 0)
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
