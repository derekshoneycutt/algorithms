/*
 *  Get the maximum of a sequence of values
 */
import std.stdio;
import std.conv;

/++
 + Get the maximum value of an array of values.
 +
 + Params:
 +  values = The values to get the maximum of
 + Returns: The maximum value
 +/
T max(T)(T[] values)
{
    T current = values[0];
    foreach (value; values)
    {
        if (value > current)
        {
            current = value;
        }
    }
    return current;
}

/++
 + Main entry point to the application
 +
 + Params:
 +  args = The command line arguments passed to the application
 +/
void main(string[] args)
{
    int[] values;
    if (args.length > 1)
    {
        values = new int[args.length - 1];
        for (int i = 0; i < args.length - 1; ++i)
        {
            values[i] = to!int(args[i + 1]);
        }
    }
    else
    {
        values = [15, 10];
    }

    int maxValue = max(values);

    writeln("values:", values);
    writeln("max: ", maxValue);
}
