/// Tree-sitter grammar for SurrealQL (SurrealDB 3+)
///
/// Originally inspired by tree-sitter-surrealql by Cellan Hall.
/// Rewritten for SurrealDB 3+ by overrealdb.

module.exports = grammar({
  name: "surrealql",

  extras: ($) => [$.comment, /\s/],

  conflicts: ($) => [],

  rules: {
    source_file: ($) => seq(optional($.statement_list)),

    statement_list: ($) =>
      seq($.statement, repeat(seq(";", $.statement)), optional(";")),

    statement: ($) =>
      choice(
        // DML
        $.select_statement,
        $.create_statement,
        $.update_statement,
        $.upsert_statement,
        $.delete_statement,
        $.insert_statement,
        $.relate_statement,
        // DDL
        $.define_statement,
        $.remove_statement,
        $.alter_statement,
        // Control
        $.let_statement,
        $.if_statement,
        $.for_statement,
        $.return_statement,
        $.throw_statement,
        $.break_statement,
        $.continue_statement,
        // Transaction
        $.begin_statement,
        $.commit_statement,
        $.cancel_statement,
        // Info / Live / Other
        $.use_statement,
        $.info_statement,
        $.show_statement,
        $.live_statement,
        $.kill_statement,
        $.sleep_statement,
        // Expressions (fallback)
        $.value,
      ),

    // ─── Comments ───

    comment: (_) =>
      token(
        choice(
          seq("--", /.*/),
          seq("//", /.*/),
          seq("#", /.*/),
          seq("/*", /[^*]*\*+([^/*][^*]*\*+)*/, "/"),
        ),
      ),

    // ─── DML Statements ───

    select_statement: ($) =>
      seq(
        $.select_clause,
        optional($.omit_clause),
        $.from_clause,
        optional($.where_clause),
        optional($.split_clause),
        optional($.group_clause),
        optional($.order_clause),
        optional($.limit_clause),
        optional($.fetch_clause),
        optional($.timeout_clause),
        optional($.keyword_parallel),
        optional($.explain_clause),
      ),

    select_clause: ($) =>
      seq(
        $.keyword_select,
        choice(seq($.keyword_value, $.field), csv($.field_alias)),
      ),

    field_alias: ($) => seq($.field, optional(seq($.keyword_as, $.identifier))),
    field: ($) => choice("*", $.value),
    omit_clause: ($) => seq($.keyword_omit, csv($.identifier)),

    from_clause: ($) =>
      seq($.keyword_from, optional($.keyword_only), csv($.value)),

    create_statement: ($) =>
      seq(
        $.keyword_create,
        optional($.keyword_only),
        csv($.value),
        optional(choice($.content_clause, $.set_clause)),
        optional($.return_clause),
        optional($.timeout_clause),
        optional($.keyword_parallel),
      ),

    update_statement: ($) =>
      seq(
        $.keyword_update,
        optional($.keyword_only),
        csv($.value),
        optional(
          choice(
            $.content_clause,
            $.merge_clause,
            $.patch_clause,
            $.set_clause,
            $.unset_clause,
          ),
        ),
        optional($.where_clause),
        optional($.return_clause),
        optional($.timeout_clause),
        optional($.keyword_parallel),
      ),

    upsert_statement: ($) =>
      seq(
        $.keyword_upsert,
        optional($.keyword_only),
        csv($.value),
        optional(
          choice(
            $.content_clause,
            $.merge_clause,
            $.patch_clause,
            $.set_clause,
            $.unset_clause,
          ),
        ),
        optional($.where_clause),
        optional($.return_clause),
        optional($.timeout_clause),
        optional($.keyword_parallel),
      ),

    delete_statement: ($) =>
      seq(
        $.keyword_delete,
        optional($.keyword_only),
        csv($.value),
        optional($.where_clause),
        optional($.return_clause),
        optional($.timeout_clause),
        optional($.keyword_parallel),
      ),

    insert_statement: ($) =>
      seq(
        $.keyword_insert,
        optional($.keyword_ignore),
        $.keyword_into,
        $.identifier,
        choice(
          $.object,
          seq("[", csv($.object), "]"),
          seq(
            "(",
            csv($.identifier),
            ")",
            $.keyword_values,
            csv(seq("(", csv($.value), ")")),
            optional(
              seq(
                seq(
                  $.keyword_on,
                  $.keyword_duplicate,
                  $.keyword_key,
                  $.keyword_update,
                ),
                csv($.field_assignment),
              ),
            ),
          ),
        ),
      ),

    relate_statement: ($) =>
      seq(
        $.keyword_relate,
        optional($.keyword_only),
        $.relate_subject,
        "->",
        $.relate_subject,
        "->",
        $.relate_subject,
        optional(choice($.content_clause, $.set_clause)),
        optional($.return_clause),
        optional($.timeout_clause),
        optional($.keyword_parallel),
      ),

    relate_subject: ($) => choice($.base_value, $.sub_query, $.function_call),

    // ─── DDL Statements (SurrealDB 3+) ───

    define_statement: ($) =>
      seq(
        $.keyword_define,
        optional(choice($.keyword_overwrite, $.if_not_exists)),
        choice(
          $.define_namespace,
          $.define_database,
          $.define_table,
          $.define_field,
          $.define_index,
          $.define_analyzer,
          $.define_function,
          $.define_event,
          $.define_param,
          $.define_access,
          $.define_user,
        ),
      ),

    define_namespace: ($) =>
      seq($.keyword_namespace, $.identifier, optional($.comment_clause)),

    define_database: ($) =>
      seq($.keyword_database, $.identifier, optional($.comment_clause)),

    define_table: ($) =>
      seq(
        $.keyword_table,
        $.identifier,
        repeat(
          choice(
            $.keyword_drop,
            $.keyword_schemafull,
            $.keyword_schemaless,
            $.table_type_clause,
            $.changefeed_clause,
            $.permissions_clause,
            $.comment_clause,
            $.table_view_clause,
          ),
        ),
      ),

    define_field: ($) =>
      seq(
        $.keyword_field,
        optional($.if_not_exists),
        $.field_path,
        $.keyword_on,
        optional($.keyword_table),
        $.identifier,
        repeat(
          choice(
            $.type_clause,
            $.default_clause,
            $.readonly_clause,
            $.assert_clause,
            $.permissions_clause,
            $.comment_clause,
          ),
        ),
      ),

    define_index: ($) =>
      seq(
        $.keyword_index,
        $.identifier,
        $.keyword_on,
        optional($.keyword_table),
        $.identifier,
        $.fields_columns_clause,
        repeat(
          choice(
            $.keyword_unique,
            $.search_analyzer_clause,
            $.mtree_clause,
            $.hnsw_clause,
            $.comment_clause,
          ),
        ),
      ),

    define_analyzer: ($) =>
      seq(
        $.keyword_analyzer,
        $.identifier,
        repeat(choice($.tokenizers_clause, $.filters_clause, $.comment_clause)),
      ),

    define_function: ($) =>
      seq(
        $.keyword_function,
        $.custom_function_name,
        $.param_list,
        optional(seq("->", $.type)),
        $.block,
        repeat(choice($.permissions_basic_clause, $.comment_clause)),
      ),

    define_event: ($) =>
      seq(
        $.keyword_event,
        $.identifier,
        $.keyword_on,
        optional($.keyword_table),
        $.identifier,
        optional(seq($.keyword_when, $.value)),
        optional($.keyword_then),
        choice($.block, $.sub_query),
        optional($.comment_clause),
      ),

    define_param: ($) =>
      seq(
        $.keyword_param,
        $.variable_name,
        $.keyword_value,
        $.value,
        optional($.permissions_basic_clause),
      ),

    define_access: ($) =>
      seq(
        $.keyword_access,
        $.identifier,
        $.keyword_on,
        choice($.keyword_root, $.keyword_namespace, $.keyword_database),
        $.keyword_type,
        choice(
          seq($.keyword_record, optional($.access_record_clauses)),
          seq($.keyword_jwt, $.jwt_clauses),
          seq(
            $.keyword_bearer,
            optional(
              seq($.keyword_for, choice($.keyword_user, $.keyword_record)),
            ),
          ),
        ),
        optional(seq($.keyword_authenticate, $.block)),
        optional($.duration_clause),
      ),

    access_record_clauses: ($) =>
      repeat1(
        choice(
          seq($.keyword_signup, choice($.block, $.sub_query)),
          seq($.keyword_signin, choice($.block, $.sub_query)),
          seq($.keyword_with, $.keyword_jwt, $.jwt_clauses),
        ),
      ),

    jwt_clauses: ($) =>
      choice(
        seq($.keyword_algorithm, $.identifier, $.keyword_key, $.string),
        seq($.keyword_url, $.string),
        seq($.keyword_jwks, $.string),
      ),

    define_user: ($) =>
      seq(
        $.keyword_user,
        $.identifier,
        $.keyword_on,
        choice($.keyword_root, $.keyword_namespace, $.keyword_database),
        choice(
          seq($.keyword_password, $.string),
          seq($.keyword_passhash, $.string),
        ),
        $.keyword_roles,
        choice($.keyword_owner, $.keyword_editor, $.keyword_viewer),
        optional($.duration_clause),
      ),

    remove_statement: ($) =>
      seq(
        $.keyword_remove,
        choice(
          seq($.keyword_namespace, optional($.if_exists), $.identifier),
          seq($.keyword_database, optional($.if_exists), $.identifier),
          seq($.keyword_table, optional($.if_exists), $.identifier),
          seq(
            $.keyword_field,
            optional($.if_exists),
            $.field_path,
            $.keyword_on,
            optional($.keyword_table),
            $.identifier,
          ),
          seq(
            $.keyword_index,
            optional($.if_exists),
            $.identifier,
            $.keyword_on,
            optional($.keyword_table),
            $.identifier,
          ),
          seq($.keyword_analyzer, optional($.if_exists), $.identifier),
          seq(
            $.keyword_function,
            optional($.if_exists),
            $.custom_function_name,
          ),
          seq(
            $.keyword_event,
            optional($.if_exists),
            $.identifier,
            $.keyword_on,
            optional($.keyword_table),
            $.identifier,
          ),
          seq($.keyword_param, optional($.if_exists), $.variable_name),
          seq(
            $.keyword_access,
            optional($.if_exists),
            $.identifier,
            $.keyword_on,
            choice($.keyword_root, $.keyword_namespace, $.keyword_database),
          ),
          seq(
            $.keyword_user,
            optional($.if_exists),
            $.identifier,
            $.keyword_on,
            choice($.keyword_root, $.keyword_namespace, $.keyword_database),
          ),
        ),
      ),

    alter_statement: ($) =>
      seq(
        $.keyword_alter,
        $.keyword_table,
        optional($.if_exists),
        $.identifier,
        repeat(
          choice(
            $.keyword_drop,
            $.keyword_schemafull,
            $.keyword_schemaless,
            $.permissions_clause,
            $.comment_clause,
          ),
        ),
      ),

    // ─── Control Flow ───

    let_statement: ($) => seq($.keyword_let, $.variable_name, "=", $.value),
    if_statement: ($) =>
      seq(
        $.keyword_if,
        $.value,
        $.block,
        repeat(seq($.keyword_else, $.keyword_if, $.value, $.block)),
        optional(seq($.keyword_else, $.block)),
      ),
    for_statement: ($) =>
      seq($.keyword_for, $.variable_name, $.keyword_in, $.value, $.block),
    return_statement: ($) => seq($.keyword_return, $.value),
    throw_statement: ($) => seq($.keyword_throw, $.value),
    break_statement: ($) => $.keyword_break,
    continue_statement: ($) => $.keyword_continue,

    // ─── Transaction ───

    begin_statement: ($) =>
      seq($.keyword_begin, optional($.keyword_transaction)),
    commit_statement: ($) =>
      seq($.keyword_commit, optional($.keyword_transaction)),
    cancel_statement: ($) =>
      seq($.keyword_cancel, optional($.keyword_transaction)),

    // ─── Other Statements ───

    use_statement: ($) =>
      seq(
        $.keyword_use,
        choice($.ns_clause, $.db_clause, seq($.ns_clause, $.db_clause)),
      ),
    ns_clause: ($) => seq($.keyword_ns, $.identifier),
    db_clause: ($) => seq($.keyword_db, $.identifier),

    info_statement: ($) =>
      seq(
        $.keyword_info,
        $.keyword_for,
        choice(
          $.keyword_root,
          choice($.keyword_ns, $.keyword_namespace),
          choice($.keyword_db, $.keyword_database),
          seq($.keyword_table, $.identifier),
          seq(
            $.keyword_user,
            $.identifier,
            optional(
              seq(
                $.keyword_on,
                choice($.keyword_root, $.keyword_namespace, $.keyword_database),
              ),
            ),
          ),
        ),
      ),

    show_statement: ($) =>
      seq(
        $.keyword_show,
        $.keyword_changes,
        $.keyword_for,
        $.keyword_table,
        $.identifier,
        $.keyword_since,
        $.value,
        optional($.limit_clause),
      ),

    live_statement: ($) => seq($.keyword_live, $.select_statement),
    kill_statement: ($) => seq($.keyword_kill, $.value),
    sleep_statement: ($) => seq($.keyword_sleep, $.duration),

    // ─── Clauses ───

    where_clause: ($) => seq($.keyword_where, $.value),
    split_clause: ($) =>
      seq($.keyword_split, optional($.keyword_at), csv($.identifier)),
    group_clause: ($) =>
      seq($.keyword_group, optional($.keyword_by), csv($.identifier)),
    order_clause: ($) =>
      seq($.keyword_order, optional($.keyword_by), csv($.order_criteria)),
    order_criteria: ($) =>
      seq(
        $.value,
        optional(choice($.keyword_rand, $.keyword_collate, $.keyword_numeric)),
        optional(choice($.keyword_asc, $.keyword_desc)),
      ),
    limit_clause: ($) => seq($.keyword_limit, optional($.keyword_by), $.value),
    fetch_clause: ($) => seq($.keyword_fetch, csv($.identifier)),
    timeout_clause: ($) => seq($.keyword_timeout, $.duration),
    explain_clause: ($) => seq($.keyword_explain, optional($.keyword_full)),

    content_clause: ($) =>
      seq($.keyword_content, choice($.object, $.variable_name)),
    set_clause: ($) => seq($.keyword_set, csv($.field_assignment)),
    unset_clause: ($) => seq($.keyword_unset, csv($.identifier)),
    merge_clause: ($) =>
      seq($.keyword_merge, choice($.object, $.variable_name)),
    patch_clause: ($) => seq($.keyword_patch, $.array),
    return_clause: ($) =>
      prec(
        2,
        seq(
          $.keyword_return,
          choice(
            $.keyword_before,
            $.keyword_after,
            $.keyword_diff,
            $.keyword_none,
            seq(optional($.keyword_value), csv($.value)),
          ),
        ),
      ),

    field_assignment: ($) =>
      seq($.field_path, choice("=", "+=", "-="), $.value),

    // DDL clauses
    table_type_clause: ($) =>
      seq(
        $.keyword_type,
        choice(
          $.keyword_any,
          $.keyword_normal,
          seq(
            $.keyword_relation,
            optional(
              seq(
                optional(choice($.keyword_in, $.keyword_from)),
                csv_or($.identifier),
              ),
            ),
            optional(
              seq(
                optional(choice($.keyword_out, $.keyword_to)),
                csv_or($.identifier),
              ),
            ),
            optional($.keyword_enforced),
          ),
        ),
      ),

    table_view_clause: ($) =>
      seq(
        $.keyword_as,
        $.keyword_select,
        csv($.field_alias),
        $.keyword_from,
        csv($.value),
        optional($.where_clause),
        optional($.group_clause),
      ),

    changefeed_clause: ($) =>
      seq(
        $.keyword_changefeed,
        $.duration,
        optional(seq($.keyword_include, $.keyword_original)),
      ),

    type_clause: ($) =>
      seq(optional($.keyword_flexible), $.keyword_type, $.type),
    default_clause: ($) =>
      seq($.keyword_default, optional($.keyword_always), $.value),
    readonly_clause: ($) => $.keyword_readonly,
    assert_clause: ($) => seq($.keyword_assert, $.value),

    permissions_clause: ($) =>
      seq(
        $.keyword_permissions,
        choice(
          $.keyword_none,
          $.keyword_full,
          repeat1(
            seq(
              $.keyword_for,
              csv(
                choice(
                  $.keyword_select,
                  $.keyword_create,
                  $.keyword_update,
                  $.keyword_delete,
                ),
              ),
              choice($.where_clause, $.keyword_none, $.keyword_full),
            ),
          ),
        ),
      ),

    permissions_basic_clause: ($) =>
      seq(
        $.keyword_permissions,
        choice($.keyword_none, $.keyword_full, $.where_clause),
      ),

    comment_clause: ($) => seq($.keyword_comment, $.string),

    fields_columns_clause: ($) =>
      seq(choice($.keyword_fields, $.keyword_columns), csv($.identifier)),

    tokenizers_clause: ($) =>
      seq(
        $.keyword_tokenizers,
        csv(choice("blank", "camel", "class", "punct")),
      ),
    filters_clause: ($) => seq($.keyword_filters, csv($.analyzer_filter)),
    analyzer_filter: ($) =>
      choice(
        "ascii",
        "lowercase",
        "uppercase",
        seq("edgengram", "(", $.int, ",", $.int, ")"),
        seq("ngram", "(", $.int, ",", $.int, ")"),
        seq("snowball", "(", $.identifier, ")"),
      ),

    search_analyzer_clause: ($) =>
      seq(
        $.keyword_search,
        $.keyword_analyzer,
        $.identifier,
        repeat(
          choice(
            seq(
              $.keyword_bm25,
              optional(seq("(", $.number, ",", $.number, ")")),
            ),
            $.keyword_highlights,
            seq($.keyword_doc_ids_cache, $.int),
            seq($.keyword_doc_ids_order, $.int),
            seq($.keyword_doc_lengths_cache, $.int),
            seq($.keyword_doc_lengths_order, $.int),
            seq($.keyword_postings_cache, $.int),
            seq($.keyword_postings_order, $.int),
            seq($.keyword_terms_cache, $.int),
            seq($.keyword_terms_order, $.int),
          ),
        ),
      ),

    mtree_clause: ($) =>
      seq(
        $.keyword_mtree,
        $.keyword_dimension,
        $.int,
        repeat(
          choice(
            seq($.keyword_type, $.type),
            seq($.keyword_dist, $.distance_value),
            seq($.keyword_capacity, $.int),
          ),
        ),
      ),

    hnsw_clause: ($) =>
      seq(
        $.keyword_hnsw,
        $.keyword_dimension,
        $.int,
        repeat(
          choice(
            seq($.keyword_type, $.type),
            seq($.keyword_dist, $.distance_value),
            seq($.keyword_efc, $.int),
            seq($.keyword_m, $.int),
          ),
        ),
      ),

    distance_value: ($) =>
      choice(
        $.keyword_chebyshev,
        $.keyword_cosine,
        $.keyword_euclidean,
        $.keyword_hamming,
        $.keyword_jaccard,
        $.keyword_manhattan,
        $.keyword_pearson,
        seq($.keyword_minkowski, $.number),
      ),

    session_clause: ($) => seq($.keyword_session, $.duration),

    duration_clause: ($) =>
      seq(
        $.keyword_duration,
        csv(
          seq(
            $.keyword_for,
            choice($.keyword_grant, $.keyword_token, $.keyword_session),
            $.duration,
          ),
        ),
      ),

    param_list: ($) =>
      seq("(", optional(csv(seq($.variable_name, ":", $.type))), ")"),

    if_not_exists: ($) => seq($.keyword_if, $.keyword_not, $.keyword_exists),
    if_exists: ($) => seq($.keyword_if, $.keyword_exists),

    // ─── Values & Expressions ───

    value: ($) =>
      choice(
        $.base_value,
        $.binary_expression,
        $.path,
        $.function_call,
        $.unary_expression,
        $.cast_expression,
        $.sub_query,
        $.range,
      ),

    base_value: ($) =>
      choice(
        $.string,
        $.prefixed_string,
        $.number,
        $.bool,
        $.none,
        $.null,
        $.variable_name,
        $.identifier,
        $.array,
        $.object,
        $.record_id,
        $.duration,
        $.point,
      ),

    bool: ($) => choice($.keyword_true, $.keyword_false),
    none: ($) => $.keyword_none,
    null: ($) => $.keyword_null,

    binary_expression: ($) => prec.left(1, seq($.value, $.operator, $.value)),
    unary_expression: ($) => prec(10, seq(choice("!", $.keyword_not), $.value)),
    cast_expression: ($) => prec(9, seq("<", $.type_name, ">", $.value)),

    path: ($) => prec.left(5, seq($.value, repeat1($.path_element))),
    path_element: ($) => choice($.graph_path, $.subscript, $.filter),
    graph_path: ($) =>
      seq(
        choice("<-", "->", "<->"),
        choice($.identifier, "?", seq("(", csv($.graph_predicate), ")")),
      ),
    graph_predicate: ($) =>
      seq(
        choice($.value, "?"),
        optional($.where_clause),
        optional(seq($.keyword_as, $.identifier)),
      ),
    subscript: ($) =>
      seq(
        ".",
        choice(
          prec(1, seq($.identifier, $.argument_list)),
          seq($.function_name, $.argument_list),
          $.identifier,
          "*",
        ),
      ),
    filter: ($) => seq("[", choice($.where_clause, $.value), "]"),

    function_call: ($) =>
      choice(
        seq($.keyword_count, $.argument_list),
        seq(
          choice($.function_name, $.custom_function_name, $.keyword_rand),
          optional($.version),
          $.argument_list,
        ),
      ),

    argument_list: ($) => seq("(", optional(csv($.value)), ")"),
    version: ($) => seq("<", /[0-9]+(\.[0-9]+(\.[0-9]+)?)?/, ">"),

    range: ($) => prec.left(seq($.value, "..", optional("="), $.value)),

    sub_query: ($) => seq("(", $.statement, ")"),
    block: ($) => seq("{", optional($.statement_list), "}"),

    // ─── Types ───

    type: ($) =>
      choice(
        $.union_type,
        $.parameterized_type,
        $.array_type,
        $.type_object,
        $.type_name,
      ),

    union_type: ($) =>
      prec.right(
        1,
        seq(
          choice($.type_name, $.literal_value),
          repeat1(seq("|", choice($.type_name, $.literal_value))),
        ),
      ),

    parameterized_type: ($) =>
      seq($.type_name, "<", csv(choice($.type, $.literal_value)), ">"),
    array_type: ($) => seq("[", csv($.type), "]"),
    type_object: ($) => seq("{", csv(seq($.object_key, ":", $.type)), "}"),
    type_name: (_) => token(prec(-1, /[a-zA-Z_][a-zA-Z0-9_]*/)),
    literal_value: ($) => choice($.int, $.string, $.duration),

    // ─── Operators ───

    operator: ($) =>
      prec.left(
        choice(
          // Comparison
          "=",
          "==",
          "!=",
          "?=",
          "*=",
          ">=",
          "<=",
          ">",
          "<",
          // Arithmetic
          "+",
          "-",
          "*",
          "/",
          "**",
          "%",
          "×",
          "÷",
          // Logic
          "&&",
          "||",
          "??",
          "?:",
          $.keyword_and,
          $.keyword_or,
          $.keyword_is,
          seq($.keyword_is, $.keyword_not),
          // Containment
          $.keyword_contains,
          $.keyword_containsnot,
          $.keyword_containsall,
          $.keyword_containsany,
          $.keyword_containsnone,
          $.keyword_in,
          seq($.keyword_not, $.keyword_in),
          $.keyword_inside,
          $.keyword_notinside,
          $.keyword_allinside,
          $.keyword_anyinside,
          $.keyword_noneinside,
          $.keyword_outside,
          $.keyword_intersects,
          // Match
          seq("@", $.int, "@"),
          seq("<|", $.int, optional(seq(",", $.distance_value)), "|>"),
          "@@",
        ),
      ),

    // ─── Literals ───

    string: (_) =>
      token(
        choice(
          seq("'", repeat(choice(/[^'\\]/, seq("\\", /./), "''")), "'"),
          seq('"', repeat(choice(/[^"\\]/, seq("\\", /./))), '"'),
        ),
      ),
    prefixed_string: (_) =>
      token(
        seq(
          /[ruds]/,
          choice(
            seq("'", repeat(choice(/[^'\\]/, seq("\\", /./))), "'"),
            seq('"', repeat(choice(/[^"\\]/, seq("\\", /./))), '"'),
          ),
        ),
      ),

    number: ($) => choice($.int, $.float, $.decimal),
    int: (_) => /-?[0-9]+/,
    float: (_) => /-?[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?f?/,
    decimal: (_) => /-?[0-9]+\.[0-9]+([eE][+-]?[0-9]+)?dec/,

    duration: ($) => repeat1($.duration_part),
    duration_part: (_) => /[0-9]+\s*(ns|us|µs|ms|s|m|h|d|w|y)/,

    point: ($) => seq("(", $.decimal, ",", $.decimal, ")"),

    // ─── Identifiers ───

    variable_name: (_) => /\$[a-zA-Z_][a-zA-Z0-9_]*/,
    identifier: (_) => token(prec(-1, /[a-zA-Z_][a-zA-Z0-9_]*/)),
    field_path: ($) => seq($.identifier, repeat(seq(".", $.identifier))),
    custom_function_name: (_) => /fn(::[a-zA-Z_][a-zA-Z0-9_]*)*/,
    function_name: (_) => /[a-zA-Z_][a-zA-Z0-9_]*(::[a-zA-Z_][a-zA-Z0-9_]*)+/,

    // ─── Structures ───

    array: ($) => seq("[", optional(csv_trailing($.value)), "]"),
    object: ($) => seq("{", optional(csv_trailing($.object_property)), "}"),
    object_property: ($) => seq(choice($.object_key, $.string), ":", $.value),
    object_key: (_) => token(prec(-1, /[a-zA-Z_][a-zA-Z0-9_]*/)),

    record_id: ($) =>
      prec.left(
        seq($.object_key, ":", choice($.record_id_value, $.record_id_range)),
      ),
    record_id_value: ($) => choice(/[a-zA-Z0-9_]+/, $.int, $.array, $.object),
    record_id_range: ($) =>
      prec.right(
        3,
        choice(
          seq($.record_id_value, "..", optional(seq("=", $.record_id_value))),
          seq("..", optional(seq("=", $.record_id_value))),
          "..",
        ),
      ),

    // pipe-separated identifiers for record<user | post>
    csv_or: ($) => seq($.identifier, repeat(seq("|", $.identifier))),

    // ─── Keywords (named rules for tree-sitter query matching) ───
    keyword_select: (_) => kw_re("SELECT"),
    keyword_from: (_) => kw_re("FROM"),
    keyword_only: (_) => kw_re("ONLY"),
    keyword_value: (_) => kw_re("VALUE"),
    keyword_as: (_) => kw_re("AS"),
    keyword_omit: (_) => kw_re("OMIT"),
    keyword_explain: (_) => kw_re("EXPLAIN"),
    keyword_full: (_) => kw_re("FULL"),
    keyword_parallel: (_) => kw_re("PARALLEL"),
    keyword_timeout: (_) => kw_re("TIMEOUT"),
    keyword_fetch: (_) => kw_re("FETCH"),
    keyword_limit: (_) => kw_re("LIMIT"),
    keyword_by: (_) => kw_re("BY"),
    keyword_rand: (_) => kw_re("RAND"),
    keyword_collate: (_) => kw_re("COLLATE"),
    keyword_numeric: (_) => kw_re("NUMERIC"),
    keyword_asc: (_) => kw_re("ASC"),
    keyword_desc: (_) => kw_re("DESC"),
    keyword_order: (_) => kw_re("ORDER"),
    keyword_with: (_) => kw_re("WITH"),
    keyword_index: (_) => kw_re("INDEX"),
    keyword_where: (_) => kw_re("WHERE"),
    keyword_split: (_) => kw_re("SPLIT"),
    keyword_at: (_) => kw_re("AT"),
    keyword_group: (_) => kw_re("GROUP"),
    keyword_begin: (_) => kw_re("BEGIN"),
    keyword_cancel: (_) => kw_re("CANCEL"),
    keyword_commit: (_) => kw_re("COMMIT"),
    keyword_transaction: (_) => kw_re("TRANSACTION"),
    keyword_and: (_) => kw_re("AND"),
    keyword_or: (_) => kw_re("OR"),
    keyword_is: (_) => kw_re("IS"),
    keyword_not: (_) => kw_re("NOT"),
    keyword_contains: (_) => kw_re("CONTAINS"),
    keyword_containsnot: (_) => kw_re("CONTAINSNOT"),
    keyword_containsall: (_) => kw_re("CONTAINSALL"),
    keyword_containsany: (_) => kw_re("CONTAINSANY"),
    keyword_containsnone: ($) => kw_re("CONTAINSNONE"),
    keyword_inside: (_) => kw_re("INSIDE"),
    keyword_in: (_) => kw_re("IN"),
    keyword_notinside: (_) => kw_re("NOTINSIDE"),
    keyword_allinside: (_) => kw_re("ALLINSIDE"),
    keyword_anyinside: (_) => kw_re("ANYINSIDE"),
    keyword_noneinside: (_) => kw_re("NONEINSIDE"),
    keyword_outside: (_) => kw_re("OUTSIDE"),
    keyword_intersects: (_) => kw_re("INTERSECTS"),
    keyword_chebyshev: (_) => kw_re("CHEBYSHEV"),
    keyword_cosine: (_) => kw_re("COSINE"),
    keyword_euclidean: (_) => kw_re("EUCLIDEAN"),
    keyword_hamming: (_) => kw_re("HAMMING"),
    keyword_jaccard: (_) => kw_re("JACCARD"),
    keyword_manhattan: (_) => kw_re("MANHATTAN"),
    keyword_minkowski: (_) => kw_re("MINKOWSKI"),
    keyword_pearson: (_) => kw_re("PEARSON"),
    keyword_define: (_) => kw_re("DEFINE"),
    keyword_overwrite: (_) => kw_re("OVERWRITE"),
    keyword_analyzer: (_) => kw_re("ANALYZER"),
    keyword_event: (_) => kw_re("EVENT"),
    keyword_field: (_) => kw_re("FIELD"),
    keyword_function: (_) => kw_re("FUNCTION"),
    keyword_namespace: (_) => kw_re("NAMESPACE"),
    keyword_param: (_) => kw_re("PARAM"),
    keyword_drop: (_) => kw_re("DROP"),
    keyword_schemafull: (_) => kw_re("SCHEMAFULL"),
    keyword_schemaless: (_) => kw_re("SCHEMALESS"),
    keyword_live: (_) => kw_re("LIVE"),
    keyword_diff: (_) => kw_re("DIFF"),
    keyword_flexible: (_) => kw_re("FLEXIBLE"),
    keyword_readonly: (_) => kw_re("READONLY"),
    keyword_jwks: (_) => kw_re("JWKS"),
    keyword_bm25: (_) => kw_re("BM25"),
    keyword_doc_ids_cache: (_) => kw_re("DOC_IDS_CACHE"),
    keyword_doc_ids_order: (_) => kw_re("DOC_IDS_ORDER"),
    keyword_doc_lengths_cache: (_) => kw_re("DOC_LENGTHS_CACHE"),
    keyword_doc_lengths_order: (_) => kw_re("DOC_LENGTHS_ORDER"),
    keyword_postings_cache: (_) => kw_re("POSTINGS_CACHE"),
    keyword_postings_order: (_) => kw_re("POSTINGS_ORDER"),
    keyword_terms_cache: (_) => kw_re("TERMS_CACHE"),
    keyword_terms_order: (_) => kw_re("TERMS_ORDER"),
    keyword_highlights: (_) => kw_re("HIGHLIGHTS"),
    keyword_any: (_) => kw_re("ANY"),
    keyword_normal: (_) => kw_re("NORMAL"),
    keyword_relation: (_) => kw_re("RELATION"),
    keyword_out: (_) => kw_re("OUT"),
    keyword_to: (_) => kw_re("TO"),
    keyword_changefeed: (_) => kw_re("CHANGEFEED"),
    keyword_include: (_) => kw_re("INCLUDE"),
    keyword_original: (_) => kw_re("ORIGINAL"),
    keyword_content: (_) => kw_re("CONTENT"),
    keyword_merge: (_) => kw_re("MERGE"),
    keyword_patch: (_) => kw_re("PATCH"),
    keyword_before: (_) => kw_re("BEFORE"),
    keyword_after: (_) => kw_re("AFTER"),
    keyword_table: (_) => kw_re("TABLE"),
    keyword_root: (_) => kw_re("ROOT"),
    keyword_use: (_) => kw_re("USE"),
    keyword_ns: (_) => kw_re("NS"),
    keyword_db: (_) => kw_re("DB"),
    keyword_on: (_) => kw_re("ON"),
    keyword_user: (_) => kw_re("USER"),
    keyword_roles: (_) => kw_re("ROLES"),
    keyword_remove: (_) => kw_re("REMOVE"),
    keyword_create: (_) => kw_re("CREATE"),
    keyword_delete: (_) => kw_re("DELETE"),
    keyword_update: (_) => kw_re("UPDATE"),
    keyword_insert: (_) => kw_re("INSERT"),
    keyword_into: (_) => kw_re("INTO"),
    keyword_tokenizers: (_) => kw_re("TOKENIZERS"),
    keyword_filters: (_) => kw_re("FILTERS"),
    keyword_when: (_) => kw_re("WHEN"),
    keyword_then: (_) => kw_re("THEN"),
    keyword_type: (_) => kw_re("TYPE"),
    keyword_default: (_) => kw_re("DEFAULT"),
    keyword_assert: (_) => kw_re("ASSERT"),
    keyword_permissions: (_) => kw_re("PERMISSIONS"),
    keyword_relate: (_) => kw_re("RELATE"),
    keyword_ignore: (_) => kw_re("IGNORE"),
    keyword_values: (_) => kw_re("VALUES"),
    keyword_for: (_) => kw_re("FOR"),
    keyword_info: (_) => kw_re("INFO"),
    keyword_show: (_) => kw_re("SHOW"),
    keyword_changes: (_) => kw_re("CHANGES"),
    keyword_since: (_) => kw_re("SINCE"),
    keyword_comment: (_) => kw_re("COMMENT"),
    keyword_fields: (_) => kw_re("FIELDS"),
    keyword_columns: (_) => kw_re("COLUMNS"),
    keyword_unique: (_) => kw_re("UNIQUE"),
    keyword_search: (_) => kw_re("SEARCH"),
    keyword_session: (_) => kw_re("SESSION"),
    keyword_signin: (_) => kw_re("SIGNIN"),
    keyword_signup: (_) => kw_re("SIGNUP"),
    keyword_if: (_) => kw_re("IF"),
    keyword_else: (_) => kw_re("ELSE"),
    keyword_exists: (_) => kw_re("EXISTS"),
    keyword_database: (_) => kw_re("DATABASE"),
    keyword_password: (_) => kw_re("PASSWORD"),
    keyword_passhash: (_) => kw_re("PASSHASH"),
    keyword_duplicate: (_) => kw_re("DUPLICATE"),
    keyword_token: (_) => kw_re("TOKEN"),
    keyword_count: (_) => kw_re("COUNT"),
    keyword_set: (_) => kw_re("SET"),
    keyword_return: (_) => kw_re("RETURN"),
    keyword_let: (_) => kw_re("LET"),
    keyword_throw: (_) => kw_re("THROW"),
    keyword_unset: (_) => kw_re("UNSET"),
    keyword_always: (_) => kw_re("ALWAYS"),
    keyword_alter: (_) => kw_re("ALTER"),
    keyword_break: (_) => kw_re("BREAK"),
    keyword_continue: (_) => kw_re("CONTINUE"),
    keyword_sleep: (_) => kw_re("SLEEP"),
    keyword_kill: (_) => kw_re("KILL"),
    keyword_mtree: (_) => kw_re("MTREE"),
    keyword_dimension: (_) => kw_re("DIMENSION"),
    keyword_dist: (_) => kw_re("DIST"),
    keyword_efc: (_) => kw_re("EFC"),
    keyword_m: (_) => kw_re("M"),
    keyword_capacity: (_) => kw_re("CAPACITY"),
    keyword_hnsw: (_) => kw_re("HNSW"),
    keyword_owner: (_) => kw_re("OWNER"),
    keyword_editor: (_) => kw_re("EDITOR"),
    keyword_viewer: (_) => kw_re("VIEWER"),
    keyword_duration: (_) => kw_re("DURATION"),
    keyword_enforced: (_) => kw_re("ENFORCED"),
    keyword_algorithm: (_) => kw_re("ALGORITHM"),
    keyword_key: (_) => kw_re("KEY"),
    keyword_url: (_) => kw_re("URL"),
    keyword_jwt: (_) => kw_re("JWT"),
    keyword_record: (_) => kw_re("RECORD"),
    keyword_bearer: (_) => kw_re("BEARER"),
    keyword_authenticate: (_) => kw_re("AUTHENTICATE"),
    keyword_grant: (_) => kw_re("GRANT"),
    keyword_access: (_) => kw_re("ACCESS"),
    keyword_upsert: (_) => kw_re("UPSERT"),
    keyword_none: ($) => kw_re("NONE"),
    keyword_null: ($) => kw_re("NULL"),
    keyword_true: (_) => kw_re("TRUE"),
    keyword_false: (_) => kw_re("FALSE"),
  },
});

// ─── Grammar Helpers ───

/// Case-insensitive keyword token (lexer priority over identifier).
function kw_re(word) {
  if (word.includes(" ")) {
    return seq(...word.split(" ").map((w) => kw_re(w)));
  }
  const re = new RegExp(
    [...word].map((c) => `[${c.toLowerCase()}${c.toUpperCase()}]`).join(""),
  );
  return token(prec(1, re));
}

// kw() is no longer used — all grammar rules reference $.keyword_* directly.
// Kept for documentation only.

function csv(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function csv_trailing(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

function csv_or(rule) {
  return seq(rule, repeat(seq("|", rule)));
}
