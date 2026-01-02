# Phase 3: Integrations & Notifications - Execution Plan

## Overview

Phase 3 implements the Slack integration and notification system for SignalCraft. This phase focuses on connecting SignalCraft to Slack workspaces, sending alert notifications to Slack channels, enabling interactive actions (ACK/Snooze/Resolve) directly from Slack messages, and tracking all notification attempts for reliability monitoring.

**Timeline**: Week 5-6  
**Prerequisites**: Phase 1 and Phase 2 must be completed (database, authentication, alert processing pipeline)  
**Goal**: Build a complete Slack integration that can send alert notifications, handle user interactions, and track delivery health.

---

## Prerequisites

Before starting Phase 3, ensure previous phases are complete:
- [ ] Phase 1: Foundation & Infrastructure is complete
- [ ] Phase 2: Core Alert Processing is complete
- [ ] Alert processing pipeline can create AlertGroups
- [ ] Queue system (BullMQ) is set up and running
- [ ] You have access to create a Slack app for testing
- [ ] You have a Slack workspace for development/testing

---

## Task 3.1: Slack OAuth Integration

### Objective
Implement OAuth 2.0 flow to connect SignalCraft to Slack workspaces, securely store bot tokens, and manage integration connections.

### Step-by-Step Execution

#### Step 3.1.1: Create Slack App
1. Go to https://api.slack.com/apps
2. Click "Create New App" → "From scratch"
3. Name the app (e.g., "SignalCraft")
4. Select the workspace for development
5. Note the App ID and Client ID/Secret (will be needed)

#### Step 3.1.2: Configure Slack App OAuth Settings
1. Navigate to "OAuth & Permissions" in Slack app settings
2. Add Redirect URLs:
   - Development: `http://localhost:3000/api/integrations/slack/callback`
   - Production: `https://yourdomain.com/api/integrations/slack/callback`
3. Configure Bot Token Scopes:
   - `chat:write` - Send messages to channels
   - `channels:read` - View basic channel information
   - `groups:read` - View private channels (if needed)
   - `channels:history` - View message history (optional)
   - `users:read` - View user information (optional)
4. Save OAuth settings
5. Document all required scopes

#### Step 3.1.3: Install Slack SDK
1. Install `@slack/web-api` package in backend
2. Install `@slack/oauth` package (if using Slack's OAuth helper)
3. Or implement OAuth manually with HTTP requests
4. Review Slack API documentation
5. Set up TypeScript types for Slack API

#### Step 3.1.4: Create Integration Module Structure
1. Create `apps/api/src/integrations/` directory
2. Create `apps/api/src/integrations/slack/` subdirectory
3. Create integration module file
4. Create OAuth service file
5. Create integration controller file
6. Set up module imports and dependencies

#### Step 3.1.5: Configure OAuth Environment Variables
1. Add Slack app credentials to environment variables:
   - `SLACK_CLIENT_ID`
   - `SLACK_CLIENT_SECRET`
   - `SLACK_REDIRECT_URI` (callback URL)
2. Add to `.env.example` file
3. Document environment variables
4. Set up different values for dev/staging/production
5. Validate environment variables on startup

#### Step 3.1.6: Implement OAuth Initiation Endpoint
1. Create `GET /api/integrations/slack/connect` endpoint
2. Extract workspace_id from authenticated user context
3. Generate OAuth state parameter (include workspace_id for security)
4. Encode state to prevent tampering (sign or encrypt)
5. Build Slack OAuth authorization URL with:
   - Client ID
   - Redirect URI
   - Scopes (space-separated)
   - State parameter
6. Redirect user to Slack authorization URL
7. Log OAuth initiation for debugging

#### Step 3.1.7: Implement OAuth Callback Endpoint
1. Create `GET /api/integrations/slack/callback` endpoint
2. Extract `code` and `state` from query parameters
3. Validate state parameter (verify workspace_id, check expiration)
4. Exchange authorization code for access token:
   - Make POST request to `https://slack.com/api/oauth.v2.access`
   - Include client_id, client_secret, code, redirect_uri
   - Handle OAuth errors
5. Extract bot token from response
6. Extract team/workspace information
7. Store integration in database

#### Step 3.1.8: Implement Token Storage
1. Create encryption service for sensitive data
2. Encrypt bot token before storing
3. Store integration in Integration table:
   - workspace_id
   - type: "SLACK"
   - status: "connected"
   - config_json: encrypted token + team info
   - created_at, updated_at
4. Handle encryption key management
5. Implement token decryption when needed
6. Add token refresh logic (if using refresh tokens)

#### Step 3.1.9: Implement Integration Management
1. Create method to get integration by workspace
2. Create method to check if Slack is connected
3. Create method to disconnect integration
4. Create method to update integration status
5. Handle token expiration
6. Implement token refresh (if applicable)

#### Step 3.1.10: Add Error Handling
1. Handle OAuth errors (user denied, invalid code, etc.)
2. Handle token exchange failures
3. Handle database errors
4. Return user-friendly error messages
5. Log all errors with context
6. Redirect to error page on failure

#### Step 3.1.11: Create Integration Management UI
1. Create integration management page in frontend
2. Display current Slack connection status
3. Add "Connect Slack" button
4. Add "Disconnect Slack" button
5. Show connected workspace name
6. Display connection date
7. Add loading states
8. Handle OAuth callback in frontend

#### Step 3.1.12: Test OAuth Flow
1. Test complete OAuth flow end-to-end
2. Test with different workspaces
3. Test error scenarios (user denial, invalid state)
4. Test token storage and retrieval
5. Test disconnection flow
6. Verify tokens are encrypted

### Acceptance Criteria
- [ ] Slack app is created and configured
- [ ] OAuth initiation endpoint redirects to Slack
- [ ] OAuth callback exchanges code for token
- [ ] Bot token is encrypted and stored securely
- [ ] Integration is saved to database
- [ ] Integration status can be checked
- [ ] Integration can be disconnected
- [ ] Frontend UI shows connection status
- [ ] Error handling works correctly
- [ ] OAuth flow works end-to-end

---

## Task 3.2: Slack Notification Service

### Objective
Create a service that formats and sends alert notifications to Slack channels with rich formatting, interactive buttons, and proper error handling.

### Step-by-Step Execution

#### Step 3.2.1: Set Up Slack Web Client
1. Create Slack notification service class
2. Initialize Slack WebClient with bot token
3. Implement token retrieval from database
4. Decrypt token when needed
5. Handle token refresh if expired
6. Create client instance per workspace

#### Step 3.2.2: Design Message Format
1. Design Slack message structure:
   - Header with alert title
   - Severity badge/indicator
   - Environment and project info
   - Alert count (if grouped)
   - Timestamp
   - Deep link to SignalCraft
   - Interactive buttons (Ack, Snooze, Resolve)
2. Create message template
3. Document message format
4. Design for readability and actionability

#### Step 3.2.3: Implement Message Formatting
1. Create method to format alert message
2. Extract data from AlertGroup:
   - Title
   - Severity
   - Environment
   - Project
   - Count
   - First seen / Last seen
   - Group ID (for button callbacks)
3. Format severity with emoji or color:
   - Critical: 🔴
   - High: 🟠
   - Medium: 🟡
   - Low: 🔵
   - Info: ⚪
4. Format environment badges
5. Format timestamps (relative or absolute)
6. Build message blocks using Slack Block Kit

#### Step 3.2.4: Implement Interactive Buttons
1. Create action buttons using Slack Block Kit:
   - "Acknowledge" button
   - "Snooze 1h" button
   - "Resolve" button
2. Set button action IDs:
   - `ack_{group_id}`
   - `snooze_{group_id}`
   - `resolve_{group_id}`
3. Include group_id in button value for callback
4. Style buttons appropriately (primary for critical)
5. Add confirmation dialogs if needed

#### Step 3.2.5: Implement Channel Mentions
1. Check alert severity
2. Add `@here` mention for high/critical alerts
3. Add `@channel` mention for critical alerts (optional, configurable)
4. Include mention in message text
5. Make mentions configurable per workspace

#### Step 3.2.6: Implement Message Sending
1. Create method to send message to Slack channel
2. Use `chat.postMessage` Slack API method
3. Include formatted message blocks
4. Include interactive buttons
5. Handle Slack API errors:
   - Invalid token
   - Channel not found
   - Bot not in channel
   - Rate limiting
6. Return message timestamp (ts) for updates

#### Step 3.2.7: Integrate with Queue System
1. Create BullMQ job for notification sending
2. Define job data structure:
   - workspace_id
   - alert_group_id
   - channel_id
   - message data
3. Create queue processor for notifications
4. Process jobs from `notifications` queue
5. Handle job retries on failure
6. Set up exponential backoff for retries
7. Configure max retry attempts

#### Step 3.2.8: Implement Retry Logic
1. Configure retry strategy:
   - Initial delay: 1 second
   - Max delay: 60 seconds
   - Exponential backoff multiplier: 2
   - Max retries: 5
2. Handle different error types:
   - Transient errors (rate limits, network) → retry
   - Permanent errors (invalid token, channel not found) → fail
3. Log retry attempts
4. Track retry metrics

#### Step 3.2.9: Implement Message Updates
1. Create method to update existing Slack message
2. Use `chat.update` Slack API method
3. Update message when alert status changes
4. Update button states (disable after action)
5. Update message text to reflect new status
6. Handle message not found errors

#### Step 3.2.10: Add Notification Error Handling
1. Handle Slack API errors gracefully
2. Categorize errors:
   - Authentication errors (token expired)
   - Authorization errors (bot not in channel)
   - Rate limit errors
   - Network errors
   - Invalid channel errors
3. Log errors with context
4. Update integration status on persistent errors
5. Notify workspace admins of integration issues

#### Step 3.2.11: Implement Notification Batching (Optional)
1. Evaluate if batching is needed (multiple alerts to same channel)
2. If yes, implement batch message formatting
3. Group alerts by channel
4. Send single message with multiple alerts
5. Optimize for Slack message limits

#### Step 3.2.12: Add Notification Metrics
1. Track notification metrics:
   - Messages sent per hour
   - Success rate
   - Failure rate by error type
   - Average send latency
   - Retry rate
2. Log metrics for monitoring
3. Create dashboards for notification health

#### Step 3.2.13: Create Notification Tests
1. Create unit tests for message formatting
2. Test with different alert severities
3. Test button creation
4. Test channel mentions
5. Create integration tests with mock Slack API
6. Test retry logic
7. Test error handling

### Acceptance Criteria
- [ ] Slack WebClient is initialized correctly
- [ ] Messages are formatted with all required information
- [ ] Interactive buttons are included in messages
- [ ] Channel mentions work for high/critical alerts
- [ ] Messages are sent to Slack channels successfully
- [ ] Queue integration works for async sending
- [ ] Retry logic handles transient failures
- [ ] Message updates work correctly
- [ ] Error handling is comprehensive
- [ ] Notification service has test coverage

---

## Task 3.3: Slack Interactive Actions

### Objective
Handle user interactions from Slack message buttons (ACK, Snooze, Resolve) and update alert status accordingly, then update the Slack message to reflect the change.

### Step-by-Step Execution

#### Step 3.3.1: Configure Slack Interactive Components
1. Go to Slack app settings → "Interactivity"
2. Enable Interactivity
3. Set Request URL:
   - Development: `http://localhost:3000/webhooks/slack/actions`
   - Production: `https://yourdomain.com/webhooks/slack/actions`
4. Save settings
5. Note: URL must be publicly accessible (use ngrok for local dev)

#### Step 3.3.2: Implement Interactive Endpoint
1. Create `POST /webhooks/slack/actions` endpoint
2. Configure route in webhook controller
3. Accept JSON payload from Slack
4. Verify Slack request signature (security)
5. Parse interactive payload
6. Return 200 OK immediately (Slack requires quick response)

#### Step 3.3.3: Implement Signature Verification
1. Extract signature from request headers (`X-Slack-Signature`)
2. Extract timestamp from headers (`X-Slack-Request-Timestamp`)
3. Verify timestamp is recent (prevent replay attacks)
4. Build signature base string:
   - `v0:{timestamp}:{request_body}`
5. Compute HMAC-SHA256 with signing secret
6. Compare computed signature with received signature
7. Reject requests with invalid signatures
8. Log signature verification failures

#### Step 3.3.4: Parse Interactive Payload
1. Parse JSON payload from Slack
2. Extract payload type:
   - `block_actions` - Button clicks
   - `message_actions` - Message shortcuts (if implemented)
3. Extract action details:
   - Action ID
   - Button value (contains group_id)
   - User information
   - Channel information
   - Message timestamp
4. Validate payload structure
5. Handle different payload types

#### Step 3.3.5: Implement Acknowledge Action
1. Extract group_id from button value
2. Verify user has permission (workspace member)
3. Update AlertGroup:
   - Set status to "ack"
   - Set assignee_user_id (if tracking)
   - Update updated_at timestamp
4. Log acknowledgment
5. Update Slack message to show acknowledged status
6. Return success response

#### Step 3.3.6: Implement Snooze Action
1. Extract group_id from button value
2. Verify user has permission
3. Calculate snooze until timestamp (1 hour from now, or configurable)
4. Update AlertGroup:
   - Set status to "snoozed"
   - Set snooze_until timestamp (if field exists)
   - Set assignee_user_id
   - Update updated_at
5. Log snooze action
6. Update Slack message to show snoozed status
7. Schedule unsnooze job (optional, for auto-unsnooze)
8. Return success response

#### Step 3.3.7: Implement Resolve Action
1. Extract group_id from button value
2. Verify user has permission
3. Update AlertGroup:
   - Set status to "resolved"
   - Set assignee_user_id
   - Update updated_at
4. Log resolution
5. Update Slack message to show resolved status
6. Disable all buttons (they're no longer actionable)
7. Return success response

#### Step 3.3.8: Implement Message Updates
1. Create method to update Slack message after action
2. Use `chat.update` Slack API method
3. Update message blocks:
   - Change status indicator
   - Update button states (disable or remove)
   - Add acknowledgment message
   - Show who performed the action
4. Handle message update errors gracefully
5. Log update attempts

#### Step 3.3.9: Add Permission Checking
1. Verify user is member of workspace
2. Check if user has required role (if RBAC applies)
3. Verify workspace has Slack integration connected
4. Return error if permission denied
5. Log permission denials

#### Step 3.3.10: Implement Error Responses
1. Handle errors gracefully
2. Return error message to Slack user (ephemeral message)
3. Log all errors with context
4. Handle cases where:
   - Group not found
   - Integration not connected
   - Permission denied
   - Database errors
5. Provide user-friendly error messages

#### Step 3.3.11: Add Action Logging
1. Log all interactive actions:
   - Action type
   - User who performed action
   - Group ID
   - Timestamp
   - Result (success/failure)
2. Track action metrics:
   - Actions per hour
   - Most common actions
   - Action success rate
3. Create audit trail

#### Step 3.3.12: Handle Async Processing
1. Process actions asynchronously (if needed)
2. Queue action processing job
3. Return immediate response to Slack
4. Process action in background
5. Update message after processing
6. Handle job failures

#### Step 3.3.13: Create Action Tests
1. Create unit tests for action parsing
2. Test each action type (ACK, Snooze, Resolve)
3. Test permission checking
4. Test error handling
5. Create integration tests with mock Slack payloads
6. Test signature verification
7. Test message updates

### Acceptance Criteria
- [ ] Interactive endpoint receives Slack payloads
- [ ] Signature verification works correctly
- [ ] Acknowledge action updates alert status
- [ ] Snooze action updates alert status
- [ ] Resolve action updates alert status
- [ ] Slack messages are updated after actions
- [ ] Permission checking works
- [ ] Error handling is comprehensive
- [ ] Actions are logged
- [ ] Interactive actions service has test coverage

---

## Task 3.4: Notification Logging

### Objective
Track all notification attempts (successful and failed) to monitor delivery health, debug issues, and provide visibility into notification reliability.

### Step-by-Step Execution

#### Step 3.4.1: Review NotificationLog Schema
1. Review NotificationLog table schema
2. Verify all required fields:
   - id
   - workspace_id
   - target (SLACK)
   - target_ref (channel_id)
   - alert_group_id
   - status (sent/failed)
   - error_message
   - sent_at
3. Check foreign key relationships
4. Verify indexes are created
5. Add any missing fields if needed

#### Step 3.4.2: Create Notification Log Service
1. Create `apps/api/src/notifications/notification-log.service.ts`
2. Create notification log service class
3. Inject database service
4. Inject logger
5. Set up service as NestJS provider

#### Step 3.4.3: Implement Log Creation
1. Create method to log notification attempt
2. Create NotificationLog entry with:
   - workspace_id
   - target: "SLACK"
   - target_ref: channel_id
   - alert_group_id
   - status: "sent" or "failed"
   - error_message: null or error details
   - sent_at: current timestamp
3. Save to database
4. Handle database errors
5. Return created log entry

#### Step 3.4.4: Integrate with Notification Service
1. Update notification service to log all attempts
2. Log before sending notification
3. Log after successful send
4. Log after failed send (with error message)
5. Include relevant context in logs
6. Ensure logging doesn't block notification sending

#### Step 3.4.5: Implement Log Retrieval Methods
1. Create method to get logs by workspace
2. Create method to get logs by alert group
3. Create method to get logs by channel
4. Add filtering:
   - By status (sent/failed)
   - By date range
   - By target
5. Implement pagination
6. Add sorting (newest first)

#### Step 3.4.6: Implement Log Statistics
1. Create method to get notification statistics:
   - Total notifications sent
   - Total notifications failed
   - Success rate
   - Failure rate by error type
   - Notifications per channel
   - Notifications per time period
2. Calculate metrics efficiently
3. Cache statistics if needed
4. Return formatted statistics

#### Step 3.4.7: Add Error Message Categorization
1. Categorize error messages:
   - Authentication errors
   - Authorization errors
   - Rate limit errors
   - Network errors
   - Invalid channel errors
   - Unknown errors
2. Store error category in log (if field exists)
3. Use categorization for statistics
4. Help identify common issues

#### Step 3.4.8: Implement Log Cleanup
1. Create method to clean up old logs
2. Archive or delete logs older than X days (configurable)
3. Run cleanup as scheduled job
4. Keep recent logs for debugging
5. Archive old logs if needed
6. Document retention policy

#### Step 3.4.9: Create Notification Health Endpoint
1. Create `GET /api/notifications/health` endpoint
2. Return notification health metrics:
   - Last successful notification
   - Last failed notification
   - Success rate (last 24h)
   - Failure rate (last 24h)
   - Active integrations
   - Recent errors
3. Format response for dashboard display
4. Cache health data if needed

#### Step 3.4.10: Add Log Querying API
1. Create `GET /api/notifications/logs` endpoint
2. Support query parameters:
   - workspace_id (from context)
   - alert_group_id (optional)
   - channel_id (optional)
   - status (optional)
   - start_date (optional)
   - end_date (optional)
   - page, limit (pagination)
3. Return paginated log results
4. Include statistics in response
5. Add proper error handling

#### Step 3.4.11: Implement Log Monitoring
1. Set up alerts for high failure rates
2. Monitor notification success rate
3. Alert on integration failures
4. Track notification latency
5. Create monitoring dashboards
6. Set up automated health checks

#### Step 3.4.12: Create Log Tests
1. Create unit tests for log service
2. Test log creation (success and failure)
3. Test log retrieval methods
4. Test statistics calculation
5. Test log cleanup
6. Create integration tests

### Acceptance Criteria
- [ ] NotificationLog entries are created for all attempts
- [ ] Success and failure are logged correctly
- [ ] Error messages are captured
- [ ] Log retrieval methods work
- [ ] Statistics are calculated correctly
- [ ] Health endpoint returns accurate data
- [ ] Log querying API works
- [ ] Log cleanup runs successfully
- [ ] Notification logging service has test coverage

---

## Integration with Alert Processing Pipeline

### Objective
Connect the notification system to the alert processing pipeline created in Phase 2, so alerts automatically trigger notifications when routing rules match.

### Step-by-Step Execution

#### Step 4.1: Update Alert Processor
1. Review alert processor from Phase 2
2. Add notification queuing to processor
3. After alert is grouped and stored:
   - Evaluate routing rules (placeholder for Phase 4)
   - If rules match, queue notification job
4. Pass alert group data to notification queue
5. Log notification queuing

#### Step 4.2: Create Notification Queue Job
1. Define notification job data structure
2. Include:
   - workspace_id
   - alert_group_id
   - channel_id (from routing rule)
   - notification type
3. Create job processor
4. Process jobs from queue
5. Call notification service to send message
6. Log notification result

#### Step 4.3: Implement Basic Routing (Temporary)
1. Create simple routing logic (temporary, until Phase 4):
   - Get default channel from workspace settings
   - Or use first available channel
   - Route all alerts to default channel
2. This will be replaced with full routing rules in Phase 4
3. Document temporary routing behavior

### Acceptance Criteria
- [ ] Alert processor queues notifications
- [ ] Notification jobs are processed
- [ ] Notifications are sent when alerts are created
- [ ] Basic routing works (temporary)

---

## Phase 3 Completion Checklist

### Slack OAuth Integration
- [ ] Slack app is created and configured
- [ ] OAuth flow works end-to-end
- [ ] Bot tokens are encrypted and stored
- [ ] Integration status is tracked
- [ ] Frontend shows connection status
- [ ] Disconnection works

### Slack Notification Service
- [ ] Messages are formatted correctly
- [ ] Interactive buttons are included
- [ ] Channel mentions work
- [ ] Messages are sent successfully
- [ ] Queue integration works
- [ ] Retry logic handles failures
- [ ] Error handling is comprehensive

### Slack Interactive Actions
- [ ] Interactive endpoint receives payloads
- [ ] Signature verification works
- [ ] ACK action updates alert status
- [ ] Snooze action updates alert status
- [ ] Resolve action updates alert status
- [ ] Messages are updated after actions
- [ ] Permission checking works

### Notification Logging
- [ ] All notification attempts are logged
- [ ] Success and failure are tracked
- [ ] Error messages are captured
- [ ] Statistics are calculated
- [ ] Health endpoint works
- [ ] Log querying works

### Integration
- [ ] Alert processor queues notifications
- [ ] Notifications are sent automatically
- [ ] End-to-end flow works

---

## End-to-End Testing

### Complete Flow Test
1. Connect Slack workspace via OAuth
2. Trigger test alert from Sentry (or send test webhook)
3. Verify alert is processed and grouped
4. Verify notification is queued
5. Verify notification is sent to Slack channel
6. Verify message includes interactive buttons
7. Click "Acknowledge" button in Slack
8. Verify alert status is updated in database
9. Verify Slack message is updated
10. Verify notification log is created
11. Check notification health endpoint

### Error Scenario Tests
1. **Token Expired**: Test with expired token
2. **Bot Not in Channel**: Test sending to channel without bot
3. **Invalid Channel**: Test with non-existent channel
4. **Network Failure**: Test with network issues
5. **Rate Limiting**: Test with high notification volume
6. **User Denies OAuth**: Test OAuth denial flow

---

## Next Steps After Phase 3

Once Phase 3 is complete, you're ready to move to Phase 4: Routing Rules & Alert Hygiene, which will build upon this foundation to implement:
- Advanced routing rules engine
- Rule-based channel selection
- Escalation system
- Alert hygiene features (snooze, auto-close)

The basic notification system from Phase 3 will be enhanced in Phase 4 with intelligent routing based on alert properties.

---

## Troubleshooting Common Issues

### OAuth Flow Issues
- Verify Slack app credentials are correct
- Check redirect URL matches Slack app configuration
- Verify state parameter is valid
- Check token exchange is successful
- Review OAuth logs for errors

### Notification Sending Failures
- Verify bot token is valid and not expired
- Check bot is added to target channel
- Verify bot has required scopes
- Check Slack API rate limits
- Review notification service logs
- Test Slack API connection

### Interactive Actions Not Working
- Verify interactivity is enabled in Slack app
- Check request URL is correct and accessible
- Verify signature verification is working
- Check action payload structure
- Review interactive endpoint logs
- Test with Slack's interactive component tester

### Notification Logging Issues
- Verify NotificationLog table exists
- Check database connection
- Review log creation errors
- Verify log queries are optimized
- Check log cleanup job is running

---

## Security Considerations

### Token Security
- Always encrypt bot tokens at rest
- Use secure key management
- Rotate encryption keys periodically
- Never log tokens in plain text
- Use HTTPS for all API calls
- Implement token refresh if supported

### OAuth Security
- Validate state parameter to prevent CSRF
- Verify redirect URLs match configuration
- Use secure state encoding/encryption
- Implement state expiration
- Log OAuth attempts for security monitoring

### Signature Verification
- Always verify Slack request signatures
- Check timestamp to prevent replay attacks
- Use constant-time comparison for signatures
- Reject requests with invalid signatures
- Log signature verification failures

---

## Estimated Time Breakdown

- Task 3.1 (Slack OAuth Integration): 10-12 hours
- Task 3.2 (Slack Notification Service): 12-14 hours
- Task 3.3 (Slack Interactive Actions): 8-10 hours
- Task 3.4 (Notification Logging): 6-8 hours
- Integration with Alert Pipeline: 4-6 hours
- End-to-End Testing & Debugging: 8-10 hours

**Total Estimated Time**: 48-60 hours (approximately 1.5-2 weeks for one developer)

---

## Notes

- This phase focuses on Slack integration. Other notification channels (email, PagerDuty) can be added later.
- The notification format should be flexible to allow future enhancements.
- Interactive buttons are a key differentiator - ensure they work reliably.
- Notification logging is critical for debugging production issues.
- Test with real Slack workspaces early to catch integration issues.
- Consider rate limits when designing notification batching.
- Security is paramount - always encrypt tokens and verify signatures.

