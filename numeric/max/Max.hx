
class Max {
    static public function max(values: List<Int>): Int {
        var current: Int = 0;
        for (value in values) {
            if (value > current) {
                current = value;
            }
        }
        return current;
    }

    static public function main(): Void {
        var args: Array<String> = Sys.args();
        var values: List<Int> = new List<Int>();

        if (args.length > 0) {
            for (arg in args) {
                var t = Std.parseInt(arg);
                if (t != null) {
                    values.add(t);
                }
            }
        }
        else {
            values.add(15);
            values.add(10);
        }

        var maximum = max(values);

        Sys.println('values: $values');
        Sys.println('max: $maximum');
    }
}
