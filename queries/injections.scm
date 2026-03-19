; Inject SurrealQL highlighting into string literals inside surql macros in Rust files
; This requires the host editor to support language injection from extensions

; For surql_query!("SELECT ...", param1, param2)
; The first string argument is SurrealQL
((macro_invocation
  macro: (identifier) @_macro
  (token_tree
    (string_literal
      (string_content) @injection.content)))
  (#match? @_macro "^surql_(query|check)$")
  (#set! injection.language "surrealql"))

; For #[surql_function("fn::name")]
((attribute_item
  (attribute
    (identifier) @_attr
    arguments: (token_tree
      (string_literal
        (string_content) @injection.content))))
  (#match? @_attr "^surql_function$")
  (#set! injection.language "surrealql"))
