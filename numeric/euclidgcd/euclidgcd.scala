import scala.annotation.tailrec

@tailrec
def euclidgcd(m: Int, n: Int): Int =
  val r = m % n
  r match {
    case 0 => n
    case _ => euclidgcd(n, r)
  }

@main
def main(m: Int = 15, n: Int = 10): Unit =
  val gcd = euclidgcd(m, n)
  println(f"$m $n")
  println(f"gcd: $gcd")
  