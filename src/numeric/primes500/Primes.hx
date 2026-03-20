import Lambda;
import StringTools;

class Primes {
    static function getPrimes(n: Int): List<Int> {
        var primes = new List<Int>();
        primes.add(2);
        var candidate = 3;
        while (primes.length < n) {
            if (Lambda.foreach(primes, function (prime)
                return candidate % prime != 0)) {
                primes.add(candidate);
            }

            candidate += 2;
        }

        return primes;
    }

    static function pad(prime: Int): String {
        return StringTools.lpad(Std.string(prime), "0", 4);
    }

    static function printPrimes(primesList: List<Int>): Void {
        var lines : Int = Std.int(primesList.length / 10);
        var primes = Lambda.array(primesList);

        Sys.println('First Five Hundred Primes');
        for (i in 0...lines) {
            Sys.println('   ${pad(primes[i])} ${pad(primes[i + 50])}' +
                ' ${pad(primes[i + 100])} ${pad(primes[i + 150])}' +
                ' ${pad(primes[i + 200])} ${pad(primes[i + 250])}' +
                ' ${pad(primes[i + 300])} ${pad(primes[i + 350])}' +
                ' ${pad(primes[i + 400])} ${pad(primes[i + 450])}');
        }
    }

    static public function main() : Void {
        printPrimes(getPrimes(500));
    }
}
