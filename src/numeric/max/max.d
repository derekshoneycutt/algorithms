import std.stdio;
import std.conv;

int max(int[] values)
{
    int current = 0;
    foreach (value; values)
    {
        if (value > current)
        {
            current = value;
        }
    }
    return current;
}

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
