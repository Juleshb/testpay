import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import DocsPageLayout, { DocSection, DocEndpoint, DocCode } from '../layouts/DocsPageLayout';
import ApiDocsUnlockGate from '../components/ApiDocsUnlockGate';
import HelpBot from '../components/HelpBot';
import { flatDocNav } from '../lib/docsNav';
import { APP_NAME, APP_VERSION } from '../lib/appMeta';

const NAV_IDS = [
  'overview', 'auth', 'public', 'accounts', 'payments', 'packages', 'transfers',
  'withdrawals', 'referrals', 'loans', 'community', 'realtime', 'admin', 'errors',
];

export default function DeveloperDocsPage() {
  const { t } = useTranslation();
  const sidebarNav = flatDocNav(NAV_IDS.map((id) => ({ id, label: t(`docsNav.${id}`) })));

  const docsContent = (
    <>
      <DocSection id="overview" title="Overview">
        <p>
          Base URL (local development): <code className="docs-inline">http://localhost:3001</code>
        </p>
        <p>
          In production, replace the host with your deployed API domain. The web app proxies{' '}
          <code className="docs-inline">/api</code> to the backend during development.
        </p>
        <DocEndpoint
          method="GET"
          path="/health"
          description="Health check and API version."
          response={`{
  "status": "ok",
  "version": "${APP_VERSION}",
  "defaultChainId": 11155111
}`}
        />
        <DocEndpoint
          method="GET"
          path="/api/config"
          description="Platform configuration exposed to clients."
        />
        <DocEndpoint
          method="GET"
          path="/api/networks"
          description="Supported EVM networks for payments and withdrawals."
        />
        <p>
          Send <code className="docs-inline">Content-Type: application/json</code> for POST, PATCH, and PUT
          requests with a body.
        </p>
      </DocSection>

      <DocSection id="auth" title="Authentication">
        <p>
          Most user endpoints require a JWT bearer token obtained from login or registration. Include the token on
          every authenticated request:
        </p>
        <DocCode>{`Authorization: Bearer <token>`}</DocCode>
        <p>Tokens expire after 7 days. Admin endpoints require a user with the ADMIN role.</p>
      </DocSection>

      <DocSection id="public" title="Public API">
        <p>No authentication required.</p>
        <DocEndpoint
          method="GET"
          path="/api/public/showcase"
          description="Landing page content: leadership team and approved member reviews."
        />
        <DocEndpoint
          method="GET"
          path="/api/public/meta"
          description="App name and version metadata."
          response={`{ "version": "${APP_VERSION}", "name": "${APP_NAME}" }`}
        />
        <DocEndpoint
          method="POST"
          path="/api/public/testimonials"
          description="Submit a public review (pending admin approval before it appears on the landing page)."
          body={`{
  "name": "Alex",
  "role": "Member",
  "quote": "Great experience using StackPay.",
  "rating": 5
}`}
        />
      </DocSection>

      <DocSection id="accounts" title="Accounts">
        <DocEndpoint
          method="POST"
          path="/api/auth/register"
          description="Create a new account."
          body={`{
  "email": "you@example.com",
  "phone": "+15551234567",
  "password": "secret123",
  "confirmPassword": "secret123",
  "name": "Alex",
  "invitationCode": "OPTIONAL",
  "acceptedTerms": true
}`}
          response={`{
  "token": "<jwt>",
  "user": { "id": "...", "username": "@alex", "email": "..." }
}`}
        />
        <DocEndpoint
          method="POST"
          path="/api/auth/login"
          description="Sign in with username, email, or phone."
          body={`{
  "identifier": "you@example.com",
  "password": "secret123"
}`}
        />
        <DocEndpoint method="GET" path="/api/auth/me" auth="Bearer" description="Get the current user profile." />
        <DocEndpoint
          method="PATCH"
          path="/api/auth/me"
          auth="Bearer"
          description="Update profile fields such as name, email, phone, or avatarUrl."
          body={`{
  "name": "Alex Rivera",
  "avatarUrl": "https://example.com/photo.jpg"
}`}
        />
      </DocSection>

      <DocSection id="payments" title="Payments">
        <DocEndpoint
          method="POST"
          path="/api/payments"
          auth="Bearer"
          description="Create a crypto payment request and receive a unique deposit address."
          body={`{
  "amount": "0.01",
  "chainId": 11155111,
  "tokenSymbol": "ETH"
}`}
        />
        <DocEndpoint method="GET" path="/api/payments" auth="Bearer" description="List your payment requests." />
        <DocEndpoint method="GET" path="/api/payments/:id" auth="Bearer" description="Get one payment by ID." />
        <DocEndpoint
          method="GET"
          path="/api/payments/:id/balance"
          auth="Bearer"
          description="Check on-chain deposit balance for a payment address."
        />
        <DocEndpoint
          method="POST"
          path="/api/payments/:id/tx"
          auth="Bearer"
          description="Register a transaction hash after sending crypto from your wallet."
          body={`{ "txHash": "0x..." }`}
        />
        <DocEndpoint
          method="GET"
          path="/api/payments/stats/dashboard"
          auth="Bearer"
          description="Dashboard payment stats and USD balance summary."
        />
        <DocEndpoint
          method="GET"
          path="/api/payments/stats/balance"
          auth="Bearer"
          description="Current USD balance and ledger summary."
        />
      </DocSection>

      <DocSection id="packages" title="Packages">
        <DocEndpoint method="GET" path="/api/packages/plans" auth="Bearer" description="List active investment packages." />
        <DocEndpoint
          method="GET"
          path="/api/packages/dashboard"
          auth="Bearer"
          description="Portfolio overview, active investments, and income summary."
        />
        <DocEndpoint method="GET" path="/api/packages/investments" auth="Bearer" description="List your investments." />
        <DocEndpoint method="GET" path="/api/packages/income" auth="Bearer" description="List package income history." />
        <DocEndpoint
          method="POST"
          path="/api/packages/invest"
          auth="Bearer"
          description="Invest USD balance into a package."
          body={`{
  "packageId": "<uuid>",
  "amountUsd": "100"
}`}
        />
      </DocSection>

      <DocSection id="transfers" title="Transfers">
        <DocEndpoint method="GET" path="/api/transfers/balance" auth="Bearer" description="Available USD balance for transfers." />
        <DocEndpoint
          method="GET"
          path="/api/transfers/lookup?q=@username"
          auth="Bearer"
          description="Find a recipient by username, email, or phone."
        />
        <DocEndpoint
          method="POST"
          path="/api/transfers"
          auth="Bearer"
          description="Send USD balance to another StackPay member."
          body={`{
  "recipientId": "<user-id>",
  "amountUsd": "25.00",
  "note": "Thanks"
}`}
        />
        <DocEndpoint method="GET" path="/api/transfers" auth="Bearer" description="Transfer history." />
      </DocSection>

      <DocSection id="withdrawals" title="Withdrawals">
        <DocEndpoint method="GET" path="/api/withdrawals/options" description="Supported withdrawal tokens and networks." />
        <DocEndpoint method="GET" path="/api/withdrawals/balance" auth="Bearer" description="Withdrawable USD balance." />
        <DocEndpoint method="GET" path="/api/withdrawals/saved-wallet" auth="Bearer" description="Get saved payout wallet." />
        <DocEndpoint
          method="PUT"
          path="/api/withdrawals/saved-wallet"
          auth="Bearer"
          description="Save a default withdrawal wallet."
          body={`{
  "address": "0x...",
  "chainId": 11155111,
  "token": "USDC"
}`}
        />
        <DocEndpoint
          method="POST"
          path="/api/withdrawals"
          auth="Bearer"
          description="Request a withdrawal payout."
          body={`{
  "amountUsd": "50",
  "chainId": 11155111,
  "token": "USDC",
  "address": "0x..."
}`}
        />
        <DocEndpoint method="GET" path="/api/withdrawals" auth="Bearer" description="List withdrawal requests." />
        <DocEndpoint method="GET" path="/api/withdrawals/:id" auth="Bearer" description="Get one withdrawal by ID." />
      </DocSection>

      <DocSection id="referrals" title="Referrals">
        <DocEndpoint
          method="GET"
          path="/api/referrals/validate/:code"
          description="Validate an invitation code before registration."
        />
        <DocEndpoint
          method="GET"
          path="/api/referrals/me"
          auth="Bearer"
          description="Invite code, referral stats, invited users, and commission history."
        />
      </DocSection>

      <DocSection id="loans" title="Loans">
        <DocEndpoint method="GET" path="/api/loans/dashboard" auth="Bearer" description="Loan eligibility and active loans." />
        <DocEndpoint
          method="POST"
          path="/api/loans/apply"
          auth="Bearer"
          description="Apply for a loan against active investments."
          body={`{ "amountUsd": "100" }`}
        />
      </DocSection>

      <DocSection id="community" title="Community">
        <DocEndpoint method="GET" path="/api/community/channels" auth="Bearer" description="List community channels." />
        <DocEndpoint method="GET" path="/api/community/feed?channel=general" auth="Bearer" description="Channel posts." />
        <DocEndpoint
          method="POST"
          path="/api/community/feed"
          auth="Bearer"
          description="Create a channel post."
          body={`{
  "channelSlug": "general",
  "content": "Hello community"
}`}
        />
        <DocEndpoint method="GET" path="/api/community/members" auth="Bearer" description="Community member directory." />
        <DocEndpoint method="GET" path="/api/community/conversations" auth="Bearer" description="Direct message threads." />
        <DocEndpoint
          method="POST"
          path="/api/community/conversations"
          auth="Bearer"
          description="Start or open a DM with another member."
          body={`{ "userId": "<member-id>" }`}
        />
        <DocEndpoint
          method="GET"
          path="/api/community/conversations/:id/messages"
          auth="Bearer"
          description="Messages in a conversation."
        />
        <DocEndpoint
          method="POST"
          path="/api/community/conversations/:id/messages"
          auth="Bearer"
          description="Send a direct message."
          body={`{ "content": "Hi there" }`}
        />
        <DocEndpoint method="GET" path="/api/community/unread-summary" auth="Bearer" description="Unread counts for channels and DMs." />
      </DocSection>

      <DocSection id="realtime" title="WebSocket">
        <p>
          Community realtime events are available at <code className="docs-inline">/ws/community</code>. Pass your JWT
          as a query parameter:
        </p>
        <DocCode>{`ws://localhost:3001/ws/community?token=<jwt>`}</DocCode>
        <p>Event types include channel posts, reactions, direct messages, and unread notifications.</p>
        <DocCode>{`{ "type": "connected", "userId": "..." }

{ "type": "channel:post", "channel": "general", "post": { ... } }

{ "type": "dm:message", "conversationId": "...", "message": { ... } }`}</DocCode>
      </DocSection>

      <DocSection id="admin" title="Admin API">
        <p>
          All <code className="docs-inline">/api/admin/*</code> routes require an authenticated admin user. Common
          endpoints:
        </p>
        <DocEndpoint method="GET" path="/api/admin/dashboard" auth="Admin Bearer" description="System dashboard stats." />
        <DocEndpoint method="GET" path="/api/admin/users" auth="Admin Bearer" description="Registered users." />
        <DocEndpoint method="GET" path="/api/admin/payments" auth="Admin Bearer" description="All payments." />
        <DocEndpoint method="GET" path="/api/admin/packages" auth="Admin Bearer" description="Manage investment packages." />
        <DocEndpoint method="POST" path="/api/admin/sweep" auth="Admin Bearer" description="Sweep confirmed payments to treasury." />
        <DocEndpoint method="GET" path="/api/admin/testimonials" auth="Admin Bearer" description="Approve public reviews." />
        <DocEndpoint method="GET" path="/api/admin/showcase-team" auth="Admin Bearer" description="Manage landing page team." />
      </DocSection>

      <DocSection id="errors" title="Errors">
        <p>Errors return JSON with an error message:</p>
        <DocCode>{`{ "error": "Authentication required" }`}</DocCode>
        <p>Common status codes:</p>
        <ul className="list-disc pl-5 space-y-1">
          <li><strong>400</strong> — invalid input</li>
          <li><strong>401</strong> — missing or invalid token</li>
          <li><strong>403</strong> — forbidden (e.g. non-admin)</li>
          <li><strong>404</strong> — resource not found</li>
          <li><strong>409</strong> — conflict (duplicate email, phone, etc.)</li>
          <li><strong>500</strong> — server error</li>
        </ul>
      </DocSection>
    </>
  );

  return (
    <DocsPageLayout
      title={t('docs.title')}
      sectionLabel={t('common.developers')}
      sidebarNav={sidebarNav}
      subtitle={t('docs.subtitle', { name: APP_NAME })}
    >
      <div
        className="mb-8 rounded-xl border px-4 py-3"
        style={{ borderColor: 'var(--color-border)', background: 'var(--color-surface-800)' }}
      >
        <p className="text-sm" style={{ color: 'var(--color-text-secondary)' }}>
          {t('docs.publicGuideHint', { name: APP_NAME })}{' '}
          <Link to="/guide" className="text-[var(--color-accent)] hover:underline">
            {t('docs.publicGuideLink')}
          </Link>{' '}
          {t('docs.publicGuideSuffix')}
        </p>
      </div>

      <ApiDocsUnlockGate>{docsContent}</ApiDocsUnlockGate>
      <HelpBot context="developer" />
    </DocsPageLayout>
  );
}
