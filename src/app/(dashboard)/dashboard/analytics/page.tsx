import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Users, Calendar, TrendingUp, CreditCard, ArrowUp, ArrowDown } from 'lucide-react';
import { getDashboardStats, getRevenueByMonth, getAttendanceByDay } from '@/actions/dashboard';
import { AnalyticsCharts } from './charts';

export default async function AnalyticsPage() {
  const [stats, revenueData, attendanceData] = await Promise.all([
    getDashboardStats(),
    getRevenueByMonth(6),
    getAttendanceByDay(7),
  ]);

  const kpis = [
    {
      title: 'Membres totaux',
      value: stats.members.total,
      change: stats.members.newThisMonth,
      changeLabel: 'nouveaux ce mois',
      trend: stats.members.newThisMonth > 0 ? 'up' : 'neutral',
      icon: Users,
    },
    {
      title: 'Abonnements actifs',
      value: stats.subscriptions.active,
      change: stats.subscriptions.expiringSoon,
      changeLabel: 'expirent bientot',
      trend: stats.subscriptions.expiringSoon > 3 ? 'down' : 'neutral',
      icon: CreditCard,
    },
    {
      title: 'Cours cette semaine',
      value: stats.planning.classesThisWeek,
      change: stats.planning.classesToday,
      changeLabel: "aujourd'hui",
      trend: 'neutral',
      icon: Calendar,
    },
    {
      title: 'Presence moyenne',
      value: stats.planning.averageAttendance,
      change: 0,
      changeLabel: 'par cours',
      trend: stats.planning.averageAttendance > 5 ? 'up' : 'neutral',
      icon: TrendingUp,
    },
  ];

  const totalRevenue = revenueData.reduce((sum, r) => sum + r.revenue, 0);
  const totalAttendance = attendanceData.reduce((sum, a) => sum + a.attendance, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Statistiques detaillees de votre salle
        </p>
      </div>

      {/* KPIs */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {kpis.map((kpi) => (
          <Card key={kpi.title}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {kpi.title}
              </CardTitle>
              <kpi.icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{kpi.value}</div>
              <div className="flex items-center gap-1 mt-1">
                {kpi.trend === 'up' && (
                  <ArrowUp className="h-3 w-3 text-green-500" />
                )}
                {kpi.trend === 'down' && (
                  <ArrowDown className="h-3 w-3 text-red-500" />
                )}
                <span className={`text-xs ${
                  kpi.trend === 'up' ? 'text-green-600' :
                  kpi.trend === 'down' ? 'text-red-600' :
                  'text-muted-foreground'
                }`}>
                  {kpi.change > 0 && '+'}{kpi.change} {kpi.changeLabel}
                </span>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Charts */}
      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Revenus mensuels</CardTitle>
            <CardDescription>
              Total: {totalRevenue.toLocaleString('fr-FR')} € sur 6 mois
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsCharts
              revenueData={revenueData}
              attendanceData={attendanceData}
              chartType="revenue"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Presence (7 derniers jours)</CardTitle>
            <CardDescription>
              Total: {totalAttendance} check-ins cette semaine
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AnalyticsCharts
              revenueData={revenueData}
              attendanceData={attendanceData}
              chartType="attendance"
            />
          </CardContent>
        </Card>
      </div>

      {/* Additional Stats */}
      <div className="grid gap-6 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle>Repartition membres</CardTitle>
            <CardDescription>Par statut</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Actifs</span>
                </div>
                <span className="font-medium">{stats.members.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-gray-400" />
                  <span className="text-sm">Inactifs</span>
                </div>
                <span className="font-medium">{stats.members.total - stats.members.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Nouveaux (ce mois)</span>
                </div>
                <span className="font-medium">{stats.members.newThisMonth}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Abonnements</CardTitle>
            <CardDescription>Vue d&apos;ensemble</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Actifs</span>
                </div>
                <span className="font-medium">{stats.subscriptions.active}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-amber-500" />
                  <span className="text-sm">Expirent bientot</span>
                </div>
                <span className="font-medium">{stats.subscriptions.expiringSoon}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">Revenus actifs</span>
                </div>
                <span className="font-medium">{stats.subscriptions.revenue.toLocaleString('fr-FR')} €</span>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Planning</CardTitle>
            <CardDescription>Cette semaine</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-primary" />
                  <span className="text-sm">Cours programmes</span>
                </div>
                <span className="font-medium">{stats.planning.classesThisWeek}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-blue-500" />
                  <span className="text-sm">Aujourd&apos;hui</span>
                </div>
                <span className="font-medium">{stats.planning.classesToday}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-3 h-3 rounded-full bg-green-500" />
                  <span className="text-sm">Presence moyenne</span>
                </div>
                <span className="font-medium">{stats.planning.averageAttendance} pers.</span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
