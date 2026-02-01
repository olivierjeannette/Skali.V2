import { Suspense } from 'react';
import Link from 'next/link';
import { requireOrganization } from '@/lib/auth';
import { getClassTemplates } from '@/actions/planning';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { TemplateActions } from './template-actions';

function getClassTypeLabel(classType: string) {
  switch (classType) {
    case 'group':
      return 'Cours collectif';
    case 'private':
      return 'Cours prive';
    case 'open_gym':
      return 'Open Gym';
    case 'event':
      return 'Evenement';
    case 'workshop':
      return 'Atelier';
    default:
      return classType;
  }
}

async function TemplatesList({ orgId }: { orgId: string }) {
  const templates = await getClassTemplates(orgId);

  if (templates.length === 0) {
    return (
      <div className="text-center py-12">
        <h3 className="text-lg font-semibold mb-2">Aucun modele de cours</h3>
        <p className="text-muted-foreground mb-4">
          Les modeles vous permettent de creer rapidement des cours avec des parametres predefinis.
        </p>
        <Button asChild>
          <Link href="/dashboard/planning/templates/new">Creer un modele</Link>
        </Button>
      </div>
    );
  }

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Duree</TableHead>
          <TableHead>Capacite</TableHead>
          <TableHead>Cout seance</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {templates.map((template) => (
          <TableRow key={template.id}>
            <TableCell>
              <div className="flex items-center gap-3">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: template.color }}
                />
                <div>
                  <div className="font-medium">{template.name}</div>
                  {template.description && (
                    <div className="text-sm text-muted-foreground line-clamp-1">
                      {template.description}
                    </div>
                  )}
                </div>
              </div>
            </TableCell>
            <TableCell>
              <Badge variant="outline">{getClassTypeLabel(template.class_type)}</Badge>
            </TableCell>
            <TableCell>{template.duration_minutes} min</TableCell>
            <TableCell>
              {template.max_participants ? (
                <span>{template.max_participants} places</span>
              ) : (
                <span className="text-muted-foreground">Illimite</span>
              )}
            </TableCell>
            <TableCell>
              {template.session_cost > 0 ? (
                <span>{template.session_cost} seance{template.session_cost > 1 ? 's' : ''}</span>
              ) : (
                <span className="text-muted-foreground">Gratuit</span>
              )}
            </TableCell>
            <TableCell className="text-right">
              <TemplateActions templateId={template.id} templateName={template.name} />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

function TemplatesSkeleton() {
  return (
    <div className="space-y-4">
      {[...Array(5)].map((_, i) => (
        <div key={i} className="h-16 bg-muted animate-pulse rounded" />
      ))}
    </div>
  );
}

export default async function TemplatesPage() {
  const org = await requireOrganization();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" asChild>
            <Link href="/dashboard/planning">
              <svg
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M15 19l-7-7 7-7"
                />
              </svg>
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Modeles de cours</h1>
            <p className="text-muted-foreground">
              Gerez vos modeles pour creer rapidement des cours
            </p>
          </div>
        </div>
        <Button asChild>
          <Link href="/dashboard/planning/templates/new">Nouveau modele</Link>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Tous les modeles</CardTitle>
          <CardDescription>
            Les modeles definissent les parametres par defaut pour vos cours
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Suspense fallback={<TemplatesSkeleton />}>
            <TemplatesList orgId={org.id} />
          </Suspense>
        </CardContent>
      </Card>
    </div>
  );
}
