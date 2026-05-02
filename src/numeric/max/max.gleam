//// This program takes an array of values and outputs the maximum value of those
import argv
import gleam/int
import gleam/list
import gleam/io.{println}
import gleam/format.{printf}
import gleam/erlang/process

// Calculate the max for a generic list
pub fn max(list: List(a), greater_than: fn(a, a) -> Bool) -> Result(a, Nil) {
    case list {
        [] -> Error(Nil)
        [head, ..rest] ->
            Ok(list.fold(rest, head, fn(current, value) {
                case greater_than(value, current) {
                    True -> value
                    False -> current
                }
            }))
    }
}

/// Type describing a message with a subject that sends/receives a list of values
pub type ListSubjectMessage(a) {
    RegisterChild(process.Subject(List(a)))
}

// Receive a list of values, find the max, and send it back to the sender
fn calcmax(subjectout, maxout, greater_than: fn(a, a) -> Bool) {
    // have to first register and send back a subject for us to receive the values on
    let subjectin = process.new_subject()
    process.send(subjectout, RegisterChild(subjectin))
    let msg = process.receive(subjectin, within: 1000)
    case msg {
        Ok(list) -> {
            case max(list, greater_than) {
                Ok(maxval) -> process.send(maxout, maxval)
                _ -> Nil
            }
        }
        _ -> {
            println("Unknown path traversed.")
        }
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
    let main_subject = process.new_subject()
    let max_subject = process.new_subject()
    process.spawn(fn() { calcmax(main_subject, max_subject, fn(a, b) { a > b }) })

    let calculator_subject = receivesubject(main_subject)

    let use_list = case argv.load().arguments {
        [] -> [15, 10]
        [..values] -> list.map(values, fn (v) {
            case int.parse(v) {
                Ok(n) -> n
                _ -> 0
            }
        })
    }
    process.send(calculator_subject, use_list)

    let maxvalmsg = process.receive(max_subject, within: 1000)
    case maxvalmsg {
        Ok(maxval) -> printf("values: ~w~nmax: ~p~n", #(use_list, maxval))
        _ -> println("Failed to receive max value.")
    }
}
