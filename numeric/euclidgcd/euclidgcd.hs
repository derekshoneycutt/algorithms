import System.Environment (getArgs)

euclidgcd :: Integer -> Integer -> Integer
euclidgcd m 0 = m
euclidgcd m n = euclidgcd n (m `mod` n)

tryPair :: [String] -> Maybe (String, String)
tryPair (x : y : xs) = Just (x, y)
tryPair _ = Nothing

firstOrDefault :: (Maybe (String, String)) -> Integer -> Integer
firstOrDefault (Just (x, y)) _ = (read x :: Integer)
firstOrDefault Nothing v = v

secondOrDefault :: (Maybe (String, String)) -> Integer -> Integer
secondOrDefault (Just (x, y)) _ = (read y :: Integer)
secondOrDefault Nothing v = v


main :: IO ()
main = do
    args <- getArgs
    let twoArgs = tryPair args
    let m = firstOrDefault twoArgs 15
    let n = secondOrDefault twoArgs 10

    let gcd = euclidgcd m n

    putStrLn $ show m ++ " " ++ show n
    putStrLn $ "gcd: " ++ show gcd
