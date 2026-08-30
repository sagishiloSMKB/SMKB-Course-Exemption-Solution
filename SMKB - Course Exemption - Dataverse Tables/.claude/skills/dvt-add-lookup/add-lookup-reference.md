# Add Lookup / Relationship — Reference

Example: child `smkb_evt_Session` gets a lookup `smkb_evt_CourseId` pointing to parent `smkb_evt_Course`.
Tokens: parent logical `smkb_evt_course`, child logical `smkb_evt_session`, lookup logical `smkb_evt_courseid`.

## 1. Lookup attribute — child `Entity.xml` (`<attributes>`)

```xml
<attribute PhysicalName="smkb_evt_CourseId">
  <Type>lookup</Type>
  <Name>smkb_evt_courseid</Name>
  <LogicalName>smkb_evt_courseid</LogicalName>
  <RequiredLevel>none</RequiredLevel>
  <DisplayMask>ValidForAdvancedFind|ValidForForm|ValidForGrid</DisplayMask>
  <ImeMode>auto</ImeMode>
  <ValidForUpdateApi>1</ValidForUpdateApi>
  <ValidForReadApi>1</ValidForReadApi>
  <ValidForCreateApi>1</ValidForCreateApi>
  <IsCustomField>1</IsCustomField>
  <IsAuditEnabled>1</IsAuditEnabled>
  <IsSecured>0</IsSecured>
  <IntroducedVersion>1.0</IntroducedVersion>
  <IsCustomizable>1</IsCustomizable>
  <IsRenameable>1</IsRenameable>
  <LookupStyle>single</LookupStyle>
  <LookupTypes>
    <LookupType>smkb_evt_course</LookupType>
  </LookupTypes>
  <displaynames>
    <displayname description="EVT - Course" languagecode="1033" />
  </displaynames>
</attribute>
```

- `PhysicalName` PascalCase; `<Name>`/`<LogicalName>`/`<LookupType>` **lowercase**.
- `description` display = `PREFIX - Name` (ASCII hyphen).

## 2. Relationship — `Other/Customizations.xml` (`<EntityRelationships>`)

One-to-many, parent (referenced) → child (referencing):

```xml
<EntityRelationship Name="smkb_evt_course_smkb_evt_session">
  <EntityRelationshipType>OneToMany</EntityRelationshipType>
  <IsCustomizable>1</IsCustomizable>
  <ReferencingEntityName>smkb_evt_session</ReferencingEntityName>
  <ReferencedEntityName>smkb_evt_course</ReferencedEntityName>
  <CascadeAssign>NoCascade</CascadeAssign>
  <CascadeDelete>RemoveLink</CascadeDelete>
  <CascadeReparent>NoCascade</CascadeReparent>
  <CascadeShare>NoCascade</CascadeShare>
  <CascadeUnshare>NoCascade</CascadeUnshare>
  <CascadeRollupView>NoCascade</CascadeRollupView>
  <ReferencingAttributeName>smkb_evt_courseid</ReferencingAttributeName>
  <RelationshipDescription></RelationshipDescription>
  <IsValidForAdvancedFind>1</IsValidForAdvancedFind>
  <ReferencedEntityNavigationPropertyName>smkb_evt_course_smkb_evt_session</ReferencedEntityNavigationPropertyName>
  <ReferencingEntityNavigationPropertyName>smkb_evt_courseid</ReferencingEntityNavigationPropertyName>
</EntityRelationship>
```

- `Name` = `<referencing>_<referenced>` — unique.
- `ReferencingAttributeName` **must equal** the lookup column's logical name (`smkb_evt_courseid`).
- All entity/attribute names here are the **lowercase logical** forms.

## Edge cases

For polymorphic, self-referential, or many-to-many relationships, create it in the maker portal, then
`pac solution export` + `pac solution unpack` and copy the generated XML back — safest for the fiddly cases.
