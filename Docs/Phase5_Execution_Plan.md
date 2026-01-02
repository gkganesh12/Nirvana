# Phase 5: Frontend Dashboard & UI - Execution Plan

## Overview

Phase 5 implements the complete frontend user interface for SignalCraft. This phase focuses on building the dashboard, alert management interfaces, integration management, and workspace settings that make SignalCraft usable and actionable for teams.

**Timeline**: Week 9-10  
**Prerequisites**: Phase 1, 2, 3, and 4 must be completed (foundation, alert processing, integrations, routing rules)  
**Goal**: Build a complete, user-friendly frontend that provides visibility into alerts, enables alert management, and allows configuration of integrations and workspace settings.

---

## Prerequisites

Before starting Phase 5, ensure previous phases are complete:
- [ ] Phase 1: Foundation & Infrastructure is complete
- [ ] Phase 2: Core Alert Processing is complete
- [ ] Phase 3: Integrations & Notifications is complete
- [ ] Phase 4: Routing Rules & Alert Hygiene is complete
- [ ] All backend APIs are functional
- [ ] Authentication and workspace context are working
- [ ] UI component library is set up

---

## Task 5.1: Overview Dashboard

### Objective
Create a comprehensive dashboard that provides at-a-glance metrics about alert activity, deduplication effectiveness, acknowledgment rates, and integration health.

### Step-by-Step Execution

#### Step 5.1.1: Design Dashboard Layout
1. Review dashboard requirements from Software_Doc.md
2. Design dashboard layout:
   - Header with key metrics (cards)
   - Charts section for trends
   - Tables for top sources
   - Integration health section
3. Plan responsive design (mobile, tablet, desktop)
4. Design metric cards layout
5. Plan chart placement and sizing

#### Step 5.1.2: Create Dashboard API Endpoint
1. Create `GET /api/dashboard/overview` endpoint
2. Calculate metrics:
   - Alerts last 24h (count, trend vs previous 24h)
   - Deduplication ratio (% of alerts grouped)
   - Acknowledgment rate (% of alerts acknowledged)
   - Top noisy sources (projects/environments)
   - Integration health status
3. Optimize queries for performance
4. Cache metrics if needed (Redis)
5. Return formatted metrics
6. Add error handling

#### Step 5.1.3: Implement Alerts Last 24h Metric
1. Query AlertGroup table:
   - Count groups created in last 24h
   - Count groups created in previous 24h
   - Calculate trend (increase/decrease percentage)
2. Query AlertEvent table:
   - Count events in last 24h
   - Count events in previous 24h
   - Calculate trend
3. Return both group and event counts
4. Format trend as percentage and direction

#### Step 5.1.4: Implement Deduplication Ratio Metric
1. Query AlertEvent and AlertGroup tables
2. Calculate:
   - Total events in last 24h
   - Total groups in last 24h
   - Deduplication ratio = (1 - groups/events) * 100
3. Calculate trend vs previous period
4. Return ratio and trend

#### Step 5.1.5: Implement Acknowledgment Rate Metric
1. Query AlertGroup table
2. Calculate:
   - Total groups in last 24h
   - Groups with status "ack" or "resolved"
   - Acknowledgment rate = (acked/total) * 100
3. Calculate trend vs previous period
4. Return rate and trend

#### Step 5.1.6: Implement Top Noisy Sources
1. Query AlertGroup table
2. Group by project and environment
3. Count groups per source
4. Order by count (descending)
5. Limit to top 10
6. Return source name, count, and trend
7. Include percentage of total

#### Step 5.1.7: Implement Integration Health Status
1. Query Integration table for workspace
2. For each integration:
   - Check connection status
   - Get last webhook received (from NotificationLog or Integration)
   - Calculate time since last webhook
   - Determine health status:
     - Healthy: connected and recent activity
     - Warning: connected but no recent activity
     - Error: disconnected or failed
3. Return integration health array

#### Step 5.1.8: Create Dashboard Page Component
1. Create `apps/web/app/dashboard/page.tsx`
2. Set up page structure
3. Fetch dashboard data from API
4. Handle loading states
5. Handle error states
6. Display data when loaded

#### Step 5.1.9: Create Metric Cards Component
1. Create reusable metric card component
2. Display:
   - Metric name
   - Current value
   - Trend indicator (up/down arrow)
   - Trend percentage
   - Optional chart sparkline
3. Style cards with appropriate colors
4. Make cards responsive
5. Add hover effects

#### Step 5.1.10: Implement Charts
1. Install charting library (recharts, chart.js, or similar)
2. Create alerts trend chart:
   - X-axis: time (last 24h, hourly buckets)
   - Y-axis: alert count
   - Line chart showing alerts over time
3. Create deduplication ratio chart:
   - Show ratio over time
   - Compare with previous period
4. Create acknowledgment rate chart:
   - Show rate over time
   - Compare with previous period
5. Style charts consistently
6. Make charts responsive

#### Step 5.1.11: Create Top Sources Table
1. Create table component for top sources
2. Display columns:
   - Source (project/environment)
   - Alert count
   - Percentage of total
   - Trend indicator
3. Add sorting capability
4. Style table appropriately
5. Make table responsive

#### Step 5.1.12: Create Integration Health Component
1. Create integration health display component
2. Show each integration:
   - Integration name/type
   - Health status badge (green/yellow/red)
   - Last activity timestamp
   - Connection status
3. Add refresh button
4. Add link to integration management page
5. Style health indicators

#### Step 5.1.13: Implement Auto-Refresh
1. Set up polling for dashboard data
2. Refresh every 30-60 seconds (configurable)
3. Show last updated timestamp
4. Pause refresh when page is not visible
5. Handle refresh errors gracefully
6. Add manual refresh button

#### Step 5.1.14: Add Dashboard Filters (Optional)
1. Add time range selector:
   - Last 24h (default)
   - Last 7 days
   - Last 30 days
   - Custom range
2. Update API to accept time range
3. Recalculate metrics for selected range
4. Update charts with new data

#### Step 5.1.15: Create Dashboard Tests
1. Test dashboard API endpoint
2. Test metric calculations
3. Test chart rendering
4. Test responsive design
5. Test auto-refresh
6. Test error handling

### Acceptance Criteria
- [ ] Dashboard API returns all required metrics
- [ ] Alerts last 24h metric is accurate
- [ ] Deduplication ratio is calculated correctly
- [ ] Acknowledgment rate is calculated correctly
- [ ] Top noisy sources are displayed
- [ ] Integration health is shown
- [ ] Charts render correctly
- [ ] Dashboard is responsive
- [ ] Auto-refresh works
- [ ] Dashboard has test coverage

---

## Task 5.2: Alert Inbox

### Objective
Create a comprehensive alert inbox that allows users to view, filter, sort, and manage alerts efficiently.

### Step-by-Step Execution

#### Step 5.2.1: Design Alert Inbox Layout
1. Review alert inbox requirements from Software_Doc.md
2. Design inbox layout:
   - Filters section (top)
   - Table view (main)
   - Pagination (bottom)
   - Action buttons
3. Plan table columns:
   - Time
   - Source
   - Project
   - Environment
   - Severity
   - Status
   - Count
   - Assignee
   - Actions
4. Design filter UI
5. Plan responsive design

#### Step 5.2.2: Create Alert Inbox API Endpoint
1. Create `GET /api/alert-groups` endpoint
2. Support query parameters:
   - workspace_id (from context)
   - environment (filter)
   - project (filter)
   - severity (filter)
   - status (filter)
   - tag (filter)
   - start_date (filter)
   - end_date (filter)
   - page (pagination)
   - limit (pagination)
   - sort_by (sorting)
   - sort_order (asc/desc)
3. Build database query with filters
4. Implement pagination
5. Implement sorting
6. Return paginated results with metadata

#### Step 5.2.3: Implement Filtering Logic
1. Parse filter parameters
2. Build WHERE clause conditions
3. Handle multiple filter combinations
4. Support tag filtering (JSON query)
5. Support date range filtering
6. Optimize queries with indexes
7. Return filtered results

#### Step 5.2.4: Implement Pagination
1. Calculate total count (with filters)
2. Calculate page offset
3. Limit results per page
4. Return pagination metadata:
   - Total count
   - Page number
   - Page size
   - Total pages
   - Has next/previous
5. Handle edge cases (empty results, invalid page)

#### Step 5.2.5: Implement Sorting
1. Support sorting by:
   - Time (last_seen_at, first_seen_at)
   - Severity
   - Status
   - Count
   - Project
   - Environment
2. Support ascending/descending order
3. Default sort: last_seen_at descending
4. Apply sorting in database query
5. Optimize with indexes

#### Step 5.2.6: Create Alert Inbox Page
1. Create `apps/web/app/alerts/page.tsx`
2. Set up page structure
3. Create state for filters, pagination, sorting
4. Fetch alerts from API
5. Handle loading states
6. Handle error states

#### Step 5.2.7: Create Filter Component
1. Create filter UI component
2. Add filter inputs:
   - Environment dropdown (multi-select)
   - Project dropdown (multi-select)
   - Severity dropdown (multi-select)
   - Status dropdown (multi-select)
   - Tag input
   - Date range picker
3. Add "Clear Filters" button
4. Add "Apply Filters" button
5. Show active filter count
6. Display active filters as chips/tags

#### Step 5.2.8: Create Alert Table Component
1. Create table component
2. Display alert groups in rows
3. Format each column:
   - Time: relative time (e.g., "2h ago") + absolute on hover
   - Source: badge with source name
   - Project: project name
   - Environment: colored badge
   - Severity: colored badge with icon
   - Status: colored badge
   - Count: number with tooltip
   - Assignee: user name or "Unassigned"
   - Actions: action buttons
4. Make rows clickable (navigate to detail)
5. Add row hover effects
6. Style table appropriately

#### Step 5.2.9: Implement Status Badges
1. Create status badge component
2. Map statuses to colors:
   - open: gray/blue
   - ack: yellow/orange
   - snoozed: purple
   - resolved: green
3. Add status icons
4. Style badges consistently

#### Step 5.2.10: Implement Severity Badges
1. Create severity badge component
2. Map severities to colors:
   - critical: red
   - high: orange
   - medium: yellow
   - low: blue
   - info: gray
3. Add severity icons
4. Style badges consistently

#### Step 5.2.11: Implement Table Sorting
1. Add sortable column headers
2. Show sort indicator (arrow up/down)
3. Handle column click to toggle sort
4. Update API call with sort parameters
5. Refresh table data
6. Persist sort preference (localStorage)

#### Step 5.2.12: Implement Pagination Component
1. Create pagination component
2. Display:
   - Page number
   - Total pages
   - Previous/Next buttons
   - First/Last buttons (optional)
   - Page size selector
3. Handle page navigation
4. Update API call with page number
5. Refresh table data
6. Disable buttons at boundaries

#### Step 5.2.13: Implement Real-Time Updates
1. Choose update method:
   - Polling: refresh every 30 seconds
   - WebSocket: real-time updates (if implemented)
2. Implement polling:
   - Set up interval
   - Fetch latest data
   - Update table without full refresh
   - Show "Last updated" indicator
3. Handle polling errors
4. Pause polling when page not visible
5. Add manual refresh button

#### Step 5.2.14: Add Bulk Actions (Optional)
1. Add row selection checkbox
2. Add "Select All" checkbox
3. Add bulk action menu:
   - Acknowledge selected
   - Resolve selected
   - Snooze selected
   - Assign to user
4. Implement bulk action API calls
5. Update UI after actions
6. Show success/error feedback

#### Step 5.2.15: Add Quick Actions
1. Add action buttons to each row:
   - Acknowledge
   - Snooze
   - Resolve
   - View Details
2. Implement action handlers
3. Call API endpoints
4. Update row after action
5. Show success/error feedback
6. Handle loading states

#### Step 5.2.16: Implement Search (Optional)
1. Add search input
2. Search across:
   - Title
   - Project
   - Environment
   - Tags
3. Implement search API
4. Update table with search results
5. Clear search functionality

#### Step 5.2.17: Create Alert Inbox Tests
1. Test API endpoint with various filters
2. Test pagination
3. Test sorting
4. Test filter combinations
5. Test table rendering
6. Test real-time updates
7. Test action buttons

### Acceptance Criteria
- [ ] Alert inbox API supports all filters
- [ ] Pagination works correctly
- [ ] Sorting works for all columns
- [ ] Filter UI is functional
- [ ] Table displays all required columns
- [ ] Status and severity badges are styled correctly
- [ ] Real-time updates work
- [ ] Action buttons work
- [ ] Alert inbox is responsive
- [ ] Alert inbox has test coverage

---

## Task 5.3: Alert Group Detail Page

### Objective
Create a detailed view for alert groups that shows timeline, metadata, related events, and allows management actions.

### Step-by-Step Execution

#### Step 5.3.1: Design Alert Detail Layout
1. Review alert detail requirements from Software_Doc.md
2. Design detail page layout:
   - Header with title and actions
   - Metadata section
   - Timeline section
   - Related events section
   - Notes/comments section
   - Runbook section
3. Plan responsive design
4. Design action buttons placement

#### Step 5.3.2: Create Alert Detail API Endpoint
1. Create `GET /api/alert-groups/:id` endpoint
2. Include:
   - Alert group details
   - Related AlertEvents (paginated)
   - Notification logs
   - Escalation job status (if any)
3. Verify workspace access
4. Return 404 if not found
5. Optimize query with joins

#### Step 5.3.3: Create Alert Detail Page
1. Create `apps/web/app/alerts/[id]/page.tsx`
2. Set up dynamic route
3. Extract alert ID from params
4. Fetch alert data from API
5. Handle loading states
6. Handle error states (404, etc.)

#### Step 5.3.4: Create Alert Header Component
1. Create header component
2. Display:
   - Alert title
   - Severity badge
   - Status badge
   - Environment badge
   - Project name
3. Add action buttons:
   - Acknowledge
   - Snooze
   - Resolve
   - Assign
4. Style header appropriately

#### Step 5.3.5: Create Metadata Section
1. Create metadata display component
2. Display:
   - First seen: timestamp
   - Last seen: timestamp
   - Count: number of events
   - Source: integration name
   - Fingerprint: (optional, for debugging)
   - Group key: (optional, for debugging)
3. Format timestamps nicely
4. Style metadata section

#### Step 5.3.6: Create Timeline Component
1. Create timeline component
2. Display events chronologically:
   - Event timestamp
   - Event details
   - Event link (to Sentry)
3. Show most recent first
4. Add pagination for many events
5. Add "Load More" button
6. Style timeline appropriately

#### Step 5.3.7: Create Related Events List
1. Create events list component
2. Display related AlertEvents:
   - Collapsed by default
   - Expandable sections
   - Event count per time period
3. Group events by time period (optional)
4. Add expand/collapse functionality
5. Show event details on expand

#### Step 5.3.8: Implement Assignee Management
1. Create assignee selector component
2. Fetch workspace users
3. Display current assignee
4. Allow assigning to user
5. Allow unassigning
6. Call API to update assignee
7. Update UI after assignment
8. Show assignment history (optional)

#### Step 5.3.9: Implement Runbook URL Field
1. Create runbook input component
2. Display current runbook URL
3. Allow editing runbook URL
4. Validate URL format
5. Call API to update runbook
6. Make URL clickable
7. Open in new tab

#### Step 5.3.10: Implement Notes/Comments
1. Create notes section component
2. Display existing notes (if field exists)
3. Allow adding new notes
4. Allow editing notes
5. Show note author and timestamp
6. Call API to save notes
7. Update UI after save

#### Step 5.3.11: Implement Action Buttons
1. Create action buttons component
2. Implement Acknowledge button:
   - Call acknowledge API
   - Update status in UI
   - Show success feedback
3. Implement Snooze button:
   - Show duration selector
   - Call snooze API
   - Update status in UI
4. Implement Resolve button:
   - Show confirmation dialog
   - Call resolve API
   - Update status in UI
5. Handle loading states
6. Handle errors

#### Step 5.3.12: Add Notification History
1. Create notification history section
2. Display NotificationLog entries:
   - Timestamp
   - Target (Slack channel)
   - Status (sent/failed)
   - Error message (if failed)
3. Show notification attempts
4. Link to Slack message (if available)
5. Style history appropriately

#### Step 5.3.13: Add Escalation Status
1. Display escalation status if applicable
2. Show:
   - Escalation scheduled time
   - Escalation level
   - Escalation channel
3. Show if escalation was cancelled
4. Update in real-time

#### Step 5.3.14: Implement Real-Time Updates
1. Poll for alert updates every 10-30 seconds
2. Update:
   - Status
   - Count
   - Last seen
   - New events
3. Show update indicator
4. Handle update errors

#### Step 5.3.15: Add Breadcrumb Navigation
1. Add breadcrumb component
2. Show: Dashboard > Alerts > Alert Detail
3. Make breadcrumbs clickable
4. Style appropriately

#### Step 5.3.16: Create Alert Detail Tests
1. Test API endpoint
2. Test page rendering
3. Test action buttons
4. Test assignee management
5. Test runbook editing
6. Test notes functionality
7. Test real-time updates

### Acceptance Criteria
- [ ] Alert detail API returns all required data
- [ ] Alert detail page displays correctly
- [ ] Timeline shows events chronologically
- [ ] Related events are displayed
- [ ] Assignee management works
- [ ] Runbook URL can be edited
- [ ] Notes can be added/edited
- [ ] Action buttons work
- [ ] Notification history is shown
- [ ] Real-time updates work
- [ ] Alert detail page is responsive
- [ ] Alert detail page has test coverage

---

## Task 5.4: Integration Management UI

### Objective
Create a user interface for managing integrations (Slack, Sentry) with connection status, health monitoring, and configuration.

### Step-by-Step Execution

#### Step 5.4.1: Design Integration Management Layout
1. Review integration requirements from Software_Doc.md
2. Design integration management layout:
   - List of integrations
   - Integration cards
   - Connection status
   - Health indicators
   - Action buttons
3. Plan responsive design

#### Step 5.4.2: Create Integration Management API
1. Create `GET /api/integrations` endpoint
2. Return all integrations for workspace
3. Include:
   - Integration type
   - Connection status
   - Health status
   - Last activity timestamp
   - Configuration (masked)
4. Return formatted data

#### Step 5.4.3: Create Integration Management Page
1. Create `apps/web/app/integrations/page.tsx`
2. Set up page structure
3. Fetch integrations from API
4. Handle loading states
5. Handle error states

#### Step 5.4.4: Create Integration List Component
1. Create integration list component
2. Display integrations as cards or table rows
3. Show for each integration:
   - Integration name/type
   - Connection status badge
   - Health status indicator
   - Last activity timestamp
   - Action buttons
4. Style integration cards

#### Step 5.4.5: Implement Connection Status Display
1. Create connection status component
2. Show status:
   - Connected (green badge)
   - Disconnected (gray badge)
   - Error (red badge)
3. Add status icon
4. Style status badges

#### Step 5.4.6: Implement Health Status Indicators
1. Create health indicator component
2. Show health status:
   - Healthy: green indicator
   - Warning: yellow indicator
   - Error: red indicator
3. Display last webhook received time
4. Calculate time since last activity
5. Show "Last active X minutes ago"
6. Style health indicators

#### Step 5.4.7: Implement Connect Button
1. Add "Connect" button for disconnected integrations
2. For Slack:
   - Redirect to OAuth flow
   - Handle OAuth callback
3. For Sentry:
   - Show webhook URL
   - Show instructions
   - Allow manual connection
4. Update UI after connection
5. Show success feedback

#### Step 5.4.8: Implement Disconnect Button
1. Add "Disconnect" button for connected integrations
2. Show confirmation dialog
3. Call disconnect API
4. Update UI after disconnection
5. Show success feedback
6. Handle errors

#### Step 5.4.9: Implement Test Webhook Button
1. Add "Test Webhook" button
2. Call test webhook API
3. Send test payload
4. Show test result:
   - Success: "Webhook received successfully"
   - Failure: Error message
5. Update last activity timestamp
6. Show loading state during test

#### Step 5.4.10: Display Webhook Configuration
1. Show webhook URL for Sentry
2. Show webhook configuration:
   - URL (copyable)
   - Method (POST)
   - Headers (if any)
3. Add "Copy URL" button
4. Show setup instructions
5. Display masked secrets (if any)

#### Step 5.4.11: Implement Integration Details Modal
1. Create integration details modal/dialog
2. Show detailed information:
   - Integration type
   - Connection status
   - Health status
   - Configuration
   - Last activity
   - Statistics (optional)
3. Add close button
4. Style modal appropriately

#### Step 5.4.12: Add Integration Statistics (Optional)
1. Display integration statistics:
   - Total alerts received
   - Alerts last 24h
   - Success rate
   - Average latency
2. Fetch statistics from API
3. Display in integration card
4. Update periodically

#### Step 5.4.13: Implement Auto-Refresh
1. Poll for integration status every 30-60 seconds
2. Update health indicators
3. Update last activity timestamps
4. Pause when page not visible
5. Add manual refresh button

#### Step 5.4.14: Create Integration Management Tests
1. Test API endpoint
2. Test integration list rendering
3. Test connect/disconnect flows
4. Test health indicators
5. Test webhook testing
6. Test configuration display

### Acceptance Criteria
- [ ] Integration management API works
- [ ] Integration list displays correctly
- [ ] Connection status is shown
- [ ] Health indicators work
- [ ] Connect button works
- [ ] Disconnect button works
- [ ] Test webhook button works
- [ ] Webhook configuration is displayed
- [ ] Integration management is responsive
- [ ] Integration management has test coverage

---

## Task 5.5: Settings & Workspace Management

### Objective
Create settings pages for workspace configuration, user management, and notification preferences.

### Step-by-Step Execution

#### Step 5.5.1: Design Settings Layout
1. Design settings page structure:
   - Settings navigation/sidebar
   - Settings sections:
     - Workspace settings
     - User management
     - Notification preferences
     - API keys (if needed)
2. Plan responsive design
3. Design settings forms

#### Step 5.5.2: Create Settings API Endpoints
1. Create workspace settings endpoints:
   - `GET /api/workspaces/:id/settings`
   - `PUT /api/workspaces/:id/settings`
2. Create user management endpoints:
   - `GET /api/workspaces/:id/users`
   - `POST /api/workspaces/:id/users` (invite)
   - `PUT /api/workspaces/:id/users/:userId`
   - `DELETE /api/workspaces/:id/users/:userId`
3. Create notification preferences endpoints:
   - `GET /api/workspaces/:id/notification-preferences`
   - `PUT /api/workspaces/:id/notification-preferences`

#### Step 5.5.3: Create Settings Pages Structure
1. Create `apps/web/app/settings/` directory
2. Create settings layout component
3. Create settings navigation
4. Create pages:
   - `settings/workspace/page.tsx`
   - `settings/users/page.tsx`
   - `settings/notifications/page.tsx`
   - `settings/api-keys/page.tsx` (if needed)

#### Step 5.5.4: Implement Workspace Settings
1. Create workspace settings page
2. Display workspace information:
   - Workspace name
   - Workspace ID
   - Created date
   - Owner
3. Allow editing workspace name
4. Add workspace deletion (with confirmation)
5. Save settings via API
6. Show success/error feedback

#### Step 5.5.5: Implement User Management
1. Create user management page
2. Display user list:
   - User email
   - User role
   - Joined date
   - Actions (edit, remove)
3. Add "Invite User" button
4. Create invite user modal:
   - Email input
   - Role selector
   - Send invite button
5. Implement role editing
6. Implement user removal (with confirmation)
7. Handle permissions (only owner/admin can manage)

#### Step 5.5.6: Implement Notification Preferences
1. Create notification preferences page
2. Display preferences:
   - Default notification channels
   - Quiet hours (optional)
   - Notification frequency
   - Escalation preferences
3. Allow editing preferences
4. Save via API
5. Show success/error feedback

#### Step 5.5.7: Implement API Keys (If Needed)
1. Create API keys page
2. Display existing API keys:
   - Key name
   - Created date
   - Last used
   - Actions (revoke)
3. Add "Create API Key" button
4. Generate API key
5. Display key once (with copy button)
6. Implement key revocation
7. Handle key security

#### Step 5.5.8: Add Settings Navigation
1. Create settings navigation component
2. Show navigation items:
   - Workspace
   - Users
   - Notifications
   - API Keys (if applicable)
3. Highlight active section
4. Make navigation responsive
5. Style navigation appropriately

#### Step 5.5.9: Implement Form Validation
1. Add validation to all settings forms
2. Validate:
   - Workspace name (required, min length)
   - User email (valid email format)
   - Role (valid role)
   - Notification preferences (valid values)
3. Show validation errors
4. Prevent submission if invalid

#### Step 5.5.10: Add Permission Checks
1. Check user role for each settings section
2. Hide/disable sections user can't access
3. Show permission error messages
4. Verify permissions on API calls
5. Handle permission errors gracefully

#### Step 5.5.11: Implement Settings Tests
1. Test workspace settings API
2. Test user management API
3. Test notification preferences API
4. Test settings pages rendering
5. Test form validation
6. Test permission checks

### Acceptance Criteria
- [ ] Settings API endpoints work
- [ ] Workspace settings page works
- [ ] User management page works
- [ ] Notification preferences page works
- [ ] API keys page works (if implemented)
- [ ] Form validation works
- [ ] Permission checks work
- [ ] Settings pages are responsive
- [ ] Settings pages have test coverage

---

## Phase 5 Completion Checklist

### Overview Dashboard
- [ ] Dashboard API returns all metrics
- [ ] Metric cards display correctly
- [ ] Charts render correctly
- [ ] Top sources table works
- [ ] Integration health is shown
- [ ] Auto-refresh works
- [ ] Dashboard is responsive

### Alert Inbox
- [ ] Alert inbox API supports all filters
- [ ] Filter UI is functional
- [ ] Table displays correctly
- [ ] Sorting works
- [ ] Pagination works
- [ ] Real-time updates work
- [ ] Action buttons work
- [ ] Alert inbox is responsive

### Alert Group Detail Page
- [ ] Alert detail API works
- [ ] Detail page displays correctly
- [ ] Timeline shows events
- [ ] Related events are shown
- [ ] Assignee management works
- [ ] Runbook URL can be edited
- [ ] Notes work
- [ ] Action buttons work
- [ ] Real-time updates work

### Integration Management UI
- [ ] Integration list displays correctly
- [ ] Connection status is shown
- [ ] Health indicators work
- [ ] Connect/disconnect works
- [ ] Test webhook works
- [ ] Configuration is displayed

### Settings & Workspace Management
- [ ] Workspace settings work
- [ ] User management works
- [ ] Notification preferences work
- [ ] API keys work (if implemented)
- [ ] Permission checks work

---

## End-to-End Testing

### Complete User Flow Test
1. Login to application
2. View dashboard
3. Navigate to alert inbox
4. Filter alerts
5. Click on alert to view details
6. Acknowledge alert from detail page
7. Navigate to integrations
8. Check integration health
9. Navigate to settings
10. Update workspace settings
11. Invite user
12. Update notification preferences

### Responsive Design Test
1. Test on desktop (1920x1080)
2. Test on tablet (768x1024)
3. Test on mobile (375x667)
4. Verify all features work on all sizes
5. Verify navigation works
6. Verify forms are usable

---

## Next Steps After Phase 5

Once Phase 5 is complete, you're ready to move to Phase 6: Production Hardening, which will focus on:
- Security enhancements
- Error handling and logging
- Performance optimization
- Monitoring and observability
- Data retention and cleanup
- Documentation

The frontend from Phase 5 will be enhanced in Phase 6 with better error handling, performance optimizations, and production-ready features.

---

## Troubleshooting Common Issues

### Dashboard Not Loading
- Check API endpoint is accessible
- Verify authentication is working
- Check API response format
- Review browser console for errors
- Check network requests

### Alert Inbox Performance Issues
- Optimize database queries
- Add pagination limits
- Implement virtual scrolling for large lists
- Cache filter options
- Review API response times

### Real-Time Updates Not Working
- Check polling interval
- Verify API is returning updated data
- Check for JavaScript errors
- Verify page visibility detection
- Test WebSocket connection (if used)

### Integration Health Not Updating
- Check last webhook timestamp
- Verify webhook is being received
- Check integration status in database
- Review notification logs
- Test webhook manually

---

## Estimated Time Breakdown

- Task 5.1 (Overview Dashboard): 12-14 hours
- Task 5.2 (Alert Inbox): 14-16 hours
- Task 5.3 (Alert Group Detail Page): 12-14 hours
- Task 5.4 (Integration Management UI): 8-10 hours
- Task 5.5 (Settings & Workspace Management): 8-10 hours
- Integration & Testing: 8-10 hours

**Total Estimated Time**: 62-74 hours (approximately 2-2.5 weeks for one developer)

---

## Notes

- This phase focuses on user experience. Make the UI intuitive and responsive.
- Performance is important - optimize API calls, implement caching where appropriate.
- Real-time updates enhance user experience but should be implemented efficiently.
- Error handling should be user-friendly with clear error messages.
- Accessibility is important - ensure UI is accessible to all users.
- Test on multiple devices and browsers to ensure compatibility.
- Consider user feedback and iterate on UI/UX improvements.
- Documentation should include user guides for each feature.

