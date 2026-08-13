import { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { register } from '../auth';
import { useAuth } from '../AuthContext';
import { validateInviteCode } from '../referralsApi';
import PhoneInput from '../components/PhoneInput';
import PasswordInput from '../components/PasswordInput';
import AuthLayout from '../layouts/AuthLayout';
import { Label, Input, Hint } from '../components/ui/Input';
import Alert from '../components/ui/Alert';
import Button from '../components/ui/Button';
import { combinePhoneNumber, DEFAULT_COUNTRY_CODE } from '../data/countryCodes';

export default function RegisterPage() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { loginUser } = useAuth();
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    invitationCode: searchParams.get('invite') || '',
  });
  const [inviterPreview, setInviterPreview] = useState(null);
  const [inviteError, setInviteError] = useState('');
  const [countryCode, setCountryCode] = useState(DEFAULT_COUNTRY_CODE);
  const [localNumber, setLocalNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [acceptedLegal, setAcceptedLegal] = useState(false);

  useEffect(() => {
    const code = form.invitationCode.trim();
    if (!code || code.length < 4) {
      setInviterPreview(null);
      setInviteError('');
      return;
    }

    const timer = setTimeout(() => {
      validateInviteCode(code)
        .then((data) => {
          setInviterPreview(data.inviter);
          setInviteError('');
        })
        .catch((err) => {
          setInviterPreview(null);
          setInviteError(err.message);
        });
    }, 400);

    return () => clearTimeout(timer);
  }, [form.invitationCode]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const phone = combinePhoneNumber(countryCode, localNumber);

    if (!form.email.trim() && !phone) {
      setError(t('register.errors.contactRequired'));
      return;
    }
    if (form.password !== form.confirmPassword) {
      setError(t('register.errors.passwordMismatch'));
      return;
    }
    if (form.invitationCode.trim() && inviteError) {
      setError(t('register.errors.fixInviteCode'));
      return;
    }
    if (!acceptedLegal) {
      setError(t('register.errors.legalRequired'));
      return;
    }

    setLoading(true);
    try {
      const { user } = await register({
        email: form.email.trim() || undefined,
        phone: phone || undefined,
        password: form.password,
        confirmPassword: form.confirmPassword,
        name: form.name.trim() || undefined,
        invitationCode: form.invitationCode.trim() || undefined,
        acceptedTerms: true,
      });
      loginUser(user);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const set = (key) => (e) => setForm({ ...form, [key]: e.target.value });

  return (
    <AuthLayout
      title={t('register.title')}
      subtitle={t('register.subtitle')}
      footer={
        <div className="space-y-3">
          <p>
            {t('register.alreadyHaveAccount')}{' '}
            <Link to="/login" className="font-mono text-[var(--color-accent)] hover:underline">
              {t('register.signIn')}
            </Link>
          </p>
          <p className="font-mono text-[11px]">
            <Link to="/terms" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('register.termsOfUse')}
            </Link>
            {' · '}
            <Link to="/privacy" className="hover:underline" style={{ color: 'var(--color-accent)' }}>
              {t('register.privacyPolicy')}
            </Link>
          </p>
        </div>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <Label>{t('register.name')}</Label>
          <Input type="text" value={form.name} onChange={set('name')} placeholder={t('register.namePlaceholder')} />
        </div>
        <div>
          <Label>{t('register.email')}</Label>
          <Input
            type="email"
            value={form.email}
            onChange={set('email')}
            placeholder={t('register.emailPlaceholder')}
            autoComplete="email"
          />
        </div>
        <div>
          <Label>{t('register.phone')}</Label>
          <PhoneInput
            countryCode={countryCode}
            localNumber={localNumber}
            onCountryCodeChange={setCountryCode}
            onLocalNumberChange={setLocalNumber}
          />
          <Hint>{t('register.phoneHint')}</Hint>
        </div>
        <div>
          <Label>{t('register.invitationCode')}</Label>
          <Input
            type="text"
            value={form.invitationCode}
            onChange={set('invitationCode')}
            placeholder={t('register.invitationPlaceholder')}
            autoComplete="off"
            className="uppercase"
          />
          {inviterPreview && (
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-success)' }}>
              {t('register.invitedBy', {
                name:
                  inviterPreview.name ||
                  (inviterPreview.username ? `@${inviterPreview.username}` : t('register.member')),
              })}
            </p>
          )}
          {inviteError && form.invitationCode.trim() && (
            <p className="font-mono text-xs mt-2" style={{ color: 'var(--color-danger)' }}>
              {inviteError}
            </p>
          )}
        </div>
        <div>
          <Label>{t('register.password')}</Label>
          <PasswordInput
            required
            minLength={6}
            value={form.password}
            onChange={set('password')}
            autoComplete="new-password"
          />
        </div>
        <div>
          <Label>{t('register.confirmPassword')}</Label>
          <PasswordInput
            required
            minLength={6}
            value={form.confirmPassword}
            onChange={set('confirmPassword')}
            autoComplete="new-password"
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer text-sm leading-relaxed">
          <input
            type="checkbox"
            checked={acceptedLegal}
            onChange={(e) => setAcceptedLegal(e.target.checked)}
            className="mt-1 shrink-0"
            required
          />
          <span style={{ color: 'var(--color-text-secondary)' }}>
            {t('register.legalAgreement')}
          </span>
        </label>

        {error && <Alert>{error}</Alert>}

        <Button type="submit" className="w-full" loading={loading} disabled={!acceptedLegal}>
          {t('register.createAccount')}
        </Button>
      </form>
    </AuthLayout>
  );
}
