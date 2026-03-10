import scala.annotation.tailrec
import scala.collection.immutable.LazyList

def odds_from(n: Int): LazyList[Int] =
  n % 2 match {
    case 1 => n #:: odds_from(n + 2)
    case 0 => (n + 1) #:: odds_from(n + 3)
  }

def prime_sieve(values: LazyList[Int]): LazyList[Int] =
  values match {
    case LazyList() => LazyList.empty[Int]
    case head #:: tail =>
        head #:: prime_sieve(tail.filter((value: Int) => (value % head) != 0))
  }

def first_n(n: Int): LazyList[Int] =
  prime_sieve(2 #:: odds_from(3)).take(n)

def print_line(primes: LazyList[Int], index: Int): Unit =
  println(f"     ${primes(index)}%04d ${primes(index + 50)}%04d" +
    f" ${primes(index + 100)}%04d ${primes(index + 150)}%04d" +
    f" ${primes(index + 200)}%04d ${primes(index + 250)}%04d" +
    f" ${primes(index + 300)}%04d ${primes(index + 350)}%04d" +
    f" ${primes(index + 400)}%04d ${primes(index + 450)}%04d")

@tailrec
def print_lines(primes: LazyList[Int], from_index: Int): Unit =
  from_index >= 50 match {
    case true => ()
    case false =>
      print_line(primes, from_index)
      print_lines(primes, from_index + 1)
  }

def print_lines(primes: LazyList[Int]): Unit = print_lines(primes, 0)


@main
def main(args: String*): Unit =
  println("First Five Hundred Primes")
  print_lines(first_n(500))
