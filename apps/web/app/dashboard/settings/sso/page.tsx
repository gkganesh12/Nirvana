'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Spinner } from '@/components/ui/spinner';

interface SamlConfig {
  enabled: boolean;
  enforced: boolean;
  idpEntityId: string | null;
  idpSsoUrl: string | null;
  hasCertificate: boolean;
  spEntityId: string | null;
  allowedDomains: string[];
  jitProvisioning: boolean;
}

export default function SSOSettingsPage() {
  const [config, setConfig] = useState<SamlConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Form state
  const [enabled, setEnabled] = useState(false);
  const [enforced, setEnforced] = useState(false);
  const [idpEntityId, setIdpEntityId] = useState('');
  const [idpSsoUrl, setIdpSsoUrl] = useState('');
  const [idpCertificate, setIdpCertificate] = useState('');
  const [allowedDomains, setAllowedDomains] = useState('');
  const [jitProvisioning, setJitProvisioning] = useState(true);

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      setLoading(true);
      setError(null);
      const res = await fetch('/api/saml/config');
      if (!res.ok) throw new Error('Failed to fetch SAML config');
      const data = await res.json();
      setConfig(data);
      
      // Populate form
      setEnabled(data.enabled || false);
      setEnforced(data.enforced || false);
      setIdpEntityId(data.idpEntityId || '');
      setIdpSsoUrl(data.idpSsoUrl || '');
      setAllowedDomains(data.allowedDomains?.join(', ') || '');
      setJitProvisioning(data.jitProvisioning ?? true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(null);

      const payload = {
        enabled,
        enforced,
        idpEntityId: idpEntityId || undefined,
        idpSsoUrl: idpSsoUrl || undefined,
        idpCertificate: idpCertificate || undefined,
        allowedDomains: allowedDomains
          .split(',')
          .map((d) => d.trim().toLowerCase())
          .filter(Boolean),
        jitProvisioning,
      };

      const res = await fetch('/api/saml/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save config');
      }

      setSuccess('SAML configuration saved successfully');
      setIdpCertificate(''); // Clear certificate field after save
      await fetchConfig();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setSaving(false);
    }
  };

  const downloadMetadata = () => {
    if (config?.spEntityId) {
      const workspaceId = config.spEntityId.split('/').pop();
      window.open(`/api/saml/metadata/${workspaceId}`, '_blank');
    }
  };

  if (loading) {
    return (
      <Card className="bg-white border-stone-200">
        <CardHeader>
          <CardTitle className="text-stone-900">SSO / SAML Settings</CardTitle>
        </CardHeader>
        <CardContent className="flex justify-center py-8">
          <Spinner />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-white border-stone-200">
        <CardHeader>
          <CardTitle className="text-stone-900 flex items-center gap-2">
            🔐 SSO / SAML Configuration
          </CardTitle>
          <CardDescription className="text-stone-500">
            Configure SAML-based Single Sign-On for enterprise authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {error && (
            <div className="bg-red-50 border border-red-200 text-red-600 p-3 rounded-lg text-sm">
              ⚠️ {error}
            </div>
          )}
          {success && (
            <div className="bg-emerald-50 border border-emerald-200 text-emerald-600 p-3 rounded-lg text-sm">
              ✓ {success}
            </div>
          )}

          {/* Enable SAML */}
          <div className="flex items-center justify-between p-4 bg-white/90 rounded-lg border border-stone-200">
            <div>
              <Label className="text-stone-900 font-medium">Enable SAML SSO</Label>
              <p className="text-sm text-stone-500 mt-1">
                Allow users to authenticate using your identity provider
              </p>
            </div>
            <Switch
              checked={enabled}
              onCheckedChange={setEnabled}
              className="data-[state=checked]:bg-red-600"
            />
          </div>

          {enabled && (
            <>
              {/* SP Metadata */}
              {config?.spEntityId && (
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <Label className="text-blue-600 font-medium">Service Provider Info</Label>
                  <p className="text-sm text-stone-500 mt-2">
                    <strong>Entity ID:</strong> {config.spEntityId}
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={downloadMetadata}
                    className="mt-3 border-blue-200 text-blue-600 hover:bg-blue-50"
                  >
                    📄 Download SP Metadata XML
                  </Button>
                </div>
              )}

              {/* IdP Configuration */}
              <div className="space-y-4">
                <h3 className="text-stone-900 font-medium">Identity Provider Configuration</h3>
                
                <div className="space-y-2">
                  <Label className="text-stone-600">IdP Entity ID</Label>
                  <Input
                    value={idpEntityId}
                    onChange={(e) => setIdpEntityId(e.target.value)}
                    placeholder="https://idp.example.com/saml"
                    className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-600">IdP SSO URL</Label>
                  <Input
                    value={idpSsoUrl}
                    onChange={(e) => setIdpSsoUrl(e.target.value)}
                    placeholder="https://idp.example.com/sso/saml"
                    className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-stone-600">
                    IdP Certificate (X.509 PEM format)
                    {config?.hasCertificate && (
                      <span className="ml-2 text-emerald-600 text-xs">✓ Certificate configured</span>
                    )}
                  </Label>
                  <textarea
                    value={idpCertificate}
                    onChange={(e) => setIdpCertificate(e.target.value)}
                    placeholder="-----BEGIN CERTIFICATE-----&#10;...&#10;-----END CERTIFICATE-----"
                    rows={4}
                    className="w-full px-3 py-2 bg-white/70 border border-stone-200 rounded-md text-stone-900 text-sm font-mono placeholder:text-stone-500 focus:outline-none focus:ring-2 focus:ring-red-500/50"
                  />
                  <p className="text-xs text-stone-500">
                    {config?.hasCertificate
                      ? 'Leave empty to keep existing certificate, or paste a new one to replace it.'
                      : 'Paste the X.509 certificate from your IdP.'}
                  </p>
                </div>
              </div>

              {/* Domain Restrictions */}
              <div className="space-y-2">
                <Label className="text-stone-600">Allowed Email Domains</Label>
                <Input
                  value={allowedDomains}
                  onChange={(e) => setAllowedDomains(e.target.value)}
                  placeholder="example.com, corp.example.com"
                  className="bg-white/70 border-stone-200 text-stone-900 placeholder:text-stone-500"
                />
                <p className="text-xs text-stone-500">
                  Comma-separated list of email domains allowed for SAML authentication
                </p>
              </div>

              {/* JIT Provisioning */}
              <div className="flex items-center justify-between p-4 bg-white/90 rounded-lg border border-stone-200">
                <div>
                  <Label className="text-stone-900 font-medium">Just-In-Time Provisioning</Label>
                  <p className="text-sm text-stone-500 mt-1">
                    Automatically create user accounts on first SAML login
                  </p>
                </div>
                <Switch
                  checked={jitProvisioning}
                  onCheckedChange={setJitProvisioning}
                  className="data-[state=checked]:bg-red-600"
                />
              </div>

              {/* Enforce SAML */}
              <div className="flex items-center justify-between p-4 bg-amber-50 rounded-lg border border-amber-200">
                <div>
                  <Label className="text-amber-600 font-medium">Enforce SAML-only Authentication</Label>
                  <p className="text-sm text-stone-500 mt-1">
                    Require all users with allowed domains to use SAML authentication
                  </p>
                </div>
                <Switch
                  checked={enforced}
                  onCheckedChange={setEnforced}
                  className="data-[state=checked]:bg-amber-600"
                />
              </div>
            </>
          )}

          {/* Save Button */}
          <div className="flex justify-end pt-4 border-t border-stone-200">
            <Button
              onClick={handleSave}
              disabled={saving}
              className="bg-red-600 hover:bg-red-700 text-white shadow-[0_0_15px_rgba(220,38,38,0.3)]"
            >
              {saving ? 'Saving...' : 'Save Configuration'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
