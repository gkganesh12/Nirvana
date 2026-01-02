# Phase 2: Core Alert Processing - Execution Plan

## Overview

Phase 2 implements the core alert processing functionality for SignalCraft. This phase focuses on receiving alerts from Sentry, normalizing them into a consistent format, deduplicating similar alerts, storing them efficiently, and processing them through a pipeline that will eventually trigger notifications.

**Timeline**: Week 3-4  
**Prerequisites**: Phase 1 must be completed (database, authentication, backend/frontend foundation, queue system)  
**Goal**: Build a working alert ingestion and processing system that can receive Sentry webhooks, normalize alerts, group duplicates, and store them for further processing.

---

## Prerequisites

Before starting Phase 2, ensure Phase 1 is complete:
- [ ] Monorepo structure is set up
- [ ] Database schema includes AlertEvent and AlertGroup tables
- [ ] Backend API foundation is working
- [ ] Authentication and workspace context are functional
- [ ] Queue system (BullMQ) is set up and running
- [ ] You have access to a Sentry account for testing webhooks

---

## Task 2.1: Webhook Ingestion

### Objective
Create a secure, reliable webhook endpoint that can receive and validate Sentry alert payloads, handle duplicates, and process them efficiently.

### Step-by-Step Execution

#### Step 2.1.1: Research Sentry Webhook Format
1. Review Sentry webhook documentation
2. Identify webhook payload structure
3. Document all available fields in Sentry payload
4. Identify signature/authentication mechanism (if available)
5. Create sample payload examples for testing
6. Document webhook event types (issue created, resolved, etc.)

#### Step 2.1.2: Create Webhook Module Structure
1. Create `apps/api/src/webhooks/` directory
2. Create webhook controller module
3. Create webhook service module
4. Set up module imports and dependencies
5. Create DTOs for webhook payload validation

#### Step 2.1.3: Implement Webhook Endpoint
1. Create `POST /webhooks/sentry` endpoint
2. Configure route in NestJS controller
3. Set up endpoint to accept JSON payloads
4. Add workspace identification logic (from webhook config or header)
5. Implement basic request logging
6. Return appropriate HTTP status codes

#### Step 2.1.4: Implement Payload Validation
1. Create Sentry webhook payload DTO
2. Define required fields validation
3. Set up validation decorators
4. Validate payload structure matches Sentry format
5. Handle malformed payloads gracefully
6. Return clear error messages for invalid payloads

#### Step 2.1.5: Implement Signature Verification
1. Research Sentry webhook signature mechanism
2. Implement signature verification function
3. Extract signature from request headers
4. Verify signature against payload
5. Reject requests with invalid signatures
6. Log signature verification failures
7. Handle cases where signature is optional

#### Step 2.1.6: Implement Idempotency Check
1. Extract `source_event_id` from Sentry payload
2. Check if event with same `source_event_id` already exists in database
3. Query AlertEvent table by `source_event_id` and `workspace_id`
4. If duplicate found, return early with success status
5. Log duplicate detection for monitoring
6. Ensure idempotency check is atomic

#### Step 2.1.7: Implement Rate Limiting
1. Install rate limiting library (e.g., `@nestjs/throttler`)
2. Configure rate limiting per workspace
3. Set appropriate rate limits (e.g., 100 requests per minute per workspace)
4. Implement rate limit headers in response
5. Handle rate limit exceeded errors gracefully
6. Log rate limit violations
7. Configure different limits for different endpoints if needed

#### Step 2.1.8: Implement Request Logging
1. Create webhook request logging middleware
2. Log incoming webhook requests with:
   - Timestamp
   - Workspace ID
   - Payload size
   - Source IP (if available)
   - Response status
3. Sanitize sensitive data from logs
4. Set up structured logging format
5. Configure log levels appropriately

#### Step 2.1.9: Add Error Handling
1. Create custom exceptions for webhook errors
2. Handle different error scenarios:
   - Invalid payload
   - Invalid signature
   - Rate limit exceeded
   - Database errors
   - Processing errors
3. Return appropriate HTTP status codes
4. Include error details in response (for debugging)
5. Log all errors with context

#### Step 2.1.10: Create Webhook Test Utilities
1. Create test payload generator
2. Create webhook testing script
3. Document how to test webhook endpoint
4. Create mock Sentry webhook sender
5. Set up integration test fixtures

### Acceptance Criteria
- [ ] Webhook endpoint accepts POST requests at `/webhooks/sentry`
- [ ] Payload validation rejects invalid Sentry payloads
- [ ] Signature verification works (if Sentry supports it)
- [ ] Duplicate events are detected and ignored
- [ ] Rate limiting prevents abuse
- [ ] All requests are logged appropriately
- [ ] Error handling returns appropriate status codes
- [ ] Webhook can be tested with sample Sentry payloads

---

## Task 2.2: Alert Normalization

### Objective
Convert Sentry-specific alert payloads into a normalized internal format that can be extended to support other monitoring tools in the future.

### Step-by-Step Execution

#### Step 2.2.1: Define NormalizedAlert Schema
1. Review NormalizedAlert schema from Software_Doc.md
2. Create TypeScript interface/type for NormalizedAlert
3. Define all required fields:
   - source (string)
   - source_event_id (string)
   - service/project (string)
   - env (string)
   - severity (enum: info/low/med/high/critical)
   - fingerprint (string)
   - title (string)
   - description (string)
   - tags (object/JSON)
   - occurred_at (timestamp)
   - link (string - deep link back to Sentry)
4. Place schema in shared package for reuse
5. Document each field's purpose and format

#### Step 2.2.2: Create Normalization Service
1. Create `apps/api/src/alerts/normalization.service.ts`
2. Create normalization service class
3. Inject dependencies (logger, config)
4. Create main normalization method
5. Set up service as NestJS provider

#### Step 2.2.3: Implement Source Extraction
1. Extract source identifier (always "SENTRY" for now)
2. Store source as constant or enum value
3. Ensure source is consistent across all alerts

#### Step 2.2.4: Implement Source Event ID Extraction
1. Extract unique event ID from Sentry payload
2. Map Sentry event ID field to `source_event_id`
3. Validate event ID exists and is not empty
4. Handle cases where event ID might be missing

#### Step 2.2.5: Implement Project/Service Extraction
1. Extract project name from Sentry payload
2. Map Sentry project field to normalized `service/project`
3. Handle project name normalization (trim, lowercase if needed)
4. Set default project name if missing
5. Validate project name format

#### Step 2.2.6: Implement Environment Extraction
1. Extract environment from Sentry payload
2. Map Sentry environment field to normalized `env`
3. Normalize environment values (prod, staging, dev, etc.)
4. Handle case variations (Prod, PROD, production → prod)
5. Set default environment if missing
6. Validate environment is one of expected values

#### Step 2.2.7: Implement Severity Mapping
1. Research Sentry severity/level system
2. Create severity mapping function
3. Map Sentry levels to internal severity:
   - Sentry "fatal" → "critical"
   - Sentry "error" → "high"
   - Sentry "warning" → "med"
   - Sentry "info" → "low"
   - Sentry "debug" → "info"
4. Handle unknown severity levels
5. Consider environment-based severity adjustment (prod errors → higher severity)
6. Document severity mapping logic

#### Step 2.2.8: Implement Fingerprint Extraction
1. Extract fingerprint from Sentry payload
2. Understand Sentry fingerprinting mechanism
3. Map Sentry fingerprint to normalized `fingerprint`
4. Generate fingerprint if Sentry doesn't provide one
5. Ensure fingerprint is consistent for similar errors
6. Validate fingerprint format

#### Step 2.2.9: Implement Title and Description Extraction
1. Extract error title from Sentry payload
2. Map to normalized `title` field
3. Extract error message/description
4. Map to normalized `description` field
5. Handle missing title/description gracefully
6. Truncate long descriptions if needed
7. Sanitize HTML/special characters if present

#### Step 2.2.10: Implement Tags Extraction
1. Extract tags from Sentry payload
2. Normalize tag structure
3. Convert tags to JSON format
4. Preserve all tag key-value pairs
5. Validate tag structure
6. Handle missing or empty tags

#### Step 2.2.11: Implement Occurred At Extraction
1. Extract timestamp from Sentry payload
2. Parse Sentry timestamp format
3. Convert to standardized timestamp format
4. Handle timezone conversions if needed
5. Validate timestamp is valid
6. Use current time as fallback if missing

#### Step 2.2.12: Implement Deep Link Generation
1. Extract Sentry organization and project identifiers
2. Construct Sentry deep link URL
3. Format: `https://sentry.io/organizations/{org}/issues/{issue_id}/`
4. Store link in normalized alert
5. Handle cases where link cannot be constructed
6. Validate URL format

#### Step 2.2.13: Add Normalization Error Handling
1. Handle missing required fields gracefully
2. Log normalization warnings for missing optional fields
3. Throw errors for critical missing fields
4. Provide default values where appropriate
5. Document all default values and fallbacks

#### Step 2.2.14: Create Normalization Tests
1. Create unit tests for normalization service
2. Test with various Sentry payload formats
3. Test edge cases (missing fields, null values)
4. Test severity mapping with all levels
5. Test environment normalization
6. Verify all fields are correctly mapped

### Acceptance Criteria
- [ ] NormalizedAlert schema is defined and documented
- [ ] All Sentry payload fields are correctly mapped
- [ ] Severity mapping works for all Sentry levels
- [ ] Environment values are normalized consistently
- [ ] Fingerprint extraction is reliable
- [ ] Deep links are correctly generated
- [ ] Missing fields are handled gracefully
- [ ] Normalization service has comprehensive test coverage
- [ ] Normalized alerts are ready for deduplication

---

## Task 2.3: Alert Deduplication Engine

### Objective
Implement intelligent alert grouping that reduces noise by combining similar alerts into single incidents, preventing alert fatigue.

### Step-by-Step Execution

#### Step 2.3.1: Design Grouping Algorithm
1. Review grouping requirements from Software_Doc.md
2. Understand group key formula: `hash(source + project + env + fingerprint)`
3. Design deduplication window logic (30-60 minutes)
4. Plan for group creation and update scenarios
5. Consider edge cases (window boundaries, timezone issues)

#### Step 2.3.2: Create Grouping Service
1. Create `apps/api/src/alerts/grouping.service.ts`
2. Create grouping service class
3. Inject database service and logger
4. Set up service as NestJS provider
5. Create main grouping method interface

#### Step 2.3.3: Implement Group Key Generation
1. Create function to generate group key
2. Concatenate: source + project + env + fingerprint
3. Hash the concatenated string (use SHA-256 or similar)
4. Ensure consistent hashing (same input = same hash)
5. Handle null/undefined values in components
6. Normalize components before hashing (trim, lowercase if needed)
7. Test hash consistency

#### Step 2.3.4: Implement Deduplication Window Logic
1. Define deduplication window (30-60 minutes, configurable)
2. Create function to check if alert is within window
3. Calculate time difference between alert and existing group
4. Compare against window threshold
5. Handle timezone considerations
6. Make window configurable via environment variable

#### Step 2.3.5: Implement Group Lookup
1. Create database query to find existing group
2. Query AlertGroup by:
   - workspace_id
   - group_key
   - status (only open/ack groups, not resolved)
3. Check if group exists within deduplication window
4. Optimize query with proper indexes
5. Handle database errors gracefully

#### Step 2.3.6: Implement Group Creation
1. Create function to create new AlertGroup
2. Set all required fields:
   - workspace_id
   - group_key
   - title (from normalized alert)
   - severity (from normalized alert)
   - environment (from normalized alert)
   - status (default: "open")
   - first_seen_at (current timestamp)
   - last_seen_at (current timestamp)
   - count (initial: 1)
3. Set optional fields:
   - assignee_user_id (null initially)
   - runbook_url (null initially)
4. Save to database
5. Return created group

#### Step 2.3.7: Implement Group Update
1. Create function to update existing AlertGroup
2. Increment count field
3. Update last_seen_at to current timestamp
4. Update severity if new alert has higher severity
5. Update title if needed
6. Use database transaction for atomic update
7. Handle concurrent update scenarios
8. Return updated group

#### Step 2.3.8: Implement Upsert Logic
1. Combine lookup, create, and update into single method
2. Use database upsert if supported (PostgreSQL INSERT ... ON CONFLICT)
3. Or implement transaction-based upsert:
   - Try to find existing group
   - If found and within window: update
   - If found but outside window: create new
   - If not found: create new
4. Ensure atomicity to prevent race conditions
5. Handle edge cases (concurrent requests)

#### Step 2.3.9: Add Severity Escalation Logic
1. Implement severity comparison function
2. Compare new alert severity with existing group severity
3. If new severity is higher, update group severity
4. Consider environment-based escalation (prod errors → higher severity)
5. Consider count-based escalation (rapid spikes → higher severity)
6. Document escalation rules

#### Step 2.3.10: Implement Group Status Handling
1. Only group alerts into open or acknowledged groups
2. Skip resolved or snoozed groups
3. Create new group if existing group is resolved
4. Handle snoozed groups (create new or update based on snooze expiry)
5. Document status-based grouping behavior

#### Step 2.3.11: Add Grouping Metrics
1. Track grouping statistics:
   - Total alerts processed
   - New groups created
   - Existing groups updated
   - Deduplication ratio
2. Log grouping decisions
3. Create metrics for monitoring
4. Track grouping performance

#### Step 2.3.12: Optimize Database Queries
1. Ensure indexes exist on:
   - group_key
   - workspace_id
   - status
   - last_seen_at (for window queries)
2. Optimize lookup query performance
3. Use database connection pooling
4. Monitor query execution time
5. Add query logging in development

#### Step 2.3.13: Create Grouping Tests
1. Create unit tests for group key generation
2. Test deduplication window logic
3. Test group creation scenarios
4. Test group update scenarios
5. Test upsert with concurrent requests
6. Test severity escalation
7. Test status-based grouping
8. Create integration tests with database

### Acceptance Criteria
- [ ] Group key generation is consistent and reliable
- [ ] Deduplication window logic works correctly
- [ ] New groups are created when appropriate
- [ ] Existing groups are updated when within window
- [ ] Groups outside window create new groups
- [ ] Severity escalation works correctly
- [ ] Status-based grouping behaves as expected
- [ ] Database queries are optimized with indexes
- [ ] Grouping service has comprehensive test coverage
- [ ] Concurrent requests are handled safely

---

## Task 2.4: Alert Storage

### Objective
Efficiently store alert events and groups in the database with proper relationships, indexes, and query optimization.

### Step-by-Step Execution

#### Step 2.4.1: Review Database Schema
1. Review AlertEvent table schema
2. Review AlertGroup table schema
3. Verify all required fields are present
4. Check foreign key relationships
5. Verify indexes are created
6. Review data types and constraints

#### Step 2.4.2: Create Alert Storage Service
1. Create `apps/api/src/alerts/alerts.service.ts`
2. Create alerts service class
3. Inject database client/service
4. Inject logger
5. Set up service as NestJS provider

#### Step 2.4.3: Implement AlertEvent Storage
1. Create method to save AlertEvent
2. Map normalized alert to AlertEvent fields:
   - workspace_id
   - source
   - source_event_id
   - project
   - environment
   - severity
   - fingerprint
   - tags_json (serialize tags object)
   - title
   - message (description)
   - occurred_at
   - received_at (current timestamp)
   - payload_json (store raw Sentry payload)
3. Handle JSON serialization for tags and payload
4. Validate all required fields before saving
5. Use database transaction for atomicity
6. Return saved AlertEvent

#### Step 2.4.4: Implement AlertGroup Storage
1. Create method to save AlertGroup (used by grouping service)
2. Create method to update AlertGroup
3. Ensure all fields are properly set
4. Handle JSON fields if any
5. Use database transactions
6. Return saved/updated group

#### Step 2.4.5: Implement Event-Group Linking
1. Create relationship between AlertEvent and AlertGroup
2. Add alert_group_id foreign key to AlertEvent (if not in schema, add migration)
3. Link event to group when saving
4. Update linking when group is created/updated
5. Ensure referential integrity

#### Step 2.4.6: Implement Alert Retrieval Methods
1. Create method to get AlertEvent by ID
2. Create method to get AlertGroup by ID
3. Create method to get events by group ID
4. Create method to get groups by workspace
5. Add filtering capabilities (status, severity, environment)
6. Implement pagination for large result sets
7. Optimize queries with proper joins

#### Step 2.4.7: Implement Query Optimization
1. Review and verify database indexes:
   - AlertEvent: workspace_id, source_event_id, alert_group_id
   - AlertGroup: workspace_id, group_key, status, environment
2. Create composite indexes for common queries
3. Analyze query performance
4. Optimize slow queries
5. Use database query planner to verify index usage

#### Step 2.4.8: Implement Data Validation
1. Validate workspace_id exists
2. Validate severity is valid enum value
3. Validate environment is valid
4. Validate timestamps are valid
5. Validate JSON fields are valid JSON
6. Return clear error messages for validation failures

#### Step 2.4.9: Implement Batch Operations
1. Create method to save multiple events in batch
2. Use database batch insert for performance
3. Handle batch errors gracefully
4. Implement batch size limits
5. Optimize batch operations

#### Step 2.4.10: Add Storage Error Handling
1. Handle database connection errors
2. Handle constraint violations (duplicate source_event_id)
3. Handle transaction failures
4. Log all storage errors with context
5. Return appropriate error responses
6. Implement retry logic for transient errors

#### Step 2.4.11: Implement Storage Metrics
1. Track storage operations:
   - Events saved per second
   - Groups created/updated
   - Average storage latency
   - Error rates
2. Log storage performance
3. Create monitoring dashboards

#### Step 2.4.12: Create Storage Tests
1. Create unit tests for storage methods
2. Test event saving with various data
3. Test group saving and updating
4. Test event-group linking
5. Test retrieval methods
6. Test error handling
7. Create integration tests with real database

### Acceptance Criteria
- [ ] AlertEvent records are saved correctly
- [ ] AlertGroup records are saved correctly
- [ ] Events are linked to groups properly
- [ ] All required fields are validated
- [ ] Database indexes are used effectively
- [ ] Queries are optimized for performance
- [ ] Error handling works correctly
- [ ] Batch operations are efficient
- [ ] Storage service has comprehensive test coverage
- [ ] Storage metrics are tracked

---

## Task 2.5: Alert Processing Pipeline

### Objective
Create a unified pipeline that orchestrates the entire alert processing flow from webhook receipt to final storage and notification queuing.

### Step-by-Step Execution

#### Step 2.5.1: Design Pipeline Architecture
1. Review complete alert processing flow
2. Design pipeline stages:
   - Webhook receipt
   - Payload validation
   - Idempotency check
   - Normalization
   - Deduplication/grouping
   - Storage
   - Routing rules evaluation (prepare for Phase 4)
   - Notification queuing (prepare for Phase 3)
3. Identify error handling points
4. Plan for async processing if needed
5. Design pipeline to be extensible

#### Step 2.5.2: Create Alert Processor Service
1. Create `apps/api/src/alerts/alert-processor.service.ts`
2. Create processor service class
3. Inject all required services:
   - Webhook service
   - Normalization service
   - Grouping service
   - Storage service
   - Logger
4. Set up service as NestJS provider

#### Step 2.5.3: Implement Pipeline Entry Point
1. Create main process method that accepts Sentry payload
2. Accept workspace_id as parameter
3. Set up method signature and return type
4. Add comprehensive logging at entry point
5. Handle method errors

#### Step 2.5.4: Integrate Idempotency Check
1. Call idempotency check from processor
2. If duplicate found, return early with success
3. Log duplicate detection
4. Return appropriate response

#### Step 2.5.5: Integrate Normalization
1. Call normalization service from processor
2. Pass Sentry payload to normalization
3. Receive normalized alert
4. Handle normalization errors
5. Validate normalized alert structure
6. Log normalization completion

#### Step 2.5.6: Integrate Deduplication/Grouping
1. Call grouping service from processor
2. Pass normalized alert to grouping service
3. Receive AlertGroup (new or updated)
4. Handle grouping errors
5. Log grouping decision (new vs updated)
6. Track grouping metrics

#### Step 2.5.7: Integrate Storage
1. Save AlertEvent to database
2. Link event to AlertGroup
3. Update group if needed
4. Handle storage errors
5. Use database transaction for atomicity
6. Log storage completion

#### Step 2.5.8: Prepare Routing Rules Integration
1. Create placeholder for routing rules evaluation
2. Design interface for rules engine (to be implemented in Phase 4)
3. Pass AlertGroup to rules engine placeholder
4. Log rules evaluation step
5. Document integration point

#### Step 2.5.9: Prepare Notification Queuing
1. Create placeholder for notification queuing
2. Design interface for notification service (to be implemented in Phase 3)
3. Queue notification job if rules match (placeholder logic)
4. Log queuing step
5. Document integration point

#### Step 2.5.10: Implement Error Handling
1. Handle errors at each pipeline stage
2. Implement error recovery where possible
3. Log errors with full context
4. Return appropriate error responses
5. Implement error notifications (for critical failures)
6. Create error classification (recoverable vs non-recoverable)

#### Step 2.5.11: Implement Pipeline Metrics
1. Track pipeline performance:
   - Total processing time
   - Time per stage
   - Success/failure rates
   - Error rates by stage
2. Log pipeline metrics
3. Create monitoring dashboards
4. Set up alerts for pipeline failures

#### Step 2.5.12: Add Pipeline Logging
1. Add structured logging at each stage
2. Include relevant context in logs:
   - Workspace ID
   - Alert ID
   - Group ID
   - Processing time
   - Stage name
3. Use appropriate log levels
4. Sanitize sensitive data from logs

#### Step 2.5.13: Integrate with Webhook Endpoint
1. Update webhook controller to use processor
2. Call processor service from webhook endpoint
3. Handle processor response
4. Return appropriate HTTP status
5. Ensure error handling flows correctly

#### Step 2.5.14: Implement Async Processing (Optional)
1. Evaluate if async processing is needed
2. If yes, queue alert processing job
3. Create BullMQ job processor
4. Handle job retries
5. Monitor queue depth
6. Implement job prioritization if needed

#### Step 2.5.15: Create Pipeline Tests
1. Create unit tests for processor service
2. Test complete pipeline flow
3. Test error handling at each stage
4. Test idempotency
5. Test normalization integration
6. Test grouping integration
7. Test storage integration
8. Create integration tests with real services

### Acceptance Criteria
- [ ] Pipeline processes alerts end-to-end
- [ ] All stages are integrated correctly
- [ ] Idempotency check works in pipeline
- [ ] Normalization is called correctly
- [ ] Grouping is called correctly
- [ ] Storage is called correctly
- [ ] Error handling works at all stages
- [ ] Pipeline metrics are tracked
- [ ] Logging is comprehensive
- [ ] Webhook endpoint uses processor
- [ ] Pipeline has comprehensive test coverage

---

## Phase 2 Completion Checklist

### Webhook Ingestion
- [ ] Webhook endpoint receives Sentry payloads
- [ ] Payload validation works
- [ ] Signature verification works (if supported)
- [ ] Idempotency prevents duplicates
- [ ] Rate limiting is functional
- [ ] Request logging is comprehensive

### Alert Normalization
- [ ] NormalizedAlert schema is defined
- [ ] All Sentry fields are mapped correctly
- [ ] Severity mapping works
- [ ] Environment normalization works
- [ ] Deep links are generated
- [ ] Normalization handles edge cases

### Alert Deduplication
- [ ] Group key generation is consistent
- [ ] Deduplication window logic works
- [ ] Groups are created when needed
- [ ] Groups are updated when within window
- [ ] Severity escalation works
- [ ] Database queries are optimized

### Alert Storage
- [ ] AlertEvents are saved correctly
- [ ] AlertGroups are saved correctly
- [ ] Events are linked to groups
- [ ] Database indexes are effective
- [ ] Error handling works
- [ ] Storage is performant

### Alert Processing Pipeline
- [ ] Pipeline orchestrates all stages
- [ ] All services are integrated
- [ ] Error handling is comprehensive
- [ ] Metrics are tracked
- [ ] Logging is detailed
- [ ] Tests cover all scenarios

---

## Integration Testing

### End-to-End Test Scenario
1. Send test Sentry webhook to endpoint
2. Verify webhook is received and validated
3. Verify alert is normalized correctly
4. Verify alert is grouped (or new group created)
5. Verify alert is stored in database
6. Verify event is linked to group
7. Verify pipeline completes successfully
8. Verify metrics are updated
9. Verify logs are created

### Test Multiple Scenarios
1. **New Alert**: First alert for a fingerprint → creates new group
2. **Duplicate Alert**: Same fingerprint within window → updates group
3. **Expired Window**: Same fingerprint outside window → creates new group
4. **Different Workspace**: Same fingerprint different workspace → creates separate group
5. **Invalid Payload**: Malformed payload → returns error
6. **Duplicate Event ID**: Same source_event_id → returns early (idempotent)

---

## Next Steps After Phase 2

Once Phase 2 is complete, you're ready to move to Phase 3: Integrations & Notifications, which will build upon this foundation to implement:
- Slack OAuth integration
- Slack notification sending
- Interactive Slack buttons (ACK/Snooze/Resolve)
- Notification logging

The alert processing pipeline created in Phase 2 will be extended in Phase 3 to actually send notifications when routing rules match.

---

## Troubleshooting Common Issues

### Webhook Not Receiving Payloads
- Verify endpoint URL is correct
- Check Sentry webhook configuration
- Verify network connectivity
- Check firewall rules
- Review webhook logs for errors

### Normalization Failures
- Verify Sentry payload structure matches expectations
- Check for missing required fields
- Review normalization logs
- Test with sample payloads
- Verify field mappings are correct

### Grouping Not Working
- Verify group key generation is consistent
- Check deduplication window configuration
- Review database queries and indexes
- Check for timezone issues
- Verify group lookup logic

### Storage Performance Issues
- Review database indexes
- Check query execution plans
- Monitor database connection pool
- Review batch operation sizes
- Check for N+1 query problems

### Pipeline Errors
- Review error logs for specific stage
- Check service dependencies
- Verify database connectivity
- Review transaction handling
- Check for race conditions

---

## Estimated Time Breakdown

- Task 2.1 (Webhook Ingestion): 8-10 hours
- Task 2.2 (Alert Normalization): 10-12 hours
- Task 2.3 (Alert Deduplication): 10-12 hours
- Task 2.4 (Alert Storage): 6-8 hours
- Task 2.5 (Alert Processing Pipeline): 8-10 hours
- Integration Testing & Debugging: 6-8 hours

**Total Estimated Time**: 48-60 hours (approximately 1.5-2 weeks for one developer)

---

## Notes

- This phase focuses on core alert processing. Notifications and routing rules are prepared but not fully implemented.
- The normalization format is critical - it enables future integrations with other monitoring tools.
- Deduplication is a key differentiator - take time to get the grouping logic right.
- Performance is important - optimize database queries and indexes early.
- Comprehensive logging will help debug issues in production.
- Test with real Sentry webhooks as early as possible to catch integration issues.

