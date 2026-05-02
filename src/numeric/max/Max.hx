/**
 * Gets the maximum value of a sequence of numbers.
 */
class Max {

    /**
     * Gets the maximum value of a list of numbers.
     * 
     * @param T The type of the values in the list; Int or Float both work with Float for Haxe here.
     * @param values The values to get the maximum of.
     * @return The max value
     */
    @:generic static public function max<T: Float>(values: List<T>): T {
        var current: T = values.first();
        for (value in values) {
            if (value > current) {
                current = value;
            }
        }
        return current;
    }

    /**
     * The main entry point to the application
     */
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
