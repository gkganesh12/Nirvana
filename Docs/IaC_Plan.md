# SignalCraft Infrastructure as Code (IaC) Plan

**Goal**: Enable teams to manage SignalCraft configuration (Teams, Services, Rules) using GitOps workflows, treating monitoring configuration as version-controlled code.

## 1. Prerequisites: API Hardening

Before building providers, the SignalCraft API must support **Service Accounts** and **Idempotency**.

*   **Service Accounts (Bot Users)**:
    *   Teams need to run Terraform/Github Actions without tying config to a specific human user.
    *   **New Model**: `ServiceAccount` (similar to User but with API Key only, no login).
*   **Idempotency**:
    *   Ensure all `POST` (create) and `PUT` (update) operations are stable.
    *   Ensure `GET` returns consistent structures.

## 2. Terraform Provider (`terraform-provider-signalcraft`)

The gold standard for IaC.

### Planned Resources
*   `signalcraft_workspace`: Manage workspace settings.
*   `signalcraft_user`: Manage user roles (invite/update).
*   `signalcraft_team`: specialized grouping of users (AlertGroup assignees).
*   `signalcraft_escalation_policy`: Define layers and timeouts.
*   `signalcraft_routing_rule`: specific `If condition Then action` logic.
*   `signalcraft_schedule`: On-call rotations.

### Implementation Stack
*   **Language**: Go (Golang).
*   **SDK**: HashiCorp `terraform-plugin-framework`.
*   **Distribution**: Publish to Terraform Registry.

### Example Usage
```hcl
resource "signalcraft_escalation_policy" "db_team_policy" {
  name = "Database SRE Policy"
  rules {
    delay_minutes = 0
    targets {
      type = "schedule"
      id   = signalcraft_schedule.db_primary.id
    }
  }
}
```

## 3. Kubernetes Operator (CRDs)

For "Cloud Native" organizations that want to define alerts alongside their Assignments in Helm charts.

### Custom Resource Definitions (CRDs)
*   **Kind**: `SignalCraftAlertPolicy`
*   **Spec**:
    ```yaml
    apiVersion: signalcraft.io/v1alpha1
    kind: AlertPolicy
    metadata:
      name: critical-db-alerts
    spec:
      severity: critical
      routing_key: "db-team"
      conditions:
        - type: "metric_threshold"
          metric: "cpu_usage"
          operator: "gt"
          value: 90
    ```

### Controller Logic
*   Controller watches for CRD changes in the cluster.
*   Syncs state to SignalCraft API.
*   Reports sync status back to K8s Event stream.

## 4. GitOps Workflow (Example)

1.  Engineer opens PR to `monitoring-config` repo changing a Routing Rule.
2.  CI runs `terraform plan`.
3.  Team Lead approves PR.
4.  CD runs `terraform apply`.
5.  SignalCraft configuration is updated instantly.

## 5. Roadmap

*   **Phase 1 (API)**: Service Accounts & Stable CRUD Endpoints.
*   **Phase 2 (Terraform)**: Build extensive Terraform Provider (High Demand).
*   **Phase 3 (K8s)**: Kubernetes Operator (Niche but sticky).
