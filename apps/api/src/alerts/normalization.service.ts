import { Injectable } from '@nestjs/common';
import { NormalizedAlert, AlertSeverity } from '@signalcraft/shared';
import { ValidationException } from '../common/exceptions/base.exception';

@Injectable()
export class NormalizationService {
  normalizeDatadog(payload: Record<string, unknown>): NormalizedAlert {
    // Datadog ID usually passes as $ID
    const sourceEventId = String(payload.id || payload.event_id || Date.now());

    // Parse tags (tags can be a string "env:prod, foo:bar" or array)
    const rawTags = payload.tags;
    const tags = this.normalizeConstructorTags(rawTags);

    const project = tags['project'] || tags['service'] || 'datadog';
    const environment = tags['env'] || tags['environment'] || 'production';

    const status = String(payload.alert_type || payload.status || 'info').toLowerCase();
    const severity = this.mapDatadogSeverity(status, String(payload.priority || ''));

    const title = String(payload.title || payload.event_title || 'Datadog Alert');
    const description = String(payload.body || payload.text || payload.message || '');

    const occurredAt = this.parseTimestamp(String(payload.date || payload.timestamp || Date.now()));
    const link = String(payload.link || payload.url || '');

    // Create a fingerprint from ID or title + project/env
    const fingerprint = `datadog:${sourceEventId}`;

    return {
      source: 'DATADOG',
      sourceEventId,
      project,
      environment,
      severity,
      fingerprint,
      title,
      description,
      tags,
      occurredAt,
      link: link || null,
      userCount: null,
    };
  }

  normalizeAwsCloudWatch(payload: Record<string, unknown>): NormalizedAlert {
    const snsMessage = this.extractSnsMessage(payload);

    const alarmName = this.getString(snsMessage.AlarmName) ?? 'CloudWatch Alarm';
    const state = this.getString(snsMessage.NewStateValue) ?? 'UNKNOWN';
    const reason = this.getString(snsMessage.NewStateReason) ?? '';
    const stateChangeTime = this.getString(snsMessage.StateChangeTime);

    const sourceEventId =
      this.getString(payload.MessageId) ??
      this.getString(snsMessage.AlarmArn) ??
      `${alarmName}:${stateChangeTime ?? Date.now()}`;

    const project = this.getString(snsMessage.AWSAccountId) ?? 'aws';
    const environment = this.getString(snsMessage.Region) ?? 'cloudwatch';
    const severity = this.mapCloudWatchSeverity(state);

    const description = reason || `Alarm ${alarmName} changed state to ${state}`;
    const occurredAt = this.parseTimestamp(stateChangeTime);
    const link = this.getString(snsMessage.AlarmArn) ?? null;

    const tags: Record<string, string> = {
      alarm: alarmName,
      state,
      region: environment,
    };

    return {
      source: 'AWS_CLOUDWATCH',
      sourceEventId: String(sourceEventId),
      project,
      environment,
      severity,
      fingerprint: `aws-cloudwatch:${alarmName}`,
      title: `${alarmName} is ${state}`,
      description,
      tags,
      occurredAt,
      link,
      userCount: null,
    };
  }

  normalizeAlertmanagerAlert(
    payload: Record<string, unknown>,
    alert: Record<string, unknown>,
  ): NormalizedAlert {
    const labels = this.asRecord(alert.labels ?? {});
    const annotations = this.asRecord(alert.annotations ?? {});

    const alertName = this.getString(labels.alertname) ?? 'Prometheus Alert';
    const severityLabel = this.getString(labels.severity) ?? this.getString(labels.priority);
    const environment =
      this.getString(labels.environment) ?? this.getString(labels.env) ?? 'production';
    const project = this.getString(labels.service) ?? this.getString(labels.job) ?? alertName;

    const title = this.getString(annotations.summary) ?? alertName;
    const description =
      this.getString(annotations.description) ?? this.getString(annotations.message) ?? title;

    const startsAt = this.getString(alert.startsAt) ?? this.getString(payload.startsAt);
    const fingerprint =
      this.getString(alert.fingerprint) ??
      `prometheus:${alertName}:${this.getString(labels.instance) ?? 'unknown'}`;

    const tags = Object.entries(labels).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value ?? '');
      return acc;
    }, {});

    return {
      source: 'PROMETHEUS',
      sourceEventId: `${fingerprint}:${startsAt ?? Date.now()}`,
      project,
      environment,
      severity: this.mapPrometheusSeverity(severityLabel),
      fingerprint,
      title,
      description,
      tags,
      occurredAt: this.parseTimestamp(startsAt),
      link: this.getString(alert.generatorURL) ?? null,
      userCount: null,
    };
  }

  normalizeAzureMonitor(payload: Record<string, unknown>): NormalizedAlert {
    const data = this.asRecord(payload.data ?? {});
    const essentials = this.asRecord(data.essentials ?? {});

    const alertName = this.getString(essentials.alertRule) ?? 'Azure Monitor Alert';
    const severityLabel = this.getString(essentials.severity) ?? 'Sev3';
    const environment = this.getString(essentials.monitoringService) ?? 'azure';
    const project = this.getString(essentials.signalType) ?? 'azure-monitor';
    const description =
      this.getString(essentials.description) ??
      this.getString(essentials.alertRuleDescription) ??
      alertName;
    const firedAt = this.getString(essentials.firedDateTime);
    const alertId = this.getString(essentials.alertId) ?? this.getString(payload.id);

    const tags: Record<string, string> = {
      severity: severityLabel,
      monitor: this.getString(essentials.monitoringService) ?? '',
      signal: this.getString(essentials.signalType) ?? '',
    };

    return {
      source: 'AZURE_MONITOR',
      sourceEventId: alertId ?? `${alertName}:${firedAt ?? Date.now()}`,
      project,
      environment,
      severity: this.mapAzureSeverity(severityLabel),
      fingerprint: `azure:${alertName}`,
      title: alertName,
      description,
      tags,
      occurredAt: this.parseTimestamp(firedAt),
      link: this.getString(essentials.alertId) ?? null,
      userCount: null,
    };
  }

  normalizeGcpMonitoring(payload: Record<string, unknown>): NormalizedAlert {
    const incident = this.asRecord(payload.incident ?? payload);
    const alertName = this.getString(incident.policy_name) ?? 'GCP Monitoring Alert';
    const severityLabel = this.getString(incident.severity) ?? this.getString(incident.state);
    const project =
      this.getString(incident.scoping_project_id) ?? this.getString(incident.project_id) ?? 'gcp';
    const environment = this.getString(incident.resource_display_name) ?? 'gcp-monitoring';
    const description =
      this.getString(incident.summary) ?? this.getString(incident.condition_name) ?? alertName;
    const startedAt = this.getString(incident.started_at) ?? this.getString(incident.startTime);
    const incidentId = this.getString(incident.incident_id) ?? this.getString(payload.incident_id);

    const tags: Record<string, string> = {
      state: this.getString(incident.state) ?? '',
      resource: this.getString(incident.resource_id) ?? '',
    };

    return {
      source: 'GCP_MONITORING',
      sourceEventId: incidentId ?? `${alertName}:${startedAt ?? Date.now()}`,
      project,
      environment,
      severity: this.mapGcpSeverity(severityLabel),
      fingerprint: `gcp:${alertName}`,
      title: alertName,
      description,
      tags,
      occurredAt: this.parseTimestamp(startedAt),
      link: this.getString(incident.url) ?? null,
      userCount: null,
    };
  }

  normalizeGrafanaAlert(
    payload: Record<string, unknown>,
    alert: Record<string, unknown>,
  ): NormalizedAlert {
    const labels = this.asRecord(alert.labels ?? payload.commonLabels ?? {});
    const annotations = this.asRecord(alert.annotations ?? payload.commonAnnotations ?? {});

    const alertName =
      this.getString(labels.alertname) ?? this.getString(labels.rule) ?? 'Grafana Alert';
    const severityLabel = this.getString(labels.severity) ?? this.getString(labels.priority);
    const environment =
      this.getString(labels.environment) ?? this.getString(labels.env) ?? 'grafana';
    const project = this.getString(labels.service) ?? this.getString(labels.job) ?? alertName;

    const title = this.getString(annotations.summary) ?? alertName;
    const description =
      this.getString(annotations.description) ?? this.getString(annotations.message) ?? title;

    const startsAt = this.getString(alert.startsAt) ?? this.getString(payload.startsAt);
    const fingerprint =
      this.getString(alert.fingerprint) ??
      `grafana:${alertName}:${this.getString(labels.instance) ?? 'unknown'}`;

    const tags = Object.entries(labels).reduce<Record<string, string>>((acc, [key, value]) => {
      acc[key] = String(value ?? '');
      return acc;
    }, {});

    return {
      source: 'GRAFANA',
      sourceEventId: `${fingerprint}:${startsAt ?? Date.now()}`,
      project,
      environment,
      severity: this.mapPrometheusSeverity(severityLabel),
      fingerprint,
      title,
      description,
      tags,
      occurredAt: this.parseTimestamp(startsAt),
      link: this.getString(alert.generatorURL) ?? this.getString(payload.externalURL) ?? null,
      userCount: null,
    };
  }

  private normalizeConstructorTags(tags: unknown): Record<string, string> {
    const result: Record<string, string> = {};

    if (typeof tags === 'string') {
      // Handle comma separated tags "env:prod, role:db"
      tags.split(',').forEach((tag) => {
        const [key, val] = tag.split(':').map((s) => s.trim());
        if (key && val) result[key] = val;
      });
    } else if (Array.isArray(tags)) {
      // Handle array of strings ["env:prod", "role:db"]
      tags.forEach((tag) => {
        if (typeof tag === 'string') {
          const [key, val] = tag.split(':').map((s) => s.trim());
          if (key && val) result[key] = val;
        }
      });
    } else if (tags && typeof tags === 'object' && !Array.isArray(tags)) {
      Object.entries(tags as Record<string, unknown>).forEach(([key, val]) => {
        result[key] = String(val);
      });
    }

    return result;
  }

  private mapDatadogSeverity(status: string, priority: string): AlertSeverity {
    const s = status.toLowerCase();
    const p = priority.toLowerCase();

    if (s === 'error' || p === 'p1') return 'CRITICAL';
    if (s === 'warning' || p === 'p2') return 'HIGH';
    if (s === 'success') return 'LOW'; // Recovery
    return 'MEDIUM'; // Default for info/other
  }

  private mapCloudWatchSeverity(state: string): AlertSeverity {
    switch (state.toUpperCase()) {
      case 'ALARM':
        return 'HIGH';
      case 'OK':
        return 'LOW';
      case 'INSUFFICIENT_DATA':
        return 'MEDIUM';
      default:
        return 'INFO';
    }
  }

  private mapPrometheusSeverity(label?: string): AlertSeverity {
    switch ((label ?? '').toLowerCase()) {
      case 'critical':
      case 'p1':
        return 'CRITICAL';
      case 'high':
      case 'p2':
        return 'HIGH';
      case 'medium':
      case 'warning':
      case 'p3':
        return 'MEDIUM';
      case 'low':
      case 'info':
      case 'p4':
        return 'LOW';
      default:
        return 'INFO';
    }
  }

  private mapAzureSeverity(label?: string): AlertSeverity {
    switch ((label ?? '').toLowerCase()) {
      case 'sev0':
      case 'sev1':
        return 'CRITICAL';
      case 'sev2':
        return 'HIGH';
      case 'sev3':
        return 'MEDIUM';
      case 'sev4':
        return 'LOW';
      default:
        return 'INFO';
    }
  }

  private mapGcpSeverity(label?: string): AlertSeverity {
    switch ((label ?? '').toLowerCase()) {
      case 'critical':
        return 'CRITICAL';
      case 'error':
        return 'HIGH';
      case 'warning':
        return 'MEDIUM';
      case 'info':
        return 'LOW';
      default:
        return 'INFO';
    }
  }

  normalizeSentry(payload: Record<string, unknown>): NormalizedAlert {
    const data = this.asRecord(payload.data);
    const event = this.asRecord(payload.event ?? data.event ?? payload);

    const sourceEventId =
      this.getString(event.event_id) ??
      this.getString(payload.event_id) ??
      this.getString(payload.id) ??
      this.getString(data.event_id);

    if (!sourceEventId) {
      throw new ValidationException('Missing Sentry event id');
    }

    const project =
      this.getString(payload.project_slug) ??
      this.getString(payload.project) ??
      this.getString(payload.project_name) ??
      'unknown';
    const environment =
      this.getString(event.environment) ??
      this.getString(payload.environment) ??
      this.findTag(event, 'environment') ??
      'unknown';

    const severity = this.mapSeverity(this.getString(event.level) ?? this.getString(payload.level));
    const title = this.getString(event.title) ?? this.getString(payload.title) ?? 'Sentry Issue';
    const description =
      this.getString(event.message) ??
      this.getString(payload.message) ??
      this.getString(event.culprit) ??
      '';

    const tags = this.normalizeTags(event.tags ?? payload.tags);
    const fingerprint = this.extractFingerprint(event, title, sourceEventId);

    const occurredAt = this.parseTimestamp(
      this.getString(event.timestamp) ?? this.getString(payload.timestamp),
    );
    const link = this.getString(payload.url) ?? null;

    // Impact Estimation: Extract user count from Sentry payload
    const userCount = this.extractUserCount(payload, event);

    return {
      source: 'SENTRY',
      sourceEventId: String(sourceEventId),
      project: String(project),
      environment: String(environment),
      severity,
      fingerprint,
      title: String(title),
      description: String(description),
      tags,
      occurredAt,
      link,
      userCount,
    };
  }

  private mapSeverity(level?: string): AlertSeverity {
    switch ((level ?? '').toLowerCase()) {
      case 'fatal':
        return 'CRITICAL';
      case 'error':
        return 'HIGH';
      case 'warning':
        return 'MEDIUM';
      case 'info':
        return 'LOW';
      case 'debug':
        return 'INFO';
      default:
        return 'INFO';
    }
  }

  private normalizeTags(tagsInput?: unknown): Record<string, string> {
    if (Array.isArray(tagsInput)) {
      return tagsInput.reduce<Record<string, string>>((acc, tag) => {
        if (Array.isArray(tag) && tag.length >= 2) {
          acc[String(tag[0])] = String(tag[1]);
        }
        return acc;
      }, {});
    }

    if (tagsInput && typeof tagsInput === 'object') {
      return Object.entries(tagsInput as Record<string, unknown>).reduce<Record<string, string>>(
        (acc, [key, value]) => {
          acc[key] = String(value ?? '');
          return acc;
        },
        {},
      );
    }

    return {};
  }

  private findTag(event: Record<string, unknown>, key: string): string | null {
    const tags = event.tags;
    if (!Array.isArray(tags)) {
      return null;
    }
    const match = tags.find((tag) => Array.isArray(tag) && tag[0] === key);
    return match && typeof match[1] !== 'undefined' ? String(match[1]) : null;
  }

  private extractFingerprint(
    event: Record<string, unknown>,
    title: string,
    fallback: string,
  ): string {
    const fingerprint = event.fingerprint ?? event.fingerprint_hash;
    if (Array.isArray(fingerprint)) {
      return fingerprint.map((item) => String(item)).join('|');
    }
    if (fingerprint) {
      return String(fingerprint);
    }
    return `${title}:${fallback}`;
  }

  private parseTimestamp(timestamp?: string): Date {
    if (!timestamp) {
      return new Date();
    }
    const parsed = new Date(timestamp);
    if (Number.isNaN(parsed.getTime())) {
      return new Date();
    }
    return parsed;
  }

  private extractSnsMessage(payload: Record<string, unknown>): Record<string, unknown> {
    const message = payload.Message;
    if (typeof message === 'string') {
      try {
        const parsed = JSON.parse(message);
        if (parsed && typeof parsed === 'object') {
          return parsed as Record<string, unknown>;
        }
      } catch (_error) {
        return {};
      }
    }
    return this.asRecord(message);
  }

  private asRecord(value: unknown): Record<string, unknown> {
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      return value as Record<string, unknown>;
    }
    return {};
  }

  private getString(value: unknown): string | undefined {
    return typeof value === 'string' ? value : undefined;
  }

  /**
   * Extract user count from Sentry payload for impact estimation
   * Sentry may include user counts in different locations
   */
  private extractUserCount(
    payload: Record<string, unknown>,
    event: Record<string, unknown>,
  ): number | null {
    // Check for user_count in various locations
    const userCount =
      this.getNumber(payload.user_count) ??
      this.getNumber(event.user_count) ??
      this.getNumber(payload.userCount) ??
      this.getNumber(event.userCount);

    if (userCount !== null) {
      return userCount;
    }

    // Check for users array length
    const users = payload.users ?? event.users;
    if (Array.isArray(users)) {
      return users.length;
    }

    return null;
  }

  private getNumber(value: unknown): number | null {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return null;
  }
}
