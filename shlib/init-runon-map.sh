#! /bin/sh

# The helpers below treat DEREKALGOS_RUNONDOCKER as a simple space-separated
# key=value map. The algorithms are intentionally standard: scan, rebuild, and
# preserve command-line order when replaying edits.

# Emit the supported language key list for run-on-docker mappings.
runondocker_language_list() {
    for lang_key in $supportedLanguageKeys; do
        printf '%s\n' "$lang_key"
    done
}

# Print supported language keys in compact wrapped columns.
print_supported_language_keys_grid() {
    max_key_len=0
    for lang_key in $(runondocker_language_list); do
        key_len=${#lang_key}
        if [ "$key_len" -gt "$max_key_len" ]; then
            max_key_len="$key_len"
        fi
    done

    col_width=$((max_key_len + 3))
    display_cols=$(get_display_columns)
    cols_per_row=$((display_cols / col_width))
    if [ "$cols_per_row" -lt 1 ]; then
        cols_per_row=1
    fi

    current_col=0
    for lang_key in $(runondocker_language_list); do
        printf "  %-*s" "$col_width" "$lang_key"
        current_col=$((current_col + 1))
        if [ "$current_col" -ge "$cols_per_row" ]; then
            printf '\n'
            current_col=0
        fi
    done
    if [ "$current_col" -ne 0 ]; then
        printf '\n'
    fi
}

# Print only currently configured run-on-docker mappings.
print_runondocker_configured_mappings() {
    has_mapping=0
    for lang_key in $(runondocker_language_list); do
        img_value=$(runondocker_get_image_for_lang "$useRunOnDocker" "$lang_key")
        if [ -n "$img_value" ]; then
            echo "  $lang_key=$img_value"
            has_mapping=1
        fi
    done
    if [ "$has_mapping" -eq 0 ]; then
        echo "  <none>"
    fi
}

# Print only currently configured run-on-ssh mappings.
print_runonssh_configured_mappings() {
    has_mapping=0
    for lang_key in $(runondocker_language_list); do
        route_value=$(runonssh_get_route_for_lang "$useRunOnSsh" "$lang_key")
        if [ -n "$route_value" ]; then
            echo "  $lang_key=$route_value"
            has_mapping=1
        fi
    done
    if [ "$has_mapping" -eq 0 ]; then
        echo "  <none>"
    fi
}

# Print all supported languages with their current run-on-docker mapping or <unset>.
print_runondocker_all_mappings() {
    for lang_key in $(runondocker_language_list); do
        img_value=$(runondocker_get_image_for_lang "$useRunOnDocker" "$lang_key")
        if [ -n "$img_value" ]; then
            echo "  $lang_key=$img_value"
        else
            echo "  $lang_key=<unset>"
        fi
    done
}

# Print all supported languages with their current run-on-ssh mapping or <unset>.
print_runonssh_all_mappings() {
    for lang_key in $(runondocker_language_list); do
        route_value=$(runonssh_get_route_for_lang "$useRunOnSsh" "$lang_key")
        if [ -n "$route_value" ]; then
            echo "  $lang_key=$route_value"
        else
            echo "  $lang_key=<unset>"
        fi
    done
}

# Check whether a run-on-docker language key is known.
is_known_runondocker_language() {
    target_lang="$1"
    for known_lang in $(runondocker_language_list); do
        if [ "$known_lang" = "$target_lang" ]; then
            return 0
        fi
    done
    return 1
}

# Append one ordered run-on-docker CLI operation for later replay.
append_runondocker_cli_op() {
    op_kind="$1"
    op_value="$2"
    if [ -n "$runOnDockerCliOps" ]; then
        runOnDockerCliOps="$runOnDockerCliOps
$op_kind|$op_value"
    else
        runOnDockerCliOps="$op_kind|$op_value"
    fi
}

# Append one ordered run-on-ssh CLI operation for later replay.
append_runonssh_cli_op() {
    op_kind="$1"
    op_value="$2"
    if [ -n "$runOnSshCliOps" ]; then
        runOnSshCliOps="$runOnSshCliOps
$op_kind|$op_value"
    else
        runOnSshCliOps="$op_kind|$op_value"
    fi
}

# Resolve image value for one language key from a mapping string.
runondocker_get_image_for_lang() {
    map_string="$1"
    target_lang="$2"
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            printf '%s\n' "${pair#*=}"
            return
        fi
    done
}

# Resolve SSH route value for one language key from a mapping string.
runonssh_get_route_for_lang() {
    map_string="$1"
    target_lang="$2"
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            printf '%s\n' "${pair#*=}"
            return
        fi
    done
}

# Remove one language key from a mapping string.
runondocker_remove_lang() {
    map_string="$1"
    target_lang="$2"
    next_map=""
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            continue
        fi
        if [ -n "$next_map" ]; then
            next_map="$next_map $pair"
        else
            next_map="$pair"
        fi
    done
    printf '%s\n' "$next_map"
}

# Remove one language key from the SSH routing string.
runonssh_remove_lang() {
    map_string="$1"
    target_lang="$2"
    next_map=""
    for pair in $map_string; do
        pair_lang=${pair%%=*}
        if [ "$pair_lang" = "$target_lang" ]; then
            continue
        fi
        if [ -n "$next_map" ]; then
            next_map="$next_map $pair"
        else
            next_map="$pair"
        fi
    done
    printf '%s\n' "$next_map"
}

# Set one language key to an image in a mapping string.
runondocker_set_lang() {
    map_string="$1"
    target_lang="$2"
    target_image="$3"
    base_map=$(runondocker_remove_lang "$map_string" "$target_lang")
    if [ -z "$target_image" ]; then
        printf '%s\n' "$base_map"
        return
    fi
    if [ -n "$base_map" ]; then
        printf '%s\n' "$base_map $target_lang=$target_image"
    else
        printf '%s\n' "$target_lang=$target_image"
    fi
}

# Validate one inline SSH route definition.
is_valid_runonssh_route() {
    route_value="$1"
    validate_and_parse_runonssh_route "$route_value"
}

# Set one language key to an SSH route in a mapping string.
runonssh_set_lang() {
    map_string="$1"
    target_lang="$2"
    target_route="$3"
    base_map=$(runonssh_remove_lang "$map_string" "$target_lang")
    if [ -z "$target_route" ]; then
        printf '%s\n' "$base_map"
        return
    fi
    if [ -n "$base_map" ]; then
        printf '%s\n' "$base_map $target_lang=$target_route"
    else
        printf '%s\n' "$target_lang=$target_route"
    fi
}

# Set all known languages to one image (or clear all when image is empty).
runondocker_set_all() {
    target_image="$1"
    if [ -z "$target_image" ]; then
        printf '%s\n' ""
        return
    fi
    all_map=""
    for lang_key in $(runondocker_language_list); do
        if [ -n "$all_map" ]; then
            all_map="$all_map $lang_key=$target_image"
        else
            all_map="$lang_key=$target_image"
        fi
    done
    printf '%s\n' "$all_map"
}

# Set all known languages to one SSH route (or clear all when route is empty).
runonssh_set_all() {
    target_route="$1"
    if [ -z "$target_route" ]; then
        printf '%s\n' ""
        return
    fi
    all_map=""
    for lang_key in $(runondocker_language_list); do
        if [ -n "$all_map" ]; then
            all_map="$all_map $lang_key=$target_route"
        else
            all_map="$lang_key=$target_route"
        fi
    done
    printf '%s\n' "$all_map"
}

# Print current mapping for every supported language.
show_runondocker_map() {
    echo "Current DEREKALGOS_RUNONDOCKER settings:"
    echo "Supported language keys:"
    print_supported_language_keys_grid
    echo "Configured mappings:"
    print_runondocker_configured_mappings
}

# Print current SSH routing for every supported language.
show_runonssh_map() {
    echo "Current DEREKALGOS_RUNONSSH settings:"
    echo "Supported language keys:"
    print_supported_language_keys_grid
    echo "Configured mappings:"
    print_runonssh_configured_mappings
}

# Apply non-interactive set/remove command-line edits to run-on-docker map.
apply_runondocker_cli_changes() {
    if [ -z "$runOnDockerCliOps" ]; then
        return
    fi

    while IFS= read -r op_entry; do
        if [ -z "$op_entry" ]; then
            continue
        fi
        op_kind=${op_entry%%|*}
        op_value=${op_entry#*|}
        case "$op_kind" in
            replace)
                useRunOnDocker="$op_value"
                ;;
            remove)
                case "$op_value" in
                    all)
                        useRunOnDocker=""
                        ;;
                    *)
                        if ! is_known_runondocker_language "$op_value"; then
                            echo "Unknown runondocker remove target: $op_value" >&2
                            targetSuggestion=$(suggest_language_key_for_unknown "$op_value")
                            if [ -n "$targetSuggestion" ]; then
                                echo "Did you mean target: $targetSuggestion" >&2
                            fi
                            exit 64
                        fi
                        useRunOnDocker=$(runondocker_remove_lang "$useRunOnDocker" "$op_value")
                        ;;
                esac
                ;;
            set)
                set_target=${op_value%%=*}
                if [ "$set_target" = "$op_value" ]; then
                    echo "Invalid --runondocker-set format. Expected <target>=<image>." >&2
                    exit 64
                fi
                set_image=${op_value#*=}
                if [ -z "$set_target" ] || [ -z "$set_image" ]; then
                    echo "Invalid --runondocker-set format. Expected non-empty <target>=<image>." >&2
                    exit 64
                fi
                case "$set_target" in
                    all)
                        useRunOnDocker=$(runondocker_set_all "$set_image")
                        ;;
                    *)
                        if ! is_known_runondocker_language "$set_target"; then
                            echo "Unknown runondocker set target: $set_target" >&2
                            targetSuggestion=$(suggest_language_key_for_unknown "$set_target")
                            if [ -n "$targetSuggestion" ]; then
                                echo "Did you mean target: $targetSuggestion" >&2
                            fi
                            exit 64
                        fi
                        useRunOnDocker=$(runondocker_set_lang "$useRunOnDocker" "$set_target" "$set_image")
                        ;;
                esac
                ;;
        esac
    done <<EOF
$runOnDockerCliOps
EOF
}

# Apply non-interactive set/remove command-line edits to run-on-ssh map.
apply_runonssh_cli_changes() {
    if [ -z "$runOnSshCliOps" ]; then
        return
    fi

    while IFS= read -r op_entry; do
        if [ -z "$op_entry" ]; then
            continue
        fi
        op_kind=${op_entry%%|*}
        op_value=${op_entry#*|}
        case "$op_kind" in
            replace)
                useRunOnSsh="$op_value"
                ;;
            remove)
                case "$op_value" in
                    all)
                        useRunOnSsh=""
                        ;;
                    *)
                        if ! is_known_runondocker_language "$op_value"; then
                            echo "Unknown runonssh remove target: $op_value" >&2
                            targetSuggestion=$(suggest_language_key_for_unknown "$op_value")
                            if [ -n "$targetSuggestion" ]; then
                                echo "Did you mean target: $targetSuggestion" >&2
                            fi
                            exit 64
                        fi
                        useRunOnSsh=$(runonssh_remove_lang "$useRunOnSsh" "$op_value")
                        ;;
                esac
                ;;
            set)
                set_target=${op_value%%=*}
                if [ "$set_target" = "$op_value" ]; then
                    echo "Invalid --runonssh-set format. Expected <target>=<route>." >&2
                    exit 64
                fi
                set_route=${op_value#*=}
                if [ -z "$set_target" ] || [ -z "$set_route" ]; then
                    echo "Invalid --runonssh-set format. Expected non-empty <target>=<route>." >&2
                    exit 64
                fi
                if ! is_valid_runonssh_route "$set_route"; then
                    echo "Invalid runonssh route '$set_route'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script." >&2
                    exit 64
                fi
                case "$set_target" in
                    all)
                        useRunOnSsh=$(runonssh_set_all "$set_route")
                        ;;
                    *)
                        if ! is_known_runondocker_language "$set_target"; then
                            echo "Unknown runonssh set target: $set_target" >&2
                            targetSuggestion=$(suggest_language_key_for_unknown "$set_target")
                            if [ -n "$targetSuggestion" ]; then
                                echo "Did you mean target: $targetSuggestion" >&2
                            fi
                            exit 64
                        fi
                        useRunOnSsh=$(runonssh_set_lang "$useRunOnSsh" "$set_target" "$set_route")
                        ;;
                esac
                ;;
        esac
    done <<EOF
$runOnSshCliOps
EOF
}

# Prompt-driven editor for run-on-docker map (language/all set/remove/show).
edit_runondocker_interactive() {
    echo ""
    echo "Run-on-docker interactive editor"
    echo "  ENTER accepts defaults shown in [brackets]."
    echo "  Type 'done' (or press ENTER at language prompt) to exit editor."
    echo "  Type 'show' at language prompt to view all languages and their current mappings."
    echo "  Supported language keys:"
    print_supported_language_keys_grid
    echo ""
    all_default=$(prompt_with_default "Initial all-language action image (type 'skip' to keep existing map, 'none' to clear all)" "skip")
    case "$all_default" in
        skip|SKIP)
            ;;
        none|NONE)
            useRunOnDocker=""
            ;;
        *)
            useRunOnDocker=$(runondocker_set_all "$all_default")
            ;;
    esac

    while :; do
        echo ""
        target_lang=$(prompt_with_default "Language to edit (name/all/show/done; ENTER=done)" "done")
        case "$target_lang" in
            done|DONE)
                break
                ;;
            show|SHOW)
                echo "All run-on-docker mappings:"
                print_runondocker_all_mappings
                continue
                ;;
            all|ALL)
                action=$(prompt_with_default "Action for all languages (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnDocker=""
                        ;;
                    set|SET)
                        all_image=$(prompt_with_default "Docker image for all languages" "code-runner")
                        if [ -n "$all_image" ]; then
                            useRunOnDocker=$(runondocker_set_all "$all_image")
                        fi
                        ;;
                    *) ;;
                esac
                ;;
            *)
                if ! is_known_runondocker_language "$target_lang"; then
                    echo "Unknown language '$target_lang'. Use 'show' to view available keys."
                    targetSuggestion=$(suggest_language_key_for_unknown "$target_lang")
                    if [ -n "$targetSuggestion" ]; then
                        echo "Did you mean target: $targetSuggestion"
                    fi
                    continue
                fi
                current_image=$(runondocker_get_image_for_lang "$useRunOnDocker" "$target_lang")
                if [ -z "$current_image" ]; then
                    current_image="code-runner"
                fi
                action=$(prompt_with_default "Action for $target_lang (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnDocker=$(runondocker_remove_lang "$useRunOnDocker" "$target_lang")
                        ;;
                    set|SET)
                        image_name=$(prompt_with_default "Docker image for $target_lang" "$current_image")
                        if [ -n "$image_name" ]; then
                            useRunOnDocker=$(runondocker_set_lang "$useRunOnDocker" "$target_lang" "$image_name")
                        fi
                        ;;
                    *) ;;
                esac
                ;;
        esac
    done
}

# Prompt-driven editor for run-on-ssh map (language/all set/remove/show).
edit_runonssh_interactive() {
    echo ""
    echo "Run-on-ssh interactive editor"
    echo "  ENTER accepts defaults shown in [brackets]."
    echo "  Type 'done' (or press ENTER at language prompt) to exit editor."
    echo "  Type 'show' at language prompt to view all languages and their current mappings."
    echo "  Supported language keys:"
    print_supported_language_keys_grid
    echo ""
    all_default=$(prompt_with_default "Initial all-language action route (type 'skip' to keep existing map, 'none' to clear all)" "skip")
    case "$all_default" in
        skip|SKIP)
            ;;
        none|NONE)
            useRunOnSsh=""
            ;;
        *)
            if ! is_valid_runonssh_route "$all_default"; then
                echo "Invalid SSH route '$all_default'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script."
            else
                useRunOnSsh=$(runonssh_set_all "$all_default")
            fi
            ;;
    esac

    while :; do
        echo ""
        target_lang=$(prompt_with_default "Language to edit (name/all/show/done; ENTER=done)" "done")
        case "$target_lang" in
            done|DONE)
                break
                ;;
            show|SHOW)
                echo "All run-on-ssh mappings:"
                print_runonssh_all_mappings
                continue
                ;;
            all|ALL)
                action=$(prompt_with_default "Action for all languages (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnSsh=""
                        ;;
                    set|SET)
                        all_route=$(prompt_with_default "SSH route for all languages" "127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh")
                        if [ -n "$all_route" ]; then
                            if ! is_valid_runonssh_route "$all_route"; then
                                echo "Invalid SSH route '$all_route'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script."
                            else
                                useRunOnSsh=$(runonssh_set_all "$all_route")
                            fi
                        fi
                        ;;
                    *) ;;
                esac
                ;;
            *)
                if ! is_known_runondocker_language "$target_lang"; then
                    echo "Unknown language '$target_lang'. Use 'show' to view available keys."
                    targetSuggestion=$(suggest_language_key_for_unknown "$target_lang")
                    if [ -n "$targetSuggestion" ]; then
                        echo "Did you mean target: $targetSuggestion"
                    fi
                    continue
                fi
                current_route=$(runonssh_get_route_for_lang "$useRunOnSsh" "$target_lang")
                if [ -z "$current_route" ]; then
                    current_route="127.0.0.1|coderun|2222|/home/coderun/codefiles|../run.sh"
                fi
                action=$(prompt_with_default "Action for $target_lang (set/remove/skip)" "set")
                case "$action" in
                    remove|REMOVE)
                        useRunOnSsh=$(runonssh_remove_lang "$useRunOnSsh" "$target_lang")
                        ;;
                    set|SET)
                        route_value=$(prompt_with_default "SSH route for $target_lang" "$current_route")
                        if [ -n "$route_value" ]; then
                            if ! is_valid_runonssh_route "$route_value"; then
                                echo "Invalid SSH route '$route_value'. Expected ssh-destination|code-dir|run-script or ssh-address|ssh-user|ssh-port|code-dir|run-script."
                            else
                                useRunOnSsh=$(runonssh_set_lang "$useRunOnSsh" "$target_lang" "$route_value")
                            fi
                        fi
                        ;;
                    *) ;;
                esac
                ;;
        esac
    done
}
