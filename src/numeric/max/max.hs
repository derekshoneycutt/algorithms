{-
    Get the maximum value of some sequence of values
 -}
import System.Environment (getArgs)
import Data.List (intersperse)

-- | Get the maximum value of some list
max_list :: Ord a => [a] -> Maybe a
max_list [] = Nothing
max_list (x : xs) = Just (reduce_max xs x)
    where
        reduce_max [] max = max
        reduce_max (x : xs) max
            | x > max = reduce_max xs x
            | otherwise = reduce_max xs max

-- | Get the arguments as integers
argsAsInts :: [String] -> (Maybe [Integer])
argsAsInts [] = Nothing
argsAsInts args = Just [read arg :: Integer | arg <- args]

-- | Get just the given list or a default list if its Nothing
orDefault :: (Maybe [Integer]) -> [Integer] -> [Integer]
orDefault Nothing list = list
orDefault (Just list) _ = list

-- | The main entry point to the application
main :: IO ()
main = do
    args <- getArgs
    let intArgs = orDefault (argsAsInts args) [15, 10]
    let maxValue = max_list intArgs

    putStrLn $ "values: [" ++ (concat (intersperse " " (map show intArgs))) ++ "]"
    putStrLn $ "max: " ++ case maxValue of
        Nothing -> "n/a"
        Just value -> show value
