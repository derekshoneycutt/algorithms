package numeric.max;

import java.util.List;
import java.util.ArrayList;

public class max
{
    public static int perform(List<Integer> values)
    {
        int current = 0;
        for (Integer value : values)
        {
            if (value > current)
            {
                current = value;
            }
        }
        return current;
    }

    public static void main(String[] args)
    {
        List<Integer> values = new ArrayList<Integer>();
        for (String arg : args)
        {
            values.add(Integer.parseInt(arg));
        }
        if (values.size() < 1)
        {
            values.add(15);
            values.add(10);
        }

        int max = perform(values);

        System.out.format("values: %s\nmax: %d\n", values.toString(), max);
    }
}
