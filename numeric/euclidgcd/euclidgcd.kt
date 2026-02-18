
fun euclidgcd(m_in: Int, n_in: Int): Int {
    var m = m_in
    var n = n_in
    var r = m % n
    while (r != 0) {
        m = n
        n = r
        r = m % n
    } 
    return n
}

fun main(args: Array<String>) {
    val m = if (args.size >= 2) args[0].toInt() else 15
    val n = if (args.size >= 2) args[1].toInt() else 10
    val gcd = euclidgcd(m, n)

    println("$m $n")
    println("gcd: $gcd")
}
