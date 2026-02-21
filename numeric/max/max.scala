import scala.annotation.tailrec

@tailrec
def max_list_state(list: List[Int], prior: Int): Int =
  list match {
    case Nil => prior
    case head :: tail =>
        max_list_state(tail, if (head > prior) then head else prior)
  }

def max_list(list: List[Int]): Int =
  list match {
    case Nil => 0
    case head :: tail => max_list_state(tail, head)
  }

@main
def main(args: String*): Unit =
  val list = if (args.size > 0) then args.map(_.toInt).toList else List(15, 10)
  val max = max_list(list)
  println(f"values: $list")
  println(f"max: $max")
  