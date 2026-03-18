
class EuclidGcd {
    static public function gcd(m: Int, n: Int): Int {
        var r:Int = 0;
        while (n != 0) {
            r = m % n;
            m = n;
            n = r;
        }
        return m;
    }

    static public function main():Void {
        var args:Array<String> = Sys.args();
        var m:Int = 15;
        var n:Int = 10;

        if (args.length >= 2) {
            m = Std.parseInt(args[0]);
            n = Std.parseInt(args[1]);
        }

        var gcd:Int = gcd(m, n);

        Sys.println('$m $n');
        Sys.println('gcd: $gcd');
    }
}
