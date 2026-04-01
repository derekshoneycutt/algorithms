/*
    Calculates the GCD of two values and prints it all to the screen
 */

/**
 * Calculates the GCD for two values
 * 
 * @param m_in The first value to calculate GCD for
 * @param n_in The second value to calculate GCD for
 * @return The calculated GCD
 */
fun euclidgcd(m_in: Int, n_in: Int): Int {
    var m = m_in
    var n = n_in
    var r = 0
    while (n != 0) {
        r = m % n
        m = n
        n = r
    } 
    return m
}

/**
 * The main entry point to the application
 * 
 * @param args The arguments passed into the command line for this instance
 */
fun main(args: Array<String>) {
    val m = if (args.size >= 2) args[0].toInt() else 15
    val n = if (args.size >= 2) args[1].toInt() else 10
    val gcd = euclidgcd(m, n)

    println("$m $n")
    println("gcd: $gcd")
}
