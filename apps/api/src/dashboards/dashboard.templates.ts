export const DASHBOARD_TEMPLATES = {
    SRE_OVERVIEW: {
        name: 'SRE Overview',
        description: 'Essential metrics for Site Reliability Engineers',
        layout: {
            type: 'grid',
            columns: 12,
            rows: 'auto',
        },
        widgets: [
            {
                id: 'widget1',
                type: 'alert_count',
                title: 'Active Alerts',
                position: { x: 0, y: 0, w: 3, h: 2 },
                config: {
                    status: 'OPEN',
                },
            },
            {
                id: 'widget2',
                type: 'alerts_by_severity',
                title: 'Alerts by Severity',
                position: { x: 3, y: 0, w: 6, h: 4 },
                config: {
                    status: 'OPEN',
                },
            },
            {
                id: 'widget3',
                type: 'alert_timeline',
                title: 'Alert Timeline (24h)',
                position: { x: 0, y: 2, w: 9, h: 4 },
                config: {
                    hoursBack: 24,
                },
            },
            {
                id: 'widget4',
                type: 'recent_alerts',
                title: 'Recent Alerts',
                position: { x: 9, y: 0, w: 3, h: 6 },
                config: {
                    limit: 10,
                },
            },
        ],
    },

    DEVOPS_DASHBOARD: {
        name: 'DevOps Dashboard',
        description: 'Operational metrics for DevOps teams',
        layout: {
            type: 'grid',
            columns: 12,
            rows: 'auto',
        },
        widgets: [
            {
                id: 'widget1',
                type: 'alert_count',
                title: 'Critical Alerts',
                position: { x: 0, y: 0, w: 3, h: 2 },
                config: {
                    status: 'OPEN',
                    severity: 'CRITICAL',
                },
            },
            {
                id: 'widget2',
                type: 'alert_count',
                title: 'High Priority',
                position: { x: 3, y: 0, w: 3, h: 2 },
                config: {
                    status: 'OPEN',
                    severity: 'HIGH',
                },
            },
            {
                id: 'widget3',
                type: 'alert_timeline',
                title: 'Alert Trend (7 days)',
                position: { x: 0, y: 2, w: 12, h: 4 },
                config: {
                    hoursBack: 168,
                },
            },
        ],
    },

    EXECUTIVE_SUMMARY: {
        name: 'Executive Summary',
        description: 'High-level overview for leadership',
        layout: {
            type: 'grid',
            columns: 12,
            rows: 'auto',
        },
        widgets: [
            {
                id: 'widget1',
                type: 'alert_count',
                title: 'Total Active Incidents',
                position: { x: 0, y: 0, w: 4, h: 2 },
                config: {
                    status: 'OPEN',
                },
            },
            {
                id: 'widget2',
                type: 'alerts_by_severity',
                title: 'Incident Severity Distribution',
                position: { x: 4, y: 0, w: 8, h: 4 },
                config: {
                    status: 'OPEN',
                },
            },
            {
                id: 'widget3',
                type: 'alert_timeline',
                title: 'Incident Trend (30 days)',
                position: { x: 0, y: 4, w: 12, h: 4 },
                config: {
                    hoursBack: 720,
                },
            },
        ],
    },
};
