import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { login } from '../auth';
import { useAuth } from '../AuthContext';
import PhoneInput from '../components/PhoneInput';
import PasswordInput from '../components/PasswordInput';
import AuthLayout from '../layouts/AuthLayout';
import SegmentedControl from '../components/ui/SegmentedControl';
import { Label, Input } from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { combinePhoneNumber, DEFAULT_COUNTRY_CODE } from '../data/countryCodes';

export default function LoginPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { loginUser } = useAuth();
  const [usePhone, setUsePhone] = useState(false);
  const [email, setEmail] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [localNumber, setLocalNumber] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const identifier = usePhone
        ? combinePhoneNumber(countryCode, localNumber)
        : email.trim();

      if (!identifier) {
        setError(usePhone ? t('auth.enterPhone') : t('auth.enterEmailOrUsername'));
        setLoading(false);
        return;
      }

      const { user } = await login({ identifier, password });
      loginUser(user);
      navigate(user.role === 'ADMIN' ? '/admin' : '/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthLayout
      title={t('auth.welcomeBack')}
      subtitle={t('auth.signInSubtitle')}
      footer={
        <>
          {t('auth.noAccount')}{' '}
          <Link to="/register" className="font-mono text-[var(--color-accent)] hover:underline">
            {t('auth.createOne')}
          </Link>
        </>
      }
    >
      <SegmentedControl
        options={[
          { value: false, label: t('auth.emailUsername') },
          { value: true, label: t('auth.phone') },
        ]}
        value={usePhone}
        onChange={setUsePhone}
        className="mb-6"
      />

      <form onSubmit={handleSubmit} className="space-y-5">
        {usePhone ? (
          <div>
            <Label>{t('auth.phoneNumber')}</Label>
            <PhoneInput
              countryCode={countryCode}
              localNumber={localNumber}
              onCountryCodeChange={setCountryCode}
              onLocalNumberChange={setLocalNumber}
            />
          </div>
        ) : (
          <div>
            <Label>{t('auth.emailUsername')}</Label>
            <Input
              type="text"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="username"
            />
          </div>
        )}

        <div>
          <Label>{t('auth.password')}</Label>
          <PasswordInput
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
        </div>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" className="w-full" loading={loading}>
          {t('auth.signIn')}
        </Button>
      </form>
    </AuthLayout>
  );
}
