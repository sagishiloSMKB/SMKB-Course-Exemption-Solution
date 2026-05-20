# Flow Snippets — Copy-Paste Reference

Quick reference for the most common Power Automate JSON patterns used in SMKB solutions. Copy these snippets into your flow JSON files.

---

## 1. Environment Variable Parameters

Use the `metadata.schemaName` pattern to inject env var values at runtime. **Never use the `GetEnvironmentVariableValue` operationId** — it does not exist in the `commondataserviceforapps` connector.

Add inside `definition.parameters` (alongside `$authentication` and `$connections`):

```json
"ENVIRONMENT_NAME (sol_ENVIRONMENT_NAME)": {
  "defaultValue": "dev",
  "type": "String",
  "metadata": {
    "schemaName": "sol_ENVIRONMENT_NAME",
    "description": "Logical environment name (dev/stage/prod). Used to prefix email subjects in non-production environments."
  }
},
"ERROR_EMAILS (sol_FLOW_ERROR_EMAILS)": {
  "defaultValue": "",
  "type": "String",
  "metadata": {
    "schemaName": "sol_FLOW_ERROR_EMAILS",
    "description": "Semicolon-separated email addresses for flow error notifications."
  }
}
```

Reference in expressions:
```
@parameters('ENVIRONMENT_NAME (sol_ENVIRONMENT_NAME)')
@parameters('ERROR_EMAILS (sol_FLOW_ERROR_EMAILS)')
```

> **Type rules:** Use `String` (type code `100000000`) for email lists — semicolon-separated. Never use JSON type (`100000003`) for email lists; once deployed, the type cannot be changed by reimport.

---

## 2. CreateRecord — Dataverse Row Creation

The `item/` prefix is required for all field values. Even auto-number fields need a placeholder value — omitting them causes "required field missing" errors.

```json
"Create_record": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_commondataserviceforapps_[yourid]",
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

> **Auto-number fields:** If `sol_name` is an auto-number column, pass `" "` (a single space) as the value. Power Platform ignores the value and generates the auto-number, but the field must be present to avoid a validation error.

---

## 3. SendEmailV2 — Office 365 Outlook

```json
"Send_email": {
  "type": "OpenApiConnection",
  "inputs": {
    "host": {
      "connectionName": "shared_office365_[yourid]",
      "operationId": "SendEmailV2",
      "apiId": "/providers/Microsoft.PowerApps/apis/shared_office365"
    },
    "parameters": {
      "emailMessage/From": "[sol]NoReply@yourdomain.com",
      "emailMessage/To": "@triggerBody()?['recipient']",
      "emailMessage/Subject": "@if(equals(parameters('ENVIRONMENT_NAME (sol_ENVIRONMENT_NAME)'), 'prod'), 'Your subject here', concat('(', toUpper(parameters('ENVIRONMENT_NAME (sol_ENVIRONMENT_NAME)')), ') Your subject here'))",
      "emailMessage/Body": "<p>Email body HTML here.</p>",
      "emailMessage/Importance": "Normal"
    },
    "authentication": "@parameters('$authentication')"
  },
  "runAfter": {}
}
```

Replace `[yourid]` with the connection reference logical name from your environment (e.g. `shared_office365_abc123def`). Replace `[sol]` with your solution short prefix.

---

## 4. Dataverse Row-Created Trigger

Use `OpenApiConnectionWebhook` with `SubscribeWebhookTrigger` to trigger a flow when a Dataverse row is created.

```json
"triggers": {
  "When_a_row_is_added": {
    "type": "OpenApiConnectionWebhook",
    "inputs": {
      "host": {
        "connectionName": "shared_commondataserviceforapps_[yourid]",
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

`message` values: `1` = created, `2` = deleted, `3` = updated. `scope` `4` = organization-wide.

Reference the created row in expressions:
```
@triggerBody()?['sol_name']
@triggerBody()?['_ownerid_value']
```
