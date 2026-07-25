---
name: Dataverse Tables — Add Lookup / Relationship
description: >-
  Adds a lookup column on a child table pointing to a parent table, plus the
  matching EntityRelationship in Customizations.xml. Handles the lowercase
  logical-name target and the one-to-many relationship naming.
when_to_use: >-
  User says "add a lookup", "link table X to Y", "add a relationship", "parent/
  child tables", or wants one table to reference another.
argument-hint: "<child-PascalName> <parent-PascalName> <LookupColumnPascalName>"
arguments: [child, parent, lookup-column]
allowed-tools: Read Edit Grep
---

## Context

A lookup is **two** edits that must agree: a `<attribute><Type>lookup</Type>` on the child table's
`Entity.xml`, and a matching `<EntityRelationship>` in `Other/Customizations.xml`. The lookup attribute
alone does **not** create the relationship on import — a missing `<EntityRelationship>` means the column
appears with no working relationship. Both reference the **lowercase logical** target name
(`smkb_<prefix>_<parentlower>`), never the PascalCase schema name. The starter ships the relationship
pattern as a comment in [`Relationships.xml`](../../../Relationships.xml); this skill fills it in.
See the Tables [README](../../../README.md) lookup section and
[add-lookup-reference.md](add-lookup-reference.md) for the exact XML.

## Steps

1. Confirm both tables exist under `Entities/` and resolve their tokens (from the schema names): parent
   logical `smkb_<prefix>_<parentlower>`, child logical `smkb_<prefix>_<childlower>`, lookup column schema
   `smkb_<prefix>_<LookupColumnPascalName>` (logical lowercased).
2. **Child `Entity.xml`** — add the lookup `<attribute>` inside `<attributes>` (block in the reference).
   Its `<LookupTypes><LookupType>` and `<Name>`/`<LogicalName>` use the **lowercase** forms; `PhysicalName`
   is PascalCase. Set `<RequiredLevel>` (`none`/`required`).
3. **`Other/Customizations.xml`** — add an `<EntityRelationship>` (one-to-many parent→child) using the
   naming `smkb_<prefix>_<parentlower>_<childlower>` and the referencing/referenced attribute + navigation
   properties (block in the reference).
4. Verify the referencing attribute name in the relationship matches the lookup column's logical name
   exactly (case-sensitive grep):
   ```powershell
   Select-String -Path ".\Entities\*\Entity.xml",".\Other\Customizations.xml" -Pattern "smkb_<prefix>_<lookuplower>"
   ```
5. **PAUSE** — deploy is `/dvt-deploy`. Both tables must be in the same solution for the relationship to import cleanly.

## Error Handling

- **Column appears but no relationship / can't set the value:** the `<EntityRelationship>` is missing or its `ReferencingAttributeName` doesn't match the lookup column logical name.
- **Import error on the relationship:** the `<LookupType>`/referenced entity uses a PascalCase or wrong name — it must be the parent's **lowercase logical** name.
- **Very complex lookup (polymorphic, self-referential):** the README recommends creating it in the maker portal, then `pac solution export`/`unpack` to copy the correct XML back — safest for edge cases.

## Notes

- Lookups reference **lowercase logical** names on both sides. PascalCase only survives in `schemaName`/`PhysicalName`.
- Keep the relationship in `Customizations.xml`; it is **not** a `RootComponent` in `Solution.xml`.
- Full attribute + relationship XML: [add-lookup-reference.md](add-lookup-reference.md).
