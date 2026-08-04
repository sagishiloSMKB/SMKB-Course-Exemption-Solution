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
  "shared_sharepointonline_sol": {
    "runtimeSource": "embedded",
    "connection": {
      "connectionReferenceLogicalName": "smkb_SMKBSharePointConnectionUser1"
    },
    "api": { "name": "shared_sharepointonline" }
  },
  "shared_office365_sol": {
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
| **Local key** | `shared_office365_sol` | This JSON file only — in every action's `connectionName` field | Arbitrary string; scope is this one JSON file |
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
5. Paste the GUID into the Code Site starter's `src/config/flows.ts`

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
- Replace `sol_flow_name` with the actual flow schema name (e.g. `smkb_sol_SendInvite`).

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
- Error: `'The 'id' property '...' under 'properties.connectionReferences.shared_powerautomate_sol.connection' is not valid.'`

**Rule:** Do not add `shared_powerautomate` to any flow's `connectionReferences`. If you need to call another flow as a child, either:
1. Merge the child flow's logic directly into the parent flow
2. Use HTTP with a stored URL (not recommended for internal flows)
3. Use Dataverse table state + a separate scheduled flow

If child flow `Run_Child_Flow_*` actions have placeholder GUIDs (e.g. `[IMPLEMENT: GUID of ...]`), remove them and remove the `shared_powerautomate` connection reference block entirely. The flow can be deployed without the child flow calls and the logic added later once the child flows have real GUIDs.

---

### 9d. Do not use `shared_approvals` (Approvals connector) without an embedded connection reference

The Power Automate Approvals connector (`shared_approvals`) requires an embedded connection reference with a valid logical name — just like SharePoint or Office 365. Using `runtimeSource: "invoker"` (which Power Automate sometimes suggests in the designer) is invalid for solution flows.

Symptoms:
- Error: `'The 'id' property '...' under 'properties.connectionReferences.shared_approvals_sol.connection' is not valid.'`
- The connection reference block has `"runtimeSource": "invoker"` and `"connection": {}`

**Rule:** If the Approvals connector is not yet provisioned with a real embedded connection reference logical name, remove the `shared_approvals_sol` connection reference block and all `StartAndWaitForAnApproval` actions. The approval feature can be added back later once the Approvals connection reference is set up in the environment.

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

Confirmed on a live deployed flow (2026-06-25): its Approvals connection was `invoker`; flipping it to `embedded` ended the per-deploy 403, and a deploy no longer breaks the binding.

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
- `item/EnvironmentVariableName` is the env var **schema name** (e.g. `smkb_sol_SmsApiPassword`), as a plain string — NOT a `parameters()` reference. This is what avoids the `100000005` error.
- Needs a **Dataverse connection reference** in the flow. Reuse the solution's existing one — key `shared_commondataserviceforapps` → logical name `msdyn_Dataverse` (the same one the manager flows use). The designer may wire a *new* Dataverse connection reference (e.g. `new_sharedcommondataserviceforapps_xxxx`) that isn't declared in the solution's `Customizations.xml`; if so, import fails — switch it to the declared `msdyn_Dataverse`.
- Enable **Secure Outputs** on the fetch action (shown above) and **Secure Inputs** on whatever consumes it (the HTTP call), so the secret never lands in run history.
- **Never** add the Secret env var to `definition.parameters` / reference it via `parameters()` — that is exactly what triggers the turn-on error.
- **Toggle/gate** on a NON-secret value, not the secret. If a flow needs "is this feature configured?" logic (the way the OTP flow gates Turnstile), gate on a public **String** env var (e.g. the Turnstile *site* key) via `parameters()`, not on the secret — you can't emptiness-check a secret through `parameters()`.

**Azure prerequisite (one-time per environment/vault):** the **Dataverse service principal** (app id `00000007-0000-0000-c000-000000000000`) needs the **Key Vault Secrets User** role on the vault; register the `Microsoft.PowerPlatform` resource provider; and if the Key Vault firewall is on, allow the Power Platform IP ranges. Without these the fetch action fails at runtime (the definition still imports fine). Docs: [Use environment variables for Azure Key Vault secrets](https://learn.microsoft.com/en-us/power-apps/maker/data-platform/environmentvariables-azure-key-vault-secrets).

> Worked example — see the `CreateOtp` reference flow in [`examples/`](./examples/README.md): it fetches both the Turnstile secret (`smkb_sol_TurnstileSecretAPIKey`) and the SMS API password (`smkb_sol_SmsApiPassword`) with `RetrieveEnvironmentVariableSecretValue`, secures the **outputs** of each fetch and the **inputs** of each call that consumes them, and gates the whole Turnstile branch on a non-empty public site key (`smkb_sol_TurnstileSiteKey`) so a solution without Cloudflare still works. Section 19 covers the DO/DON'T; `keyvault-secret-read-is-secured` enforces the fetch half.

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
      "entityName": "smkb_sol_exampleitems",
      "$filter": "smkb_sol_ownerref eq '@{string(first(body('Get_Auth_Session')?['value'])?['smkb_sol_contactid'])}'",
      "$select": "smkb_sol_exampleitemid,smkb_name",
      "$top": 50
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

> **Security:** when a `$filter` interpolates client input, scope it to the caller's own records (ownership) **and** escape quotes, or you have an IDOR / OData-injection hole. See **Section 15** for the full ownership scaffold, which is the control that actually closes this.

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
      "entityName": "smkb_sol_exampleitems",
      "recordId": "@{first(body('Get_Owned_Record')?['value'])?['smkb_sol_exampleitemid']}",
      "item/smkb_name": "@triggerBody()?['name']"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

> **`recordId` must never come straight from `triggerBody()`.** A client-supplied GUID passed to
> `UpdateRecord` *is* the IDOR: the connector patches whatever row that GUID names, and being a
> GUID confers no authorization. Resolve the row first with a `ListRecords` that filters on **both**
> the requested id **and** the session-resolved owner (Section 15), then pass that lookup's own
> id — as above. If the lookup returns nothing, answer `NOT_FOUND`; never fall back to the
> client's value.
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

---

## 15. Auth-Token Validation + Row-Level Ownership

The scaffold **every authenticated flow** follows. It closes three audit findings at once: "sensitive
processes are anonymous" (the Anonymous web role is not the authorization boundary — this is),
"ownership checks incomplete", and the IDOR half of the file/record findings.

The token-validation half already exists as a ready-made snippet — do not retype it:
[`VALIDATE_AUTH_TOKEN_SNIPPET.json`](../SMKB%20-%20Component%20Library/OTP%20Auth%20Screen/flow-templates/VALIDATE_AUTH_TOKEN_SNIPPET.json)
in the Component Library. Paste that in, then add the ownership scoping below, which the snippet
deliberately leaves to the caller because only you know your ownership column.

### The five steps, in order

1. **Look up the session row** by the client's `authToken` (the snippet). No row → `UNAUTHORIZED`.
2. **Reject an expired session** — compare the row's expiry to `utcNow()`. Past it → `UNAUTHORIZED`.
   Check this server-side even though the client also tracks expiry; the client's copy is a UX hint.
3. **Resolve the acting user FROM THE SESSION ROW.** This is the load-bearing step.
4. **Scope every read and write** by that resolved owner.
5. **Answer `NOT_FOUND`** when a requested record exists but is not the caller's — never `FORBIDDEN`,
   which confirms the record exists (Section 17).

### Step 3 — resolve the actor from the session, never from the request

```jsonc
// The session row is the ONLY trustworthy statement of who is calling.
// Everything downstream keys off this, not off anything in triggerBody().
"Resolve_Actor": {
  "type": "Compose",
  "inputs": "@{first(body('Get_Auth_Session')?['value'])?['smkb_sol_contactid']}",
  "runAfter": { "Check_Session_Expiry": ["Succeeded"] }
}
```

**The rule:** a client-supplied identifier may narrow *which* of the caller's own records is meant.
It must never be what *selects* the record. Concretely — a request carrying `recordId` is answered by

```
$filter = <idColumn> eq '<escaped recordId>' and <ownerColumn> eq '<resolved actor>'
```

not by `recordId` alone, and not by passing `recordId` to `UpdateRecord` / `GetItem` directly
(Section 12). Two conditions, both required, and the owner side comes from step 3.

### Step 4 — the scoped query, with quote escaping

```jsonc
"Get_Owned_Record": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_sol",
      "operationId": "ListRecords",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "entityName": "smkb_sol_exampleitems",
      "$filter": "smkb_sol_exampleitemid eq '@{replace(triggerBody()?['recordId'], '''', '''''')}' and smkb_sol_ownerref eq '@{replace(outputs('Resolve_Actor'), '''', '''''')}'",
      "$top": 1
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": { "Resolve_Actor": ["Succeeded"] }
}
```

The four- and six-quote runs in that `replace()` are the WDL escaping idiom, not a typo: inside a WDL
string literal a single quote is written **doubled**, so a run of four quotes denotes the
one-character string `'` and a run of six denotes `''`. The call therefore doubles every quote in the
value, and a value containing a quote can no longer terminate the OData string literal and inject a
clause of its own.

Then branch on `empty(body('Get_Owned_Record')?['value'])` → respond `NOT_FOUND` and `Terminate`.

> **Escaping is not optional even for a GUID-shaped input.** Nothing guarantees the client sent a
> GUID; the column type is checked by Dataverse *after* the filter string has already been built.
> If the value really must be a GUID, validate its shape first and reject `INVALID_INPUT` — that is
> strictly better than escaping, and cheaper.

### Declare no trigger input you do not use

Every field in the trigger schema is part of the flow's public contract: the SPA can send it, and a
reviewer cannot tell a dead field from a live record selector. The `no-unused-trigger-inputs`
flow-lint rule flags them — it found three in the reference flows, one of which was a `voucherId`
that no action ever read. Delete the field, or consume it.

---

## 16. Server-Side File Validation

Client-side validation is a UX affordance; the flow is where it counts. Reject the upload unless
**all three** hold, then store it under a name **you** generated.

### Extension against an allow-list

```
@and(
  contains(createArray('pdf','jpg','jpeg','png'), toLower(last(split(triggerBody()?['fileName'], '.')))),
  greater(length(split(triggerBody()?['fileName'], '.')), 1)
)
```

The second clause matters: a name with no dot makes `last(split(...))` return the whole name, which
could coincidentally match an allowed value.

### Magic bytes — no decode, no connector needed

Base64 encodes 3 bytes into 4 characters, so a file's leading signature bytes map to a **fixed
base64 prefix**. A `startsWith` on the raw base64 the client sent is therefore a real content check:

| Type | Signature bytes | Base64 prefix |
|---|---|---|
| PDF | `25 50 44 46` (`%PDF`) | `JVBER` |
| PNG | `89 50 4E 47 0D 0A 1A 0A` | `iVBORw0KGgo` |
| JPEG | `FF D8 FF` | `/9j/` |

```
@or(
  startsWith(triggerBody()?['fileBase64'], 'JVBER'),
  startsWith(triggerBody()?['fileBase64'], 'iVBORw0KGgo'),
  startsWith(triggerBody()?['fileBase64'], '/9j/')
)
```

**To add a type:** take its documented signature, base64-encode the first 3, 6 or 9 bytes, and keep
only the leading characters that those whole 3-byte groups produce — a prefix that stops mid-group
varies with the following byte. (PNG's 8-byte signature safely yields 11 characters.)

Check the extension **and** the bytes. Either alone is bypassable: the extension is client-controlled
text, and matching bytes say nothing about the name you are about to store.

### Size cap

Base64 length is `ceil(bytes / 3) * 4`, so convert the cap once and compare lengths — do not decode
just to measure:

```
@less(length(triggerBody()?['fileBase64']), 6990508)     // 5 MB
```

`2 MB -> 2796204` · `5 MB -> 6990508` · `10 MB -> 13981016`.

### Store under a server-generated filename

```
@concat('upload-', guid(), '.', toLower(last(split(triggerBody()?['fileName'], '.'))))
```

Never persist the client's filename as the stored name. It is the vector for path traversal
(`../../x`), for a double extension (`invoice.pdf.htm`), and for RTL-override tricks that make a
dangerous name render harmlessly. Keep the original in a **data column** if users need to see it —
displaying it as text is safe; letting it name a file is not.

### One generic rejection code

All three checks fail as `INVALID_FILE`. Telling a caller *which* check failed just enumerates the
allow-list and the cap for them; the specific reason belongs in run history.

> **Scope, honestly.** This is defense-in-depth, not anti-malware. SharePoint Online and Dataverse
> already virus-scan stored files, and the portal never serves an upload as active content, so a
> separate scanning tier is not required here — but nothing above inspects a file *beyond* its first
> few bytes, and it should not be described as though it does.

---

## 17. Uniform Anti-Enumeration Responses

An unauthenticated endpoint that answers differently for "no such account" and "account exists" is an
account-existence oracle, whatever the status code. Collapse those to **one** response and keep the
real distinction in run history, which is visible only to flow owners and environment admins.

### What merges, and what may still be returned

| Situation | Return | Why |
|---|---|---|
| Identifier not found (send) | the **same** response as success | The caller must not learn that an identifier is unregistered |
| Identifier not found (verify) | `INVALID_CODE` | Merged with a wrong code — indistinguishable |
| Wrong code | `INVALID_CODE` | Merged with not-found |
| Account archived / disabled | the generic response | State is as sensitive as existence |
| Locked out | `LOCKED` — *see below* | Needed for UX, but must not confirm the account |
| Rate limited | `RATE_LIMITED` | Safe **only if** the limit applies whether or not the identifier exists |
| Malformed input | `INVALID_INPUT` | Reveals nothing — it is about the request's shape |

`RATE_LIMITED` and `LOCKED` are the two that quietly leak if you are careless. A limit counted only
for *real* accounts turns `RATE_LIMITED` into the oracle you just closed elsewhere — count attempts
per submitted identifier, existent or not. `LOCKED` is a genuine trade-off: it is worth returning so
a user understands why they are stuck, but the message must describe the *attempt state*, not the
account ("too many attempts, try again later" — not "this account is locked").

The branch still runs, so nothing is lost operationally:

```jsonc
// Both paths answer identically. Which one ran is in the run history.
"Respond_generic": {
  "type": "Response", "kind": "PowerPages",
  "inputs": {
    "statusCode": 200,
    "headers": { "Content-Type": "application/json" },
    "body": { "ok": true }
  }
}
```

> **Response timing.** A not-found short-circuit returns measurably faster than a full verification,
> so a determined attacker can still distinguish the two by latency. Equalising that in a cloud flow
> is not practical — connector latency varies far more than the branch does, and a fixed `Delay`
> costs every real user. Treat the timing channel as **accepted and documented**, and rely on the
> rate limit and global cap (Section 18) to make bulk probing expensive. Claiming the channel is
> closed would be worse than admitting it is narrow.

---

## 18. Rate Limit, Global Cap, and Abuse Alert

Four bounds, each catching what the others cannot:

| Bound | Stops | Shipped as |
|---|---|---|
| Bot check | Automated traffic, before anything else runs | Fail-closed Turnstile (OTP recipe) |
| Per-identifier limit | Hammering one account | The OTP recipe's 10-minute window |
| Attempt lockout | Guessing a code for one account | The recipe's 5-attempt lockout |
| **Global cap** | A spray across *many* identifiers | `smkb_sol_OtpDailyCap` (below) |

A per-identifier limit is blind to breadth: 10 000 identifiers touched three times each never trips
it. The global cap is that bound.

### Counting recent events — Dataverse

Dataverse returns a page of at most 5 000 rows plus an `@odata.nextLink` for the rest, so **count
with `$count`, never by measuring an array you fetched**:

```jsonc
"Count_Recent_Sends": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_sol",
      "operationId": "ListRecords",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_commondataserviceforapps"
    },
    "parameters": {
      "entityName": "smkb_sol_otprequests",
      "$filter": "createdon ge @{addHours(utcNow(), -24)}",
      "$count": true,
      "$top": 1
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": { "Verify_Bot_Token": ["Succeeded"] }
}
```

Read the total from `@body('Count_Recent_Sends')?['@odata.count']` and compare:

```
@greaterOrEquals(
  int(body('Count_Recent_Sends')?['@odata.count']),
  int(parameters('SOL - OTP Daily Cap (smkb_sol_OtpDailyCap)'))
)
```

Over the cap → respond with the same generic body as any other rejection (Section 17) and
`Terminate` succeeded.

> **Index the timestamp column** if the table will hold more than a few thousand rows. An unindexed
> `createdon ge …` scan degrades as the table grows, and this query runs on every request.

> **SharePoint variant.** If the backing store is a SharePoint list instead, the shape differs: there
> is no `$count`, the list-view threshold is 5 000 items *scanned* (not returned), and an unindexed
> filter column fails outright past it rather than merely slowing down. Use `GetItems` with `$top`
> and paginate, and index the timestamp column before the list grows.

### Abuse alert

Reuse the existing `Handle_Flow_Error` → `SendEmailV2` shape (Section 8), but send to
`smkb_sol_SecurityAlertEmails` — **not** `smkb_sol_FlowErrorEmails`. A technical failure and a
possible attack have different audiences and different urgency; mixing them trains people to ignore
both.

Alert when the global cap trips, or when an account transitions into lockout.

> **Debounce it, or you have built an amplifier.** An alert per rejected attempt turns an abuse
> attempt into an outbound mail flood from your own tenant, throttles the connection, and buries the
> first alert. Fire on the **transition into** the capped/locked state, not on every attempt. If the
> recipient list is empty, skip the send and continue — the cap must still reject; only the
> notification is optional.

> **Per-IP and distributed abuse is an edge concern, not a flow concern.** A cloud flow has no
> trustworthy client IP: the Power Pages trigger does not supply one, and any value the SPA passes is
> attacker-controlled. Rate limiting by IP belongs at the WAF / front door and is an IT/platform
> task. Do not simulate it in a flow — a limiter keyed on a spoofable value is worse than none,
> because it reads as a control that is not there.

---

## 19. Secure Inputs / Outputs — DO and DON'T

`secureData` keeps a value out of run history. Run history is visible only to the flow's
owners/co-owners and environment admins — never to end users or the portal's Anonymous role — so it
is a *containment* control, not a boundary.

### DO — internal connector actions

Enable it on `OpenApiConnection` and `Http` **actions** that read a secret, or that read, write or
transmit a token, one-time code, bank detail, or national id:

```jsonc
// Secret FETCH: secure the OUTPUTS - the secret is what comes back.
"runtimeConfiguration": { "secureData": { "properties": ["outputs"] } }
```
```jsonc
// The call that CONSUMES it: secure the INPUTS - the secret is in the request.
"runtimeConfiguration": { "secureData": { "properties": ["inputs"] } }
```

Section 11 shows the full Key Vault fetch. Secure **both halves** — a secured fetch feeding an
unsecured HTTP call just moves the plaintext one action to the right.
`keyvault-secret-read-is-secured` (error) enforces the fetch half.

### DON'T — the two that break the flow

**Not on the trigger.** Microsoft does not support Secure Inputs on the trigger of a flow invoked
from Power Pages ("passing a parameter to a flow configured with secure inputs isn't available").
Secure the internal actions that handle the value instead.

**Not on a `Compose`** — nor a `ParseJson`, `Select`, `InitializeVariable`, or any other
non-connector action. This is the expensive one, because it does not fail where you are looking: the
solution **imports successfully**, and the flow then fails *activation* with
`InvalidSecureDataConfiguration` and stays in **Draft**. Nothing in the import output mentions it.
Every portal call to that flow then fails, and there is no `pac` verb to turn a flow on —
reactivation is a manual portal step.

`securedata-only-on-connector-actions` (error) catches both before deploy.

### The residual — and what to do about it

A generated code or token that several actions share usually lives in a `Compose` output, and that
value **cannot be secured**. Two honest options, in order:

1. **Refactor it away.** Inline the expression into the secured connector action that needs it. One
   consumer is the common case, and this removes the exposure rather than accepting it.
2. **Accept it and restrict the audience.** If several actions genuinely need it, the value stays in
   admin-only run history. Review who holds owner/co-owner on the flow and admin on the environment,
   and treat that list as the control — because it is.

Do not "fix" this by adding `secureData` to the `Compose`. That does not hide the value; it stops the
flow from running at all.
