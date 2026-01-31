import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import { Plus, Search, Filter, MoreHorizontal } from 'lucide-react'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'

// Donnees de demo - sera remplace par Supabase
const members = [
  {
    id: '1',
    first_name: 'Marie',
    last_name: 'Dupont',
    email: 'marie.dupont@email.com',
    phone: '06 12 34 56 78',
    status: 'active',
    subscription: 'Illimite',
    created_at: '2024-01-15',
  },
  {
    id: '2',
    first_name: 'Pierre',
    last_name: 'Martin',
    email: 'pierre.martin@email.com',
    phone: '06 98 76 54 32',
    status: 'active',
    subscription: '10 seances',
    created_at: '2024-02-20',
  },
  {
    id: '3',
    first_name: 'Sophie',
    last_name: 'Bernard',
    email: 'sophie.bernard@email.com',
    phone: '06 11 22 33 44',
    status: 'expired',
    subscription: 'Mensuel',
    created_at: '2023-11-10',
  },
  {
    id: '4',
    first_name: 'Lucas',
    last_name: 'Petit',
    email: 'lucas.petit@email.com',
    phone: '06 55 66 77 88',
    status: 'prospect',
    subscription: '-',
    created_at: '2024-03-01',
  },
]

const statusConfig = {
  active: { label: 'Actif', variant: 'default' as const },
  expired: { label: 'Expire', variant: 'destructive' as const },
  prospect: { label: 'Prospect', variant: 'secondary' as const },
  suspended: { label: 'Suspendu', variant: 'outline' as const },
}

export default function MembersPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Adherents</h1>
          <p className="text-muted-foreground">
            Gerez vos adherents et leurs abonnements
          </p>
        </div>
        <Button>
          <Plus className="mr-2 h-4 w-4" />
          Nouvel adherent
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Recherche et filtres</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input placeholder="Rechercher par nom, email..." className="pl-9" />
            </div>
            <Button variant="outline">
              <Filter className="mr-2 h-4 w-4" />
              Filtres
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Members table */}
      <Card>
        <CardHeader>
          <CardTitle>Liste des adherents</CardTitle>
          <CardDescription>
            {members.length} adherent(s) au total
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Adherent</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Telephone</TableHead>
                <TableHead>Statut</TableHead>
                <TableHead>Abonnement</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((member) => (
                <TableRow key={member.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {member.first_name[0]}{member.last_name[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {member.first_name} {member.last_name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Inscrit le {new Date(member.created_at).toLocaleDateString('fr-FR')}
                        </p>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{member.email}</TableCell>
                  <TableCell>{member.phone}</TableCell>
                  <TableCell>
                    <Badge variant={statusConfig[member.status as keyof typeof statusConfig].variant}>
                      {statusConfig[member.status as keyof typeof statusConfig].label}
                    </Badge>
                  </TableCell>
                  <TableCell>{member.subscription}</TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>Voir le profil</DropdownMenuItem>
                        <DropdownMenuItem>Modifier</DropdownMenuItem>
                        <DropdownMenuItem>Ajouter un abonnement</DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive">
                          Archiver
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  )
}
