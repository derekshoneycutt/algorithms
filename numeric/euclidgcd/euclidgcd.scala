import scala.annotation.tailrec

@tailrec
def euclidgcd(m: Int, n: Int): Int =
  n match {
    case 0 => m
    case _ => euclidgcd(n, m % n)
  }

@main
def main(m: Int = 15, n: Int = 10): Unit =
  val gcd = euclidgcd(m, n)
  println(f"$m $n")
  println(f"gcd: $gcd")
  