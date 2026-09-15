import { useState, useEffect } from 'react';
import { Eye, Users } from 'lucide-react';
import { useViewerAccess } from '@/hooks/useViewerAccess';
import { useProfile } from '@/hooks/useProfile';
import { PeopleService } from '@/services/PeopleService';
import { AccessService } from '@/services/AccessService';
import { HouseholdService } from '@/services/HouseholdService';
import { HouseholdMembership } from '@/services/supabaseData';
import { AccessScope, ACCESS_SCOPE_LABELS, ACCESS_SCOPES } from '@/types/people';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const ViewerGuideCard = () => {
  const { role, isAdmin, canEdit, trustedPersonId, accessLoading } = useViewerAccess();
  const { profile } = useProfile();
  const [memberships, setMemberships] = useState<HouseholdMembership[]>([]);

  useEffect(() => {
    if (isAdmin) return;
    HouseholdService.listMemberships().then(setMemberships).catch(() => {});
  }, [isAdmin]);

  if (accessLoading || isAdmin) return null;

  const owner = PeopleService.getAll().find((p) => p.accessLevel === 'owner');
  const ownerFirstName = owner?.name?.split(' ')[0] ?? 'the owner';

  const myScopes = ACCESS_SCOPES.filter((scope) =>
    trustedPersonId ? AccessService.canSee(trustedPersonId, scope) : false
  );
  const scopeLabels = myScopes.map((s) => ACCESS_SCOPE_LABELS[s]);
  const scopeList = scopeLabels.length > 0 ? scopeLabels.join(', ') : 'nothing yet';
  const canEditText = canEdit ? 'view and edit' : 'view';
  const multiHousehold = memberships.length >= 2;
  const currentHouseholdName = memberships.find(
    (m) => m.householdId === profile?.householdId
  )?.householdName;

  return (
    <Card className="mb-6">
      <CardHeader className="pb-2">
        <CardTitle className="text-base font-semibold flex items-center gap-2">
          <Eye className="w-4 h-4 text-primary" />
          What you can see here
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <p className="text-sm text-muted-foreground">
          {ownerFirstName} has shared these with you: <span className="font-medium text-foreground">{scopeList}</span>.
        </p>
        <p className="text-sm text-muted-foreground">
          You can {canEditText} these. If something you need isn't here, ask {ownerFirstName} to update your access.
        </p>
        {multiHousehold && currentHouseholdName && (
          <p className="text-sm text-muted-foreground flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5" />
            You're viewing {currentHouseholdName}. Switch households from your profile menu.
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ViewerGuideCard;
