/*
    Get the maximum value from a list of comparable values.
*/
package numeric.max;

import java.util.List;
import java.util.ArrayList;

/**
 * The main class for finding and displaying the maximum value of a sequence
 */
public class max
{
    /**
     * Gets the maximum value from a list of comparable values.
     * @param <T> The type of the values in the list; must implement Comparable.
     * @param values The list of values to find the maximum from.
     * @return The maximum value in the list.
     */
    public static <T extends Comparable<T>> T perform(List<T> values)
    {
        T current = values.get(0);
        for (T value : values)
        {
            if (value.compareTo(current) > 0)
            {
                current = value;
            }
        }
        return current;
    }

    /**
     * The main entry point to the application
     * @param args The command line arguments passed to the application
     */
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
