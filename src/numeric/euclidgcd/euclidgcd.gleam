//// This program takes 2 values, calculates the GCD, and prints it all to the screen
import argv
import gleam/int
import gleam/io.{println}
import gleam/format.{printf}
import gleam/erlang/process

/// Calculates the GCD betwen m and n using Euclid's method
fn euclidgcd(m: Int, n: Int) -> Int {
  case n {
    0 -> m
    _ -> euclidgcd(n, m % n)
  }
}

/// Type describing a message with a subject that sends/receives tuples of 2 integers
pub type TupleSubjectMessage {
  RegisterChild(process.Subject(#(Int, Int)))
}

/// Calculates and prints the gcd of m and n
fn printgcd(subjectout) {
  let subjectin = process.new_subject()
  process.send(subjectout, RegisterChild(subjectin))
  let msg = process.receive(subjectin, within: 1000)
  case msg {
    Ok(#(m, n)) -> {
      let gcd = euclidgcd(m, n)
      printf("~b ~b~ngcd: ~b~n", [m, n, gcd])
    }
    _ -> println("Unknown path traversed.")
  }
}

/// Receives a message containing just a Subject object on the main subject
fn receivesubject(main_subject) {
  let sendermsg = process.receive(main_subject, within: 1000)
  case sendermsg {
    Ok(RegisterChild(subject)) -> subject
    _ -> panic as "Failed to receive subject."
  }
}

/// The main entry point to the application
pub fn main() {
  // Start the printing process with a subject
  let main_subject = process.new_subject()
  process.spawn(fn() { printgcd(main_subject) })

  let numbers_subject = receivesubject(main_subject)
  case argv.load().arguments {
    [sm, sn] ->
      case int.parse(sm), int.parse(sn) {
        Ok(m), Ok(n) -> process.send(numbers_subject, #(m, n))
        _, _ -> process.send(numbers_subject, #(15, 10))
      }
    _ -> process.send(numbers_subject, #(15, 10))
  }
}
