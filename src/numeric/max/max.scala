/*
  Get the maximum value of some sequence of values
 */
import scala.annotation.tailrec
import scala.math.Ordering

/**
 * Get the maximum value of some list
 *
 * @param list The list of values to find the maximum of
 * @tparam T The type of the values in the list
 * @return An Option containing the maximum value, or None if the list is empty
 */
def max_list[T: Ordering](list: List[T]): Option[T] =
  @tailrec
  def reduce_max(list: List[T], prior: T): T =
    list match {
      case Nil => prior
      case head :: tail =>
          reduce_max(tail,
            if (implicitly[Ordering[T]].gt(head, prior)) then
              head
            else prior)
    }

  list match
    case Nil => None
    case head :: tail => Some(reduce_max(tail, head))

/**
 * The main entry point to the application
 */
@main
def main(args: String*): Unit =
  val list = if (args.size > 0) then args.map(_.toInt).toList else List(15, 10)
  val max = max_list(list)
  println(f"values: $list")
  println(f"max: ${max.getOrElse("n/a")}")
  