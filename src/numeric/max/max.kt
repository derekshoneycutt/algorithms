fun max(values: List<Int>): Int {
    var current = 0;
    for (test in values) {
        if (test > current) {
            current = test;
        }
    }
    return current;
}

fun main(args: Array<String>) {
    var list = listOf(15, 10)
    if (args.size > 0) {
        list = args.map { arg -> arg.toInt() }
    }

    val maxValue = max(list)

    println("values: $list")
    println("max: $maxValue")
}
