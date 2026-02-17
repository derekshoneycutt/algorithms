package numeric.euclidgcd;

public class euclidgcd {
    
    public static int perform(int m, int n)
    {
        int r = m % n;
        while (r != 0) 
        {
            m = n;
            n = r;
            r = m % n;
        }
        return n;
    }

    public static void main(String[] args)
    {
        int v_1 = 15;
        int v_2 = 10;

        if (args.length >= 2)
        {
            v_1 = Integer.parseInt(args[0]);
            v_2 = Integer.parseInt(args[1]);
        }

        System.out.format("%d %d\n", v_1, v_2);
        System.out.format("gcd: %d\n", perform(v_1, v_2));
    }
}
