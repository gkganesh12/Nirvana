# SignalCraft Terraform Provider

Terraform provider for managing SignalCraft configuration with API keys.

## Provider Configuration

```hcl
terraform {
  required_providers {
    signalcraft = {
      source  = "signalcraft/signalcraft"
      version = "0.1.0"
    }
  }
}

provider "signalcraft" {
  base_url = "http://localhost:5050"
  api_key  = var.signalcraft_api_key
}
```

## Resources

### Workspace

```hcl
resource "signalcraft_workspace" "main" {
  name = "SignalCraft Ops"
}
```

### Routing Rule

```hcl
resource "signalcraft_routing_rule" "critical" {
  name        = "Critical Alerts"
  description = "Critical alerts to Slack"

  conditions_json = jsonencode({
    all = [
      {
        field    = "severity"
        operator = "equals"
        value    = "critical"
      }
    ]
  })

  actions_json = jsonencode({
    slackChannelId = "C0123456789"
    mentionHere    = true
    escalateAfterMinutes = 15
  })
}
```

### Schedule (On-call Rotation)

```hcl
resource "signalcraft_schedule" "primary" {
  name        = "Primary On-Call"
  description = "Primary rotation"
  timezone    = "UTC"
}
```

### Escalation Policy

Rules are JSON with a `rules` array. The first rule is used for scheduling escalation.

```hcl
resource "signalcraft_escalation_policy" "primary" {
  name        = "Primary Escalation"
  description = "First escalation step"

  rules_json = jsonencode({
    rules = [
      {
        delayMinutes = 10
        channelId    = "C0123456789"
        mentionHere  = true
      }
    ]
  })
}
```

Use the policy in routing rules via `actions_json`:

```hcl
resource "signalcraft_routing_rule" "policy" {
  name = "Policy Escalation"

  conditions_json = jsonencode({
    all = [{ field = "severity", operator = "equals", value = "critical" }]
  })

  actions_json = jsonencode({
    slackChannelId      = "C0123456789"
    escalationPolicyId  = signalcraft_escalation_policy.primary.id
  })
}
```

### Team

```hcl
resource "signalcraft_team" "db" {
  name        = "Database SRE"
  description = "DB on-call"
  members     = ["user_123", "user_456"]
}
```

### User (Role Management)

```hcl
resource "signalcraft_user" "member" {
  user_id = "user_123"
  role    = "MEMBER"
}
```

### Invitation

```hcl
resource "signalcraft_invitation" "invite" {
  email = "colleague@example.com"
  role  = "MEMBER"
}
```
