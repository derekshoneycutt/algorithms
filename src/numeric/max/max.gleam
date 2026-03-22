import argv
import gleam/format.{printf}
import gleam/int
import gleam/list

fn max_seeded(values: List(Int), seed: Int) -> Int {
    case values {
        [head, ..rest] if head >= seed -> max_seeded(rest, head)
        [_, ..rest] -> max_seeded(rest, seed)
        [] -> seed
    }
}
fn max(values: List(Int)) -> Int { max_seeded(values, 0) }

pub fn main() {
    let use_list = case argv.load().arguments {
        [] -> [15, 10]
        [..values] -> list.map(values, fn (v) {
            case int.parse(v) {
                Ok(n) -> n
                _ -> 0
            }
        })
    }

    printf("values: ~w~nmax: ~p~n", #(use_list, max(use_list)))
}
