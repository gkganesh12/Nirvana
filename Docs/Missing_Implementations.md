# Missing Implementations

This document tracks gaps found in the codebase and their status.

## Missing or Stubbed Features

- SAML validation and Clerk JWT verification (`Docs/codebase ana.md`).
- Extract `workspaceId` from auth context; status-change notification TODO (`Docs/Codebase_Analysis_Execution_Plan.md`).
- Routing rules evaluation and notification queuing placeholders (`Docs/Phase2_Execution_Plan.md`, `Docs/Phase3_Execution_Plan.md`).

## Implemented in This Pass

- Routed legacy integrations webhooks into the alert processing pipeline (`apps/api/src/integrations/webhooks/webhooks.controller.ts`).
- Implemented Slack interactive actions (ack/resolve/snooze) (`apps/api/src/webhooks/slack-actions.controller.ts`).
- Scoped postmortem generation to workspace and gated on AI availability (`apps/api/src/alerts/postmortem.service.ts`).
- Wired invitation email delivery through `EmailNotificationService.sendWorkspaceInvitation` (`apps/api/src/invitations/invitations.service.ts`).
