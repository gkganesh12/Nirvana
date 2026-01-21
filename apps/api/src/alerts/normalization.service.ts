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

  private normalizeConstructorTags(tags: unknown): Record<string, string> {
    const result: Record<string, string> = {};

    if (typeof tags === 'string') {
      // Handle comma separated tags "env:prod, role:db"
      tags.split(',').forEach(tag => {
        const [key, val] = tag.split(':').map(s => s.trim());
        if (key && val) result[key] = val;
      });
    } else if (Array.isArray(tags)) {
      // Handle array of strings ["env:prod", "role:db"]
      tags.forEach(tag => {
        if (typeof tag === 'string') {
          const [key, val] = tag.split(':').map(s => s.trim());
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

    const severity = this.mapSeverity(
      this.getString(event.level) ?? this.getString(payload.level),
    );
    const title =
      this.getString(event.title) ?? this.getString(payload.title) ?? 'Sentry Issue';
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
