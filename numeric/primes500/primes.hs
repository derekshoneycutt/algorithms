import Text.Printf

primes :: [Integer]
primes = sieve [2..]
  where
    sieve (p : xs) = p : sieve [x | x <- xs,
                                   x `mod` p /= 0]
    sieve [] = []

firstPrimes :: Int -> [Integer]
firstPrimes n = take n primes

pad :: Integer -> String
pad num = printf "%04d" num

printLines :: [Integer] -> Int -> IO ()
printLines values i
    | (length values) `div` 10 > i = do
        putStrLn $ "     " ++ pad (values !! i)
            ++ " " ++ pad (values !! (i + 50))
            ++ " " ++ pad (values !! (i + 100))
            ++ " " ++ pad (values !! (i + 150))
            ++ " " ++ pad (values !! (i + 200))
            ++ " " ++ pad (values !! (i + 250))
            ++ " " ++ pad (values !! (i + 300))
            ++ " " ++ pad (values !! (i + 350))
            ++ " " ++ pad (values !! (i + 400))
            ++ " " ++ pad (values !! (i + 450))
        printLines values (i + 1)
    | otherwise = return ()

printPrimes :: [Integer] -> IO ()
printPrimes primes = do
    putStrLn $ "First Five Hundred Primes"
    printLines primes 0

main :: IO ()
main = printPrimes (firstPrimes 500)
