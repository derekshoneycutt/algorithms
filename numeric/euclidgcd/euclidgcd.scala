import scala.annotation.tailrec

@tailrec
def euclidgcd(m: Int, n: Int): Int =
  val r = m % n
  r match {
    case 0 => n
    case _ => euclidgcd(n, r)
  }

@main
def main(v_1: Int = 15, v_2: Int = 10): Unit =
  println(f"$v_1 $v_2")
  val gcd = euclidgcd(v_1, v_2)
  println(f"gcd: $gcd")
  