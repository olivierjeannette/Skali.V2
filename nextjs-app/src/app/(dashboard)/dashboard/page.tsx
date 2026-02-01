import Link from 'next/link';
import { getTranslations, getLocale } from 'next-intl/server';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Users, Calendar, TrendingUp, CreditCard, Clock, AlertCircle, Plus, UserPlus } from 'lucide-react';
import { getDashboardStats } from '@/actions/dashboard';

export default async function DashboardPage() {
  const t = await getTranslations('dashboard');
  const locale = await getLocale();
  const stats = await getDashboardStats();

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString(locale === 'fr' ? 'fr-FR' : 'en-US', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatRelativeTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMs / 3600000);
    const diffDays = Math.floor(diffMs / 86400000);

    if (diffMins < 1) return t('justNow');
    if (diffMins < 60) return t('minutesAgo', { count: diffMins });
    if (diffHours < 24) return t('hoursAgo', { count: diffHours });
    return t('daysAgo', { count: diffDays });
  };

  const statCards = [
    {
      title: t('activeMembers'),
      value: stats.members.active,
      description: t('newThisMonth', { count: stats.members.newThisMonth }),
      icon: Users,
      href: '/dashboard/members',
      trend: stats.members.newThisMonth > 0 ? 'up' : 'neutral',
    },
    {
      title: t('classesToday'),
      value: stats.planning.classesToday,
      description: t('classesThisWeek', { count: stats.planning.classesThisWeek }),
      icon: Calendar,
      href: '/dashboard/planning',
      trend: 'neutral',
    },
    {
      title: t('averageAttendance'),
      value: stats.planning.averageAttendance,
      description: t('participantsPerClass'),
      icon: TrendingUp,
      href: '/dashboard/planning',
      trend: stats.planning.averageAttendance > 5 ? 'up' : 'neutral',
    },
    {
      title: t('activeSubscriptions'),
      value: stats.subscriptions.active,
      description: stats.subscriptions.expiringSoon > 0
        ? t('expiringSoon', { count: stats.subscriptions.expiringSoon })
        : t('allUpToDate'),
      icon: CreditCard,
      href: '/dashboard/subscriptions',
      trend: stats.subscriptions.expiringSoon > 3 ? 'warning' : 'neutral',
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">{t('title')}</h1>
          <p className="text-muted-foreground">
            {t('subtitle')}
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" asChild>
            <Link href="/dashboard/members/new">
              <UserPlus className="mr-2 h-4 w-4" />
              {t('newMember')}
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard/planning/new">
              <Plus className="mr-2 h-4 w-4" />
              {t('newClass')}
            </Link>
          </Button>
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:bg-muted/50 transition-colors cursor-pointer">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">
                  {stat.title}
                </CardTitle>
                <stat.icon className={`h-4 w-4 ${
                  stat.trend === 'up' ? 'text-green-500' :
                  stat.trend === 'warning' ? 'text-amber-500' :
                  'text-muted-foreground'
                }`} />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.value}</div>
                <p className={`text-xs ${
                  stat.trend === 'warning' ? 'text-amber-600' : 'text-muted-foreground'
                }`}>
                  {stat.description}
                </p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {/* Upcoming Classes */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Clock className="h-5 w-5" />
              {t('upcomingClasses')}
            </CardTitle>
            <CardDescription>
              {t('upcomingClassesDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.planning.upcomingClasses.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <Calendar className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('noClassesScheduled')}</p>
                <Button variant="link" asChild className="mt-2">
                  <Link href="/dashboard/planning/new">{t('createClass')}</Link>
                </Button>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.planning.upcomingClasses.map((classItem) => {
                  const isFull = classItem.max_participants &&
                    classItem.current_participants >= classItem.max_participants;
                  const fillRate = classItem.max_participants
                    ? Math.round((classItem.current_participants / classItem.max_participants) * 100)
                    : null;

                  return (
                    <Link
                      key={classItem.id}
                      href={`/dashboard/planning/${classItem.id}`}
                      className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="font-medium">{classItem.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {new Date(classItem.start_time).toLocaleDateString(locale === 'fr' ? 'fr-FR' : 'en-US', {
                            weekday: 'short',
                            day: 'numeric',
                            month: 'short',
                          })} - {formatTime(classItem.start_time)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center gap-2">
                          {isFull ? (
                            <Badge variant="destructive">{t('full')}</Badge>
                          ) : fillRate && fillRate >= 80 ? (
                            <Badge variant="secondary">{fillRate}%</Badge>
                          ) : null}
                          <span className="text-sm font-medium">
                            {classItem.current_participants}
                            {classItem.max_participants && `/${classItem.max_participants}`}
                          </span>
                        </div>
                      </div>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              {t('recentActivity')}
            </CardTitle>
            <CardDescription>
              {t('recentActivityDescription')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {stats.activity.length === 0 ? (
              <div className="text-center py-6 text-muted-foreground">
                <TrendingUp className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>{t('noRecentActivity')}</p>
              </div>
            ) : (
              <div className="space-y-3">
                {stats.activity.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-start gap-3 p-3 rounded-lg bg-muted/50"
                  >
                    <div className="rounded-full bg-primary/10 p-2">
                      <Calendar className="h-4 w-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm truncate">{item.description}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatRelativeTime(item.created_at)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Alerts */}
      {stats.subscriptions.expiringSoon > 0 && (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-amber-800">
              <AlertCircle className="h-5 w-5" />
              {t('attentionRequired')}
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <p className="text-amber-800">
                {t('subscriptionsExpiring', { count: stats.subscriptions.expiringSoon })}
              </p>
              <Button variant="outline" asChild>
                <Link href="/dashboard/subscriptions?filter=expiring">
                  {t('viewDetails')}
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Quick Actions */}
      <Card>
        <CardHeader>
          <CardTitle>{t('quickActions')}</CardTitle>
          <CardDescription>
            {t('quickActionsDescription')}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <Button variant="outline" asChild className="justify-start">
              <Link href="/dashboard/members/new">
                <UserPlus className="mr-2 h-4 w-4" />
                {t('addMember')}
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/dashboard/planning/new">
                <Calendar className="mr-2 h-4 w-4" />
                {t('createClass')}
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/dashboard/subscriptions/new">
                <CreditCard className="mr-2 h-4 w-4" />
                {t('newSubscription')}
              </Link>
            </Button>
            <Button variant="outline" asChild className="justify-start">
              <Link href="/dashboard/members/import">
                <Users className="mr-2 h-4 w-4" />
                {t('importMembers')}
              </Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
