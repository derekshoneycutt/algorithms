package numeric.primes500;

import java.util.List;
import java.util.ArrayList;

public class primes
{
    public static List<Integer> GetPrimes()
    {
        List<Integer> primes = new ArrayList<Integer>();
        int n = 3;
        primes.add(2);

        for (int j = 1; j < 500; ++j)
        {
            primes.add(n);

            boolean isPrime = false;
            while (!isPrime)
            {
                n += 2;

                int q = 9999;
                int r = 1;
                int t = 0;
                for (int k = 1; (r != 0) && (q > t); ++k)
                {
                    t = primes.get(k);
                    q = n / t;
                    r = n % t;
                }

                isPrime = (r != 0) && (q <= t);
            }
        }

        return primes;
    }

    public static void PrintPrimes(List<Integer> primes)
    {
        System.out.println("First Five Hundred Primes");
        for (int i = 0; i < 50; ++i)
        {
            System.out.printf(
                "     %04d %04d %04d %04d %04d %04d %04d %04d %04d %04d\n",
                primes.get(i), primes.get(50 + i), primes.get(100 + i),
                primes.get(150 + i), primes.get(200 + i), primes.get(250 + i),
                primes.get(300 + i), primes.get(350 + i), primes.get(400 + i),
                primes.get(450 + i));
        }
    }

    public static void main(String[] args)
    {
        PrintPrimes(GetPrimes());
    }
}
