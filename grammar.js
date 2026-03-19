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
        optional(kw("PARALLEL")),
        optional($.explain_clause),
      ),

    select_clause: ($) =>
      seq(kw("SELECT"), choice(seq(kw("VALUE"), $.field), csv($.field_alias))),

    field_alias: ($) => seq($.field, optional(seq(kw("AS"), $.identifier))),
    field: ($) => choice("*", $.value),
    omit_clause: ($) => seq(kw("OMIT"), csv($.identifier)),

    from_clause: ($) => seq(kw("FROM"), optional(kw("ONLY")), csv($.value)),

    create_statement: ($) =>
      seq(
        kw("CREATE"),
        optional(kw("ONLY")),
        csv($.value),
        optional(choice($.content_clause, $.set_clause)),
        optional($.return_clause),
        optional($.timeout_clause),
        optional(kw("PARALLEL")),
      ),

    update_statement: ($) =>
      seq(
        kw("UPDATE"),
        optional(kw("ONLY")),
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
        optional(kw("PARALLEL")),
      ),

    upsert_statement: ($) =>
      seq(
        kw("UPSERT"),
        optional(kw("ONLY")),
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
        optional(kw("PARALLEL")),
      ),

    delete_statement: ($) =>
      seq(
        kw("DELETE"),
        optional(kw("ONLY")),
        csv($.value),
        optional($.where_clause),
        optional($.return_clause),
        optional($.timeout_clause),
        optional(kw("PARALLEL")),
      ),

    insert_statement: ($) =>
      seq(
        kw("INSERT"),
        optional(kw("IGNORE")),
        kw("INTO"),
        $.identifier,
        choice(
          $.object,
          seq("[", csv($.object), "]"),
          seq(
            "(",
            csv($.identifier),
            ")",
            kw("VALUES"),
            csv(seq("(", csv($.value), ")")),
            optional(
              seq(kw("ON DUPLICATE KEY UPDATE"), csv($.field_assignment)),
            ),
          ),
        ),
      ),

    relate_statement: ($) =>
      seq(
        kw("RELATE"),
        optional(kw("ONLY")),
        $.relate_subject,
        "->",
        $.relate_subject,
        "->",
        $.relate_subject,
        optional(choice($.content_clause, $.set_clause)),
        optional($.return_clause),
        optional($.timeout_clause),
        optional(kw("PARALLEL")),
      ),

    relate_subject: ($) => choice($.base_value, $.sub_query, $.function_call),

    // ─── DDL Statements (SurrealDB 3+) ───

    define_statement: ($) =>
      seq(
        kw("DEFINE"),
        optional(choice(kw("OVERWRITE"), $.if_not_exists)),
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
      seq(kw("NAMESPACE"), $.identifier, optional($.comment_clause)),

    define_database: ($) =>
      seq(kw("DATABASE"), $.identifier, optional($.comment_clause)),

    define_table: ($) =>
      seq(
        kw("TABLE"),
        $.identifier,
        repeat(
          choice(
            kw("DROP"),
            kw("SCHEMAFULL"),
            kw("SCHEMALESS"),
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
        kw("FIELD"),
        optional($.if_not_exists),
        $.field_path,
        kw("ON"),
        optional(kw("TABLE")),
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
        kw("INDEX"),
        $.identifier,
        kw("ON"),
        optional(kw("TABLE")),
        $.identifier,
        $.fields_columns_clause,
        repeat(
          choice(
            kw("UNIQUE"),
            $.search_analyzer_clause,
            $.mtree_clause,
            $.hnsw_clause,
            $.comment_clause,
          ),
        ),
      ),

    define_analyzer: ($) =>
      seq(
        kw("ANALYZER"),
        $.identifier,
        repeat(choice($.tokenizers_clause, $.filters_clause, $.comment_clause)),
      ),

    define_function: ($) =>
      seq(
        kw("FUNCTION"),
        $.custom_function_name,
        $.param_list,
        optional(seq("->", $.type)),
        $.block,
        repeat(choice($.permissions_basic_clause, $.comment_clause)),
      ),

    define_event: ($) =>
      seq(
        kw("EVENT"),
        $.identifier,
        kw("ON"),
        optional(kw("TABLE")),
        $.identifier,
        optional(seq(kw("WHEN"), $.value)),
        optional(kw("THEN")),
        choice($.block, $.sub_query),
        optional($.comment_clause),
      ),

    define_param: ($) =>
      seq(
        kw("PARAM"),
        $.variable_name,
        kw("VALUE"),
        $.value,
        optional($.permissions_basic_clause),
      ),

    define_access: ($) =>
      seq(
        kw("ACCESS"),
        $.identifier,
        kw("ON"),
        choice(kw("ROOT"), kw("NAMESPACE"), kw("DATABASE")),
        kw("TYPE"),
        choice(
          seq(kw("RECORD"), optional($.access_record_clauses)),
          seq(kw("JWT"), $.jwt_clauses),
          seq(
            kw("BEARER"),
            optional(seq(kw("FOR"), choice(kw("USER"), kw("RECORD")))),
          ),
        ),
        optional(seq(kw("AUTHENTICATE"), $.block)),
        optional($.duration_clause),
      ),

    access_record_clauses: ($) =>
      repeat1(
        choice(
          seq(kw("SIGNUP"), choice($.block, $.sub_query)),
          seq(kw("SIGNIN"), choice($.block, $.sub_query)),
          seq(kw("WITH"), kw("JWT"), $.jwt_clauses),
        ),
      ),

    jwt_clauses: ($) =>
      choice(
        seq(kw("ALGORITHM"), $.identifier, kw("KEY"), $.string),
        seq(kw("URL"), $.string),
        seq(kw("JWKS"), $.string),
      ),

    define_user: ($) =>
      seq(
        kw("USER"),
        $.identifier,
        kw("ON"),
        choice(kw("ROOT"), kw("NAMESPACE"), kw("DATABASE")),
        choice(seq(kw("PASSWORD"), $.string), seq(kw("PASSHASH"), $.string)),
        kw("ROLES"),
        choice(kw("OWNER"), kw("EDITOR"), kw("VIEWER")),
        optional($.duration_clause),
      ),

    remove_statement: ($) =>
      seq(
        kw("REMOVE"),
        choice(
          seq(kw("NAMESPACE"), optional($.if_exists), $.identifier),
          seq(kw("DATABASE"), optional($.if_exists), $.identifier),
          seq(kw("TABLE"), optional($.if_exists), $.identifier),
          seq(
            kw("FIELD"),
            optional($.if_exists),
            $.field_path,
            kw("ON"),
            optional(kw("TABLE")),
            $.identifier,
          ),
          seq(
            kw("INDEX"),
            optional($.if_exists),
            $.identifier,
            kw("ON"),
            optional(kw("TABLE")),
            $.identifier,
          ),
          seq(kw("ANALYZER"), optional($.if_exists), $.identifier),
          seq(kw("FUNCTION"), optional($.if_exists), $.custom_function_name),
          seq(
            kw("EVENT"),
            optional($.if_exists),
            $.identifier,
            kw("ON"),
            optional(kw("TABLE")),
            $.identifier,
          ),
          seq(kw("PARAM"), optional($.if_exists), $.variable_name),
          seq(
            kw("ACCESS"),
            optional($.if_exists),
            $.identifier,
            kw("ON"),
            choice(kw("ROOT"), kw("NAMESPACE"), kw("DATABASE")),
          ),
          seq(
            kw("USER"),
            optional($.if_exists),
            $.identifier,
            kw("ON"),
            choice(kw("ROOT"), kw("NAMESPACE"), kw("DATABASE")),
          ),
        ),
      ),

    alter_statement: ($) =>
      seq(
        kw("ALTER"),
        kw("TABLE"),
        optional($.if_exists),
        $.identifier,
        repeat(
          choice(
            kw("DROP"),
            kw("SCHEMAFULL"),
            kw("SCHEMALESS"),
            $.permissions_clause,
            $.comment_clause,
          ),
        ),
      ),

    // ─── Control Flow ───

    let_statement: ($) => seq(kw("LET"), $.variable_name, "=", $.value),
    if_statement: ($) =>
      seq(
        kw("IF"),
        $.value,
        $.block,
        repeat(seq(kw("ELSE"), kw("IF"), $.value, $.block)),
        optional(seq(kw("ELSE"), $.block)),
      ),
    for_statement: ($) =>
      seq(kw("FOR"), $.variable_name, kw("IN"), $.value, $.block),
    return_statement: ($) => seq(kw("RETURN"), $.value),
    throw_statement: ($) => seq(kw("THROW"), $.value),
    break_statement: (_) => kw("BREAK"),
    continue_statement: (_) => kw("CONTINUE"),

    // ─── Transaction ───

    begin_statement: ($) => seq(kw("BEGIN"), optional(kw("TRANSACTION"))),
    commit_statement: ($) => seq(kw("COMMIT"), optional(kw("TRANSACTION"))),
    cancel_statement: ($) => seq(kw("CANCEL"), optional(kw("TRANSACTION"))),

    // ─── Other Statements ───

    use_statement: ($) =>
      seq(
        kw("USE"),
        choice($.ns_clause, $.db_clause, seq($.ns_clause, $.db_clause)),
      ),
    ns_clause: ($) => seq(kw("NS"), $.identifier),
    db_clause: ($) => seq(kw("DB"), $.identifier),

    info_statement: ($) =>
      seq(
        kw("INFO"),
        kw("FOR"),
        choice(
          kw("ROOT"),
          choice(kw("NS"), kw("NAMESPACE")),
          choice(kw("DB"), kw("DATABASE")),
          seq(kw("TABLE"), $.identifier),
          seq(
            kw("USER"),
            $.identifier,
            optional(
              seq(
                kw("ON"),
                choice(kw("ROOT"), kw("NAMESPACE"), kw("DATABASE")),
              ),
            ),
          ),
        ),
      ),

    show_statement: ($) =>
      seq(
        kw("SHOW"),
        kw("CHANGES"),
        kw("FOR"),
        kw("TABLE"),
        $.identifier,
        kw("SINCE"),
        $.value,
        optional($.limit_clause),
      ),

    live_statement: ($) => seq(kw("LIVE"), $.select_statement),
    kill_statement: ($) => seq(kw("KILL"), $.value),
    sleep_statement: ($) => seq(kw("SLEEP"), $.duration),

    // ─── Clauses ───

    where_clause: ($) => seq(kw("WHERE"), $.value),
    split_clause: ($) =>
      seq(kw("SPLIT"), optional(kw("AT")), csv($.identifier)),
    group_clause: ($) =>
      seq(kw("GROUP"), optional(kw("BY")), csv($.identifier)),
    order_clause: ($) =>
      seq(kw("ORDER"), optional(kw("BY")), csv($.order_criteria)),
    order_criteria: ($) =>
      seq(
        $.value,
        optional(choice(kw("RAND"), kw("COLLATE"), kw("NUMERIC"))),
        optional(choice(kw("ASC"), kw("DESC"))),
      ),
    limit_clause: ($) => seq(kw("LIMIT"), optional(kw("BY")), $.value),
    fetch_clause: ($) => seq(kw("FETCH"), csv($.identifier)),
    timeout_clause: ($) => seq(kw("TIMEOUT"), $.duration),
    explain_clause: ($) => seq(kw("EXPLAIN"), optional(kw("FULL"))),

    content_clause: ($) =>
      seq(kw("CONTENT"), choice($.object, $.variable_name)),
    set_clause: ($) => seq(kw("SET"), csv($.field_assignment)),
    unset_clause: ($) => seq(kw("UNSET"), csv($.identifier)),
    merge_clause: ($) => seq(kw("MERGE"), choice($.object, $.variable_name)),
    patch_clause: ($) => seq(kw("PATCH"), $.array),
    return_clause: ($) =>
      prec(
        2,
        seq(
          kw("RETURN"),
          choice(
            kw("BEFORE"),
            kw("AFTER"),
            kw("DIFF"),
            kw("NONE"),
            seq(optional(kw("VALUE")), csv($.value)),
          ),
        ),
      ),

    field_assignment: ($) =>
      seq($.field_path, choice("=", "+=", "-="), $.value),

    // DDL clauses
    table_type_clause: ($) =>
      seq(
        kw("TYPE"),
        choice(
          kw("ANY"),
          kw("NORMAL"),
          seq(
            kw("RELATION"),
            optional(
              seq(optional(choice(kw("IN"), kw("FROM"))), csv_or($.identifier)),
            ),
            optional(
              seq(optional(choice(kw("OUT"), kw("TO"))), csv_or($.identifier)),
            ),
            optional(kw("ENFORCED")),
          ),
        ),
      ),

    table_view_clause: ($) =>
      seq(
        kw("AS"),
        kw("SELECT"),
        csv($.field_alias),
        kw("FROM"),
        csv($.value),
        optional($.where_clause),
        optional($.group_clause),
      ),

    changefeed_clause: ($) =>
      seq(
        kw("CHANGEFEED"),
        $.duration,
        optional(seq(kw("INCLUDE"), kw("ORIGINAL"))),
      ),

    type_clause: ($) => seq(optional(kw("FLEXIBLE")), kw("TYPE"), $.type),
    default_clause: ($) => seq(kw("DEFAULT"), optional(kw("ALWAYS")), $.value),
    readonly_clause: (_) => kw("READONLY"),
    assert_clause: ($) => seq(kw("ASSERT"), $.value),

    permissions_clause: ($) =>
      seq(
        kw("PERMISSIONS"),
        choice(
          kw("NONE"),
          kw("FULL"),
          repeat1(
            seq(
              kw("FOR"),
              csv(
                choice(kw("SELECT"), kw("CREATE"), kw("UPDATE"), kw("DELETE")),
              ),
              choice($.where_clause, kw("NONE"), kw("FULL")),
            ),
          ),
        ),
      ),

    permissions_basic_clause: ($) =>
      seq(kw("PERMISSIONS"), choice(kw("NONE"), kw("FULL"), $.where_clause)),

    comment_clause: ($) => seq(kw("COMMENT"), $.string),

    fields_columns_clause: ($) =>
      seq(choice(kw("FIELDS"), kw("COLUMNS")), csv($.identifier)),

    tokenizers_clause: ($) =>
      seq(kw("TOKENIZERS"), csv(choice("blank", "camel", "class", "punct"))),
    filters_clause: ($) => seq(kw("FILTERS"), csv($.analyzer_filter)),
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
        kw("SEARCH"),
        kw("ANALYZER"),
        $.identifier,
        repeat(
          choice(
            seq(kw("BM25"), optional(seq("(", $.number, ",", $.number, ")"))),
            kw("HIGHLIGHTS"),
            seq(kw("DOC_IDS_CACHE"), $.int),
            seq(kw("DOC_IDS_ORDER"), $.int),
            seq(kw("DOC_LENGTHS_CACHE"), $.int),
            seq(kw("DOC_LENGTHS_ORDER"), $.int),
            seq(kw("POSTINGS_CACHE"), $.int),
            seq(kw("POSTINGS_ORDER"), $.int),
            seq(kw("TERMS_CACHE"), $.int),
            seq(kw("TERMS_ORDER"), $.int),
          ),
        ),
      ),

    mtree_clause: ($) =>
      seq(
        kw("MTREE"),
        kw("DIMENSION"),
        $.int,
        repeat(
          choice(
            seq(kw("TYPE"), $.type),
            seq(kw("DIST"), $.distance_value),
            seq(kw("CAPACITY"), $.int),
          ),
        ),
      ),

    hnsw_clause: ($) =>
      seq(
        kw("HNSW"),
        kw("DIMENSION"),
        $.int,
        repeat(
          choice(
            seq(kw("TYPE"), $.type),
            seq(kw("DIST"), $.distance_value),
            seq(kw("EFC"), $.int),
            seq(kw("M"), $.int),
          ),
        ),
      ),

    distance_value: ($) =>
      choice(
        kw("CHEBYSHEV"),
        kw("COSINE"),
        kw("EUCLIDEAN"),
        kw("HAMMING"),
        kw("JACCARD"),
        kw("MANHATTAN"),
        kw("PEARSON"),
        seq(kw("MINKOWSKI"), $.number),
      ),

    session_clause: ($) => seq(kw("SESSION"), $.duration),

    duration_clause: ($) =>
      seq(
        kw("DURATION"),
        csv(
          seq(
            kw("FOR"),
            choice(kw("GRANT"), kw("TOKEN"), kw("SESSION")),
            $.duration,
          ),
        ),
      ),

    param_list: ($) =>
      seq("(", optional(csv(seq($.variable_name, ":", $.type))), ")"),

    if_not_exists: (_) => seq(kw("IF"), kw("NOT"), kw("EXISTS")),
    if_exists: (_) => seq(kw("IF"), kw("EXISTS")),

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

    bool: (_) => choice(kw("TRUE"), kw("FALSE")),
    none: (_) => kw("NONE"),
    null: (_) => kw("NULL"),

    binary_expression: ($) => prec.left(1, seq($.value, $.operator, $.value)),
    unary_expression: ($) => prec(10, seq(choice("!", kw("NOT")), $.value)),
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
        optional(seq(kw("AS"), $.identifier)),
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
        seq(kw("COUNT"), $.argument_list),
        seq(
          choice($.function_name, $.custom_function_name, kw("RAND")),
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
    type_name: (_) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    literal_value: ($) => choice($.int, $.string, $.duration),

    // ─── Operators ───

    operator: ($) =>
      prec.left(
        choice(
          // Comparison
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
          kw("AND"),
          kw("OR"),
          kw("IS"),
          seq(kw("IS"), kw("NOT")),
          // Containment
          kw("CONTAINS"),
          kw("CONTAINSNOT"),
          kw("CONTAINSALL"),
          kw("CONTAINSANY"),
          kw("CONTAINSNONE"),
          kw("IN"),
          seq(kw("NOT"), kw("IN")),
          kw("INSIDE"),
          kw("NOTINSIDE"),
          kw("ALLINSIDE"),
          kw("ANYINSIDE"),
          kw("NONEINSIDE"),
          kw("OUTSIDE"),
          kw("INTERSECTS"),
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
    identifier: (_) => /[a-zA-Z_][a-zA-Z0-9_]*/,
    field_path: ($) => seq($.identifier, repeat(seq(".", $.identifier))),
    custom_function_name: (_) => /fn(::[a-zA-Z_][a-zA-Z0-9_]*)*/,
    function_name: (_) => /[a-zA-Z_][a-zA-Z0-9_]*(::[a-zA-Z_][a-zA-Z0-9_]*)*/,

    // ─── Structures ───

    array: ($) => seq("[", optional(csv_trailing($.value)), "]"),
    object: ($) => seq("{", optional(csv_trailing($.object_property)), "}"),
    object_property: ($) => seq(choice($.object_key, $.string), ":", $.value),
    object_key: (_) => /[a-zA-Z_][a-zA-Z0-9_]*/,

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
  },
});

// ─── Grammar Helpers ───

function kw(word) {
  if (word.includes(" ")) {
    return seq(...word.split(" ").map((w) => kw(w)));
  }
  return alias(
    new RegExp(
      [...word].map((c) => `[${c.toLowerCase()}${c.toUpperCase()}]`).join(""),
    ),
    "keyword_" + word.toLowerCase().replace(/ /g, "_"),
  );
}

function csv(rule) {
  return seq(rule, repeat(seq(",", rule)));
}

function csv_trailing(rule) {
  return seq(rule, repeat(seq(",", rule)), optional(","));
}

function csv_or(rule) {
  return seq(rule, repeat(seq("|", rule)));
}
