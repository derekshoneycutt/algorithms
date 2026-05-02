package main
/*
	Get the maximum value of a sequence of numbers
 */

import (
	"cmp"
	"fmt"
	"os"
	"strconv"
)

// Get the maximum from some list of orderable values
func max[T cmp.Ordered](list []T) T {
	var curr T
	for _, value := range list {
		if value > curr {
			curr = value
		}
	}
	return curr
}

// The main entrypoint of the application
func main() {
	var list []int
	var parsed int
	var maxValue int
	var err error

	if len(os.Args) > 1 {
		for i, value := range os.Args {
			if i > 0 {
				parsed, err = strconv.Atoi(value)
				list = append(list, parsed)
			}
		}
	} else {
		list = append(list, 15, 10)
	}

	if err != nil {
		fmt.Println("An error happened")
	}

	maxValue = max(list)

	fmt.Println("values: ", list)
	fmt.Println("max: ", maxValue)
}
