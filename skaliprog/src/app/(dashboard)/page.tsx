import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Users, CreditCard, Calendar, TrendingUp } from 'lucide-react'

const stats = [
  {
    title: 'Adherents actifs',
    value: '124',
    description: '+12 ce mois',
    icon: Users,
    trend: '+10%',
  },
  {
    title: 'Abonnements actifs',
    value: '98',
    description: '5 expirent cette semaine',
    icon: CreditCard,
    trend: '+5%',
  },
  {
    title: 'Cours aujourd\'hui',
    value: '8',
    description: '67 places reservees',
    icon: Calendar,
    trend: null,
  },
  {
    title: 'CA du mois',
    value: '4 250 EUR',
    description: 'vs 3 800 EUR le mois dernier',
    icon: TrendingUp,
    trend: '+12%',
  },
]

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          Bienvenue sur Skali Prog. Voici un apercu de votre salle.
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {stats.map((stat) => (
          <Card key={stat.title}>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">
                {stat.title}
              </CardTitle>
              <stat.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
              <p className="text-xs text-muted-foreground">
                {stat.description}
              </p>
              {stat.trend && (
                <p className="text-xs text-green-600 mt-1">
                  {stat.trend} vs mois precedent
                </p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Quick actions */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Cours du jour</CardTitle>
            <CardDescription>Planning des cours aujourd'hui</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">WOD - 09:00</p>
                  <p className="text-sm text-muted-foreground">12/15 inscrits</p>
                </div>
                <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded">En cours</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">Haltero - 12:00</p>
                  <p className="text-sm text-muted-foreground">8/10 inscrits</p>
                </div>
                <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">A venir</span>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-lg">
                <div>
                  <p className="font-medium">WOD - 18:00</p>
                  <p className="text-sm text-muted-foreground">15/15 inscrits</p>
                </div>
                <span className="text-xs bg-orange-100 text-orange-800 px-2 py-1 rounded">Complet</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Alertes</CardTitle>
            <CardDescription>Actions requises</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center gap-3 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                <span className="text-yellow-600">!</span>
                <div>
                  <p className="text-sm font-medium">5 certificats medicaux expirent</p>
                  <p className="text-xs text-muted-foreground">Dans les 30 prochains jours</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-red-50 border border-red-200 rounded-lg">
                <span className="text-red-600">!</span>
                <div>
                  <p className="text-sm font-medium">3 abonnements expires</p>
                  <p className="text-xs text-muted-foreground">A relancer</p>
                </div>
              </div>
              <div className="flex items-center gap-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <span className="text-blue-600">i</span>
                <div>
                  <p className="text-sm font-medium">2 nouveaux leads</p>
                  <p className="text-xs text-muted-foreground">A contacter</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>WOD du jour</CardTitle>
            <CardDescription>Seance affichee sur les TVs</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-muted rounded-lg">
                <p className="font-bold text-lg">AMRAP 20 min</p>
                <ul className="mt-2 space-y-1 text-sm">
                  <li>5 Pull-ups</li>
                  <li>10 Push-ups</li>
                  <li>15 Air Squats</li>
                </ul>
              </div>
              <button className="w-full text-sm text-primary hover:underline">
                Modifier la seance &rarr;
              </button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
