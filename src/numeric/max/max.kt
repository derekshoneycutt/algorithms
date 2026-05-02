/**
 * Gets the maximum value from a list of comparable values.
 * @param values The list of values to find the maximum from.
 * @returns The maximum value in the list.
 */
fun <T : Comparable<T>> max(values: List<T>): T {
    var current = values[0]
    for (test in values) {
        if (test > current) {
            current = test
        }
    }
    return current
}

/**
 * The main entry point to the application
 * 
 * @param args The arguments passed into the command line for this instance
 */
fun main(args: Array<String>) {
    var list = listOf(15, 10)
    if (args.size > 0) {
        list = args.map { arg -> arg.toInt() }
    }

    val maxValue = max(list)

    println("values: $list")
    println("max: $maxValue")
}
