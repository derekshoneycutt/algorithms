#include <print>
#include <cstdlib>
#include <vector>

template<typename T, std::input_iterator iter>
int max(iter begin, iter end)
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
