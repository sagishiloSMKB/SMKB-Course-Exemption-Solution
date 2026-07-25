# Flow Snippets — Copy-Paste Reference

Quick reference for the most common Power Automate JSON patterns used in SMKB solutions. Copy these snippets into your flow JSON files.

---

## 1. Environment Variable Parameters

Use the `metadata.schemaName` pattern to inject env var values at runtime. **Never use the `GetEnvironmentVariableValue` operationId** — it does not exist in the `commondataserviceforapps` connector.

Add inside `definition.parameters` (alongside `$authentication` and `$connections`):

```json
"ENVIRONMENT_NAME (smkb_sol_EnvironmentName)": {
  "defaultValue": "dev",
  "type": "String",
  "metadata": {
    "schemaName": "smkb_sol_EnvironmentName",
    "description": "Logical environment name (dev/stage/prod). Used to prefix email subjects in non-production environments."
  }
},
"ERROR_EMAILS (smkb_sol_FlowErrorEmails)": {
  "defaultValue": "",
  "type": "String",
  "metadata": {
    "schemaName": "smkb_sol_FlowErrorEmails",
    "description": "Semicolon-separated email addresses for flow error notifications."
  }
}
```

Reference in expressions:
```
@parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)')
@parameters('ERROR_EMAILS (smkb_sol_FlowErrorEmails)')
```

> **Type rules:** Use `String` (type code `100000000`) for email lists — semicolon-separated. Never use JSON type (`100000003`) for email lists; once deployed, the type cannot be changed by reimport.

---

## 2. connectionReferences Block

Every flow JSON must have a `properties.connectionReferences` block that maps **local keys** to environment-level **logical names**. This block goes at the top level of `properties`, before `definition`.

```json
"connectionReferences": {
  "shared_sharepointonline_pvch": {
    "runtimeSource": "embedded",
    "connection": {
      "connectionReferenceLogicalName": "smkb_SMKBSharePointConnectionUser1"
    },
    "api": { "name": "shared_sharepointonline" }
  },
  "shared_office365_pvch": {
    "runtimeSource": "embedded",
    "connection": {
      "connectionReferenceLogicalName": "new_sharedoffice365_c3167"
    },
    "api": { "name": "shared_office365" }
  }
}
```

**Two-name structure — critical distinction:**

| Name | Example | Where it appears | What it is |
|------|---------|-----------------|------------|
| **Local key** | `shared_office365_pvch` | This JSON file only — in every action's `connectionName` field | Arbitrary string; scope is this one JSON file |
| **Logical name** | `new_sharedoffice365_c3167` | `connectionReferenceLogicalName` in this block | Environment-level reference; must match what's deployed in Dataverse |

- `runtimeSource: "embedded"` is required — tells the runtime the reference is embedded in the solution
- Actions reference the **local key** in `connectionName` (never the logical name)
- The logical name connects this flow to the actual credentials in the environment

**Project reference table — logical names for ALL flows in this project:**

| Logical name | Display name | Connector | Used for |
|---|---|---|---|
| `smkb_SMKBSharePointConnectionUser1` | SMKB - SharePoint | `shared_sharepointonline` | All SharePoint list reads/writes |
| `new_sharedoffice365_c3167` | SMKB - Outlook | `shared_office365` | All email sending |

> If a new flow needs a connector not listed above (e.g. Dataverse, Excel Online), add a new `<connectionreference>` entry to `Other/Customizations.xml`. Do not create a new connection reference per flow — one per connector type.

---

## 3. CreateRecord — Dataverse Row Creation

The `item/` prefix is required for all field values. Even auto-number fields need a placeholder value — omitting them causes "required field missing" errors.

```json
"Create_record": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_[yourlocalkey]",
      "operationId": "CreateRecord",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "entityName": "sol_example_items",
      "item/sol_name": " ",
      "item/sol_status": 390411,
      "item/sol_submitted_date": "@utcNow()"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

Replace `shared_commondataserviceforapps_[yourlocalkey]` with the **local key** you defined in the flow's `connectionReferences` block (Snippet 2). The local key is not the logical name — see Snippet 2 for the distinction.

> **Auto-number fields:** If `sol_name` is an auto-number column, pass `" "` (a single space) as the value. Power Platform ignores the value and generates the auto-number, but the field must be present to avoid a validation error.

---

## 4. SendEmailV2 — Office 365 Outlook

```json
"Send_email": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_office365_[yourlocalkey]",
      "operationId": "SendEmailV2",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
    },
    "parameters": {
      "emailMessage/From": "[sol]NoReply@yourdomain.com",
      "emailMessage/To": "@triggerBody()?['recipient']",
      "emailMessage/Subject": "@if(equals(parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)'), 'prod'), 'Your subject here', concat('(', toUpper(parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)')), ') Your subject here'))",
      "emailMessage/Body": "<p>Email body HTML here.</p>",
      "emailMessage/Importance": "Normal"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

Replace `shared_office365_[yourlocalkey]` with the **local key** you defined in the flow's `connectionReferences` block (Snippet 2) — not the logical name. Replace `[sol]` with your solution short prefix.

---

## 5. Dataverse Row-Created Trigger

Use `OpenApiConnectionWebhook` with `SubscribeWebhookTrigger` to trigger a flow when a Dataverse row is created.

```json
"triggers": {
  "When_a_row_is_added": {
    "type": "OpenApiConnectionWebhook",
    "inputs": {
      "host": {
        "connectionName": "shared_commondataserviceforapps_[yourlocalkey]",
        "operationId": "SubscribeWebhookTrigger",
        "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
      },
      "parameters": {
        "subscriptionRequest/message": 1,
        "subscriptionRequest/entityname": "sol_example_items",
        "subscriptionRequest/scope": 4,
        "subscriptionRequest/filteringattributes": "sol_name"
      },
      "authentication": "@parameters('$authentication')"
    }
  }
}
```

Replace `shared_commondataserviceforapps_[yourlocalkey]` with the **local key** from the flow's `connectionReferences` block (Snippet 2).

`message` values: `1` = created, `2` = deleted, `3` = updated. `scope` `4` = organization-wide.

Reference the created row in expressions:
```
@triggerBody()?['sol_name']
@triggerBody()?['_ownerid_value']
```

---

## 6. PowerAppV2 Trigger — Power Apps Code App (Internal/Staff)

Use this trigger when the flow is called from a **Power Apps Code App** (internal or staff-facing interface).

**Trigger type decision:**

| Caller | Trigger kind | `pnpm pa` wired? | Notes |
|--------|-------------|------------------|-------|
| Power Apps Code App (internal) | `PowerAppV2` | Yes — via `pnpm pa add-flow` | Appears in `pnpm pa list-flows` |
| Power Pages portal (external) | `PowerPages` | Yes — see Snippet 7. Use PA designer format only. | Native Power Pages trigger; schema keys must follow PA designer naming convention |

```json
"triggers": {
  "manual": {
    "type": "Request",
    "kind": "PowerAppV2",
    "inputs": {
      "schema": {
        "type": "object",
        "required": ["id"],
        "properties": {
          "id": { "type": "integer", "description": "SP item ID" },
          "fieldName": { "type": "string" }
        }
      }
    }
  }
}
```

**Notes:**
- Use `kind: "PowerAppV2"` — not `"PowerApps"`. `pnpm pa list-flows` only detects `PowerAppV2`; if the Published definition has any other kind, the flow will not appear and cannot be registered via `pnpm pa add-flow`
- After deploying, run `pnpm pa add-flow --flow-id <Power Automate flow ID> --non-interactive` to register the flow in `power.config.json`
- If a flow previously had a different trigger kind, changing it and re-importing prints "The original workflow definition has been deactivated and replaced." — this is expected and correct; it confirms the Published definition was updated
- Access trigger fields in expressions: `@triggerBody()?['fieldName']`
- **Required-field 400 (no run history):** if a `required` trigger field arrives **missing, `null`, or the wrong type**, the PowerAppV2 endpoint rejects the call with **HTTP 400 at `.../triggers/manual/run` *before a run is created*** — so the flow shows **no run history** to inspect. This is a caller-side payload bug, not a flow-body bug. The usual cause is a key-name/casing mismatch between what the Code App sends and the trigger's declared property. Real case in this solution: the list flow emitted the SP id as lowercase `id` while the app read `row.ID` (uppercase), so `Number(undefined)` → `NaN` → serialized as `id: null` → 400 on update/delete (create worked because it sends no `id`). Debug by comparing the body the generated `<Flow>Service.Run(input)` actually sends against the trigger's `required`/`type` — not the flow logic. (This is the Code App analog of the Power Pages HTTP 200 + `errorCode` contract in Snippet 8; the two callers fail differently.)

---

## 7. Power Pages Trigger — Portal / External

Use this trigger when the flow is called from a **Power Pages** portal (public-facing or external sites). Power Pages has its own native trigger kind — do NOT use `kind: "Http"`.

> **Critical:** The schema format must exactly match what PA designer generates. Hand-written schema keys cause HTTP 500 errors with no run appearing in flow history. See Pitfall 9f.

### Single Text parameter (one input field)

```json
"triggers": {
  "manual": {
    "metadata": {
      "operationMetadataId": "f8e7d6c5-b4a3-4f21-8e9d-0c1b2a3d4e5f"
    },
    "type": "Request",
    "kind": "PowerPages",
    "inputs": {
      "schema": {
        "type": "object",
        "properties": {
          "text": {
            "title": "phone",
            "type": "string",
            "x-ms-dynamically-added": true,
            "description": "Please enter your input",
            "x-ms-content-hint": "TEXT"
          }
        },
        "required": ["text"]
      }
    }
  }
}
```

Access the value: `@triggerBody()?['text']`

### Two Text parameters (two input fields)

```json
"properties": {
  "text": {
    "title": "phone",
    "type": "string",
    "x-ms-dynamically-added": true,
    "description": "Please enter your input",
    "x-ms-content-hint": "TEXT"
  },
  "text_1": {
    "title": "otp",
    "type": "string",
    "x-ms-dynamically-added": true,
    "description": "Please enter your input",
    "x-ms-content-hint": "TEXT"
  }
},
"required": ["text", "text_1"]
```

Access values: `@triggerBody()?['text']` (phone), `@triggerBody()?['text_1']` (otp)

### PA designer schema key naming convention

| Input type | 1st key | 2nd key | 3rd key | `x-ms-content-hint` |
|-----------|---------|---------|---------|---------------------|
| Text | `"text"` | `"text_1"` | `"text_2"` | `"TEXT"` |
| Number | `"number"` | `"number_1"` | — | `"NUMBER"` |
| Boolean | `"boolean"` | `"boolean_1"` | — | `"BOOLEAN"` |

The schema property **key** is the type name assigned by PA designer. The **title** is the label the user gave the input (e.g., `"phone"`, `"otp"`). These are different:
- Portal sends `{ phone: "050..." }` — by **title**
- `triggerBody()` returns by **key**: `triggerBody()?['text']` = "050..."
- `triggerBody()?['phone']` returns **null** (title ≠ key)

The `operationMetadataId` is any UUID — use a fresh one per flow. Its presence is required; the value is not validated.

**How the portal calls the flow (from `cloudFlow.ts`):**
- Endpoint: `POST /_api/cloudflow/v1.0/trigger/<site-guid>`
- Body: `application/x-www-form-urlencoded` with `eventData=<JSON-stringified-params>`
- Headers: `__RequestVerificationToken` (CSRF token) + `x-requested-with: XMLHttpRequest`
- The site GUID is **not** the Dataverse workflow GUID — it is assigned when the flow is registered in Power Pages Studio

**How to register a flow in Power Pages Studio (manual, one-time per environment):**
1. Power Pages Studio → **Set up** → **Cloud flows** → **+ Add cloud flow**
2. Search for the flow by display name → select it
3. Under Roles, click **+ Add roles** → select **Anonymous Users** → Save
4. Copy the GUID from the URL shown: `/_api/cloudflow/v1.0/trigger/<guid>`
5. Paste the GUID into `SMKB - Lecturer Portal - Power Page/src/config/flows.ts`

> **Anonymous Users web role is correct here.** The portal uses OTP session auth (not Power Pages native auth). All access control is enforced inside each flow via session token lookup. All 13 portal flows use Anonymous Users.

**No CLI automation is available** — `pac pages` has no command for cloud flow binding. The Studio registration step is manual only. After ALM promotion to Stage/Prod, re-register in that environment's Studio and update `flows.ts` for that environment.

> **Re-deploys do NOT require re-registration.** Re-importing a flow with `deploy.ps1` /
> `pac solution import` into the **same** environment preserves its Power Pages binding — the
> registration is genuinely *one-time per environment*. This holds even when the trigger **schema**
> changes (adding/removing input properties, editing `required`): registered flows keep working across
> deploys with no re-registration and no manual turn-on. Re-registration is only needed for **first-time**
> setup in an environment (incl. ALM promotion to a new env). If a single flow *does* lose its binding on
> every deploy while the rest survive, that is flow-specific (e.g. a non-`embedded` connection) — do not
> generalize it into a "schema change breaks the binding" rule.

**Notes:**
- `connectionReferences` block is NOT required for `PowerPages`-triggered flows (no connector is needed for the trigger itself; connectors like SharePoint are still declared for actions inside the flow)
- Use this trigger for portal/public-facing flows; use PowerAppV2 (Snippet 6) for internal Code App flows

---

## 8. Response Contract + Error Handling Scaffold

### Response contract — Power Pages flows ALWAYS return HTTP 200

Power Pages **discards the body of any non-2xx flow response** and hands the caller a generic
`{ "ErrorCode": "00000006", "Message": "IncorrectPayload" }` envelope — so a 400/401/404/500
response cannot carry any business meaning to the portal. Therefore **every** `Response` action
(success AND error) must use `statusCode: 200`:

- **Success** → `200` with the data payload (e.g. `{ "vouchers": [...] }`, `{ "channels": [...] }`).
- **Business or technical error** → `200` with `{ "errorCode": "<CODE>" }` (plus optional fields,
  e.g. `attemptsRemaining`). Follow each error Response with `Terminate` (`runStatus: "Succeeded"`).

The portal client (`cloudFlow.ts`) reads `errorCode` from the 200 body and throws a typed
`FlowError`; the frontend maps the code to a user message. Non-2xx is treated only as a
transport/platform failure (generic error). Standard `errorCode` vocabulary: `INVALID_INPUT`,
`UNAUTHORIZED`, `NOT_FOUND`, `EXTERNAL_API_ERROR`, `ERROR` (technical), plus feature-specific
codes (`WRONG_OTP`, `RATE_LIMITED`, `EXPIRED`, `LOCKED`, `ACCOUNT_ARCHIVED`, `OTP_SEND_FAILED`).

Canonical business-error exit (inside `Main_Flow`):
```json
"Respond_not_found": {
  "type": "Response", "kind": "PowerPages",
  "inputs": {
    "statusCode": 200,
    "headers": { "Content-Type": "application/json" },
    "body": { "errorCode": "NOT_FOUND" }
  },
  "runAfter": {}
},
"Terminate_not_found": {
  "type": "Terminate",
  "inputs": { "runStatus": "Succeeded" },
  "runAfter": { "Respond_not_found": ["Succeeded"] }
}
```

### Scaffold — Main_Flow + Handle_Flow_Error

Standard two-scope structure used in all flows in this project. All business logic goes inside `Main_Flow`; `Handle_Flow_Error` catches only unexpected failures.

```json
"actions": {
  "Main_Flow": {
    "type": "Scope",
    "runAfter": {},
    "actions": {
      "Validate_Input": { },
      "Do_Work": { },
      "Respond_to_caller": {
        "type": "Response",
        "runAfter": { "Do_Work": ["Succeeded"] },
        "inputs": {
          "statusCode": 200,
          "headers": { "Content-Type": "application/json" },
          "body": { "status": "ok" }
        }
      }
    }
  },
  "Handle_Flow_Error": {
    "type": "Scope",
    "runAfter": { "Main_Flow": ["Failed", "TimedOut", "Skipped"] },
    "description": "Error handler — runs ONLY on unexpected failures in Main_Flow.",
    "actions": {
      "Check_Error_Emails_Configured": {
        "type": "If",
        "runAfter": {},
        "expression": {
          "not": { "equals": ["@trim(parameters('ERROR_EMAILS (smkb_sol_FlowErrorEmails)'))", ""] }
        },
        "actions": {
          "Send_error_notification": {
            "type": "OpenApiConnection",
            "runAfter": {},
            "inputs": {
              "host": {
                "connectionName": "shared_office365_[yourlocalkey]",
                "operationId": "SendEmailV2",
                "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
              },
              "parameters": {
                "emailMessage/From": "noreply@smkb.ac.il",
                "emailMessage/To": "@parameters('ERROR_EMAILS (smkb_sol_FlowErrorEmails)')",
                "emailMessage/Subject": "@concat('(', toUpper(parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)')), ') [ERROR] sol_flow_name failed')",
                "emailMessage/Body": "@concat('<p><strong>sol_flow_name</strong> failed in <strong>', parameters('ENVIRONMENT_NAME (smkb_sol_EnvironmentName)'), '</strong>.</p><p><strong>Run ID:</strong> ', workflow()['run']['name'], '</p>')",
                "emailMessage/Importance": "High"
              },
              "authentication": "@parameters('$authentication')"
            }
          }
        },
        "else": { "actions": {} }
      },
      "Respond_with_error": {
        "type": "Response",
        "runAfter": { "Check_Error_Emails_Configured": ["Succeeded", "Failed", "Skipped"] },
        "inputs": {
          "statusCode": 200,
          "headers": { "Content-Type": "application/json" },
          "body": { "errorCode": "ERROR" }
        }
      }
    }
  }
}
```

**Notes:**
- `Handle_Flow_Error` runs **only** when `Main_Flow` fails, times out, or is skipped — it does NOT run when business-logic early-exits (a `200` + `errorCode` Response followed by `Terminate`) happen inside `Main_Flow`. Those are controlled exits, not failures.
- Every Response — success, business error, and this technical `Respond_with_error` — uses `statusCode: 200` (see the Response contract above). A non-2xx status would be swallowed by Power Pages into a generic `00000006` envelope, so the caller could never read `errorCode`.
- `ERROR_EMAILS` is a `String` env var (semicolon-separated addresses) — pass directly to `emailMessage/To`. Do not use `json()` or `join()`.
- Replace `shared_office365_[yourlocalkey]` with the local key from the flow's `connectionReferences` block (Snippet 2).
- Replace `sol_flow_name` with the actual flow schema name (e.g. `smkb_pvch_SendLecturerInvite`).

---

## 9. Common Validation Pitfalls

These errors surface during flow save/import and prevent the flow from activating. All three were encountered in this project.

---

### 9a. Description limit — 256 characters max (actions AND the trigger)

The `description` field on any **action** OR the **trigger** in a flow JSON has a hard 256-character limit. This applies to BOTH — and they fail at different times:

**Action** description too long → fails immediately at solution import:

```
Flow save failed with code 'ActionDescriptionTooLong' and message
'The description for action 'X' exceeded the length limit: maximum '256' and actual 'NNN'.'
```

**Trigger** description too long is nastier — the solution **import SUCCEEDS** (the over-long value is stored), but the flow then **cannot be turned on**. Activation fails and the flow stays **deactivated (statecode 0)**:

```
Flow save failed with code 'TriggerDescriptionTooLong' and message
'The description for trigger 'manual' at line '1' and column 'NNNN' exceeded the length limit: maximum '256' and actual 'NNN'.'
```

So an over-long trigger description looks like a clean deploy but a flow that silently refuses to activate — easy to misdiagnose as the generic "flows land disabled after import" behavior (see also the project note on trigger-schema changes deactivating a flow). Always check the trigger `description`, not just actions.

**Rule:** Keep every `description` — actions and the trigger — short and factual, well under 256 chars. Put multi-sentence detail in the spec, not the flow JSON. Count characters before saving, e.g. PowerShell `"...".Length`. **`deploy.ps1` now enforces this** — it scans every `Workflows/*.json` and blocks the import if any `description` exceeds 256 chars, so an over-long trigger description is caught before deploy instead of at turn-on.

> **First thing to suspect when a flow imports cleanly but won't turn on:** an over-long **trigger** description (`TriggerDescriptionTooLong`). The "The original workflow definition has been deactivated and replaced." line that `pac solution import` prints is **benign and expected on every flow re-import** — it is NOT the cause. Don't conflate the two.

---

### 9b. `runAfter` must reference an action at the same nesting level

`runAfter` can only reference actions that are **siblings** — at the same nesting level inside the same parent scope. You cannot reference a parent-level action from inside a child scope (or vice versa).

**Wrong** — `Patch_Voucher_Bank_Snapshot` is inside `If_Update_Voucher_Snapshot`, but its `runAfter` references `Patch_Bank_Fields_Approved` which is at the parent scope level:

```json
"If_Update_Voucher_Snapshot": {
  "type": "If",
  "runAfter": { "Patch_Bank_Fields_Approved": ["Succeeded"] },  // ← correct (parent can reference sibling)
  "actions": {
    "Patch_Voucher_Bank_Snapshot": {
      "runAfter": { "Patch_Bank_Fields_Approved": ["Succeeded"] }  // ← WRONG: cross-level reference
    }
  }
}
```

**Correct** — if it's the first action in its scope, use `"runAfter": {}`:

```json
"If_Update_Voucher_Snapshot": {
  "type": "If",
  "runAfter": { "Patch_Bank_Fields_Approved": ["Succeeded"] },
  "actions": {
    "Patch_Voucher_Bank_Snapshot": {
      "runAfter": {}  // ← first action in this scope; the scope itself controls ordering
    }
  }
}
```

Error message:
```
The 'runAfter' property of template action 'X' is not valid:
the action 'Y' must belong to same level as action 'X'. Available actions on same level: ''.
```

---

### 9c. Do not use `shared_powerautomate` (RunFlow) in solution flows

The `shared_powerautomate` connector (`runtimeSource: "invoker"`) is used to call child flows via `RunFlow`. It requires the caller to authenticate interactively — it is **not valid inside solution flows** (which run as a service account, not an interactive user).

Symptoms:
- The connection reference block uses `"runtimeSource": "invoker"` instead of `"embedded"`
- On import, the connection ID is invalid: `subscriptions/.../apis/powerautomate/connections/`
- Error: `'The 'id' property '...' under 'properties.connectionReferences.shared_powerautomate_pvch.connection' is not valid.'`

**Rule:** Do not add `shared_powerautomate` to any flow's `connectionReferences`. If you need to call another flow as a child, either:
1. Merge the child flow's logic directly into the parent flow
2. Use HTTP with a stored URL (not recommended for internal flows)
3. Use Dataverse table state + a separate scheduled flow

If child flow `Run_Child_Flow_*` actions have placeholder GUIDs (e.g. `[IMPLEMENT: GUID of ...]`), remove them and remove the `shared_powerautomate` connection reference block entirely. The flow can be deployed without the child flow calls and the logic added later once the child flows have real GUIDs.

---

### 9d. Do not use `shared_approvals` (Approvals connector) without an embedded connection reference

The Power Automate Approvals connector (`shared_approvals`) requires an embedded connection reference with a valid logical name — just like SharePoint or Office 365. Using `runtimeSource: "invoker"` (which Power Automate sometimes suggests in the designer) is invalid for solution flows.

Symptoms:
- Error: `'The 'id' property '...' under 'properties.connectionReferences.shared_approvals_pvch.connection' is not valid.'`
- The connection reference block has `"runtimeSource": "invoker"` and `"connection": {}`

**Rule:** If the Approvals connector is not yet provisioned with a real embedded connection reference logical name, remove the `shared_approvals_pvch` connection reference block and all `StartAndWaitForAnApproval` actions. The approval feature can be added back later once the Approvals connection reference is set up in the environment.

---

### 9e. `InitializeVariable` cannot be nested inside a Scope

Power Automate does not allow `InitializeVariable` actions inside a `Scope` action (or any parent action). They must be placed at the top level of the flow's `actions` object — as siblings of `Main_Flow`, not children.

Error:
```
Flow save failed with code 'InvalidVariableInitialization' and message
'The variable action 'Initialize_Var_X' of type 'InitializeVariable' cannot be nested in an action of type 'Main_Flow'.'
```

**Fix:** Move all `InitializeVariable` actions to the top-level `actions` block (before `Main_Flow`). Update `Main_Flow.runAfter` to depend on the last `InitializeVariable`. Update the first action inside `Main_Flow` that previously depended on a variable initializer to depend on whatever precedes it in the business logic instead.

Variables declared at the top level are accessible inside any Scope (including `Main_Flow`) via `SetVariable`, `AppendToStringVariable`, and `variables('name')` expressions — the scope boundary does not restrict variable access, only variable *initialization*.

---

### 9f. Power Pages trigger: schema property keys must match PA designer format

**Symptom:** Portal calls to a Power Pages flow return HTTP 500. No run entry appears in Power Automate run history. The flow was recently hand-edited.

**Cause:** Power Pages validates the trigger schema strictly. Any of the following cause a silent 500 with no run logged:
- Schema property keys are hand-written (e.g., `"phone"`, `"authToken"`, `"someParam"`) instead of using PA designer type names
- The `required` array references a title instead of a schema key (e.g., `"phone"` instead of `"text"`)
- `metadata.operationMetadataId` is absent from the trigger

**The rule:** Schema property keys must be the PA designer type names, not the user-visible input labels. When PA designer adds a Text input labelled "phone", it generates key `"text"` — not `"phone"`. The key is always the type name; the title is the label.

Wrong — custom key causes 500:
```json
"properties": {
  "phone": { "type": "string" }
},
"required": ["phone"]
```

Correct — PA designer format:
```json
"properties": {
  "text": {
    "title": "phone",
    "type": "string",
    "x-ms-dynamically-added": true,
    "description": "Please enter your input",
    "x-ms-content-hint": "TEXT"
  }
},
"required": ["text"]
```

**Diagnostic:** If portal calls return 500 and the flow run history is empty, the schema keys are the issue. The portal rejects the trigger before the flow even starts.

**Fix:** Open the trigger in PA designer's Code view — it shows the authoritative format with the correct keys, `operationMetadataId`, and `x-ms-dynamically-added` fields. Copy the trigger block from there; never hand-write schema property keys for Power Pages triggers.

**Body accessor:** `triggerBody()?['text']` returns the value the portal sent as `{ phone: "..." }`. The `triggerBody()?['phone']` expression returns null — it reads by schema key, not by title.

---

### 9g. Power Pages flows must use `embedded` connections — `invoker` → recurring 403 on every deploy

**Symptom:** One portal flow returns HTTP **403** from `/_api/cloudflow/v1.0/trigger/<guid>` after **every** flows deploy, while all other portal flows keep working untouched. Removing + re-adding it in Power Pages Studio fixes it immediately — until the next deploy.

**Cause:** A Power-Pages-triggered flow (`kind: PowerPages`) is invoked **anonymously** — there is no signed-in user, so every connection reference must run as the flow's embedded service connection. A connection with `"runtimeSource": "invoker"` has no identity to run as for an anonymous portal call, so Power Pages refuses to invoke the flow → 403. Studio re-registration re-saves the flow and forces the connection to `embedded` (that's why the manual re-add "fixes" it), but the next `pac solution import` reverts it to `invoker`.

**The rule:** every connection reference in a Power Pages flow JSON must be `"runtimeSource": "embedded"`. Grep the flow for `"runtimeSource": "invoker"` — there should be zero matches.

```json
"shared_approvals": {
  "runtimeSource": "embedded",   // NOT "invoker"
  "connection": { "connectionReferenceLogicalName": "smkb_SMKBApprovals" },
  "api": { "name": "shared_approvals" }
}
```

**No logic change from the switch:** `runtimeSource` only chooses which connection (identity) the action runs under. It does NOT change who an Approvals action is assigned to (that's the action's "Assigned to" input). For an anonymous portal call the service-account connection is the only identity that can run anyway, so `embedded` is both correct and the only workable value.

Confirmed 2026-06-25 on `smkb_pvch_UpdateBankAccount` — its Approvals connection was `invoker`; flipping it to `embedded` ended the per-deploy 403 (a deploy no longer breaks the binding).

---

## 10. Clearing Fields — Use `@null`, Never Bare JSON `null`

To clear a column value in a connector action (SharePoint `PatchItem`, Dataverse update, etc.), the parameter value must evaluate to null. There are two ways to write that in flow JSON — only one of them survives the Power Automate designer.

**The rule:** always write nulls as the workflow expression `"@null"`, never as a bare JSON `null`.

Wrong — runtime works, but the designer breaks:
```json
"parameters": {
  "item/otpCode": null,
  "item/otpExpiresAt": null
}
```

Correct — identical runtime behavior, designer-safe:
```json
"parameters": {
  "item/otpCode": "@null",
  "item/otpExpiresAt": "@null"
}
```

**The logic:** both forms evaluate to null at runtime and clear the column. The difference is how the designer renders them. A bare JSON `null` renders as an *empty input box*; for typed columns (datetime, number, choice) the designer validates the empty box against the column type and blocks saving the **entire flow** with errors like "Enter a valid datetime". The `"@null"` expression renders as an `fx` chip, which the designer accepts without complaint.

**Why this matters:** sometimes you must save a flow from the designer — for example, a designer save is what forces the SharePoint connector to refresh its cached column schema after a column's type changes (a CLI `pac solution import` does not refresh it). If any action in the flow contains a bare JSON `null` on a typed column, that save is blocked and the schema refresh can't happen.

**Diagnostic:** flow runs fine when deployed via CLI, but the designer shows a validation error on an *empty* field of a Patch/Update action and refuses to save — look for bare `null` values in that action's parameters in the JSON.

---

## 11. Reading a Secret (Azure Key Vault) environment variable in a flow

Environment variables of type **Secret** (`<type>100000005</type>`, secret store = Azure Key Vault) **cannot** be read with the normal env-var parameter mechanism. If you declare one in `definition.parameters` and reference it as `parameters('NAME (schema)')`, the flow imports but then **fails to turn on**:

```
Type '100000005' is not recognized for environment variable 'sol_MySecret'.
```

Secret env vars also don't appear in the dynamic-content picker. They must be fetched at **runtime** via a Dataverse unbound action. (Per Microsoft docs, secret env vars are usable in Power Automate flows, Copilot Studio, and custom connectors — but only this way.)

**Pattern — fetch the secret, then use its output:**

```json
"GetMySecret": {
  "runAfter": {},
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps",
      "operationId": "PerformUnboundAction",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "actionName": "RetrieveEnvironmentVariableSecretValue",
      "item/EnvironmentVariableName": "sol_MySecret"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runtimeConfiguration": { "secureData": { "properties": [ "outputs" ] } }
}
```

Then reference the value with `@body('GetMySecret')?['EnvironmentVariableSecretValue']` (or `outputs('GetMySecret')?['body/EnvironmentVariableSecretValue']`).

**Rules:**
- `item/EnvironmentVariableName` is the env var **schema name** (e.g. `smkb_pvch_SopranoSMSAPIPassword`), as a plain string — NOT a `parameters()` reference. This is what avoids the `100000005` error.
- Needs a **Dataverse connection reference** in the flow. Reuse the solution's existing one — key `shared_commondataserviceforapps` → logical name `msdyn_Dataverse` (the same one the manager flows use). The designer may wire a *new* Dataverse connection reference (e.g. `new_sharedcommondataserviceforapps_xxxx`) that isn't declared in the solution's `Customizations.xml`; if so, import fails — switch it to the declared `msdyn_Dataverse`.
- Enable **Secure Outputs** on the fetch action (shown above) and **Secure Inputs** on whatever consumes it (the HTTP call), so the secret never lands in run history.
- **Never** add the Secret env var to `definition.parameters` / reference it via `parameters()` — that is exactly what triggers the turn-on error.
- **Toggle/gate** on a NON-secret value, not the secret. If a flow needs "is this feature configured?" logic (the way the OTP flow gates Turnstile), gate on a public **String** env var (e.g. the Turnstile *site* key) via `parameters()`, not on the secret — you can't emptiness-check a secret through `parameters()`.

**Azure prerequisite (one-time per environment/vault):** the **Dataverse service principal** (app id `00000007-0000-0000-c000-000000000000`) needs the **Key Vault Secrets User** role on the vault; register the `Microsoft.PowerPlatform` resource provider; and if the Key Vault firewall is on, allow the Power Platform IP ranges. Without these the fetch action fails at runtime (the definition still imports fine). Docs: [Use environment variables for Azure Key Vault secrets](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/environmentvariables-azure-key-vault-secrets).

> Live example in this solution: `smkb_pvch_CreateOtp` fetches both the Turnstile secret (`smkb_pvch_TurnstileSecretAPIKey`) and the Soprano SMS password (`smkb_pvch_SopranoSMSAPIPassword`) with `RetrieveEnvironmentVariableSecretValue`, and gates Turnstile on the public site key `smkb_TurnstileSiteKey`.

---

## 12. Dataverse — Read / Update / Delete (beyond CreateRecord)

Snippet 3 covers `CreateRecord`. The other Dataverse operations use the same `msdyn_Dataverse` connection (local key e.g. `shared_commondataserviceforapps_sol`) and the `shared_commondataserviceforapps` apiId.

**ListRecords** — query rows with OData `$filter` / `$select` / `$top` (rows come back in `@body('List_rows')?['value']`):
```json
"List_rows": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_sol",
      "operationId": "ListRecords",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "entityName": "sol_example_items",
      "$filter": "sol_lecturerid eq '@{string(first(body('Get_Auth_Session')?['value'])?['ID'])}'",
      "$select": "sol_example_itemid,sol_name",
      "$top": 50
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

> **Security:** when a `$filter` interpolates client input, scope it to the caller's own records (ownership) **and** escape quotes, or you have an IDOR / OData-injection hole. Prefer a `recordId` (GUID) lookup where possible. This is what the `authenticated-flow-validates-token` flow-lint rule and the audit's F2/F3/F5 findings are about.

**UpdateRecord** — patch a row by GUID (`item/` prefix on every field, same as CreateRecord):
```json
"Update_row": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_sol",
      "operationId": "UpdateRecord",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "entityName": "sol_example_items",
      "recordId": "@triggerBody()?['id']",
      "item/sol_name": "@triggerBody()?['name']"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```
To clear a column during an update, use `"@null"` — never bare JSON `null` (Snippet 10).

**DeleteRecord** — delete by GUID:
```json
"Delete_row": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_sol",
      "operationId": "DeleteRecord",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "entityName": "sol_example_items",
      "recordId": "@triggerBody()?['id']"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

---

## 13. Apply to each (Foreach) + file attachments

Loop over a collection with `Foreach`. A common case: the portal/Code App sends an array of files as a JSON string; parse it, loop, and add each as a SharePoint attachment with `CreateAttachment`.

```json
"Upload_Files": {
  "type": "Foreach",
  "foreach": "@json(triggerBody()?['text_23'])",
  "actions": {
    "Add_Attachment": {
      "type": "OpenApiConnection",
      "inputs": {
        "host": {
          "connectionName": "shared_sharepointonline_sol",
          "operationId": "CreateAttachment",
          "apiId": "/providers/Microsoft.PowerApps/apis/shared_sharepointonline"
        },
        "parameters": {
          "dataset": "@parameters('SHAREPOINT_SITE_URL (sol_SharePointSiteUrl)')",
          "table": "Your List Name",
          "itemId": "@int(first(body('Get_Auth_Session')?['value'])['ID'])",
          "displayName": "@items('Upload_Files')['name']",
          "body": "@base64ToBinary(items('Upload_Files')['content'])"
        },
        "authentication": "@parameters('$authentication')"
      },
      "runAfter": {}
    }
  },
  "runAfter": {}
}
```

**Notes:**
- Inside the loop, reference the current item with `items('<ForeachName>')` — here `items('Upload_Files')`.
- Files uploaded from a Power Pages / Code App are base64 — convert with `base64ToBinary(...)` before storing.
- `Foreach` runs items **in parallel** by default. If order matters or the loop shares a variable, set the action's `runtimeConfiguration.concurrency.repetitions` to `1` (sequential).
- `InitializeVariable` cannot live inside a `Scope`/`Foreach` — declare variables at the top level (Pitfall 9e).

---

## 14. Testing a flow

There is **no local Power Automate engine** — a flow's *behavior* can only be executed on cloud Dev. But a flow's *structure and security invariants* are checked **locally** by `tools/flow-lint` (the bundled validator), which is the fast, deterministic regression guard. So:

| What | Where | How |
|---|---|---|
| Flow **structure** (schema, embedded connections, descriptions ≤256, PA field titles, no placeholders, XML consistency) + **security invariants** (auth-token validation, URL-injection encoding, no `invoker`) | **Local** | `node tools/flow-lint/lint.mjs ".\Workflows"` — also gates every `deploy.ps1` |
| Flow **behavior** (does the logic do the right thing?) | **Cloud Dev only** | Deploy, then trigger the flow (from the portal/Code App or the Power Pages trigger endpoint) and inspect the run history |
| End-to-end journeys | **Cloud Dev** | Drive the calling site/app against the deployed flow |

Keep flow bodies thin: push pure logic (validation, formatting, error-code mapping) into the calling SPA where it can be unit-tested locally, and let the flow orchestrate connectors. When a flow **must** hold logic, cover its invariants with a flow-lint rule so they can never silently regress.
