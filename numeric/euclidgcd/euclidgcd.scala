
def euclidgcd(m_in: Int, n_in: Int): Int =
  var m = m_in
  var n = n_in
  var r = m % n
  while (r != 0) {
    m = n
    n = r
    r = m % n
  }
  n

@main
def main(v_1: Int = 15, v_2: Int = 10): Unit =
  println(f"$v_1 $v_2")
  val gcd = euclidgcd(v_1, v_2)
  println(f"$gcd")