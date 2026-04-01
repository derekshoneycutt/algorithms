/*
  Calculates the GCD of two values and prints it all to the screen
 */
import scala.annotation.tailrec

/**
 * Calculates the GCD of two values using Euclid's algorithm.
 *
 * @param m The first value to calculate the GCD for
 * @param n The second value to calculate the GCD for
 * @return The calculated GCD value
 */
@tailrec
def euclidgcd(m: Int, n: Int): Int =
  n match {
    case 0 => m
    case _ => euclidgcd(n, m % n)
  }

/**
 * The main entry point to the application
 */
@main
def main(m: Int = 15, n: Int = 10): Unit =
  val gcd = euclidgcd(m, n)
  println(f"$m $n")
  println(f"gcd: $gcd")
  