/*
 *  Get the maximum value of a sequence of values
 */

#include <print>
#include <cstdlib>
#include <vector>

/**
 * Get the maximum value from a range of elements.
 * 
 * @tparam T The type of the elements.
 * @tparam iter The type of the iterator.
 * @param begin The beginning of the range.
 * @param end The end of the range.
 * @return The maximum value in the range.
 */
template<typename T, std::input_iterator iter>
T max(iter begin, iter end)
{
    T current = 0;
    for (iter it = begin; it != end; ++it)
    {
        if (*it > current)
        {
            current = *it;
        }
    }
    return current;
}

/**
 * The main entry point to the application
 * 
 * @param argc The number of arguments on the command line
 * @param argv The array of command line arguments given
 * @returns 0
 */
int main(int argc, char *argv[])
{
    std::vector<int> values{};

    if (argc > 1)
    {
        for (int i = 0; i < argc - 1; ++i)
        {
            values.push_back(std::stoi(argv[i + 1]));
        }
    }
    else
    {
        values.push_back(15);
        values.push_back(10);
    }

    int pmax = max<int>(values.begin(), values.end());

    std::println("values: {}", values);
    std::println("max: {}", pmax);
}
