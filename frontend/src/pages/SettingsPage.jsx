import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAuth } from '../AuthContext';
import { updateProfile, userDisplayId } from '../auth';
import PhoneInput from '../components/PhoneInput';
import UserAvatar from '../components/community/UserAvatar';
import LanguageSwitcher from '../components/LanguageSwitcher';
import PageHeader from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Label, Input, Hint } from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { APP_NAME, APP_VERSION } from '../lib/appMeta';
import { combinePhoneNumber, parsePhoneNumber } from '../data/countryCodes';

export default function SettingsPage() {
  const { t } = useTranslation();
  const { user, refreshUser } = useAuth();
  const initialPhone = parsePhoneNumber(user?.phone);

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [avatarUrl, setAvatarUrl] = useState(user?.avatarUrl || '');
  const [countryCode, setCountryCode] = useState(initialPhone.countryCode);
  const [localNumber, setLocalNumber] = useState(initialPhone.localNumber);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    const phone = combinePhoneNumber(countryCode, localNumber);

    if (!email.trim() && !phone) {
      setError(t('settings.keepEmailOrPhone'));
      return;
    }

    setLoading(true);
    try {
      await updateProfile({
        name,
        email: email.trim() || null,
        phone: phone || null,
        avatarUrl: avatarUrl.trim() || null,
      });
      await refreshUser();
      setMessage(t('settings.profileUpdated'));
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg">
      <PageHeader
        title={t('settings.title')}
        description={t('settings.description', { user: userDisplayId(user) })}
      />

      <Card className="mb-4">
        <CardContent className="pt-6">
          <LanguageSwitcher />
          <Hint className="mt-2">{t('settings.languageHint')}</Hint>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            {user?.username && (
              <div>
                <Label>{t('settings.username')}</Label>
                <Input type="text" value={`@${user.username}`} readOnly disabled />
                <Hint>{t('settings.usernameHint')}</Hint>
              </div>
            )}
            <div>
              <Label>{t('settings.profileImage')}</Label>
              <div className="flex items-center gap-4 mb-3">
                <UserAvatar
                  name={name || userDisplayId(user)}
                  avatarUrl={avatarUrl || user?.avatarUrl}
                  userId={user?.id}
                  size={56}
                />
                <p className="text-xs leading-relaxed" style={{ color: 'var(--color-text-muted)' }}>
                  {t('settings.profileImageHint')}
                </p>
              </div>
              <Input
                type="url"
                value={avatarUrl}
                onChange={(e) => setAvatarUrl(e.target.value)}
                placeholder={t('settings.profileImagePlaceholder')}
              />
            </div>
            <div>
              <Label>{t('auth.fullName')}</Label>
              <Input type="text" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <Label>{t('auth.email')}</Label>
              <Input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t('auth.enterEmailOrUsername')}
              />
            </div>
            <div>
              <Label>{t('auth.phone')}</Label>
              <PhoneInput
                countryCode={countryCode}
                localNumber={localNumber}
                onCountryCodeChange={setCountryCode}
                onLocalNumberChange={setLocalNumber}
              />
              <Hint>{t('settings.keepEmailOrPhone')}</Hint>
            </div>

            {message && <Alert variant="success">{message}</Alert>}
            {error && <Alert>{error}</Alert>}

            <Button type="submit" className="w-full" loading={loading}>
              {t('settings.saveChanges')}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="font-mono text-[11px] mt-6 text-center" style={{ color: 'var(--color-text-muted)' }}>
        {APP_NAME} v{APP_VERSION}
      </p>
    </div>
  );
}
