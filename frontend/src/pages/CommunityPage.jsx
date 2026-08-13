import { useSearchParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import PageHeader from '../components/ui/PageHeader';
import CommunityWorkspace from '../components/community/CommunityWorkspace';

export default function CommunityPage() {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const dmUserId = searchParams.get('dm') || null;

  return (
    <div className="community-page-root space-y-4 sm:space-y-6">
      <PageHeader
        className="hidden sm:flex px-1 sm:px-0"
        title={t('community.title')}
        label={t('community.label')}
        description={t('community.description')}
      />
      <CommunityWorkspace initialDmUserId={dmUserId} />
    </div>
  );

}
