/*
 *  Get the maximum value of a sequence of values
 */

/// <summary>
/// Gets the maximum value of a sequence of values.
/// </summary>
/// <typeparam name="T">The type of the values.</typeparam>
/// <param name="values">The values to get the maximum of.</param>
/// <returns>The maximum value.</returns>
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

// Get the arguments as integers or just use 15, 10
List<int> values = (args.Length > 0)
    ? [.. from arg in args select Int32.Parse(arg)]
    : [15, 10];

int maxValue = max(values);

Console.WriteLine($"values: [{String.Join(", ", values)}]");
Console.WriteLine($"max: {maxValue}");
