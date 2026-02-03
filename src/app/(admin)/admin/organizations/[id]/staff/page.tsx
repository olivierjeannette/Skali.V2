import { getOrganizationById } from '@/actions/platform';
import { getOrganizationStaff } from '@/actions/admin';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import Link from 'next/link';
import { ArrowLeft, User, Crown, Shield, Users, Briefcase } from 'lucide-react';
import { StaffActions, AddStaffDialog } from './staff-actions';
import { notFound } from 'next/navigation';

const roleConfig = {
  owner: { label: 'Proprietaire', color: 'bg-orange-500', icon: Crown },
  admin: { label: 'Admin', color: 'bg-blue-500', icon: Shield },
  coach: { label: 'Coach', color: 'bg-green-500', icon: Users },
  staff: { label: 'Staff', color: 'bg-gray-500', icon: Briefcase },
};

export default async function OrganizationStaffPage({
  params,
}: {
  params: { id: string };
}) {
  const [org, staff] = await Promise.all([
    getOrganizationById(params.id),
    getOrganizationStaff(params.id),
  ]);

  if (!org) {
    notFound();
  }

  return (
    <div className="space-y-6">
      {/* Back button + Header */}
      <div className="flex items-center gap-4">
        <Link href={`/admin/organizations/${params.id}`}>
          <Button variant="ghost" size="sm">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Retour
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            Staff de {org.name}
          </h1>
          <p className="text-gray-500">{staff.length} membres du staff</p>
        </div>
      </div>

      {/* Add Staff Button */}
      <div className="flex justify-end">
        <AddStaffDialog orgId={params.id} />
      </div>

      {/* Staff List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {staff.map((member) => {
          const config = roleConfig[member.role] || roleConfig.staff;
          const RoleIcon = config.icon;

          return (
            <Card key={member.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-3">
                    {member.user?.avatar_url ? (
                      <img
                        src={member.user.avatar_url}
                        alt=""
                        className="h-12 w-12 rounded-full object-cover"
                      />
                    ) : (
                      <div className="h-12 w-12 rounded-full bg-gray-200 flex items-center justify-center">
                        <User className="h-6 w-6 text-gray-500" />
                      </div>
                    )}
                    <div>
                      <CardTitle className="text-base">
                        {member.user?.full_name || 'Sans nom'}
                      </CardTitle>
                      <p className="text-sm text-gray-500">
                        {member.user?.email}
                      </p>
                    </div>
                  </div>
                  <StaffActions member={member} orgId={params.id} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between">
                  <Badge className={`${config.color} text-white`}>
                    <RoleIcon className="h-3 w-3 mr-1" />
                    {config.label}
                  </Badge>
                  {!member.is_active && (
                    <Badge variant="outline" className="text-red-500 border-red-500">
                      Inactif
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-gray-400 mt-3">
                  Ajoute le{' '}
                  {new Date(member.created_at).toLocaleDateString('fr-FR')}
                </p>
              </CardContent>
            </Card>
          );
        })}

        {staff.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-12 text-center text-gray-500">
              <Users className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun membre du staff</p>
              <p className="text-sm">
                Ajoutez des admins, coachs ou staff a cette organisation
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
