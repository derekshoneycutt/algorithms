package numeric.euclidgcd;

public class euclidgcd
{    
    public static int perform(int m, int n)
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
