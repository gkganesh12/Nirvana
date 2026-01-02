# Phase 4: Routing Rules & Alert Hygiene - Execution Plan

## Overview

Phase 4 implements intelligent routing and alert hygiene features for SignalCraft. This phase focuses on creating a flexible rules engine that routes alerts to appropriate Slack channels based on conditions, implements escalation for unacknowledged alerts, and provides alert hygiene features like snoozing and auto-closing.

**Timeline**: Week 7-8  
**Prerequisites**: Phase 1, 2, and 3 must be completed (foundation, alert processing, Slack integration)  
**Goal**: Build a complete routing and escalation system that makes alerts actionable and reduces noise through intelligent routing and hygiene controls.

---

## Prerequisites

Before starting Phase 4, ensure previous phases are complete:

- [ ] Phase 1: Foundation & Infrastructure is complete
- [ ] Phase 2: Core Alert Processing is complete
- [ ] Phase 3: Integrations & Notifications is complete
- [ ] Slack integration is working
- [ ] Notifications can be sent to Slack
- [ ] Alert groups can be created and updated
- [ ] Queue system (BullMQ) is set up and running

---

## Task 4.1: Routing Rules Engine

### Objective

Create a flexible rules engine that evaluates alert properties against rule conditions and executes actions (like routing to Slack channels) when conditions match.

### Step-by-Step Execution

#### Step 4.1.1: Design Rules Engine Architecture

1. Review routing requirements from Software_Doc.md
2. Design rule evaluation flow:
   - Input: AlertGroup or NormalizedAlert
   - Evaluate against all enabled rules
   - Match conditions (env, severity, project, tags)
   - Execute actions (Slack channel, escalation settings)
   - Support rule priority/ordering
3. Design condition matching system
4. Design action execution system
5. Plan for extensibility (future condition/action types)

#### Step 4.1.2: Review RoutingRule Schema

1. Review RoutingRule table schema
2. Verify fields:
   - id
   - workspace_id
   - conditions_json (JSON structure for conditions)
   - actions_json (JSON structure for actions)
   - enabled (boolean)
   - priority (integer, for ordering)
   - name (optional, for display)
   - description (optional)
3. Check indexes on workspace_id and enabled
4. Add priority field if missing
5. Document schema structure

#### Step 4.1.3: Design Condition Structure

1. Design JSON structure for conditions:
   ```json
   {
     "all": [
       {
         "field": "environment",
         "operator": "in",
         "value": ["prod", "staging"]
       },
       { "field": "severity", "operator": ">=", "value": "high" },
       { "field": "project", "operator": "in", "value": ["api", "web"] }
     ],
     "any": [] // optional
   }
   ```
2. Support condition operators:
   - `equals` / `==`
   - `not_equals` / `!=`
   - `in` (array membership)
   - `not_in`
   - `>`, `>=`, `<`, `<=` (for severity)
   - `contains` (for tags)
   - `regex` (for advanced matching)
3. Support logical operators: `all` (AND), `any` (OR)
4. Document condition structure
5. Create TypeScript types/interfaces

#### Step 4.1.4: Design Action Structure

1. Design JSON structure for actions:
   ```json
   {
     "slack_channel_id": "C123456",
     "mention_here": true, // for high/critical
     "escalate_after_minutes": 15,
     "escalation_channel_id": "C789012" // optional
   }
   ```
2. Support action types:
   - Slack channel routing
   - Channel mentions (@here, @channel)
   - Escalation settings
   - Future: Email, PagerDuty, etc.
3. Document action structure
4. Create TypeScript types/interfaces

#### Step 4.1.5: Create Rules Engine Service

1. Create `apps/api/src/routing/rules-engine.service.ts`
2. Create rules engine service class
3. Inject database service for rule retrieval
4. Inject logger
5. Set up service as NestJS provider

#### Step 4.1.6: Implement Rule Retrieval

1. Create method to get enabled rules for workspace
2. Query RoutingRule table:
   - Filter by workspace_id
   - Filter by enabled = true
   - Order by priority (ascending, lower = higher priority)
3. Parse conditions_json and actions_json
4. Return array of rule objects
5. Cache rules if needed (for performance)

#### Step 4.1.7: Implement Field Value Extraction

1. Create method to extract field values from alert
2. Support fields:
   - `environment` / `env`
   - `severity`
   - `project` / `service`
   - `tags.{key}` (nested tag access)
   - `count` (alert group count)
   - `status` (alert group status)
3. Handle missing fields gracefully
4. Normalize field values (lowercase, trim, etc.)
5. Support nested field access (tags)

#### Step 4.1.8: Implement Condition Evaluation

1. Create method to evaluate single condition
2. Extract field value from alert
3. Apply operator:
   - `equals`: strict equality
   - `not_equals`: strict inequality
   - `in`: check if value in array
   - `not_in`: check if value not in array
   - `>=`, `>`, `<=`, `<`: compare severity levels
   - `contains`: substring or array contains
   - `regex`: pattern matching
4. Return boolean result
5. Handle type mismatches

#### Step 4.1.9: Implement Logical Operators

1. Create method to evaluate `all` conditions (AND)
2. Create method to evaluate `any` conditions (OR)
3. Support nested logical operators
4. Short-circuit evaluation for performance
5. Return boolean result

#### Step 4.1.10: Implement Rule Matching

1. Create method to check if alert matches rule
2. Parse rule conditions
3. Evaluate all conditions
4. Return true if all conditions match
5. Return false otherwise
6. Log matching decisions for debugging

#### Step 4.1.11: Implement Action Execution

1. Create method to execute rule actions
2. Parse actions_json
3. Execute Slack channel routing:
   - Extract channel_id
   - Queue notification job with channel_id
4. Handle channel mentions:
   - Check if mention_here is true
   - Pass mention flag to notification service
5. Handle escalation settings:
   - Extract escalate_after_minutes
   - Schedule escalation job (see Task 4.4)
6. Return execution result

#### Step 4.1.12: Implement Rule Evaluation Flow

1. Create main evaluate method
2. Input: AlertGroup
3. Get all enabled rules for workspace
4. Iterate through rules (in priority order)
5. For each rule:
   - Check if alert matches conditions
   - If match: execute actions
   - Optionally: stop after first match, or continue
6. Return evaluation results
7. Log all rule evaluations

#### Step 4.1.13: Add Rule Evaluation Metrics

1. Track rule evaluation metrics:
   - Rules evaluated per alert
   - Rules matched per alert
   - Most matched rules
   - Evaluation latency
2. Log metrics for monitoring
3. Create dashboards for rule performance

#### Step 4.1.14: Optimize Rule Evaluation

1. Cache enabled rules per workspace
2. Invalidate cache when rules change
3. Optimize condition evaluation order
4. Use short-circuit evaluation
5. Profile rule evaluation performance
6. Optimize database queries

#### Step 4.1.15: Create Rules Engine Tests

1. Create unit tests for condition evaluation
2. Test all operators (equals, in, >=, etc.)
3. Test logical operators (all, any)
4. Test rule matching
5. Test action execution
6. Test rule priority ordering
7. Create integration tests with real rules

### Acceptance Criteria

- [ ] Rules engine service is created
- [ ] Condition structure is defined and documented
- [ ] Action structure is defined and documented
- [ ] Rules are retrieved from database
- [ ] Field values are extracted correctly
- [ ] All condition operators work
- [ ] Logical operators (AND/OR) work
- [ ] Rule matching works correctly
- [ ] Actions are executed when rules match
- [ ] Rule priority ordering works
- [ ] Rules engine has comprehensive test coverage

---

## Task 4.2: Routing Rules API

### Objective

Create RESTful API endpoints for managing routing rules (CRUD operations) with proper validation and error handling.

### Step-by-Step Execution

#### Step 4.2.1: Create Routing Rules Module

1. Create `apps/api/src/routing/` directory
2. Create routing module file
3. Create routing rules controller
4. Create routing rules service (separate from engine)
5. Set up module imports and dependencies

#### Step 4.2.2: Design API Endpoints

1. Design endpoint structure:
   - `GET /api/routing-rules` - List all rules for workspace
   - `GET /api/routing-rules/:id` - Get single rule
   - `POST /api/routing-rules` - Create new rule
   - `PUT /api/routing-rules/:id` - Update existing rule
   - `DELETE /api/routing-rules/:id` - Delete rule
   - `POST /api/routing-rules/:id/enable` - Enable rule
   - `POST /api/routing-rules/:id/disable` - Disable rule
2. Document all endpoints
3. Define request/response schemas

#### Step 4.2.3: Create Request DTOs

1. Create DTO for creating rule:
   - name (optional string)
   - description (optional string)
   - conditions (JSON object)
   - actions (JSON object)
   - priority (number)
   - enabled (boolean, default true)
2. Create DTO for updating rule (same fields, all optional)
3. Add validation decorators
4. Validate JSON structure for conditions/actions
5. Validate priority is positive integer

#### Step 4.2.4: Implement List Rules Endpoint

1. Create `GET /api/routing-rules` endpoint
2. Extract workspace_id from authenticated context
3. Query all rules for workspace
4. Parse conditions_json and actions_json
5. Return formatted rule list
6. Add pagination if needed
7. Add filtering (enabled/disabled)
8. Add sorting (by priority, name, created_at)

#### Step 4.2.5: Implement Get Rule Endpoint

1. Create `GET /api/routing-rules/:id` endpoint
2. Extract rule ID from params
3. Extract workspace_id from context
4. Query rule by ID and workspace_id
5. Verify rule belongs to workspace (security)
6. Return rule details
7. Return 404 if not found

#### Step 4.2.6: Implement Create Rule Endpoint

1. Create `POST /api/routing-rules` endpoint
2. Extract workspace_id from context
3. Validate request DTO
4. Validate conditions JSON structure
5. Validate actions JSON structure
6. Set workspace_id on rule
7. Save rule to database
8. Return created rule
9. Handle validation errors

#### Step 4.2.7: Implement Update Rule Endpoint

1. Create `PUT /api/routing-rules/:id` endpoint
2. Extract rule ID from params
3. Extract workspace_id from context
4. Find rule by ID and workspace_id
5. Verify rule exists and belongs to workspace
6. Validate update DTO
7. Validate conditions/actions if provided
8. Update rule fields
9. Save updated rule
10. Return updated rule
11. Invalidate rules cache if caching

#### Step 4.2.8: Implement Delete Rule Endpoint

1. Create `DELETE /api/routing-rules/:id` endpoint
2. Extract rule ID from params
3. Extract workspace_id from context
4. Find rule by ID and workspace_id
5. Verify rule exists and belongs to workspace
6. Delete rule from database
7. Return success response
8. Invalidate rules cache

#### Step 4.2.9: Implement Enable/Disable Endpoints

1. Create `POST /api/routing-rules/:id/enable` endpoint
2. Create `POST /api/routing-rules/:id/disable` endpoint
3. Extract rule ID and workspace_id
4. Find and verify rule
5. Update enabled field
6. Save rule
7. Invalidate rules cache
8. Return updated rule

#### Step 4.2.10: Implement Condition Validation

1. Create validation function for conditions JSON
2. Validate structure matches expected format
3. Validate field names are allowed
4. Validate operators are supported
5. Validate value types match operators
6. Validate logical operators structure
7. Return clear error messages
8. Test with various condition structures

#### Step 4.2.11: Implement Action Validation

1. Create validation function for actions JSON
2. Validate structure matches expected format
3. Validate Slack channel IDs exist (optional check)
4. Validate escalation settings
5. Validate mention settings
6. Return clear error messages
7. Test with various action structures

#### Step 4.2.12: Add Rule Priority Management

1. Implement priority assignment:
   - Auto-assign if not provided (next available)
   - Allow manual priority setting
   - Validate priority is unique (or allow duplicates)
2. Create endpoint to reorder rules
3. Update priority when rules are created/updated
4. Handle priority conflicts

#### Step 4.2.13: Add Rule Testing Endpoint

1. Create `POST /api/routing-rules/test` endpoint
2. Accept rule conditions and sample alert
3. Evaluate rule against sample alert
4. Return match result
5. Useful for testing rules before saving
6. Document endpoint usage

#### Step 4.2.14: Add Error Handling

1. Handle validation errors
2. Handle database errors
3. Handle rule not found errors
4. Handle permission errors
5. Return appropriate HTTP status codes
6. Include error details in response
7. Log all errors

#### Step 4.2.15: Add API Documentation

1. Add Swagger/OpenAPI decorators
2. Document all endpoints
3. Document request/response schemas
4. Document error responses
5. Add example requests/responses
6. Document condition/action structures

#### Step 4.2.16: Create API Tests

1. Create unit tests for controller
2. Test all CRUD operations
3. Test validation
4. Test error handling
5. Test enable/disable
6. Test priority management
7. Create integration tests

### Acceptance Criteria

- [ ] All CRUD endpoints are implemented
- [ ] Enable/disable endpoints work
- [ ] Request validation works
- [ ] Condition validation works
- [ ] Action validation works
- [ ] Priority management works
- [ ] Rule testing endpoint works
- [ ] Error handling is comprehensive
- [ ] API documentation is complete
- [ ] Routing rules API has test coverage

---

## Task 4.3: Routing Rules UI

### Objective

Create a user-friendly interface for managing routing rules with a visual rule builder, testing functionality, and rule management features.

### Step-by-Step Execution

#### Step 4.3.1: Create Routing Rules Pages

1. Create `apps/web/app/routing-rules/` directory
2. Create list page: `apps/web/app/routing-rules/page.tsx`
3. Create detail/edit page: `apps/web/app/routing-rules/[id]/page.tsx`
4. Create new rule page: `apps/web/app/routing-rules/new/page.tsx`
5. Set up page routing

#### Step 4.3.2: Design Rule List UI

1. Design rule list table with columns:
   - Name
   - Status (enabled/disabled)
   - Priority
   - Conditions summary
   - Actions summary
   - Created/Updated dates
   - Actions (edit, delete, enable/disable)
2. Add filters:
   - Enabled/Disabled
   - Search by name
3. Add sorting
4. Add pagination if needed
5. Add "Create Rule" button

#### Step 4.3.3: Implement Rule List Page

1. Create rule list component
2. Fetch rules from API
3. Display rules in table
4. Add loading states
5. Add error handling
6. Implement filters
7. Implement sorting
8. Add action buttons

#### Step 4.3.4: Design Visual Rule Builder

1. Design condition builder UI:
   - Field selector (environment, severity, project, tags)
   - Operator selector (equals, in, >=, etc.)
   - Value input (text, select, multi-select)
   - Add/remove condition buttons
   - Logical operator selector (AND/OR)
2. Design action builder UI:
   - Slack channel selector
   - Mention options (checkboxes)
   - Escalation settings (number input)
   - Escalation channel selector
3. Design rule metadata form:
   - Name input
   - Description textarea
   - Priority input
   - Enabled toggle

#### Step 4.3.5: Implement Condition Builder Component

1. Create condition builder component
2. Implement field selector dropdown
3. Implement operator selector dropdown
4. Implement value input (dynamic based on field/operator)
5. Implement add condition button
6. Implement remove condition button
7. Implement logical operator selector
8. Handle nested conditions (all/any)
9. Validate condition structure
10. Format condition for display

#### Step 4.3.6: Implement Action Builder Component

1. Create action builder component
2. Implement Slack channel selector:
   - Fetch available channels from Slack
   - Display channel list
   - Allow channel selection
3. Implement mention options:
   - Checkbox for @here
   - Checkbox for @channel (optional)
4. Implement escalation settings:
   - Number input for minutes
   - Optional escalation channel selector
5. Validate action structure

#### Step 4.3.7: Implement Rule Form

1. Create rule form component
2. Combine condition builder, action builder, metadata form
3. Add form validation
4. Handle form submission
5. Show validation errors
6. Add save/cancel buttons
7. Handle loading states

#### Step 4.3.8: Implement Rule Creation Page

1. Create new rule page
2. Use rule form component
3. Handle create API call
4. Redirect to rule list on success
5. Show success/error messages
6. Handle form reset

#### Step 4.3.9: Implement Rule Edit Page

1. Create edit rule page
2. Fetch rule by ID
3. Populate form with rule data
4. Use rule form component
5. Handle update API call
6. Redirect to rule list on success
7. Show success/error messages

#### Step 4.3.10: Implement Rule Testing Feature

1. Add "Test Rule" button to rule form
2. Create test rule modal/dialog
3. Allow user to input sample alert data
4. Call test endpoint with rule and sample alert
5. Display match result
6. Show which conditions matched/failed
7. Help user debug rule conditions

#### Step 4.3.11: Implement Rule Enable/Disable

1. Add enable/disable toggle to rule list
2. Add enable/disable button to rule detail
3. Call enable/disable API
4. Update UI immediately (optimistic update)
5. Handle errors
6. Show success feedback

#### Step 4.3.12: Implement Rule Priority Management

1. Add priority display to rule list
2. Add priority input to rule form
3. Implement drag-and-drop reordering (optional)
4. Allow priority editing
5. Update priority via API
6. Show priority conflicts if any

#### Step 4.3.13: Implement Rule Deletion

1. Add delete button to rule list
2. Add delete button to rule detail
3. Show confirmation dialog
4. Call delete API
5. Remove from list on success
6. Handle errors
7. Show success feedback

#### Step 4.3.14: Add Rule Validation UI

1. Show validation errors in form
2. Highlight invalid conditions
3. Highlight invalid actions
4. Provide helpful error messages
5. Prevent submission if invalid
6. Show field-level errors

#### Step 4.3.15: Add Rule Preview

1. Show rule summary/preview
2. Display conditions in readable format
3. Display actions in readable format
4. Update preview as user edits
5. Help user understand rule behavior

#### Step 4.3.16: Implement Slack Channel Integration

1. Create API endpoint to fetch Slack channels
2. Call Slack API to get channels
3. Display channels in selector
4. Handle channel loading errors
5. Refresh channel list periodically
6. Cache channel list

#### Step 4.3.17: Add UI Tests

1. Test rule list rendering
2. Test rule creation flow
3. Test rule editing flow
4. Test rule deletion
5. Test enable/disable
6. Test rule testing feature
7. Test form validation

### Acceptance Criteria

- [ ] Rule list page displays all rules
- [ ] Rule creation page works
- [ ] Rule edit page works
- [ ] Visual rule builder is functional
- [ ] Condition builder works for all operators
- [ ] Action builder works
- [ ] Rule testing feature works
- [ ] Enable/disable works
- [ ] Priority management works
- [ ] Rule deletion works
- [ ] Form validation works
- [ ] Slack channel integration works
- [ ] UI is responsive and user-friendly

---

## Task 4.4: Escalation System

### Objective

Implement an escalation system that automatically re-notifies and escalates alerts that haven't been acknowledged within a specified time period.

### Step-by-Step Execution

#### Step 4.4.1: Design Escalation Architecture

1. Review escalation requirements from Software_Doc.md
2. Design escalation flow:
   - When alert group is created and routed
   - Schedule delayed job for escalation check
   - After N minutes, check if acknowledged
   - If not ACKed: re-notify + mention owner
   - Cancel job if alert is ACKed/resolved
3. Design job data structure
4. Plan for multiple escalation levels (optional)

#### Step 4.4.2: Create Escalation Service

1. Create `apps/api/src/escalations/escalation.service.ts`
2. Create escalation service class
3. Inject queue service (BullMQ)
4. Inject notification service
5. Inject alert service
6. Inject logger
7. Set up service as NestJS provider

#### Step 4.4.3: Design Escalation Job Data

1. Design job data structure:
   ```typescript
   {
     workspace_id: string;
     alert_group_id: string;
     escalation_level: number; // 1, 2, 3, etc.
     escalate_after_minutes: number;
     channel_id: string;
     original_notification_id?: string;
   }
   ```
2. Document job data fields
3. Create TypeScript types

#### Step 4.4.4: Implement Escalation Job Scheduling

1. Create method to schedule escalation job
2. Input: alert group, escalation settings from routing rule
3. Calculate delay (escalate_after_minutes)
4. Create BullMQ delayed job
5. Add job to `escalations` queue
6. Store job ID for cancellation
7. Log job scheduling
8. Return job ID

#### Step 4.4.5: Implement Escalation Job Processor

1. Create BullMQ processor for escalations queue
2. Process escalation jobs
3. Extract job data
4. Check alert group status:
   - If ACKed: cancel escalation, log, return
   - If resolved: cancel escalation, log, return
   - If snoozed: check snooze expiry, handle accordingly
   - If open: proceed with escalation
5. Handle job errors

#### Step 4.4.6: Implement Escalation Notification

1. Create method to send escalation notification
2. Format escalation message:
   - Include original alert details
   - Add escalation indicator
   - Mention owner/oncall user
   - Include @here mention
3. Send to escalation channel (or original channel)
4. Include interactive buttons
5. Log escalation notification

#### Step 4.4.7: Implement Escalation Check Logic

1. Create method to check if escalation is needed
2. Query alert group by ID
3. Check status:
   - If "ack": return false (no escalation needed)
   - If "resolved": return false
   - If "snoozed": check if snooze expired
   - If "open": return true (escalation needed)
4. Return boolean result

#### Step 4.4.8: Implement Job Cancellation

1. Create method to cancel escalation job
2. Input: job ID or alert group ID
3. Find job in queue
4. Remove job from queue
5. Log cancellation
6. Handle job not found errors

#### Step 4.4.9: Integrate with Alert Processing

1. Update alert processor (from Phase 2)
2. After routing rule matches and notification is queued
3. If escalation settings exist in rule actions
4. Schedule escalation job
5. Store job reference (optional, for tracking)

#### Step 4.4.10: Integrate with Interactive Actions

1. Update ACK action handler (from Phase 3)
2. When alert is acknowledged
3. Cancel any pending escalation jobs for that alert
4. Log cancellation
5. Update job status

#### Step 4.4.11: Integrate with Resolve Action

1. Update resolve action handler (from Phase 3)
2. When alert is resolved
3. Cancel any pending escalation jobs
4. Log cancellation
5. Update job status

#### Step 4.4.12: Implement Multi-Level Escalation (Optional)

1. Design multi-level escalation:
   - Level 1: Re-notify in same channel
   - Level 2: Notify in escalation channel
   - Level 3: Notify owner directly
2. Store escalation level in job data
3. Schedule next level escalation if needed
4. Limit maximum escalation levels
5. Document escalation levels

#### Step 4.4.13: Add Escalation Metrics

1. Track escalation metrics:
   - Escalations triggered
   - Escalations prevented (by ACK)
   - Average time to escalation
   - Escalation success rate
2. Log metrics for monitoring
3. Create dashboards for escalation health

#### Step 4.4.14: Handle Edge Cases

1. Handle alert group deleted before escalation
2. Handle workspace integration disconnected
3. Handle channel no longer accessible
4. Handle job processing errors
5. Implement retry logic for transient failures
6. Log all edge cases

#### Step 4.4.15: Create Escalation Tests

1. Create unit tests for escalation service
2. Test job scheduling
3. Test escalation check logic
4. Test job cancellation
5. Test escalation notification
6. Create integration tests with queue
7. Test with real alert groups

### Acceptance Criteria

- [ ] Escalation service is created
- [ ] Escalation jobs are scheduled correctly
- [ ] Job processor checks alert status
- [ ] Escalation notifications are sent
- [ ] Jobs are cancelled when alert is ACKed
- [ ] Jobs are cancelled when alert is resolved
- [ ] Integration with alert processing works
- [ ] Integration with interactive actions works
- [ ] Edge cases are handled
- [ ] Escalation system has test coverage

---

## Task 4.5: Alert Hygiene Features

### Objective

Implement alert hygiene features including snoozing, auto-closing, and manual resolution to help teams manage alert noise and maintain clean alert states.

### Step-by-Step Execution

#### Step 4.5.1: Review Alert Hygiene Requirements

1. Review requirements from Software_Doc.md
2. Identify hygiene features:
   - Snooze: Suppress notifications for X hours
   - Auto-close: Resolve groups after inactivity
   - Manual resolve: Update status via API/UI
3. Design hygiene feature architecture
4. Plan for scheduled jobs if needed

#### Step 4.5.2: Review AlertGroup Schema

1. Review AlertGroup table schema
2. Verify status field supports: open, ack, snoozed, resolved
3. Add snooze_until field if missing (timestamp)
4. Verify updated_at field exists
5. Check indexes on status and updated_at
6. Add migration if schema changes needed

#### Step 4.5.3: Create Alert Hygiene Service

1. Create `apps/api/src/alerts/hygiene.service.ts`
2. Create hygiene service class
3. Inject database service
4. Inject queue service (for scheduled jobs)
5. Inject logger
6. Set up service as NestJS provider

#### Step 4.5.4: Implement Snooze Functionality

1. Create method to snooze alert group
2. Input: alert_group_id, snooze_duration_hours
3. Calculate snooze_until timestamp
4. Update AlertGroup:
   - Set status to "snoozed"
   - Set snooze_until timestamp
   - Update updated_at
5. Cancel any pending escalation jobs
6. Log snooze action
7. Return updated group

#### Step 4.5.5: Implement Snooze Expiry Check

1. Create method to check if snooze expired
2. Query groups with status "snoozed"
3. Check if snooze_until < current_time
4. Return list of expired snoozes
5. Use for scheduled cleanup job

#### Step 4.5.6: Implement Unsnooze Functionality

1. Create method to unsnooze alert group
2. Input: alert_group_id
3. Update AlertGroup:
   - Set status back to "open"
   - Clear snooze_until (set to null)
   - Update updated_at
4. Log unsnooze action
5. Return updated group

#### Step 4.5.7: Implement Auto-Close Logic

1. Create method to auto-close inactive alerts
2. Query alert groups:
   - Status: "open" or "ack"
   - last_seen_at older than threshold (e.g., 7 days)
   - No new events in threshold period
3. Update groups:
   - Set status to "resolved"
   - Set resolved_at timestamp
   - Update updated_at
4. Cancel any pending escalation jobs
5. Log auto-close actions
6. Return closed groups

#### Step 4.5.8: Create Auto-Close Scheduled Job

1. Create BullMQ scheduled job for auto-close
2. Run daily (or configurable frequency)
3. Call auto-close method
4. Process all eligible groups
5. Log job execution
6. Handle job errors
7. Schedule next run

#### Step 4.5.9: Implement Manual Resolve

1. Create method to manually resolve alert group
2. Input: alert_group_id, user_id (optional)
3. Update AlertGroup:
   - Set status to "resolved"
   - Set resolved_at timestamp
   - Set assignee_user_id if provided
   - Update updated_at
4. Cancel any pending escalation jobs
5. Update Slack message if notification exists
6. Log resolution action
7. Return updated group

#### Step 4.5.10: Create Hygiene API Endpoints

1. Create `POST /api/alert-groups/:id/snooze` endpoint
   - Accept duration_hours in body
   - Call snooze method
   - Return updated group
2. Create `POST /api/alert-groups/:id/unsnooze` endpoint
   - Call unsnooze method
   - Return updated group
3. Create `POST /api/alert-groups/:id/resolve` endpoint
   - Call manual resolve method
   - Return updated group
4. Add proper authentication/authorization
5. Add validation
6. Add error handling

#### Step 4.5.11: Integrate with Interactive Actions

1. Update snooze action handler (from Phase 3)
2. Use hygiene service snooze method
3. Update Slack message
4. Handle errors
5. Log actions

#### Step 4.5.12: Integrate with Alert Processing

1. Update alert processing pipeline
2. When new alert arrives for snoozed group:
   - Check if snooze expired
   - If expired: unsnooze and process normally
   - If not expired: skip notification (suppress)
3. Log suppression decisions

#### Step 4.5.13: Add Hygiene Configuration

1. Create configuration for:
   - Auto-close threshold (days)
   - Default snooze duration (hours)
   - Snooze expiry check frequency
2. Store in workspace settings or environment
3. Make configurable per workspace
4. Document configuration options

#### Step 4.5.14: Add Hygiene Metrics

1. Track hygiene metrics:
   - Alerts snoozed
   - Alerts auto-closed
   - Alerts manually resolved
   - Average snooze duration
   - Auto-close rate
2. Log metrics for monitoring
3. Create dashboards

#### Step 4.5.15: Create Hygiene UI Actions

1. Add snooze button to alert detail page
2. Add resolve button to alert detail page
3. Add snooze duration selector
4. Show snooze status in alert list
5. Show snooze expiry time
6. Add unsnooze action
7. Update UI after actions

#### Step 4.5.16: Create Hygiene Tests

1. Create unit tests for hygiene service
2. Test snooze functionality
3. Test unsnooze functionality
4. Test auto-close logic
5. Test manual resolve
6. Test snooze expiry check
7. Create integration tests

### Acceptance Criteria

- [ ] Alert hygiene service is created
- [ ] Snooze functionality works
- [ ] Unsnooze functionality works
- [ ] Auto-close logic works
- [ ] Auto-close scheduled job runs
- [ ] Manual resolve works
- [ ] API endpoints work
- [ ] Integration with interactive actions works
- [ ] Integration with alert processing works
- [ ] Hygiene features have test coverage

---

## Integration with Previous Phases

### Objective

Integrate routing rules and escalation with the alert processing pipeline and notification system from previous phases.

### Step-by-Step Execution

#### Step 5.1: Update Alert Processor

1. Review alert processor from Phase 2
2. After alert is grouped and stored
3. Call rules engine to evaluate rules
4. For each matching rule:
   - Execute actions (queue notification)
   - Schedule escalation if configured
5. Log rule evaluation results
6. Handle rule evaluation errors

#### Step 5.2: Update Notification Queue

1. Review notification queue from Phase 3
2. Update job data to include:
   - Channel ID from routing rule
   - Mention settings from routing rule
   - Escalation settings
3. Pass escalation settings to notification service
4. Schedule escalation job after notification sent

#### Step 5.3: Update Notification Service

1. Review notification service from Phase 3
2. Accept channel ID from job data (not hardcoded)
3. Accept mention settings from job data
4. Use routing rule settings instead of defaults
5. Log routing rule used for notification

### Acceptance Criteria

- [ ] Alert processor calls rules engine
- [ ] Notifications use routing rule settings
- [ ] Escalation is scheduled from routing rules
- [ ] End-to-end flow works correctly

---

## Phase 4 Completion Checklist

### Routing Rules Engine

- [ ] Rules engine evaluates conditions correctly
- [ ] All condition operators work
- [ ] Actions are executed when rules match
- [ ] Rule priority ordering works
- [ ] Rules engine is performant

### Routing Rules API

- [ ] All CRUD endpoints work
- [ ] Validation works correctly
- [ ] Enable/disable works
- [ ] Priority management works
- [ ] API is documented

### Routing Rules UI

- [ ] Rule list displays correctly
- [ ] Rule builder is functional
- [ ] Rule creation works
- [ ] Rule editing works
- [ ] Rule testing works
- [ ] UI is user-friendly

### Escalation System

- [ ] Escalation jobs are scheduled
- [ ] Escalation checks work
- [ ] Escalation notifications are sent
- [ ] Job cancellation works
- [ ] Integration works end-to-end

### Alert Hygiene

- [ ] Snooze works
- [ ] Auto-close works
- [ ] Manual resolve works
- [ ] API endpoints work
- [ ] UI actions work
- [ ] Integration works

### Integration

- [ ] Alert processor uses rules engine
- [ ] Notifications use routing rules
- [ ] Escalation is scheduled correctly
- [ ] End-to-end flow works

---

## End-to-End Testing

### Complete Routing Flow Test

1. Create routing rule:
   - Condition: environment = prod, severity >= high
   - Action: route to #oncall channel, escalate after 15 min
2. Trigger test alert matching rule
3. Verify alert is processed and grouped
4. Verify rule is evaluated
5. Verify notification is sent to correct channel
6. Verify escalation job is scheduled
7. Wait for escalation time
8. Verify escalation notification is sent
9. Acknowledge alert in Slack
10. Verify escalation job is cancelled

### Hygiene Flow Test

1. Create alert group
2. Snooze alert for 1 hour
3. Verify status is "snoozed"
4. Trigger new alert for same group
5. Verify notification is suppressed (snooze active)
6. Wait for snooze expiry
7. Trigger new alert
8. Verify notification is sent (snooze expired)
9. Manually resolve alert
10. Verify status is "resolved"
11. Verify escalation jobs are cancelled

---

## Next Steps After Phase 4

Once Phase 4 is complete, you're ready to move to Phase 5: Frontend Dashboard & UI, which will build upon all previous phases to implement:

- Overview dashboard with metrics
- Alert inbox with filtering
- Alert group detail pages
- Integration management UI
- Settings and workspace management

The routing and escalation system from Phase 4 will be visible and manageable through the UI in Phase 5.

---

## Troubleshooting Common Issues

### Rules Not Matching

- Verify rule conditions are correct
- Check field values in alerts
- Review condition operators
- Test rule with sample alert
- Check rule is enabled
- Review rules engine logs

### Escalation Not Working

- Verify escalation job is scheduled
- Check job is in queue
- Verify job processor is running
- Check alert status when escalation fires
- Review escalation service logs
- Verify escalation settings in routing rule

### Hygiene Features Not Working

- Verify AlertGroup schema has required fields
- Check scheduled jobs are running
- Review hygiene service logs
- Verify API endpoints are called correctly
- Check UI actions are connected to API

---

## Estimated Time Breakdown

- Task 4.1 (Routing Rules Engine): 12-14 hours
- Task 4.2 (Routing Rules API): 8-10 hours
- Task 4.3 (Routing Rules UI): 14-16 hours
- Task 4.4 (Escalation System): 10-12 hours
- Task 4.5 (Alert Hygiene Features): 8-10 hours
- Integration with Previous Phases: 4-6 hours
- End-to-End Testing & Debugging: 8-10 hours

**Total Estimated Time**: 64-78 hours (approximately 2-2.5 weeks for one developer)

---

## Notes

- This phase focuses on intelligent routing and alert hygiene. These features are key differentiators that reduce alert noise.
- The rules engine should be flexible and extensible to support future condition and action types.
- Performance is important - optimize rule evaluation, especially with many rules per workspace.
- Escalation timing is critical - ensure jobs are scheduled and processed accurately.
- Alert hygiene features help teams maintain clean alert states and reduce manual work.
- Test routing rules thoroughly with various alert scenarios.
- Consider caching rules for performance, but ensure cache invalidation works correctly.
- Document rule condition and action structures clearly for users.
- The UI should make it easy to create and test rules without deep technical knowledge.
