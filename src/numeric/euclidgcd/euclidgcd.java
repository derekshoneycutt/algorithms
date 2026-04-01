/*
    Calculate the GCD for two values and print it all to the screen
*/
package numeric.euclidgcd;

/**
 * The main class for calculating and displaying GCD with Euclid's method
 */
public class euclidgcd
{
    /**
     * Performs the GCD calculation with Euclid's method
     * @param m The first value to calculate GCD for
     * @param n The second value to calculate GCD for
     * @return The calculated GCD
     */
    private static int perform(int m, int n)
    {
        int r = 0;
        while (n != 0) 
        {
            r = m % n;
            m = n;
            n = r;
        }
        return m;
    }

    /**
     * The main entry point to the application
     * @param args The command line arguments passed to the application
     */
    public static void main(String[] args)
    {
        int m = 15;
        int n = 10;

        if (args.length >= 2)
        {
            m = Integer.parseInt(args[0]);
            n = Integer.parseInt(args[1]);
        }

        System.out.format("%d %d\ngcd: %d\n", m, n, perform(m, n));
    }
}
