#! /bin/sh

# Suggest the closest option for an unknown option token.
suggest_option_for_unknown() {
  unknownOption="$1"
  normalizedOption=$(normalize_option_token "$unknownOption")
  optionCatalog=$(print_option_catalog)
  suggest_from_catalog "$normalizedOption" "$optionCatalog" | head -n 1
}

# Suggest the closest help topic for unknown topic values.
suggest_help_topic_for_unknown() {
  unknownTopic="$1"
  topicCatalog=$(print_help_topic_catalog)
  suggest_from_catalog "$unknownTopic" "$topicCatalog" | head -n 1
}
